import React from 'react';

// La pièce de fanam : un disque d'or à bord grené et une fleur de lotus au
// centre, dessinée en SVG pour vivre à toutes les tailles (puce du haut,
// boutique, roue des sept jours). Un seul accent, le laiton de L'Œuvre.
const PieceFanam: React.FC<{ size?: number; className?: string; eteinte?: boolean }> = ({ size = 22, className = '', eteinte }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true" style={eteinte ? { filter: 'grayscale(1)', opacity: 0.45 } : undefined}>
    <defs>
      <radialGradient id="fanam-or" cx="35%" cy="30%" r="75%">
        <stop offset="0" stopColor="#f3dfa6" />
        <stop offset="0.55" stopColor="#d4ac5c" />
        <stop offset="1" stopColor="#8a6a2c" />
      </radialGradient>
      <radialGradient id="fanam-creux" cx="50%" cy="45%" r="60%">
        <stop offset="0" stopColor="#c9a052" />
        <stop offset="1" stopColor="#a67f38" />
      </radialGradient>
    </defs>
    <circle cx="24" cy="24" r="23" fill="url(#fanam-or)" />
    <circle cx="24" cy="24" r="23" fill="none" stroke="#6f5320" strokeWidth="1" strokeDasharray="1.2 1.6" opacity="0.7" />
    <circle cx="24" cy="24" r="17.5" fill="url(#fanam-creux)" stroke="#f1dca4" strokeWidth="0.8" opacity="0.95" />
    {/* La fleur de lotus, cinq pétales */}
    <g fill="#f6e7bd" stroke="#7a5c22" strokeWidth="0.6" strokeLinejoin="round">
      <path d="M24 14c3 3.4 3 9.4 0 12.8-3-3.4-3-9.4 0-12.8z" />
      <path d="M17.2 17.4c4.2 1.2 7.4 6 6.6 10.6-4.2-1.2-7.4-6-6.6-10.6z" />
      <path d="M30.8 17.4c-4.2 1.2-7.4 6-6.6 10.6 4.2-1.2 7.4-6 6.6-10.6z" />
      <path d="M12.6 23.6c4.4-.6 9 2.2 10.6 6.4-4.4.6-9-2.2-10.6-6.4z" />
      <path d="M35.4 23.6c-4.4-.6-9 2.2-10.6 6.4 4.4.6 9-2.2 10.6-6.4z" />
    </g>
    <path d="M15.5 32.5c5.5 2.6 11.5 2.6 17 0" fill="none" stroke="#f6e7bd" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);

export default PieceFanam;
