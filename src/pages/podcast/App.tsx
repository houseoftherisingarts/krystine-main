
// Podcast page — migrated 2026-05-06 from the standalone Vite project
// `podcast-vata-ksl (6)`. createRoot import + bottom mount block removed
// so this file just exports the App component for the parent router to
// render under /podcast.
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ZapOff, Cloud, Moon, Flame, Mountain, Heart, Waves, Wind, Map, Anchor, Check, 
  ScrollText, Flower2, Stars, Leaf, Feather, Compass, Volume2, VolumeX, Sun, 
  ArrowRight, BrainCircuit, Ear, Eye, Hand, Apple, BatteryCharging, CheckCircle, 
  Sparkles, Music, User, Trees, Layout, ChevronDown, Glasses, Play, Pause, Quote,
  Plus, Minus, Headphones, Coffee, SunMedium, ShieldCheck, Timer, RotateCcw,
  ExternalLink, Loader2, Calendar, Gauge
} from 'lucide-react';
import { Language } from './types';
import { CONTENT } from './constants';
import { Button } from './components/Button';

// Assets
const AUDIO_URL = "https://storage.googleapis.com/inspirata/Base%20site/Whispers%20of%20Rivendell.mp3";
const BIO_AUDIO_URL = "https://storage.googleapis.com/inspirata/Vata/EPISODE%2017%20-%20VATA%20ET%20LE%20CHAOS%20.mp3";
const SIGNATURE_URL = "https://storage.googleapis.com/inspirata/Vata/1%20(1).png";
const SUBTLE_BG = "https://storage.googleapis.com/inspirata/Vata/Gemini_Generated_Image_53xxio53xxio53xx.png";

const IMAGES = {
  krystine: "https://storage.googleapis.com/inspirata/21%20jours/krysttine%20red.webp",
};

// Polished-copper button finish — diagonal gradient with a top inner
// highlight (light source) and a bottom inner shadow (depth) so round
// play buttons read as a metal dome rather than a flat disc. Reused
// across the featured player, the list-item circles, and any other
// round CTA on /podcast.
const COPPER_BTN_STYLE: React.CSSProperties = {
  background: 'linear-gradient(135deg, #E8B07A 0%, #C68053 25%, #B8532F 50%, #6B402F 78%, #8C4823 100%)',
  boxShadow: 'inset 0 1px 0 rgba(255,225,195,0.6), inset 0 -2px 4px rgba(58,37,30,0.45), 0 6px 14px rgba(107,64,47,0.4)',
  color: '#F4E7DD',
};

// --- RSS Feed Interfaces ---
interface Episode {
    title: string;
    pubDate: string;
    link: string;
    guid: string;
    author: string;
    thumbnail: string;
    description: string;
    content: string;
    enclosure: {
        link: string;
        type: string;
        length: number;
        duration: number;
    };
}

// --- Episodes fetch (perf pass 2026-05-07) ---
// Three optimizations layered together:
//   1. Module-level kickoff — the network request fires the moment this
//      module is imported (before React mounts), so by the time the
//      component's effect runs, the response is often already in flight.
//   2. Multi-proxy race — `corsproxy.io` and `allorigins.win` are queried
//      in parallel; whichever returns first wins. allorigins is often
//      slow / overloaded, so racing it against a faster mirror cuts the
//      typical wait from 2–5s to 300–800ms.
//   3. 24h localStorage cache (was 1h) — repeat visits are instant; a
//      background revalidation still runs once per day.
const RSS_URL = "https://podcasts.helloaudio.fm/podcast/8b5de66f-dd99-4ccd-be0a-088c2553719e/Gx891ivJLp";
const EPISODES_CACHE_KEY = 'podcast_episodes_v2';
const EPISODES_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const EPISODES_PROXIES: ((u: string) => string)[] = [
  (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
];

const parseEpisodesXML = (str: string): Episode[] => {
  const data = new window.DOMParser().parseFromString(str, "text/xml");
  const items = data.querySelectorAll("item");
  return Array.from(items).map((item) => {
    const getText = (tag: string) => item.getElementsByTagName(tag)[0]?.textContent?.trim() || "";
    const getAttr = (tag: string, attr: string) => item.getElementsByTagName(tag)[0]?.getAttribute(attr) || "";
    const enclosureNode = item.getElementsByTagName("enclosure")[0];
    return {
      title: getText("title"),
      pubDate: getText("pubDate"),
      link: getText("link"),
      guid: getText("guid"),
      author: getText("itunes:author") || getText("author"),
      thumbnail: getAttr("itunes:image", "href"),
      description: getText("description"),
      content: getText("content:encoded") || getText("description"),
      enclosure: {
        link: enclosureNode?.getAttribute("url") || "",
        type: enclosureNode?.getAttribute("type") || "",
        length: Number(enclosureNode?.getAttribute("length")) || 0,
        duration: 0,
      },
    };
  });
};

const fetchEpisodesNetwork = async (): Promise<Episode[]> => {
  const xml = await Promise.any(
    EPISODES_PROXIES.map(async (mkUrl) => {
      const res = await fetch(mkUrl(RSS_URL));
      if (!res.ok) throw new Error(`proxy ${res.url} returned ${res.status}`);
      return res.text();
    })
  );
  return parseEpisodesXML(xml);
};

let inflightEpisodesFetch: Promise<Episode[]> | null = null;
const startEpisodesFetch = () => {
  if (!inflightEpisodesFetch) inflightEpisodesFetch = fetchEpisodesNetwork();
  return inflightEpisodesFetch;
};
// Fire the fetch the moment the module loads (browser only).
if (typeof window !== 'undefined') {
  startEpisodesFetch();
}

// --- Interfaces for Controlled Components ---
interface AudioState {
    isPlaying: boolean;
    currentUrl: string | null;
    currentTime: number;
    duration: number;
    isBuffering: boolean;
    speed: number;
}

interface AudioControls {
    play: (url: string) => void;
    pause: () => void;
    seek: (time: number) => void;
    setSpeed: (speed: number) => void;
}

// --- Immersive Decorative Components ---

// Hero composition (2026-05-07 redesign): the disc and the headphones
// were previously stacked in a single `RecordWithKrystine` element with
// the headphones overlapping the cover. Per user direction the disc is
// now the dominant visual on its own (no occlusion), and the headphones
// are relocated to the editorial hero block as a floating accent.
// Both components share the same asset URLs — the headphones PNG is
// referenced from one place; we just render it in a different slot.
const HEADPHONES_URL = "https://storage.googleapis.com/origine1/headphones.png";

// Spinning vinyl with Krystine's portrait as the album cover. Sized via
// `--vinyl-size` so callers can scale it without rewriting the inner
// chain. A soft copper halo sits behind the disc to lift it off the
// parchment background; a long warm shadow grounds it on the page.
const VinylShowcase: React.FC<{ size?: string; className?: string }> = ({
  size = 'min(100%, 56vh)',
  className = '',
}) => {
  return (
    <div className={`relative w-full flex items-center justify-center pointer-events-none select-none ${className}`}>
      <div className="relative" style={{ width: size, aspectRatio: '1 / 1' }}>
        {/* Copper ambient halo — soft radial bloom behind the disc. */}
        <div
          aria-hidden
          className="absolute inset-[-12%] rounded-full"
          style={{
            background:
              'radial-gradient(closest-side, rgba(184,83,47,0.28) 0%, rgba(184,83,47,0.12) 40%, rgba(184,83,47,0) 72%)',
            filter: 'blur(4px)',
          }}
        />

        {/* Outer copper ring — thin metallic edge that catches the eye. */}
        <div
          aria-hidden
          className="absolute inset-[2%] rounded-full"
          style={{
            background:
              'conic-gradient(from 220deg, #C68053 0deg, #6B402F 90deg, #B8532F 180deg, #6B402F 270deg, #C68053 360deg)',
            opacity: 0.32,
            filter: 'blur(0.5px)',
          }}
        />

        {/* Spinning disc + Krystine cover (rotate together). */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-[4%]"
        >
          <svg
            viewBox="0 0 200 200"
            className="absolute inset-0 w-full h-full drop-shadow-[0_28px_48px_rgba(58,37,30,0.36)]"
            aria-hidden
          >
            <defs>
              <radialGradient id="record-vinyl" cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor="#1A1614" />
                <stop offset="55%"  stopColor="#0D0B0A" />
                <stop offset="100%" stopColor="#1A1614" />
              </radialGradient>
              {/* Subtle highlight sweep along one side of the disc to
                  read as polished vinyl, not flat black. */}
              <linearGradient id="record-sheen" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"  stopColor="#F4E7DD" stopOpacity="0.10" />
                <stop offset="50%" stopColor="#F4E7DD" stopOpacity="0" />
                <stop offset="100%" stopColor="#F4E7DD" stopOpacity="0.06" />
              </linearGradient>
            </defs>
            <circle cx="100" cy="100" r="98" fill="url(#record-vinyl)" />
            <circle cx="100" cy="100" r="98" fill="url(#record-sheen)" />
            {[94, 90, 86, 82, 78, 74, 70, 66, 60, 54, 48].map((r) => (
              <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="#6B402F" strokeWidth="0.28" opacity="0.5" />
            ))}
            {/* Centre spindle dot. */}
            <circle cx="100" cy="100" r="2.4" fill="#F4E7DD" opacity="0.92" />
          </svg>

          {/* Album-cover portrait at the centre of the disc. */}
          <img
            src={IMAGES.krystine}
            alt=""
            aria-hidden
            draggable={false}
            loading="eager"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full object-cover shadow-[0_14px_30px_rgba(58,37,30,0.55)]"
            style={{
              width: '44%',
              height: '44%',
              opacity: 0.92,
              boxShadow:
                '0 14px 30px rgba(58,37,30,0.55), inset 0 0 0 2px rgba(184,83,47,0.55), inset 0 0 0 4px rgba(244,231,221,0.18)',
            }}
          />
        </motion.div>
      </div>
    </div>
  );
};

// Floating headphones — same asset Origine's "Souffle d'Origine" uses.
// Drawn standalone (no longer overlapping the disc) and positioned by
// the parent. A slow Y oscillation gives it weight and presence.
const FloatingHeadphones: React.FC<{ className?: string; style?: React.CSSProperties }> = ({
  className = '',
  style,
}) => (
  <motion.img
    src={HEADPHONES_URL}
    alt=""
    aria-hidden
    draggable={false}
    animate={{ y: [-8, 8, -8], rotate: [-2, 2, -2] }}
    transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut' }}
    className={`pointer-events-none select-none object-contain drop-shadow-[0_22px_32px_rgba(58,37,30,0.45)] ${className}`}
    style={style}
  />
);

const FloatingParticles = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-brand-vata/30 blur-[1px]"
          initial={{
            opacity: 0,
            y: typeof window !== 'undefined' ? window.innerHeight + 50 : 1000,
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
            scale: Math.random() * 0.5 + 0.2
          }}
          animate={{
            y: -100,
            opacity: [0, 0.4, 0],
            x: `calc(${Math.random() * 200 - 100}px + ${Math.random() * 100}%)`
          }}
          transition={{
            duration: Math.random() * 20 + 15,
            repeat: Infinity,
            ease: "linear",
            delay: Math.random() * 10
          }}
          style={{ width: Math.random() * 4 + 2 + 'px', height: Math.random() * 4 + 2 + 'px' }}
        />
      ))}
    </div>
  );
};

// Podcast List Component (Controlled)
const PodcastList: React.FC<{ 
    episodes: Episode[], 
    audioState: AudioState,
    controls: AudioControls 
}> = ({ episodes, audioState, controls }) => {
    
    const formatTime = (time: number) => {
        if (!time || isNaN(time)) return "00:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handlePlay = (url: string) => {
        if (!url) return;
        if (audioState.currentUrl === url && audioState.isPlaying) {
            controls.pause();
        } else {
            controls.play(url);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = Number(e.target.value);
        controls.seek(time);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    };

    // Find the currently playing episode object for the footer
    const currentEpisode = episodes.find(ep => ep.enclosure.link === audioState.currentUrl);

    if (episodes.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-brand-accent">
                <Loader2 className="animate-spin mr-2" />
                <span className="text-sm font-messiri animate-pulse">Chargement des épisodes...</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col bg-brand-light/40 backdrop-blur-sm relative">
            <div className="p-3 md:p-4 border-b border-brand-accent/30 bg-brand-light/60 backdrop-blur-md">
                <div className="flex items-center justify-between">
                    <h3 className="font-messiri text-base md:text-lg text-brand-dark">Liste des épisodes</h3>
                    <span className="text-[10px] md:text-xs uppercase tracking-widest text-brand-accent">{episodes.length} Épisodes</span>
                </div>
            </div>

            <div className="p-2 space-y-2">
                {episodes.map((ep, idx) => {
                    const isCurrent = audioState.currentUrl === ep.enclosure.link;
                    const isPlaying = isCurrent && audioState.isPlaying;
                    const isBuffering = isCurrent && audioState.isBuffering;

                    return (
                        <div
                            key={idx}
                            onClick={() => handlePlay(ep.enclosure.link)}
                            className={`group flex items-center gap-3 md:gap-4 p-2 md:p-3 rounded-xl transition-all duration-300 cursor-pointer border ${isCurrent ? 'bg-brand-accent/20 border-brand-accent' : 'bg-brand-light/40 border-brand-accent/15 hover:bg-brand-light/60 hover:border-brand-accent/40'}`}
                        >
                            <div
                                style={(isPlaying || isBuffering) ? COPPER_BTN_STYLE : undefined}
                                className={`shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-colors ${isPlaying || isBuffering ? '' : 'bg-brand-light/80 text-brand-accent border border-brand-accent/40 group-hover:bg-brand-accent/30 group-hover:border-brand-accent'}`}
                            >
                                {isBuffering ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : isPlaying ? (
                                    <Pause size={16} />
                                ) : (
                                    <Play size={16} className="ml-1" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <Calendar size={10} className="text-brand-accent" />
                                    <span className="text-[9px] md:text-[10px] uppercase tracking-wide text-brand-dark/60 font-semibold">
                                        {formatDate(ep.pubDate)}
                                    </span>
                                </div>
                                <h4 className={`text-xs md:text-sm font-medium truncate leading-tight ${isCurrent ? 'text-brand-accent' : 'text-brand-dark'}`}>
                                    {ep.title}
                                </h4>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Persistent Player Footer — parchment with bronze accents. */}
            {currentEpisode && (
                <div className="p-3 md:p-4 bg-brand-light/80 border-t border-brand-accent/30 backdrop-blur-xl z-20 shrink-0 shadow-2xl">
                    <div className="flex flex-col gap-2 md:gap-3">
                        <div className="flex justify-between items-center">
                             <h4 className="text-xs font-bold text-brand-accent truncate max-w-[80%]">
                                {currentEpisode.title}
                             </h4>
                             <button
                                onClick={() => handlePlay(currentEpisode.enclosure.link)}
                                className="text-brand-dark hover:text-brand-accent transition-colors p-1"
                             >
                                {audioState.isBuffering ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : audioState.isPlaying ? (
                                    <Pause size={16} />
                                ) : (
                                    <Play size={16} />
                                )}
                             </button>
                        </div>

                        <div className="flex items-center gap-3 text-[10px] font-mono text-brand-dark/70 select-none">
                             <span className="w-8 text-right">{formatTime(audioState.currentTime)}</span>
                             <div className="flex-1 relative h-4 flex items-center">
                                 <input
                                    type="range"
                                    min="0"
                                    max={audioState.duration || 100}
                                    value={audioState.currentTime}
                                    onChange={handleSeek}
                                    className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent/50"
                                    style={{
                                        background: `linear-gradient(to right, #B8532F ${(audioState.currentTime / (audioState.duration || 1)) * 100}%, rgba(184,83,47,0.15) ${(audioState.currentTime / (audioState.duration || 1)) * 100}%)`
                                    }}
                                 />
                             </div>
                             <div className="flex flex-col items-end leading-none w-16">
                                <span>{formatTime(audioState.duration)}</span>
                                {audioState.duration > 0 && (
                                    <span className="text-brand-accent opacity-80 scale-90 origin-right">
                                        -{formatTime(Math.max(0, audioState.duration - audioState.currentTime))}
                                    </span>
                                )}
                             </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Bio Audio Player Component (Unused in current flow but kept for component integrity)
interface BioAudioPlayerProps {
    audioState: AudioState;
    controls: AudioControls;
    lang: Language;
    label?: string;
    subLabel?: string;
    compactMobile?: boolean;
    audioUrl?: string;
    showControls?: boolean;
}

const BioAudioPlayer: React.FC<BioAudioPlayerProps> = ({ 
    audioState,
    controls,
    lang, 
    label, 
    subLabel,
    compactMobile = false,
    audioUrl,
    showControls = true
}) => {
  
  const isCurrentUrl = audioState.currentUrl === audioUrl;
  const isPlaying = isCurrentUrl && audioState.isPlaying;
  const isBuffering = isCurrentUrl && audioState.isBuffering;

  const toggle = () => {
    if(!audioUrl || !showControls) return;

    if(isPlaying) {
        controls.pause();
    } else {
        controls.play(audioUrl);
    }
  };

  const buttonLabel = label || (isPlaying ? (lang === 'fr' ? 'Pause' : 'Pause') : (lang === 'fr' ? 'Écouter' : 'Listen'));
  const description = subLabel || (lang === 'fr' 
              ? "VATA et le coût caché de notre rythme moderne" 
              : "VATA and the hidden cost of our modern rhythm");

  return (
    <div className={`flex items-center relative z-20 ${compactMobile ? 'flex-row gap-4' : 'flex-col gap-4'}`}>
        
        <div className={`relative shrink-0 ${showControls ? 'cursor-pointer' : ''}`} onClick={toggle}>
             <div className={`absolute inset-0 rounded-full bg-brand-accent/30 blur-md transition-transform duration-1000 ${isPlaying ? 'scale-110' : 'scale-100'}`} />
             <div className={`${compactMobile ? 'w-20 h-20' : 'w-24 h-24'} lg:w-48 lg:h-48 rounded-full border-2 border-brand-accent overflow-hidden relative z-10 shadow-lg`}>
                <img src={IMAGES.krystine} alt="Krystine" className="w-full h-full object-cover" />
             </div>
             {showControls && (
                 <button 
                    onClick={(e) => { e.stopPropagation(); toggle(); }}
                    className="absolute -bottom-1 -right-1 w-8 h-8 lg:w-14 lg:h-14 rounded-full bg-brand-vata text-white flex items-center justify-center shadow-md z-30 hover:scale-110 transition-transform disabled:opacity-50"
                    disabled={!audioUrl}
                 >
                    {isBuffering ? <Loader2 size={16} className="animate-spin" /> : (isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />)}
                 </button>
             )}
        </div>

        {showControls && (
            <div className={`flex flex-col ${compactMobile ? 'items-start' : 'items-center'} gap-2`}>
                {!compactMobile && (
                    <div className="flex items-end justify-center gap-1.5 h-6 w-32 shrink-0">
                        {[...Array(8)].map((_, i) => (
                            <motion.div 
                                key={i}
                                className="w-1.5 bg-brand-accent/60 rounded-full"
                                animate={{
                                    height: isPlaying ? [
                                        `${Math.random() * 20 + 20}%`, 
                                        `${Math.random() * 80 + 20}%`, 
                                        `${Math.random() * 20 + 20}%`
                                    ] : "20%"
                                }}
                                transition={isPlaying ? {
                                    duration: 0.6,
                                    repeat: Infinity,
                                    repeatType: "reverse",
                                    delay: i * 0.05
                                } : { duration: 0.3 }}
                            />
                        ))}
                    </div>
                )}

                <Button 
                variant="outline" 
                size="sm"
                onClick={toggle}
                disabled={!audioUrl}
                className={`!rounded-full border-brand-accent text-brand-accent hover:bg-brand-accent/10 flex flex-col gap-1 group transition-all shrink-0 ${compactMobile ? 'px-4 py-2 items-start' : 'px-6 py-2 lg:py-3 items-center'} ${!audioUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                <div className="flex items-center gap-2">
                    <Headphones size={16} className="lg:w-[18px] lg:h-[18px] group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] lg:text-xs font-bold uppercase tracking-wider">
                        {audioUrl ? buttonLabel : (lang === 'fr' ? 'Chargement...' : 'Loading...')}
                    </span>
                </div>
                {!compactMobile && (
                    <span className="text-[9px] lg:text-[10px] opacity-90 font-semibold max-w-[200px] text-center leading-tight hidden lg:block">
                        {description}
                    </span>
                )}
                </Button>
            </div>
        )}
    </div>
  );
};

// Slide Layout Wrapper — natural-flow (page-scrolls instead of clipping
// to viewport). Drops `h-full` and `overflow-hidden` so the slide grows
// to fit its content and the page wrapper handles scroll.
const SlideLayout: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = "" }) => (
  <div className={`w-full pt-20 md:pt-28 pb-8 md:pb-16 px-4 md:px-12 flex flex-col relative z-10 ${className}`}>
    {children}
  </div>
);

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('fr');
  // Light mode is locked on /podcast (2026-05-07 user direction). The
  // toggle in the original bundle was removed from the UI; `isDark` is
  // kept as a constant so existing references in slide markup continue
  // to compile but always evaluate light-mode branches.
  const isDark = false;
  const setIsDark = (_: boolean | ((v: boolean) => boolean)) => { /* no-op */ };
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [introStep, setIntroStep] = useState(0);
  
  // Podcast Data
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  
  // Global Audio State
  const [audioState, setAudioState] = useState<AudioState>({
    isPlaying: false,
    currentUrl: null,
    currentTime: 0,
    duration: 0,
    isBuffering: false,
    speed: 1
  });

  // Refs
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  const contentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Audio Controls Wrapper
  const controls: AudioControls = useMemo(() => ({
    play: async (url: string) => {
        const audio = contentAudioRef.current;
        if (!audio) return;

        // If resuming same track
        if (audioState.currentUrl === url) {
            try {
                await audio.play();
                setAudioState(prev => ({ ...prev, isPlaying: true }));
            } catch (e) {
                console.warn("Resume failed", e);
            }
            return;
        }

        // Playing new track
        setAudioState(prev => ({ ...prev, isBuffering: true, currentUrl: url, currentTime: 0, speed: 1 }));
        
        // Critical for Mobile: The sequence (pause -> src -> load -> play)
        try {
            audio.pause();
            audio.currentTime = 0; // Reset
            audio.playbackRate = 1; // Reset speed on new track
            audio.src = url;
            audio.load();
            
            // Play immediately - waiting for 'canplay' inside the handler is safest for mobile
            await audio.play();
        } catch (e: any) {
            // Ignore interruption errors which happen frequently on quick track switching
            if (e.name === 'AbortError' || e.message?.includes('interrupted')) {
                console.log("Playback interrupted (harmless)");
                return;
            }
            console.error("Content play failed", e);
            setAudioState(prev => ({ ...prev, isBuffering: false, isPlaying: false }));
        }
    },
    pause: () => {
        const audio = contentAudioRef.current;
        if (audio) {
            audio.pause();
            setAudioState(prev => ({ ...prev, isPlaying: false }));
        }
    },
    seek: (time: number) => {
        const audio = contentAudioRef.current;
        if (audio && isFinite(time)) {
            audio.currentTime = time;
            setAudioState(prev => ({ ...prev, currentTime: time }));
        }
    },
    setSpeed: (speed: number) => {
        const audio = contentAudioRef.current;
        if (audio) {
            audio.playbackRate = speed;
        }
        setAudioState(prev => ({ ...prev, speed }));
    }
  }), [audioState.currentUrl]);

  // Episodes — module-level kickoff already started the request; this
  // effect just hydrates from cache and adopts the in-flight result.
  useEffect(() => {
    let cancelled = false;

    let cachedFresh = false;
    try {
        const cached = localStorage.getItem(EPISODES_CACHE_KEY);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached) as { data: Episode[]; timestamp: number };
            if (!cancelled) setEpisodes(data);
            cachedFresh = Date.now() - timestamp < EPISODES_CACHE_TTL_MS;
        }
    } catch (_) { /* ignore cache read errors */ }

    if (cachedFresh) return () => { cancelled = true; };

    startEpisodesFetch()
        .then((eps) => {
            if (cancelled) return;
            setEpisodes(eps);
            try {
                localStorage.setItem(EPISODES_CACHE_KEY, JSON.stringify({ data: eps, timestamp: Date.now() }));
            } catch (_) { /* ignore quota errors */ }
        })
        .catch((err) => console.error("Podcast fetch failed:", err));

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    // Accelerated intro sequence
    const s1 = setTimeout(() => setIntroStep(1), 400); 
    const s2 = setTimeout(() => setIntroStep(2), 2000); 
    const s3 = setTimeout(() => setIntroStep(3), 2300); 
    return () => { clearTimeout(s1); clearTimeout(s2); clearTimeout(s3); };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${zoom}%`;
  }, [zoom]);

  // --- Background Audio Initialization (No auto-play) ---
  useEffect(() => {
    if (bgAudioRef.current) {
        bgAudioRef.current.volume = 0.3;
    }
  }, []);

  // Sync Background Audio with Content Audio
  useEffect(() => {
    const bgAudio = bgAudioRef.current;
    if (!bgAudio) return;

    // If content is playing, PAUSE background (mobile friendly ducking)
    if (audioState.isPlaying) {
        bgAudio.pause();
    } else {
        // If content stopped, resume background IF user enabled it
        if (isMusicPlaying) {
            bgAudio.play().catch(() => {});
        }
    }
  }, [audioState.isPlaying, isMusicPlaying]);

  const toggleMusic = () => {
    setIsMusicPlaying(prev => !prev);
  };

  const slides = useMemo(() => [
    {
      id: 'podcast',
      render: () => {
        // Find Episode 17 as default, or fallback to latest
        const defaultEpisode = episodes.find(e => e.title.includes('17')) || episodes[0];
        const displayedEpisode = episodes.find(ep => ep.enclosure.link === audioState.currentUrl) || defaultEpisode;
        
        const isDisplayedPlaying = displayedEpisode && audioState.currentUrl === displayedEpisode.enclosure.link && audioState.isPlaying;
        const isCurrentUrlMatch = displayedEpisode && audioState.currentUrl === displayedEpisode.enclosure.link;
        
        const formatTime = (time: number) => {
            if (!time || isNaN(time)) return "00:00";
            const minutes = Math.floor(time / 60);
            const seconds = Math.floor(time % 60);
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        };

        const toggleSpeed = () => {
            const speeds = [1, 1.25, 1.5, 2];
            const nextIdx = (speeds.indexOf(audioState.speed) + 1) % speeds.length;
            controls.setSpeed(speeds[nextIdx]);
        };

        return (
         <SlideLayout>
            <div className="flex flex-col w-full max-w-7xl mx-auto px-1 md:px-4">

                {/* === EDITORIAL HERO (2026-05-07 redesign) ===============
                    Replaces the previous small Mic+Podcast title bar.
                    LEFT column carries the kicker / serif display title /
                    italic lede; the floating headphones (relocated from
                    the disc itself) hover as a decorative accent above
                    the title. RIGHT column is the vinyl record, now the
                    page's main visual item — large, dominant, with a
                    soft copper halo, no longer occluded by the headphones.
                    On mobile the columns stack and the headphones become
                    a small accent above the disc. */}
                <section className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10 items-center mb-10 md:mb-14 lg:mb-20">

                  {/* Title block. */}
                  <div className="lg:col-span-7 relative">
                    <p
                      className="relative z-10 uppercase font-bold text-[10px] md:text-[11px] tracking-[0.32em] sm:tracking-[0.42em]"
                      style={{ color: '#B8532F' }}
                    >
                      · Au delà des tendances ·
                    </p>

                    <h1
                      className="mt-3 md:mt-4 font-messiri font-normal"
                      style={{
                        color: '#3A251E',
                        fontSize: 'clamp(2.4rem, 6vw, 5.2rem)',
                        lineHeight: 1.04,
                        letterSpacing: '0.005em',
                      }}
                    >
                      Le Podcast
                    </h1>

                    <div
                      aria-hidden
                      className="h-[2px] w-20 md:w-32 mt-5 md:mt-7 mb-5 md:mb-7"
                      style={{ background: 'linear-gradient(90deg, #B8532F 0%, rgba(184,83,47,0) 100%)' }}
                    />

                    <p
                      className="relative z-10 font-messiri italic leading-relaxed max-w-xl"
                      style={{
                        color: 'rgba(58,37,30,0.85)',
                        fontSize: 'clamp(1.05rem, 1.4vw, 1.3rem)',
                      }}
                    >
                      Conversations posées sur l’Ayurvéda, le rythme du vivant et l’art subtil
                      de revenir à soi. Un studio à écouter au pas tranquille de la respiration.
                    </p>
                  </div>

                  {/* Vinyl visual — main visual item. Capped tighter on
                      mobile (max ~78vw) so it doesn't fill the screen
                      and push the player + list off the first scroll. */}
                  <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
                    <VinylShowcase size="min(78vw, clamp(220px, 46vh, 60vh))" />
                  </div>
                </section>

                {/* === LISTEN SECTION =====================================
                    Editorial subhead with copper rule, then the player +
                    episode list grid. The vinyl no longer lives in this
                    section's right column (it's the hero now), so this
                    block widens out to a clean two-column listen layout. */}
                <section className="relative">
                  <div className="flex items-center gap-3 md:gap-4 mb-5 md:mb-7 min-w-0">
                    <Headphones size={18} className="shrink-0" style={{ color: '#B8532F' }} strokeWidth={1.6} />
                    <h2
                      className="font-messiri font-normal text-lg md:text-2xl whitespace-nowrap shrink-0"
                      style={{ color: '#3A251E' }}
                    >
                      Tous les épisodes
                    </h2>
                    <div
                      aria-hidden
                      className="flex-1 h-px min-w-[12px]"
                      style={{ background: 'linear-gradient(90deg, rgba(184,83,47,0.4) 0%, rgba(184,83,47,0) 100%)' }}
                    />
                    {/* Count chip — hidden on the tightest phones (sm) so
                        the subhead row never wraps. */}
                    <span
                      className="hidden sm:inline text-[10px] uppercase tracking-[0.3em] whitespace-nowrap shrink-0"
                      style={{ color: '#B8532F' }}
                    >
                      {episodes.length ? `${episodes.length} épisodes` : '—'}
                    </span>
                  </div>

                  <div className="flex flex-col lg:flex-row gap-3 md:gap-6 lg:gap-10 items-start">
                    {/* LEFT — featured player. Sticky on lg so it stays
                        in view while scrolling the list. */}
                    <div className="w-full lg:flex-[40_1_0%] min-w-0 lg:sticky lg:top-28 lg:self-start">

                     {/* Featured Player — parchment card. Sized to span
                         roughly five episode rows on md+ via min-height,
                         with stacked album art / metadata / controls /
                         scrubber so the card has visual rhythm rather
                         than blank space. */}
                     <div
                       className="flex flex-col p-5 md:p-7 rounded-xl md:rounded-3xl border bg-brand-light/40 border-brand-accent/30 backdrop-blur-sm relative gap-5 md:gap-6"
                       style={{ minHeight: 'clamp(360px, 56vh, 460px)' }}
                     >
                        {/* Eyebrow + date row. */}
                        <div className="flex items-center justify-between gap-3">
                            <p
                              className="uppercase font-bold tracking-[0.32em]"
                              style={{ color: '#B8532F', fontSize: 'clamp(9.5px, 1vw, 11px)' }}
                            >
                              {isCurrentUrlMatch ? 'En cours de lecture' : 'Dernier Épisode'}
                            </p>
                            {displayedEpisode?.pubDate && (
                              <span
                                className="font-mono uppercase tracking-[0.16em] whitespace-nowrap"
                                style={{ color: 'rgba(58,37,30,0.55)', fontSize: '10px' }}
                              >
                                {new Date(displayedEpisode.pubDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            )}
                        </div>

                        {/* Featured visual — floating headphones. The
                            disc + portrait composition was retired here
                            (2026-05-07) since the disc already lives in
                            the hero and the player card now reads as the
                            "listening" badge with the headphones front
                            and centre. A soft copper halo sits behind to
                            lift the asset off the parchment. */}
                        <div className="flex justify-center">
                          <div
                            className="relative shrink-0"
                            style={{ width: 'clamp(140px, 24vh, 192px)', aspectRatio: '1 / 1' }}
                          >
                            <div
                              aria-hidden
                              className="absolute inset-[-12%] rounded-full"
                              style={{
                                background:
                                  'radial-gradient(closest-side, rgba(184,83,47,0.22) 0%, rgba(184,83,47,0.08) 45%, rgba(184,83,47,0) 75%)',
                                filter: 'blur(2px)',
                              }}
                            />
                            <FloatingHeadphones
                              className="absolute inset-0 w-full h-full"
                            />
                          </div>
                        </div>

                        {/* Episode title. */}
                        <div className="text-center">
                          <p
                            className="font-messiri leading-snug line-clamp-3"
                            style={{
                              color: '#3A251E',
                              fontSize: 'clamp(1.05rem, 1.5vw, 1.5rem)',
                            }}
                          >
                            {displayedEpisode?.title || 'Chargement…'}
                          </p>
                        </div>

                        {/* Controls row — speed pill, big copper play,
                            duration pill. Equal-weight outer items so
                            the play button sits visually centred. */}
                        <div className="flex items-center justify-between gap-3 mt-auto">
                            <button
                                onClick={toggleSpeed}
                                className="font-mono inline-flex items-center gap-1 rounded-full px-3 py-1.5 transition-colors hover:bg-brand-accent/10"
                                style={{
                                  color: '#B8532F',
                                  border: '1px solid rgba(184,83,47,0.45)',
                                  fontSize: '11px',
                                  minWidth: '64px',
                                  justifyContent: 'center',
                                }}
                                title="Vitesse de lecture"
                            >
                               <Gauge size={12} />
                               {audioState.speed}x
                            </button>

                            <button
                               onClick={() => {
                                   if (isDisplayedPlaying) {
                                       controls.pause();
                                   } else if (displayedEpisode) {
                                       controls.play(displayedEpisode.enclosure.link);
                                   }
                               }}
                               disabled={!displayedEpisode}
                               style={COPPER_BTN_STYLE}
                               className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                            >
                               {isDisplayedPlaying ? <Pause fill="currentColor" size={26} /> : <Play fill="currentColor" size={26} className="ml-1"/>}
                            </button>

                            <div
                              className="font-mono text-right whitespace-nowrap"
                              style={{
                                color: 'rgba(58,37,30,0.55)',
                                fontSize: '11px',
                                minWidth: '64px',
                              }}
                            >
                              {audioState.duration > 0 && isCurrentUrlMatch
                                ? formatTime(audioState.duration)
                                : '— : —'}
                            </div>
                        </div>

                        {/* Scrubber. */}
                        <div className="flex items-center gap-2 text-[10px] font-mono" style={{ color: 'rgba(58,37,30,0.6)' }}>
                            <span className="w-10 text-right">
                                {isCurrentUrlMatch ? formatTime(audioState.currentTime) : '00:00'}
                            </span>
                            <div className="flex-1 relative h-1 bg-brand-accent/15 rounded-full overflow-hidden">
                                 <div
                                    className="absolute top-0 left-0 h-full bg-brand-accent transition-all duration-100"
                                    style={{
                                        width: isCurrentUrlMatch
                                            ? `${(audioState.currentTime / (audioState.duration || 1)) * 100}%`
                                            : '0%'
                                    }}
                                 />
                                 <input
                                    type="range"
                                    min="0"
                                    max={audioState.duration || 100}
                                    value={isCurrentUrlMatch ? audioState.currentTime : 0}
                                    onChange={(e) => controls.seek(Number(e.target.value))}
                                    disabled={!isCurrentUrlMatch}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                 />
                            </div>
                            <span className="w-10">
                                {isCurrentUrlMatch
                                  ? formatTime(Math.max(0, audioState.duration - audioState.currentTime))
                                  : '00:00'}
                            </span>
                        </div>
                     </div>

                    </div>{/* end LEFT — featured player */}

                    {/* RIGHT — episode list. Natural height; the page
                        handles overflow. */}
                    <div className="w-full lg:flex-[60_1_0%] min-w-0 rounded-xl md:rounded-3xl overflow-hidden shadow-2xl border border-brand-accent/30">
                      <PodcastList
                         episodes={episodes}
                         audioState={audioState}
                         controls={controls}
                      />
                    </div>
                  </div>{/* end listen grid */}
                </section>

                {/* === À propos du podcast =================================
                    AEO body content (2026-05-08): substantial French copy
                    with H2 hierarchy, 3+ contextual internal links into
                    the FR site (Trilogie, Expérience Origine, Vata,
                    Conférencière, Quiz Boussole) and 2+ outbound
                    citations to credible Ayurveda authorities. Lives
                    inside the slide so it shares the page's parchment
                    palette and `font-messiri` Cormorant fallback. */}
                <section className="relative max-w-3xl mx-auto mt-14 md:mt-20 font-messiri leading-relaxed text-[1.05rem] md:text-[1.15rem] space-y-6"
                         style={{ color: 'rgba(58,37,30,0.92)' }}>
                  <h2 className="font-messiri text-2xl md:text-3xl" style={{ color: '#3A251E' }}>
                    À propos du podcast
                  </h2>
                  <p>
                    <em>Au-delà des tendances</em> est le podcast de
                    Krystine St-Laurent — autrice de la{' '}
                    <a
                      href="/medias#livres"
                      className="underline decoration-[#B8532F]/40 underline-offset-4 hover:decoration-[#B8532F] transition-colors"
                      style={{ color: '#B8532F' }}
                    >Trilogie d'Origine</a> aux Éditions de l'Homme et
                    fondatrice de l'<a
                      href="/origine"
                      className="underline decoration-[#B8532F]/40 underline-offset-4 hover:decoration-[#B8532F] transition-colors"
                      style={{ color: '#B8532F' }}
                    >Expérience Origine</a>. Chaque épisode prolonge le
                    travail d'écriture par des entretiens posés autour de
                    l'Ayurveda, de la santé féminine, de la médecine
                    intégrative et de l'art de revenir à soi — pour un
                    auditoire francophone qui veut écouter avant de
                    cliquer.
                  </p>

                  <h2 className="font-messiri text-2xl md:text-3xl mt-8" style={{ color: '#3A251E' }}>
                    Sujets abordés
                  </h2>
                  <p>
                    Les épisodes alternent entre saisons (la saison{' '}
                    <a
                      href="/vata"
                      className="underline decoration-[#B8532F]/40 underline-offset-4 hover:decoration-[#B8532F] transition-colors"
                      style={{ color: '#B8532F' }}
                    >Vata</a> pour l'apaisement et l'ancrage, Pitta pour
                    le rafraîchissement, Kapha pour la mise en
                    mouvement), constitutions individuelles (le{' '}
                    <a
                      href="/quiz"
                      className="underline decoration-[#B8532F]/40 underline-offset-4 hover:decoration-[#B8532F] transition-colors"
                      style={{ color: '#B8532F' }}
                    >Quiz Boussole</a> aide à reconnaître la sienne) et
                    grands chapitres : alimentation, cycle féminin,
                    ménopause, sommeil, transmission générationnelle. La
                    lecture s'inscrit dans le cadre reconnu par la{' '}
                    <a
                      href="https://www.ayurvedanama.org/what-is-ayurveda"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-[#B8532F]/40 underline-offset-4 hover:decoration-[#B8532F] transition-colors"
                      style={{ color: '#B8532F' }}
                    >National Ayurvedic Medical Association</a> et la
                    formation que Krystine a complétée auprès du{' '}
                    <a
                      href="https://www.chopra.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-[#B8532F]/40 underline-offset-4 hover:decoration-[#B8532F] transition-colors"
                      style={{ color: '#B8532F' }}
                    >Chopra Center</a> en Ayurvedic Lifestyle.
                  </p>

                  <h2 className="font-messiri text-2xl md:text-3xl mt-8" style={{ color: '#3A251E' }}>
                    Pour aller plus loin
                  </h2>
                  <p>
                    Le podcast est gratuit, hebdomadaire, sans publicité.
                    Pour inviter Krystine en conférence, la page{' '}
                    <a
                      href="/conferenciere"
                      className="underline decoration-[#B8532F]/40 underline-offset-4 hover:decoration-[#B8532F] transition-colors"
                      style={{ color: '#B8532F' }}
                    >Conférencière</a> rassemble les formats et le
                    formulaire de réservation. Pour un cadre vivant et
                    accompagné, le parcours signature{' '}
                    <a
                      href="/origine"
                      className="underline decoration-[#B8532F]/40 underline-offset-4 hover:decoration-[#B8532F] transition-colors"
                      style={{ color: '#B8532F' }}
                    >Expérience Origine</a> dure douze semaines en
                    cohorte fondatrice, avec une partie inédite du
                    troisième tome de la trilogie (<em>Énergie &amp;
                    Ayurveda</em>, parution 14 octobre 2026) partagée en
                    avant-première.
                  </p>
                </section>
            </div>
         </SlideLayout>
        );
      }
    }
  ], [lang, isDark, episodes, audioState, controls]); // Dependencies ensure render updates on audio state change

  return (
    <div className={`bundle-page podcast-page h-[100dvh] w-screen overflow-y-auto overflow-x-hidden transition-colors duration-1000 ${isDark ? 'dark text-[#F4E7DD]' : 'text-[#3A251E]'}`}>
      
      {/* --- Global Audio Elements --- */}
      
      {/* Background Ambience */}
      <audio 
         ref={bgAudioRef} 
         src={AUDIO_URL} 
         loop 
         playsInline
         className="hidden" 
      />
      
      {/* Main Content Player (Podcast/Bio) */}
      <audio 
         ref={contentAudioRef}
         playsInline
         className="hidden"
         onPlay={() => setAudioState(p => ({ ...p, isPlaying: true, isBuffering: false }))}
         onPause={() => setAudioState(p => ({ ...p, isPlaying: false }))}
         onEnded={() => setAudioState(p => ({ ...p, isPlaying: false, currentTime: 0 }))}
         onTimeUpdate={() => {
             // Safe access via Ref instead of event target to prevent null errors
             if(contentAudioRef.current) {
                 setAudioState(p => ({ ...p, currentTime: contentAudioRef.current?.currentTime || 0 }));
             }
         }}
         onLoadedMetadata={() => {
             if(contentAudioRef.current) {
                 setAudioState(p => ({ ...p, duration: contentAudioRef.current?.duration || 0, isBuffering: false }));
             }
         }}
         onWaiting={() => setAudioState(p => ({ ...p, isBuffering: true }))}
         onCanPlay={() => setAudioState(p => ({ ...p, isBuffering: false }))}
      />

      {/* Background — parchment image only (the radial vignette and
          dark wash were removed 2026-05-07 because they read as a
          "brown shadowy overlay"). Light mode is locked, so no dark
          variant. The record+headphones used to live here as a full-bleed
          decoration; it now sits in the slide's right column instead. */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: '#F4E7DD',
            backgroundImage: `url('/krystine-bg.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
          }}
        />
      </div>

      <div className={`fixed inset-0 z-[60] bg-black transition-opacity duration-[1000ms] pointer-events-none ${introStep >= 2 ? 'opacity-0' : 'opacity-100'}`} />
      <img 
          src={SIGNATURE_URL} 
          alt="Intro Logo" 
          className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 md:w-64 z-[70] transition-opacity duration-1000 pointer-events-none object-contain invert ${introStep === 1 ? 'opacity-100' : 'opacity-0'}`}
      />
      
      {/* Nav — only the Krystine signature on the left. The original
          bundle's right-side control cluster (zoom slider, music toggle,
          FR/EN, dark/light) was removed on 2026-05-07 per user direction.
          The host site already exposes language + audio elsewhere; the
          deck is light-only now (`isDark` is locked above). */}
      <nav className={`fixed top-0 left-0 h-20 md:h-24 px-4 md:px-12 flex items-center z-50 transition-opacity duration-1000 ${introStep >= 3 ? 'opacity-100' : 'opacity-0'}`}>
        <a href="/" title="Retour à l'accueil Krystine St-Laurent" className="cursor-pointer block">
           <img src={SIGNATURE_URL} alt="Signature" className="h-12 md:h-16 w-auto object-contain transition-all hover:scale-105" />
        </a>
      </nav>

      <div className="relative w-full z-10 min-h-full">
        <AnimatePresence mode="wait">
          <motion.div
             key={currentSlide}
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             transition={{ duration: 0.5 }}
             className="w-full"
          >
            {slides[currentSlide].render()}
          </motion.div>
        </AnimatePresence>
      </div>

      {slides.length > 1 && (
        <div className={`fixed bottom-0 w-full h-20 px-4 md:px-12 flex justify-between items-center z-50 pointer-events-none transition-opacity duration-1000 ${introStep >= 3 ? 'opacity-100' : 'opacity-0'}`}>
            <div className={`flex gap-1.5 md:gap-3 pointer-events-auto backdrop-blur-md px-3 md:px-4 py-2 rounded-full border ${isDark ? 'bg-black/20 border-white/5' : 'bg-white/50 border-slate-200'}`}>
            {slides.map((_, idx) => (
                <button 
                key={idx} 
                onClick={() => setCurrentSlide(idx)} 
                className={`h-1.5 md:h-2 transition-all duration-500 rounded-full ${currentSlide === idx ? 'w-6 md:w-8 bg-brand-accent' : 'w-1.5 md:w-2 bg-gray-400/50 hover:bg-brand-accent/70'}`} 
                />
            ))}
            </div>
            
            <div className="flex gap-2 md:gap-4 pointer-events-auto">
            <button 
                disabled={currentSlide === 0} 
                onClick={() => setCurrentSlide(c => c - 1)} 
                className={`w-10 h-10 md:w-12 md:h-12 rounded-full border flex items-center justify-center hover:bg-white/10 disabled:opacity-0 transition-all ${isDark ? 'border-white/10 text-white' : 'border-brand-dark/10 text-brand-dark bg-white'}`}
            >
                <ArrowRight className="rotate-180 md:w-5 md:h-5" size={18} />
            </button>
            
            {currentSlide === slides.length - 1 && (
                <button 
                onClick={() => setCurrentSlide(0)} 
                className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-brand-vata text-white flex items-center justify-center hover:bg-brand-vata/80 shadow-lg transition-transform hover:scale-105"
                aria-label="Recommencer"
                >
                <RotateCcw size={18} className="md:w-5 md:h-5" />
                </button>
            )}
            </div>
        </div>
      )}
    </div>
  );
};

export default App;
