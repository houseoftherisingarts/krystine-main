// RevealSection — a thin framer-motion wrapper that fades a section up
// as it crosses 25% of the viewport. Used to retrofit the home page's
// `home-section` blocks with scroll-driven reveals (P1 micro-narrative).
// Plays once per section per page-load.
//
// Intentionally a passthrough on className/style so existing markup
// (rounded backgrounds, paddings, borders) keeps working — the wrapper
// only adds the reveal behaviour.

import React from 'react';
import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';

type Props = HTMLMotionProps<'section'> & {
  /** Optional delay multiplier — 0 by default. Use 0.05–0.15 to chain
   *  consecutive sections so they don't all snap in identically. */
  delay?: number;
};

const RevealSection: React.FC<Props> = ({ children, className, delay = 0, ...rest }) => {
  const reduce = useReducedMotion();
  return (
    <motion.section
      className={className}
      initial={reduce ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 80, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 1.05, delay, ease: [0.2, 0.8, 0.2, 1] }}
      {...rest}
    >
      {children}
    </motion.section>
  );
};

export default RevealSection;
