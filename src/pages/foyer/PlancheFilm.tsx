import React, { useEffect, useRef } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';

/* ── Le même module visuel que le hero de /speaking (« Une conférence pour
   revenir à soi ») : le film promo 2024 en boucle muette derrière un voile
   vert profond, une lampe cuivrée, le grain, et la légende en carte d'ivoire.
   Le film ne se charge qu'à l'entrée dans l'écran, et se met en pause dès
   qu'il en sort; sous prefers-reduced-motion, l'affiche seule reste. Le cadre
   est 16:9 comme le film : rien n'est recadré, les visages restent entiers. ── */
const B = 'https://storage.googleapis.com/inspirata/Base%20site/promo-2024/';
const POSTER = B + 'promo-ksl-poster-1920.webp';
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export const PlancheFilm: React.FC<{ nom: string; role: string }> = ({ nom, role }) => {
  const ref = useRef<HTMLDivElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const inView = useInView(ref, { margin: '240px 0px' });
  const reduce = useReducedMotion();

  useEffect(() => {
    const v = vid.current;
    if (!v || reduce) return;
    if (inView) {
      if (!v.src) v.src = B + (window.innerWidth > 900 ? 'promo-ksl-v2-hero-muted.mp4' : 'promo-ksl-v2-hero-muted-720.mp4');
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [inView, reduce]);

  return (
    <div
      ref={ref}
      className="relative aspect-video w-full overflow-hidden rounded-[15px] bg-[#1b2622] shadow-[0_40px_80px_rgba(15,22,19,0.38)]"
    >
      <video
        ref={vid}
        poster={POSTER}
        muted
        loop
        playsInline
        preload="none"
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      {/* le voile, du sombre vers la transparence, comme sur /speaking */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(27,38,34,0.42) 0%, rgba(27,38,34,0) 32%, rgba(27,38,34,0.72) 100%), linear-gradient(90deg, rgba(27,38,34,0.35) 0%, rgba(27,38,34,0) 55%)',
        }}
      />
      {/* la lampe cuivrée */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[30%] -top-[30%] h-[80%] w-[80%] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(224,161,115,0.38) 0%, rgba(139,74,47,0.18) 34%, rgba(27,38,34,0) 68%)',
          filter: 'blur(28px)',
        }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.09] mix-blend-soft-light" style={{ backgroundImage: GRAIN }} />
      {/* la légende en carte d'ivoire, posée hors cadre à gauche */}
      <div className="absolute bottom-7 -left-px bg-cream px-5 py-3.5 shadow-[0_14px_30px_rgba(0,0,0,0.28)]">
        <p className="font-serif font-medium text-[1.25rem] leading-none text-espresso">{nom}</p>
        <p className="mt-1.5 font-sans text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-brassInk">{role}</p>
      </div>
    </div>
  );
};

export default PlancheFilm;
