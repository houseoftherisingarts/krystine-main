import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useInView, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import Portail from '../../components/Portail';

/* ── Le même module que le hero de /speaking (« Une conférence pour revenir à
   soi »), porté tel quel dans Le Foyer (Alex, 7 septembre 2026) : le film promo
   2024 en boucle muette, énorme, sur toute la largeur et toute la hauteur de
   l'écran, derrière un voile vert profond qui s'éclaircit vers la droite; la
   lampe cuivrée qui suit le pointeur, le grain, la copie posée à gauche, et le
   bouton « Voir le film, avec le son » qui ouvre le film en pleine fenêtre.
   Sous 1024 px, la copie passe d'abord et le film devient une carte 16:9 non
   recadrée, comme sur /speaking. Le film ne se charge qu'à l'entrée dans
   l'écran; sous prefers-reduced-motion, l'affiche seule reste. ── */
const B = 'https://storage.googleapis.com/inspirata/Base%20site/promo-2024/';
const POSTER = B + 'promo-ksl-poster-1920.webp';
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";
const VEIL =
  'linear-gradient(90deg, rgba(27,38,34,0.98) 0%, rgba(27,38,34,0.95) 40%, rgba(27,38,34,0.6) 62%, rgba(27,38,34,0.22) 100%), linear-gradient(180deg, rgba(27,38,34,0.55) 0%, rgba(27,38,34,0) 30%, rgba(27,38,34,0.75) 100%)';
const VEIL_MOBILE = 'linear-gradient(180deg, rgba(27,38,34,0.2), rgba(27,38,34,0) 40%, rgba(27,38,34,0.6))';

const large = () => typeof window !== 'undefined' && window.innerWidth > 900;

/** Le film avec le son, par-dessus tout le site. Échap ou le fond ferment. */
const FilmPleinEcran: React.FC<{ onFermer: () => void }> = ({ onFermer }) => {
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => { if (e.key === 'Escape') onFermer(); };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [onFermer]);
  return (
    <Portail>
      <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm" onClick={onFermer}>
        <button
          type="button"
          onClick={onFermer}
          aria-label="Fermer"
          className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <i className="fa-solid fa-times text-lg" />
        </button>
        <video
          src={B + (large() ? 'promo-ksl-v2-1080.mp4' : 'promo-ksl-v2-720.mp4')}
          poster={POSTER}
          controls
          autoPlay
          playsInline
          className="aspect-video w-full max-w-6xl rounded-[15px] bg-black shadow-2xl"
          onClick={e => e.stopPropagation()}
        />
      </div>
    </Portail>
  );
};

export const SceneFilm: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const inView = useInView(ref, { margin: '240px 0px' });
  const reduce = useReducedMotion();
  const [allume, setAllume] = useState(false);
  const [film, setFilm] = useState(false);

  useEffect(() => {
    const v = vid.current;
    if (!v || reduce) return;
    if (inView && !film) {
      if (!v.src) v.src = B + (large() ? 'promo-ksl-v2-hero-muted.mp4' : 'promo-ksl-v2-hero-muted-720.mp4');
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [inView, reduce, film]);

  /* la lampe cuivrée suit le pointeur, avec le retard d'une vraie flamme */
  const lx = useMotionValue(0);
  const ly = useMotionValue(0);
  const sx = useSpring(lx, { stiffness: 40, damping: 18 });
  const sy = useSpring(ly, { stiffness: 40, damping: 18 });
  const surPointeur = useCallback((e: React.PointerEvent) => {
    if (reduce || e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    lx.set((e.clientX - r.left - r.width / 2) * 0.12);
    ly.set((e.clientY - r.top - r.height / 2) * 0.12);
  }, [lx, ly, reduce]);

  const fermer = useCallback(() => setFilm(false), []);

  return (
    <div
      ref={ref}
      onPointerMove={surPointeur}
      className={`relative flex flex-col overflow-hidden bg-[#1b2622] pt-28 pb-16 lg:min-h-screen lg:flex-row lg:items-center lg:pt-40 lg:pb-24 ${className}`}
    >
      {/* la scène : le film, énorme, derrière tout (carte 16:9 sous 1024 px) */}
      <div className="relative z-[2] order-2 mx-6 mt-10 aspect-video overflow-hidden rounded-[10px] bg-black shadow-[0_30px_60px_rgba(0,0,0,0.4)] lg:absolute lg:inset-0 lg:z-0 lg:m-0 lg:aspect-auto lg:rounded-none lg:bg-[#1b2622] lg:shadow-none">
        {/* l'affiche d'abord, visible tout de suite; le film se fond par-dessus dès qu'il joue */}
        <img
          src={POSTER}
          alt=""
          aria-hidden
          loading="lazy"
          className="absolute inset-0 h-full w-full object-contain object-center lg:object-cover lg:object-[80%_45%]"
        />
        <video
          ref={vid}
          poster={POSTER}
          muted
          loop
          playsInline
          preload="none"
          aria-hidden
          onPlaying={() => setAllume(true)}
          className={`relative h-full w-full object-contain object-center transition-opacity duration-[1400ms] ease-out lg:object-cover lg:object-[80%_45%] ${allume || reduce ? 'opacity-100' : 'opacity-0'}`}
        />
        <div aria-hidden className="absolute inset-0 lg:hidden" style={{ background: VEIL_MOBILE }} />
      </div>
      {/* le voile, presque opaque à gauche, presque transparent à droite */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[1] hidden lg:block" style={{ background: VEIL }} />
      {/* les deux lampes cuivrées */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute z-[1] h-[70vw] max-h-[900px] w-[70vw] max-w-[900px] rounded-full"
        style={{
          left: '-18vw',
          top: '-24vw',
          x: sx,
          y: sy,
          background: 'radial-gradient(circle, rgba(224,161,115,0.42) 0%, rgba(139,74,47,0.2) 32%, rgba(40,53,47,0) 68%)',
          filter: 'blur(30px)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute z-[1] h-[44vw] w-[44vw] rounded-full"
        style={{
          right: '-8vw',
          bottom: '-18vw',
          background: 'radial-gradient(circle, rgba(139,74,47,0.35) 0%, rgba(40,53,47,0) 65%)',
          filter: 'blur(40px)',
        }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[1] opacity-[0.09] mix-blend-soft-light" style={{ backgroundImage: GRAIN }} />

      {/* la copie, à gauche, sur une colonne de 46 rem comme sur /speaking */}
      <div className="relative z-[2] order-1 w-full px-6 md:px-12 lg:px-20">
        <div className="max-w-[46rem]">
          {children}
          <button
            type="button"
            onClick={() => setFilm(true)}
            className="group mt-7 inline-flex items-center gap-3 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-ctext"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-ctext/50 transition-[background,border-color,transform] duration-300 group-hover:scale-[1.08] group-hover:border-[#e6a678] group-hover:bg-[linear-gradient(135deg,#8b4a2f,#c47a4e,#e6a678,#c47a4e,#8b4a2f)]">
              <svg viewBox="0 0 12 12" className="ml-0.5 h-3 w-3 fill-ctext"><path d="M1 0l11 6-11 6z" /></svg>
            </span>
            Voir le film, avec le son
          </button>
        </div>
      </div>
      {film && <FilmPleinEcran onFermer={fermer} />}
    </div>
  );
};

export default SceneFilm;
