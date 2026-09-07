import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AppContext';
import { aAchete, getMembresGroupe } from '../../firebase/formations';
import { getMember, type MemberDoc } from '../../firebase/firestore';
import { listerMesFilleules, maMarraine } from '../../firebase/parrainage';
import { CHEMINS_FOYER } from './chemins';

// L'annuaire des membres, le cercle d'amies et la messagerie de boîte à boîte
// sont réservés aux membres du Foyer d'Origine. Ce fichier tient le jugement
// (qui en est), le cercle (qui d'autre en est) et le mot d'invitation posé
// au-dessus d'un contenu partiel. La barrière de page, elle, est dans
// CadreFoyer : sans achat, la coquille renvoie à la page de vente.

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

// ─── Le cercle du Foyer : le groupe VIP, et rien d'autre ─────────────────────
// Les seules personnes visibles dans le Foyer sont celles qui l'ont acheté :
// le miroir `groupes/foyer/membres`, écrit par la fonction groupeMembre à
// chaque achat. Aucune autre membre du site n'y apparaît, ni dans l'annuaire,
// ni dans le rail « Autour du feu », ni dans la recherche (Alex, 7 septembre
// 2026 : « c'est comme un groupe VIP »). Les fiches sont triées de la plus
// récemment vue à la plus ancienne.
export function useCercleDuFoyer(): { membres: MemberDoc[]; chargement: boolean } {
  const { user, member } = useAuth();
  const [membres, setMembres] = useState<MemberDoc[]>([]);
  const [chargement, setChargement] = useState(true);
  useEffect(() => {
    if (!user) { setMembres([]); setChargement(false); return; }
    let vivant = true;
    const finir = (liste: MemberDoc[]) => { if (vivant) { setMembres(liste); setChargement(false); } };
    getMembresGroupe('foyer')
      .then(async liste => {
        const fiches = (await Promise.all(liste.map(m => getMember(m.uid).catch(() => null))))
          .filter((f): f is MemberDoc => !!f);
        // L'accès à vie ouvre le Foyer sans passer par un achat : le miroir ne
        // porte pas ces personnes, on ajoute au moins la sienne à sa liste.
        if (!fiches.some(f => f.uid === user.uid)) {
          const moi = member ?? await getMember(user.uid).catch(() => null);
          if (moi) fiches.push(moi);
        }
        fiches.sort((a, b) => (b.lastSeenAt?.toMillis?.() || 0) - (a.lastSeenAt?.toMillis?.() || 0));
        finir(fiches);
      })
      .catch(() => finir([]));
    return () => { vivant = false; };
  }, [user?.uid, member?.uid]);
  return { membres, chargement };
}

/** Le mot d'invitation seul, à poser au-dessus d'un contenu partiel. */
export const MotDuFoyer: React.FC<{ lang?: string; quoi: string; compact?: boolean }> = ({ lang = 'FR', quoi, compact }) => {
  const fr = lang !== 'EN';
  return (
    <div className={`rounded-[20px] border border-[#BA7B39]/40 bg-[#BA7B39]/10 text-center ${compact ? 'p-4' : 'p-6 md:p-8'}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F] dark:text-[#d9a05b]"><i className="fa-solid fa-fire mr-1" /> {fr ? 'Le Foyer d’Origine' : 'The Origine Hearth'}</p>
      <p className={`mx-auto mt-3 max-w-md font-serif text-[#293027] dark:text-white ${compact ? 'text-lg' : 'text-xl'}`}>{quoi}</p>
      <Link to={CHEMINS_FOYER.vente} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#293027] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#EEE7DB] hover:bg-[#3a453a] dark:bg-[#BA7B39] dark:text-[#293027] dark:hover:bg-[#d9a05b]">
        {fr ? 'Rejoindre la communauté vivante' : 'Join the living community'} <i className="fa-solid fa-arrow-right text-[10px]" />
      </Link>
    </div>
  );
};
