// L'Œuvre motion kit — paste-once, reuse-everywhere primitives that give
// every page the same cinematic, fluid feel:
//   · Seam      — seamless gradient join between two section colors (kills hard contrast edges)
//   · Reveal    — fade-up on scroll for inner elements
//   · Parallax  — gentle scroll-driven depth
//   · KenBurns  — slow continuous zoom for full-bleed hero photos
//   · HeroVideo — full-bleed ambient video hero (no black overlay, bottom gradient)
//
// Motion convention (Motionsites Maison): entrances 0.8-1.4s,
// ease cubic-bezier(0.22,1,0.36,1), no bounce, prefers-reduced-motion respected.

import React, { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';

const EASE = [0.22, 1, 0.36, 1] as const;

/* ── Seam ─────────────────────────────────────────────────────────────
   Drop at the TOP of a section (parent must be `relative`). Blends the
   previous section's end color down into this one so the join is invisible.
   `from` = the color of the section ABOVE (hex). */
export const Seam: React.FC<{ from: string; height?: number }> = ({ from, height = 110 }) => (
  <div
    aria-hidden
    className="pointer-events-none absolute inset-x-0 top-0 z-0"
    style={{ height, background: `linear-gradient(180deg, ${from} 0%, transparent 100%)` }}
  />
);

/* ── Reveal ───────────────────────────────────────────────────────────
   Fade-up an inner element as it enters the viewport. Plays once. */
export const Reveal: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}> = ({ children, className, delay = 0, y = 36 }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.95, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
};

/* ── Parallax ─────────────────────────────────────────────────────────
   Translates its child on the Y axis as the section scrolls through the
   viewport. `speed` is the fraction of travel (0.15 = subtle, 0.4 = strong).
   Negative speed moves the other way. */
export const Parallax: React.FC<{
  children: React.ReactNode;
  className?: string;
  speed?: number;
}> = ({ children, className, speed = 0.18 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [`${speed * -50}%`, `${speed * 50}%`]);
  return (
    <div ref={ref} className={className}>
      <motion.div style={reduce ? undefined : { y }}>{children}</motion.div>
    </div>
  );
};

/* ── KenBurns ─────────────────────────────────────────────────────────
   Full-bleed image with a slow continuous zoom. Sits behind hero content.
   Add a bottom gradient separately for legibility. */
export const KenBurns: React.FC<{ src: string; className?: string; alt?: string }> = ({
  src,
  className = '',
  alt = '',
}) => {
  const reduce = useReducedMotion();
  return (
    <motion.img
      src={src}
      alt={alt}
      aria-hidden={alt === ''}
      className={`absolute inset-0 h-full w-full object-cover ${className}`}
      initial={reduce ? false : { scale: 1.06 }}
      animate={reduce ? undefined : { scale: 1.16 }}
      transition={{ duration: 22, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse' }}
    />
  );
};

/* ── HeroVideo ────────────────────────────────────────────────────────
   Full-bleed ambient video hero. No black overlay (Motionsites rule),
   only a bottom gradient for text legibility. */
export const HeroVideo: React.FC<{
  src: string;
  poster?: string;
  fade?: string; // bottom gradient end color (the section bg below)
}> = ({ src, poster, fade = '#16100a' }) => (
  <>
    <video
      className="absolute inset-0 h-full w-full object-cover"
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
    />
    <span
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{ background: `linear-gradient(to top, ${fade} 3%, rgba(22,16,10,0.45) 32%, transparent 62%)` }}
    />
  </>
);

export default { Seam, Reveal, Parallax, KenBurns, HeroVideo };
