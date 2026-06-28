import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import SplitType from 'split-type';
import { ArrowUpRight, ArrowDown } from '@phosphor-icons/react';

gsap.registerPlugin(ScrollTrigger);

/**
 * Concept V2 — « Clair, aéré, luxe magazine (crème) ».
 * Couverture de magazine éditoriale pour Krystine St-Laurent.
 * Hero photo-mené + un premier temps de scroll (révélation ligne par ligne).
 * Copie réelle reprise de ConferenciereLoeuvre. Fichier 100% autonome.
 */

const EASE = 'cubic-bezier(0.22,1,0.36,1)';

const COVERLINES = ['37 ans de pratique', '3 livres · Éditions de l’Homme', 'TEDx'];

export default function KrystineV2() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce) return;

    let lenis: Lenis | null = null;
    let split: SplitType | null = null;

    const raf = (time: number) => lenis?.raf(time * 1000);

    const ctx = gsap.context(() => {
      // ── Smooth scroll ──
      lenis = new Lenis({ duration: 1.1, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);

      const power3 = 'power3.out';

      // ── HERO masthead : révélation par ligne (mask + translateY) ──
      gsap.from('[data-line] > span', {
        yPercent: 115,
        duration: 1.2,
        ease: power3,
        stagger: 0.12,
        delay: 0.15,
      });

      // ── HERO portrait : volet clip-path + léger settle (Ken Burns) ──
      gsap.from('[data-portrait-clip]', {
        clipPath: 'inset(0% 0% 100% 0%)',
        duration: 1.35,
        ease: power3,
        delay: 0.35,
      });
      gsap.from('[data-portrait-img]', {
        scale: 1.14,
        duration: 1.9,
        ease: power3,
        delay: 0.35,
      });

      // ── HERO cover-lines + meta + CTA : fade-up échelonné ──
      gsap.from('[data-fade]', {
        opacity: 0,
        y: 22,
        duration: 1,
        ease: power3,
        stagger: 0.09,
        delay: 0.7,
      });

      // ── Parallaxe douce du portrait au scroll (transform only) ──
      gsap.to('[data-portrait-img]', {
        yPercent: 8,
        ease: 'none',
        scrollTrigger: {
          trigger: '[data-hero]',
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });

      // ── PREMIER TEMPS DE SCROLL : statement révélé ligne par ligne ──
      const statement = root.current?.querySelector('[data-statement]') as HTMLElement | null;
      if (statement) {
        split = new SplitType(statement, { types: 'lines', lineClass: 'v2-line' });
        gsap.set('.v2-line', { overflow: 'hidden' });
        gsap.from(split.lines, {
          yPercent: 110,
          duration: 1.1,
          ease: power3,
          stagger: 0.1,
          scrollTrigger: { trigger: statement, start: 'top 80%' },
        });
      }

      // ── Chiffres + image inset : fade-up au scroll ──
      gsap.from('[data-beat]', {
        opacity: 0,
        y: 30,
        duration: 1.05,
        ease: power3,
        stagger: 0.12,
        scrollTrigger: { trigger: '[data-beat-grid]', start: 'top 78%' },
      });
      gsap.from('[data-beat-img-clip]', {
        clipPath: 'inset(100% 0% 0% 0%)',
        duration: 1.3,
        ease: power3,
        scrollTrigger: { trigger: '[data-beat-img-clip]', start: 'top 82%' },
      });
      gsap.to('[data-beat-img]', {
        yPercent: -10,
        ease: 'none',
        scrollTrigger: {
          trigger: '[data-beat-img-clip]',
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });
    }, root);

    return () => {
      ctx.revert();
      split?.revert();
      gsap.ticker.remove(raf);
      lenis?.destroy();
    };
  }, []);

  const navLinks = [
    ['Histoire', '#histoire'],
    ['Conférences', '#conferences'],
    ['Réserver', '#reserver'],
  ];

  return (
    <div
      ref={root}
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

      {/* ─────────── NAV ─────────── */}
      <header className="fixed top-0 left-0 z-50 w-full px-[clamp(1.5rem,5vw,5.5rem)] py-6 flex items-center justify-between mix-blend-multiply">
        <a href="#" className="v2-serif text-[1.05rem] tracking-tight text-[#1c1712]">
          Krystine <span className="italic font-light">St-Laurent</span>
        </a>
        <nav className="hidden md:flex items-center gap-10">
          {navLinks.map(([label, href]) => (
            <a
              key={label}
              href={href}
              className="text-[0.7rem] uppercase tracking-[0.22em] text-[#1c1712]/70 hover:text-[#9c7a44] transition-colors duration-300"
            >
              {label}
            </a>
          ))}
        </nav>
        <span className="text-[0.62rem] uppercase tracking-[0.24em] text-[#1c1712]/50">
          Inspira&nbsp;Nature
        </span>
      </header>

      {/* ─────────── HERO · couverture ─────────── */}
      <section
        data-hero
        className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] pt-[clamp(7rem,13vh,9.5rem)] pb-[clamp(2rem,5vh,4rem)] min-h-screen flex flex-col"
      >
        {/* ligne de tête · info d'édition */}
        <div
          data-fade
          className="flex items-center justify-between border-t border-[#1c1712]/15 pt-3.5 text-[0.6rem] uppercase tracking-[0.28em] text-[#1c1712]/55"
        >
          <span>N&deg; 01 &middot; Conférences &amp; Ayurvéda</span>
          <span className="hidden sm:inline">Québec &middot; MMXXVI</span>
        </div>

        {/* grille couverture */}
        <div className="flex-1 grid items-stretch gap-x-[clamp(2rem,5vw,5rem)] gap-y-10 lg:grid-cols-[1.05fr_0.95fr] mt-[clamp(2rem,5vh,4rem)]">
          {/* MASTHEAD */}
          <div className="order-1 lg:row-start-1 lg:col-start-1 self-start">
            <p
              data-fade
              className="text-[0.7rem] uppercase tracking-[0.34em] text-[#9c7a44] mb-7"
            >
              Conférencière &middot; Autrice
            </p>
            <h1 className="v2-serif font-light leading-[0.9] text-[#1c1712] text-[clamp(3.2rem,9.5vw,9.5rem)]">
              <span data-line className="block overflow-hidden">
                <span className="block">Krystine</span>
              </span>
              <span data-line className="block overflow-hidden">
                <span className="block italic font-normal text-[#3a2f23]">St-Laurent</span>
              </span>
            </h1>
          </div>

          {/* PORTRAIT */}
          <div className="order-2 lg:row-start-1 lg:row-span-2 lg:col-start-2 self-stretch relative flex">
            <div className="relative w-full min-h-[58vh] lg:min-h-0">
              {/* filet brass d'encadrement */}
              <span className="pointer-events-none absolute -inset-2 border border-[#9c7a44]/35" aria-hidden />
              <div
                data-portrait-clip
                className="relative h-full w-full overflow-hidden"
                style={{ clipPath: 'inset(0% 0% 0% 0%)' }}
              >
                <img
                  data-portrait-img
                  src="/krystine-portrait.jpg"
                  alt="Krystine St-Laurent, conférencière et autrice"
                  className="h-full w-full object-cover object-[50%_22%] will-change-transform"
                />
                {/* voile très léger bas pour asseoir la légende */}
                <div
                  className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
                  style={{ background: 'linear-gradient(to top, rgba(28,23,18,0.45), transparent)' }}
                  aria-hidden
                />
                {/* légende couverture */}
                <p
                  data-fade
                  className="absolute bottom-4 left-4 right-4 v2-serif italic text-[#f4efe6] text-sm tracking-wide"
                >
                  « Une voix rare, où la rigueur du clinicien rencontre la sagesse millénaire. »
                </p>
              </div>
              {/* tab cover-line coin haut-gauche */}
              <span
                data-fade
                className="absolute -top-2 -left-2 bg-[#1c1712] text-[#f4efe6] px-3 py-1.5 text-[0.58rem] uppercase tracking-[0.24em]"
              >
                Édition Ayurvéda
              </span>
            </div>
          </div>

          {/* BAS-GAUCHE · cover-lines + tagline + CTA */}
          <div className="order-3 lg:row-start-2 lg:col-start-1 self-end">
            <ul data-fade className="flex flex-wrap gap-x-7 gap-y-2 mb-7">
              {COVERLINES.map((c) => (
                <li
                  key={c}
                  className="flex items-center gap-2.5 text-[0.68rem] uppercase tracking-[0.2em] text-[#1c1712]/70"
                >
                  <span className="h-1 w-1 rounded-full bg-[#9c7a44]" />
                  {c}
                </li>
              ))}
            </ul>

            <p
              data-fade
              className="v2-serif text-[clamp(1.35rem,2.4vw,1.95rem)] font-light leading-[1.32] text-[#3a2f23] max-w-[34ch]"
            >
              Chaque conférence est cousue main pour le public qui l&rsquo;attend. Pas un
              module pré-fait, une rencontre.
            </p>

            <div data-fade className="mt-9 flex flex-wrap items-center gap-x-9 gap-y-4">
              <a
                href="#reserver"
                className="group inline-flex items-center gap-2.5 text-[0.72rem] uppercase tracking-[0.2em] text-[#1c1712] border-b border-[#1c1712] pb-1.5 transition-colors duration-300 hover:text-[#9c7a44] hover:border-[#9c7a44]"
              >
                Réserver une conférence
                <ArrowUpRight size={15} weight="regular" className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
              <a
                href="#conferences"
                className="v2-serif italic text-lg text-[#1c1712]/70 hover:text-[#9c7a44] transition-colors duration-300"
              >
                Voir les conférences
              </a>
            </div>
          </div>
        </div>

        {/* pied de hero · indice de scroll */}
        <div
          data-fade
          className="flex items-end justify-between border-b border-[#1c1712]/15 pb-3.5 mt-[clamp(1.5rem,4vh,3rem)] text-[0.6rem] uppercase tracking-[0.28em] text-[#1c1712]/55"
        >
          <span className="flex items-center gap-2 v2-cue">
            <ArrowDown size={13} weight="regular" />
            Faire défiler
          </span>
          <span className="hidden sm:inline">Salut Bonjour &middot; TEDx</span>
        </div>
      </section>

      {/* ─────────── PREMIER TEMPS DE SCROLL · son histoire ─────────── */}
      <section
        id="histoire"
        className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,16vh,12rem)]"
      >
        <p className="text-[0.7rem] uppercase tracking-[0.34em] text-[#9c7a44] mb-12">
          Chapitre 01 &middot; Son histoire
        </p>

        <div
          data-beat-grid
          className="grid gap-x-[clamp(2rem,5vw,5rem)] gap-y-14 lg:grid-cols-[1.15fr_0.85fr] items-end"
        >
          {/* statement révélé ligne par ligne */}
          <div>
            <p
              data-statement
              className="v2-serif font-light leading-[1.18] text-[#1c1712] text-[clamp(1.9rem,4.4vw,3.6rem)] max-w-[20ch]"
            >
              37 ans à traverser les milieux de la santé, avant de choisir
              l&rsquo;herboristerie, l&rsquo;Ayurveda et l&rsquo;aromathérapie.
            </p>

            {/* chiffres */}
            <div className="mt-14 grid grid-cols-3 gap-6 max-w-xl border-t border-[#1c1712]/15 pt-9">
              {[
                ['37', 'ans de pratique'],
                ['03', 'livres publiés'],
                ['TEDx', 'et Salut Bonjour'],
              ].map(([n, l]) => (
                <div data-beat key={l}>
                  <p className="v2-serif text-[clamp(2rem,4vw,3.2rem)] font-light leading-none text-[#9c7a44]">
                    {n}
                  </p>
                  <p className="mt-3 text-[0.66rem] uppercase tracking-[0.18em] text-[#1c1712]/60 leading-relaxed">
                    {l}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* image inset avec parallaxe + clip reveal */}
          <div className="relative">
            <div
              data-beat-img-clip
              className="relative aspect-[4/5] w-full overflow-hidden"
              style={{ clipPath: 'inset(0% 0% 0% 0%)' }}
            >
              <img
                data-beat-img
                src="/origine-square.jpg"
                alt="Krystine St-Laurent, univers Inspira Nature"
                className="absolute inset-0 h-[120%] w-full object-cover object-center will-change-transform"
              />
            </div>
            <p
              data-beat
              className="mt-4 v2-serif italic text-[#1c1712]/55 text-sm"
            >
              De la clinique à la scène &middot; Inspira Nature
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
