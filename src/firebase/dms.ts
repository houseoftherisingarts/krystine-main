// ─── Les messages privés ──────────────────────────────────────────────
// Porté du FMM 2026 (src/firebase/dms.ts). Un fil par paire de membres,
// la clé est la paire d'uid triée : deux personnes ne se retrouvent
// jamais avec deux fils parallèles.
//
//   /dms/{filId}                  ← le fil (noms, photos, dernier mot)
//   /dms/{filId}/messages/{msgId} ← les messages
//
//   filId = [a, b].sort().join('__')
//
// Le blocage vit dans /blocages/{uid} (voir ./moderation). Avant tout
// envoi, sendDM vérifie si le destinataire m'a fait taire, sans
// modifier moderation.ts : la lecture se fait directement sur son
// document ici.

import {
  collection, doc, addDoc, setDoc, getDoc, query, orderBy, where,
  onSnapshot, serverTimestamp, increment, type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { LONGUEUR_MAX } from './moderation';

export interface DMThread {
  id: string;
  participantUids: [string, string];
  participantNames: Record<string, string>;
  participantPhotos?: Record<string, string>;
  lastMessage?:    string;
  lastMessageAt?:  Timestamp;
  lastSenderUid?:  string;
  unread?:         Record<string, number>;
}

export interface DM {
  id?:        string;
  senderUid:  string;
  senderName: string;
  body:       string;
  createdAt?: Timestamp;
}

export const threadId = (a: string, b: string): string => [a, b].sort().join('__');

/** Vrai si `autreUid` a mis `moiUid` sur la liste des silences. */
export async function estBloquePar(moiUid: string, autreUid: string): Promise<boolean> {
  if (!db) return false;
  const snap = await getDoc(doc(db, 'blocages', autreUid));
  const uids = (snap.data()?.uids as string[] | undefined) || [];
  return uids.includes(moiUid);
}

/** Ouvre le fil, ou rafraîchit noms et photos s'il existe déjà. Une
 *  seule écriture fusionnée, sans lecture préalable : les règles
 *  Firestore refusent de lire un document absent. */
export async function ensureThread(
  meUid: string, meName: string, mePhoto: string | undefined,
  otherUid: string, otherName: string, otherPhoto?: string,
): Promise<string> {
  if (!db) throw new Error('Firestore n’est pas configuré');
  const id = threadId(meUid, otherUid);
  const photos: Record<string, string> = {};
  if (mePhoto)    photos[meUid]    = mePhoto;
  if (otherPhoto) photos[otherUid] = otherPhoto;
  await setDoc(doc(db, 'dms', id), {
    participantUids:  [meUid, otherUid].sort() as [string, string],
    participantNames: { [meUid]: meName, [otherUid]: otherName },
    ...(Object.keys(photos).length ? { participantPhotos: photos } : {}),
  }, { merge: true });
  return id;
}

export function subscribeDMThread(id: string, cb: (msgs: DM[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  const q = query(collection(db, 'dms', id, 'messages'), orderBy('createdAt', 'asc'));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DM, 'id'>) }))),
    (err) => { console.warn('[dms] lecture du fil', err); cb([]); },
  );
}

export async function sendDM(id: string, msg: Omit<DM, 'id' | 'createdAt'>, otherUid: string): Promise<void> {
  if (!db) throw new Error('Firestore n’est pas configuré');
  const body = msg.body.trim().slice(0, LONGUEUR_MAX);
  if (!body) return;
  if (await estBloquePar(msg.senderUid, otherUid)) {
    throw new Error('Cette personne ne reçoit plus vos messages.');
  }
  await addDoc(collection(db, 'dms', id, 'messages'), { ...msg, body, createdAt: serverTimestamp() });
  await setDoc(doc(db, 'dms', id), {
    lastMessage:   body.slice(0, 140),
    lastMessageAt: serverTimestamp(),
    lastSenderUid: msg.senderUid,
    unread:        { [otherUid]: increment(1) },
  }, { merge: true });
}

export async function markThreadRead(id: string, uid: string): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, 'dms', id), { unread: { [uid]: 0 } }, { merge: true });
}

export function subscribeInbox(uid: string, cb: (threads: DMThread[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  const q = query(
    collection(db, 'dms'),
    where('participantUids', 'array-contains', uid),
    orderBy('lastMessageAt', 'desc'),
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DMThread, 'id'>) }))),
    (err) => { console.warn('[dms] lecture de la boîte', err); cb([]); },
  );
}
