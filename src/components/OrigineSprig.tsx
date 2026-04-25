import React from 'react';

// Origine botanical sprigs — delicate herbarium studies.
// Inspired directly by the moodboard: each card carries a tall, narrow
// pressed-plant illustration sitting *on* the card surface (no medallion,
// no frame) — thin sepia strokes, scattered leaves, and the occasional
// small copper or magenta bud. A deterministic hash of the event id
// (djb2) selects one of six variants so repeat visits keep the same
// sprig per card while the six studies rotate across the list.

type Variant =
  | 'olive' | 'lavender' | 'grass' | 'pine' | 'eucalyptus' | 'bloom'
  // Apothecary glyphs — subject-specific, used when the event's title
  // reads more clearly as an object (ticket, compass, book) than as a
  // botanical study. When all events are mapped, the hash fallback to
  // botanicals never fires.
  | 'ticket' | 'compass' | 'origine' | 'book'
  | 'retreat' | 'route' | 'launch' | 'mic';

// Hash-pick pool — only the botanicals rotate. Apothecary glyphs are
// reserved for explicit opt-in via the `variant` prop.
const VARIANTS: Variant[] = ['olive', 'lavender', 'grass', 'pine', 'eucalyptus', 'bloom'];

const pick = (seed?: string): Variant => {
  if (!seed) return 'olive';
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h) ^ seed.charCodeAt(i);
  return VARIANTS[Math.abs(h) % VARIANTS.length];
};

// Sepia / copper / soft magenta — the moodboard's trio.
const INK     = '#8B674A';   // main line — warm sepia brun
const INK_SOFT = '#A88866';  // secondary accent
const COPPER  = '#B8532F';   // buds / berries
const ROSE    = '#A6556B';   // soft magenta flower buds
const SAUGE   = '#8A8F72';   // sauge leaf fill when used

// All variants draw into a tall 48×120 viewBox — portrait format echoes
// the herbarium columns in the moodboard.
const VB = '0 0 48 120';

// ─── Rameau d'olivier ──────────────────────────────────────────────────
const Olive: React.FC = () => (
  <svg viewBox={VB} className="w-full h-full" aria-hidden>
    <path d="M 24 116 C 22 90, 26 60, 22 34 C 20 22, 24 14, 28 8" fill="none" stroke={INK} strokeWidth="0.9" strokeLinecap="round" />
    {[
      { cx: 18, cy: 100, rx: 5.5, ry: 1.7, r: -35 },
      { cx: 30, cy: 92,  rx: 5.0, ry: 1.5, r: 30 },
      { cx: 17, cy: 82,  rx: 5.8, ry: 1.8, r: -30 },
      { cx: 29, cy: 72,  rx: 5.0, ry: 1.5, r: 25 },
      { cx: 17, cy: 62,  rx: 5.2, ry: 1.6, r: -25 },
      { cx: 29, cy: 52,  rx: 4.8, ry: 1.4, r: 20 },
      { cx: 18, cy: 42,  rx: 4.6, ry: 1.4, r: -20 },
      { cx: 28, cy: 30,  rx: 4.0, ry: 1.2, r: 15 },
      { cx: 22, cy: 20,  rx: 3.6, ry: 1.1, r: -15 },
    ].map((p, i) => (
      <ellipse key={i} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry}
        transform={`rotate(${p.r} ${p.cx} ${p.cy})`}
        fill={SAUGE} fillOpacity="0.32" stroke={INK} strokeWidth="0.6" />
    ))}
    {/* Olives near mid-stem */}
    <circle cx="20" cy="70" r="1.6" fill={COPPER} fillOpacity="0.7" />
    <circle cx="25" cy="58" r="1.4" fill={COPPER} fillOpacity="0.7" />
  </svg>
);

// ─── Lavande ───────────────────────────────────────────────────────────
const Lavender: React.FC = () => (
  <svg viewBox={VB} className="w-full h-full" aria-hidden>
    <path d="M 24 118 L 24 48" fill="none" stroke={INK} strokeWidth="0.9" strokeLinecap="round" />
    {/* Side leaves at lower third */}
    <path d="M 24 96 Q 14 92, 10 82" fill="none" stroke={INK} strokeWidth="0.7" strokeLinecap="round" />
    <path d="M 24 90 Q 34 86, 38 76" fill="none" stroke={INK} strokeWidth="0.7" strokeLinecap="round" />
    <path d="M 24 76 Q 16 74, 14 66" fill="none" stroke={INK} strokeWidth="0.7" strokeLinecap="round" />
    {/* Bud cluster — tapered ovals stacked at the top */}
    {[
      { cx: 24, cy: 46, rx: 2.2, ry: 3.2, r: 0 },
      { cx: 20, cy: 40, rx: 1.7, ry: 2.6, r: -10 },
      { cx: 28, cy: 40, rx: 1.7, ry: 2.6, r: 10 },
      { cx: 23, cy: 34, rx: 1.9, ry: 2.8, r: -4 },
      { cx: 26, cy: 28, rx: 1.7, ry: 2.5, r: 6 },
      { cx: 22, cy: 22, rx: 1.5, ry: 2.2, r: -8 },
      { cx: 25, cy: 17, rx: 1.3, ry: 1.9, r: 0 },
      { cx: 24, cy: 11, rx: 1.0, ry: 1.5, r: 0 },
    ].map((p, i) => (
      <ellipse key={i} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry}
        transform={`rotate(${p.r} ${p.cx} ${p.cy})`}
        fill={ROSE} fillOpacity="0.55" stroke={INK} strokeWidth="0.5" />
    ))}
  </svg>
);

// ─── Herbe sauvage / avoine ────────────────────────────────────────────
const Grass: React.FC = () => (
  <svg viewBox={VB} className="w-full h-full" aria-hidden>
    {/* Three thin blades of grass rising from a common root area */}
    <path d="M 24 118 C 22 96, 18 70, 12 40 C 10 28, 11 18, 13 10" fill="none" stroke={INK} strokeWidth="0.8" strokeLinecap="round" />
    <path d="M 24 118 C 25 96, 25 70, 24 42 C 23 28, 23 18, 24 8" fill="none" stroke={INK} strokeWidth="0.9" strokeLinecap="round" />
    <path d="M 24 118 C 27 96, 31 70, 36 40 C 38 28, 38 18, 36 12" fill="none" stroke={INK} strokeWidth="0.8" strokeLinecap="round" />
    {/* Tiny grain husks along the tallest blade */}
    {[16, 22, 28, 34, 40].map((y, i) => (
      <ellipse key={i} cx={24 + (i % 2 === 0 ? -1.2 : 1.2)} cy={y}
        rx="1.4" ry="2.2"
        transform={`rotate(${i % 2 === 0 ? -14 : 14} ${24 + (i % 2 === 0 ? -1.2 : 1.2)} ${y})`}
        fill={COPPER} fillOpacity="0.5" stroke={INK} strokeWidth="0.4" />
    ))}
    {/* A couple of seed buds at the tips of outer blades */}
    <circle cx="13" cy="10" r="1.1" fill={COPPER} fillOpacity="0.7" />
    <circle cx="36" cy="12" r="1.1" fill={COPPER} fillOpacity="0.7" />
  </svg>
);

// ─── Rameau de pin ─────────────────────────────────────────────────────
const Pine: React.FC = () => (
  <svg viewBox={VB} className="w-full h-full" aria-hidden>
    {/* Curved main branch climbing diagonally */}
    <path d="M 10 118 C 16 90, 22 62, 30 34 C 34 20, 38 10, 40 4" fill="none" stroke={INK} strokeWidth="1.0" strokeLinecap="round" />
    {/* Needle clusters — fans of short lines at intervals along the branch */}
    {[
      { x: 15, y: 100, a: 70 },
      { x: 19, y: 82,  a: 62 },
      { x: 23, y: 64,  a: 55 },
      { x: 28, y: 46,  a: 50 },
      { x: 33, y: 28,  a: 44 },
      { x: 38, y: 12,  a: 40 },
    ].map((p, i) => (
      <g key={i}>
        {[-55, -30, -5, 20, 45].map((d, j) => {
          const a = (p.a + d - 90) * (Math.PI / 180);
          return (
            <line key={j}
              x1={p.x} y1={p.y}
              x2={p.x + 7 * Math.cos(a)}
              y2={p.y + 7 * Math.sin(a)}
              stroke={INK} strokeWidth="0.55" strokeLinecap="round" />
          );
        })}
      </g>
    ))}
    {/* Little pine cone near mid */}
    <ellipse cx="24" cy="60" rx="1.8" ry="2.8" fill={COPPER} fillOpacity="0.55" stroke={INK} strokeWidth="0.4" />
  </svg>
);

// ─── Eucalyptus ────────────────────────────────────────────────────────
const Eucalyptus: React.FC = () => (
  <svg viewBox={VB} className="w-full h-full" aria-hidden>
    <path d="M 24 118 C 22 94, 26 66, 22 38 C 20 22, 24 12, 28 6" fill="none" stroke={INK} strokeWidth="0.9" strokeLinecap="round" />
    {[
      { cx: 14, cy: 104, r: 3.5 },
      { cx: 32, cy: 96,  r: 3.3 },
      { cx: 14, cy: 86,  r: 3.6 },
      { cx: 33, cy: 76,  r: 3.3 },
      { cx: 14, cy: 66,  r: 3.3 },
      { cx: 31, cy: 56,  r: 3.0 },
      { cx: 15, cy: 46,  r: 2.8 },
      { cx: 29, cy: 34,  r: 2.5 },
      { cx: 23, cy: 22,  r: 2.2 },
    ].map((p, i) => (
      <g key={i}>
        <circle cx={p.cx} cy={p.cy} r={p.r}
          fill={SAUGE} fillOpacity="0.32" stroke={INK} strokeWidth="0.55" />
        {/* Short petiole from the stem to the leaf */}
        <line x1={p.cx < 24 ? p.cx + p.r * 0.9 : p.cx - p.r * 0.9} y1={p.cy}
              x2={24} y2={p.cy + (p.cx < 24 ? 2 : -2)}
              stroke={INK} strokeWidth="0.4" />
      </g>
    ))}
  </svg>
);

// ─── Petite branche fleurie ────────────────────────────────────────────
const Bloom: React.FC = () => (
  <svg viewBox={VB} className="w-full h-full" aria-hidden>
    {/* Main curving stem */}
    <path d="M 24 118 C 20 96, 28 70, 22 44 C 18 30, 24 16, 28 6" fill="none" stroke={INK} strokeWidth="0.85" strokeLinecap="round" />
    {/* Short branching stems with tiny leaves */}
    <path d="M 23 102 Q 14 98, 10 92" fill="none" stroke={INK_SOFT} strokeWidth="0.6" strokeLinecap="round" />
    <path d="M 26 84  Q 34 78, 38 74" fill="none" stroke={INK_SOFT} strokeWidth="0.6" strokeLinecap="round" />
    <path d="M 23 64  Q 14 60, 10 54" fill="none" stroke={INK_SOFT} strokeWidth="0.6" strokeLinecap="round" />
    <path d="M 25 46  Q 32 42, 36 36" fill="none" stroke={INK_SOFT} strokeWidth="0.6" strokeLinecap="round" />
    {/* Tiny leaves scattered along the branches */}
    {[
      { cx: 10, cy: 92, r: 1.6 },
      { cx: 14, cy: 90, r: 1.2 },
      { cx: 38, cy: 74, r: 1.5 },
      { cx: 34, cy: 74, r: 1.1 },
      { cx: 10, cy: 54, r: 1.5 },
      { cx: 15, cy: 52, r: 1.1 },
      { cx: 36, cy: 36, r: 1.4 },
      { cx: 32, cy: 37, r: 1.0 },
    ].map((p, i) => (
      <ellipse key={i} cx={p.cx} cy={p.cy} rx={p.r * 1.4} ry={p.r * 0.65}
        fill={SAUGE} fillOpacity="0.45" stroke={INK} strokeWidth="0.45" />
    ))}
    {/* Flower buds — small magenta dots scattered near the tips and top */}
    {[
      { cx: 28, cy: 8 },
      { cx: 26, cy: 12 },
      { cx: 30, cy: 14 },
      { cx: 38, cy: 36 },
      { cx: 10, cy: 92 },
    ].map((p, i) => (
      <circle key={i} cx={p.cx} cy={p.cy} r="1.4" fill={ROSE} fillOpacity="0.7" />
    ))}
  </svg>
);

// ─── Apothecary glyphs ─────────────────────────────────────────────────
// Same portrait viewBox (48×120) so they sit in the event card column
// just like the botanicals. Each object is centred vertically with a
// small herbarium flourish above and below — keeps the visual cadence
// of the sprigs while delivering the subject specified (ticket, compass,
// origine compass, book).

// Tiny shared flourish — two curved strokes with dots. Reused top/bottom.
const Flourish: React.FC<{ y: number; w?: number }> = ({ y, w = 22 }) => (
  <g>
    <path d={`M ${24 - w / 2} ${y} Q 24 ${y - 2}, ${24 + w / 2} ${y}`}
      fill="none" stroke={INK_SOFT} strokeWidth="0.6" strokeLinecap="round" />
    <circle cx={24 - w / 2} cy={y} r="0.7" fill={INK_SOFT} />
    <circle cx={24}         cy={y - 2} r="0.9" fill={COPPER} fillOpacity="0.6" />
    <circle cx={24 + w / 2} cy={y} r="0.7" fill={INK_SOFT} />
  </g>
);

// ─── Ticket (apothecary admission card) ────────────────────────────────
const Ticket: React.FC = () => (
  <svg viewBox={VB} className="w-full h-full" aria-hidden>
    <Flourish y={22} w={18} />
    {/* Ticket body — rounded rectangle, slight tilt */}
    <g transform="translate(24 62) rotate(-8) translate(-20 -18)">
      {/* Perforated left edge — small semicircle notches */}
      <rect x="0" y="0" width="40" height="36" rx="3" ry="3"
        fill="#F4E7DD" stroke={INK} strokeWidth="0.8" />
      {/* Perforation dashed divider at ~1/3 */}
      <line x1="12" y1="3" x2="12" y2="33"
        stroke={INK} strokeWidth="0.6" strokeDasharray="1.2 1.6" />
      {/* Notches on the outer left + right edges */}
      {[8, 18, 28].map(y => (
        <circle key={`l${y}`} cx="0" cy={y} r="1.3" fill="#F4E7DD" stroke={INK} strokeWidth="0.6" />
      ))}
      {[8, 18, 28].map(y => (
        <circle key={`r${y}`} cx="40" cy={y} r="1.3" fill="#F4E7DD" stroke={INK} strokeWidth="0.6" />
      ))}
      {/* Stub label — small 6-point star */}
      <g transform="translate(6 18)">
        <path d="M 0 -3.2 L 0.9 -0.9 L 3.2 0 L 0.9 0.9 L 0 3.2 L -0.9 0.9 L -3.2 0 L -0.9 -0.9 Z"
          fill={COPPER} fillOpacity="0.75" />
      </g>
      {/* Main text lines */}
      <line x1="17" y1="10" x2="36" y2="10" stroke={INK} strokeWidth="0.8" strokeLinecap="round" />
      <line x1="17" y1="15" x2="33" y2="15" stroke={INK_SOFT} strokeWidth="0.6" strokeLinecap="round" />
      <line x1="17" y1="20" x2="35" y2="20" stroke={INK_SOFT} strokeWidth="0.6" strokeLinecap="round" />
      <line x1="17" y1="25" x2="30" y2="25" stroke={INK_SOFT} strokeWidth="0.6" strokeLinecap="round" />
      {/* Tiny admit flourish line */}
      <path d="M 20 30 Q 26 31, 32 30" fill="none" stroke={COPPER} strokeWidth="0.6" strokeLinecap="round" />
    </g>
    <Flourish y={100} w={22} />
  </svg>
);

// ─── Compass ───────────────────────────────────────────────────────────
const Compass: React.FC = () => (
  <svg viewBox={VB} className="w-full h-full" aria-hidden>
    <Flourish y={22} w={18} />
    <g transform="translate(24 62)">
      {/* Outer rings */}
      <circle r="18" fill="#F4E7DD" stroke={INK} strokeWidth="0.9" />
      <circle r="14.5" fill="none" stroke={INK_SOFT} strokeWidth="0.5" />
      {/* Tick marks around the outer ring — 16 divisions */}
      {Array.from({ length: 16 }, (_, i) => i).map(i => {
        const a = (i * 360) / 16;
        const long = i % 4 === 0;
        const r1 = long ? 15 : 16.5;
        const r2 = 17.5;
        const rad = (a * Math.PI) / 180;
        return (
          <line key={i}
            x1={r1 * Math.cos(rad)} y1={r1 * Math.sin(rad)}
            x2={r2 * Math.cos(rad)} y2={r2 * Math.sin(rad)}
            stroke={INK} strokeWidth={long ? 0.8 : 0.5} strokeLinecap="round" />
        );
      })}
      {/* 4-point star — N/E/S/W arms */}
      {[0, 90, 180, 270].map(a => {
        const rad = (a * Math.PI) / 180;
        const cross = ((a + 90) * Math.PI) / 180;
        const tipX = 13 * Math.cos(rad);
        const tipY = 13 * Math.sin(rad);
        const lX  = 3.2 * Math.cos(cross);
        const lY  = 3.2 * Math.sin(cross);
        const filled = a === 270; // North arm filled darker
        return (
          <path key={a}
            d={`M ${tipX} ${tipY} L ${lX} ${lY} L ${-tipX * 0.12} ${-tipY * 0.12} L ${-lX} ${-lY} Z`}
            fill={filled ? COPPER : '#F4E7DD'}
            fillOpacity={filled ? 0.85 : 1}
            stroke={INK} strokeWidth="0.7" strokeLinejoin="round" />
        );
      })}
      {/* Minor diagonal rays */}
      {[45, 135, 225, 315].map(a => {
        const rad = (a * Math.PI) / 180;
        return (
          <line key={a}
            x1={0} y1={0}
            x2={9 * Math.cos(rad)} y2={9 * Math.sin(rad)}
            stroke={INK_SOFT} strokeWidth="0.55" strokeLinecap="round" />
        );
      })}
      {/* Centre dot */}
      <circle r="1.3" fill={INK} />
      {/* Small "N" mark outside the ring, at top */}
      <text x="0" y="-20.5" textAnchor="middle"
        fontFamily="Cormorant Garamond, serif" fontSize="4.5"
        fill={INK} fontStyle="italic">N</text>
    </g>
    <Flourish y={100} w={22} />
  </svg>
);

// ─── Origine compass — ornate, botanical-infused ───────────────────────
const OrigineCompass: React.FC = () => (
  <svg viewBox={VB} className="w-full h-full" aria-hidden>
    {/* Small laurels curving in from the upper corners */}
    <g opacity="0.85">
      <path d="M 2 42 C 8 36, 14 34, 20 36" fill="none" stroke={INK} strokeWidth="0.7" strokeLinecap="round" />
      {[{ x: 5, y: 41 }, { x: 10, y: 37 }, { x: 15, y: 35 }].map((p, i) => (
        <ellipse key={`l${i}`} cx={p.x} cy={p.y} rx="2.5" ry="1" transform={`rotate(-30 ${p.x} ${p.y})`}
          fill={SAUGE} fillOpacity="0.35" stroke={INK} strokeWidth="0.4" />
      ))}
      <path d="M 46 42 C 40 36, 34 34, 28 36" fill="none" stroke={INK} strokeWidth="0.7" strokeLinecap="round" />
      {[{ x: 43, y: 41 }, { x: 38, y: 37 }, { x: 33, y: 35 }].map((p, i) => (
        <ellipse key={`r${i}`} cx={p.x} cy={p.y} rx="2.5" ry="1" transform={`rotate(30 ${p.x} ${p.y})`}
          fill={SAUGE} fillOpacity="0.35" stroke={INK} strokeWidth="0.4" />
      ))}
    </g>
    <g transform="translate(24 62)">
      {/* Double ring */}
      <circle r="18" fill="#F4E7DD" stroke={INK} strokeWidth="0.9" />
      <circle r="15.5" fill="none" stroke={INK} strokeWidth="0.4" />
      <circle r="12"   fill="none" stroke={INK_SOFT} strokeWidth="0.4" />
      {/* Tick marks at every 30° */}
      {Array.from({ length: 12 }, (_, i) => i).map(i => {
        const a = (i * 30) * Math.PI / 180;
        return (
          <line key={i}
            x1={15.5 * Math.cos(a)} y1={15.5 * Math.sin(a)}
            x2={17.5 * Math.cos(a)} y2={17.5 * Math.sin(a)}
            stroke={INK} strokeWidth={i % 3 === 0 ? 0.9 : 0.5} strokeLinecap="round" />
        );
      })}
      {/* 8-point star — 4 major (filled) + 4 minor */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a, i) => {
        const major = i % 2 === 0;
        const rad = (a * Math.PI) / 180;
        const cross = ((a + 90) * Math.PI) / 180;
        const tipLen = major ? 11.5 : 7.5;
        const width  = major ? 3 : 1.8;
        const tipX = tipLen * Math.cos(rad);
        const tipY = tipLen * Math.sin(rad);
        const lX   = width * Math.cos(cross);
        const lY   = width * Math.sin(cross);
        return (
          <path key={a}
            d={`M ${tipX} ${tipY} L ${lX} ${lY} L ${-tipX * 0.1} ${-tipY * 0.1} L ${-lX} ${-lY} Z`}
            fill={major && a === 270 ? COPPER : '#F4E7DD'}
            fillOpacity={major && a === 270 ? 0.85 : 1}
            stroke={INK} strokeWidth={major ? 0.7 : 0.5} strokeLinejoin="round" />
        );
      })}
      {/* Centre ornament */}
      <circle r="2.2" fill="#F4E7DD" stroke={INK} strokeWidth="0.7" />
      <circle r="0.9" fill={COPPER} fillOpacity="0.9" />
      {/* Cardinal label */}
      <text x="0" y="-20.5" textAnchor="middle"
        fontFamily="Cormorant Garamond, serif" fontSize="5.5"
        fill={INK} fontStyle="italic">O</text>
    </g>
    {/* Small laurels curving in from the lower corners */}
    <g opacity="0.85">
      <path d="M 2 82 C 8 88, 14 90, 20 88" fill="none" stroke={INK} strokeWidth="0.7" strokeLinecap="round" />
      {[{ x: 5, y: 83 }, { x: 10, y: 87 }, { x: 15, y: 89 }].map((p, i) => (
        <ellipse key={`bl${i}`} cx={p.x} cy={p.y} rx="2.5" ry="1" transform={`rotate(30 ${p.x} ${p.y})`}
          fill={SAUGE} fillOpacity="0.35" stroke={INK} strokeWidth="0.4" />
      ))}
      <path d="M 46 82 C 40 88, 34 90, 28 88" fill="none" stroke={INK} strokeWidth="0.7" strokeLinecap="round" />
      {[{ x: 43, y: 83 }, { x: 38, y: 87 }, { x: 33, y: 89 }].map((p, i) => (
        <ellipse key={`br${i}`} cx={p.x} cy={p.y} rx="2.5" ry="1" transform={`rotate(-30 ${p.x} ${p.y})`}
          fill={SAUGE} fillOpacity="0.35" stroke={INK} strokeWidth="0.4" />
      ))}
    </g>
  </svg>
);

// ─── Book (apothecary volume) ──────────────────────────────────────────
const Book: React.FC = () => (
  <svg viewBox={VB} className="w-full h-full" aria-hidden>
    <Flourish y={22} w={18} />
    <g transform="translate(24 62)">
      {/* Open book — two pages meeting at a central spine */}
      {/* Left page */}
      <path d="M -18 -13 Q -9 -15, 0 -12 L 0 14 Q -9 12, -18 14 Z"
        fill="#F4E7DD" stroke={INK} strokeWidth="0.8" strokeLinejoin="round" />
      {/* Right page */}
      <path d="M 18 -13 Q 9 -15, 0 -12 L 0 14 Q 9 12, 18 14 Z"
        fill="#F4E7DD" stroke={INK} strokeWidth="0.8" strokeLinejoin="round" />
      {/* Spine */}
      <line x1="0" y1="-12" x2="0" y2="14" stroke={INK} strokeWidth="0.6" />
      {/* Text lines on the pages */}
      {[-8, -4, 0, 4, 8].map(y => (
        <g key={y}>
          <line x1="-15" y1={y} x2="-3" y2={y} stroke={INK_SOFT} strokeWidth="0.5" strokeLinecap="round" />
          <line x1="3"   y1={y} x2="15" y2={y} stroke={INK_SOFT} strokeWidth="0.5" strokeLinecap="round" />
        </g>
      ))}
      {/* Decorative bookmark hanging from the top of the right page */}
      <path d="M 12 -13 L 12 -6 L 14 -8 L 16 -6 L 16 -13 Z"
        fill={COPPER} fillOpacity="0.75" stroke={INK} strokeWidth="0.4" strokeLinejoin="round" />
      {/* Small label emblem at the top */}
      <g transform="translate(0 -20)">
        <circle r="3" fill="#F4E7DD" stroke={INK} strokeWidth="0.6" />
        <path d="M 0 -1.6 L 0.5 -0.5 L 1.6 0 L 0.5 0.5 L 0 1.6 L -0.5 0.5 L -1.6 0 L -0.5 -0.5 Z"
          fill={COPPER} fillOpacity="0.8" />
      </g>
    </g>
    <Flourish y={100} w={22} />
  </svg>
);

// ─── Retreat (apothecary lantern) ──────────────────────────────────────
// For multi-day retreats — warmth, gathering, quiet flame.
const Retreat: React.FC = () => (
  <svg viewBox={VB} className="w-full h-full" aria-hidden>
    <Flourish y={22} w={18} />
    <g transform="translate(24 62)">
      {/* Top ring hook */}
      <path d="M -4 -28 Q 0 -34, 4 -28" fill="none" stroke={INK} strokeWidth="0.7" strokeLinecap="round" />
      <circle cx="0" cy="-26" r="1" fill={INK} />
      {/* Top cap */}
      <path d="M -10 -22 L 10 -22 L 8 -18 L -8 -18 Z"
        fill="#F4E7DD" stroke={INK} strokeWidth="0.8" strokeLinejoin="round" />
      {/* Lantern body — rounded hexagon */}
      <path d="M -12 -18 L 12 -18 L 14 -4 L 10 10 L -10 10 L -14 -4 Z"
        fill="#F4E7DD" stroke={INK} strokeWidth="0.9" strokeLinejoin="round" />
      {/* Vertical ribs */}
      <line x1="-6" y1="-17" x2="-7" y2="9" stroke={INK_SOFT} strokeWidth="0.5" />
      <line x1="0"  y1="-17" x2="0"  y2="10" stroke={INK_SOFT} strokeWidth="0.5" />
      <line x1="6"  y1="-17" x2="7"  y2="9"  stroke={INK_SOFT} strokeWidth="0.5" />
      {/* Flame glow — warm copper circle */}
      <circle r="3.5" cx="0" cy="-3" fill={COPPER} fillOpacity="0.65" />
      {/* Flame tip */}
      <path d="M 0 -12 Q 2 -8, 0 -4 Q -2 -8, 0 -12 Z"
        fill={COPPER} fillOpacity="0.85" stroke={INK} strokeWidth="0.5" strokeLinejoin="round" />
      {/* Base */}
      <path d="M -12 10 L 12 10 L 10 14 L -10 14 Z"
        fill="#F4E7DD" stroke={INK} strokeWidth="0.7" strokeLinejoin="round" />
    </g>
    <Flourish y={100} w={22} />
  </svg>
);

// ─── Route (winding conference tour path) ──────────────────────────────
const Route: React.FC = () => (
  <svg viewBox={VB} className="w-full h-full" aria-hidden>
    <Flourish y={22} w={18} />
    <g transform="translate(24 62)">
      {/* Winding dashed path from top-right to bottom-left */}
      <path d="M 16 -22 Q 8 -14, 12 -6 Q 16 2, 8 8 Q 0 14, -10 10 Q -18 6, -14 16"
        fill="none" stroke={INK} strokeWidth="1" strokeLinecap="round"
        strokeDasharray="0.1 4" />
      {/* Waypoints — small pins along the path */}
      {[
        { cx: 16, cy: -22 },
        { cx: 12, cy: -6 },
        { cx: 8,  cy: 8 },
        { cx: -10, cy: 10 },
        { cx: -14, cy: 16 },
      ].map((p, i) => (
        <g key={i}>
          {/* Teardrop pin */}
          <path d={`M ${p.cx} ${p.cy - 3.5} Q ${p.cx + 2.5} ${p.cy - 2.5}, ${p.cx + 2.5} ${p.cy - 0.5} Q ${p.cx + 2.5} ${p.cy + 1.5}, ${p.cx} ${p.cy + 3.5} Q ${p.cx - 2.5} ${p.cy + 1.5}, ${p.cx - 2.5} ${p.cy - 0.5} Q ${p.cx - 2.5} ${p.cy - 2.5}, ${p.cx} ${p.cy - 3.5} Z`}
            fill={i === 0 || i === 4 ? COPPER : '#F4E7DD'}
            fillOpacity={i === 0 || i === 4 ? 0.85 : 1}
            stroke={INK} strokeWidth="0.6" strokeLinejoin="round" />
          <circle cx={p.cx} cy={p.cy - 1} r="0.7" fill={INK} />
        </g>
      ))}
      {/* Tiny compass rose at the start */}
      <g transform="translate(-16 -22)">
        <circle r="3" fill="#F4E7DD" stroke={INK} strokeWidth="0.5" />
        <path d="M 0 -2.2 L 0.6 0 L 0 2.2 L -0.6 0 Z" fill={COPPER} fillOpacity="0.8" />
      </g>
    </g>
    <Flourish y={100} w={22} />
  </svg>
);

// ─── Launch (book reveal — ribbon + star) ──────────────────────────────
const Launch: React.FC = () => (
  <svg viewBox={VB} className="w-full h-full" aria-hidden>
    <Flourish y={22} w={18} />
    <g transform="translate(24 62)">
      {/* Large star at top — focal 8-point */}
      <g transform="translate(0 -10)">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a, i) => {
          const major = i % 2 === 0;
          const rad = (a * Math.PI) / 180;
          const cross = ((a + 90) * Math.PI) / 180;
          const tipLen = major ? 10 : 6;
          const width  = major ? 2.5 : 1.5;
          const tipX = tipLen * Math.cos(rad);
          const tipY = tipLen * Math.sin(rad);
          const lX   = width * Math.cos(cross);
          const lY   = width * Math.sin(cross);
          return (
            <path key={a}
              d={`M ${tipX} ${tipY} L ${lX} ${lY} L ${-tipX * 0.1} ${-tipY * 0.1} L ${-lX} ${-lY} Z`}
              fill={major ? COPPER : '#F4E7DD'}
              fillOpacity={major ? 0.85 : 1}
              stroke={INK} strokeWidth="0.6" strokeLinejoin="round" />
          );
        })}
        <circle r="1.4" fill="#F4E7DD" stroke={INK} strokeWidth="0.5" />
      </g>
      {/* Ribbon banner — waving scroll below the star */}
      <path d="M -16 6 Q -8 2, 0 6 Q 8 10, 16 6 L 18 14 Q 10 18, 0 14 Q -10 10, -18 14 Z"
        fill="#F4E7DD" stroke={INK} strokeWidth="0.8" strokeLinejoin="round" />
      {/* Ribbon tails on each side */}
      <path d="M -16 6 L -20 16 L -14 14" fill="#F4E7DD" stroke={INK} strokeWidth="0.6" strokeLinejoin="round" />
      <path d="M 16 6 L 20 16 L 14 14" fill="#F4E7DD" stroke={INK} strokeWidth="0.6" strokeLinejoin="round" />
      {/* Small line of text on the ribbon */}
      <line x1="-10" y1="11" x2="10" y2="11" stroke={INK_SOFT} strokeWidth="0.55" />
    </g>
    <Flourish y={100} w={22} />
  </svg>
);

// ─── Mic (TEDx / talk) ─────────────────────────────────────────────────
const Mic: React.FC = () => (
  <svg viewBox={VB} className="w-full h-full" aria-hidden>
    <Flourish y={22} w={18} />
    <g transform="translate(24 62)">
      {/* Mic head — rounded rectangle */}
      <rect x="-7" y="-22" width="14" height="22" rx="7" ry="7"
        fill="#F4E7DD" stroke={INK} strokeWidth="0.9" />
      {/* Mic grille lines */}
      <line x1="-5" y1="-15" x2="5" y2="-15" stroke={INK_SOFT} strokeWidth="0.5" />
      <line x1="-5" y1="-10" x2="5" y2="-10" stroke={INK_SOFT} strokeWidth="0.5" />
      <line x1="-5" y1="-5"  x2="5" y2="-5"  stroke={INK_SOFT} strokeWidth="0.5" />
      {/* Copper accent band at bottom of the head */}
      <rect x="-7" y="-2" width="14" height="2" fill={COPPER} fillOpacity="0.75" />
      {/* Yoke — arms down to stand */}
      <path d="M -10 -8 Q -12 4, -6 10" fill="none" stroke={INK} strokeWidth="0.9" strokeLinecap="round" />
      <path d="M 10 -8 Q 12 4, 6 10" fill="none" stroke={INK} strokeWidth="0.9" strokeLinecap="round" />
      {/* Stand stem */}
      <line x1="0" y1="10" x2="0" y2="22" stroke={INK} strokeWidth="1" strokeLinecap="round" />
      {/* Base */}
      <ellipse cx="0" cy="24" rx="10" ry="2" fill="#F4E7DD" stroke={INK} strokeWidth="0.8" />
      {/* Sound waves */}
      <path d="M -18 -10 Q -22 -4, -18 2" fill="none" stroke={INK_SOFT} strokeWidth="0.6" strokeLinecap="round" />
      <path d="M -22 -14 Q -28 -4, -22 6" fill="none" stroke={INK_SOFT} strokeWidth="0.5" strokeLinecap="round" opacity="0.7" />
      <path d="M 18 -10 Q 22 -4, 18 2" fill="none" stroke={INK_SOFT} strokeWidth="0.6" strokeLinecap="round" />
      <path d="M 22 -14 Q 28 -4, 22 6" fill="none" stroke={INK_SOFT} strokeWidth="0.5" strokeLinecap="round" opacity="0.7" />
    </g>
    <Flourish y={100} w={22} />
  </svg>
);

const RENDER: Record<Variant, React.FC> = {
  olive:      Olive,
  lavender:   Lavender,
  grass:      Grass,
  pine:       Pine,
  eucalyptus: Eucalyptus,
  bloom:      Bloom,
  ticket:     Ticket,
  compass:    Compass,
  origine:    OrigineCompass,
  book:       Book,
  retreat:    Retreat,
  route:      Route,
  launch:     Launch,
  mic:        Mic,
};

interface Props {
  /** Stable id used to pick one of six sprig variants */
  seed?: string;
  /** Explicit variant override */
  variant?: Variant;
  /** Tile size — default is the event-card portrait format */
  sizeClass?: string;
  /** If true, render the sprig inside a soft ivoire medallion (moodboard
   *  doorway tiles style). Event cards use the bare illustration — no frame. */
  framed?: boolean;
  className?: string;
}

const OrigineSprig: React.FC<Props> = ({
  seed, variant, sizeClass, framed = false, className = '',
}) => {
  const V = RENDER[variant || pick(seed)];
  const defaultSize = framed
    ? 'w-[72px] h-[72px] md:w-[88px] md:h-[88px]'
    : 'w-[56px] h-[124px] md:w-[72px] md:h-[150px]';
  const size = sizeClass || defaultSize;

  if (framed) {
    return (
      <div
        className={`shrink-0 ${size} rounded-full flex items-center justify-center relative ${className}`}
        style={{
          background: 'radial-gradient(circle at 35% 30%, #F4E7DD 0%, #EAD0B9 80%)',
          border: '1px solid rgba(184,83,47,0.35)',
          boxShadow: '0 6px 18px rgba(107,74,47,0.08), inset 0 0 22px rgba(232,208,190,0.6)',
        }}
        aria-hidden
      >
        <div className="w-[70%] h-[70%] flex items-center justify-center">
          <V />
        </div>
      </div>
    );
  }

  // Bare herbarium illustration — no container, no border, no shadow.
  return (
    <div className={`shrink-0 ${size} flex items-end justify-center ${className}`} aria-hidden>
      <V />
    </div>
  );
};

export default OrigineSprig;
