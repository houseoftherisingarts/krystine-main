import React, { useEffect, useState } from 'react';
import { CATALOGUE_BADGES, badgeVedetteEnCache } from '../../firebase/badgesCatalogue';

// Le badge en vedette d'une membre, à côté de son nom dans les clavardages,
// le fil et l'annuaire (Alex, 6 sept. 2026, « comme All Star Contributor
// dans les groupes Facebook »). Une pastille laiton, icône et nom.
const BadgeVedette: React.FC<{ uid: string; sombre?: boolean; className?: string }> = ({ uid, sombre = false, className = '' }) => {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => { let vivant = true; badgeVedetteEnCache(uid).then(b => { if (vivant) setId(b); }); return () => { vivant = false; }; }, [uid]);
  if (!id || !CATALOGUE_BADGES[id]) return null;
  const b = CATALOGUE_BADGES[id];
  return (
    <span
      title={b.nom}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-[2px] align-middle text-[9px] font-sans font-bold uppercase tracking-[0.14em] leading-none ${
        sombre ? 'border-[#c8a86a]/45 bg-[#c8a86a]/12 text-[#E6C79B]' : 'border-[#BA7B39]/40 bg-[#BA7B39]/10 text-[#8B4A2F] dark:border-[#d9a05b]/40 dark:bg-[#d9a05b]/10 dark:text-[#d9a05b]'
      } ${className}`}
    >
      <i className={`fa-solid ${b.icone} text-[8px]`} aria-hidden="true" /> {b.nom}
    </span>
  );
};

export default BadgeVedette;
