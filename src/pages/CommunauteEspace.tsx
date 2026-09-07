import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import CadreFoyer from '../components/communaute/CadreFoyer';
import MurSocial from '../components/communaute/MurSocial';
import type { FilMur } from '../firebase/mur';

// ─── Le fil du Foyer d'Origine (/foyer/fil) ──────────────────────────
// La page du fil dans la coquille du Foyer social (CadreFoyer) : trois fils
// au choix, en pilules. « Foyer » est le fil participatif de la formation
// (formation:foyer, où les membres publient), « Krystine » porte ses annonces
// (elle seule y publie) et « Communauté » est le fil public. Le choix vit
// dans ?fil= pour que la cloche puisse y mener. Porté du mur social du FMM 2026.
const FILS: ReadonlyArray<{ cle: string; fil: FilMur; fr: string; en: string }> = [
  { cle: 'foyer', fil: 'formation:foyer', fr: 'Foyer', en: 'Hearth' },
  { cle: 'krystine', fil: 'krystine', fr: 'Krystine', en: 'Krystine' },
  { cle: 'communaute', fil: 'communaute', fr: 'Communauté', en: 'Community' },
];

const CommunauteEspace: React.FC = () => {
  const { lang } = useApp();
  const fr = lang === 'FR';
  const [params, setParams] = useSearchParams();
  const actif = FILS.find(f => f.cle === params.get('fil')) ?? FILS[0];

  return (
    <CadreFoyer onglet="fil">
      <div className="flex flex-wrap gap-2">
        {FILS.map(f => (
          <button
            key={f.cle}
            type="button"
            onClick={() => setParams({ fil: f.cle }, { replace: true })}
            aria-pressed={f === actif}
            className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${
              f === actif ? 'bg-[#BA7B39] text-[#293027]' : 'bg-[#BA7B39]/12 text-[#8B4A2F] hover:bg-[#BA7B39]/25 dark:text-[#d9a05b]'
            }`}
          >
            {fr ? f.fr : f.en}
          </button>
        ))}
      </div>
      <MurSocial fil={actif.fil} />
    </CadreFoyer>
  );
};

export default CommunauteEspace;
