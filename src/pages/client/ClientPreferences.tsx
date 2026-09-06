import React, { useState } from 'react';
import { updateMember, type MemberDoc } from '../../firebase/firestore';

// Deux interrupteurs, un seul document : members/{uid}.prefs. Les deux
// émetteurs (notifierBillet, annoncerChangement) lisent ces mêmes champs
// côté serveur — voir functions/src/notifs.ts.

const Interrupteur: React.FC<{ actif: boolean; occupe: boolean; onToggle: () => void; titre: string; sous: string }> = ({ actif, occupe, onToggle, titre, sous }) => (
  <div className="flex items-center justify-between gap-4 py-3.5 border-b border-[#38403a]/8 dark:border-white/10 last:border-b-0">
    <span className="min-w-0">
      <span className="block text-[10px] font-bold uppercase tracking-widest text-[#38403a] dark:text-white">{titre}</span>
      <span className="block mt-1 text-xs leading-relaxed text-[#38403a]/60 dark:text-white/55">{sous}</span>
    </span>
    <button
      type="button"
      role="switch"
      aria-checked={actif}
      disabled={occupe}
      onClick={onToggle}
      className="relative h-6 w-11 flex-none rounded-full transition-colors disabled:opacity-50"
      style={{ background: actif ? '#BA7B39' : 'rgba(56,64,58,0.18)' }}
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
        style={{ transform: actif ? 'translateX(22px)' : 'translateX(2px)' }}
      />
    </button>
  </div>
);

const ClientPreferences: React.FC<{ uid: string; member: MemberDoc | null; lang: string }> = ({ uid, member, lang }) => {
  const fr = lang !== 'EN';
  const [prefs, setPrefs] = useState({
    courrielBillets: member?.prefs?.courrielBillets !== false,
    courrielChangements: member?.prefs?.courrielChangements !== false,
  });
  const [occupe, setOccupe] = useState<string | null>(null);

  const basculer = async (cle: 'courrielBillets' | 'courrielChangements') => {
    const valeur = !prefs[cle];
    setOccupe(cle);
    setPrefs((p) => ({ ...p, [cle]: valeur }));
    try {
      await updateMember(uid, { prefs: { ...prefs, [cle]: valeur } });
    } catch {
      setPrefs((p) => ({ ...p, [cle]: !valeur }));
    } finally {
      setOccupe(null);
    }
  };

  return (
    <div className="w-full rounded-[24px] border border-white/60 bg-white/55 p-5 backdrop-blur-md dark:border-white/10 dark:bg-[#293027]/55">
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">
        {fr ? 'Notifications par courriel' : 'Email notifications'}
      </p>
      <div className="mt-3">
        <Interrupteur
          actif={prefs.courrielBillets}
          occupe={occupe === 'courrielBillets'}
          onToggle={() => basculer('courrielBillets')}
          titre={fr ? 'Nouveaux billets' : 'New posts'}
          sous={fr ? 'Les nouveaux billets de Krystine et du Foyer' : 'New posts from Krystine and the Foyer'}
        />
        <Interrupteur
          actif={prefs.courrielChangements}
          occupe={occupe === 'courrielChangements'}
          onToggle={() => basculer('courrielChangements')}
          titre={fr ? 'Nouveautés du site' : 'Site updates'}
          sous={fr ? 'Les nouveautés et changements du site' : "What's new and what changed on the site"}
        />
      </div>
    </div>
  );
};

export default ClientPreferences;
