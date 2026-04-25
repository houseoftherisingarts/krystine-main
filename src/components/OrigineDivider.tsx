import React from 'react';

// Ornement éditorial Origine — séparateur discret, à glisser entre les
// sections ou en sous-titre. Trois variantes :
//
//   laurel    — deux petits rameaux qui convergent vers un losange copper
//   compass   — un point central cerclé, entouré d'une ligne fine
//   bloom     — pointillé de 3 boutons copper sur une ligne sauge
//
// Par défaut : largeur 140px, hauteur 20px. Prop `width` accepte une
// chaîne Tailwind pour ajuster.

type Variant = 'laurel' | 'compass' | 'bloom';

interface Props {
  variant?: Variant;
  className?: string;
}

const INK    = '#8B674A';
const COPPER = '#B8532F';
const SAUGE  = '#8A8F72';

const Laurel: React.FC = () => (
  <svg viewBox="0 0 200 30" className="w-full h-full" aria-hidden>
    {/* Ligne centrale très fine */}
    <line x1="40" y1="15" x2="160" y2="15" stroke={INK} strokeWidth="0.5" opacity="0.6" />
    {/* Rameau gauche — trois petites feuilles */}
    <path d="M 30 15 Q 20 10, 10 8"  fill="none" stroke={INK} strokeWidth="0.8" strokeLinecap="round" />
    {[
      { x: 24, y: 12, r: -30 },
      { x: 18, y: 10, r: -25 },
      { x: 12, y: 9,  r: -20 },
    ].map((p, i) => (
      <ellipse key={i} cx={p.x} cy={p.y} rx="2.2" ry="0.9"
        transform={`rotate(${p.r} ${p.x} ${p.y})`}
        fill={SAUGE} fillOpacity="0.5" stroke={INK} strokeWidth="0.4" />
    ))}
    {/* Losange central copper */}
    <g transform="translate(100 15)">
      <path d="M 0 -4 L 3 0 L 0 4 L -3 0 Z" fill={COPPER} fillOpacity="0.85" stroke={INK} strokeWidth="0.5" strokeLinejoin="round" />
      <circle r="0.9" fill="#F4E7DD" />
    </g>
    {/* Rameau droit — miroir */}
    <path d="M 170 15 Q 180 10, 190 8" fill="none" stroke={INK} strokeWidth="0.8" strokeLinecap="round" />
    {[
      { x: 176, y: 12, r: 30 },
      { x: 182, y: 10, r: 25 },
      { x: 188, y: 9,  r: 20 },
    ].map((p, i) => (
      <ellipse key={i} cx={p.x} cy={p.y} rx="2.2" ry="0.9"
        transform={`rotate(${p.r} ${p.x} ${p.y})`}
        fill={SAUGE} fillOpacity="0.5" stroke={INK} strokeWidth="0.4" />
    ))}
  </svg>
);

const Compass: React.FC = () => (
  <svg viewBox="0 0 200 30" className="w-full h-full" aria-hidden>
    <line x1="0" y1="15" x2="80" y2="15" stroke={INK} strokeWidth="0.4" opacity="0.5" />
    <line x1="120" y1="15" x2="200" y2="15" stroke={INK} strokeWidth="0.4" opacity="0.5" />
    {/* Emblème central — cercle avec quatre petits rais */}
    <g transform="translate(100 15)">
      <circle r="6.5" fill="none" stroke={INK} strokeWidth="0.6" />
      <circle r="1.2" fill={COPPER} fillOpacity="0.9" />
      {[0, 90, 180, 270].map(a => {
        const r = (a * Math.PI) / 180;
        return (
          <line key={a}
            x1={5 * Math.cos(r)} y1={5 * Math.sin(r)}
            x2={8 * Math.cos(r)} y2={8 * Math.sin(r)}
            stroke={INK} strokeWidth="0.6" strokeLinecap="round" />
        );
      })}
    </g>
  </svg>
);

const Bloom: React.FC = () => (
  <svg viewBox="0 0 200 30" className="w-full h-full" aria-hidden>
    <line x1="30" y1="15" x2="170" y2="15" stroke={SAUGE} strokeWidth="0.55" opacity="0.7" />
    <circle cx="85"  cy="15" r="1.6" fill={COPPER} fillOpacity="0.85" />
    <circle cx="100" cy="15" r="2.0" fill={COPPER} fillOpacity="0.9" />
    <circle cx="115" cy="15" r="1.6" fill={COPPER} fillOpacity="0.85" />
    {/* Petites feuilles sauge aux extrémités */}
    <ellipse cx="24" cy="15" rx="4" ry="1.2" fill={SAUGE} fillOpacity="0.4" stroke={INK} strokeWidth="0.4" />
    <ellipse cx="176" cy="15" rx="4" ry="1.2" fill={SAUGE} fillOpacity="0.4" stroke={INK} strokeWidth="0.4" />
  </svg>
);

const RENDER: Record<Variant, React.FC> = {
  laurel:  Laurel,
  compass: Compass,
  bloom:   Bloom,
};

const OrigineDivider: React.FC<Props> = ({ variant = 'laurel', className = '' }) => {
  const V = RENDER[variant];
  return (
    <div
      className={`mx-auto my-10 md:my-14 w-[180px] md:w-[220px] h-[22px] md:h-[26px] opacity-80 ${className}`}
      aria-hidden
    >
      <V />
    </div>
  );
};

export default OrigineDivider;
