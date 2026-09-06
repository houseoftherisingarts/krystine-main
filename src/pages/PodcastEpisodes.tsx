import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { partEcoutee } from '../lib/youtube';
import { PART_ECOUTEE } from '../lib/pointsConfig';
import { motion } from 'framer-motion';
import { Headphones, Calendar, Clock, Play, Loader2, ExternalLink } from 'lucide-react';
import NewsletterSignup from '../components/NewsletterSignup';

/**
 * Podcast « Au-delà des tendances » — page React (style L'Œuvre).
 * Porte le bundle statique /podcast vers React + fetch fiable du flux
 * HelloAudio (les 36 épisodes, temps réel). Remplace l'ancien bundle.
 */

const RSS_URL = 'https://podcasts.helloaudio.fm/podcast/8b5de66f-dd99-4ccd-be0a-088c2553719e/Gx891ivJLp';

// Proxies CORS, par fiabilité (allorigins d'abord — validé 36 épisodes).
const PROXIES: ((u: string) => string)[] = [
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
  (u) => `https://thingproxy.freeboard.io/fetch/${u}`,
];

type Episode = {
  id: string;
  title: string;
  date: string;
  duration: string;
  description: string;
  audio: string;
};

const ease = [0.16, 0.8, 0.24, 1] as const;

async function fetchFeedXml(): Promise<string> {
  for (const mk of PROXIES) {
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(mk(RSS_URL), { signal: ctrl.signal });
      clearTimeout(to);
      if (!res.ok) continue;
      const text = await res.text();
      if (text.includes('<item')) return text; // valide: contient des épisodes
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

const PodcastEpisodes: React.FC = () => {
  const { user } = useApp();
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [cover, setCover] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const xml = await fetchFeedXml();
        const parsed = parseEpisodes(xml);
        if (!alive) return;
        if (!parsed.episodes.length) throw new Error('Aucun épisode');
        setCover(parsed.cover);
        setEpisodes(parsed.episodes);
        setSelected(parsed.episodes[0].id);
        setStatus('ready');
      } catch {
        if (alive) setStatus('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const current = useMemo(() => episodes.find((e) => e.id === selected) || episodes[0], [episodes, selected]);

  return (
    <div className="bg-cream text-ink font-sans antialiased min-h-screen">
      {/* ── Hero ── */}
      <section className="relative bg-espressoDeep pt-36 pb-20 overflow-hidden">
        <div className="pointer-events-none absolute -top-1/4 -right-1/4 h-[60%] w-[60%] rounded-full bg-brass/10 blur-[150px]" />
        <div className="relative z-10 mx-auto w-full max-w-[1180px] px-6 md:px-12 grid lg:grid-cols-[1fr_auto] gap-12 items-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease }}>
            <p className="inline-flex items-center gap-2 text-brass text-[0.62rem] font-bold uppercase tracking-[0.28em] mb-6">
              <Headphones size={14} /> Le podcast
            </p>
            <h1 className="font-serif font-medium text-ctext leading-[1.0] text-[clamp(2.4rem,5vw,4.2rem)]">Au-delà des tendances</h1>
            <p className="mt-6 font-serif italic text-[clamp(1.2rem,2.2vw,1.7rem)] text-ctextSoft max-w-[40ch]">
              Des conversations pour revenir à l'essentiel, écouter le corps et questionner ce qu'on tient pour acquis.
            </p>
            {status === 'ready' && (
              <p className="mt-6 font-sans text-sm text-ctextSoft/70">{episodes.length} épisodes · mis à jour en temps réel</p>
            )}
          </motion.div>
          {cover && (
            <motion.img
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.1, ease, delay: 0.12 }}
              src={cover}
              alt="Au-delà des tendances"
              className="hidden lg:block w-[280px] h-[280px] rounded-[1.5rem] object-cover border border-brass/25 shadow-[0_30px_70px_rgba(0,0,0,0.5)]"
              referrerPolicy="no-referrer"
            />
          )}
        </div>
      </section>

      {/* ── Lecteur de l'épisode sélectionné ── */}
      {status === 'ready' && current && (
        <section className="bg-espresso py-9 sticky top-0 z-30 border-b border-brass/15">
          <div className="mx-auto w-full max-w-[1180px] px-6 md:px-12">
            <p className="text-brass text-[0.6rem] uppercase tracking-[0.22em] mb-2">À l'écoute</p>
            <h2 className="font-serif text-ctext text-xl md:text-2xl mb-4 leading-snug">{current.title}</h2>
            <audio
              key={current.id} controls preload="none" className="w-full max-w-[760px]"
              onTimeUpdate={(e) => {
                // Deux niskas par épisode, donnés après 80 % d'écoute, une fois.
                const a = e.currentTarget;
                if (user?.uid && partEcoutee(a.currentTime, a.duration, PART_ECOUTEE)) {
                  import('../firebase/points').then(({ points }) => points.podcastListened(user.uid, current.id).catch(() => {}));
                }
              }}
            >
              <source src={current.audio} type="audio/mpeg" />
            </audio>
          </div>
        </section>
      )}

      {/* ── Liste / états ── */}
      <section className="mx-auto w-full max-w-[1180px] px-6 md:px-12 py-16 md:py-24">
        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center py-24 text-inkSoft">
            <Loader2 className="animate-spin text-brassInk" size={28} />
            <p className="mt-4 font-serif italic">Chargement des épisodes…</p>
          </div>
        )}
        {status === 'error' && (
          <div className="text-center py-20">
            <p className="font-serif italic text-inkSoft mb-4">Les épisodes ne se chargent pas pour l'instant.</p>
            <a
              href="https://www.youtube.com/@KrystineStLaurent"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-brassInk border-b border-brass/40 pb-1"
            >
              Écouter sur YouTube <ExternalLink size={15} />
            </a>
          </div>
        )}
        {status === 'ready' && (
          <>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease }}
              className="font-serif font-medium uppercase tracking-[0.04em] text-ink text-[clamp(1.6rem,3vw,2.4rem)] mb-10"
            >
              Tous les épisodes
            </motion.h2>
            <div className="space-y-4">
              {episodes.map((ep, i) => {
                const active = ep.id === selected;
                return (
                  <motion.button
                    key={ep.id}
                    onClick={() => {
                      setSelected(ep.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.05 }}
                    transition={{ duration: 0.6, ease, delay: Math.min(i, 8) * 0.03 }}
                    className={`w-full text-left rounded-2xl border p-5 md:p-6 transition-colors ${
                      active ? 'border-brass/50 bg-card shadow-[0_10px_30px_rgba(187,154,94,0.12)]' : 'border-cream3 bg-card hover:border-brass/30'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <span className={`grid place-items-center w-11 h-11 shrink-0 rounded-full ${active ? 'bg-brass text-espressoDeep' : 'bg-cream2 text-brassInk'}`}>
                        <Play size={16} className="ml-0.5" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-serif text-lg md:text-xl text-ink leading-snug">{ep.title}</h3>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.72rem] uppercase tracking-[0.12em] text-brassInk">
                          {ep.date && (
                            <span className="inline-flex items-center gap-1.5">
                              <Calendar size={12} />
                              {fmtDate(ep.date)}
                            </span>
                          )}
                          {ep.duration && (
                            <span className="inline-flex items-center gap-1.5">
                              <Clock size={12} />
                              {fmtDur(ep.duration)}
                            </span>
                          )}
                        </div>
                        {ep.description && (
                          <p className="mt-3 font-sans text-[0.9rem] leading-relaxed text-inkSoft line-clamp-2 max-w-[80ch]">{ep.description}</p>
                        )}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </>
        )}
      </section>

      <div className="bg-cream2 border-t border-cream3">
        <NewsletterSignup source="podcast" />
      </div>
    </div>
  );
};

export default PodcastEpisodes;
