import app, { db } from '../firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  Timestamp, collection, doc, onSnapshot, orderBy, query, serverTimestamp,
  setDoc, updateDoc, deleteDoc, addDoc,
} from 'firebase/firestore';

// Les séquences : des courriels qui partent tout seuls dans le temps après un
// déclencheur (l'achat d'une formation). Le moteur vit dans
// functions/src/newsletter/sequences.ts; ici, la lecture et l'écriture depuis
// l'admin, et l'appel de test.

export interface Etape { cle: string; titre?: string; delaiHeures: number; newsletterId: string }
export interface Sequence {
  id: string;
  titre: string;
  actif?: boolean;
  declencheur?: { type: 'achat'; formationId: string } | { type: 'manuel' };
  etapes?: Etape[];
  stats?: Record<string, number>;
  dernierEnvoi?: Timestamp;
  creeLe?: Timestamp;
}
export interface Inscrit {
  id: string;
  uid?: string;
  email: string;
  firstName?: string;
  debuteLe: Timestamp;
  envoyes?: Record<string, Timestamp>;
  erreurs?: Record<string, string>;
  source?: string;
}

const need = () => { if (!db) throw new Error('Firebase non configuré.'); return db; };

export function ecouterSequences(cb: (s: Sequence[]) => void): () => void {
  const q = query(collection(need(), 'sequences'), orderBy('creeLe', 'desc'));
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Sequence, 'id'>) }))));
}

export function ecouterInscrits(sequenceId: string, cb: (i: Inscrit[]) => void): () => void {
  const q = query(collection(need(), `sequences/${sequenceId}/inscrits`), orderBy('debuteLe', 'desc'));
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Inscrit, 'id'>) }))));
}

export async function creerSequence(titre: string): Promise<string> {
  const r = await addDoc(collection(need(), 'sequences'), {
    titre, actif: false, declencheur: { type: 'manuel' }, etapes: [], creeLe: serverTimestamp(), maj: serverTimestamp(),
  });
  return r.id;
}

export async function enregistrerSequence(id: string, data: Partial<Omit<Sequence, 'id'>>): Promise<void> {
  await setDoc(doc(need(), 'sequences', id), { ...data, maj: serverTimestamp() }, { merge: true });
}

export async function supprimerSequence(id: string): Promise<void> {
  await deleteDoc(doc(need(), 'sequences', id));
}

// Une lettre choisie pour une étape se marque « séquence » dans la liste des
// infolettres, pour qu'elle ne parte pas en masse par mégarde.
export async function marquerLettreSequence(newsletterId: string): Promise<void> {
  await updateDoc(doc(need(), 'newsletters', newsletterId), { role: 'sequence' });
}

export async function testerSequence(args: { sequenceId: string; cle?: string; email: string; firstName?: string; mode?: 'etape' | 'inscrire' }): Promise<void> {
  if (!app) throw new Error('Firebase non configuré.');
  const call = httpsCallable<typeof args, { ok: boolean }>(getFunctions(app, 'us-central1'), 'testerSequence');
  await call(args);
}
