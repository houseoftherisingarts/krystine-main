// ─── Les avis épinglés (le babillard) ────────────────────────────────
// Alex, 11 septembre 2026 : « un billboard et des notifications, comme au
// Festival Médiéval ». Krystine écrit un avis dans l'admin; il paraît en
// bulle au-dessus de la fleur de l'accueil et dans la cloche du site, avec
// une icône d'avis à point d'exclamation (jamais la fleur). Le bouton « Lu »
// range l'avis dans l'onglet Lettres de l'espace client, partie « Avis
// épinglés ». Porté de FMM 2026 (src/firebase/avis.ts), sans les badges.
//
//   /avis/{id}                 { titre, texte, actif, creeLe, lienHref?, lienLibelle? }
//   /avisAcceptes/{uid__avisId} { uid, avisId, luLe }

import {
  addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query,
  serverTimestamp, setDoc, updateDoc, where, type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export interface Avis {
  id: string;
  titre: string;
  texte: string;
  actif: boolean;
  creeLe?: Timestamp | null;
  lienHref?: string;
  lienLibelle?: string;
}

export interface AvisLu {
  uid: string;
  avisId: string;
  luLe?: Timestamp | null;
}

const COL = 'avis';
const LUS = 'avisAcceptes';
const cle = (uid: string, avisId: string) => `${uid}__${avisId}`;
const quand = (a: Avis) => a.creeLe?.toMillis?.() ?? 0;

/** Les avis en cours, en direct, le plus récent en tête (tri local : pas d'index composé). */
export function suivreAvisActifs(cb: (avis: Avis[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, COL), where('actif', '==', true)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Avis, 'id'>) })).sort((a, b) => quand(b) - quand(a))),
    () => cb([]),
  );
}

/** Les identifiants des avis qu'une personne a déjà lus, en direct. */
export function suivreMesAvisLus(uid: string, cb: (ids: string[]) => void): () => void {
  if (!db || !uid) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, LUS), where('uid', '==', uid)),
    (snap) => cb(snap.docs.map((d) => (d.data() as AvisLu).avisId)),
    () => cb([]),
  );
}

/** « Lu » : l'avis quitte la bulle et la cloche, et s'épingle dans Lettres. */
export async function marquerAvisLu(uid: string, avisId: string): Promise<void> {
  if (!db || !uid || !avisId) return;
  await setDoc(doc(db, LUS, cle(uid, avisId)), { uid, avisId, luLe: serverTimestamp() }, { merge: true });
}

// ── Côté admin ──────────────────────────────────────────────────────
export async function listerAvis(): Promise<Avis[]> {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, COL), orderBy('creeLe', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Avis, 'id'>) }));
}

export async function creerAvis(a: Pick<Avis, 'titre' | 'texte' | 'actif' | 'lienHref' | 'lienLibelle'>): Promise<string> {
  if (!db) throw new Error('Firestore absent');
  const ref = await addDoc(collection(db, COL), { ...a, creeLe: serverTimestamp() });
  return ref.id;
}

export async function majAvis(id: string, patch: Partial<Pick<Avis, 'titre' | 'texte' | 'actif' | 'lienHref' | 'lienLibelle'>>): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, COL, id), patch);
}

export async function supprimerAvis(id: string): Promise<void> {
  if (!db) return;
  await deleteDoc(doc(db, COL, id));
}

/** Combien de personnes ont lu chaque avis (admin). */
export async function compterLectures(): Promise<Record<string, number>> {
  if (!db) return {};
  const snap = await getDocs(collection(db, LUS));
  const n: Record<string, number> = {};
  for (const d of snap.docs) { const id = (d.data() as AvisLu).avisId; n[id] = (n[id] || 0) + 1; }
  return n;
}
