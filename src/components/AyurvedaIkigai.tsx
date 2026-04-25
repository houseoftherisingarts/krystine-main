import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

// Tri-dosha Venn + center "Take the Quiz" — shared between /quiz and
// the Dosha section on /accueil. Parent decides what each click does
// (open a popover vs. navigate). The SVG stays purely presentational.
//
// Motion (per ui-ux-pro-max guidance):
//   · spring entrance — each dosha pops into place with damped spring
//   · stagger 80 ms between doshas + 240 ms before the quiz disc
//   · breathing loop — each dosha scales 1.00 → 1.02 → 1.00 on an
//     offset phase so the three feel like a living constellation
//   · press/hover feedback sharpened: 1.12× scale with directional
//     push away from centre — motion carries meaning (the dosha
//     "reaches out" when focused)
//   · all animations honour prefers-reduced-motion
interface Props {
  doshas: any[];
  onDoshaClick: (d: any) => void;
  onQuizClick: () => void;
  lang: string;
  /** Unique id suffix to avoid duplicate SVG <filter> ids on pages that render the Ikigai more than once. */
  filterId?: string;
}

const AyurvedaIkigai: React.FC<Props> = ({ doshas, onDoshaClick, onQuizClick, lang, filterId = 'default' }) => {
  const glowId = `glow-ay-${filterId}`;
  const [hovered, setHovered] = useState<number | null>(null);
  const [quizHover, setQuizHover] = useState(false);
  const reduce = useReducedMotion();

  const doshaMeta = [
    { cx: -62, cy: -52, tx: -14, ty: -12, fill: '#8F9779', dosha: doshas[0], phase: 0 },
    { cx:  62, cy: -52, tx:  14, ty: -12, fill: '#BC4A3C', dosha: doshas[1], phase: 1 },
    { cx:   0, cy:  82, tx:   0, ty:  16, fill: '#4A7C9D', dosha: doshas[2], phase: 2 },
  ];

  return (
    <motion.svg
      viewBox="-200 -200 400 400"
      className="w-[260px] h-[260px] sm:w-[300px] sm:h-[300px] md:w-[340px] md:h-[340px] lg:w-[360px] lg:h-[360px] xl:w-[420px] xl:h-[420px] overflow-visible drop-shadow-2xl flex-shrink-0 ikigai-float"
      initial={reduce ? { opacity: 1, scale: 1, rotate: 0 } : { opacity: 0, scale: 0.88, rotate: -4 }}
      whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ type: 'spring', stiffness: 90, damping: 15, delay: 0.05 }}
    >
      <defs>
        <filter id={glowId}>
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        {/* Per-dosha subtle radial gradient — gives each petal a faint
            inner glow instead of a flat solid. Matches the moodboard's
            soft, painted feel. */}
        {doshaMeta.map((d, i) => (
          <radialGradient key={i} id={`dosha-${filterId}-${i}`} cx="35%" cy="32%" r="70%">
            <stop offset="0%"   stopColor={d.fill} stopOpacity={1} />
            <stop offset="70%"  stopColor={d.fill} stopOpacity={0.92} />
            <stop offset="100%" stopColor={d.fill} stopOpacity={0.82} />
          </radialGradient>
        ))}
      </defs>

      {/* Tri-dosha Venn. Vata top-left, Pitta top-right, Kapha bottom.
          Each dosha gets an independent entrance spring (stagger via
          `delay`), plus a continuous breathing loop driven by CSS so
          it survives a tab switch / reduced-motion reset without
          reshuffling every render. */}
      {doshaMeta.map(({ cx, cy, tx, ty, fill, dosha, phase }, i) => {
        const active = hovered === i;
        return (
          // Framer-motion writes its own CSS transform on motion.g
          // which overwrites the SVG `transform` attribute. To keep the
          // (cx, cy) placement stable while still running the entrance
          // spring, we put the translate on a static <g> and let the
          // motion.g scale/fade locally.
          <g key={i} transform={`translate(${cx} ${cy})`}>
          {/* Inner <g> uses `animate` (mount-driven) instead of
              `whileInView`. IntersectionObserver does not reliably fire
              on SVG <g> elements in mobile Safari, which left the three
              dosha circles stuck at opacity:0 on phones. The parent
              <motion.svg> still uses `whileInView` to gate when the
              whole composition reveals — that works because <svg> has
              a normal layout box. */}
          <motion.g
            initial={reduce ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 180,
              damping: 16,
              delay: reduce ? 0 : 0.18 + i * 0.08,
            }}
          >
            {/* Breathing layer — a continuous CSS scale loop. */}
            <g
              className={`dosha-breathe-${phase}`}
              style={{ transformOrigin: '0 0' }}
            >
            <g
              onClick={() => onDoshaClick(dosha)}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onTouchStart={() => setHovered(i)}
              onTouchEnd={() => setHovered(null)}
              className="cursor-pointer"
              style={{
                transform: active
                  ? `translate(${tx}px, ${ty}px) scale(1.12)`
                  : 'translate(0, 0) scale(1)',
                transformOrigin: '0 0',
                transition: 'transform 300ms cubic-bezier(.22,.9,.31,1)',
                filter: active
                  ? `drop-shadow(0 6px 18px ${fill}66)`
                  : `drop-shadow(0 3px 10px ${fill}33)`,
              }}
            >
              <circle
                cx={0} cy={0} r={90}
                fill={`url(#dosha-${filterId}-${i})`}
                stroke={fill}
                strokeOpacity={active ? 0.9 : 0.35}
                strokeWidth={active ? 2 : 1}
                style={{ transition: 'stroke-opacity 300ms ease-out, stroke-width 300ms ease-out' }}
              />
              {/* Faint inner ring — a printed silk-screen line so the
                  petal reads as illustrated, not UI-flat. */}
              <circle
                cx={0} cy={0} r={78}
                fill="none"
                stroke="rgba(255,255,255,0.22)"
                strokeWidth="0.8"
              />
              <text
                x={0} y={0}
                textAnchor="middle" dominantBaseline="middle"
                fill="white" fontSize="16" fontFamily="serif" fontWeight="bold" letterSpacing="2"
                className="pointer-events-none uppercase"
              >
                {dosha.name}
              </text>
            </g>
            </g>
          </motion.g>
          </g>
        );
      })}

      {/* Centre disc — "Take the quiz". Enters last, with a pulse-ring
          that continues forever to pull attention without shouting. */}
      <motion.g
        onClick={onQuizClick}
        onMouseEnter={() => setQuizHover(true)}
        onMouseLeave={() => setQuizHover(false)}
        className="cursor-pointer group"
        initial={reduce ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 16, delay: reduce ? 0 : 0.5 }}
      >
        {/* Pulse-ring behind the disc — a thin copper ring that scales
            up and fades out on loop, like a gentle sonar ping. */}
        {!reduce && (
          <circle
            cx={0} cy={10} r={50}
            fill="none"
            stroke="rgba(184,83,47,0.55)"
            strokeWidth="1.2"
            className="ikigai-pulse"
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          />
        )}
        <circle
          cx={0} cy={10} r={50}
          fill="rgba(255,255,255,0.96)"
          stroke="rgba(184,83,47,0.35)"
          strokeWidth={1}
          filter={`url(#${glowId})`}
          style={{
            transformBox: 'fill-box',
            transformOrigin: 'center',
            transform: quizHover ? 'scale(1.08)' : 'scale(1)',
            transition: 'transform 350ms cubic-bezier(.22,.9,.31,1), filter 350ms ease-out',
            filter: quizHover
              ? `url(#${glowId}) drop-shadow(0 8px 22px rgba(184,83,47,0.35))`
              : `url(#${glowId})`,
          }}
        />
        <text x={0} y={4} textAnchor="middle" fill="#3A251E" fontSize="13" fontFamily="serif" fontWeight="bold" className="pointer-events-none uppercase tracking-widest">{lang === 'FR' ? 'Faire' : 'Take'}</text>
        <text x={0} y={20} textAnchor="middle" fill="#3A251E" fontSize="13" fontFamily="serif" fontWeight="bold" className="pointer-events-none uppercase tracking-widest">{lang === 'FR' ? 'Le Quiz' : 'The Quiz'}</text>
      </motion.g>

      {/* Scoped keyframes — breathing + pulse. Using SVG attribute
          transform-origin requires `transform-box: fill-box`; we set
          that inline above. */}
      <style>{`
        @keyframes dosha-breathe-0 {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.022); }
        }
        @keyframes dosha-breathe-1 {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.018); }
        }
        @keyframes dosha-breathe-2 {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.025); }
        }
        .dosha-breathe-0 { animation: dosha-breathe-0 5.4s ease-in-out infinite; transform-origin: 0 0; }
        .dosha-breathe-1 { animation: dosha-breathe-1 6.2s ease-in-out -2s infinite; transform-origin: 0 0; }
        .dosha-breathe-2 { animation: dosha-breathe-2 5.8s ease-in-out -3.5s infinite; transform-origin: 0 0; }

        @keyframes ikigai-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-3px); }
        }
        .ikigai-float { animation: ikigai-float 7.5s ease-in-out infinite; }

        @keyframes ikigai-pulse {
          0%   { transform: scale(1);   opacity: 0.65; }
          80%  { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .ikigai-pulse {
          animation: ikigai-pulse 2.8s ease-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .ikigai-float, .ikigai-pulse,
          .dosha-breathe-0, .dosha-breathe-1, .dosha-breathe-2 {
            animation: none !important;
          }
        }
      `}</style>
    </motion.svg>
  );
};

export default AyurvedaIkigai;
