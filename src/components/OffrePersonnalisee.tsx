// Rassemble la fiche d'une membre, ses habitudes et ce qu'elle possède déjà,
// calcule l'offre qui lui revient avec le moteur pur de src/lib/offres.ts, et
// écrit le résultat dans habitudes/{uid}.offre. La fleur de la page d'accueil
// (public/accueil/fleur-offres.js) n'a alors qu'à lire ce champ.
//
// Seul le champ `offre` bouge sur le document habitudes, exactement comme le
// permettent les règles Firestore (affectedKeys().hasOnly([...'offre'...])) et
// exactement comme le déclare l'interface Habitudes : { id, calculeeLe }.
// Aucun texte n'est écrit en base, seulement l'identifiant retenu — le texte
// vient toujours du moteur, jamais d'une donnée qui pourrait dater.
import { useEffect } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { getMember } from '../firebase/firestore';
import { getFormationsPubliees, getMesFormations } from '../firebase/formations';
import { getClientOrdersForMember } from '../firebase/firestore';
import { getHabitudes, CHEMIN_HABITUDES } from '../firebase/habitudes';
import { offrePour, type ContexteOffre } from '../lib/offres';

/**
 * Calcule l'offre d'une personne et l'enregistre. Exportée à part de son
 * composant pour qu'un autre écran puisse la déclencher sans monter de JSX
 * (par exemple juste après le quiz dosha, ou depuis un bouton admin de test).
 *
 * ponytail : la boutique physique (shopifyOrders, réservée à l'administration
 * par les règles) n'entre pas dans « aCommandeBoutique », seules les
 * commandes du site (clientOrders) comptent — à élargir si Krystine veut un
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
    aCommandeBoutique: commandes.length > 0,
  };
  const offre = offrePour(contexte);
  await setDoc(doc(db, CHEMIN_HABITUDES, uid), { offre: { id: offre.id, calculeeLe: serverTimestamp() } }, { merge: true });
}

/** Composant sans rendu : recalcule l'offre à chaque montage, silencieusement. */
export default function OffrePersonnalisee({ uid }: { uid: string }): null {
  useEffect(() => {
    if (!uid) return;
    calculerEtEnregistrerOffre(uid).catch((e) => console.warn('[offres] calcul raté', e));
  }, [uid]);
  return null;
}
