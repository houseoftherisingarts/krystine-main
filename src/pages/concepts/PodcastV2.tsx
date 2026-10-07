import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Headphones, CircleNotch, ArrowUpRight, ArrowRight, ArrowDown, Play, Pause } from '@phosphor-icons/react';
import NewsletterSignup from '../../components/NewsletterSignup';
import LiveSignup from '../../components/LiveSignup';
import { StyleV2, Kicker, BoutonNoir, GOUTTIERE } from '../../components/v2/Magazine';
import { chargerFlux, cleVideo, fmtMinutes, type Episode } from '../podcast/episodes';
import { VIDEOS_EPISODES } from '../podcast/videos';
import { useLecteur, ControlesAudio, type Lecteur } from '../podcast/LecteurAudio';

/**
 * Podcast « Au-delà des tendances », langage V2 (magazine crème).
 * Ordre refait le 4 oct. 2026 sur le diagnostic de Krystine (« pas user
 * friendly ») : le nouvel épisode en tête avec sa vidéo, puis la saison 2,
 * la saison 1 repliée, le direct, et l'infolettre à la fin.
 */

const ease = [0.22, 1, 0.36, 1] as const;

/** Le nouvel épisode : la vidéo YouTube (ou l'image et le lecteur audio), son résumé, l'écoute et le quiz. */
const NouvelEpisode: React.FC<{ ep: Episode; lecteur: Lecteur }> = ({ ep, lecteur }) => {
  const reduce = useReducedMotion();
  const videoId = VIDEOS_EPISODES[cleVideo(ep)];
  const [audioOuvert, setAudioOuvert] = useState(!videoId);
  const entree = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 1, ease, delay },
  });
  const ecouter = () => { setAudioOuvert(true); if (lecteur.courant?.id !== ep.id || !lecteur.enLecture) lecteur.basculer(ep); };

  return (
    <section className={`relative w-full ${GOUTTIERE} pt-[clamp(5.5rem,11vh,8rem)] pb-[clamp(3rem,8vh,5.5rem)]`}>
      <div className="grid gap-x-[clamp(2rem,4.5vw,4.5rem)] gap-y-6 lg:grid-cols-[0.8fr_1.2fr] lg:grid-rows-[auto_1fr]">
        <motion.header {...entree(0.05)} className="lg:col-start-1 lg:row-start-1 lg:self-end">
          <p className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.2em] text-[#7d6330] sm:tracking-[0.34em]"><Headphones size={14} weight="light" className="shrink-0" /> Au-delà des tendances · Le podcast</p>
          <p className="mt-4 text-[0.66rem] uppercase tracking-[0.18em] text-[#1c1712]/60 sm:tracking-[0.24em]">
            <span className="hidden sm:inline">Nouvel épisode · </span>Saison {ep.saison}{ep.numero !== null && <> · Épisode {ep.numero}</>}{ep.duree && <> · {fmtMinutes(ep.duree)}</>}
          </p>
          <h1 className="v2-serif mt-3 font-light leading-[1.02] text-[#1c1712] text-[clamp(2rem,3.9vw,3.5rem)] max-w-[18ch]">{ep.titre}</h1>
        </motion.header>

        <motion.div {...entree(0.15)} className="relative lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:self-center">
          <span className="pointer-events-none absolute -inset-2 border border-[#9c7a44]/35" aria-hidden />
          <div className="relative aspect-video w-full overflow-hidden bg-[#1c1712]">
            {videoId ? (
              <iframe
                title={ep.titre}
                src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            ) : (
              <button type="button" onClick={ecouter} className="group absolute inset-0" aria-label={`Écouter ${ep.titre}`}>
                <img src={ep.image || '/podcast/saison2-cover.webp'} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                <span className="absolute inset-0 grid place-items-center bg-[#1c1712]/25 transition-colors duration-300 group-hover:bg-[#1c1712]/40">
                  <span className="grid h-16 w-16 place-items-center bg-[#1c1712] text-[#f4efe6]"><Play size={22} weight="fill" className="ml-1" /></span>
                </span>
              </button>
            )}
          </div>
        </motion.div>

        <motion.div {...entree(0.25)} className="lg:col-start-1 lg:row-start-2 lg:self-start">
          {ep.resume && <p className="max-w-[46ch] text-[1rem] leading-[1.75] text-[#3a2f23]">{ep.resume}</p>}
          <div className="mt-7">
            {audioOuvert ? (
              <ControlesAudio ep={ep} lecteur={lecteur} className="max-w-[440px]" />
            ) : (
              <BoutonNoir onClick={ecouter}>Écouter en audio</BoutonNoir>
            )}
          </div>
          <Link
            to="/quiz?via=podcast"
            className="group mt-7 inline-flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-[#1c1712] pb-1 text-[0.95rem] text-[#1c1712] transition-colors duration-300 hover:border-[#9c7a44] hover:text-[#7d6330]"
          >
            <span className="v2-serif font-light">De quoi ai-je besoin en ce moment&nbsp;?</span>
            <span className="inline-flex items-center gap-1.5 text-[0.7rem] uppercase tracking-[0.2em]">Faire le quiz <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" /></span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

/** Une ligne d'épisode : numéro, titre, durée, « Écouter » / « En cours »; la ligne active déplie le lecteur. */
const LigneEpisode: React.FC<{ ep: Episode; rang: string; lecteur: Lecteur }> = ({ ep, rang, lecteur }) => {
  const actif = lecteur.courant?.id === ep.id;
  return (
    <li className={`break-inside-avoid border-b border-[#1c1712]/12 transition-colors duration-300 ${actif ? 'bg-[#efe6d7]' : ''}`}>
      <button
        type="button"
        onClick={() => lecteur.basculer(ep)}
        className="group flex w-full items-center gap-4 px-2 py-4 text-left transition-colors duration-300 hover:bg-[#efe6d7]/60 sm:px-3"
      >
        <span className="v2-serif w-7 shrink-0 text-[0.95rem] tabular-nums text-[#7d6330]">{rang}</span>
        <span className="min-w-0 flex-1">
          <span className="v2-serif block font-light leading-snug text-[#1c1712] text-[clamp(1.05rem,1.5vw,1.25rem)]">{ep.titre}</span>
          {ep.duree && <span className="mt-1 block text-[0.6rem] uppercase tracking-[0.16em] text-[#1c1712]/55">{fmtMinutes(ep.duree)}</span>}
        </span>
        <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center gap-1.5 border text-[0.62rem] sm:h-auto sm:w-auto sm:px-3 sm:py-2 uppercase tracking-[0.16em] transition-colors duration-300 ${actif
          ? 'border-[#1c1712] bg-[#1c1712] text-[#f4efe6]'
          : 'border-[#1c1712]/35 text-[#1c1712] group-hover:border-[#1c1712] group-hover:bg-[#1c1712] group-hover:text-[#f4efe6]'}`}
        >
          {actif && lecteur.enLecture ? <Pause size={12} weight="fill" className="sm:hidden" /> : <Play size={12} weight="fill" className="sm:hidden" />}
          <Play size={10} weight="fill" className="hidden sm:block" />
          <span className="sr-only sm:not-sr-only">{actif ? 'En cours' : 'Écouter'}</span>
        </span>
      </button>
      {actif && <ControlesAudio ep={ep} lecteur={lecteur} className="px-2 pb-5 sm:px-3 sm:pl-14" />}
    </li>
  );
};

const QUESTIONS_S2 = [
  'Comment démêler le vrai du faux ?',
  'À quoi et à qui se fier ?',
  'Qu’est-ce qui mérite réellement notre attention ?',
  'Comment savoir si une recommandation nous convient ?',
  'Et si nous revenions à choisir avec discernement ce qui nous nourrit profondément ?',
];

export default function PodcastV2() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [saison1Ouverte, setSaison1Ouverte] = useState(false);
  const lecteur = useLecteur();

  useEffect(() => {
    let alive = true;
    chargerFlux()
      .then((eps) => {
        if (!alive) return;
        if (!eps.length) throw new Error('Aucun épisode');
        setEpisodes(eps);
        setStatus('ready');
      })
      .catch(() => { if (alive) setStatus('error'); });
    return () => { alive = false; };
  }, []);

  const saison2 = useMemo(() => episodes.filter((e) => e.saison === 2), [episodes]);
  const saison1 = useMemo(() => episodes.filter((e) => e.saison === 1), [episodes]);
  const dernier = episodes[0];
  // Saison 1 : le numéro vient du titre, sinon le rang depuis le plus ancien.
  const rang = (e: Episode, liste: Episode[]) => (e.numero !== null ? String(e.numero) : e.saison === 2 ? '·' : String(liste.length - liste.indexOf(e)));

  return (
    <div className="relative min-h-screen w-full bg-[#f4efe6] text-[#1c1712] antialiased overflow-x-hidden" style={{ fontFamily: '"Inter", system-ui, sans-serif' }}>
      <StyleV2 />

      {status === 'loading' && (
        <div className={`flex min-h-[70vh] flex-col items-center justify-center ${GOUTTIERE} pt-24 text-[#3a2f23]`}>
          <CircleNotch className="animate-spin text-[#7d6330]" size={28} weight="bold" />
          <p className="mt-4 v2-serif font-light">Chargement du nouvel épisode…</p>
        </div>
      )}

      {status === 'error' && (
        <div className={`${GOUTTIERE} pt-36 pb-20 text-center`}>
          <Kicker>Au-delà des tendances · Le podcast</Kicker>
          <p className="mt-6 v2-serif font-light text-[1.3rem] text-[#3a2f23] mb-6">Les épisodes ne se chargent pas pour l’instant.</p>
          <a
            href="https://www.youtube.com/@KrystineStLaurent"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[0.72rem] uppercase tracking-[0.2em] text-[#1c1712] border-b border-[#1c1712] pb-1.5 hover:text-[#7d6330] hover:border-[#9c7a44] transition-colors"
          >
            Écouter sur YouTube <ArrowUpRight size={14} weight="regular" />
          </a>
        </div>
      )}

      {status === 'ready' && dernier && (
        <>
          {/* ─────────── A · Le nouvel épisode ─────────── */}
          <NouvelEpisode ep={dernier} lecteur={lecteur} />

          {/* ─────────── B · Saison 2, puis saison 1 repliée ─────────── */}
          <section id="episodes" className={`w-full ${GOUTTIERE} pb-[clamp(4rem,10vh,7rem)]`}>
            <div className="flex items-end justify-between border-b border-[#1c1712]/25 pb-4">
              <h2 className="v2-serif font-light leading-none text-[#1c1712] text-[clamp(1.9rem,3.4vw,2.7rem)]">Saison 2</h2>
              <span className="text-[0.62rem] uppercase tracking-[0.2em] text-[#7d6330]">{saison2.length} épisodes</span>
            </div>

            <div className="mt-10 grid gap-x-[clamp(2rem,5vw,5rem)] gap-y-12 lg:grid-cols-[0.85fr_1.15fr]">
              <ul className="order-1 lg:order-2 border-t border-[#1c1712]/12">
                {saison2.map((ep) => <LigneEpisode key={ep.id} ep={ep} rang={rang(ep, saison2)} lecteur={lecteur} />)}
              </ul>

              <aside className="order-2 lg:order-1 lg:sticky lg:top-24 lg:self-start">
                {/* La pochette se touche comme un bouton (clics morts relevés en oct. 2026) : elle lance le dernier épisode de la saison. */}
                <div className="relative">
                  <span className="pointer-events-none absolute -inset-2 border border-[#9c7a44]/35" aria-hidden />
                  {saison2[0] ? (
                    <button type="button" onClick={() => lecteur.basculer(saison2[0])} className="group relative block w-full" aria-label={`Écouter ${saison2[0].titre}`}>
                      <img src="/podcast/saison2-cover.webp" alt="Au-delà des tendances, saison 2" referrerPolicy="no-referrer" loading="lazy" className="relative block w-full h-auto" />
                      <span className="absolute bottom-2 right-2 grid h-9 w-9 place-items-center bg-[#1c1712] sm:bottom-4 sm:right-4 sm:h-12 sm:w-12 text-[#f4efe6] transition-colors duration-300 group-hover:bg-[#9c7a44]" aria-hidden>
                        {lecteur.courant?.id === saison2[0].id && lecteur.enLecture ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" className="ml-0.5" />}
                      </span>
                    </button>
                  ) : (
                    <img src="/podcast/saison2-cover.webp" alt="Au-delà des tendances, saison 2" referrerPolicy="no-referrer" loading="lazy" className="relative block w-full h-auto" />
                  )}
                </div>
                <p className="mt-9 v2-serif font-light text-[clamp(1.25rem,2vw,1.6rem)] leading-[1.35] text-[#3a2f23] max-w-[34ch]">
                  Nous n’avons jamais eu autant de choix. Et jamais autant de choses n’ont choisi à notre place.
                </p>
                <div className="mt-7 border-l border-[#9c7a44]/60 pl-5">
                  <p className="text-[0.62rem] uppercase tracking-[0.3em] text-[#7d6330] mb-3">Les questions de la saison 2</p>
                  <ul className="space-y-1.5 v2-serif font-light text-[1.05rem] leading-snug text-[#3a2f23]">
                    {QUESTIONS_S2.map((q) => <li key={q}>{q}</li>)}
                  </ul>
                </div>
              </aside>
            </div>

            {saison1.length > 0 && (
              <div className="mt-[clamp(3.5rem,8vh,5.5rem)]">
                <button
                  type="button"
                  onClick={() => setSaison1Ouverte((o) => !o)}
                  aria-expanded={saison1Ouverte}
                  aria-controls="saison-1"
                  className="group flex w-full items-center justify-between gap-4 border-y border-[#1c1712]/25 py-5 text-left transition-colors duration-300 hover:bg-[#efe6d7]/60"
                >
                  <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span className="v2-serif font-light leading-none text-[#1c1712] text-[clamp(1.6rem,2.8vw,2.2rem)]">Saison 1</span>
                    <span className="text-[0.62rem] uppercase tracking-[0.2em] text-[#7d6330]">{saison1.length} épisodes</span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-2 border-b border-[#1c1712] pb-1 text-[0.68rem] uppercase tracking-[0.2em] text-[#1c1712] group-hover:text-[#7d6330] group-hover:border-[#9c7a44]">
                    {saison1Ouverte ? 'Masquer' : 'Voir les épisodes'}
                    <ArrowDown size={13} className={`transition-transform duration-300 ${saison1Ouverte ? 'rotate-180' : ''}`} />
                  </span>
                </button>
                {saison1Ouverte && (
                  <ul id="saison-1" className="lg:columns-2 lg:gap-x-[clamp(2rem,5vw,5rem)]">
                    {saison1.map((ep) => <LigneEpisode key={ep.id} ep={ep} rang={rang(ep, saison1)} lecteur={lecteur} />)}
                  </ul>
                )}
              </div>
            )}
          </section>
        </>
      )}

      {/* ─────────── C · Le direct (date, formulaire), après les épisodes ─────────── */}
      <LiveSignup compact sansEpisode />

      {/* ─────────── D · Infolettre ─────────── */}
      <section className={`relative w-full ${GOUTTIERE} py-[clamp(5rem,13vh,9rem)] bg-[#efe6d7]`}>
        <div className="w-full grid lg:grid-cols-[1.1fr_0.9fr] gap-x-[clamp(2rem,5vw,5rem)] gap-y-10 items-center">
          <div>
            <p className="text-[0.7rem] uppercase tracking-[0.34em] text-[#7d6330] mb-5">Rester dans le fil</p>
            <h2 className="v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2.2rem,5vw,3.8rem)]">
              Chaque épisode, dans votre boîte
            </h2>
            <p className="mt-6 v2-serif font-light text-[clamp(1.1rem,2vw,1.45rem)] text-[#3a2f23] max-w-[46ch] leading-snug">
              Recevez chaque nouvel épisode et chaque parution directement par courriel, sans bruit.
            </p>
          </div>
          <div>
            <NewsletterSignup
              source="podcast"
              variant="light"
              emailOnly
              ctaLabel="Rejoindre le fil"
              placeholder="Votre adresse courriel"
              className="w-full"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
