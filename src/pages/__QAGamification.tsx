import React from 'react';
import { useAuth } from '../contexts/AppContext';
import GamificationSection from './admin/sections/GamificationSection';

// Harnais TEMPORAIRE de vérification visuelle pour l'onglet Gamification —
// à retirer avec sa route dans App.tsx dès les captures prises (Alex ne
// touche jamais AdminShell.tsx/AdminDashboard.tsx pour cette tâche).
const QAGamification: React.FC = () => {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-[#EEE7DB] p-6 dark:bg-[#151d19] md:p-8">
      <GamificationSection user={user ?? undefined} />
    </div>
  );
};

export default QAGamification;
