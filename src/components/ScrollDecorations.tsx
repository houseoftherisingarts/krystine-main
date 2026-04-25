// ScrollDecorations — page-wide ambient layer (parallax botanical
// shadows). Fixed-position, blurred, multiply-blended so they read as
// shadows on parchment rather than illustrations competing with content.
//
// Layers (bottom → top visually):
//   1. Palm-frond shadow, top-left   — drifts down + tilts on scroll
//   2. Laurel at bottom-right        — drifts up
//   3. Eucalyptus at mid-right        — slow drift down + gentle sway
//   4. Wheat at bottom-left           — fades in after 30% scroll
//   5. Dried leaf, upper-right        — drifts sideways as you descend
//
// All vectors, all respect prefers-reduced-motion. No external assets.

import React from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import Sprig from './Sprig';

const ScrollDecorations: React.FC = () => {
  const { scrollYProgress } = useScroll();
  const reduce = useReducedMotion();

  const palmY      = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, 240]);
  const palmRotate = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, 9]);
  const palmOpacity= useTransform(scrollYProgress, [0, 0.08, 0.85, 1], reduce ? [0.32, 0.32, 0.32, 0.32] : [0.34, 0.3, 0.22, 0.16]);

  const laurelY     = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, -200]);

  const eucalyptusY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-20, 260]);
  const eucalyptusR = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-2, 6]);
  const eucalyptusO = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], reduce ? [0.22, 0.22, 0.22, 0.22] : [0, 0.22, 0.22, 0.14]);

  const wheatY      = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [40, -140]);
  const wheatO      = useTransform(scrollYProgress, [0.2, 0.35, 0.9, 1], reduce ? [0.2, 0.2, 0.2, 0.2] : [0, 0.24, 0.24, 0.12]);

  const driedX      = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, 80]);
  const driedY      = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-20, 180]);
  const driedO      = useTransform(scrollYProgress, [0, 0.1, 0.8, 1], reduce ? [0.22, 0.22, 0.22, 0.22] : [0, 0.2, 0.2, 0.1]);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* ── Palm-frond shadow, top-left ── */}
      <motion.svg
        aria-hidden
        viewBox="0 0 600 800"
        preserveAspectRatio="xMinYMin meet"
        className="absolute -top-[60px] -left-[60px] w-[460px] md:w-[600px] lg:w-[760px]"
        style={{
          y: palmY,
          rotate: palmRotate,
          opacity: palmOpacity,
          filter: 'blur(5px)',
          mixBlendMode: 'multiply',
          transformOrigin: '0% 0%',
        }}
      >
        <g fill="#3A251E">
          <path d="M120 40 Q 240 260, 360 640" stroke="#3A251E" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.55" />
          {Array.from({ length: 12 }).map((_, i) => {
            const t = i / 11;
            const cx = 120 + (360 - 120) * t + (t * t * 40);
            const cy = 40 + (640 - 40) * t;
            const side = i % 2 === 0 ? -1 : 1;
            const len = 170 - t * 90;
            const tilt = -35 + t * 40;
            return (
              <g key={i} transform={`translate(${cx} ${cy}) rotate(${tilt + side * 28})`}>
                <path
                  d={`M0 0 Q ${side * len * 0.55} ${-len * 0.22}, ${side * len} ${-len * 0.08} Q ${side * len * 0.55} ${len * 0.12}, 0 0 Z`}
                  opacity="0.55"
                />
              </g>
            );
          })}
        </g>
      </motion.svg>

      {/* ── Laurel, bottom-right ── */}
      <motion.svg
        aria-hidden
        viewBox="0 0 400 300"
        className="absolute -bottom-[40px] -right-[60px] w-[340px] md:w-[480px] opacity-[0.30] dark:opacity-[0.18]"
        style={{ y: laurelY, mixBlendMode: 'multiply' }}
      >
        <g stroke="#3A251E" strokeWidth="0.8" fill="#3A251E">
          <g transform="translate(360 240)">
            <path d="M 0 0 Q -120 -60, -260 -180" stroke="#3A251E" fill="none" opacity="0.55" />
            {Array.from({ length: 8 }).map((_, i) => {
              const t = i / 7;
              const x = -260 * t;
              const y = -180 * t * t;
              return (
                <path
                  key={i}
                  d={`M ${x} ${y} q -10 -8, -22 -4 q 8 12, 22 4 z`}
                  opacity="0.5"
                  transform={`rotate(${t * 25} ${x} ${y})`}
                />
              );
            })}
          </g>
        </g>
      </motion.svg>

      {/* ── Eucalyptus, mid-right ── only on ≥md so phones stay airy */}
      <motion.div
        className="hidden md:block absolute top-[28%] -right-[20px] lg:right-[40px] w-[110px] lg:w-[140px] h-[180px] lg:h-[220px]"
        style={{
          y: eucalyptusY,
          rotate: eucalyptusR,
          opacity: eucalyptusO,
          filter: 'blur(1px)',
          mixBlendMode: 'multiply',
        }}
      >
        <Sprig variant="eucalyptus" className="w-full h-full" fill="#8A8F72" />
      </motion.div>

      {/* ── Wheat, bottom-left ── */}
      <motion.div
        className="hidden md:block absolute bottom-[14%] left-[30px] w-[80px] lg:w-[110px] h-[180px] lg:h-[230px]"
        style={{ y: wheatY, opacity: wheatO, filter: 'blur(1px)', mixBlendMode: 'multiply' }}
      >
        <Sprig variant="wheat" className="w-full h-full" fill="#B07A3C" />
      </motion.div>

      {/* ── Dried leaf, upper-right ── */}
      <motion.div
        className="hidden lg:block absolute top-[12%] right-[8%] w-[70px] h-[130px]"
        style={{
          x: driedX,
          y: driedY,
          opacity: driedO,
          filter: 'blur(0.5px)',
          mixBlendMode: 'multiply',
        }}
      >
        <Sprig variant="driedLeaf" className="w-full h-full" fill="#8B674A" />
      </motion.div>
    </div>
  );
};

export default ScrollDecorations;
