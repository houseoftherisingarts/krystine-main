import React, { useEffect, useRef, useState } from 'react';
import {
  motion, animate, useInView, useReducedMotion, useScroll, useTransform,
} from 'framer-motion';
import {
  ArrowDown, ArrowRight, ArrowUpRight, Compass, EnvelopeSimple, Phone, Clock,
} from '@phosphor-icons/react';
import { useApp } from '../contexts/AppContext';
import { CONTENT } from '../content';
import { Atmosphere } from '../components/motion/loeuvre';

/**
 * Points de vente · Où nous trouver · V2 « magazine crème ».
 * UNE de magazine (kicker, titre Fraunces géant, stats en gros chiffres qui
 * comptent), répertoire de revue groupé par région avec rail vertical qui se
 * dessine au scroll, encart photo encadré filet laiton en parallax doux,
 * back-cover #34241a avec Atmosphere. Back-end préservé : la liste vient à
 * 100 % de CONTENT[lang].locations (noms, adresses, téléphones, horaires).
 * Motion : transform/opacity uniquement, prefers-reduced-motion respecté.
 */

const EASE = [0.22, 1, 0.36, 1] as const;
const BOUTIQUE = 'https://www.inspiratanature.com';
const CONTACT = 'krystine@inspiratanature.com';

interface Spot { name: string; address: string; tel: string; hours: string }
interface Region { name: string; spots: Spot[] }

/* ════════════════════════ Primitives V2 ════════════════════════ */

const Kicker: React.FC<{ children: React.ReactNode; className?: string; on?: 'dark' | 'light' }> = ({
  children, className = '', on = 'light',
}) => (
  <p className={`text-[0.7rem] uppercase tracking-[0.34em] ${on === 'dark' ? 'text-[#c8a86a]' : 'text-[#7d6330]'} ${className}`}>
    {children}
  </p>
);

/* Filet laiton qui se trace (scaleX, origine gauche) */
const DrawRule: React.FC<{ className?: string; delay?: number }> = ({ className = '', delay = 0.1 }) => {
  const reduce = useReducedMotion();
  return (
    <motion.span
      aria-hidden
      className={`block h-px bg-[#9c7a44] ${className}`}
      style={{ transformOrigin: 'left center' }}
      initial={reduce ? false : { scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, amount: 0.7 }}
      transition={{ duration: 1.2, ease: EASE, delay }}
    />
  );
};

const Reveal: React.FC<{ children: React.ReactNode; className?: string; delay?: number; y?: number }> = ({
  children, className, delay = 0, y = 30,
}) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 1 } : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.95, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
};

/* Gros chiffre Fraunces qui compte à l'entrée */
const CountUp: React.FC<{ value: number; className?: string }> = ({ value, className = '' }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [display, setDisplay] = useState(reduce ? value : 0);
  useEffect(() => {
    if (!inView) return;
    if (reduce) { setDisplay(value); return; }
    const controls = animate(0, value, {
      duration: 1.7, ease: EASE,
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, reduce, value]);
  return <span ref={ref} className={className}>{display}</span>;
};

/* Encart photo encadré filet laiton, parallax doux ±5 % (image sur-échellée) */
const FramedValley: React.FC<{ caption: string; tab: string }> = ({ caption, tab }) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-5%', '5%']);
  return (
    <div className="relative w-full">
      <span className="pointer-events-none absolute -inset-2 border border-[#9c7a44]/35" aria-hidden />
      <div ref={ref} className="relative w-full aspect-[5/6] overflow-hidden">
        <motion.img
          src="/footer-jacques-cartier.jpg"
          alt="Vallée de la Jacques-Cartier, Québec"
          className="absolute inset-0 h-full w-full object-cover object-center scale-[1.12] will-change-transform"
          style={reduce ? undefined : { y }}
        />
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(28,23,18,0.55), transparent)' }}
        />
        <p className="absolute bottom-4 left-4 right-4 v2-serif italic text-[#f4efe6] text-sm tracking-wide">
          {caption}
        </p>
      </div>
      <span className="absolute -top-2 -left-2 bg-[#1c1712] text-[#f4efe6] px-3 py-1.5 text-[0.58rem] uppercase tracking-[0.24em]">
        {tab}
      </span>
    </div>
  );
};

/* Rail vertical laiton qui se dessine le long du répertoire */
const DirectoryRail: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.8', 'end 0.55'] });
  return (
    <div ref={ref} className="relative md:pl-12">
      <motion.span
        aria-hidden
        className="hidden md:block absolute left-0 top-1 bottom-1 w-px bg-gradient-to-b from-[#9c7a44]/0 via-[#9c7a44]/60 to-[#9c7a44]/0"
        style={reduce ? undefined : { scaleY: scrollYProgress, transformOrigin: 'top center' }}
      />
      {children}
    </div>
  );
};

/* ════════════════════════ Rangée boutique · répertoire de revue ════════════════════════ */

const SpotRow: React.FC<{ spot: Spot; index: number; isFr: boolean; delay: number }> = ({
  spot, index, isFr, delay,
}) => {
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${spot.name} ${spot.address.replace(/\n/g, ', ')}`,
  )}`;
  return (
    <Reveal delay={delay}>
      <article className="group grid md:grid-cols-[4.5rem_1.25fr_0.9fr_auto] gap-x-8 gap-y-4 items-start py-8 md:py-9 border-t border-[#1c1712]/12">
        {/* Numéro fantôme */}
        <span
          aria-hidden
          className="v2-serif font-light leading-none tabular-nums text-[clamp(2rem,3.4vw,2.9rem)] text-[#1c1712]/[0.16] transition-colors duration-500 group-hover:text-[#9c7a44]/45"
        >
          {String(index + 1).padStart(2, '0')}
        </span>

        {/* Nom + adresse */}
        <div>
          <h4 className="v2-serif font-light leading-[1.08] text-[#1c1712] text-[clamp(1.5rem,2.4vw,2.1rem)] transition-colors duration-500 group-hover:text-[#7d6330]">
            {spot.name}
          </h4>
          <p className="mt-3 text-[0.9rem] leading-[1.7] text-[#3a2f23] whitespace-pre-line">
            {spot.address}
          </p>
        </div>

        {/* Horaire + téléphone */}
        <div className="text-[0.85rem] leading-[1.7] text-[#3a2f23]">
          <p className="flex items-start gap-2.5">
            <Clock size={15} weight="light" className="mt-1 shrink-0 text-[#7d6330]" />
            <span className="whitespace-pre-line">{spot.hours}</span>
          </p>
          <a
            href={`tel:${spot.tel.replace(/[^+\d]/g, '')}`}
            className="mt-3 inline-flex items-center gap-2.5 min-h-[44px] text-[#1c1712] hover:text-[#7d6330] transition-colors duration-300"
          >
            <Phone size={15} weight="light" className="shrink-0 text-[#7d6330]" />
            <span className="text-[0.9rem] tabular-nums">{spot.tel}</span>
          </a>
        </div>

        {/* Itinéraire */}
        <div className="md:justify-self-end md:pt-1">
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="group/cta inline-flex items-center gap-2.5 min-h-[44px] text-[0.7rem] uppercase tracking-[0.2em] text-[#1c1712] border-b border-[#1c1712] pb-1 transition-colors duration-300 hover:text-[#7d6330] hover:border-[#9c7a44]"
          >
            {isFr ? 'Itinéraire' : 'Directions'}
            <ArrowUpRight
              size={14}
              weight="regular"
              className="transition-transform duration-300 group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5"
            />
          </a>
        </div>
      </article>
    </Reveal>
  );
};

/* ════════════════════════ Page ════════════════════════ */

const LocationsLoeuvre: React.FC = () => {
  const { lang } = useApp();
  const t = CONTENT[lang].locations;
  const regions: Region[] = (t.regions as unknown as Region[]) ?? [];
  const total = regions.reduce((n, r) => n + r.spots.length, 0);
  const isFr = lang === 'FR';
  const reduce = useReducedMotion();

  /* Index de départ de chaque région (numérotation continue 01..06) */
  const startIndexes = regions.reduce<number[]>((acc, r, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + regions[i - 1].spots.length);
    return acc;
  }, []);

  const heroFade = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 1, ease: EASE, delay },
        };

  return (
    <div
      className="relative w-full bg-[#f4efe6] text-[#1c1712] antialiased overflow-x-hidden"
      style={{ fontFamily: '"Inter", system-ui, sans-serif' }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..600&family=Inter:wght@300;400;500&display=swap');
        .v2-serif { font-family: "Fraunces", Georgia, serif; }
        .v2-grain-pdv {
          position: absolute; inset: 0; z-index: 40; pointer-events: none;
          opacity: 0.045; mix-blend-mode: multiply;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }
        @keyframes v2cuePdv { 0%,100% { transform: translateY(0); opacity:.45 } 50% { transform: translateY(8px); opacity:1 } }
        .v2-cue-pdv { animation: v2cuePdv 2.4s cubic-bezier(0.22,1,0.36,1) infinite; }
        @media (prefers-reduced-motion: reduce) { .v2-cue-pdv { animation: none; } }
      `}</style>

      <div className="v2-grain-pdv" aria-hidden />

      {/* ─────────── HERO · UNE de magazine ─────────── */}
      <section className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] pt-[clamp(6.5rem,12vh,9rem)] pb-[clamp(2rem,5vh,4rem)] min-h-[92vh] flex flex-col">
        <motion.div
          {...heroFade(0.05)}
          className="flex items-center justify-between border-t border-[#1c1712]/15 pt-3.5 text-[0.6rem] uppercase tracking-[0.28em] text-[#1c1712]/55"
        >
          <span>N&deg; 05 &middot; {isFr ? 'Points de vente' : 'Sales points'}</span>
          <span className="hidden sm:inline">Québec &middot; MMXXVI</span>
        </motion.div>

        <div className="flex-1 grid items-stretch gap-x-[clamp(2rem,5vw,5rem)] gap-y-12 lg:grid-cols-[1.1fr_0.9fr] mt-[clamp(2rem,5vh,3.5rem)]">
          {/* Masthead + intro + stats */}
          <div className="flex flex-col">
            <motion.p
              {...heroFade(0.15)}
              className="inline-flex items-center gap-2.5 text-[0.7rem] uppercase tracking-[0.34em] text-[#7d6330] mb-7"
            >
              <Compass size={15} weight="light" /> {isFr ? 'Où nous trouver' : 'Where to find us'}
            </motion.p>

            <h1 className="v2-serif font-light leading-[0.92] text-[#1c1712] text-[clamp(3.2rem,9.5vw,8.5rem)]">
              <span className="block overflow-hidden">
                <motion.span
                  className="block"
                  initial={reduce ? false : { y: '115%' }}
                  animate={{ y: '0%' }}
                  transition={{ duration: 1.2, ease: EASE, delay: 0.2 }}
                >
                  {isFr ? 'Points' : 'Sales'}
                </motion.span>
              </span>
              <span className="block overflow-hidden">
                <motion.span
                  className="block italic"
                  initial={reduce ? false : { y: '115%' }}
                  animate={{ y: '0%' }}
                  transition={{ duration: 1.2, ease: EASE, delay: 0.32 }}
                >
                  {isFr ? 'de vente' : 'points'}
                </motion.span>
              </span>
            </h1>

            <motion.p
              {...heroFade(0.5)}
              className="mt-8 v2-serif italic text-[clamp(1.2rem,2.2vw,1.7rem)] leading-[1.35] text-[#3a2f23] max-w-[38ch]"
            >
              {t.intro}
            </motion.p>

            {/* Stats · gros chiffres Fraunces qui comptent */}
            <motion.div {...heroFade(0.65)} className="mt-auto pt-12 grid grid-cols-2 gap-x-[clamp(2rem,5vw,4.5rem)] max-w-[34rem]">
              <div>
                <DrawRule className="mb-5" delay={0.75} />
                <CountUp
                  value={total}
                  className="v2-serif font-light leading-none tabular-nums tracking-[0.04em] text-[#1c1712] text-[clamp(3.4rem,7vw,6rem)]"
                />
                <p className="mt-3 text-[0.65rem] uppercase tracking-[0.22em] text-[#1c1712]/60">
                  {isFr ? 'Boutiques partenaires' : 'Partner stores'}
                </p>
              </div>
              <div>
                <DrawRule className="mb-5" delay={0.9} />
                <CountUp
                  value={regions.length}
                  className="v2-serif font-light leading-none tabular-nums tracking-[0.04em] text-[#1c1712] text-[clamp(3.4rem,7vw,6rem)]"
                />
                <p className="mt-3 text-[0.65rem] uppercase tracking-[0.22em] text-[#1c1712]/60">
                  {isFr ? 'Régions du Québec' : 'Quebec regions'}
                </p>
              </div>
            </motion.div>
          </div>

          {/* Encart photo · vallée encadrée filet laiton */}
          <motion.div {...heroFade(0.45)} className="relative self-center w-full max-w-[480px] lg:justify-self-end">
            <FramedValley
              caption={isFr ? '« Là où la nature respire, Inspirata se trouve. »' : '"Where nature breathes, Inspirata is near."'}
              tab={isFr ? 'Québec · Nature' : 'Quebec · Nature'}
            />
          </motion.div>
        </div>

        <motion.div
          {...heroFade(0.85)}
          className="flex items-end justify-between border-b border-[#1c1712]/15 pb-3.5 mt-[clamp(2rem,5vh,3.5rem)] text-[0.6rem] uppercase tracking-[0.28em] text-[#1c1712]/55"
        >
          <span className="flex items-center gap-2 v2-cue-pdv">
            <ArrowDown size={13} weight="regular" />
            {isFr ? 'Faire défiler' : 'Scroll'}
          </span>
          <span className="hidden sm:inline">
            {regions.map((r) => r.name).join(' · ')}
          </span>
        </motion.div>
      </section>

      {/* ─────────── RÉPERTOIRE · par région ─────────── */}
      <section className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(5rem,12vh,9rem)]">
        <Reveal className="max-w-[760px] mb-16">
          <Kicker className="mb-5">{isFr ? 'Le répertoire' : 'The directory'}</Kicker>
          <h2 className="v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2.2rem,5vw,4rem)]">
            {t.title}
          </h2>
          <p className="mt-6 v2-serif italic text-[clamp(1.1rem,2vw,1.5rem)] text-[#3a2f23] max-w-[46ch] leading-snug">
            {isFr
              ? 'Retrouvez les livres et rituels Inspirata chez des partenaires choisis pour leurs valeurs.'
              : 'Find Inspirata books and rituals at partners chosen for their values.'}
          </p>
        </Reveal>

        <DirectoryRail>
          <div className="space-y-[clamp(3.5rem,8vh,6rem)]">
            {regions.map((region, ri) => (
              <div key={region.name}>
                {/* Kicker région + filet qui se trace */}
                <Reveal>
                  <div className="flex items-center gap-6 mb-2">
                    <h3 className="text-[0.7rem] uppercase tracking-[0.34em] text-[#7d6330] whitespace-nowrap">
                      {region.name}
                    </h3>
                    <DrawRule className="flex-1 opacity-40" delay={0.2} />
                    <span className="v2-serif italic text-[#3a2f23]/70 text-[0.95rem] tabular-nums whitespace-nowrap">
                      {region.spots.length}{' '}
                      {region.spots.length > 1
                        ? (isFr ? 'adresses' : 'addresses')
                        : (isFr ? 'adresse' : 'address')}
                    </span>
                  </div>
                </Reveal>

                {/* Rangées éditoriales en cascade */}
                <div>
                  {region.spots.map((spot, si) => (
                    <SpotRow
                      key={spot.name}
                      spot={spot}
                      index={startIndexes[ri] + si}
                      isFr={isFr}
                      delay={si * 0.1}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DirectoryRail>
      </section>

      {/* ─────────── BACK-COVER · boutique en ligne + invitation ─────────── */}
      <section className="relative w-full overflow-hidden bg-[#34241a] text-[#f4efe6]">
        {/* Arête nette : filet laiton pleine largeur */}
        <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-[#9c7a44]/70 z-10" />
        <Atmosphere strength={0.85} light="50% 10%" />

        <div className="relative z-10 px-[clamp(1.5rem,5vw,5.5rem)] pt-[clamp(5rem,12vh,9rem)] pb-[clamp(4rem,10vh,7rem)]">
          <div className="max-w-[900px] mx-auto text-center">
            <Reveal>
              <Kicker on="dark" className="mb-6">{isFr ? 'À distance' : 'From anywhere'}</Kicker>
              <h2 className="v2-serif font-light leading-[1.04] text-[clamp(2.2rem,5vw,3.8rem)]">
                {isFr ? 'Trop loin d’une boutique ?' : 'Too far from a store?'}
              </h2>
              <p className="mt-6 mx-auto max-w-[48ch] text-[1rem] leading-[1.8] text-[#f4efe6]/75">
                {isFr
                  ? 'Tous les livres et rituels Inspirata sont aussi disponibles en ligne, livrés directement chez vous.'
                  : 'Every Inspirata book and ritual is also available online, delivered straight to your door.'}
              </p>
              <a
                href={BOUTIQUE}
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-10 inline-flex items-center gap-2.5 bg-[#f4efe6] px-8 py-3.5 text-[0.72rem] uppercase tracking-[0.2em] text-[#34241a] transition-colors duration-300 hover:bg-[#9c7a44] min-h-[44px]"
              >
                {isFr ? 'Visiter la boutique en ligne' : 'Visit the online boutique'}
                <ArrowRight size={15} weight="regular" className="transition-transform duration-300 group-hover:translate-x-1" />
              </a>
            </Reveal>

            {/* Invitation aux boutiques */}
            <Reveal delay={0.15}>
              <div className="mt-[clamp(4rem,9vh,6.5rem)] pt-[clamp(3rem,7vh,5rem)] border-t border-[#f4efe6]/15">
                <p className="v2-serif italic font-light text-[clamp(1.5rem,3.2vw,2.5rem)] leading-[1.28] text-[#f4efe6]">
                  {isFr
                    ? '« Vous aimeriez offrir Inspirata dans votre boutique ? »'
                    : '"Would you like to carry Inspirata in your shop?"'}
                </p>
                <a
                  href={`mailto:${CONTACT}`}
                  className="group mt-8 inline-flex items-center gap-2.5 min-h-[44px] text-[0.72rem] uppercase tracking-[0.2em] text-[#f4efe6] border-b border-[#f4efe6]/60 pb-1.5 transition-colors duration-300 hover:text-[#c8a86a] hover:border-[#c8a86a]"
                >
                  <EnvelopeSimple size={16} weight="light" />
                  {isFr ? 'Écrivez-nous' : 'Write to us'}
                  <ArrowRight size={14} weight="regular" className="transition-transform duration-300 group-hover:translate-x-1" />
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

    </div>
  );
};

export default LocationsLoeuvre;
