import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AppContext';
import { aAchete } from '../../firebase/formations';

// L'annuaire des membres et le cercle d'amies sont réservés aux membres du
// Foyer d'Origine. Ce garde-fou affiche le mot d'invitation à qui n'y est pas
// encore, et laisse passer les membres du Foyer, l'accès à vie et l'admin.

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

const ReserveAuFoyer: React.FC<{ lang?: string; quoi?: string; children: React.ReactNode }> = ({ lang = 'FR', quoi, children }) => {
  const foyer = useMembreDuFoyer();
  const fr = lang !== 'EN';
  if (foyer === null) return null;
  if (foyer) return <>{children}</>;
  return (
    <div className="rounded-[20px] border border-[#BA7B39]/40 bg-[#BA7B39]/10 p-6 text-center md:p-8">
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F] dark:text-[#d9a05b]"><i className="fa-solid fa-fire mr-1" /> {fr ? 'Le Foyer d’Origine' : 'The Origine Hearth'}</p>
      <p className="mx-auto mt-3 max-w-md font-serif text-xl text-[#293027] dark:text-white">
        {quoi || (fr ? 'L’annuaire des membres est exclusif aux membres du Foyer d’Origine.' : 'The member directory is reserved for members of the Origine Hearth.')}
      </p>
      <Link to="/foyer" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#293027] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#EEE7DB] hover:bg-[#3a453a] dark:bg-[#BA7B39] dark:text-[#293027] dark:hover:bg-[#d9a05b]">
        {fr ? 'Rejoindre la communauté vivante' : 'Join the living community'} <i className="fa-solid fa-arrow-right text-[10px]" />
      </Link>
    </div>
  );
};

export default ReserveAuFoyer;
