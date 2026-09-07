import React from 'react';

// ─── Le sceau de la maison ────────────────────────────────────────────
// L'étiquette « Équipe KSL » ne porte jamais la photo de Krystine (Alex,
// 7 septembre 2026) : cet anneau laiton et cette flamme sont déjà la
// signalétique du Foyer d'Origine partout ailleurs (badge « Foyer
// d'Origine » dans CadreFoyer et BilletCarte, MotDuFoyer). Un seul motif,
// jamais un nouveau.
const SceauKSL: React.FC<{ taille?: number; className?: string }> = ({ taille = 36, className = '' }) => (
  <div
    role="img"
    aria-label="Équipe KSL"
    className={`inline-flex shrink-0 items-center justify-center rounded-full border-2 border-[#BA7B39] bg-[#293027] text-[#d9a05b] ${className}`}
    style={{ width: taille, height: taille }}
  >
    <i className="fa-solid fa-fire" style={{ fontSize: taille * 0.42 }} />
  </div>
);

export default SceauKSL;
