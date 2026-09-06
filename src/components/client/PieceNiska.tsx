import React from 'react';

// Le niska : dans le Rig-Véda, un ornement d'or porté au cou. La pièce est
// donc un disque d'or percé en son centre, comme les pièces qu'on enfilait
// sur un cordon : bord grené, anneau biseauté, seize rayons gravés (les
// seize māṣas des Lois de Manu) et une échancrure de cordon en haut.
// Dessin original, SVG, pour vivre à toutes les tailles.
const PieceNiska: React.FC<{ size?: number; className?: string; eteinte?: boolean }> = ({ size = 22, className = '', eteinte }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true" style={eteinte ? { filter: 'grayscale(1)', opacity: 0.45 } : undefined}>
    <defs>
      <radialGradient id="niska-or" cx="35%" cy="28%" r="80%">
        <stop offset="0" stopColor="#f6e3a8" />
        <stop offset="0.5" stopColor="#d6ae5e" />
        <stop offset="1" stopColor="#87672a" />
      </radialGradient>
      <radialGradient id="niska-bord" cx="50%" cy="50%" r="50%">
        <stop offset="0.86" stopColor="#c9a052" />
        <stop offset="1" stopColor="#7a5c22" />
      </radialGradient>
      <mask id="niska-trou">
        <rect width="48" height="48" fill="white" />
        <circle cx="24" cy="24" r="7.2" fill="black" />
      </mask>
    </defs>
    <g mask="url(#niska-trou)">
      <circle cx="24" cy="24" r="23" fill="url(#niska-or)" />
      <circle cx="24" cy="24" r="23" fill="url(#niska-bord)" opacity="0.55" />
      {/* Les seize rayons gravés */}
      <g stroke="#7a5c22" strokeWidth="0.9" strokeLinecap="round" opacity="0.75">
        {Array.from({ length: 16 }, (_, i) => {
          const a = (i * Math.PI * 2) / 16;
          const r1 = 10.5; const r2 = 17.5;
          return <line key={i} x1={24 + Math.cos(a) * r1} y1={24 + Math.sin(a) * r1} x2={24 + Math.cos(a) * r2} y2={24 + Math.sin(a) * r2} />;
        })}
      </g>
      <circle cx="24" cy="24" r="18.5" fill="none" stroke="#f6e3a8" strokeWidth="0.7" opacity="0.9" />
      <circle cx="24" cy="24" r="9.3" fill="none" stroke="#f6e3a8" strokeWidth="0.8" />
      <circle cx="24" cy="24" r="8.2" fill="none" stroke="#6f5320" strokeWidth="1.1" />
      {/* Le bord grené */}
      <circle cx="24" cy="24" r="22.2" fill="none" stroke="#6f5320" strokeWidth="0.9" strokeDasharray="1 1.5" opacity="0.7" />
      {/* L'échancrure du cordon, en haut */}
      <path d="M21 2.4a3.2 3.2 0 0 0 6 0" fill="none" stroke="#6f5320" strokeWidth="1.1" strokeLinecap="round" />
    </g>
    {/* Le reflet dans le trou : l'ombre intérieure du percement */}
    <circle cx="24" cy="24" r="7.2" fill="none" stroke="#5c4418" strokeWidth="0.8" opacity="0.6" />
  </svg>
);

export default PieceNiska;
