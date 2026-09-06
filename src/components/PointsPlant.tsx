import React from 'react';

// Growth-stage plant illustration tied to the loyalty tiers.
// ─────────────────────────────────────────────────────────────────────────────
// Pure inline SVG so it scales without extra assets. Each stage is rendered
// with layered gradients, drop shadows and subtle motion to get a
// dimensional (almost 3D) feel without actually shipping a 3D engine.

type Stage = 'graine' | 'pousse' | 'tige' | 'fleur' | 'source' | 'lotus' | 'lumiere';

interface Props {
  stage: Stage;
  /** Optional accent color (matches the active tier). Used on flower + gold. */
  accent?: string;
  className?: string;
}

const PointsPlant: React.FC<Props> = ({ stage, accent = '#bb9a5e', className = '' }) => {
  return (
    <div className={`relative aspect-square w-full ${className}`}>
      {/* Soft background halo — same radial in all stages so the tile feels
          unified while the plant grows. */}
      <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full" aria-hidden>
        <defs>
          <radialGradient id="pp-halo" cx="50%" cy="55%" r="55%">
            <stop offset="0%"  stopColor="#f6f3ee" stopOpacity="0.85" />
            <stop offset="55%" stopColor="#f6f3ee" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#f6f3ee" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="pp-soil" cx="50%" cy="35%" r="65%">
            <stop offset="0%"  stopColor="#6B402E" />
            <stop offset="60%" stopColor="#4E3520" />
            <stop offset="100%" stopColor="#2E1F14" />
          </radialGradient>
          <linearGradient id="pp-stem" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#9BAE7A" />
            <stop offset="100%" stopColor="#5E7A3E" />
          </linearGradient>
          <linearGradient id="pp-leaf" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A8BE85" />
            <stop offset="60%" stopColor="#6F8C4E" />
            <stop offset="100%" stopColor="#4A6231" />
          </linearGradient>
          <linearGradient id="pp-canopy" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#95AE72" />
            <stop offset="100%" stopColor="#48612C" />
          </linearGradient>
          <radialGradient id="pp-flower" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={accent} />
            <stop offset="100%" stopColor="#5a4a37" />
          </radialGradient>
          <filter id="pp-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2.2" />
            <feOffset dx="0" dy="2" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.35" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Halo backdrop */}
        <rect x="0" y="0" width="200" height="200" fill="url(#pp-halo)" />

        {/* Soil mound — shared shape, grows a touch with each stage so the
            base reads as a little garden rather than a flowerpot. */}
        <ellipse
          cx="100"
          cy={stage === 'source' || stage === 'lotus' || stage === 'lumiere' ? 168 : 162}
          rx={stage === 'source' || stage === 'lotus' || stage === 'lumiere' ? 72 : 60}
          ry={stage === 'source' || stage === 'lotus' || stage === 'lumiere' ? 14 : 10}
          fill="url(#pp-soil)"
          filter="url(#pp-shadow)"
        />

        {/* Stage-specific plant */}
        {stage === 'graine' && <StageSeed />}
        {stage === 'pousse' && <StageSprout />}
        {stage === 'tige' && <StageStem />}
        {stage === 'fleur' && <StageBloom accent={accent} />}
        {stage === 'source' && <StageTree accent={accent} />}
        {stage === 'lotus' && <StageLotus accent={accent} />}
        {stage === 'lumiere' && <StageLumiere accent={accent} />}
      </svg>

      {/* Gentle idle float */}
      <style>{`
        @keyframes pp-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-3px) } }
        .pp-float { animation: pp-float 4.5s ease-in-out infinite; transform-origin: center bottom; }
        @keyframes pp-luciole { 0%,100% { opacity: .35; transform: translateY(0) } 50% { opacity: 1; transform: translateY(-2px) } }
        .pp-luciole { animation: pp-luciole 2.6s ease-in-out infinite; }
        .pp-luciole:nth-child(2n) { animation-delay: .8s } .pp-luciole:nth-child(3n) { animation-delay: 1.5s }
        @media (prefers-reduced-motion: reduce) { .pp-float, .pp-luciole { animation: none } }
      `}</style>
    </div>
  );
};

// ─── Stages ──────────────────────────────────────────────────────────────────

const StageSeed: React.FC = () => (
  <g className="pp-float" filter="url(#pp-shadow)">
    {/* Small seed half-buried */}
    <ellipse cx="100" cy="155" rx="8" ry="5" fill="#3A2316" />
    <path d="M100 150 Q 97 144 100 138 Q 103 144 100 150 Z" fill="url(#pp-leaf)" opacity="0.9" />
  </g>
);

const StageSprout: React.FC = () => (
  <g className="pp-float" filter="url(#pp-shadow)">
    {/* Stem */}
    <path d="M100 160 Q 99 135 100 118" stroke="url(#pp-stem)" strokeWidth="3" strokeLinecap="round" fill="none" />
    {/* Two cotyledon leaves */}
    <path d="M100 122 Q 82 112 84 126 Q 92 132 100 126 Z" fill="url(#pp-leaf)" />
    <path d="M100 122 Q 118 112 116 126 Q 108 132 100 126 Z" fill="url(#pp-leaf)" />
  </g>
);

const StageStem: React.FC = () => (
  <g className="pp-float" filter="url(#pp-shadow)">
    <path d="M100 160 Q 98 120 100 80" stroke="url(#pp-stem)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    {/* Alternating leaves */}
    <path d="M100 140 Q 80 132 78 146 Q 90 150 100 144 Z" fill="url(#pp-leaf)" />
    <path d="M100 122 Q 120 114 122 128 Q 110 132 100 126 Z" fill="url(#pp-leaf)" />
    <path d="M100 102 Q 80 94 78 108 Q 90 112 100 106 Z" fill="url(#pp-leaf)" />
    <path d="M100 86 Q 120 80 122 92 Q 110 96 100 90 Z" fill="url(#pp-leaf)" />
    {/* Top bud */}
    <ellipse cx="100" cy="74" rx="5" ry="8" fill="url(#pp-leaf)" />
  </g>
);

const StageBloom: React.FC<{ accent: string }> = ({ accent }) => (
  <g className="pp-float" filter="url(#pp-shadow)">
    <path d="M100 160 Q 97 120 100 72" stroke="url(#pp-stem)" strokeWidth="4" strokeLinecap="round" fill="none" />
    {/* Leaves */}
    <path d="M100 144 Q 78 134 76 150 Q 90 156 100 150 Z" fill="url(#pp-leaf)" />
    <path d="M100 126 Q 122 116 124 132 Q 112 138 100 132 Z" fill="url(#pp-leaf)" />
    <path d="M100 106 Q 78 96 76 112 Q 90 118 100 112 Z" fill="url(#pp-leaf)" />
    <path d="M100 88 Q 122 80 124 96 Q 112 100 100 94 Z" fill="url(#pp-leaf)" />
    {/* Flower — 5 gold petals + center */}
    {[0, 72, 144, 216, 288].map((a) => (
      <ellipse
        key={a}
        cx="100" cy="56"
        rx="8" ry="13"
        fill="url(#pp-flower)"
        transform={`rotate(${a} 100 70)`}
        opacity="0.95"
      />
    ))}
    <circle cx="100" cy="70" r="6" fill={accent} />
    <circle cx="100" cy="70" r="3" fill="#3A2316" opacity="0.55" />
  </g>
);

const StageTree: React.FC<{ accent: string }> = ({ accent }) => (
  <g className="pp-float" filter="url(#pp-shadow)">
    {/* Trunk */}
    <path d="M100 165 L 96 115 L 104 115 Z" fill="#6B402E" />
    <rect x="96" y="115" width="8" height="52" rx="3" fill="#5A3D24" />
    {/* Canopy — three overlapping rounded shapes for fullness */}
    <ellipse cx="100" cy="80" rx="50" ry="38" fill="url(#pp-canopy)" />
    <ellipse cx="74"  cy="92" rx="34" ry="28" fill="url(#pp-canopy)" opacity="0.9" />
    <ellipse cx="126" cy="92" rx="34" ry="28" fill="url(#pp-canopy)" opacity="0.9" />
    <ellipse cx="100" cy="62" rx="28" ry="22" fill="url(#pp-canopy)" opacity="0.95" />
    {/* Golden accents — little "fruits" hinting at abundance */}
    <circle cx="78"  cy="86" r="3.5" fill={accent} opacity="0.9" />
    <circle cx="124" cy="74" r="3"   fill={accent} opacity="0.9" />
    <circle cx="108" cy="98" r="2.8" fill={accent} opacity="0.85" />
    <circle cx="92"  cy="58" r="2.5" fill={accent} opacity="0.8" />
  </g>
);

// Un lotus : cinq pétales rose pâle ouverts autour d'un cœur d'or, posé dans
// la ramure comme sur l'eau.
const Lotus: React.FC<{ x: number; y: number; r?: number; accent: string }> = ({ x, y, r = 1, accent }) => (
  <g transform={`translate(${x} ${y}) scale(${r})`}>
    {[-40, -20, 0, 20, 40].map((a) => (
      <ellipse key={a} cx="0" cy="-5" rx="3.2" ry="6.5" fill="#F3D6E0" stroke="#C97B9B" strokeWidth="0.6" transform={`rotate(${a} 0 2)`} />
    ))}
    <ellipse cx="0" cy="-3" rx="2.6" ry="5" fill="#FBEAF0" opacity="0.9" />
    <circle cx="0" cy="0.5" r="1.6" fill={accent} />
  </g>
);

// Le stade Lotus : l'arbre de Source, et des lotus qui poussent dans ses branches.
const StageLotus: React.FC<{ accent: string }> = ({ accent }) => (
  <g className="pp-float" filter="url(#pp-shadow)">
    <path d="M100 165 L 96 115 L 104 115 Z" fill="#6B402E" />
    <rect x="96" y="115" width="8" height="52" rx="3" fill="#5A3D24" />
    <ellipse cx="100" cy="80" rx="50" ry="38" fill="url(#pp-canopy)" />
    <ellipse cx="74"  cy="92" rx="34" ry="28" fill="url(#pp-canopy)" opacity="0.9" />
    <ellipse cx="126" cy="92" rx="34" ry="28" fill="url(#pp-canopy)" opacity="0.9" />
    <ellipse cx="100" cy="62" rx="28" ry="22" fill="url(#pp-canopy)" opacity="0.95" />
    <Lotus x={100} y={52} r={1.1} accent={accent} />
    <Lotus x={70}  y={82} r={0.9} accent={accent} />
    <Lotus x={130} y={78} r={0.9} accent={accent} />
    <Lotus x={92}  y={104} r={0.75} accent={accent} />
    <Lotus x={118} y={106} r={0.7} accent={accent} />
  </g>
);

// Le stade Lumière : le même arbre fleuri, et des lucioles qui s'allument
// dans la ramure et autour.
const StageLumiere: React.FC<{ accent: string }> = ({ accent }) => (
  <g filter="url(#pp-shadow)">
    <g className="pp-float">
      <path d="M100 165 L 96 115 L 104 115 Z" fill="#6B402E" />
      <rect x="96" y="115" width="8" height="52" rx="3" fill="#5A3D24" />
      <ellipse cx="100" cy="80" rx="50" ry="38" fill="url(#pp-canopy)" />
      <ellipse cx="74"  cy="92" rx="34" ry="28" fill="url(#pp-canopy)" opacity="0.9" />
      <ellipse cx="126" cy="92" rx="34" ry="28" fill="url(#pp-canopy)" opacity="0.9" />
      <ellipse cx="100" cy="62" rx="28" ry="22" fill="url(#pp-canopy)" opacity="0.95" />
      <Lotus x={100} y={52} r={1.1} accent="#C97B9B" />
      <Lotus x={70}  y={82} r={0.9} accent="#C97B9B" />
      <Lotus x={130} y={78} r={0.9} accent="#C97B9B" />
      <Lotus x={92}  y={104} r={0.75} accent="#C97B9B" />
      <Lotus x={118} y={106} r={0.7} accent="#C97B9B" />
    </g>
    <g>
      {[[58, 60], [142, 56], [84, 40], [120, 36], [50, 100], [150, 104], [100, 128], [66, 124], [136, 126], [100, 22]].map(([x, y], i) => (
        <g key={i} className="pp-luciole">
          <circle cx={x} cy={y} r="4.5" fill={accent} opacity="0.25" />
          <circle cx={x} cy={y} r="1.6" fill="#FFF3C4" />
        </g>
      ))}
    </g>
  </g>
);

export default PointsPlant;
export type { Stage };
