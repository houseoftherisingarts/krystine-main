import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SplitType from 'split-type';
import Lenis from 'lenis';
import { ArrowDown, ArrowUpRight, Leaf } from '@phosphor-icons/react';

gsap.registerPlugin(ScrollTrigger);

/* ════════════════════════════════════════════════════════════════════
   Concept V3 — « Botanique organique texturé »
   Krystine St-Laurent · Conférencière, autrice, clinicienne en Ayurveda.
   Hero : feuillages SVG en couches (profondeur par échelle + opacité + z,
   jamais de blur) qui dérivent au repos et réagissent au scroll en parallaxe,
   autour d'un portrait cadré dans une arche organique. Titre vivant révélé
   au caractère (SplitType + GSAP). Grain papier réel, brumes chaudes.
   Une seule couleur d'accent : terre cuite #c8722f.
   ════════════════════════════════════════════════════════════════════ */

/* Palette (forêt chaude, écorce, sauge, argile) */
const C = {
  base: '#10140e',
  deep: '#0b0f09',
  moss: '#2c3a26',
  forest: '#1c2718',
  sage: '#8d9b78',
  clay: '#c8722f',
  clayDim: '#a85e26',
  sand: '#cdb089',
  cream: '#ece4d3',
  creamSoft: '#ccc3ad',
};

const STORY = [
  "Près de 40 ans à traverser les milieux de la santé : soins intensifs, industrie pharmaceutique, recherche clinique en insuffisance cardiaque, avant de choisir l'herboristerie, l'Ayurveda et l'aromathérapie.",
  "Auteure de trois livres aux Éditions de l'Homme. Créatrice de série télé et du podcast Au-delà des tendances. Elle a vu ce que l'approche moderne fait bien, et là où elle laisse les gens seuls.",
  "Sur scène, cette double appartenance devient une voix rare : la rigueur du clinicien rencontre la sagesse millénaire. Chaque conférence est cousue main pour le public qui l'attend.",
];

const FACTS = [
  { n: '37', label: 'ans de pratique' },
  { n: '3', label: 'livres publiés' },
  { n: 'TEDx', label: 'sur la grande scène' },
];

/* ── Une feuille SVG réutilisable, avec nervure et dégradé de profondeur ── */
const LeafSVG: React.FC<{ id: string; className?: string }> = ({ id, className }) => (
  <svg viewBox="0 0 100 140" className={className} aria-hidden focusable="false">
    <defs>
      <linearGradient id={`lg-${id}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={C.sage} stopOpacity="0.95" />
        <stop offset="55%" stopColor={C.moss} />
        <stop offset="100%" stopColor={C.forest} />
      </linearGradient>
    </defs>
    <path
      d="M50 2 C82 34 84 96 50 138 C16 96 18 34 50 2 Z"
      fill={`url(#lg-${id})`}
    />
    <path
      d="M50 12 L50 130"
      stroke={C.deep}
      strokeOpacity="0.32"
      strokeWidth="1.4"
      fill="none"
    />
    {[28, 52, 76, 100].map((y) => (
      <g key={y}>
        <path d={`M50 ${y} Q70 ${y - 8} 78 ${y - 18}`} stroke={C.deep} strokeOpacity="0.2" strokeWidth="1.1" fill="none" />
        <path d={`M50 ${y} Q30 ${y - 8} 22 ${y - 18}`} stroke={C.deep} strokeOpacity="0.2" strokeWidth="1.1" fill="none" />
      </g>
    ))}
  </svg>
);

/* Configuration des feuillages flottants — profondeur par échelle/opacité/z.
   depth : facteur de parallaxe (loin = petit/lent/discret, près = grand/rapide). */
type LeafCfg = {
  id: string; top: string; left?: string; right?: string;
  size: number; rotate: number; opacity: number; depth: number; drift: string;
};
const HERO_LEAVES: LeafCfg[] = [
  { id: 'a', top: '6%', left: '4%', size: 130, rotate: -28, opacity: 0.5, depth: 26, drift: 'drift-a' },
  { id: 'b', top: '60%', left: '-2%', size: 220, rotate: 18, opacity: 0.85, depth: 60, drift: 'drift-b' },
  { id: 'c', top: '14%', right: '6%', size: 100, rotate: 36, opacity: 0.42, depth: 20, drift: 'drift-c' },
  { id: 'd', top: '70%', right: '3%', size: 280, rotate: -14, opacity: 0.92, depth: 72, drift: 'drift-a' },
  { id: 'e', top: '40%', right: '40%', size: 70, rotate: 8, opacity: 0.28, depth: 12, drift: 'drift-c' },
  { id: 'f', top: '2%', left: '46%', size: 90, rotate: -50, opacity: 0.34, depth: 16, drift: 'drift-b' },
  { id: 'g', top: '84%', left: '34%', size: 120, rotate: 64, opacity: 0.46, depth: 30, drift: 'drift-c' },
];

const KrystineV3: React.FC = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Lenis (désactivé en reduced-motion) ── */
    let lenis: Lenis | null = null;
    let rafId = 0;
    if (!reduce) {
      lenis = new Lenis({ duration: 1.15, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      const raf = (t: number) => { lenis?.raf(t); rafId = requestAnimationFrame(raf); };
      rafId = requestAnimationFrame(raf);
    }

    const ctx = gsap.context(() => {
      const ease = 'power3.out';

      /* ── Révélation cinétique du titre (SplitType au caractère) ── */
      let split: SplitType | null = null;
      if (headlineRef.current) {
        split = new SplitType(headlineRef.current, { types: 'words, chars', tagName: 'span' });
        if (reduce) {
          gsap.set(split.chars, { opacity: 1, yPercent: 0 });
        } else {
          gsap.from(split.chars, {
            yPercent: 115,
            opacity: 0,
            duration: 1.2,
            ease,
            stagger: 0.045,
            delay: 0.15,
          });
        }
      }

      if (!reduce) {
        /* Entrées en cascade des éléments du hero */
        gsap.from('[data-hero-fade]', {
          opacity: 0, y: 30, duration: 1.1, ease, stagger: 0.1, delay: 0.55,
        });

        /* Portrait : montée douce + arche qui s'ouvre */
        gsap.from('[data-portrait]', {
          opacity: 0, y: 48, scale: 1.04, duration: 1.4, ease, delay: 0.3,
        });

        /* Parallaxe des feuillages au scroll (transform seulement) */
        gsap.utils.toArray<HTMLElement>('[data-depth]').forEach((el) => {
          const depth = parseFloat(el.dataset.depth || '0');
          gsap.to(el, {
            yPercent: -depth,
            ease: 'none',
            scrollTrigger: {
              trigger: el.closest('section'),
              start: 'top bottom',
              end: 'bottom top',
              scrub: 1,
            },
          });
        });

        /* Premier temps de scroll : révélation au défilement */
        gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el, i) => {
          gsap.from(el, {
            opacity: 0, y: 40, duration: 1.1, ease,
            scrollTrigger: { trigger: el, start: 'top 82%' },
            delay: (i % 3) * 0.08,
          });
        });

        /* Ligne d'accent qui se trace */
        gsap.from('[data-rule]', {
          scaleX: 0, transformOrigin: 'left', duration: 1.2, ease,
          scrollTrigger: { trigger: '[data-rule]', start: 'top 88%' },
        });
      }
    }, root);

    return () => {
      ctx.revert();
      ScrollTrigger.getAll().forEach((t) => t.kill());
      if (rafId) cancelAnimationFrame(rafId);
      lenis?.destroy();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative min-h-screen overflow-x-hidden antialiased selection:bg-[#c8722f] selection:text-[#0b0f09]"
      style={{ backgroundColor: C.base, color: C.cream, fontFamily: '"Inter Tight", system-ui, sans-serif' }}
    >
      {/* ── Styles locaux : fonts, keyframes, grain ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT@0,9..144,300..600,0..100;1,9..144,300..600,0..100&family=Inter+Tight:wght@300;400;500;600&display=swap');

        .v3-display {
          font-family: "Fraunces", Georgia, serif;
          font-variation-settings: "SOFT" 60, "opsz" 144, "WONK" 0;
          font-optical-sizing: auto;
        }
        .v3-display-it { font-family: "Fraunces", Georgia, serif; font-style: italic; font-variation-settings: "SOFT" 80, "opsz" 90; }

        /* Garder chaque mot atomique : la coupure se fait entre les mots, jamais au milieu */
        .v3-display .word { display: inline-block; white-space: nowrap; }
        .v3-display .char { display: inline-block; }

        /* Dérives ambiantes — transform uniquement, lentes, sans rebond */
        @keyframes drift-a {
          0%,100% { transform: translate3d(0,0,0) rotate(0deg); }
          50% { transform: translate3d(10px,-16px,0) rotate(3deg); }
        }
        @keyframes drift-b {
          0%,100% { transform: translate3d(0,0,0) rotate(0deg); }
          50% { transform: translate3d(-12px,-10px,0) rotate(-4deg); }
        }
        @keyframes drift-c {
          0%,100% { transform: translate3d(0,0,0) rotate(0deg); }
          50% { transform: translate3d(8px,12px,0) rotate(5deg); }
        }
        .drift-a { animation: drift-a 13s ease-in-out infinite; }
        .drift-b { animation: drift-b 17s ease-in-out infinite; }
        .drift-c { animation: drift-c 15s ease-in-out infinite; }

        @keyframes breathe {
          0%,100% { transform: scale(1); }
          50% { transform: scale(1.018); }
        }
        .v3-breathe { animation: breathe 9s ease-in-out infinite; }

        @keyframes cue {
          0%,100% { transform: translateY(0); opacity: 0.45; }
          50% { transform: translateY(7px); opacity: 1; }
        }
        .v3-cue { animation: cue 2.4s ease-in-out infinite; }

        .v3-grain {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
        }

        @media (prefers-reduced-motion: reduce) {
          .drift-a, .drift-b, .drift-c, .v3-breathe, .v3-cue { animation: none !important; }
        }
      `}</style>

      {/* ── Grain papier global (statique, non animé) ── */}
      <div
        className="v3-grain pointer-events-none fixed inset-0 z-[60] opacity-[0.10] mix-blend-soft-light"
        aria-hidden
      />

      {/* ── Navigation minimale (propre à V3) ── */}
      <nav className="fixed inset-x-0 top-0 z-50 px-6 py-5 md:px-12 md:py-7">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between">
          <a href="#top" className="flex items-center gap-2.5 group">
            <Leaf size={20} weight="fill" color={C.clay} className="v3-breathe shrink-0" />
            <span className="v3-display text-[1.05rem] tracking-tight" style={{ color: C.cream }}>
              Krystine St-Laurent
            </span>
          </a>
          <div className="hidden items-center gap-9 text-[0.72rem] uppercase tracking-[0.22em] md:flex" style={{ color: C.creamSoft }}>
            <a href="#histoire" className="transition-colors hover:text-[#ece4d3]">Son histoire</a>
            <a href="#conferences" className="transition-colors hover:text-[#ece4d3]">Conférences</a>
            <a
              href="#reserver"
              className="rounded-full border px-5 py-2 transition-colors hover:bg-[#c8722f] hover:text-[#0b0f09] hover:border-[#c8722f]"
              style={{ borderColor: 'rgba(205,176,137,0.4)', color: C.cream }}
            >
              Réserver
            </a>
          </div>
        </div>
      </nav>

      {/* ════════════════════ HERO ════════════════════ */}
      <section
        id="top"
        className="relative flex min-h-screen items-center overflow-hidden pt-28 pb-20 md:pt-32"
      >
        {/* Brumes chaudes (radiales, statiques) */}
        <div
          className="pointer-events-none absolute inset-0 z-0"
          aria-hidden
          style={{
            background:
              `radial-gradient(120% 90% at 18% 8%, rgba(54,72,45,0.55) 0%, rgba(16,20,14,0) 48%),` +
              `radial-gradient(90% 80% at 92% 95%, rgba(200,114,47,0.16) 0%, rgba(16,20,14,0) 52%),` +
              `radial-gradient(140% 120% at 50% 120%, rgba(11,15,9,0.9) 0%, rgba(16,20,14,0) 60%)`,
          }}
        />

        {/* Feuillages flottants — couche arrière */}
        <div className="pointer-events-none absolute inset-0 z-[1]" aria-hidden>
          {HERO_LEAVES.map((lf) => (
            <div
              key={lf.id}
              data-depth={lf.depth}
              className="absolute"
              style={{ top: lf.top, left: lf.left, right: lf.right, opacity: lf.opacity }}
            >
              <div className={lf.drift} style={{ transform: `rotate(${lf.rotate}deg)`, width: lf.size, height: lf.size * 1.4 }}>
                <LeafSVG id={lf.id} className="block h-full w-full" />
              </div>
            </div>
          ))}
        </div>

        <div className="relative z-10 mx-auto grid w-full max-w-[1400px] grid-cols-1 items-center gap-12 px-6 md:px-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          {/* Colonne texte */}
          <div className="max-w-[40rem]">
            <p
              data-hero-fade
              className="mb-7 flex items-center gap-3 text-[0.68rem] uppercase tracking-[0.3em]"
              style={{ color: C.clay }}
            >
              <span className="h-px w-9" style={{ backgroundColor: C.clay }} />
              Conférencière · Autrice · Clinicienne en Ayurveda
            </p>

            <h1
              ref={headlineRef}
              className="v3-display text-[clamp(3rem,8.5vw,6.6rem)] font-light leading-[0.92]"
              style={{ color: C.cream }}
            >
              Krystine St-Laurent
            </h1>

            <p
              data-hero-fade
              className="v3-display-it mt-8 max-w-[30ch] text-[clamp(1.3rem,2.6vw,2rem)] font-light leading-[1.28]"
              style={{ color: C.creamSoft }}
            >
              Une voix rare, où la rigueur du clinicien rencontre la sagesse millénaire.
            </p>

            {/* Faits réels */}
            <div data-hero-fade className="mt-10 flex flex-wrap items-end gap-x-9 gap-y-5">
              {FACTS.map((f) => (
                <div key={f.label}>
                  <div className="v3-display text-[2.4rem] font-light leading-none" style={{ color: C.clay }}>
                    {f.n}
                  </div>
                  <div className="mt-1.5 text-[0.66rem] uppercase tracking-[0.2em]" style={{ color: C.creamSoft }}>
                    {f.label}
                  </div>
                </div>
              ))}
            </div>

            <div data-hero-fade className="mt-11 flex flex-wrap items-center gap-6">
              <a
                href="#reserver"
                className="group inline-flex items-center gap-3 rounded-full px-8 py-4 text-[0.7rem] uppercase tracking-[0.2em] transition-transform duration-300 hover:-translate-y-0.5"
                style={{ backgroundColor: C.clay, color: C.deep }}
              >
                Réserver Krystine
                <ArrowUpRight size={16} weight="bold" className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
              <a
                href="#conferences"
                className="v3-display-it border-b pb-1 text-lg transition-colors hover:text-[#ece4d3]"
                style={{ color: C.creamSoft, borderColor: 'rgba(200,114,47,0.4)' }}
              >
                Voir les conférences
              </a>
            </div>
          </div>

          {/* Colonne portrait — arche organique, feuilles au premier plan */}
          <div data-portrait className="relative mx-auto w-full max-w-[26rem] lg:max-w-none">
            <div className="relative">
              {/* Halo derrière le portrait */}
              <div
                className="absolute -inset-6 -z-10 rounded-[48%_48%_46%_46%/60%_60%_42%_42%]"
                aria-hidden
                style={{ background: `radial-gradient(closest-side, rgba(200,114,47,0.22), rgba(16,20,14,0))` }}
              />
              <div
                className="v3-breathe overflow-hidden rounded-[48%_48%_46%_46%/60%_60%_42%_42%] border"
                style={{ borderColor: 'rgba(205,176,137,0.25)', boxShadow: '0 40px 90px -30px rgba(0,0,0,0.7)' }}
              >
                <img
                  src="/krystine-portrait.jpg"
                  alt="Portrait de Krystine St-Laurent"
                  className="h-[clamp(24rem,52vh,38rem)] w-full object-cover object-top"
                  style={{ filter: 'saturate(0.92) contrast(1.02)' }}
                  loading="eager"
                />
                {/* fondu chaud sur le bas du portrait pour ancrer dans la scène */}
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3"
                  aria-hidden
                  style={{ background: `linear-gradient(to top, ${C.base}, rgba(16,20,14,0))` }}
                />
              </div>

              {/* Feuille au premier plan (profondeur sans blur) */}
              <div data-depth="40" className="pointer-events-none absolute -bottom-8 -left-10 w-[140px] opacity-90" aria-hidden>
                <div className="drift-b">
                  <LeafSVG id="pf1" className="w-full" />
                </div>
              </div>
              <div data-depth="22" className="pointer-events-none absolute -right-6 top-6 w-[88px] opacity-70" aria-hidden>
                <div className="drift-c" style={{ transform: 'rotate(40deg)' }}>
                  <LeafSVG id="pf2" className="w-full" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Indice de défilement */}
        <a
          href="#histoire"
          className="absolute bottom-7 left-1/2 z-10 -translate-x-1/2 flex flex-col items-center gap-2 text-[0.6rem] uppercase tracking-[0.28em]"
          style={{ color: C.creamSoft }}
        >
          Défiler
          <ArrowDown size={16} className="v3-cue" color={C.clay} />
        </a>
      </section>

      {/* ════════════ PREMIER TEMPS DE SCROLL — Son histoire ════════════ */}
      <section id="histoire" className="relative overflow-hidden py-28 md:py-40">
        {/* Brume haute + feuilles de transition */}
        <div
          className="pointer-events-none absolute inset-0 z-0"
          aria-hidden
          style={{ background: `radial-gradient(80% 60% at 80% 0%, rgba(44,58,38,0.5), rgba(16,20,14,0) 55%)` }}
        />
        <div data-depth="38" className="pointer-events-none absolute -left-8 top-10 w-[180px] opacity-40" aria-hidden>
          <div className="drift-a"><LeafSVG id="s1" className="w-full" /></div>
        </div>
        <div data-depth="28" className="pointer-events-none absolute right-4 bottom-16 w-[120px] opacity-30" aria-hidden>
          <div className="drift-c" style={{ transform: 'rotate(-30deg)' }}><LeafSVG id="s2" className="w-full" /></div>
        </div>

        <div className="relative z-10 mx-auto grid w-full max-w-[1180px] grid-cols-1 gap-14 px-6 md:px-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div>
            <p data-reveal className="text-[0.66rem] uppercase tracking-[0.3em]" style={{ color: C.clay }}>
              Chapitre 01 · Son histoire
            </p>
            <h2
              data-reveal
              className="v3-display mt-6 text-[clamp(2.2rem,5vw,3.8rem)] font-light leading-[1.02]"
              style={{ color: C.cream }}
            >
              De la clinique
              <br />
              <span className="v3-display-it" style={{ color: C.sand }}>à la scène</span>
            </h2>
            <div
              data-rule
              className="mt-8 h-px w-20"
              style={{ backgroundColor: C.clay }}
              aria-hidden
            />
            <p data-reveal className="v3-display-it mt-8 text-[1.5rem] leading-none" style={{ color: C.clay }}>
              Krystine
            </p>
          </div>

          <div className="space-y-7">
            {STORY.map((p, i) => (
              <p
                key={i}
                data-reveal
                className="max-w-[58ch] text-[1.04rem] font-light leading-[1.85]"
                style={{ color: C.creamSoft }}
              >
                <span className="v3-display-it mr-2 text-[1.3rem]" style={{ color: C.clay }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                {p}
              </p>
            ))}

            <a
              data-reveal
              id="conferences"
              href="#reserver"
              className="group mt-4 inline-flex items-center gap-3 text-[0.7rem] uppercase tracking-[0.22em] transition-colors hover:text-[#ece4d3] scroll-mt-32"
              style={{ color: C.sand }}
            >
              <span className="h-px w-8 transition-all duration-300 group-hover:w-12" style={{ backgroundColor: C.clay }} />
              Découvrir les conférences signature
              <ArrowUpRight size={15} weight="bold" color={C.clay} />
            </a>
          </div>
        </div>

        {/* Couture vers la suite (placeholder de bas de page de concept) */}
        <div id="reserver" className="mx-auto mt-28 max-w-[1180px] px-6 text-center md:px-12 scroll-mt-32">
          <p className="v3-display-it text-[clamp(1.4rem,3vw,2.4rem)] font-light leading-[1.3]" style={{ color: C.cream }}>
            « Krystine ne fait pas une conférence, elle ouvre un espace. »
          </p>
        </div>
      </section>
    </div>
  );
};

export default KrystineV3;
