import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AppContext';
import { aAchete } from '../../firebase/formations';
import { listerMesFilleules, maMarraine } from '../../firebase/parrainage';

// L'annuaire des membres, le cercle d'amies et la messagerie de boîte à boîte
// sont réservés aux membres du Foyer d'Origine. Ce garde-fou affiche le mot
// d'invitation à qui n'y est pas encore, et laisse passer les membres du
// Foyer, l'accès à vie et l'admin.

export function useMembreDuFoyer(): boolean | null {
  const { user, member, isAdmin } = useAuth();
  const [foyer, setFoyer] = useState<boolean | null>(null);
  useEffect(() => {
    if (!user) { setFoyer(false); return; }
    if (isAdmin || member?.accesVie) { setFoyer(true); return; }
    let vivant = true;
    aAchete(user.uid, 'foyer').then(v => { if (vivant) setFoyer(v); }).catch(() => { if (vivant) setFoyer(false); });
    return () => { vivant = false; };
  }, [user, isAdmin, member?.accesVie]);
  return foyer;
}

// Les « amies d'origine » : avec qui une membre peut être amie et s'écrire.
// Une membre du Foyer : tout le monde (permis = null). Une membre qui n'y est
// pas encore : sa marraine et ses filleules seulement (Alex, 6 septembre
// 2026 : le parrainage ouvre la porte à ces deux personnes-là, même sans le
// Foyer). `pret` devient vrai quand la réponse est connue.
export function useAmiesDOrigine(): { foyer: boolean | null; permis: Set<string> | null; pret: boolean; peutEcrire: (uid: string) => boolean } {
  const { user } = useAuth();
  const foyer = useMembreDuFoyer();
  const [liens, setLiens] = useState<Set<string> | null>(null);
  useEffect(() => {
    if (!user) { setLiens(new Set()); return; }
    let vivant = true;
    Promise.all([maMarraine(user.uid).catch(() => null), listerMesFilleules(user.uid).catch(() => [])])
      .then(([marraine, filleules]) => {
        if (!vivant) return;
        const s = new Set<string>();
        if (marraine) s.add(marraine);
        filleules.forEach(f => s.add(f.uid));
        setLiens(s);
      });
    return () => { vivant = false; };
  }, [user?.uid]);
  const pret = foyer !== null && liens !== null;
  const permis = foyer ? null : (liens ?? new Set<string>());
  return { foyer, permis, pret, peutEcrire: (uid: string) => !!foyer || !!liens?.has(uid) };
}

const ReserveAuFoyer: React.FC<{ lang?: string; quoi?: string; children: React.ReactNode }> = ({ lang = 'FR', quoi, children }) => {
  const foyer = useMembreDuFoyer();
  const fr = lang !== 'EN';
  if (foyer === null) return null;
  if (foyer) return <>{children}</>;
  return <MotDuFoyer lang={lang} quoi={quoi || (fr ? 'L’annuaire des membres est exclusif aux membres du Foyer d’Origine.' : 'The member directory is reserved for members of the Origine Hearth.')} />;
};

/** Le mot d'invitation seul, à poser au-dessus d'un contenu partiel. */
export const MotDuFoyer: React.FC<{ lang?: string; quoi: string; compact?: boolean }> = ({ lang = 'FR', quoi, compact }) => {
  const fr = lang !== 'EN';
  return (
    <div className={`rounded-[20px] border border-[#BA7B39]/40 bg-[#BA7B39]/10 text-center ${compact ? 'p-4' : 'p-6 md:p-8'}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F] dark:text-[#d9a05b]"><i className="fa-solid fa-fire mr-1" /> {fr ? 'Le Foyer d’Origine' : 'The Origine Hearth'}</p>
      <p className={`mx-auto mt-3 max-w-md font-serif text-[#293027] dark:text-white ${compact ? 'text-lg' : 'text-xl'}`}>{quoi}</p>
      <Link to="/foyer" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#293027] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#EEE7DB] hover:bg-[#3a453a] dark:bg-[#BA7B39] dark:text-[#293027] dark:hover:bg-[#d9a05b]">
        {fr ? 'Rejoindre la communauté vivante' : 'Join the living community'} <i className="fa-solid fa-arrow-right text-[10px]" />
      </Link>
    </div>
  );
};

export default ReserveAuFoyer;
