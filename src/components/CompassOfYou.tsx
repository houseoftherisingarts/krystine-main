// CompassOfYou — the home-page hero. Editorial magazine composition
// with an asymmetric 5/7 grid: dominant serif name-mark on the left,
// the brand's "Couples de Qualités" wheel on the right, slowly rotating.
// The wheel's cream centre IS the call-to-action: clicking anywhere on
// the wheel routes to /guide, and the static centre text reads
// "Laissez-vous guider →".
//
// Motion upgrade (April 2026): each letter of "Krystine" blurs in on
// mount, "St-Laurent" draws a copper underline left-to-right, and the
// whole wheel gets a slow breathing loop + a scroll-bound tilt so the
// composition stays alive as the visitor descends past the hero.

import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useMotionValue, useReducedMotion, type Variants } from 'framer-motion';
import { useApp } from '../contexts/AppContext';

const CompassOfYou: React.FC = () => {
  const { lang } = useApp();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  const kicker = lang === 'FR' ? 'Retrouvez votre boussole intérieure' : 'Reclaim your inner compass';
  // Two-line poem — the break after the first sentence lets each line
  // breathe and lands the second sentence as a separate beat.
  const poem1Lines = lang === 'FR'
    ? ['Le corps sait.', 'Il manquait la carte pour le lire.']
    : ['The body knows.', 'What was missing was the map to read it.'];
  const poem2 = lang === 'FR'
    ? 'Au-delà des tendances — reprendre SA direction.'
    : 'Beyond trends — reclaim YOUR direction.';
  const ctaSub = lang === 'FR' ? '5 questions · environ 2 minutes' : '5 questions · about 2 minutes';
  const ctaKicker = lang === 'FR' ? 'Par où commencer ?' : 'Where to start?';
  const ctaCenter1 = lang === 'FR' ? 'Laissez-vous' : 'Let yourself';
  const ctaCenter2 = lang === 'FR' ? 'guider' : 'be guided';

  // Scroll coupling for the wheel: as you leave the hero, the wheel
  // gently tilts back into the page (rotateX up, scale down, opacity
  // holds) — creates a sense of the camera pulling away rather than the
  // content simply scrolling off. Gated to ≥lg so low-end mobile is
  // spared the transform cost.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const wheelRotateX = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, 22]);
  const wheelScale   = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [1, 0.92]);

  // rAF-driven rotation so the hover speed-up interpolates smoothly
  // instead of jumping the CSS-animation timeline. Hover state lives
  // in a ref so mouseenter/leave don't trigger re-renders. Speed
  // lerps toward the hover target at ~6 Hz so the acceleration is
  // *felt* within ~300 ms rather than gliding over a full second.
  //
  // Rates chosen so the change is visible to the eye: at rest the
  // wheel turns at 6 deg/s (full turn ≈ 60 s); on hover it ramps to
  // 3× (18 deg/s, full turn ≈ 20 s) — a clearly different rhythm
  // without crossing into motion-sickness territory.
  const rotation = useMotionValue(0);
  const hoverRef = useRef(false);
  useEffect(() => {
    if (reduce) return;
    const base = 6; // deg/second → full turn ≈ 60 s at speed=1
    let raf = 0;
    let last = performance.now();
    let speed = 1;
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const target = hoverRef.current ? 3 : 1;
      // Tighter lerp (rate 6) so the acceleration is perceptible
      // within ~300 ms of hover/leave.
      speed += (target - speed) * Math.min(1, dt * 6);
      rotation.set(rotation.get() + base * speed * dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce, rotation]);

  const container: Variants = {
    hidden: { opacity: 1 },
    show:   { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: 14 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.2, 0.8, 0.2, 1] as const } },
  };
  // Letter-by-letter reveal — each glyph blurs and lifts into place.
  const letter: Variants = {
    hidden: reduce
      ? { opacity: 1, y: 0, filter: 'blur(0px)' }
      : { opacity: 0, y: 24, filter: 'blur(10px)' },
    show:   {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration: 0.85, ease: [0.2, 0.8, 0.2, 1] as const },
    },
  };
  const lettersWrap: Variants = {
    hidden: { opacity: 1 },
    show:   { opacity: 1, transition: { staggerChildren: reduce ? 0 : 0.06, delayChildren: 0.2 } },
  };

  return (
    <section ref={sectionRef} className="relative w-full flex items-center py-2 md:py-4">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative w-full max-w-[1400px] mx-auto px-6 md:px-10 grid md:grid-cols-[5fr_6fr] gap-8 md:gap-10 items-center"
      >
        {/* LEFT — typographic hero */}
        <div className="text-center md:text-left flex flex-col items-center md:items-start">
          <motion.p
            variants={item}
            className="text-[12px] md:text-[14px] uppercase tracking-[0.42em] font-bold text-[#6B402F] mb-6 md:mb-8"
            style={{ textShadow: '0 0 12px rgba(255,255,255,0.85), 0 0 28px rgba(255,255,255,0.55), 0 0 50px rgba(255,255,255,0.3)' }}
          >
            · {kicker} ·
          </motion.p>

          <motion.h1
            variants={item}
            className="font-serif uppercase text-[#2F2A22] dark:text-[#F4E7DD] leading-[0.92]"
            style={{
              letterSpacing: '0.02em',
              // Wide white halo behind the title — pure radial glow
              // (no offset shadows) so the type sits in a soft cloud of
              // light. Several layers at increasing blur so the halo
              // tapers naturally. Boosts readability on both /accueil
              // and /slidebg without committing to a hard drop shadow.
              textShadow:
                '0 0 18px rgba(255,255,255,0.9), 0 0 36px rgba(255,255,255,0.7), 0 0 64px rgba(255,255,255,0.45), 0 0 110px rgba(255,255,255,0.25)',
            }}
          >
            {/* "Krystine" — letter-reveal. Wraps each glyph in an
                inline-block <span> so the blur/transform doesn't collapse
                the baseline. aria-label preserves screen-reader reading. */}
            <motion.span
              variants={lettersWrap}
              initial="hidden"
              animate="show"
              aria-label="Krystine"
              className="block whitespace-nowrap"
              style={{ fontSize: 'clamp(2.6rem, 7vw, 6.8rem)' }}
            >
              {Array.from('Krystine').map((ch, i) => (
                <motion.span
                  key={i}
                  variants={letter}
                  aria-hidden
                  className="inline-block"
                  style={{ willChange: 'transform, opacity, filter' }}
                >
                  {ch}
                </motion.span>
              ))}
            </motion.span>

            {/* "St-Laurent" + copper underline draw. */}
            <span
              className="relative inline-block mt-1 md:mt-2"
              style={{ fontSize: 'clamp(1.6rem, 4.3vw, 4.1rem)', letterSpacing: '0.08em', fontWeight: 300 }}
            >
              <motion.span
                variants={item}
                className="block whitespace-nowrap text-[#6B402F]/85"
              >
                St-Laurent
              </motion.span>
              {/* Underline — scaleX 0→1 left-origin, draws after the name
                  arrives. Copper gradient fades on the right edge so it
                  reads as hand-inked, not a hard rule. */}
              <motion.span
                aria-hidden
                initial={reduce ? { scaleX: 1 } : { scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1], delay: reduce ? 0 : 1.1 }}
                className="absolute left-0 -bottom-1 md:-bottom-2 h-[2px] w-full origin-left"
                style={{
                  background:
                    'linear-gradient(to right, rgba(184,83,47,0.9) 0%, rgba(176,122,60,0.7) 60%, rgba(184,83,47,0) 100%)',
                  transformOrigin: 'left center',
                }}
              />
            </span>
          </motion.h1>

          {/* Ivoire card behind both poem lines — a soft parchment
              ground that lifts the italic copy off the liquid background
              so the two lines read as a single editorial quote. */}
          <motion.div
            variants={item}
            className="mt-6 md:mt-7 max-w-xl w-full rounded-[22px] px-6 md:px-8 py-6 md:py-7 backdrop-blur-[2px]"
            style={{
              background: 'rgba(244,231,221,0.78)',
              border: '1px solid rgba(184,83,47,0.25)',
              boxShadow: '0 14px 36px rgba(58,37,30,0.12), 0 2px 8px rgba(107,74,47,0.08)',
            }}
          >
            <p className="font-serif italic text-[#3A251E]/90 text-xl md:text-2xl lg:text-3xl leading-snug">
              {poem1Lines[0]}<br />{poem1Lines[1]}
            </p>
            <p className="mt-4 font-serif italic text-[#3A251E]/85 text-lg md:text-xl lg:text-2xl leading-[1.6]">
              {poem2}
            </p>
          </motion.div>
        </div>

        {/* RIGHT — rotating Origine wheel, breathing + scroll-tilted */}
        <motion.div
          variants={item}
          className="relative flex flex-col items-center"
          style={{
            perspective: 1400,
          }}
        >
          <motion.div
            style={{
              rotateX: wheelRotateX,
              scale: wheelScale,
              transformStyle: 'preserve-3d',
              willChange: 'transform',
            }}
          >
            <button
              type="button"
              onClick={() => navigate('/guide')}
              onMouseEnter={() => { hoverRef.current = true; }}
              onMouseLeave={() => { hoverRef.current = false; }}
              onFocus={() => { hoverRef.current = true; }}
              onBlur={() => { hoverRef.current = false; }}
              aria-label={lang === 'FR' ? 'Laissez-vous guider' : 'Let yourself be guided'}
              className="relative group block focus:outline-none cursor-pointer wheel-breathe"
              style={{ width: 'min(72vmin, 580px)', maxWidth: '100%' }}
            >
              {/* Wheel — rotation is driven by a rAF loop (see above) so
                  speed changes interpolate smoothly instead of resetting
                  the CSS animation timeline on hover. */}
              <motion.img
                src="/wheel-no-text.png"
                alt=""
                draggable={false}
                style={{ rotate: rotation, transformOrigin: '50% 50%', willChange: 'transform' }}
                className="block w-full h-auto select-none transition-[filter] duration-700 group-hover:[filter:drop-shadow(0_0_50px_rgba(184,83,47,0.55))]"
              />

              {/* Centre CTA — two-line kicker keeps the long "Par où
                  commencer ?" safely inside the 30% disc at every
                  viewport size. Italic serif below is the invitation. */}
              <span
                className="
                  absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                  flex flex-col items-center justify-center text-center
                  rounded-full bg-[#6B402F] text-[#F4E7DD]
                  border-[3px] border-[#F4E7DD]
                  shadow-[0_10px_28px_rgba(58,37,30,0.40),0_3px_10px_rgba(58,37,30,0.20),inset_0_0_0_1px_rgba(184,83,47,0.5)]
                  transition-all duration-500
                  group-hover:bg-[#3A251E]
                  group-hover:scale-[1.04]
                  group-hover:shadow-[0_18px_44px_rgba(58,37,30,0.55),0_5px_14px_rgba(58,37,30,0.30),inset_0_0_0_1px_rgba(184,83,47,0.7)]
                "
                style={{ width: '30%', aspectRatio: '1 / 1', pointerEvents: 'none', padding: '6% 8%' }}
              >
                <span
                  className="flex flex-col items-center gap-0.5 text-[#F4D49A] uppercase tracking-[0.28em] font-bold leading-tight"
                  style={{ fontSize: 'clamp(6px, 0.7vw, 9px)' }}
                >
                  <span className="whitespace-nowrap">· Par où ·</span>
                  <span className="whitespace-nowrap">{lang === 'FR' ? 'commencer ?' : 'to start?'}</span>
                </span>
                <span
                  className="font-serif italic mt-2 leading-[1.05] text-[#F4E7DD] flex flex-col items-center"
                  style={{ fontSize: 'clamp(0.8rem, 1.4vw, 1.25rem)' }}
                >
                  <span className="block whitespace-nowrap">{ctaCenter1}</span>
                  <span className="block whitespace-nowrap">{ctaCenter2}</span>
                </span>
                <span
                  className="mt-1.5 inline-flex items-center gap-2 text-[#F4D49A]"
                  style={{ fontSize: 'clamp(7px, 0.8vw, 10px)' }}
                >
                  <i className="fa-solid fa-arrow-right transition-transform duration-500 group-hover:translate-x-1" />
                </span>
              </span>
            </button>
          </motion.div>

          <p className="mt-3 md:mt-4 font-serif italic text-[#3A251E]/70 dark:text-white/70 text-sm md:text-base">
            {ctaSub}
          </p>
        </motion.div>
      </motion.div>

      <style>{`
        /* Breathing loop — a whisper of scale so the composition looks
           alive without looking restless. Rotation is now JS-driven
           via a rAF loop in the component so the hover speed-up can
           interpolate smoothly. */
        @keyframes wheel-breathe {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.014); }
        }
        .wheel-breathe { animation: wheel-breathe 7s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .wheel-breathe { animation: none; }
        }
      `}</style>
    </section>
  );
};

export default CompassOfYou;
