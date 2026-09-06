// ─── Le mur social ───────────────────────────────────────────────────
// Porté du FMM 2026 (src/firebase/mur.ts), simplifié : texte + photo
// seulement, pas de vidéo, pas d'aperçu de lien, pas de partage. Deux
// fils au lieu d'un mur général + murs de guilde : « krystine »
// (annonces officielles, Krystine seule peut y publier) et
// « communaute » (tout membre connecté).
//
// Voter et commenter restent façon Reddit : LE CLIENT N'ÉCRIT JAMAIS UN
// COMPTEUR. Il écrit seulement son propre vote, et une fonction serveur
// (Admin SDK, qui contourne les règles) recalcule pour/contre/score/
// chaleur à chaque vote — à écrire dans functions/, voir
// murVoteBillet / murVoteCommentaire / murCommentaireCompte dans
// FMM 2026/functions/index.js pour le modèle exact.
//
//   mur/{postId} { uid, nom, avatarUrl?, texte, photoUrl?, photoChemin?,
//                  fil, pour, contre, score, chaleur, nbCommentaires, creeLe }
//   mur/{postId}/votes/{voterUid}                    { valeur, nom, majLe }
//   mur/{postId}/commentaires/{cid}                  { uid, nom, texte, pour,
//                                                       contre, score, chaleur, creeLe }
//   mur/{postId}/commentaires/{cid}/votes/{voterUid}  { valeur, nom, majLe }
//
// La photo est téléversée par le composant AVANT d'appeler
// publierSurLeMur (voir uploadImage dans ./storage) : ce fichier ne
// touche jamais Storage directement, sauf pour nettoyer la photo d'un
// billet retiré.
//
// ponytail : pas de bulle « qui a voté » au survol, pas d'épinglage,
// pas d'aperçu OG des liens collés, pas de coche vérifiée — la version
// FMM en a, ajouter ici si Krystine les demande. Le garde-fou
// « krystine = admin seulement » est côté client; la vraie barrière est
// firestore.rules (hors périmètre de ce port).

import {
  collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy,
  limit as fsLimit, where, serverTimestamp, updateDoc, getDoc, type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { points } from './points';
import { deleteStoredImage } from './storage';

// Un fil par formation s'écrit `formation:{id}` (le feed commun d'un cours).
export type FilMur = 'krystine' | 'communaute' | 'perso' | `formation:${string}`;

export interface PostMur {
  id: string;
  uid: string;
  nom: string;
  avatarUrl?: string;
  texte: string;
  photoUrl?: string;
  photoChemin?: string;
  videoUrl?: string;
  videoChemin?: string;
  fil: FilMur;
  /** Le vote façon Reddit. Écrits UNIQUEMENT par les fonctions serveur —
   *  jamais directement par le client. */
  pour?: number;
  contre?: number;
  score?: number;
  chaleur?: number;
  nbCommentaires?: number;
  /** Épinglé par Krystine : toujours en tête du fil. */
  epingle?: boolean;
  /** Publié par Krystine ou l'équipe : prioritaire sous les épinglés. */
  officiel?: boolean;
  creeLe: Timestamp | null;
}

const COL = 'mur';
export const LONGUEUR_MAX_POST = 2000;
export const LONGUEUR_MAX_COMMENTAIRE = 1000;

// ── La chaleur : le ballon d'hélium ─────────────────────────────────
// Formule « hot » de Reddit, identique à celle du FMM. FIGÉE au moment
// de l'écriture : elle ne se recalcule jamais à partir de « maintenant »,
// seulement à partir du score et de l'heure de création du billet.
export const DEMI_VIE_CHALEUR = 45_000;

/** Jumeau exact de la formule côté serveur : si l'une change, l'autre
 *  doit suivre. */
export function calculerChaleur(score: number, creeLeMs: number): number {
  const secondes = creeLeMs / 1000;
  return Math.log10(Math.max(Math.abs(score), 1)) * Math.sign(score) + secondes / DEMI_VIE_CHALEUR;
}

export async function publierSurLeMur(opts: {
  uid: string; nom: string; avatarUrl?: string; texte: string;
  /** Déjà téléversée par le composant (voir uploadImage, dossier 'mur'). */
  photoUrl?: string; photoChemin?: string;
  videoUrl?: string; videoChemin?: string;
  fil: FilMur;
  /** Le fil « krystine » refuse tout le monde sauf un admin. */
  estAdmin: boolean;
}): Promise<string> {
  const formationId = opts.fil.startsWith('formation:') ? opts.fil.slice('formation:'.length).split('--')[0] : null;
  if (!db) throw new Error('Firestore non configuré');
  if (opts.fil === 'krystine' && !opts.estAdmin) throw new Error('Seule Krystine publie dans ce fil.');
  const texte = opts.texte.trim().slice(0, LONGUEUR_MAX_POST);
  if (!texte && !opts.photoUrl && !opts.videoUrl) throw new Error('Rien à publier.');
  const id = doc(collection(db, COL)).id;
  await setDoc(doc(db, COL, id), {
    uid: opts.uid, nom: opts.nom,
    ...(opts.avatarUrl ? { avatarUrl: opts.avatarUrl } : {}),
    texte,
    ...(opts.photoUrl ? { photoUrl: opts.photoUrl, ...(opts.photoChemin ? { photoChemin: opts.photoChemin } : {}) } : {}),
    ...(opts.videoUrl ? { videoUrl: opts.videoUrl, ...(opts.videoChemin ? { videoChemin: opts.videoChemin } : {}) } : {}),
    fil: opts.fil,
    officiel: !!opts.estAdmin,
    ...(formationId ? { formationId } : {}),
    // Le ballon d'hélium part vide : la fonction serveur seule le gonfle.
    pour: 0, contre: 0, score: 0, nbCommentaires: 0,
    chaleur: calculerChaleur(0, Date.now()),
    creeLe: serverTimestamp(),
  });
  points.commentaireLaisse(opts.uid, postId).catch(() => {});
  return id;
}

export async function retirerDuMur(post: PostMur): Promise<void> {
  if (!db) return;
  await deleteDoc(doc(db, COL, post.id));
  if (post.photoChemin) await deleteStoredImage(post.photoChemin).catch(() => {});
}

const lire = (d: { id: string; data: () => Record<string, unknown> }): PostMur =>
  ({ id: d.id, ...(d.data() as Omit<PostMur, 'id'>) });

const parChaleur = <T extends { chaleur?: number }>(a: T, b: T) => (b.chaleur ?? 0) - (a.chaleur ?? 0);

/** Le fil demandé, du plus chaud au plus froid (le ballon d'hélium — voir
 *  calculerChaleur). */
export function suivreLeMur(fil: FilMur, cb: (posts: PostMur[]) => void, max = 100): () => void {
  if (!db) { cb([]); return () => {}; }
  const q = query(collection(db, COL), where('fil', '==', fil), orderBy('chaleur', 'desc'), fsLimit(max));
  // Les épinglés d'abord, puis les billets de Krystine, puis la chaleur.
  const trier = (posts: PostMur[]) => [...posts].sort((x, y) =>
    Number(!!y.epingle) - Number(!!x.epingle)
    || Number(!!y.officiel) - Number(!!x.officiel)
    || (y.chaleur ?? 0) - (x.chaleur ?? 0));
  return onSnapshot(q, (snap) => cb(trier(snap.docs.map(lire))), () => cb([]));
}

// ── Voter sur un billet ─────────────────────────────────────────────

/** 1 = pour, -1 = contre, 0 = retire le vote. */
export async function voter(postId: string, uid: string, nom: string, valeur: 1 | -1 | 0): Promise<void> {
  if (!db) return;
  const r = doc(db, COL, postId, 'votes', uid);
  if (valeur === 0) { await deleteDoc(r); return; }
  await setDoc(r, { valeur, nom, majLe: serverTimestamp() });
}

export function suivreMonVote(postId: string, uid: string, cb: (valeur: 1 | -1 | 0) => void): () => void {
  if (!db) { cb(0); return () => {}; }
  return onSnapshot(doc(db, COL, postId, 'votes', uid), (snap) => {
    const v = snap.data()?.valeur;
    cb(v === 1 || v === -1 ? v : 0);
  }, () => cb(0));
}

// ── Les commentaires ─────────────────────────────────────────────────

export interface CommentaireMur {
  id: string;
  uid: string;
  nom: string;
  avatarUrl?: string;
  texte: string;
  pour?: number;
  contre?: number;
  score?: number;
  chaleur?: number;
  creeLe: Timestamp | null;
}

const lireCommentaire = (d: { id: string; data: () => Record<string, unknown> }): CommentaireMur =>
  ({ id: d.id, ...(d.data() as Omit<CommentaireMur, 'id'>) });

export async function publierCommentaire(postId: string, opts: {
  uid: string; nom: string; avatarUrl?: string; texte: string;
}): Promise<string> {
  if (!db) throw new Error('Firestore non configuré');
  const texte = opts.texte.trim().slice(0, LONGUEUR_MAX_COMMENTAIRE);
  if (!texte) throw new Error('Rien à publier.');
  const id = doc(collection(db, COL, postId, 'commentaires')).id;
  await setDoc(doc(db, COL, postId, 'commentaires', id), {
    uid: opts.uid, nom: opts.nom,
    ...(opts.avatarUrl ? { avatarUrl: opts.avatarUrl } : {}),
    texte,
    pour: 0, contre: 0, score: 0,
    chaleur: calculerChaleur(0, Date.now()),
    creeLe: serverTimestamp(),
  });
  return id;
}

/** Triés par chaleur décroissante, côté client (pas d'index de plus). */
export function suivreCommentaires(postId: string, cb: (commentaires: CommentaireMur[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(collection(db, COL, postId, 'commentaires'), (snap) => {
    cb(snap.docs.map(lireCommentaire).sort(parChaleur));
  }, () => cb([]));
}

export async function retirerCommentaire(postId: string, cid: string): Promise<void> {
  if (!db) return;
  await deleteDoc(doc(db, COL, postId, 'commentaires', cid));
}

export async function voterCommentaire(postId: string, cid: string, uid: string, nom: string, valeur: 1 | -1 | 0): Promise<void> {
  if (!db) return;
  const r = doc(db, COL, postId, 'commentaires', cid, 'votes', uid);
  if (valeur === 0) { await deleteDoc(r); return; }
  await setDoc(r, { valeur, nom, majLe: serverTimestamp() });
}

export function suivreMonVoteCommentaire(postId: string, cid: string, uid: string, cb: (valeur: 1 | -1 | 0) => void): () => void {
  if (!db) { cb(0); return () => {}; }
  return onSnapshot(doc(db, COL, postId, 'commentaires', cid, 'votes', uid), (snap) => {
    const v = snap.data()?.valeur;
    cb(v === 1 || v === -1 ? v : 0);
  }, () => cb(0));
}

// Les publications d'une seule personne (le mur du profil). Trié côté client
// pour éviter un index composite.
export function suivrePublicationsDe(uid: string, cb: (posts: PostMur[]) => void, max = 50): () => void {
  const q = query(collection(db, COL), where('uid', '==', uid), fsLimit(max));
  return onSnapshot(q, snap => {
    const posts = snap.docs.map(d => ({ id: d.id, ...d.data() } as PostMur));
    posts.sort((a, b) => (b.creeLe?.toMillis?.() || 0) - (a.creeLe?.toMillis?.() || 0));
    cb(posts);
  });
}

/** Épingler (ou dépingler) un billet : Krystine seulement (règle update admin). */
export async function epinglerPost(postId: string, epingle: boolean): Promise<void> {
  if (!db) throw new Error('Firestore non configuré');
  await updateDoc(doc(db, COL, postId), { epingle });
}

// ─── Les billets sauvegardés (par personne) ─────────────────────────────────
export async function sauvegarderPost(uid: string, postId: string, garder: boolean): Promise<void> {
  if (!db) throw new Error('Firestore non configuré');
  const ref = doc(db, 'members', uid, 'sauvegardes', postId);
  if (garder) await setDoc(ref, { creeLe: serverTimestamp() });
  else await deleteDoc(ref);
}

export function suivreMesSauvegardes(uid: string, cb: (ids: Set<string>) => void): () => void {
  if (!db) { cb(new Set()); return () => {}; }
  return onSnapshot(collection(db, 'members', uid, 'sauvegardes'),
    snap => cb(new Set(snap.docs.map(d => d.id))), () => cb(new Set()));
}

/** Un billet précis (pour l'onglet Enregistrés). */
export async function getPost(postId: string): Promise<PostMur | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, COL, postId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as PostMur) : null;
}
