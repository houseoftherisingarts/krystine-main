import app, { db } from '../firebase';
import {
  addDoc, collection, deleteDoc, doc, limit, onSnapshot, orderBy, query,
  serverTimestamp, setDoc, where, type Timestamp, type Unsubscribe,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

// ─── Le studio du direct ─────────────────────────────────────────────────────
// Un direct vit sous `directs/{directId}` : les messages du clavardage, les
// cœurs envoyés et les personnes présentes. Le direct courant est celui que
// l'admin allume dans `livesEnCours/actuel`; son identifiant sert de salle.

export interface MessageDirect {
  id: string;
  uid: string;
  nom: string;
  photoURL?: string;
  texte: string;
  epingle?: boolean;
  animatrice?: boolean;      // message de Krystine ou de l'équipe
  at?: Timestamp;
}

export interface PresenceDirect {
  uid: string;
  nom: string;
  photoURL?: string;
  messages: number;          // compteur de la soirée, sert au badge
  coeurs: number;
  vuLe?: Timestamp;
}

// Les badges se gagnent à la parole, pas à l'ancienneté : le paquet se
// recalcule à chaque message reçu, sans écriture supplémentaire.
export interface Badge { cle: string; nom: string; seuil: number; couleur: string; }

export const BADGES: Badge[] = [
  { cle: 'braise',   nom: 'Braise',            seuil: 1,  couleur: '#BA7B39' },
  { cle: 'flamme',   nom: 'Flamme',            seuil: 5,  couleur: '#E8A85C' },
  { cle: 'veilleuse', nom: 'Veilleuse du feu', seuil: 15, couleur: '#E6C79B' },
  { cle: 'gardienne', nom: 'Gardienne du feu', seuil: 30, couleur: '#F2D9A8' },
];

export const badgePour = (messages: number): Badge | null =>
  [...BADGES].reverse().find(b => messages >= b.seuil) || null;

const salle = (directId: string) => collection(db!, 'directs', directId, 'messages');

export function suivreMessages(directId: string, cb: (m: MessageDirect[]) => void): Unsubscribe {
  if (!db) { cb([]); return () => {}; }
  const q = query(salle(directId), orderBy('at', 'desc'), limit(120));
  return onSnapshot(q, snap => {
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() } as MessageDirect));
    cb(rows.reverse());
  }, () => cb([]));
}

export async function envoyerMessage(
  directId: string,
  auteur: { uid: string; nom: string; photoURL?: string; animatrice?: boolean },
  texte: string,
): Promise<void> {
  if (!db) throw new Error('Firestore non configuré');
  const propre = texte.trim().slice(0, 400);
  if (!propre) return;
  await addDoc(salle(directId), {
    uid: auteur.uid,
    nom: auteur.nom.slice(0, 60),
    ...(auteur.photoURL ? { photoURL: auteur.photoURL } : {}),
    ...(auteur.animatrice ? { animatrice: true } : {}),
    texte: propre,
    at: serverTimestamp(),
  });
}

export async function retirerMessage(directId: string, messageId: string): Promise<void> {
  if (!db) return;
  await deleteDoc(doc(db, 'directs', directId, 'messages', messageId));
}

// ─── Les cœurs ───────────────────────────────────────────────────────────────
// Chaque envoi écrit une ligne courte; tout le monde la voit passer et
// l'animation fait monter le cœur à l'écran. Les lignes de plus d'une heure
// ne sont plus lues, la requête ne prend que les vingt dernières.
export interface CoeurDirect { id: string; uid: string; nom: string; at?: Timestamp; }

export function suivreCoeurs(directId: string, cb: (c: CoeurDirect[]) => void): Unsubscribe {
  if (!db) { cb([]); return () => {}; }
  const q = query(collection(db, 'directs', directId, 'coeurs'), orderBy('at', 'desc'), limit(20));
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as CoeurDirect))), () => cb([]));
}

export async function envoyerCoeur(directId: string, uid: string, nom: string): Promise<void> {
  if (!db) return;
  await addDoc(collection(db, 'directs', directId, 'coeurs'), { uid, nom: nom.slice(0, 60), at: serverTimestamp() });
}

// ─── La présence ─────────────────────────────────────────────────────────────
export function suivrePresences(directId: string, cb: (p: PresenceDirect[]) => void): Unsubscribe {
  if (!db) { cb([]); return () => {}; }
  const q = query(collection(db, 'directs', directId, 'presences'), orderBy('messages', 'desc'), limit(60));
  return onSnapshot(q, snap => cb(snap.docs.map(d => d.data() as PresenceDirect)), () => cb([]));
}

export async function marquerPresence(
  directId: string,
  p: { uid: string; nom: string; photoURL?: string; messages?: number; coeurs?: number },
): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, 'directs', directId, 'presences', p.uid), {
    uid: p.uid,
    nom: p.nom.slice(0, 60),
    ...(p.photoURL ? { photoURL: p.photoURL } : {}),
    ...(typeof p.messages === 'number' ? { messages: p.messages } : {}),
    ...(typeof p.coeurs === 'number' ? { coeurs: p.coeurs } : {}),
    vuLe: serverTimestamp(),
  }, { merge: true });
}

// ─── Le pourboire ────────────────────────────────────────────────────────────
// Le paiement passe par Stripe, la même porte que les formations. Les points
// se créditent au retour du webhook, jamais depuis le navigateur.
export const MONTANTS_POURBOIRE = [5, 10, 25, 50] as const;

export async function ouvrirPourboire(montant: number, directId: string, titre: string): Promise<string> {
  if (!app) throw new Error('Firebase non configuré.');
  const call = httpsCallable<{ montant: number; directId: string; titre: string }, { url: string }>(
    getFunctions(app, 'us-central1'), 'creerPourboire',
  );
  const { data } = await call({ montant, directId, titre });
  return data.url;
}

// Les pourboires de la soirée, pour le mur de remerciements.
export interface PourboireDirect { id: string; nom: string; montant: number; at?: Timestamp; }

export function suivrePourboires(directId: string, cb: (p: PourboireDirect[]) => void): Unsubscribe {
  if (!db) { cb([]); return () => {}; }
  const q = query(collection(db, 'pourboires'), where('directId', '==', directId), limit(50));
  return onSnapshot(q, snap => {
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() } as PourboireDirect));
    rows.sort((a, b) => (b.at?.toMillis?.() || 0) - (a.at?.toMillis?.() || 0));
    cb(rows);
  }, () => cb([]));
}
