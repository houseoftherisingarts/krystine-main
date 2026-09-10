// Rassemble la fiche d'une membre, ses habitudes et ce qu'elle possède déjà,
// calcule l'offre qui lui revient avec le moteur pur de src/lib/offres.ts, et
// écrit le résultat dans habitudes/{uid}.offre. La fleur de la page d'accueil
// (public/accueil/fleur-offres.js) n'a alors qu'à lire ce champ.
//
// Seul le champ `offre` bouge sur le document habitudes, exactement comme le
// permettent les règles Firestore (affectedKeys().hasOnly([...'offre'...])) et
// exactement comme le déclare l'interface Habitudes : { id, calculeeLe }.
// Aucun texte n'est écrit en base, seulement l'identifiant retenu : le texte
// vient toujours du moteur, jamais d'une donnée qui pourrait dater.
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { getMember, getClientOrdersForMember } from '../firebase/firestore';
import { getFormationsPubliees, getMesFormations } from '../firebase/formations';
import { getHabitudes, CHEMIN_HABITUDES } from '../firebase/habitudes';
import { offrePour, type ContexteOffre } from '../lib/offres';

/**
 * Calcule l'offre d'une personne et l'enregistre. Exportée à part de son
 * composant pour qu'un autre écran puisse la déclencher sans monter de JSX
 * (par exemple juste après le quiz dosha, ou depuis un bouton admin de test).
 *
 * ponytail : la boutique physique (shopifyOrders, réservée à l'administration
 * par les règles) n'entre pas dans « aCommandeBoutique », seules les
 * commandes du site (clientOrders) comptent; à élargir si Krystine veut un
 * jour croiser aussi le comptoir.
 */
export async function calculerEtEnregistrerOffre(uid: string): Promise<void> {
  if (!db || !uid) return;
  const [membre, habitudes, formationsPubliees, formationsPossedees, commandes] = await Promise.all([
    getMember(uid),
    getHabitudes(uid),
    getFormationsPubliees(),
    getMesFormations(uid),
    getClientOrdersForMember(uid),
  ]);
  // Une cliente qui a éteint la personnalisation dans ses préférences ne
  // reçoit aucun calcul : la Loi 25 prime sur la fleur.
  if (habitudes?.suiviRefuse) return;

  const contexte: ContexteOffre = {
    dosha: membre?.dosha,
    joinedAtMs: membre?.joinedAt?.toMillis(),
    familles: habitudes?.familles || {},
    formationsPubliees: formationsPubliees.map((f) => ({ id: f.id, titre: f.titre, statut: f.statut, prix: f.prix, lienFiche: f.lienFiche })),
    formationsPossedees: formationsPossedees.map((f) => ({ id: f.id, titre: f.titre })),
    // Une commande annulée ou en attente de paiement n'est jamais une preuve
    // d'achat (même filtre que la fiche « Celles qui ont le plus dépensé »
    // de HabitudesSection.tsx) : sans ça, une commande annulée aurait éteint
    // la relance boutique pour une personne qui n'a en réalité rien acheté.
    aCommandeBoutique: commandes.some((c) => c.status === 'paid' || c.status === 'shipped' || c.status === 'delivered'),
  };
  const offre = offrePour(contexte);
  await setDoc(doc(db, CHEMIN_HABITUDES, uid), { offre: { id: offre.id, calculeeLe: serverTimestamp() } }, { merge: true });
}

/**
 * Composant sans rendu : recalcule l'offre au montage, puis chaque fois que
 * la personne change de page. Les habitudes bougent à chaque page ouverte
 * (src/lib/suiviHabitudes.ts) : un calcul figé au premier montage aurait
 * laissé le champ `offre` retenir la toute première visite de la session,
 * même après trois pages de plus dans une famille qui aurait fait basculer
 * l'offre. Un court délai groupe les navigations rapprochées en un seul
 * calcul plutôt que d'en lancer un par clic.
 */
export default function OffrePersonnalisee({ uid }: { uid: string }): null {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!uid) return;
    let annule = false;
    const t = setTimeout(() => {
      if (!annule) calculerEtEnregistrerOffre(uid).catch((e) => console.warn('[offres] calcul raté', e));
    }, 800);
    return () => { annule = true; clearTimeout(t); };
  }, [uid, pathname]);
  return null;
}
