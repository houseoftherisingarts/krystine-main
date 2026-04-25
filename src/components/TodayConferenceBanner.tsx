// TodayConferenceBanner — date-bound highlight band for the home page,
// announcing Krystine's Expo Manger Santé talk on 2026-04-25 at 16:30
// (Scène Vivre, Québec). Sits between the founder banner and the
// "Trois portes" section on /accueil so visitors landing today see the
// talk first.
//
// Lifecycle: the component self-hides ~90 minutes after the start time
// so the banner disappears without a code change once the talk is over.
// Remove the import + usage from InspiratHome once the conference cycle
// is past — there is intentionally no scheduling logic beyond today.
//
// UX/UI register matches the rest of /accueil — parchment surface,
// copper accents, sprigs, framer-motion spring entrance — but pushes
// the urgency cues (pulsing live dot, live countdown, gold-gradient CTA
// with shine sweep, letter-reveal title) so the band reads as "now,
// not later".

import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import Sprig from './Sprig';

const CONF_START_ISO = '2026-04-25T16:30:00-04:00';
const CONF_URL = 'https://expomangersante.com/2026/programmation/avec-krystine-st-laurent/';
const HIDE_AFTER_MIN = 90;

const TodayConferenceBanner: React.FC = () => {
  const { lang } = useApp();
  const reduce = useReducedMotion();

  // Tick every 30 s so the countdown chip stays current without
  // rerendering the rest of the page on each frame.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const target = new Date(CONF_START_ISO).getTime();
  const diffMs = target - now.getTime();
  // Hide once the talk is well past — keeps the page clean once the
  // live moment has passed without forcing a deploy to remove it.
  if (diffMs < -HIDE_AFTER_MIN * 60_000) return null;

  const isUpcoming = diffMs > 0;
  const isLive = !isUpcoming && diffMs >= -HIDE_AFTER_MIN * 60_000;

  const hours   = Math.floor(diffMs / 3_600_000);
  const minutes = Math.floor((diffMs % 3_600_000) / 60_000);

  const countdownLabel = (() => {
    if (isLive) return lang === 'FR' ? 'En direct · maintenant' : 'Live · now';
    if (hours >= 1) {
      return lang === 'FR'
        ? `Dans ${hours} h ${minutes.toString().padStart(2, '0')}`
        : `In ${hours}h ${minutes.toString().padStart(2, '0')}`;
    }
    return lang === 'FR' ? `Dans ${minutes} min` : `In ${minutes} min`;
  })();

  const titleFR = "Au-delà des tendances";
  const titleEN = 'Beyond trends';
  const titleWords = (lang === 'FR' ? titleFR : titleEN).split(' ');

  // Letter / word reveal — each word fades + lifts into place,
  // staggered 90 ms. Same vocabulary as the CompassOfYou hero, scaled
  // back so the band stays editorial rather than theatrical.
  const wordsContainer: Variants = {
    hidden: { opacity: 1 },
    show:   { opacity: 1, transition: { staggerChildren: reduce ? 0 : 0.09, delayChildren: 0.25 } },
  };
  const wordItem: Variants = {
    hidden: reduce ? { opacity: 1, y: 0, filter: 'blur(0px)' } : { opacity: 0, y: 14, filter: 'blur(6px)' },
    show:   { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease: [0.2, 0.8, 0.2, 1] } },
  };

  return (
    <motion.section
      initial={reduce ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 50, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ type: 'spring', stiffness: 110, damping: 18, mass: 0.9 }}
      aria-label={lang === 'FR' ? "Conférence aujourd'hui à 16 h 30" : "Today's conference at 4:30 pm"}
      className="relative w-full rounded-[28px] overflow-hidden mb-12"
      style={{
        background:
          'linear-gradient(135deg, rgba(244,231,221,0.92) 0%, rgba(232,208,190,0.85) 55%, rgba(215,168,88,0.18) 100%)',
        border: '1px solid rgba(215,168,88,0.55)',
        boxShadow:
          '0 18px 44px rgba(58,37,30,0.18), 0 0 0 1px rgba(184,83,47,0.10), inset 0 1px 0 rgba(255,255,255,0.55)',
      }}
    >
      {/* Animated gold halo · soft conic sweep behind the content,
          ultra-low opacity so the parchment register stays dominant. */}
      {!reduce && (
        <motion.div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(60% 90% at 8% 50%, rgba(215,168,88,0.22) 0%, rgba(215,168,88,0) 60%)',
          }}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 4.5, ease: 'easeInOut', repeat: Infinity }}
        />
      )}

      {/* Corner sprigs — laurel + dandelion to mirror the editorial
          rhythm of neighbouring sections without copying them exactly. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute top-4 left-4 md:top-6 md:left-6 w-9 h-13 md:w-11 md:h-16 z-[1]"
        initial={reduce ? { opacity: 0.7, rotate: 0, scale: 1 } : { opacity: 0, rotate: -16, scale: 0.85 }}
        whileInView={{ opacity: 0.7, rotate: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ type: 'spring', stiffness: 130, damping: 14, delay: 0.18 }}
      >
        <Sprig variant="laurel" fill="#B07A3C" />
      </motion.div>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-4 right-4 md:bottom-6 md:right-6 w-9 h-13 md:w-11 md:h-16 z-[1]"
        initial={reduce ? { opacity: 0.7, rotate: 0, scale: 1 } : { opacity: 0, rotate: 16, scale: 0.85 }}
        whileInView={{ opacity: 0.7, rotate: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ type: 'spring', stiffness: 130, damping: 14, delay: 0.28 }}
      >
        <Sprig variant="dandelion" flip fill="#B07A3C" />
      </motion.div>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 md:gap-12 items-center px-7 md:px-12 py-9 md:py-11">
        {/* LEFT — kicker, title, lede, time + place */}
        <div className="text-center md:text-left">
          {/* Kicker · pulse-ring live dot + uppercase tracking */}
          <span className="inline-flex items-center gap-2.5 mb-4">
            <span className="relative inline-flex w-2.5 h-2.5">
              {!reduce && (
                <span className="absolute inset-0 rounded-full bg-[#B8532F] opacity-60 animate-ping" />
              )}
              <span className="relative w-2.5 h-2.5 rounded-full bg-[#B8532F]" />
            </span>
            <span
              className="text-[11px] md:text-xs uppercase tracking-[0.4em] font-bold"
              style={{
                backgroundImage: 'linear-gradient(95deg, #B07A3C 0%, #D7A858 35%, #8C5A28 75%, #B07A3C 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              {lang === 'FR' ? "Aujourd'hui · samedi 25 avril · 16 h 30" : "Today · Saturday April 25 · 4:30 pm"}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#B8532F]/10 border border-[#B8532F]/30 text-[10px] uppercase tracking-[0.25em] font-bold text-[#B8532F]">
              <i className="fa-regular fa-clock text-[9px]" />
              {countdownLabel}
            </span>
          </span>

          {/* Title — word-by-word reveal + a small "Conférence" eyebrow
              under it so the title can stay short and impactful. */}
          <motion.h2
            variants={wordsContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            className="font-serif text-[#3A251E] leading-[1.06] mb-3"
            style={{
              fontSize: 'clamp(1.9rem, 4.2vw, 3.2rem)',
              letterSpacing: '0.005em',
            }}
          >
            <span className="block text-[#B8532F] uppercase tracking-[0.32em] font-bold mb-2"
              style={{ fontSize: 'clamp(0.7rem, 1vw, 0.85rem)' }}>
              {lang === 'FR' ? 'Conférence' : 'Talk'}
            </span>
            {titleWords.map((w, i) => (
              <motion.span
                key={i}
                variants={wordItem}
                className="inline-block mr-2"
                style={{ willChange: 'transform, opacity, filter' }}
              >
                {w}
              </motion.span>
            ))}
            <span className="block font-serif italic text-[#6B402F] mt-1"
              style={{ fontSize: 'clamp(1.1rem, 2.1vw, 1.6rem)' }}>
              {lang === 'FR' ? "l'équilibre n'est pas one-size." : "balance isn't one-size."}
            </span>
          </motion.h2>

          <p className="font-serif italic text-[#3A251E]/80 text-base md:text-lg leading-relaxed max-w-2xl mx-auto md:mx-0 mb-4">
            {lang === 'FR'
              ? "Krystine prend la scène Vivre cet après-midi pour défaire les tendances et remettre l'équilibre en mots simples — vagues, saisons, signature personnelle."
              : 'Krystine takes the Vivre stage this afternoon to unwind the trends and put balance back into plain words — waves, seasons, personal signature.'}
          </p>

          <div className="flex items-center gap-2 justify-center md:justify-start text-[12px] md:text-sm text-[#6B402F]">
            <i className="fa-solid fa-map-marker-alt text-[#B8532F] text-[11px]" />
            <span className="font-serif">
              {lang === 'FR'
                ? 'Scène Vivre · Expo Manger Santé · Québec'
                : 'Scène Vivre · Expo Manger Santé · Québec City'}
            </span>
          </div>
        </div>

        {/* RIGHT — CTA card (gold gradient + shine sweep). Calls out the
            single action: "voir la programmation". External link opens
            in a new tab so visitors don't lose the home page. */}
        <div className="flex flex-col items-center md:items-end gap-3 md:gap-4">
          <a
            href={CONF_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex items-center justify-center gap-3 px-8 md:px-10 py-4 md:py-5 rounded-full overflow-hidden text-[12px] md:text-[13px] uppercase font-semibold tracking-[0.28em] transition-[transform,box-shadow] duration-300 hover:scale-[1.025] active:scale-[0.985] hover:shadow-[0_18px_38px_rgba(184,83,47,0.45)]"
            style={{
              backgroundImage: 'linear-gradient(95deg, #6B402F 0%, #B8532F 45%, #D7A858 100%)',
              color: '#F4E7DD',
              border: '1px solid rgba(215,168,88,0.65)',
              boxShadow:
                '0 14px 30px rgba(58,37,30,0.32), inset 0 1px 0 rgba(255,255,255,0.18)',
            }}
            aria-label={lang === 'FR' ? 'Voir la programmation de la conférence' : 'View the conference programme'}
          >
            {/* Shine sweep — copper-tinted diagonal that glides across
                the button on hover. Pure CSS, no JS. */}
            <span
              aria-hidden
              className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[1100ms] ease-out pointer-events-none"
              style={{
                background:
                  'linear-gradient(115deg, transparent 40%, rgba(244,231,221,0.32) 50%, transparent 60%)',
              }}
            />
            <span>{lang === 'FR' ? 'Voir la programmation' : 'View the programme'}</span>
            <i className="fa-solid fa-arrow-up-right-from-square text-[10px] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
          <p className="mt-4 md:mt-6 text-[10px] md:text-[11px] uppercase tracking-[0.3em] text-[#6B402F]/80 font-bold">
            {lang === 'FR' ? "Aussi demain · dimanche 26 avril · 13 h 15" : 'Also tomorrow · Sunday April 26 · 1:15 pm'}
          </p>
        </div>
      </div>
    </motion.section>
  );
};

export default TodayConferenceBanner;
