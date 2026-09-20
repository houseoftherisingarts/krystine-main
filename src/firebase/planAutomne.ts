// L'état du plan d'automne : un seul document, planAutomne/2026, qui porte une
// entrée par item coché. Les textes du plan vivent dans src/lib/planAutomne.ts
// et ne bougent pas; ici on ne garde que ce que Krystine décide.
import { db } from '../firebase';
import { deleteField, doc, onSnapshot, setDoc, serverTimestamp, type Timestamp } from 'firebase/firestore';

export type Impact = 'oui' | 'non' | 'pas-encore';

export interface ItemPlan {
  fait: boolean;
  faitLe?: Timestamp;
  /** La mesure de succès, préremplie par le plan puis modifiable en place. */
  mesure?: string;
  /** Ce qui est réellement arrivé, en une ligne. */
  resultat?: string;
  impact?: Impact;
}

export type EtatPlan = Record<string, ItemPlan>;

export const ANNEE_PLAN = '2026';

const refPlan = () => doc(db, 'planAutomne', ANNEE_PLAN);

/** Écoute le plan en temps réel. Rend une fonction pour arrêter d'écouter. */
export const ecouterPlan = (
  onEtat: (etat: EtatPlan) => void,
  onRefus: (message: string) => void,
): (() => void) => onSnapshot(
  refPlan(),
  snap => onEtat(((snap.data()?.items) as EtatPlan | undefined) ?? {}),
  err => onRefus(err.code === 'permission-denied'
    ? 'Les règles du plan ne sont pas encore en ligne.'
    : 'Le plan ne s\'est pas chargé.'),
);

/**
 * Enregistre un morceau d'item. Le merge est profond : écrire { fait: true }
 * ne touche ni à la mesure ni au résultat des autres items.
 */
export const majItem = (id: string, morceau: Partial<ItemPlan>): Promise<void> =>
  setDoc(refPlan(), { items: { [id]: morceau } }, { merge: true });

/** Coche ou décoche, en datant le geste (et en effaçant la date au décochage). */
export const cocherItem = (id: string, fait: boolean): Promise<void> =>
  setDoc(
    refPlan(),
    { items: { [id]: { fait, faitLe: fait ? serverTimestamp() : deleteField() } } },
    { merge: true },
  );
