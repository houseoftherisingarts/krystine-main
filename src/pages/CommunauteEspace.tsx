import React, { useState } from 'react';
import { useAuth } from '../contexts/AppContext';
import MurSocial from '../components/communaute/MurSocial';

// ─── L'espace Communauté ─────────────────────────────────────────────
// Deux fils côte à côte sur bureau, deux onglets sur mobile : « Krystine »
// (annonces officielles, elle seule y publie) et « Communauté » (tout
// membre connecté). Porté du mur social du FMM 2026.
const CommunauteEspace: React.FC = () => {
  const { user, setSignInOpen } = useAuth();
  const [onglet, setOnglet] = useState<'krystine' | 'communaute'>('krystine');

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f6f3ee] dark:bg-[#16100a] pt-32 pb-24 px-6">
        <div className="max-w-md mx-auto text-center">
          <h1 className="font-serif text-3xl text-[#2a2015] dark:text-white mb-4">Communauté</h1>
          <p className="text-[#3a3126]/60 dark:text-white/60 mb-8">
            Connectez-vous pour lire et publier dans la communauté.
          </p>
          <button
            onClick={() => setSignInOpen(true)}
            className="bg-[#2a2015] dark:bg-[#bb9a5e] text-white dark:text-[#2a2015] px-10 py-4 rounded-full font-bold uppercase tracking-widest text-xs shadow-lg hover:bg-[#bb9a5e] hover:text-[#2a2015] transition-colors"
          >
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f3ee] dark:bg-[#16100a] pt-28 pb-24">
      <div className="w-full px-6 md:px-8 lg:px-10">
        <h1 className="font-serif text-3xl md:text-4xl text-[#2a2015] dark:text-white mb-8">Communauté</h1>

        {/* Onglets — mobile seulement, les deux colonnes restent visibles ensemble sur bureau. */}
        <div className="flex md:hidden gap-2 mb-6">
          {(['krystine', 'communaute'] as const).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setOnglet(o)}
              className={`flex-1 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
                onglet === o
                  ? 'bg-[#2a2015] dark:bg-[#bb9a5e] text-white dark:text-[#2a2015]'
                  : 'bg-white/60 dark:bg-white/5 text-[#3a3126]/60 dark:text-white/60 border border-[#3a3126]/10 dark:border-white/10'
              }`}
            >
              {o === 'krystine' ? 'Krystine' : 'Communauté'}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className={onglet === 'krystine' ? 'block' : 'hidden md:block'}>
            <MurSocial fil="krystine" titre="Krystine" />
          </div>
          <div className={onglet === 'communaute' ? 'block' : 'hidden md:block'}>
            <MurSocial fil="communaute" titre="Feed" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunauteEspace;
