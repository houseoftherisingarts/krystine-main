import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import CadreFoyer from '../components/communaute/CadreFoyer';
import MurSocial from '../components/communaute/MurSocial';
import type { FilMur } from '../firebase/mur';

// ─── Le fil du Foyer d'Origine (/foyer/fil) ──────────────────────────
// LE mur du site : le Foyer d'Origine est le seul groupe social (Alex,
// 7 septembre 2026). « Le mur » est le fil participatif où les membres
// publient (formation:foyer); « Krystine » porte ses annonces à elle, où elle
// seule publie. Le fil public « communaute » est retiré. Le choix vit dans
// ?fil= pour que la cloche puisse y mener. Porté du mur social du FMM 2026.
const FILS: ReadonlyArray<{ cle: string; fil: FilMur; fr: string; en: string }> = [
  { cle: 'krystine', fil: 'krystine', fr: 'Krystine', en: 'Krystine' },
  { cle: 'foyer', fil: 'formation:foyer', fr: 'Mur commun', en: 'Common wall' },
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
