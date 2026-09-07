import app, { db } from '../firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  collection, doc, getDoc, getDocs, setDoc, onSnapshot,
  query, where, type Timestamp, type Unsubscribe,
} from 'firebase/firestore';

// L'onglet « Aider » : les sondages que Krystine ajoute de temps en temps
// dans l'admin. Répondre retire le sondage de l'espace pour toujours et
// verse dix niskas — tout ça côté serveur (functions/src/sondages.ts,
// repondreSondage), jamais écrit directement par le navigateur.

export type TypeQuestion = 'choix' | 'multi' | 'echelle' | 'texte';

export interface Question {
  id: string;
  type: TypeQuestion;
  texte: string;
  options?: string[];
  min?: number;
  max?: number;
  etiquettes?: [string, string];
  obligatoire: boolean;
}

export type ThemeSondage = 'technique' | 'formation' | 'accompagnement';

export interface Sondage {
  id: string;
  titre: string;
  sousTitre?: string;
  theme: ThemeSondage;
  recompense: number;
  actif: boolean;
  ordre: number;
  questions: Question[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type ValeurReponse = string | string[] | number;

export interface ReponseSondage {
  uid: string;
  email?: string | null;
  reponses: Record<string, ValeurReponse>;
  at?: Timestamp;
}

const parSondage = (d: { id: string; data: () => any }): Sondage => ({ id: d.id, ...d.data() } as Sondage);

/** Les sondages actifs, triés par `ordre`. Le tri se fait ici (pas dans la
 *  requête) pour éviter d'exiger un index composé sur actif + ordre. */
export async function getSondagesActifs(): Promise<Sondage[]> {
  if (!db) return [];
  try {
    const q = query(collection(db, 'sondages'), where('actif', '==', true));
    const snap = await getDocs(q);
    return snap.docs.map(parSondage).sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
  } catch (e) {
    console.warn('[sondages] getSondagesActifs failed', e);
    return [];
  }
}

/** Admin : tous les sondages, actifs ou non, triés par `ordre`. */
export async function getTousLesSondages(): Promise<Sondage[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, 'sondages'));
    return snap.docs.map(parSondage).sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
  } catch (e) {
    console.warn('[sondages] getTousLesSondages failed', e);
    return [];
  }
}

/** Les identifiants des sondages déjà complétés par la personne, en direct. */
export function suivreSondagesFaits(uid: string, cb: (ids: Set<string>) => void): Unsubscribe {
  if (!db || !uid) { cb(new Set()); return () => {}; }
  return onSnapshot(
    collection(db, `members/${uid}/sondagesFaits`),
    (snap) => cb(new Set(snap.docs.map((d) => d.id))),
    () => cb(new Set()),
  );
}

/** Répondre à un sondage : tout se juge et s'écrit côté serveur (validation,
 *  crédit de niskas, retrait de la liste). */
export async function repondreSondage(sondageId: string, reponses: Record<string, ValeurReponse>): Promise<{ ok: true; niskas: number }> {
  if (!app) throw new Error('[Sondages] Firebase not configured');
  const call = httpsCallable<{ sondageId: string; reponses: Record<string, ValeurReponse> }, { ok: true; niskas: number }>(
    getFunctions(app, 'us-central1'), 'repondreSondage',
  );
  const res = await call({ sondageId, reponses });
  return res.data;
}

// ─── Admin ────────────────────────────────────────────────────────────────

/** Écrit (crée ou remplace) un sondage. L'admin a le droit par les règles
 *  Firestore; `id` est fourni par l'appelante (l'éditeur en propose un). */
export async function enregistrerSondage(id: string, data: Omit<Sondage, 'id'>): Promise<void> {
  if (!db) throw new Error('[Sondages] Firebase not configured');
  await setDoc(doc(db, 'sondages', id), data);
}

export async function getSondage(id: string): Promise<Sondage | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'sondages', id));
  return snap.exists() ? parSondage(snap) : null;
}

/** Toutes les réponses reçues pour un sondage (admin seulement, par les règles). */
export async function getReponsesSondage(sondageId: string): Promise<ReponseSondage[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, `sondages/${sondageId}/reponses`));
    return snap.docs.map((d) => d.data() as ReponseSondage);
  } catch (e) {
    console.warn('[sondages] getReponsesSondage failed', e);
    return [];
  }
}
