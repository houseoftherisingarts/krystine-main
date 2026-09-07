import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AppContext';
import { aAchete, getMembresGroupe } from '../../firebase/formations';
import { getMember, type MemberDoc } from '../../firebase/firestore';
import { listerMesFilleules, maMarraine } from '../../firebase/parrainage';
import { CHEMINS_FOYER } from './chemins';
import { nomDeMembre } from './CarteSociale';

// L'annuaire des membres, le cercle d'amies et la messagerie de boîte à boîte
// sont réservés aux membres du Foyer d'Origine. Ce fichier tient le jugement
// (qui en est), le cercle (qui d'autre en est) et le mot d'invitation posé
// au-dessus d'un contenu partiel. La barrière de page, elle, est dans
// CadreFoyer : sans achat, la coquille renvoie à la page de vente.

// `null` tant qu'on ne sait pas encore. La réponse porte l'uid auquel elle
// appartient : à la seconde où la session se rétablit (uid null → uid réel),
// la réponse d'avant cesse d'être lue, dans le même rendu. Sans cela, la
// coquille lisait un « non » périmé et renvoyait une membre du Foyer à la
// page de vente le temps que Firebase finisse de restaurer sa session.
export function useMembreDuFoyer(): boolean | null {
  const { user, member, isAdmin } = useAuth();
  const [reponse, setReponse] = useState<{ uid: string | null; valeur: boolean } | null>(null);
  const uid = user?.uid ?? null;
  useEffect(() => {
    if (!user) { setReponse({ uid: null, valeur: false }); return; }
    if (isAdmin || member?.accesVie) { setReponse({ uid: user.uid, valeur: true }); return; }
    let vivant = true;
    aAchete(user.uid, 'foyer')
      .then(v => { if (vivant) setReponse({ uid: user.uid, valeur: v }); })
      .catch(() => { if (vivant) setReponse({ uid: user.uid, valeur: false }); });
    return () => { vivant = false; };
  }, [user, isAdmin, member?.accesVie]);
  return reponse && reponse.uid === uid ? reponse.valeur : null;
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
/** Une personne du cercle. `espaceOuvert` est faux quand elle a le Foyer mais
 *  n'a jamais ouvert son espace : elle porte quand même son nom, pris dans le
 *  miroir du groupe. Une ligne sans aucune identité ne sort pas d'ici. */
export interface MembreDuFoyer {
  uid: string;
  nom: string;
  photo?: string;
  verifie?: boolean;
  dosha?: string;
  espaceOuvert: boolean;
  fiche: MemberDoc | null;
}

export function useCercleDuFoyer(): { membres: MembreDuFoyer[]; chargement: boolean } {
  const { user, member } = useAuth();
  const [membres, setMembres] = useState<MembreDuFoyer[]>([]);
  const [chargement, setChargement] = useState(true);
  useEffect(() => {
    if (!user) { setMembres([]); setChargement(false); return; }
    let vivant = true;
    const finir = (liste: MembreDuFoyer[]) => { if (vivant) { setMembres(liste); setChargement(false); } };
    getMembresGroupe('foyer')
      .then(async liste => {
        const rangees = await Promise.all(liste.map(async (m): Promise<MembreDuFoyer | null> => {
          const fiche = await getMember(m.uid).catch(() => null);
          // Le nom vient de sa fiche; à défaut, du miroir du groupe. Une ligne
          // dont on ne connaît ni nom ni courriel n'est pas une personne :
          // c'est un uid resté derrière un import, et elle ne s'affiche pas.
          const nom = nomDeMembre(fiche) || nomDeMembre({ displayName: m.nom, email: m.courriel });
          return nom ? {
            uid: m.uid, nom, photo: fiche?.photoURL, verifie: fiche?.verifie,
            dosha: fiche?.dosha, espaceOuvert: !!fiche, fiche,
          } : null;
        }));
        const cercle = rangees.filter((r): r is MembreDuFoyer => !!r);
        // L'accès à vie ouvre le Foyer sans passer par un achat : le miroir ne
        // porte pas ces personnes, on ajoute au moins la sienne à sa liste.
        if (!cercle.some(c => c.uid === user.uid)) {
          const moi = member ?? await getMember(user.uid).catch(() => null);
          const nom = nomDeMembre(moi) || nomDeMembre({ email: user.email || '' });
          if (nom) cercle.push({ uid: user.uid, nom, photo: moi?.photoURL, verifie: moi?.verifie, dosha: moi?.dosha, espaceOuvert: true, fiche: moi });
        }
        // Les plus récemment vues d'abord; celles qui n'ont pas encore ouvert
        // leur espace ferment la marche.
        cercle.sort((a, b) => (b.fiche?.lastSeenAt?.toMillis?.() || 0) - (a.fiche?.lastSeenAt?.toMillis?.() || 0));
        finir(cercle);
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
