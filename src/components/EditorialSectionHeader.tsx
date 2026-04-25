// EditorialSectionHeader — the shared heading voice for every section on
// /accueil. Matches the moodboard's rhythm:
//
//     [left sprig]   · KICKER ·   [right sprig]
//                 Serif display title
//              ornamental divider line
//                  Optional lede
//
// On scroll-in: the kicker fades first, the title slides up, the sprigs
// grow from 0.92→1 in a staggered breath. A `whileInView` guard keeps
// the animation silent for users with prefers-reduced-motion.

import React from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import Sprig, { type SprigVariant } from './Sprig';
import OrigineDivider from './OrigineDivider';

interface Props {
  kicker?: string;
  title: React.ReactNode;
  /** Optional italic lede set under the title. */
  lede?: React.ReactNode;
  /** Left/right corner sprigs — pass two for the flanking pair. */
  sprigs?: [SprigVariant, SprigVariant];
  /** Ornament variant for the divider below the title. */
  divider?: 'laurel' | 'compass' | 'bloom' | 'none';
  /** Pulls title/kicker colour toward sauge/copper for warmer headings. */
  tone?: 'brun' | 'copper' | 'sauge';
  /** Centre vs left-aligned header. Centre is the default (moodboard). */
  align?: 'center' | 'left';
  /** Wrap the header content in a parchment container so kicker/title/lede
   *  stay legible on top of the photographic body background. Opt-in
   *  per section — defaults FALSE so existing callers (notably /accueil)
   *  keep their floating editorial rhythm. Turn on for pages aimed at
   *  readers who want opaque backdrops (e.g. /krystine + /conferenciere). */
  contained?: boolean;
  /** Extra class on outer wrapper. */
  className?: string;
}

const headerVariants: Variants = {
  hidden: { opacity: 1 },
  show:   { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};
const itemFade: Variants = {
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.2, 0.8, 0.2, 1] as const } },
};
const sprigIn: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 6 },
  show:   { opacity: 0.7, scale: 1, y: 0, transition: { duration: 1.1, ease: [0.2, 0.8, 0.2, 1] as const } },
};

const toneColour = (tone: Props['tone']) => {
  if (tone === 'copper') return { kicker: '#B8532F', title: '#3A251E' };
  if (tone === 'sauge')  return { kicker: '#7A8066', title: '#3A251E' };
  return { kicker: '#6B402F', title: '#3A251E' };
};

const EditorialSectionHeader: React.FC<Props> = ({
  kicker,
  title,
  lede,
  sprigs = ['eucalyptus', 'laurel'],
  divider = 'bloom',
  tone = 'brun',
  align = 'center',
  contained = false,
  className = '',
}) => {
  const reduce = useReducedMotion();
  const colours = toneColour(tone);
  const initial = reduce ? 'show' : 'hidden';

  // Parchment-card container so the kicker/title/lede read clean on the
  // photographic body bg. Older eyes (Krystine's audience) + small/italic
  // type want an opaque backdrop, not a halo-on-photo. Width auto-caps
  // so wide lede lines don't sprawl across the viewport.
  const containerStyle = contained ? {
    background: 'rgba(244, 231, 221, 0.86)',
    border: '1px solid rgba(184, 83, 47, 0.20)',
    boxShadow: '0 10px 26px rgba(107, 74, 47, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.55)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  } : undefined;
  const containerClass = contained
    ? 'rounded-[28px] px-6 md:px-10 py-8 md:py-10 max-w-3xl mx-auto'
    : '';

  return (
    <motion.header
      variants={headerVariants}
      initial={initial}
      whileInView="show"
      viewport={{ once: true, amount: 0.4 }}
      style={containerStyle}
      className={`${align === 'center' ? 'text-center mx-auto' : 'text-left'} relative ${containerClass} ${className}`}
    >
      {/* Flanking sprigs — only when centred, so the header reads like a
          moodboard chapter opener. On narrow viewports they ease off
          (hidden sm:inline-flex) so the title keeps room to breathe. */}
      {align === 'center' && (
        <div className="hidden sm:flex items-center justify-center gap-5 md:gap-8 mb-3 md:mb-4 pointer-events-none">
          <motion.div variants={sprigIn}>
            <Sprig
              variant={sprigs[0]}
              className="w-8 h-12 md:w-10 md:h-14"
              fill="#8A8F72"
            />
          </motion.div>

          {kicker && (
            <motion.span
              variants={itemFade}
              className="uppercase font-bold text-[10px] md:text-[11px] tracking-[0.42em] whitespace-nowrap"
              style={{
                color: colours.kicker,
                // Cream halo so small-caps kicker reads cleanly on the
                // photographic body bg without needing a card container.
                // Doubles as the AA-pass technique when contained=false.
                textShadow: contained
                  ? undefined
                  : '0 1px 0 rgba(244,231,221,0.92), 0 2px 6px rgba(244,231,221,0.7)',
              }}
            >
              · {kicker} ·
            </motion.span>
          )}

          <motion.div variants={sprigIn}>
            <Sprig
              variant={sprigs[1]}
              flip
              className="w-8 h-12 md:w-10 md:h-14"
              fill="#8A8F72"
            />
          </motion.div>
        </div>
      )}

      {/* Kicker on mobile / left-align mode — inline single line */}
      {((align !== 'center') && kicker) && (
        <motion.span
          variants={itemFade}
          className="block uppercase font-bold text-[10px] md:text-[11px] tracking-[0.4em] mb-3"
          style={{
            color: colours.kicker,
            textShadow: contained ? undefined : '0 1px 0 rgba(244,231,221,0.92), 0 2px 6px rgba(244,231,221,0.7)',
          }}
        >
          · {kicker} ·
        </motion.span>
      )}
      {align === 'center' && kicker && (
        <motion.span
          variants={itemFade}
          className="sm:hidden block uppercase font-bold text-[10px] tracking-[0.4em] mb-3"
          style={{
            color: colours.kicker,
            textShadow: contained ? undefined : '0 1px 0 rgba(244,231,221,0.92), 0 2px 6px rgba(244,231,221,0.7)',
          }}
        >
          · {kicker} ·
        </motion.span>
      )}

      <motion.h2
        variants={itemFade}
        className="font-serif text-3xl md:text-5xl lg:text-[3.4rem] leading-[1.08]"
        style={{
          color: colours.title,
          letterSpacing: '0.01em',
          // Layered cream halo lets the serif pop off the parchment
          // photo when the header isn't contained.
          textShadow: contained
            ? undefined
            : '0 1px 0 rgba(244,231,221,0.95), 0 2px 6px rgba(244,231,221,0.8), 0 6px 22px rgba(244,231,221,0.5)',
        }}
      >
        {title}
      </motion.h2>

      {divider !== 'none' && (
        <motion.div variants={itemFade} className="mx-auto">
          <OrigineDivider variant={divider} className="!my-5 md:!my-6" />
        </motion.div>
      )}

      {lede && (
        <motion.p
          variants={itemFade}
          className={`font-serif italic ${contained ? 'text-[#3A251E]/85' : 'text-[#2A1A12]'} dark:text-white/70 text-base md:text-lg leading-relaxed ${
            align === 'center' ? 'max-w-2xl mx-auto' : 'max-w-xl'
          }`}
          style={contained ? undefined : {
            textShadow: '0 1px 0 rgba(244,231,221,0.92), 0 2px 6px rgba(244,231,221,0.72)',
          }}
        >
          {lede}
        </motion.p>
      )}
    </motion.header>
  );
};

export default EditorialSectionHeader;
