// Sprig — six tiny botanical SVGs used as editorial corner ornaments
// across the home page. They echo the moodboard's copper/sauge line-art
// sprigs that flank every heading. All vectors — no external assets.
//
// Usage: <Sprig variant="eucalyptus" className="w-12 h-14 opacity-70" />
//
// The `draw` variant (used inside <motion.div>) also exposes path keys so
// the caller can drive stroke-dashoffset animations if desired.

import React from 'react';

export type SprigVariant =
  | 'eucalyptus'
  | 'laurel'
  | 'wheat'
  | 'dandelion'
  | 'olive'
  | 'driedLeaf';

interface Props {
  variant?: SprigVariant;
  className?: string;
  /** Flip horizontally — use when placing the sprig on the opposite corner. */
  flip?: boolean;
  /** Override the stroke ink colour (defaults to a muted brun). */
  ink?: string;
  /** Override the fill tint (defaults to sauge at low opacity). */
  fill?: string;
}

const INK_DEFAULT  = '#8B674A';
const SAUGE        = '#8A8F72';
const COPPER       = '#B8532F';

const Eucalyptus: React.FC<{ ink: string; fill: string }> = ({ ink, fill }) => (
  <svg viewBox="0 0 80 140" aria-hidden className="w-full h-full">
    <path d="M 40 138 C 38 110, 46 78, 38 48 C 34 28, 42 14, 50 4"
      fill="none" stroke={ink} strokeWidth="0.9" strokeLinecap="round" />
    {[
      { x: 32, y: 120, r: -35, rx: 7, ry: 2.2 },
      { x: 48, y: 106, r: 30,  rx: 7, ry: 2.2 },
      { x: 30, y: 92,  r: -32, rx: 6.5, ry: 2 },
      { x: 48, y: 78,  r: 28,  rx: 6.5, ry: 2 },
      { x: 34, y: 62,  r: -28, rx: 5.5, ry: 1.8 },
      { x: 46, y: 48,  r: 25,  rx: 5, ry: 1.6 },
      { x: 38, y: 32,  r: -20, rx: 4.5, ry: 1.4 },
      { x: 48, y: 18,  r: 18,  rx: 4, ry: 1.3 },
    ].map((p, i) => (
      <ellipse key={i} cx={p.x} cy={p.y} rx={p.rx} ry={p.ry}
        transform={`rotate(${p.r} ${p.x} ${p.y})`}
        fill={fill} fillOpacity="0.35" stroke={ink} strokeWidth="0.5" />
    ))}
  </svg>
);

const Laurel: React.FC<{ ink: string; fill: string }> = ({ ink, fill }) => (
  <svg viewBox="0 0 80 140" aria-hidden className="w-full h-full">
    <path d="M 40 138 C 42 108, 36 78, 42 50 C 46 30, 40 14, 36 2"
      fill="none" stroke={ink} strokeWidth="0.9" strokeLinecap="round" />
    {[
      { x: 28, y: 118, r: -28 }, { x: 50, y: 108, r: 26 },
      { x: 30, y: 92,  r: -26 }, { x: 52, y: 82,  r: 24 },
      { x: 32, y: 66,  r: -22 }, { x: 48, y: 54,  r: 22 },
      { x: 34, y: 38,  r: -18 }, { x: 44, y: 26,  r: 16 },
    ].map((p, i) => (
      <path key={i}
        d={`M ${p.x} ${p.y} q -4 -9, 0 -16 q 8 2, 10 12 q -6 7, -10 4 z`}
        transform={`rotate(${p.r} ${p.x} ${p.y})`}
        fill={fill} fillOpacity="0.4" stroke={ink} strokeWidth="0.5" />
    ))}
  </svg>
);

const Wheat: React.FC<{ ink: string; fill: string }> = ({ ink, fill }) => (
  <svg viewBox="0 0 60 140" aria-hidden className="w-full h-full">
    <line x1="30" y1="138" x2="30" y2="14" stroke={ink} strokeWidth="0.9" strokeLinecap="round" />
    {Array.from({ length: 9 }).map((_, i) => {
      const y = 30 + i * 11;
      return (
        <g key={i}>
          <ellipse cx={22} cy={y} rx="6" ry="2" transform={`rotate(-40 22 ${y})`}
            fill={fill} fillOpacity="0.45" stroke={ink} strokeWidth="0.45" />
          <ellipse cx={38} cy={y - 4} rx="6" ry="2" transform={`rotate(40 38 ${y - 4})`}
            fill={fill} fillOpacity="0.45" stroke={ink} strokeWidth="0.45" />
        </g>
      );
    })}
    {/* tip grains */}
    {[8, 14, 20].map((y, i) => (
      <ellipse key={i} cx={30} cy={y} rx="2.2" ry="4.5"
        fill={fill} fillOpacity="0.55" stroke={ink} strokeWidth="0.4" />
    ))}
  </svg>
);

const Dandelion: React.FC<{ ink: string; fill: string }> = ({ ink, fill }) => (
  <svg viewBox="0 0 120 120" aria-hidden className="w-full h-full">
    <line x1="60" y1="118" x2="60" y2="60" stroke={ink} strokeWidth="0.8" strokeLinecap="round" />
    <circle cx="60" cy="55" r="3" fill={fill} fillOpacity="0.5" stroke={ink} strokeWidth="0.5" />
    {Array.from({ length: 18 }).map((_, i) => {
      const a = (i * 360) / 18;
      const r = (a * Math.PI) / 180;
      const x2 = 60 + 35 * Math.cos(r);
      const y2 = 55 + 35 * Math.sin(r);
      const tipX = 60 + 42 * Math.cos(r);
      const tipY = 55 + 42 * Math.sin(r);
      return (
        <g key={i}>
          <line x1={60 + 5 * Math.cos(r)} y1={55 + 5 * Math.sin(r)}
                x2={x2} y2={y2} stroke={ink} strokeWidth="0.5" opacity="0.6" />
          <circle cx={tipX} cy={tipY} r="1.3" fill={ink} opacity="0.45" />
        </g>
      );
    })}
  </svg>
);

const Olive: React.FC<{ ink: string; fill: string }> = ({ ink, fill }) => (
  <svg viewBox="0 0 140 80" aria-hidden className="w-full h-full">
    <path d="M 6 40 Q 70 18, 134 40" fill="none" stroke={ink} strokeWidth="0.9" strokeLinecap="round" />
    {[
      { x: 20, y: 38, r: -12 }, { x: 38, y: 30, r: -18 }, { x: 58, y: 24, r: -10 },
      { x: 82, y: 24, r:  12 }, { x: 104, y: 30, r:  20 }, { x: 122, y: 38, r: 15 },
    ].map((p, i) => (
      <ellipse key={`leaf-${i}`} cx={p.x} cy={p.y - 5} rx="8" ry="2.4"
        transform={`rotate(${p.r} ${p.x} ${p.y - 5})`}
        fill={fill} fillOpacity="0.38" stroke={ink} strokeWidth="0.45" />
    ))}
    {/* olives — small copper drupes */}
    {[
      { x: 46, y: 34 }, { x: 70, y: 28 }, { x: 94, y: 34 },
    ].map((p, i) => (
      <ellipse key={`drupe-${i}`} cx={p.x} cy={p.y} rx="2.2" ry="3" fill={COPPER} fillOpacity="0.7" stroke={ink} strokeWidth="0.4" />
    ))}
  </svg>
);

const DriedLeaf: React.FC<{ ink: string; fill: string }> = ({ ink, fill }) => (
  <svg viewBox="0 0 80 140" aria-hidden className="w-full h-full">
    {/* A single elongated dried leaf, as in the moodboard edges. */}
    <path
      d="M 40 138 Q 28 110, 34 76 Q 40 46, 44 12 Q 50 46, 46 82 Q 44 112, 40 138 Z"
      fill={fill} fillOpacity="0.28" stroke={ink} strokeWidth="0.7" strokeLinejoin="round"
    />
    {/* spine */}
    <path d="M 40 138 Q 40 86, 44 12" fill="none" stroke={ink} strokeWidth="0.55" opacity="0.7" />
    {/* veins */}
    {[120, 100, 82, 64, 46, 30].map((y, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      return (
        <path key={i}
          d={`M 40 ${y} q ${side * 6} ${-6}, ${side * 10} ${-10}`}
          fill="none" stroke={ink} strokeWidth="0.35" opacity="0.55" />
      );
    })}
  </svg>
);

const RENDER: Record<SprigVariant, React.FC<{ ink: string; fill: string }>> = {
  eucalyptus: Eucalyptus,
  laurel:     Laurel,
  wheat:      Wheat,
  dandelion:  Dandelion,
  olive:      Olive,
  driedLeaf:  DriedLeaf,
};

const Sprig: React.FC<Props> = ({
  variant = 'eucalyptus',
  className = '',
  flip = false,
  ink = INK_DEFAULT,
  fill = SAUGE,
}) => {
  const Glyph = RENDER[variant];
  return (
    <div
      className={className}
      aria-hidden
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
    >
      <Glyph ink={ink} fill={fill} />
    </div>
  );
};

export default Sprig;
