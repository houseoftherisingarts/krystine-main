import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Le lecteur des capsules d'une formation. Il remplace le <audio controls>
// natif du navigateur, qui était la pièce la plus laide de l'espace de cours
// (Alex, 10 septembre 2026). Il se colle en bas de la fenêtre et reste en
// place quand on passe d'une leçon à l'autre.
//
// ponytail: l'onde est déterministe (dérivée du titre), pas une vraie analyse
// du fichier. Un AnalyserNode donnerait le vrai spectre, mais il exige un
// en-tête CORS sur les URL signées de Storage; à brancher le jour où le
// bucket les renvoie.

const BARRES = 72;

/** Hauteurs de 0,25 à 1 tirées du titre, pour que chaque capsule ait sa forme. */
function ondeDe(titre: string): number[] {
  let graine = 0;
  for (let i = 0; i < titre.length; i++) graine = (graine * 31 + titre.charCodeAt(i)) >>> 0;
  const suite: number[] = [];
  for (let i = 0; i < BARRES; i++) {
    graine = (graine * 1664525 + 1013904223) >>> 0;
    const bruit = (graine % 1000) / 1000;
    // une enveloppe douce, pour que ça ressemble à une capsule parlée
    const enveloppe = 0.55 + 0.45 * Math.sin((i / BARRES) * Math.PI);
    suite.push(0.25 + 0.75 * bruit * enveloppe);
  }
  return suite;
}

const duree = (s: number) => {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

const VITESSES = [1, 1.25, 1.5, 0.75];

interface Props {
  url: string;
  titre: string;
  soustitre?: string;
  pochette?: string;
  lang: 'FR' | 'EN';
  onFin?: () => void;
  onSuivante?: () => void;
}

const LecteurAudioCours: React.FC<Props> = ({ url, titre, soustitre, pochette, lang, onFin, onSuivante }) => {
  const audio = useRef<HTMLAudioElement | null>(null);
  const toile = useRef<HTMLCanvasElement | null>(null);
  const [joue, setJoue] = useState(false);
  const [position, setPosition] = useState(0);
  const [longueur, setLongueur] = useState(0);
  const [vitesse, setVitesse] = useState(1);
  const onde = useMemo(() => ondeDe(titre), [titre]);
  const avancement = longueur > 0 ? position / longueur : 0;

  // Une nouvelle leçon : on repart du début.
  useEffect(() => { setPosition(0); setLongueur(0); setJoue(false); }, [url]);

  useEffect(() => { if (audio.current) audio.current.playbackRate = vitesse; }, [vitesse, url]);

  const basculer = useCallback(() => {
    const el = audio.current;
    if (!el) return;
    if (el.paused) void el.play().then(() => setJoue(true)).catch(() => {});
    else { el.pause(); setJoue(false); }
  }, []);

  const sauter = (secondes: number) => {
    const el = audio.current;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min(el.duration || 0, el.currentTime + secondes));
  };

  const pointer = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audio.current;
    if (!el || !longueur) return;
    const boite = e.currentTarget.getBoundingClientRect();
    el.currentTime = ((e.clientX - boite.left) / boite.width) * longueur;
  };

  // L'onde : barres laiton jusqu'à la tête de lecture, barres éteintes après.
  useEffect(() => {
    const c = toile.current;
    if (!c) return;
    let brut = 0;
    const dessiner = () => {
      const ctx = c.getContext('2d');
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const L = c.clientWidth, H = c.clientHeight;
      if (c.width !== L * dpr || c.height !== H * dpr) { c.width = L * dpr; c.height = H * dpr; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, L, H);
      const pas = L / BARRES;
      const largeur = Math.max(1.5, pas * 0.5);
      for (let i = 0; i < BARRES; i++) {
        const passee = i / BARRES < avancement;
        // le battement ne touche que les deux barres sous la tête de lecture
        const proche = joue && Math.abs(i / BARRES - avancement) < 0.03;
        const pulsation = proche ? 1 + 0.28 * Math.sin(brut / 6 + i) : 1;
        const h = Math.max(2, onde[i] * H * 0.86 * pulsation);
        ctx.fillStyle = passee ? '#BA7B39' : 'rgba(238,231,219,0.28)';
        ctx.beginPath();
        const x = i * pas + (pas - largeur) / 2;
        const y = (H - h) / 2;
        ctx.roundRect(x, y, largeur, h, largeur / 2);
        ctx.fill();
      }
      brut++;
    };
    dessiner();
    if (!joue) return;
    let id = 0;
    const boucle = () => { dessiner(); id = requestAnimationFrame(boucle); };
    id = requestAnimationFrame(boucle);
    return () => cancelAnimationFrame(id);
  }, [onde, avancement, joue]);

  const bouton = 'flex items-center justify-center rounded-full transition-colors';

  return (
    <div className="pointer-events-none sticky bottom-3 z-40 mt-6 px-1">
      <div className="pointer-events-auto flex items-center gap-3 rounded-[18px] border border-[#BA7B39]/25 bg-[#151d19]/92 px-3 py-2.5 shadow-[0_18px_50px_-20px_rgba(20,19,17,0.85)] backdrop-blur-md sm:gap-4 sm:px-4">
        <audio
          ref={audio}
          src={url}
          preload="metadata"
          onLoadedMetadata={e => setLongueur(e.currentTarget.duration || 0)}
          onTimeUpdate={e => setPosition(e.currentTarget.currentTime)}
          onPlay={() => setJoue(true)}
          onPause={() => setJoue(false)}
          onEnded={() => { setJoue(false); onFin?.(); }}
        />

        {pochette && (
          <img src={pochette} alt="" className="hidden h-14 w-14 shrink-0 rounded-[12px] border border-[#BA7B39]/30 object-cover sm:block" />
        )}

        <button
          type="button"
          onClick={basculer}
          aria-label={joue ? (lang === 'FR' ? 'Pause' : 'Pause') : (lang === 'FR' ? 'Écouter' : 'Play')}
          className={`${bouton} h-11 w-11 shrink-0 bg-[#BA7B39] text-[#151d19] hover:bg-[#d9a05b]`}
        >
          <i className={`fa-solid ${joue ? 'fa-pause' : 'fa-play'} ${joue ? '' : 'ml-0.5'}`} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="min-w-0 truncate text-[13px] text-[#EEE7DB]">{titre}</p>
            <p className="shrink-0 font-mono text-[11px] tabular-nums text-[#EEE7DB]/55">
              {duree(position)} <span className="text-[#EEE7DB]/30">/ {duree(longueur)}</span>
            </p>
          </div>
          <div onClick={pointer} className="mt-1 cursor-pointer" role="presentation">
            <canvas ref={toile} className="h-8 w-full sm:h-9" />
          </div>
          {soustitre && (
            <p className="mt-0.5 hidden text-[10px] font-bold uppercase tracking-[0.22em] text-[#d9a05b]/70 sm:block">{soustitre}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => sauter(-15)} aria-label="-15 s"
            className={`${bouton} h-9 w-9 text-[#EEE7DB]/70 hover:bg-white/10 hover:text-[#EEE7DB]`}>
            <i className="fa-solid fa-rotate-left text-[13px]" />
          </button>
          <button type="button" onClick={() => sauter(30)} aria-label="+30 s"
            className={`${bouton} h-9 w-9 text-[#EEE7DB]/70 hover:bg-white/10 hover:text-[#EEE7DB]`}>
            <i className="fa-solid fa-rotate-right text-[13px]" />
          </button>
          <button
            type="button"
            onClick={() => setVitesse(v => VITESSES[(VITESSES.indexOf(v) + 1) % VITESSES.length])}
            className={`${bouton} h-9 min-w-[2.6rem] px-2 font-mono text-[11px] tabular-nums text-[#EEE7DB]/70 hover:bg-white/10 hover:text-[#EEE7DB]`}
          >
            {vitesse}×
          </button>
          {onSuivante && (
            <button type="button" onClick={onSuivante} aria-label={lang === 'FR' ? 'Leçon suivante' : 'Next lesson'}
              className={`${bouton} hidden h-9 w-9 text-[#EEE7DB]/70 hover:bg-white/10 hover:text-[#EEE7DB] sm:flex`}>
              <i className="fa-solid fa-forward-step text-[13px]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LecteurAudioCours;
