import React from 'react';
import type { User } from 'firebase/auth';
import { ADMIN_EMAILS, logout } from '../../../firebase/auth';
import { Card, DangerButton } from '../primitives';

const SettingsSection: React.FC<{ user: User }> = ({ user }) => {
  const firebaseProject = (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || 'non configuré';
  const shopifyDomain = (import.meta.env.VITE_SHOPIFY_DOMAIN as string) || 'non configuré';

  return (
    <div className="space-y-6 max-w-3xl">
      <Card className="p-6">
        <h3 className="text-sm uppercase tracking-widest text-[#0B1A36]/60 dark:text-white/60 font-bold mb-4">Compte connecté</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {user.photoURL && <img src={user.photoURL} alt="" className="w-12 h-12 rounded-full border border-[#D4AF37]/30" />}
            <div>
              <p className="font-serif text-[#0B1A36] dark:text-white">{user.displayName || user.email?.split('@')[0]}</p>
              <p className="text-sm text-[#0B1A36]/50 dark:text-white/50">{user.email}</p>
            </div>
          </div>
          <DangerButton onClick={logout}><i className="fa-solid fa-right-from-bracket" /> Déconnexion</DangerButton>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-sm uppercase tracking-widest text-[#0B1A36]/60 dark:text-white/60 font-bold mb-4">Administrateurs autorisés</h3>
        <p className="text-xs text-[#0B1A36]/50 dark:text-white/50 mb-4">
          Pour ajouter ou retirer un administrateur, modifiez la constante <code className="bg-[#F5F5F0] dark:bg-white/10 px-2 py-0.5 rounded text-[11px]">ADMIN_EMAILS</code> dans <code className="bg-[#F5F5F0] dark:bg-white/10 px-2 py-0.5 rounded text-[11px]">src/firebase/auth.ts</code>.
        </p>
        <ul className="space-y-2">
          {ADMIN_EMAILS.map(email => (
            <li key={email} className="flex items-center gap-3 text-sm text-[#0B1A36] dark:text-white">
              <i className="fa-solid fa-user-shield text-[#D4AF37]" />
              <span>{email}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-6">
        <h3 className="text-sm uppercase tracking-widest text-[#0B1A36]/60 dark:text-white/60 font-bold mb-4">Infrastructure</h3>
        <dl className="space-y-3 text-sm">
          <div className="flex items-start justify-between gap-4">
            <dt className="text-[#0B1A36]/60 dark:text-white/60"><i className="fa-solid fa-fire text-orange-400 mr-2" />Firebase</dt>
            <dd className="text-[#0B1A36] dark:text-white font-mono text-xs">{firebaseProject}</dd>
          </div>
          <div className="flex items-start justify-between gap-4">
            <dt className="text-[#0B1A36]/60 dark:text-white/60"><i className="fa-brands fa-shopify text-green-500 mr-2" />Shopify</dt>
            <dd className="text-[#0B1A36] dark:text-white font-mono text-xs">{shopifyDomain}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
};

export default SettingsSection;
