import React, { useEffect, useState } from 'react';

// ─── Le médaillon ────────────────────────────────────────────────────
// Le seul dessin d'avatar du Foyer social : l'annuaire, la fiche, les
// rangées de personne, la boîte de réception et les billets. Quand la photo
// ne charge pas (les photos Google expirent), l'initiale reprend sa place.
const Avatar: React.FC<{ nom: string; url?: string; taille?: number; className?: string }> = ({ nom, url, taille = 44, className = '' }) => {
  const [casse, setCasse] = useState(false);
  useEffect(() => { setCasse(false); }, [url]);
  return (
    <span
      className={`rounded-full overflow-hidden shrink-0 border border-[#BA7B39]/30 bg-[#EEE7DB] dark:bg-white/10 flex items-center justify-center font-serif text-[#8B4A2F] dark:text-white/80 ${className}`}
      style={{ width: taille, height: taille, fontSize: taille * 0.4 }}
    >
      {url && !casse
        ? <img src={url} alt="" className="w-full h-full object-cover" onError={() => setCasse(true)} />
        : (nom || '?').slice(0, 1).toUpperCase()}
    </span>
  );
};

export default Avatar;
