// ─── Les amitiés ──────────────────────────────────────────────────────
// Porté du FMM 2026 (les fonctions d'amitié vivaient dans firebase/ordre.ts
// là-bas). Une ligne par paire de membres, les deux peuvent l'écrire.
//
//   /amities/{a__b}   { paire: [a, b], de: <qui a demandé>, statut }

import {
  collection, doc, deleteDoc, onSnapshot, query, setDoc, updateDoc,
  serverTimestamp, where,
} from 'firebase/firestore';
import { db } from '../firebase';

export type StatutAmitie = 'demande' | 'amis';

export interface Amitie {
  paire: string[];
  de: string;
  statut: StatutAmitie;
}

const AMITIES = 'amities';
export const cleAmitie = (a: string, b: string) => [a, b].sort().join('__');

export async function demanderAmitie(moi: string, autre: string): Promise<void> {
  if (!db || moi === autre) return;
  await setDoc(doc(db, AMITIES, cleAmitie(moi, autre)), {
    paire: [moi, autre].sort(), de: moi, statut: 'demande' as StatutAmitie,
    maj: serverTimestamp(),
  }, { merge: true });
}

export async function accepterAmitie(moi: string, autre: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, AMITIES, cleAmitie(moi, autre)), {
    statut: 'amis' as StatutAmitie, maj: serverTimestamp(),
  });
}

/** Refuse une demande reçue, ou retire une amitié existante : dans les
 *  deux cas, retirer la ligne laisse la porte ouverte à une nouvelle
 *  demande plus tard. */
export async function refuserAmitie(moi: string, autre: string): Promise<void> {
  if (!db) return;
  await deleteDoc(doc(db, AMITIES, cleAmitie(moi, autre)));
}

/** Les liens qui me concernent, en direct. */
export function suivreMesAmities(uid: string, cb: (liens: Amitie[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, AMITIES), where('paire', 'array-contains', uid)),
    (snap) => cb(snap.docs.map((d) => d.data() as Amitie)),
    () => cb([]),
  );
}

export function estAmi(liens: Amitie[], moi: string, autre: string): boolean {
  return liens.some((l) => l.statut === 'amis' && l.paire.includes(moi) && l.paire.includes(autre));
}

export function amitieEnAttente(liens: Amitie[], moi: string, autre: string): Amitie | undefined {
  return liens.find((l) => l.statut === 'demande' && l.paire.includes(moi) && l.paire.includes(autre));
}
