import React, { useState } from 'react';

// Le niska : dans le Rig-Véda, un ornement d'or porté au cou. La pièce est
// donc un disque d'or percé en son centre, comme les pièces qu'on enfilait
// sur un cordon : bord grené, seize rayons gravés (les seize māṣas des Lois
// de Manu). Comme le Montpellois du FMM, l'icône est une vraie photographie
// de pièce (/niska.webp, fond détouré) avec repli sur le dessin SVG si le
// fichier ne charge pas (Alex, 6 septembre 2026 : « l'icône ressemble trop
// à un ananas »).
const PieceNiska: React.FC<{ size?: number; className?: string; eteinte?: boolean }> = ({ size = 22, className = '', eteinte }) => {
  const [echec, setEchec] = useState(false);
  const style = eteinte ? { filter: 'grayscale(1)', opacity: 0.45 } : undefined;
  if (!echec) {
    return (
      <img
        src="/niska.webp"
        alt=""
        width={size}
        height={size}
        aria-hidden="true"
        draggable={false}
        className={`inline-block select-none ${className}`}
        style={{ width: size, height: size, objectFit: 'contain', ...style }}
        onError={() => setEchec(true)}
      />
    );
  }
  return (
  <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true" style={style}>
    <defs>
      <radialGradient id="niska-or" cx="35%" cy="28%" r="80%">
        <stop offset="0" stopColor="#f6e3a8" />
        <stop offset="0.5" stopColor="#d6ae5e" />
        <stop offset="1" stopColor="#87672a" />
      </radialGradient>
      <mask id="niska-trou">
        <rect width="48" height="48" fill="white" />
        <circle cx="24" cy="24" r="5" fill="black" />
      </mask>
    </defs>
    <g mask="url(#niska-trou)">
      <circle cx="24" cy="24" r="23" fill="url(#niska-or)" />
      <g stroke="#7a5c22" strokeWidth="1.1" strokeLinecap="round" opacity="0.75">
        {Array.from({ length: 16 }, (_, i) => {
          const a = (i * Math.PI * 2) / 16;
          return <line key={i} x1={24 + Math.cos(a) * 8} y1={24 + Math.sin(a) * 8} x2={24 + Math.cos(a) * 19} y2={24 + Math.sin(a) * 19} />;
        })}
      </g>
      <circle cx="24" cy="24" r="21.5" fill="none" stroke="#6f5320" strokeWidth="1" strokeDasharray="1 1.6" opacity="0.7" />
    </g>
    <circle cx="24" cy="24" r="5" fill="none" stroke="#5c4418" strokeWidth="0.8" opacity="0.6" />
  </svg>
  );
};

export default PieceNiska;
