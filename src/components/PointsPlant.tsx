import React, { useState } from 'react';
import { TIERS } from '../lib/pointsConfig';

// La plante des niskas gagnés : dix figurines (graine, pousse, tige, fleur,
// arbrisseau, arbre, arbre aux lotus, bosquet, forêt, grand jardin avec sa
// source), rendues en 3D et détourées (/compte/plante/{stade}.webp, Alex,
// 6 septembre 2026). Le halo et le flottement sont les mêmes à tous les
// stades pour que la tuile reste une seule chose qui grandit. Si l'image ne
// charge pas, un dessin SVG sobre prend la place.

type Stage = string;

interface Props {
  stage: Stage;
  /** La teinte du palier courant : elle colore le halo. */
  accent?: string;
  className?: string;
}

const PointsPlant: React.FC<Props> = ({ stage, accent = '#bb9a5e', className = '' }) => {
  const [echec, setEchec] = useState(false);
  const connu = TIERS.some(t => t.id === stage) ? stage : TIERS[0].id;
  const rang = Math.max(0, TIERS.findIndex(t => t.id === connu));
  // Les grands stades (bosquet, forêt, jardin) prennent toute la tuile; les
  // premiers restent plus petits, comme une chose qui grandit pour vrai.
  const echelle = 0.62 + (rang / (TIERS.length - 1)) * 0.38;
  return (
    <div className={`relative aspect-square w-full ${className}`}>
      <div className="absolute inset-0 rounded-[24px]" style={{ background: `radial-gradient(circle at 50% 58%, ${accent}33 0%, ${accent}12 45%, transparent 72%)` }} aria-hidden />
      {!echec ? (
        <img
          key={connu}
          src={`/compte/plante/${connu}.webp`}
          alt=""
          aria-hidden
          draggable={false}
          onError={() => setEchec(true)}
          className="pp-float absolute inset-0 m-auto select-none object-contain drop-shadow-[0_18px_22px_rgba(41,48,39,0.25)]"
          style={{ width: `${Math.round(echelle * 100)}%`, height: `${Math.round(echelle * 100)}%` }}
        />
      ) : (
        <svg viewBox="0 0 200 200" className="pp-float absolute inset-0 h-full w-full" aria-hidden>
          <ellipse cx="100" cy="160" rx="60" ry="12" fill="#4E3520" />
          <path d="M100 160 Q 98 110 100 70" stroke="#6F8C4E" strokeWidth="4" strokeLinecap="round" fill="none" />
          <ellipse cx="100" cy="70" rx={14 + rang * 3} ry={12 + rang * 2.5} fill="#7FA36A" />
        </svg>
      )}
      <style>{`
        @keyframes pp-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-4px) } }
        .pp-float { animation: pp-float 5s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .pp-float { animation: none } }
      `}</style>
    </div>
  );
};

export default PointsPlant;
export type { Stage };
