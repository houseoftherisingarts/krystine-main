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
  /** « creme » : habillage clair pour la page de vente. Par défaut, l'apparence sombre de l'espace de cours. */
  variante?: 'sombre' | 'creme';
}

// Les deux habillages. « sombre » est exactement celui de l'espace de cours.
const HABITS = {
  sombre: {
    boite: 'border-[#BA7B39]/25 bg-[#151d19]/95 shadow-[0_18px_50px_-20px_rgba(20,19,17,0.85)] backdrop-blur-md',
    lecture: 'bg-[#BA7B39] text-[#151d19] hover:bg-[#d9a05b]',
    ligne: 'flex items-baseline justify-between gap-3',
    rangee: '', commandes: '',
    titre: 'truncate text-[#EEE7DB]',
    temps: 'text-[#EEE7DB]/55', tempsTotal: 'text-[#EEE7DB]/30',
    secondaire: 'text-[#EEE7DB]/70 hover:bg-white/10 hover:text-[#EEE7DB]',
    soustitre: 'text-[#d9a05b]/70', erreur: 'text-[#EEE7DB]/80',
    pochette: 'border-[#BA7B39]/30',
    barrePassee: '#BA7B39', barreAVenir: 'rgba(238,231,219,0.28)',
  },
  creme: {
    boite: 'border-[rgba(156,122,68,0.45)] bg-[#faf6ee] shadow-[0_18px_44px_-28px_rgba(28,23,18,0.35)]',
    lecture: 'bg-[#3f4a27] text-[#faf6ee] hover:bg-[#606d39]',
    // Au téléphone, le titre prend toute la ligne (jamais tronqué) et le temps passe dessous.
    // et les commandes descendent sur leur propre rangée, pour laisser la largeur à l'onde.
    rangee: 'flex-wrap sm:flex-nowrap',
    commandes: 'w-full justify-end border-t border-[rgba(156,122,68,0.25)] pt-1.5 sm:w-auto sm:border-0 sm:pt-0',
    ligne: 'flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3',
    titre: 'leading-snug text-[#1c1712]',
    temps: 'text-[#1c1712]/60', tempsTotal: 'text-[#1c1712]/40',
    secondaire: 'text-[#1c1712]/65 hover:bg-[#1c1712]/[0.06] hover:text-[#1c1712]',
    soustitre: 'text-[#7d6330]', erreur: 'text-[#1c1712]/80',
    pochette: 'border-[rgba(156,122,68,0.45)]',
    barrePassee: '#9c7a44', barreAVenir: 'rgba(28,23,18,0.18)',
  },
} as const;

const LecteurAudioCours: React.FC<Props> = ({ url, titre, soustitre, pochette, lang, onFin, onSuivante, variante = 'sombre' }) => {
  const habit = HABITS[variante];
  const audio = useRef<HTMLAudioElement | null>(null);
  const toile = useRef<HTMLCanvasElement | null>(null);
  const [joue, setJoue] = useState(false);
  const [position, setPosition] = useState(0);
  const [longueur, setLongueur] = useState(0);
  const [vitesse, setVitesse] = useState(1);
  const onde = useMemo(() => ondeDe(titre), [titre]);
  const avancement = longueur > 0 ? position / longueur : 0;

  const [erreur, setErreur] = useState(false);
  // La reprise : la position de chaque capsule se garde sur l'appareil, pour
  // revenir au bon endroit le lendemain (liste Vata, 28 sept. 2026). La clé
  // suit le titre, parce que l'adresse du fichier change à chaque visite.
  const cle = `ksl-audio:${titre}`;
  const lire = () => { try { return Number(localStorage.getItem(cle)) || 0; } catch { return 0; } };
  const garder = (t: number) => { try { if (t > 0) localStorage.setItem(cle, String(Math.floor(t))); else localStorage.removeItem(cle); } catch { /* stockage fermé */ } };
  const dernier = useRef(0);
  const suivante = useRef(onSuivante);
  suivante.current = onSuivante;

  // Une nouvelle leçon : on repart de sa position gardée, sinon du début.
  useEffect(() => { setPosition(0); setLongueur(0); setJoue(false); setErreur(false); }, [url]);

  // L'écran verrouillé du téléphone : titre, pochette et boutons de lecture.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    ms.metadata = new MediaMetadata({ title: titre, artist: 'Krystine St-Laurent', album: soustitre || '', artwork: pochette ? [{ src: pochette, sizes: '512x512' }] : [] });
    const el = () => audio.current;
    ms.setActionHandler('play', () => { void el()?.play(); });
    ms.setActionHandler('pause', () => { el()?.pause(); });
    ms.setActionHandler('seekbackward', () => { const a = el(); if (a) a.currentTime = Math.max(0, a.currentTime - 15); });
    ms.setActionHandler('seekforward', () => { const a = el(); if (a) a.currentTime = Math.min(a.duration || 0, a.currentTime + 30); });
    ms.setActionHandler('nexttrack', () => suivante.current?.());
    return () => { for (const a of ['play', 'pause', 'seekbackward', 'seekforward', 'nexttrack'] as MediaSessionAction[]) { try { ms.setActionHandler(a, null); } catch { /* non pris en charge */ } } };
  }, [titre, soustitre, pochette]);

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
        ctx.fillStyle = passee ? habit.barrePassee : habit.barreAVenir;
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
  }, [onde, avancement, joue, habit]);

  const bouton = 'flex items-center justify-center rounded-full transition-colors';

  return (
    <div className="pointer-events-none sticky bottom-3 z-40 mt-6 px-1">
      <div className={`pointer-events-auto flex items-center gap-3 rounded-[18px] border ${habit.boite} ${habit.rangee} px-3 py-2.5 sm:gap-4 sm:px-4`}>
        <audio
          ref={audio}
          src={url}
          preload="metadata"
          onLoadedMetadata={e => {
            const d = e.currentTarget.duration || 0;
            setLongueur(d);
            const t = lire();
            if (t > 5 && t < d - 10) { e.currentTarget.currentTime = t; setPosition(t); }
          }}
          onTimeUpdate={e => {
            const t = e.currentTarget.currentTime;
            setPosition(t);
            if (Math.abs(t - dernier.current) >= 5) { dernier.current = t; garder(t); }
          }}
          onPlay={() => setJoue(true)}
          onPause={e => { setJoue(false); garder(e.currentTarget.currentTime); }}
          onEnded={() => { setJoue(false); garder(0); onFin?.(); }}
          onError={() => setErreur(true)}
        />

        {pochette && (
          <img src={pochette} alt="" className={`hidden h-14 w-14 shrink-0 rounded-[12px] border ${habit.pochette} object-cover sm:block`} />
        )}

        <button
          type="button"
          onClick={basculer}
          aria-label={joue ? (lang === 'FR' ? 'Pause' : 'Pause') : (lang === 'FR' ? 'Écouter' : 'Play')}
          className={`${bouton} h-11 w-11 shrink-0 ${habit.lecture}`}
        >
          <i className={`fa-solid ${joue ? 'fa-pause' : 'fa-play'} ${joue ? '' : 'ml-0.5'}`} />
        </button>

        <div className="min-w-0 flex-1">
          <div className={habit.ligne}>
            <p className={`min-w-0 text-[13px] ${habit.titre}`}>{titre}</p>
            <p className={`shrink-0 font-mono text-[11px] tabular-nums ${habit.temps}`}>
              {duree(position)} <span className={habit.tempsTotal}>/ {duree(longueur)}</span>
            </p>
          </div>
          <div onClick={pointer} className="mt-1 cursor-pointer" role="presentation">
            <canvas ref={toile} className="h-8 w-full sm:h-9" />
          </div>
          {soustitre && (
            <p className={`mt-0.5 hidden text-[10px] font-bold uppercase tracking-[0.22em] ${habit.soustitre} sm:block`}>{soustitre}</p>
          )}
          {erreur && (
            <p className={`mt-1 text-[12px] leading-snug ${habit.erreur}`}>
              {lang === 'FR'
                ? <>Cette capsule ne se charge pas. Rechargez la page, et si cela persiste, écrivez-nous : <a className="underline" href="mailto:teamksl@inspiratanature.com">teamksl@inspiratanature.com</a></>
                : <>This capsule won’t load. Reload the page, and if it persists, write to us: <a className="underline" href="mailto:teamksl@inspiratanature.com">teamksl@inspiratanature.com</a></>}
            </p>
          )}
        </div>

        <div className={`flex shrink-0 items-center gap-1 ${habit.commandes}`}>
          <button type="button" onClick={() => sauter(-15)} aria-label="-15 s"
            className={`${bouton} h-9 w-9 ${habit.secondaire}`}>
            <i className="fa-solid fa-rotate-left text-[13px]" />
          </button>
          <button type="button" onClick={() => sauter(30)} aria-label="+30 s"
            className={`${bouton} h-9 w-9 ${habit.secondaire}`}>
            <i className="fa-solid fa-rotate-right text-[13px]" />
          </button>
          <button
            type="button"
            onClick={() => setVitesse(v => VITESSES[(VITESSES.indexOf(v) + 1) % VITESSES.length])}
            className={`${bouton} h-9 min-w-[2.6rem] px-2 font-mono text-[11px] tabular-nums ${habit.secondaire}`}
          >
            {vitesse}×
          </button>
          {onSuivante && (
            <button type="button" onClick={onSuivante} aria-label={lang === 'FR' ? 'Leçon suivante' : 'Next lesson'}
              className={`${bouton} hidden h-9 w-9 ${habit.secondaire} sm:flex`}>
              <i className="fa-solid fa-forward-step text-[13px]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LecteurAudioCours;
