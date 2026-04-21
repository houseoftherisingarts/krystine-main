import React, { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ASSETS } from '../content';

interface Props {
  /** Called once the drop + splash + logo reveal sequence is visually complete. */
  onComplete?: () => void;
}

// Timing knobs — adjust here to retune the intro.
const FALL_MS = 1300;      // bead falls
const SPLASH_MS = 550;     // bead flattens + logo appears
const LOGO_HOLD_MS = 550;  // logo visible
const LOGO_OUT_MS = 500;   // logo fades
const TOTAL_MS = FALL_MS + SPLASH_MS + LOGO_HOLD_MS + LOGO_OUT_MS;

const DropIntro: React.FC<Props> = ({ onComplete }) => {
  const reduce = useReducedMotion();

  useEffect(() => {
    // Short-circuit for users who prefer reduced motion.
    const t = setTimeout(() => onComplete?.(), reduce ? 100 : TOTAL_MS);
    return () => clearTimeout(t);
  }, [onComplete, reduce]);

  if (reduce) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#FEFBF4] dark:bg-[#050C1A]">
        <img src={ASSETS.logoInspirata} alt="Inspirata" className="w-16 drop-shadow-[0_0_30px_rgba(212,175,55,0.4)]" />
      </div>
    );
  }

  const splashDelay = FALL_MS / 1000; // seconds

  return (
    <motion.div
      // Overlay fades away so the main page can be seen underneath as it mounts.
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.65, delay: (FALL_MS + SPLASH_MS + LOGO_HOLD_MS) / 1000, ease: 'easeOut' }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#FEFBF4] dark:bg-[#050C1A] pointer-events-none"
    >
      {/* Falling bead — centered; lands at the vertical midpoint, then flattens. */}
      <motion.span
        initial={{ y: '-38vh', scaleX: 0.5, scaleY: 0.5, opacity: 1 }}
        animate={{ y: '0vh', scaleX: 1.6, scaleY: 0.03, opacity: 0 }}
        transition={{
          y:       { duration: FALL_MS / 1000, ease: [0.55, 0.06, 0.68, 0.19] },
          scaleX:  { delay: splashDelay, duration: SPLASH_MS / 1000, ease: [0.16, 0.84, 0.44, 1] },
          scaleY:  { delay: splashDelay, duration: SPLASH_MS / 1000, ease: [0.16, 0.84, 0.44, 1] },
          opacity: { delay: splashDelay, duration: SPLASH_MS / 1000, ease: 'easeOut' },
        }}
        className="absolute block w-2.5 h-2.5 rounded-full bg-gradient-to-br from-[#F4D679] to-[#8B6914] shadow-[0_0_14px_rgba(212,175,55,0.55)] origin-center"
      />

      {/* Drop logo — pops at the splash point, holds, then dissolves. */}
      <motion.img
        src={ASSETS.logoInspirata}
        alt="Inspirata"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 0.9, 0.9, 1.2] }}
        transition={{
          duration: (SPLASH_MS + LOGO_HOLD_MS + LOGO_OUT_MS) / 1000,
          delay: splashDelay,
          times: [0, SPLASH_MS / (SPLASH_MS + LOGO_HOLD_MS + LOGO_OUT_MS), (SPLASH_MS + LOGO_HOLD_MS) / (SPLASH_MS + LOGO_HOLD_MS + LOGO_OUT_MS), 1],
          ease: 'easeOut',
        }}
        className="absolute w-20 md:w-24 drop-shadow-[0_0_30px_rgba(212,175,55,0.5)]"
      />
    </motion.div>
  );
};

export default DropIntro;
