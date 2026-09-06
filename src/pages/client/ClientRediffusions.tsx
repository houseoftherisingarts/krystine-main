import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useApp } from '../../contexts/AppContext';
import { points } from '../../firebase/points';
import {
  getRediffusions, getArchivesRediffusion,
  type Rediffusion, type MessageDirect, type Commentaire, type ArchivesRediffusion,
} from '../../firebase/rediffusions';

// « Rediffusions » : les directs du podcast, archivés tels qu'ils ont été vécus.
// La vidéo YouTube joue dans la page et le clavardage du direct se rejoue au
// fil de la lecture (chaque message porte son décalage en secondes); les
// commentaires laissés sous la vidéo suivent. Les archives viennent de
// scripts/rediffusions/archiver.mjs.

declare global {
  interface Window { YT?: any; onYouTubeIframeAPIReady?: () => void }
}

type Lang = 'FR' | 'EN';

// L'API IFrame de YouTube, chargée une seule fois : elle donne la position de
// lecture, sans laquelle le fil ne peut pas suivre la vidéo.
let apiYouTube: Promise<any> | null = null;
function chargerApiYouTube(): Promise<any> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiYouTube) {
    apiYouTube = new Promise(resolve => {
      const avant = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { avant?.(); resolve(window.YT); };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      document.head.appendChild(s);
    });
  }
  return apiYouTube;
}

const mmss = (s: number) => {
  const t = Math.max(0, Math.floor(s));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = t % 60;
  return `${h ? `${h}:${String(m).padStart(2, '0')}` : m}:${String(sec).padStart(2, '0')}`;
};
const dureeLisible = (s: number) => {
  const m = Math.round(s / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`;
};
const locale = (lang: Lang) => (lang === 'FR' ? 'fr-CA' : 'en-CA');
const dateLongue = (d: Date, lang: Lang) =>
  new Intl.DateTimeFormat(locale(lang), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
const dateCourte = (d: Date, lang: Lang) =>
  new Intl.DateTimeFormat(locale(lang), { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
const pluriel = (n: number, un: string, des: string) => `${n} ${n === 1 ? un : des}`;

const Avatar: React.FC<{ src?: string; nom: string; taille?: string }> = ({ src, nom, taille = 'h-7 w-7' }) =>
  src ? (
    <img src={src} alt="" referrerPolicy="no-referrer" loading="lazy" className={`${taille} flex-none rounded-full object-cover`} />
  ) : (
    <span className={`${taille} flex flex-none items-center justify-center rounded-full bg-[#BA7B39]/25 text-[10px] font-bold uppercase text-[#BA7B39]`}>
      {nom.replace(/^@/, '')[0] || '?'}
    </span>
  );

// ─── La liste ────────────────────────────────────────────────────────────────

const ClientRediffusions: React.FC = () => {
  const { lang } = useApp();
  const fr = lang === 'FR';
  const [liste, setListe] = useState<Rediffusion[]>([]);
  const [loading, setLoading] = useState(true);
  const [ouverte, setOuverte] = useState<Rediffusion | null>(null);

  useEffect(() => {
    getRediffusions().then(setListe).catch(() => setListe([])).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-[#293027]/50 dark:text-white/50">{fr ? 'Chargement…' : 'Loading…'}</p>;
  if (ouverte) return <Lecture r={ouverte} lang={lang} retour={() => setOuverte(null)} />;

  return (
    <section>
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">
        {fr ? 'Vos rediffusions' : 'Your replays'}
      </p>
      <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-[#293027]/60 dark:text-white/60">
        {fr
          ? "Les directs du podcast, tels qu'ils ont été vécus : la vidéo, le fil des messages qui l'a accompagnée et les commentaires laissés ensuite."
          : 'The podcast lives, as they happened: the video, the messages that ran alongside it and the comments left afterwards.'}
      </p>

      {liste.length === 0 ? (
        <div className="mt-4 rounded-[15px] bg-[#BA7B39]/8 py-8 text-center dark:bg-white/5">
          <i className="fa-solid fa-circle-play mb-3 block text-2xl text-[#BA7B39]/60" />
          <p className="font-serif text-lg text-[#293027] dark:text-white">
            {fr ? 'Aucune rediffusion pour le moment' : 'No replay yet'}
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-[#293027]/50 dark:text-white/50">
            {fr ? 'Le prochain direct se prépare sur la page du podcast.' : 'The next live is taking shape on the podcast page.'}
          </p>
          <a href="/podcast" className="mt-4 inline-block text-xs font-bold uppercase tracking-widest text-[#8B4A2F] underline-offset-4 hover:underline">
            {fr ? 'Aller au podcast' : 'Go to the podcast'}
          </a>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-[#293027]/10 dark:divide-white/10">
          {liste.map(r => {
            const quand = r.publieLe ? dateLongue(r.publieLe.toDate(), lang) : '';
            const compteurs = [
              pluriel(r.nbMessages, fr ? 'message pendant le direct' : 'message during the live', fr ? 'messages pendant le direct' : 'messages during the live'),
              pluriel(r.nbCommentaires, fr ? 'commentaire' : 'comment', fr ? 'commentaires' : 'comments'),
            ].join(' · ');
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setOuverte(r)}
                  className="group flex w-full flex-col gap-4 py-5 text-left sm:flex-row sm:items-center sm:gap-6"
                >
                  <span className="relative block aspect-video w-full flex-none overflow-hidden rounded-[12px] bg-[#28352F] sm:w-56">
                    {r.vignette && (
                      <img src={r.vignette} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]" />
                    )}
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EEE7DB]/90 text-[#28352F] shadow-lg transition-transform duration-300 group-hover:scale-105">
                        <i className="fa-solid fa-play ml-0.5" />
                      </span>
                    </span>
                    <span className="absolute bottom-2 right-2 rounded-md bg-[#161311]/80 px-1.5 py-0.5 text-[10px] font-semibold text-[#EEE7DB]">
                      {dureeLisible(r.duree)}
                    </span>
                  </span>
                  <span className="block min-w-0 flex-1">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.25em] text-[#BA7B39]">{quand}</span>
                    <span className="mt-1 block font-serif text-xl leading-snug text-[#293027] transition-colors group-hover:text-[#8B4A2F] dark:text-white dark:group-hover:text-[#d9a05b]">
                      {r.titre}
                    </span>
                    <span className="mt-2 block text-xs text-[#293027]/55 dark:text-white/55">{compteurs}</span>
                  </span>
                  <span className="hidden flex-none text-[10px] font-bold uppercase tracking-widest text-[#8B4A2F] sm:block dark:text-[#d9a05b]">
                    {fr ? 'Regarder' : 'Watch'} <i className="fa-solid fa-arrow-right ml-1" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

// ─── La lecture : vidéo, fil du direct, commentaires ─────────────────────────

const Lecture: React.FC<{ r: Rediffusion; lang: Lang; retour: () => void }> = ({ r, lang, retour }) => {
  const fr = lang === 'FR';
  const reduce = useReducedMotion();
  const [archives, setArchives] = useState<ArchivesRediffusion | null>(null);
  const [temps, setTemps] = useState(0);
  const [suivre, setSuivre] = useState(true);
  const [mode, setMode] = useState<'chargement' | 'api' | 'iframe'>('chargement');
  const [descOuverte, setDescOuverte] = useState(false);
  const scene = useRef<HTMLDivElement>(null);
  const lecteur = useRef<any>(null);
  const modeRef = useRef(mode);
  const fil = useRef<HTMLOListElement>(null);
  modeRef.current = mode;

  useEffect(() => {
    getArchivesRediffusion(r.id).then(setArchives).catch(() => setArchives({ clavardage: [], commentaires: [] }));
  }, [r.id]);

  // Le lecteur. Si l'API ne répond pas (script bloqué), l'iframe simple prend
  // le relais et le fil se montre en entier.
  useEffect(() => {
    let vivant = true;
    let horloge: number | undefined;
    const delai = window.setTimeout(() => { if (vivant && modeRef.current === 'chargement') setMode('iframe'); }, 6000);
    chargerApiYouTube().then(YT => {
      if (!vivant || !scene.current || modeRef.current === 'iframe') return;
      const cible = document.createElement('div');
      scene.current.appendChild(cible);
      lecteur.current = new YT.Player(cible, {
        videoId: r.videoId,
        width: '100%',
        height: '100%',
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1, origin: window.location.origin },
        events: {
          onReady: () => { if (vivant) { window.clearTimeout(delai); setMode('api'); } },
          onStateChange: (e: any) => {
            window.clearInterval(horloge);
            const lire = () => setTemps(lecteur.current?.getCurrentTime?.() || 0);
            if (e.data === YT.PlayerState.PLAYING) { horloge = window.setInterval(lire, 500); if (user) points.rediffusionVue(user.uid, r.id).catch(() => {}); }
            else lire();
          },
        },
      });
    }).catch(() => { if (vivant) setMode('iframe'); });
    return () => {
      vivant = false;
      window.clearTimeout(delai);
      window.clearInterval(horloge);
      try { lecteur.current?.destroy?.(); } catch { /* noop */ }
      lecteur.current = null;
      if (scene.current) scene.current.innerHTML = '';
    };
  }, [r.videoId]);

  const clavardage = archives?.clavardage ?? [];
  const commentaires = archives?.commentaires ?? [];
  const enDirect = suivre && mode === 'api';
  const visibles = useMemo(
    () => (enDirect ? clavardage.filter(m => m.decalage <= temps + 0.25) : clavardage),
    [clavardage, enDirect, temps],
  );
  useEffect(() => {
    if (enDirect && fil.current) fil.current.scrollTop = fil.current.scrollHeight;
  }, [visibles.length, enDirect]);

  const aller = (s: number) => {
    lecteur.current?.seekTo?.(s, true);
    setTemps(s);
  };

  const quand = r.publieLe ? dateLongue(r.publieLe.toDate(), lang) : '';
  const racines = commentaires.filter(c => !c.parent);
  const reponsesDe = (id: string) => commentaires.filter(c => c.parent === id);

  return (
    <section>
      <button type="button" onClick={retour} className="text-[10px] font-bold uppercase tracking-widest text-[#8B4A2F] underline-offset-4 hover:underline dark:text-[#d9a05b]">
        <i className="fa-solid fa-arrow-left mr-2" />{fr ? 'Toutes les rediffusions' : 'All replays'}
      </button>

      {/* La scène : vert profond, fil ambre, jamais de noir pur (canon du podcast) */}
      <div className="relative mt-4 overflow-hidden rounded-[15px] bg-[#28352F] text-[#EEE7DB] shadow-[0_24px_60px_rgba(40,53,47,0.35)]">
        <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#BA7B39] to-transparent" />
        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="p-4 sm:p-5">
            <div className="relative aspect-video overflow-hidden rounded-[10px] bg-[#1d2622]">
              <div ref={scene} className="absolute inset-0 [&>iframe]:h-full [&>iframe]:w-full" />
              {mode === 'iframe' && (
                <iframe
                  src={`https://www.youtube.com/embed/${r.videoId}?rel=0&modestbranding=1&playsinline=1`}
                  title={r.titre}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                />
              )}
              {mode === 'chargement' && r.vignette && (
                <img src={r.vignette} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-60" />
              )}
            </div>
            <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-[0.25em] text-[#BA7B39]">
              <span>{quand}</span>
              <span className="text-[#EEE7DB]/35">·</span>
              <span>{dureeLisible(r.duree)}</span>
              {r.vues ? (
                <>
                  <span className="text-[#EEE7DB]/35">·</span>
                  <span>{r.vues.toLocaleString(locale(lang))} {fr ? 'vues' : 'views'}</span>
                </>
              ) : null}
            </div>
            <h2 className="mt-2 font-serif text-2xl leading-tight sm:text-3xl">{r.titre}</h2>
            {r.description && (
              <div className="mt-3 max-w-[65ch] text-sm leading-relaxed text-[#EEE7DB]/70">
                <p className={`whitespace-pre-line ${descOuverte ? '' : 'max-h-[4.6rem] overflow-hidden'}`}>{r.description}</p>
                <button
                  type="button"
                  onClick={() => setDescOuverte(v => !v)}
                  className="mt-2 text-[10px] font-bold uppercase tracking-widest text-[#BA7B39] transition-colors hover:text-[#EEE7DB]"
                >
                  {descOuverte ? (fr ? 'Replier' : 'Show less') : (fr ? 'Lire la description' : 'Read the description')}
                </button>
              </div>
            )}
          </div>

          <aside className="flex min-h-0 flex-col border-t border-[#EEE7DB]/10 lg:border-l lg:border-t-0">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <p className="whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.25em] text-[#BA7B39]">
                {fr ? 'Fil du direct' : 'Live chat'}
                <span className="ml-2 text-[#EEE7DB]/45">{clavardage.length}</span>
              </p>
              {mode === 'api' && clavardage.length > 0 && (
                <button
                  type="button"
                  role="switch"
                  aria-checked={suivre}
                  onClick={() => setSuivre(v => !v)}
                  title={fr ? 'Les messages reviennent au moment où ils ont été écrits' : 'Messages return at the moment they were written'}
                  className="flex flex-none items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-[#EEE7DB]/70 transition-colors hover:text-[#EEE7DB]"
                >
                  <span className={`relative h-4 w-7 flex-none rounded-full transition-colors ${suivre ? 'bg-[#BA7B39]' : 'bg-[#EEE7DB]/25'}`}>
                    <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-[#EEE7DB] transition-transform ${suivre ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                  </span>
                  {fr ? 'Suivre' : 'Follow'}
                </button>
              )}
            </div>
            <ol ref={fil} className="h-[22rem] space-y-3 overflow-y-auto px-4 pb-4 lg:h-auto lg:max-h-[34rem] lg:flex-1">
              {archives === null && <li className="text-xs text-[#EEE7DB]/50">{fr ? 'Chargement…' : 'Loading…'}</li>}
              {archives && clavardage.length === 0 && (
                <li className="text-xs leading-relaxed text-[#EEE7DB]/55">{fr ? "Aucun message n'a été écrit pendant ce direct." : 'No message was written during this live.'}</li>
              )}
              {archives && clavardage.length > 0 && visibles.length === 0 && (
                <li className="text-xs leading-relaxed text-[#EEE7DB]/55">
                  {fr ? 'Lancez la vidéo : chaque message reviendra au moment où il a été écrit.' : 'Press play: each message returns at the moment it was written.'}
                </li>
              )}
              {visibles.map(m => (
                <motion.li
                  key={m.id}
                  initial={reduce || !enDirect ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  <button type="button" onClick={() => aller(m.decalage)} className="flex w-full items-start gap-2.5 text-left" title={fr ? 'Aller à ce moment' : 'Jump to this moment'}>
                    <Avatar src={m.photo} nom={m.auteur} />
                    <span className="block min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className={`truncate text-xs font-semibold ${m.role === 'hote' ? 'text-[#BA7B39]' : 'text-[#EEE7DB]/75'}`}>{m.auteur}</span>
                        <span className="flex-none text-[10px] tabular-nums text-[#EEE7DB]/40">{mmss(m.decalage)}</span>
                      </span>
                      <span className="block text-sm leading-snug text-[#EEE7DB]/90">{m.texte}</span>
                      {m.montant && (
                        <span className="mt-1 inline-block rounded-md bg-[#BA7B39]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#BA7B39]">{m.montant}</span>
                      )}
                    </span>
                  </button>
                </motion.li>
              ))}
            </ol>
          </aside>
        </div>
      </div>

      {/* Les commentaires laissés sous la vidéo */}
      <div className="mt-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">
          {fr ? 'Commentaires' : 'Comments'}
          <span className="ml-2 text-[#293027]/40 dark:text-white/40">{commentaires.length}</span>
        </p>
        {archives && commentaires.length === 0 && (
          <p className="mt-3 text-sm text-[#293027]/50 dark:text-white/50">{fr ? 'Aucun commentaire sous cette vidéo.' : 'No comment under this video.'}</p>
        )}
        <ul className="mt-4 space-y-5">
          {racines.map(c => (
            <li key={c.id}>
              <CommentaireVue c={c} lang={lang} />
              {reponsesDe(c.id).length > 0 && (
                <ul className="mt-3 space-y-3 pl-11">
                  {reponsesDe(c.id).map(x => <li key={x.id}><CommentaireVue c={x} lang={lang} /></li>)}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

const CommentaireVue: React.FC<{ c: Commentaire; lang: Lang }> = ({ c, lang }) => {
  const fr = lang === 'FR';
  return (
    <div className="flex items-start gap-3">
      <Avatar src={c.photo} nom={c.auteur} taille="h-8 w-8" />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-xs">
          <span className={`font-semibold ${c.hote ? 'text-[#8B4A2F] dark:text-[#d9a05b]' : 'text-[#293027] dark:text-white'}`}>{c.auteur}</span>
          {c.hote && (
            <span className="rounded-full bg-[#BA7B39]/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#8B4A2F] dark:text-[#d9a05b]">{fr ? 'Hôte' : 'Host'}</span>
          )}
          {c.publieLe > 0 && <span className="text-[#293027]/45 dark:text-white/45">{dateCourte(new Date(c.publieLe * 1000), lang)}</span>}
        </p>
        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-[#293027]/85 dark:text-white/85">{c.texte}</p>
        {c.jaimes > 0 && (
          <p className="mt-1 text-[11px] text-[#293027]/45 dark:text-white/45"><i className="fa-regular fa-heart mr-1" />{c.jaimes}</p>
        )}
      </div>
    </div>
  );
};

export default ClientRediffusions;
