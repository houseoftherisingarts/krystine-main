import { collection, doc, getDoc, getDocs, limit, orderBy, query, type Timestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getDownloadURL, getStorage, ref } from 'firebase/storage';
import app, { db } from '../firebase';
import type { StatutVerification } from '../lib/badgeBleu';

// Le Badge Bleu vu de l'admin : la liste des demandes (verifications/{uid}),
// la pièce d'identité (lisible par l'admin seul, règle Storage) et la
// décision, qui passe par deciderBadgeBleu (functions/src/verification.ts).
// Le serveur supprime la pièce du Storage à la décision, approuvée ou refusée.
// Le type Verification est recopié du lot Profil (src/firebase/verification.ts)
// pour que les deux fichiers restent disjoints; une fusion viendra après les lots.

export interface Verification {
  uid: string;
  statut: StatutVerification;
  programmes: number;
  pieceChemin?: string | null;
  demandeLe?: Timestamp;
  decideLe?: Timestamp | null;
  decidePar?: string | null;
  motif?: string | null;
}

/** Les cent dernières demandes, la plus récente d'abord (règle : admin seulement). */
export async function listerVerifications(): Promise<Verification[]> {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, 'verifications'), orderBy('demandeLe', 'desc'), limit(100)));
  return snap.docs.map(d => ({ ...(d.data() as Verification), uid: d.id }));
}

export async function getVerification(uid: string): Promise<Verification | null> {
  if (!db || !uid) return null;
  const snap = await getDoc(doc(db, 'verifications', uid));
  return snap.exists() ? { ...(snap.data() as Verification), uid } : null;
}

/** L'adresse signée de la pièce : la règle Storage n'ouvre verifications/ qu'à l'admin. */
export function urlPiece(chemin: string): Promise<string> {
  if (!app) throw new Error('[Storage] Firebase not configured');
  return getDownloadURL(ref(getStorage(app), chemin));
}

/** Approuver ou refuser (le motif est obligatoire au refus, 600 caractères au plus). */
export async function deciderBadgeBleu(uid: string, decision: 'approuvee' | 'refusee', motif: string): Promise<void> {
  if (!app) throw new Error('[Functions] Firebase not configured');
  await httpsCallable(getFunctions(app, 'us-central1'), 'deciderBadgeBleu')({ uid, decision, motif });
}
