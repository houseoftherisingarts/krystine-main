import React, { useState } from 'react';
import { Card } from '../primitives';
import MurSocial from '../../../components/communaute/MurSocial';
import type { FilMur } from '../../../firebase/mur';

// ─── Le feed public, depuis l'admin ─────────────────────────────────────────
// Seule Krystine publie dans le feed public : les membres commentent et
// votent, elles publient elles-mêmes dans le Foyer d'Origine. Le sélecteur
// laisse Krystine choisir où va son prochain billet, sans changer de section.

const DESTINATIONS: Array<{ fil: FilMur; label: string }> = [
  { fil: 'communaute', label: 'Feed public' },
  { fil: 'formation:foyer', label: 'Feed Foyer d’Origine' },
];

const FeedPublicSection: React.FC = () => {
  const [fil, setFil] = useState<FilMur>('communaute');

  return (
    <div className="max-w-3xl space-y-6">
      <Card className="p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">Le feed public</p>
        <p className="mt-1 text-sm text-[#293027]/60 dark:text-white/60">
          Seule Krystine publie ici. Les membres commentent et réagissent. Elles publient elles-mêmes dans le Foyer d'Origine.
        </p>
      </Card>
      <Card className="p-6">
        <div className="mb-5 inline-flex rounded-full border border-[#38403a]/10 p-1 dark:border-white/10">
          {DESTINATIONS.map(d => (
            <button
              key={d.fil}
              type="button"
              onClick={() => setFil(d.fil)}
              className={`rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                fil === d.fil
                  ? 'bg-[#BA7B39] text-[#293027]'
                  : 'text-[#293027]/60 hover:text-[#8B4A2F] dark:text-white/60'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <p className="mb-5 text-sm text-[#293027]/60 dark:text-white/60">
          {fil === 'communaute'
            ? 'Ce que vous publiez ici paraît aussitôt sur le feed du site, pour toute la communauté.'
            : 'Ce que vous publiez ici paraît dans le feed du Foyer, vu par celles qui ont le cours.'}
        </p>
        <MurSocial fil={fil} titre="" />
      </Card>
    </div>
  );
};

export default FeedPublicSection;
