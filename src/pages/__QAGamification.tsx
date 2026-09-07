import React from 'react';
import { useAuth } from '../contexts/AppContext';
import GamificationSection from './admin/sections/GamificationSection';
import { RangeePersonne } from '../components/communaute/CarteSociale';
import { ADMIN_EMAILS } from '../firebase/auth';

// Harnais TEMPORAIRE de vérification visuelle — à retirer avec sa route dans
// App.tsx dès les captures prises (Alex ne touche jamais AdminShell.tsx ni
// AdminDashboard.tsx pour cette tâche). Deux preuves, avec les VRAIS
// composants (jamais une maquette) :
//  1. L'onglet Gamification, tel qu'il vivra dans /admin.
//  2. RangeePersonne (CarteSociale.tsx) posée deux fois avec le VRAI
//     composant : un courriel de l'équipe, un courriel ordinaire — pour
//     montrer que seule l'équipe garde la coche quand « Équipe seulement »
//     est ouvert (settings/gamification.badgeBleuEquipeSeulement).
const QAGamification: React.FC = () => {
  const { user } = useAuth();
  return (
    <div className="min-h-screen space-y-10 bg-[#EEE7DB] p-6 dark:bg-[#151d19] md:p-8">
      <GamificationSection user={user ?? undefined} />

      <div className="mx-auto max-w-3xl rounded-[18px] border border-[#293027]/10 bg-white/60 p-6 dark:border-white/10 dark:bg-white/5">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">Preuve — Badge bleu équipe seulement</p>
        <p className="mt-1 text-sm text-[#293027]/60 dark:text-white/60">RangeePersonne, le vrai composant, avec deux comptes différents.</p>
        <div className="mt-4 space-y-2">
          <RangeePersonne uid="qa-equipe" nom="Krystine St-Laurent (équipe)" verifie={false} email={ADMIN_EMAILS[1]} />
          <RangeePersonne uid="qa-ordinaire" nom="Membre ordinaire" verifie email="membre.ordinaire@example.com" />
        </div>
      </div>
    </div>
  );
};

export default QAGamification;
