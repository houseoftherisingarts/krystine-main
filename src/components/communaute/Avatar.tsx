import React from 'react';

// ─── Le médaillon ────────────────────────────────────────────────────
// Même dessin que celui de BilletCarte.tsx, partagé ici pour l'annuaire,
// le profil public et la boîte de réception.
const Avatar: React.FC<{ nom: string; url?: string; taille?: number }> = ({ nom, url, taille = 44 }) => (
  <span
    className="rounded-full overflow-hidden shrink-0 border border-[#BA7B39]/30 bg-[#EEE7DB] dark:bg-white/10 flex items-center justify-center font-serif text-[#8B4A2F] dark:text-white/80"
    style={{ width: taille, height: taille, fontSize: taille * 0.4 }}
  >
    {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : (nom || '?').slice(0, 1).toUpperCase()}
  </span>
);

export default Avatar;
