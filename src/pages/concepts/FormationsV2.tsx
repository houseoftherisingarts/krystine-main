import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import SplitType from 'split-type';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowUpRight, ArrowDown, ArrowRight, Compass, Wind, Fire, Hourglass, Leaf,
} from '@phosphor-icons/react';
import NewsletterSignup from '../../components/NewsletterSignup';
import LiveEventsSection from '../../components/LiveEvents';
import { getUpcomingEvents } from '../../lib/liveEvents';
import { goToRoute } from '../../lib/staticRoutes';

gsap.registerPlugin(ScrollTrigger);

/**
 * Formations — même langage que /krystine (V2 « magazine crème »), avec un
 * système de couleur par saison ayurvédique pour casser le tout-beige et
 * créer une vraie hiérarchie (passe Impeccable + UI/UX Pro Max).
 * Cover photo-menée (Expérience Origine), Origine en vedette pleine largeur,
 * deux cartes colorées (Foyer, Vata) avec micro-interactions Framer (hover lift, médaillon,
 * stagger). Back-end préservé : navigation programmes, événements live, infolettre.
 * Animations transform/opacity uniquement (Poids-plume).
 */

const EASE = 'cubic-bezier(0.22,1,0.36,1)';
const SPRING = { type: 'spring' as const, stiffness: 220, damping: 24, mass: 0.8 };

const COVERLINES = ['L’Expérience Origine', 'Le Foyer d’Origine', 'Programme Vata'];

/* ════════════════════════ Données · programmes saisonniers ════════════════════════ */

type ProgKind = 'waitlist' | 'internal' | 'external';

interface Programme {
  key: string;
  Icon: React.ComponentType<{ size?: number; weight?: any; className?: string }>;
  tag: string;
  title: string;
  subtitle: string;
  body: string;
  status: string;
  cta: string;
  href: string;
  kind: ProgKind;
  // Système de couleur par saison
  accent: string;   // médaillon plein, filets, flèche
  accentInk: string; // texte d'accent (contraste AA sur le tint)
  tint: string;     // fond de carte teinté
}

const PROGRAMMES: Programme[] = [
  {
    key: 'origine',
    Icon: Compass,
    tag: 'Parcours signature · Prochaine cohorte en janvier',
    title: 'L’Expérience Origine',
    subtitle: 'Retrouver votre boussole intérieure',
    body: "Un parcours de 12 semaines au cœur de l’Ayurveda. La prochaine cohorte s’ouvre en janvier. La liste d’attente reçoit les détails et l’accès avant toute annonce publique.",
    status: 'Liste d’attente · Janvier',
    cta: 'Découvrir l’Expérience Origine',
    href: '/origine',
    kind: 'internal',
    accent: '#9c7a44', accentInk: '#7d6330', tint: '#faf6ee',
  },
  {
    key: 'foyer',
    Icon: Fire,
    tag: 'Autour du feu · Bientôt',
    title: 'Le Foyer d’Origine',
    subtitle: 'Quelque chose se prépare autour du feu',
    body: 'Un lieu pour découvrir, relier et rencontrer ce que nous n’aurions pas pensé chercher.',
    status: 'Le foyer se prépare',
    cta: 'Rejoindre la liste d’attente',
    href: '/liste-attente?programme=foyer',
    kind: 'waitlist',
    accent: '#b4533a', accentInk: '#8f3d29', tint: '#f1ddcf',
  },
  {
    key: 'vata',
    Icon: Wind,
    tag: 'Saison Vata · En autonomie',
    title: 'Programme Vata',
    subtitle: 'Enraciner · Réchauffer · Apaiser',
    body: "Vent, sécheresse, dispersion : la saison Vata teste les nerfs. Un programme de sept semaines pour ancrer le corps et la tête avant l’hiver, à suivre à votre rythme.",
    status: 'En autonomie · dès cette semaine',
    cta: 'Découvrir le programme',
    href: '/vata',
    kind: 'internal',
    accent: '#b9822f', accentInk: '#8a5e1f', tint: '#efe1c6',
  },
];

/* ════════════════════════ Primitives V2 ════════════════════════ */

const Kicker: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <p className={`text-[0.7rem] uppercase tracking-[0.34em] text-[#7d6330] ${className}`}>{children}</p>
);

/* ── Origine en vedette · pleine largeur éditoriale ── */
const FeaturedOrigine: React.FC<{ p: Programme; onOpen: (p: Programme) => void }> = ({ p, onOpen }) => (
  <div className="grid lg:grid-cols-[0.85fr_1.15fr] bg-[#faf6ee] border border-[#9c7a44]/25">
    {/* Image Origine (collage signature) */}
    <div className="relative overflow-hidden min-h-[280px] lg:min-h-0 aspect-[4/3] lg:aspect-auto">
      <img
        src="/origine-square.jpg"
        alt="Expérience Origine — sagesse ancestrale, Ayurveda et réalité moderne"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
    </div>
    {/* Contenu */}
    <div className="flex flex-col justify-center p-[clamp(1.75rem,4vw,3.5rem)]">
      <div className="flex items-center gap-3 mb-6">
        <span className="inline-grid place-items-center w-11 h-11 rounded-full text-[#faf6ee]" style={{ background: p.accent }}>
          <p.Icon size={20} weight="light" />
        </span>
        <span className="text-[0.6rem] uppercase tracking-[0.24em]" style={{ color: p.accentInk }}>{p.tag}</span>
      </div>
      <h3 className="v2-serif font-light leading-[1.04] text-[#1c1712] text-[clamp(2.2rem,4vw,3.4rem)]">{p.title}</h3>
      <p className="mt-3 v2-serif italic text-[clamp(1.15rem,1.8vw,1.5rem)]" style={{ color: p.accentInk }}>{p.subtitle}</p>
      <p className="mt-6 text-[1rem] leading-[1.8] text-[#3a2f23] max-w-[54ch]">{p.body}</p>
      <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-3">
        <button
          type="button"
          onClick={() => onOpen(p)}
          className="group inline-flex items-center gap-2.5 text-[0.72rem] uppercase tracking-[0.2em] text-[#1c1712] border-b border-[#1c1712] pb-1.5 pt-2.5 transition-colors duration-300 hover:border-[#9c7a44] hover:text-[#7d6330]"
        >
          {p.cta}
          <ArrowRight size={15} weight="regular" className="transition-transform duration-300 group-hover:translate-x-1" />
        </button>
        <span className="inline-flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.18em] text-[#1c1712]/55">
          <Hourglass size={12} weight="light" style={{ color: p.accent }} />
          {p.status}
        </span>
      </div>
    </div>
  </div>
);

/* ── Carte saison · colorée + micro-interactions ── */
const cardVariants = (reduce: boolean) => ({
  hidden: { opacity: 0, y: reduce ? 0 : 36 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] as const } },
  hover: reduce ? {} : { y: -8, transition: SPRING },
});

const SeasonCard: React.FC<{ p: Programme; onOpen: (p: Programme) => void }> = ({ p, onOpen }) => {
  const reduce = useReducedMotion() ?? false;
  const Icon = p.Icon;

  const inner = (
    <>
      <div className="flex items-center justify-between gap-4">
        <motion.span
          variants={{ rest: { scale: 1, rotate: 0 }, hover: reduce ? {} : { scale: 1.09, rotate: -4 } }}
          transition={SPRING}
          className="inline-grid place-items-center w-12 h-12 rounded-full text-[#faf6ee] will-change-transform"
          style={{ background: p.accent }}
        >
          <Icon size={22} weight="light" />
        </motion.span>
        {p.kind === 'waitlist' && (
          <span className="inline-flex items-center gap-1.5 text-[0.56rem] uppercase tracking-[0.2em]" style={{ color: p.accentInk }}>
            <Hourglass size={11} weight="light" /> Liste d’attente
          </span>
        )}
      </div>

      <span className="mt-7 block text-[0.6rem] uppercase tracking-[0.24em]" style={{ color: p.accentInk }}>{p.tag}</span>
      <h3 className="mt-3 v2-serif font-light leading-[1.08] text-[#1c1712] text-[1.7rem]">{p.title}</h3>
      <p className="mt-2 v2-serif italic text-[clamp(1.05rem,1.5vw,1.25rem)]" style={{ color: p.accentInk }}>{p.subtitle}</p>

      {/* filet d'accent (pleine largeur, jamais latéral) */}
      <span className="mt-5 block h-px w-12" style={{ background: p.accent }} aria-hidden />

      <p className="mt-5 text-[0.95rem] leading-[1.8] text-[#3a2f23] flex-1">{p.body}</p>

      <div className="mt-8 pt-6 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-[#1c1712]/10">
        <span className="group/cta inline-flex items-center gap-2.5 text-[0.7rem] uppercase tracking-[0.2em] text-[#1c1712] border-b border-[#1c1712] pb-1.5 pt-2.5 transition-colors duration-300">
          {p.cta}
          {p.kind === 'external'
            ? <ArrowUpRight size={14} weight="regular" className="transition-transform duration-300 group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" />
            : <ArrowRight size={14} weight="regular" className="transition-transform duration-300 group-hover/cta:translate-x-1" />}
        </span>
        <span className="inline-flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.18em] text-[#1c1712]/55">
          {p.kind === 'waitlist'
            ? <Hourglass size={12} weight="light" style={{ color: p.accent }} />
            : <Leaf size={12} weight="light" style={{ color: p.accent }} />}
          {p.status}
        </span>
      </div>
    </>
  );

  const sharedProps = {
    variants: cardVariants(reduce),
    initial: 'rest',
    whileHover: 'hover',
    whileTap: reduce ? undefined : { scale: 0.99 },
    className: 'group relative flex h-full flex-col p-[clamp(1.6rem,2.5vw,2.25rem)] text-left will-change-transform',
    style: { background: p.tint },
  };

  if (p.kind === 'external') {
    return (
      <motion.a href={p.href} target="_blank" rel="noopener noreferrer" {...sharedProps}>{inner}</motion.a>
    );
  }
  return (
    <motion.button type="button" onClick={() => onOpen(p)} {...sharedProps}>{inner}</motion.button>
  );
};

/* ════════════════════════ Page ════════════════════════ */

export default function FormationsV2() {
  const root = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const events = getUpcomingEvents({ hideTedx: true });
  const featured = PROGRAMMES[0];
  const seasonal = PROGRAMMES.slice(1);

  const openProgramme = (p: Programme) => {
    if (p.kind === 'waitlist') navigate(p.href);
    else if (p.kind === 'internal') goToRoute(navigate, p.href);
  };

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce) return;

    let lenis: Lenis | null = null;
    let split: SplitType | null = null;
    const raf = (time: number) => lenis?.raf(time * 1000);

    const onAnchorClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a[href^="#"]') as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || href === '#') return;
      const target = root.current?.querySelector(href) as HTMLElement | null;
      if (target) {
        e.preventDefault();
        lenis?.scrollTo(target, { offset: -72 });
      }
    };

    const ctx = gsap.context(() => {
      lenis = new Lenis({ duration: 1.1, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);

      const power3 = 'power3.out';

      gsap.from('[data-line] > span', { yPercent: 115, duration: 1.2, ease: power3, stagger: 0.12, delay: 0.15 });

      gsap.from('[data-portrait-clip]', { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.35, ease: power3, delay: 0.35 });
      gsap.from('[data-portrait-img]', { scale: 1.14, duration: 1.9, ease: power3, delay: 0.35 });

      gsap.from('[data-fade]', { opacity: 0, y: 22, duration: 1, ease: power3, stagger: 0.09, delay: 0.7 });

      gsap.to('[data-portrait-img]', {
        yPercent: 8, ease: 'none',
        scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: 'bottom top', scrub: true },
      });

      const statement = root.current?.querySelector('[data-statement]') as HTMLElement | null;
      if (statement) {
        split = new SplitType(statement, { types: 'lines', lineClass: 'v2-line' });
        gsap.set('.v2-line', { overflow: 'hidden' });
        gsap.from(split.lines, {
          yPercent: 110, duration: 1.1, ease: power3, stagger: 0.1,
          scrollTrigger: { trigger: statement, start: 'top 80%' },
        });
      }

      gsap.set('[data-reveal]', { opacity: 0, y: 36 });
      ScrollTrigger.batch('[data-reveal]', {
        start: 'top 86%',
        onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1.05, ease: power3, stagger: 0.1, overwrite: true }),
      });
    }, root);

    root.current?.addEventListener('click', onAnchorClick);

    return () => {
      root.current?.removeEventListener('click', onAnchorClick);
      ctx.revert();
      split?.revert();
      gsap.ticker.remove(raf);
      lenis?.destroy();
    };
  }, []);

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

      {/* Menu unifié du site = NavBar global (affiché par App.tsx) */}

      {/* ─────────── HERO · couverture ─────────── */}
      <section
        data-hero
        className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] pt-[clamp(7rem,13vh,9.5rem)] pb-[clamp(2rem,5vh,4rem)] min-h-screen flex flex-col"
      >
        <div
          data-fade
          className="flex items-center justify-between border-t border-[#1c1712]/15 pt-3.5 text-[0.6rem] uppercase tracking-[0.28em] text-[#1c1712]/55"
        >
          <span>N&deg; 02 &middot; Programmes &amp; Saisons</span>
          <span className="hidden sm:inline">Québec &middot; MMXXVI</span>
        </div>

        <div className="flex-1 grid items-stretch gap-x-[clamp(2rem,5vw,5rem)] gap-y-10 lg:grid-cols-[1.05fr_0.95fr] mt-[clamp(2rem,5vh,4rem)]">
          {/* MASTHEAD */}
          <div className="order-1 lg:row-start-1 lg:col-start-1 self-start">
            <p data-fade className="text-[0.7rem] uppercase tracking-[0.34em] text-[#7d6330] mb-7">
              Programmes &middot; Ayurvéda
            </p>
            <h1 className="v2-serif font-light leading-[0.9] text-[#1c1712] text-[clamp(3.4rem,11vw,10rem)]">
              <span data-line className="block overflow-hidden">
                <span className="block">Formations</span>
              </span>
            </h1>
          </div>

          {/* PHOTO · Expérience Origine (ratio portrait 5/6) */}
          <div className="order-2 lg:row-start-1 lg:row-span-2 lg:col-start-2 self-stretch relative flex">
            <div className="relative w-full self-center">
              <span className="pointer-events-none absolute -inset-2 border border-[#9c7a44]/35" aria-hidden />
              <div
                data-portrait-clip
                className="relative w-full aspect-[5/6] overflow-hidden"
                style={{ clipPath: 'inset(0% 0% 0% 0%)' }}
              >
                <img
                  data-portrait-img
                  src="/accueil/assets/portes/origine.png"
                  alt="Expérience Origine — un sentier au cœur de la nature"
                  className="h-full w-full object-cover object-center will-change-transform"
                />
                <div
                  className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
                  style={{ background: 'linear-gradient(to top, rgba(28,23,18,0.5), transparent)' }}
                  aria-hidden
                />
                <p data-fade className="absolute bottom-4 left-4 right-4 v2-serif italic text-[#f4efe6] text-sm tracking-wide">
                  « Intégrer l’Ayurveda dans le quotidien, au rythme des saisons. »
                </p>
              </div>
              <span
                data-fade
                className="absolute -top-2 -left-2 bg-[#1c1712] text-[#f4efe6] px-3 py-1.5 text-[0.58rem] uppercase tracking-[0.24em]"
              >
                Saisonnier
              </span>
            </div>
          </div>

          {/* BAS-GAUCHE · cover-lines + tagline + CTA */}
          <div className="order-3 lg:row-start-2 lg:col-start-1 self-end">
            <ul data-fade className="flex flex-wrap gap-x-7 gap-y-2 mb-7">
              {COVERLINES.map((c) => (
                <li key={c} className="flex items-center gap-2.5 text-[0.68rem] uppercase tracking-[0.2em] text-[#1c1712]/70">
                  <span className="h-1 w-1 rounded-full bg-[#9c7a44]" />
                  {c}
                </li>
              ))}
            </ul>

            <p data-fade className="v2-serif text-[clamp(1.35rem,2.4vw,1.95rem)] font-light leading-[1.32] text-[#3a2f23] max-w-[36ch]">
              Une cohorte qui s’ouvre en janvier, un foyer qui se prépare et un programme
              d’automne à suivre à votre rythme.
            </p>

            <div data-fade className="mt-9 flex flex-wrap items-center gap-x-9 gap-y-4">
              <a
                href="#programmes"
                className="group inline-flex items-center gap-2.5 text-[0.72rem] uppercase tracking-[0.2em] text-[#1c1712] border-b border-[#1c1712] pb-1.5 pt-2.5 transition-colors duration-300 hover:text-[#7d6330] hover:border-[#9c7a44]"
              >
                Voir les programmes
                <ArrowDown size={15} weight="regular" className="transition-transform duration-300 group-hover:translate-y-0.5" />
              </a>
              <a href="#evenements" className="v2-serif italic text-lg text-[#1c1712]/70 hover:text-[#7d6330] transition-colors duration-300">
                Événements &amp; conférences
              </a>
            </div>
          </div>
        </div>

        <div
          data-fade
          className="flex items-end justify-between border-b border-[#1c1712]/15 pb-3.5 mt-[clamp(1.5rem,4vh,3rem)] text-[0.6rem] uppercase tracking-[0.28em] text-[#1c1712]/55"
        >
          <span className="flex items-center gap-2 v2-cue">
            <ArrowDown size={13} weight="regular" />
            Faire défiler
          </span>
          <span className="hidden sm:inline">Origine &middot; Foyer &middot; Vata</span>
        </div>
      </section>

      {/* ─────────── CHAPITRE 01 · PROGRAMMES SAISONNIERS ─────────── */}
      <section
        id="programmes"
        className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,15vh,11rem)] bg-[#f4efe6] scroll-mt-24"
      >
        <div data-reveal className="max-w-[760px] mb-14">
          <Kicker className="mb-5">Chapitre 01 · Au rythme des saisons</Kicker>
          <h2 className="v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2.2rem,5vw,4rem)]">
            Les programmes de la saison
          </h2>
          <p className="mt-6 v2-serif italic text-[clamp(1.1rem,2vw,1.5rem)] text-[#3a2f23] max-w-[46ch] leading-snug">
            Trois portes cet automne. Choisissez la vôtre.
          </p>
        </div>

        {/* Vedette · Origine, pleine largeur */}
        <div data-reveal className="mb-8">
          <FeaturedOrigine p={featured} onOpen={openProgramme} />
        </div>

        {/* Le Foyer et Vata · colorés + stagger */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}
          className="grid gap-6 md:grid-cols-2"
        >
          {seasonal.map((p) => (
            <SeasonCard key={p.key} p={p} onOpen={openProgramme} />
          ))}
        </motion.div>
      </section>

      {/* ─────────── ÉVÉNEMENTS & CONFÉRENCES (back-end préservé) ─────────── */}
      {events.length > 0 && (
        <section
          id="evenements"
          className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,15vh,11rem)] bg-[#efe6d7] scroll-mt-24"
        >
          <div data-reveal className="max-w-[1040px] mx-auto text-center mb-16">
            <Kicker className="mb-5">Où on se rejoint · Live</Kicker>
            <h2 className="v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2.2rem,5vw,3.8rem)]">
              Événements &amp; Conférences
            </h2>
            <p className="mt-6 v2-serif italic text-[clamp(1.1rem,2vw,1.45rem)] text-[#3a2f23] max-w-[44ch] mx-auto leading-snug">
              Rencontres en direct, retraites, lancements, plus une tournée en préparation.
            </p>
          </div>
          <LiveEventsSection events={events} columns={2} />
        </section>
      )}

      {/* ─────────── INFOLETTRE (back-end préservé) ─────────── */}
      <section className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,15vh,11rem)] bg-[#f4efe6]">
        <div data-reveal className="max-w-[720px] mx-auto text-center">
          <Kicker className="mb-5">Rester dans le fil</Kicker>
          <h2 className="v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2.2rem,5vw,3.8rem)]">
            L’Ayurveda, au fil des saisons
          </h2>
          <p className="mt-6 v2-serif italic text-[clamp(1.1rem,2vw,1.45rem)] text-[#3a2f23] max-w-[46ch] mx-auto leading-snug">
            Ouvertures de cohortes, retraites, lancements : recevez le fil avant tout le monde.
          </p>
          <div className="mt-10">
            <NewsletterSignup
              source="formations"
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
            « L’équilibre n’est pas une recette unique. Il se cultive, saison après saison. »
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-9 gap-y-4">
            <a
              href="#programmes"
              className="group inline-flex items-center gap-2.5 text-[0.72rem] uppercase tracking-[0.2em] text-[#34241a] bg-[#f4efe6] px-8 py-3.5 transition-colors duration-300 hover:bg-[#9c7a44]"
            >
              Voir les programmes
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
