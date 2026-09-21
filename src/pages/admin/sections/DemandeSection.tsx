import React from 'react';
import type { User } from 'firebase/auth';
import DemandeVexel from '../../../components/admin/DemandeVexel';
import { Card } from '../primitives';

const DemandeSection: React.FC<{ user: User }> = ({ user }) => (
  <Card className="p-6 md:p-8">
    <h2 className="font-serif text-2xl text-[#293027] dark:text-white mb-2">Demander un changement</h2>
    <p className="text-sm text-[#293027]/70 dark:text-white/70 mb-6 max-w-xl">
      Ce que vous voulez voir changer sur votre site, écrit ou dicté. La demande arrive au studio à l’instant et vous suivez ce que nous en avons compris.
    </p>
    <DemandeVexel nom={user.displayName || ''} courriel={user.email || ''} ton="clair" />
  </Card>
);

export default DemandeSection;
