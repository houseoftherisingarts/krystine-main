import React, { useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import SplitType from 'split-type';
import { ArrowRight, ArrowDown } from '@phosphor-icons/react';

/*
 * Concept V1 — Éditorial chaud cinématique (espresso).
 * Hero : type cinétique surdimensionné (Fraunces) en pièce maîtresse,
 * plaque portrait vidéo en parallaxe, lumière volumétrique + grain.
 * Premier beat : moment éditorial révélé au scroll (le grand 37).
 * Contenu réel repris de ConferenciereLoeuvre.tsx. Aucun em dash.
 */

gsap.registerPlugin(ScrollTrigger);

const EASE = 'power3.out';
const EASE_CSS = 'cubic-bezier(0.22,1,0.36,1)';

const FACTS = [
  { n: '37', label: 'ans de pratique' },
  { n: '3', label: 'livres, Éditions de l’Homme' },
  { n: 'TEDx', label: 'scène et grands médias' },
];

const KrystineV1: React.FC = () => {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const el = root.current;
    if (!el) return;

    // Injecte la police display (Fraunces) une seule fois, dans ce fichier.
    const FONT_ID = 'ksl-v1-fraunces';
    if (!document.getElementById(FONT_ID)) {
      const link = document.createElement('link');
      link.id = FONT_ID;
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..500&display=swap';
      document.head.appendChild(link);
    }

    if (prefersReduced) return; // Tout reste visible, aucune animation.

    const splits: SplitType[] = [];

    const ctx = gsap.context(() => {
      // ── Révélation cinétique du titre (masque par ligne + chars) ──
      const lines = gsap.utils.toArray<HTMLElement>('.v1-line');
      lines.forEach((line) => {
        const s = new SplitType(line, { types: 'chars', tagName: 'span' });
        splits.push(s);
      });

      const tl = gsap.timeline({ delay: 0.15 });

      tl.set('.v1-fade', { opacity: 0, y: 22 });

      lines.forEach((line, i) => {
        const chars = line.querySelectorAll('.char');
        tl.from(
          chars,
          {
            yPercent: 116,
            duration: 1.15,
            ease: EASE,
            stagger: { each: 0.022, from: 'start' },
          },
          i === 0 ? 0 : '-=0.95',
        );
      });

      // Filet laiton qui se déploie.
      tl.from('.v1-rule', { scaleX: 0, transformOrigin: 'left center', duration: 1.0, ease: EASE }, '-=0.7');

      // Apparition échelonnée des éléments secondaires.
      tl.to(
        '.v1-fade',
        { opacity: 1, y: 0, duration: 1.0, ease: EASE, stagger: 0.1 },
        '-=0.8',
      );

      // ── Plaque portrait : montée douce + parallaxe au scroll ──
      gsap.from('.v1-plate', { opacity: 0, scale: 1.06, duration: 1.4, ease: EASE, delay: 0.1 });
      gsap.to('.v1-plate-media', {
        yPercent: 12,
        ease: 'none',
        scrollTrigger: { trigger: '.v1-hero', start: 'top top', end: 'bottom top', scrub: true },
      });

      // Indice de défilement qui s’efface.
      gsap.to('.v1-scrollcue', {
        opacity: 0,
        scrollTrigger: { trigger: '.v1-hero', start: 'top top', end: '18% top', scrub: true },
      });

      // ── Premier beat : moment éditorial révélé au scroll ──
      const beatBody = document.querySelector<HTMLElement>('.v1-beat-body');
      if (beatBody) {
        const sb = new SplitType(beatBody, { types: 'lines', tagName: 'span' });
        splits.push(sb);
        gsap.set(beatBody.querySelectorAll('.line'), { display: 'block', overflow: 'hidden' });
        gsap.from(beatBody.querySelectorAll('.line'), {
          yPercent: 100,
          opacity: 0,
          duration: 1.1,
          ease: EASE,
          stagger: 0.12,
          scrollTrigger: { trigger: '.v1-beat', start: 'top 64%' },
        });
      }

      gsap.from('.v1-bignum', {
        opacity: 0,
        yPercent: 18,
        duration: 1.3,
        ease: EASE,
        scrollTrigger: { trigger: '.v1-beat', start: 'top 70%' },
      });

      gsap.utils.toArray<HTMLElement>('.v1-beat-meta').forEach((node, i) => {
        gsap.from(node, {
          opacity: 0,
          y: 26,
          duration: 1.0,
          ease: EASE,
          delay: i * 0.1,
          scrollTrigger: { trigger: '.v1-beat', start: 'top 56%' },
        });
      });
    }, el);

    // ── Lenis pilote ScrollTrigger ──
    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      ctx.revert();
      splits.forEach((s) => s.revert());
    };
  }, []);

  return (
    <div ref={root} className="relative min-h-screen bg-[#0c0b08] text-[#f4ece0] antialiased overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..500&display=swap');
        .v1-display { font-family: 'Fraunces', Georgia, serif; font-optical-sizing: auto; }
        .v1-serif { font-family: 'Cormorant Garamond', Georgia, serif; }
        .v1-sans { font-family: 'Inter', system-ui, sans-serif; }
        .v1-line { display: block; overflow: hidden; }
        .v1-line .char { display: inline-block; will-change: transform; }
        @keyframes v1-grain {
          0%,100% { transform: translate(0,0); }
          20% { transform: translate(-1.5%,1%); }
          40% { transform: translate(1%,-1.5%); }
          60% { transform: translate(-1%,1.5%); }
          80% { transform: translate(1.5%,-1%); }
        }
        .v1-grain { animation: v1-grain 1.2s steps(2) infinite; }
        @media (prefers-reduced-motion: reduce) {
          .v1-grain { animation: none; }
        }
      `}</style>

      {/* ── Lumière volumétrique (statique) ── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(120% 90% at 82% 8%, rgba(187,154,94,0.16) 0%, rgba(187,154,94,0.05) 26%, rgba(12,11,8,0) 56%), radial-gradient(90% 80% at 12% 100%, rgba(42,32,21,0.55) 0%, rgba(12,11,8,0) 60%)',
        }}
      />
      {/* ── Grain filmique (un seul élément, transform only) ── */}
      <div
        aria-hidden
        className="v1-grain pointer-events-none fixed inset-[-20%] z-[1] opacity-[0.06] mix-blend-soft-light"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* ── NAV minimale ── */}
      <header className="fixed inset-x-0 top-0 z-50">
        <nav className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-6 md:px-12 md:py-7">
          <a href="#top" className="v1-sans text-[0.7rem] uppercase tracking-[0.34em] text-[#f4ece0]">
            Krystine St-Laurent
          </a>
          <div className="hidden items-center gap-9 md:flex">
            <a href="#parcours" className="v1-sans text-[0.66rem] uppercase tracking-[0.24em] text-[#cdbfa9] transition-colors duration-300 hover:text-[#dcb874]">
              Parcours
            </a>
            <a href="#conferences" className="v1-sans text-[0.66rem] uppercase tracking-[0.24em] text-[#cdbfa9] transition-colors duration-300 hover:text-[#dcb874]">
              Conférences
            </a>
            <a
              href="#reserver"
              className="group inline-flex items-center gap-2 rounded-full border border-[#bb9a5e]/40 px-5 py-2 v1-sans text-[0.64rem] uppercase tracking-[0.22em] text-[#dcb874] transition-colors duration-300 hover:bg-[#bb9a5e] hover:text-[#0c0b08]"
            >
              Réserver
              <ArrowRight size={13} weight="bold" className="transition-transform duration-300 group-hover:translate-x-0.5" />
            </a>
          </div>
        </nav>
      </header>

      {/* ════════════════════ HERO ════════════════════ */}
      <section id="top" className="v1-hero relative z-10 min-h-screen w-full overflow-hidden">
        <div className="mx-auto grid min-h-screen max-w-[1440px] grid-cols-1 items-center gap-10 px-6 pt-28 pb-20 md:px-12 lg:grid-cols-[1.06fr_0.78fr] lg:gap-16 lg:pt-24">

          {/* — Colonne type — */}
          <div className="relative">
            <p className="v1-fade v1-sans mb-7 flex items-center gap-3 text-[0.66rem] uppercase tracking-[0.36em] text-[#bb9a5e]">
              <span className="inline-block h-1 w-1 rounded-full bg-[#bb9a5e]" />
              Conférencière · Autrice
            </p>

            <h1 className="v1-display font-medium leading-[0.86] text-[clamp(3.4rem,11vw,8.4rem)]">
              <span className="v1-line">Krystine</span>
              <span className="v1-line italic font-light text-[#dcb874]">St-Laurent</span>
            </h1>

            <div className="v1-rule mt-8 h-px w-[58%] max-w-[360px] origin-left bg-gradient-to-r from-[#bb9a5e] via-[#bb9a5e]/50 to-transparent" />

            <p className="v1-fade v1-serif mt-8 max-w-[30ch] text-[clamp(1.35rem,2.7vw,2.05rem)] font-light italic leading-[1.28] text-[#cdbfa9]">
              Une voix rare, où la rigueur du clinicien rencontre la sagesse millénaire.
            </p>

            <p className="v1-fade v1-sans mt-7 max-w-[44ch] text-[0.98rem] leading-[1.85] text-[#9a8f7c]">
              Chaque conférence est cousue main pour le public qui l’attend. Pas un module pré-fait, une rencontre.
            </p>

            {/* — Faits réels — */}
            <div className="v1-fade mt-11 flex flex-wrap items-stretch gap-8">
              {FACTS.map((f) => (
                <div key={f.n} className="flex items-baseline gap-3">
                  <span className="v1-display text-[2.1rem] leading-none text-[#dcb874]">{f.n}</span>
                  <span className="v1-sans max-w-[12ch] text-[0.64rem] uppercase leading-snug tracking-[0.18em] text-[#9a8f7c]">
                    {f.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="v1-fade mt-12 flex flex-wrap items-center gap-7">
              <a
                href="#reserver"
                className="group inline-flex items-center gap-3 rounded-full bg-[#bb9a5e] px-9 py-4 v1-sans text-[0.7rem] uppercase tracking-[0.2em] text-[#0c0b08] transition-colors duration-300 hover:bg-[#dcb874]"
              >
                Réserver Krystine
                <ArrowRight size={15} weight="bold" className="transition-transform duration-300 group-hover:translate-x-1" />
              </a>
              <a
                href="#conferences"
                className="v1-serif border-b border-[#bb9a5e]/30 pb-1 text-lg italic text-[#cdbfa9] transition-colors duration-300 hover:text-[#dcb874]"
              >
                Voir les conférences
              </a>
            </div>
          </div>

          {/* — Plaque portrait vidéo — */}
          <div className="v1-plate relative hidden h-[78vh] max-h-[760px] lg:block">
            <div className="relative h-full w-full overflow-hidden rounded-[2px] border border-[#bb9a5e]/20">
              <img
                src="/krystine-portrait.jpg"
                alt="Portrait de Krystine St-Laurent"
                className="v1-plate-media absolute inset-0 h-[124%] w-full -translate-y-[12%] object-cover object-top"
              />
              {/* fondu chaud bas pour ancrer le texte */}
              <div
                aria-hidden
                className="absolute inset-0"
                style={{ background: 'linear-gradient(180deg, rgba(12,11,8,0) 40%, rgba(12,11,8,0.55) 100%)' }}
              />
            </div>
            {/* filet d’angle laiton */}
            <div aria-hidden className="absolute -left-3 top-10 h-24 w-px bg-gradient-to-b from-transparent via-[#bb9a5e]/60 to-transparent" />
            <p className="v1-fade v1-sans absolute -left-3 bottom-6 origin-bottom-left -rotate-90 text-[0.58rem] uppercase tracking-[0.32em] text-[#9a8f7c]">
              Au-delà des tendances
            </p>
          </div>
        </div>

        {/* indice de défilement */}
        <div className="v1-scrollcue pointer-events-none absolute inset-x-0 bottom-7 z-10 flex justify-center">
          <span className="v1-sans flex items-center gap-2 text-[0.58rem] uppercase tracking-[0.3em] text-[#9a8f7c]">
            Défiler
            <ArrowDown size={13} weight="regular" className="animate-bounce" style={{ animationDuration: '2.4s' }} />
          </span>
        </div>
      </section>

      {/* ════════════════════ PREMIER BEAT ════════════════════ */}
      <section id="parcours" className="v1-beat relative z-10 w-full border-t border-[#bb9a5e]/10 py-32 md:py-44">
        <div className="mx-auto grid max-w-[1440px] grid-cols-1 items-center gap-12 px-6 md:px-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20">

          {/* grand chiffre éditorial */}
          <div className="v1-beat-meta">
            <p className="v1-sans mb-6 text-[0.64rem] uppercase tracking-[0.34em] text-[#bb9a5e]">
              Chapitre 01 · Son histoire
            </p>
            <div className="v1-bignum v1-display leading-[0.8] text-[clamp(7rem,18vw,15rem)] text-[#bb9a5e]/90">
              37
            </div>
            <p className="v1-serif -mt-2 text-[clamp(1.4rem,3vw,2.2rem)] font-light italic text-[#cdbfa9]">
              ans à traverser la santé.
            </p>
          </div>

          {/* paragraphe révélé ligne par ligne */}
          <div>
            <p className="v1-beat-body v1-display max-w-[20ch] text-[clamp(1.7rem,3.4vw,2.9rem)] font-light leading-[1.22] text-[#f4ece0]">
              De la clinique à la scène. Soins intensifs, recherche clinique, puis l’herboristerie et l’Ayurveda choisis comme boussole.
            </p>
            <p className="v1-beat-meta v1-sans mt-9 max-w-[52ch] text-[1rem] leading-[1.9] text-[#9a8f7c]">
              Auteure de trois livres aux Éditions de l’Homme, créatrice de série télé et du podcast Au-delà des tendances. Sur scène, cette double appartenance devient une voix rare : la rigueur du clinicien rencontre la sagesse millénaire.
            </p>
            <a
              id="conferences"
              href="#reserver"
              className="v1-beat-meta group mt-12 inline-flex items-center gap-3 v1-sans text-[0.68rem] uppercase tracking-[0.24em] text-[#dcb874]"
            >
              <span className="h-px w-10 bg-[#bb9a5e] transition-all duration-300 group-hover:w-16" />
              Découvrir les conférences signature
              <ArrowRight size={14} weight="bold" className="transition-transform duration-300 group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default KrystineV1;
