import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Headphones, CalendarBlank, Clock, Play, CircleNotch, ArrowUpRight, ArrowDown, ArrowRight,
} from '@phosphor-icons/react';
import NewsletterSignup from '../../components/NewsletterSignup';
import LiveSignup from '../../components/LiveSignup';
import { trackListenStart, startPresence, stopPresence } from '../../lib/podcastStats';

/**
 * Podcast « Au-delà des tendances » — branding V2 (magazine crème), même
 * langage que /krystine. Fetch fiable du flux HelloAudio (36 épisodes, temps
 * réel) PRÉSERVÉ à l'identique, lecteur sticky + liste éditoriale restylés,
 * infolettre source="podcast". Animations transform/opacity (Framer).
 */

const EASE = 'cubic-bezier(0.22,1,0.36,1)';
const ease = [0.22, 1, 0.36, 1] as const;

const RSS_URL = 'https://podcasts.helloaudio.fm/podcast/8b5de66f-dd99-4ccd-be0a-088c2553719e/Gx891ivJLp';

// Flux direct d'abord : helloaudio sert access-control-allow-origin: *,
// aucun proxy requis. allorigins reste en secours; corsproxy.io (403) et
// thingproxy (mort) retirés le 2026-07-18.
const PROXIES: ((u: string) => string)[] = [
  (u) => u,
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
];

type Episode = {
  id: string;
  title: string;
  date: string;
  duration: string;
  description: string;
  audio: string;
  /** Vignette propre à l'épisode (itunes:image de l'item), sinon la pochette. */
  image: string;
  season: 1 | 2;
};

// La saison 2 a été lancée en 2026. Les épisodes publiés à partir de cette
// année sont classés Saison 2, les autres Saison 1.
function seasonFromDate(pubDate: string): 1 | 2 {
  const y = new Date(pubDate).getFullYear();
  return y >= 2026 ? 2 : 1;
}

async function fetchFeedXml(): Promise<string> {
  for (const mk of PROXIES) {
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(mk(RSS_URL), { signal: ctrl.signal });
      clearTimeout(to);
      if (!res.ok) continue;
      const text = await res.text();
      if (text.includes('<item')) return text;
    } catch {
      /* proxy suivant */
    }
  }
  throw new Error('Flux injoignable');
}

function parseEpisodes(xml: string): { cover: string; episodes: Episode[] } {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const channel = doc.querySelector('channel');
  const cover =
    channel?.getElementsByTagName('itunes:image')[0]?.getAttribute('href') ||
    channel?.querySelector('image > url')?.textContent ||
    '';
  const episodes: Episode[] = [...doc.querySelectorAll('item')].map((it, i) => {
    const desc = (it.querySelector('description')?.textContent || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return {
      id: it.querySelector('guid')?.textContent || String(i),
      title: it.querySelector('title')?.textContent?.trim() || `Épisode ${i + 1}`,
      date: it.querySelector('pubDate')?.textContent || '',
      duration: it.getElementsByTagName('itunes:duration')[0]?.textContent?.trim() || '',
      description: desc,
      audio: it.querySelector('enclosure')?.getAttribute('url') || '',
      image: it.getElementsByTagName('itunes:image')[0]?.getAttribute('href') || cover,
      season: seasonFromDate(it.querySelector('pubDate')?.textContent || ''),
    };
  });
  return { cover, episodes };
}

const fmtDate = (d: string) => {
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return '';
  return t.toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' });
};
const fmtDur = (d: string) => {
  if (!d) return '';
  if (d.includes(':')) {
    const p = d.split(':').map(Number);
    const m = p.length === 3 ? p[0] * 60 + p[1] : p[0];
    return `${m} min`;
  }
  const s = Number(d);
  return Number.isNaN(s) ? d : `${Math.round(s / 60)} min`;
};

export default function PodcastV2() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  // La couverture de la page reste le visuel officiel Saison 2 (noir + or),
  // indépendamment de la pochette du flux RSS.
  const [cover, setCover] = useState('/podcast/live-cover.jpg');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [selected, setSelected] = useState<string | null>(null);
  const [openSeason, setOpenSeason] = useState<1 | 2 | null>(2);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const xml = await fetchFeedXml();
        const parsed = parseEpisodes(xml);
        if (!alive) return;
        if (!parsed.episodes.length) throw new Error('Aucun épisode');
        setEpisodes(parsed.episodes);
        setSelected(parsed.episodes[0].id);
        setStatus('ready');
      } catch {
        if (alive) setStatus('error');
      }
    })();
    return () => { alive = false; };
  }, []);

  const current = useMemo(() => episodes.find((e) => e.id === selected) || episodes[0], [episodes, selected]);

  return (
    <div
      className="relative min-h-screen w-full bg-[#f4efe6] text-[#1c1712] antialiased overflow-x-hidden"
      style={{ fontFamily: '"Inter", system-ui, sans-serif' }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..600&family=Inter:wght@300;400;500&display=swap');
        .v2-serif { font-family: "Fraunces", Georgia, serif; }
        .v2-grain {
          position: fixed; inset: 0; z-index: 60; pointer-events: none;
          opacity: 0.045; mix-blend-mode: multiply;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }
        @keyframes v2cue { 0%,100% { transform: translateY(0); opacity:.45 } 50% { transform: translateY(8px); opacity:1 } }
        .v2-cue { animation: v2cue 2.4s ${EASE} infinite; }
        @media (prefers-reduced-motion: reduce) { .v2-cue { animation: none; } }
      `}</style>

      <div className="v2-grain" aria-hidden />

      {/* Menu unifié du site = NavBar global (affiché par App.tsx) */}

      {/* ─────────── HERO · couverture ─────────── */}
      <section className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] pt-[clamp(7rem,13vh,9.5rem)] pb-[clamp(2.5rem,6vh,4.5rem)]">
        <div className="flex items-center justify-between border-t border-[#1c1712]/15 pt-3.5 text-[0.6rem] uppercase tracking-[0.28em] text-[#1c1712]/55">
          <span>N&deg; 04 &middot; Le Podcast</span>
          <span className="hidden sm:inline">Québec &middot; MMXXVI</span>
        </div>

        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } } }}
          className="mt-[clamp(2rem,5vh,3.5rem)] grid lg:grid-cols-[1.1fr_0.9fr] gap-x-[clamp(2rem,5vw,5rem)] gap-y-10 items-center"
        >
          <div>
            <motion.p variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 1, ease } } }}
              className="inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.34em] text-[#7d6330] mb-6">
              <Headphones size={14} weight="light" /> Au-delà des tendances
            </motion.p>
            <motion.h1 variants={{ hidden: { opacity: 0, y: 26 }, show: { opacity: 1, y: 0, transition: { duration: 1.1, ease } } }}
              className="v2-serif font-light leading-[0.94] text-[#1c1712] text-[clamp(2.8rem,7vw,6rem)]">
              Le Podcast
            </motion.h1>
            <motion.p variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 1, ease } } }}
              className="mt-7 v2-serif italic text-[clamp(1.3rem,2.4vw,1.95rem)] font-light leading-[1.32] text-[#3a2f23] max-w-[38ch]">
              Des conversations pour revenir à l’essentiel, écouter le corps et questionner ce qu’on tient pour acquis.
            </motion.p>
            {status === 'ready' && (
              <motion.p variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.9, ease } } }}
                className="mt-7 text-[0.7rem] uppercase tracking-[0.2em] text-[#1c1712]/55">
                {episodes.length} épisodes &middot; mis à jour en temps réel
              </motion.p>
            )}
          </div>

          {cover && (
            <motion.div
              variants={{ hidden: { opacity: 0, scale: 1.04 }, show: { opacity: 1, scale: 1, transition: { duration: 1.1, ease } } }}
              className="relative justify-self-center lg:justify-self-end w-[clamp(260px,46vw,420px)]"
            >
              <span className="pointer-events-none absolute -inset-2 border border-[#9c7a44]/35" aria-hidden />
              <img
                src={cover}
                alt="Au-delà des tendances, saison 2"
                referrerPolicy="no-referrer"
                className="relative w-full h-auto"
              />
            </motion.div>
          )}
        </motion.div>

        {status === 'ready' && (
          <div className="flex items-end justify-between border-b border-[#1c1712]/15 pb-3.5 mt-[clamp(2rem,5vh,3.5rem)] text-[0.6rem] uppercase tracking-[0.28em] text-[#1c1712]/55">
            <span className="flex items-center gap-2 v2-cue"><ArrowDown size={13} weight="regular" /> Les épisodes</span>
            <span className="hidden sm:inline">Inspira Nature</span>
          </div>
        )}
      </section>

      {/* ─────────── Podcast en direct (liveEvents) ─────────── */}
      <LiveSignup />

      {/* ─────────── Lecteur sticky de l'épisode sélectionné ─────────── */}
      {status === 'ready' && current && (
        <section className="sticky top-[64px] z-40 bg-[#efe6d7]/95 backdrop-blur-sm border-y border-[#1c1712]/12 py-6">
          <div className="mx-auto w-full max-w-[1180px] px-[clamp(1.5rem,5vw,5.5rem)]">
            <div className="flex items-start gap-4">
              {current.image && (
                <img
                  src={current.image}
                  alt=""
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  className="hidden sm:block w-20 h-20 rounded-[10px] object-cover shrink-0 shadow-[0_10px_24px_rgba(28,23,18,0.25)]"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[0.6rem] uppercase tracking-[0.24em] text-[#7d6330] mb-2">À l’écoute</p>
                <h2 className="v2-serif font-light text-[#1c1712] text-xl md:text-2xl mb-4 leading-snug">{current.title}</h2>
                <audio
                  key={current.id}
                  controls
                  preload="none"
                  className="w-full max-w-[760px]"
                  onPlay={e => {
                    // Première lecture de cet épisode dans ce rendu : trace permanente.
                    const el = e.currentTarget;
                    if (!el.dataset.traced) { el.dataset.traced = '1'; trackListenStart(current.id, current.title); }
                    startPresence(current.id, current.title);
                  }}
                  onPause={stopPresence}
                  onEnded={stopPresence}
                >
                  <source src={current.audio} type="audio/mpeg" />
                </audio>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─────────── Liste / états ─────────── */}
      <section className="mx-auto w-full max-w-[1180px] px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(4rem,10vh,7rem)]">
        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center py-24 text-[#3a2f23]">
            <CircleNotch className="animate-spin text-[#7d6330]" size={28} weight="bold" />
            <p className="mt-4 v2-serif italic">Chargement des épisodes…</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center py-20">
            <p className="v2-serif italic text-[#3a2f23] mb-5">Les épisodes ne se chargent pas pour l’instant.</p>
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

        {status === 'ready' && (
          <>
            <div className="mb-10">
              <p className="text-[0.7rem] uppercase tracking-[0.34em] text-[#7d6330] mb-4">Tous les épisodes</p>
              <h2 className="v2-serif font-light text-[#1c1712] text-[clamp(1.8rem,3.4vw,2.8rem)]">L’archive complète</h2>
            </div>

            <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
              {([2, 1] as const).map((s) => {
                const list = episodes.filter((e) => e.season === s);
                if (!list.length) return null;
                const open = openSeason === s;
                return (
                  <div key={s}>
                    <button
                      onClick={() => setOpenSeason(open ? null : s)}
                      className="group flex w-full items-center justify-between border-b border-[#1c1712]/25 pb-4 text-left"
                    >
                      <span className="flex items-baseline gap-3">
                        <span className="v2-serif font-light text-[#1c1712] text-[clamp(1.5rem,2.6vw,2.1rem)]">Saison {s}</span>
                        <span className="text-[0.62rem] uppercase tracking-[0.18em] text-[#7d6330]">{list.length} épisodes</span>
                      </span>
                      <ArrowDown size={20} weight="light" className={`text-[#7d6330] transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
                    </button>
                    {open && (
                      <div>
                        {list.map((ep) => {
                          const active = ep.id === selected;
                          const num = list.length - list.indexOf(ep);
                          return (
                            <button
                              key={ep.id}
                              onClick={() => { setSelected(ep.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                              className={`group w-full text-left border-b border-[#1c1712]/10 py-5 transition-colors duration-300 ${active ? 'bg-[#efe6d7]' : 'hover:bg-[#efe6d7]/50'}`}
                            >
                              <div className="flex items-start gap-4 px-1">
                                {ep.image ? (
                                  <span className="relative w-12 h-12 shrink-0 overflow-hidden rounded-[10px]">
                                    <img src={ep.image} alt="" referrerPolicy="no-referrer" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                                    <span className={`absolute inset-0 grid place-items-center transition-colors duration-300 ${active ? 'bg-[#1c1712]/45 text-[#faf6ee]' : 'bg-[#1c1712]/0 text-transparent group-hover:bg-[#1c1712]/45 group-hover:text-[#faf6ee]'}`}>
                                      <Play size={14} weight="fill" className="ml-0.5" />
                                    </span>
                                  </span>
                                ) : (
                                  <span className={`grid place-items-center w-10 h-10 shrink-0 rounded-full transition-colors duration-300 ${active ? 'bg-[#9c7a44] text-[#faf6ee]' : 'border border-[#9c7a44]/40 text-[#7d6330] group-hover:bg-[#9c7a44] group-hover:text-[#faf6ee]'}`}>
                                    <Play size={14} weight="fill" className="ml-0.5" />
                                  </span>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-baseline gap-2.5">
                                    <span className="v2-serif text-[#7d6330] tabular-nums text-xs shrink-0">{String(num).padStart(2, '0')}</span>
                                    <h3 className="v2-serif font-light text-[#1c1712] text-[clamp(1.05rem,1.6vw,1.3rem)] leading-snug">{ep.title}</h3>
                                  </div>
                                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 pl-6 text-[0.58rem] uppercase tracking-[0.14em] text-[#1c1712]/55">
                                    {ep.date && <span className="inline-flex items-center gap-1.5"><CalendarBlank size={11} weight="light" className="text-[#7d6330]" />{fmtDate(ep.date)}</span>}
                                    {ep.duration && <span className="inline-flex items-center gap-1.5"><Clock size={11} weight="light" className="text-[#7d6330]" />{fmtDur(ep.duration)}</span>}
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* ─────────── INFOLETTRE (back-end préservé) ─────────── */}
      <section className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,15vh,11rem)] bg-[#efe6d7]">
        <div className="max-w-[720px] mx-auto text-center">
          <p className="text-[0.7rem] uppercase tracking-[0.34em] text-[#7d6330] mb-5">Rester dans le fil</p>
          <h2 className="v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2.2rem,5vw,3.8rem)]">
            Chaque épisode, dans votre boîte
          </h2>
          <p className="mt-6 v2-serif italic text-[clamp(1.1rem,2vw,1.45rem)] text-[#3a2f23] max-w-[46ch] mx-auto leading-snug">
            Recevez chaque nouvel épisode et chaque parution directement par courriel, sans bruit.
          </p>
          <div className="mt-10">
            <NewsletterSignup
              source="podcast"
              variant="light"
              emailOnly
              ctaLabel="Rejoindre le fil"
              placeholder="Votre adresse courriel"
              className="max-w-xl mx-auto"
            />
          </div>
        </div>
      </section>

      {/* ─────────── CLÔTURE · back-cover ─────────── */}
      <footer className="relative w-full bg-[#34241a] text-[#f4efe6] px-[clamp(1.5rem,5vw,5.5rem)] pt-[clamp(5rem,12vh,9rem)] pb-12">
        <div className="max-w-[860px] mx-auto text-center">
          <p className="v2-serif italic font-light text-[clamp(1.6rem,3.6vw,2.8rem)] leading-[1.24] text-[#f4efe6]">
            « Revenir à l’essentiel, un épisode à la fois. »
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-9 gap-y-4">
            <a href="/medias" className="group inline-flex items-center gap-2.5 text-[0.72rem] uppercase tracking-[0.2em] text-[#34241a] bg-[#f4efe6] px-8 py-3.5 transition-colors duration-300 hover:bg-[#9c7a44]">
              Tous les médias
              <ArrowRight size={15} weight="regular" className="transition-transform duration-300 group-hover:translate-x-1" />
            </a>
            <a href="/krystine" className="inline-flex items-center gap-2.5 v2-serif italic text-lg text-[#f4efe6]/80 hover:text-[#c8a86a] transition-colors duration-300">
              La conférencière
            </a>
          </div>
        </div>
        <div className="mt-[clamp(4rem,9vh,7rem)] pt-7 border-t border-[#f4efe6]/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-[0.6rem] uppercase tracking-[0.24em] text-[#f4efe6]/45">
          <span className="v2-serif normal-case tracking-tight text-[0.95rem] text-[#f4efe6]/80">
            Krystine <span className="italic font-light">St-Laurent</span>
          </span>
          <span>Inspira Nature &middot; Québec &middot; MMXXVI</span>
        </div>
      </footer>
    </div>
  );
}
