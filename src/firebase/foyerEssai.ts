import app from '../firebase';
import {
  getFirestore, collection, doc, getDocs, orderBy, query, setDoc,
  updateDoc, deleteDoc, serverTimestamp, arrayUnion, arrayRemove, type Timestamp,
} from 'firebase/firestore';
import {
  getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject, type UploadTask,
} from 'firebase/storage';
import { PORTES } from '../pages/foyer/portesData';

// ─────────────────────────────────────────────────────────────────────────
// FOYER D'ORIGINE, PAGE D'ESSAI (bac à sable, hors page de vente réelle)
// Une porte est un module au sens Kajabi : un titre (portesData.ts), une
// intro (le thème et la question, déjà dans portesData.ts) et une liste
// ordonnée de leçons. Chaque leçon porte son propre titre, son propre texte,
// et autant de pièces jointes qu'il faut (vidéo, audio, PDF, image), chacune
// avec son propre chemin de Storage.
//
// Structure calquée sur `formations/{id}/lecons` (src/firebase/formations.ts)
// pour que ce bac à sable se porte tel quel vers le vrai Foyer plus tard :
// `foyerEssai/{porteId}/lecons/{leconId}`. La seule différence assumée avec
// le modèle des vraies formations (un fichier « principal » + des documents
// de support) : ici chaque pièce est de rang égal, avec sa propre barre de
// progression et son propre retrait, parce que Krystine doit pouvoir déposer
// plusieurs vidéos ou plusieurs PDF sur une même leçon (demande d'Alex, 10
// septembre 2026).
//
// CLOISONNEMENT TOTAL : les fichiers vivent dans `foyer-essai/`, distinct de
// `formations-contenu/`, et les documents dans `foyerEssai`, distincte de
// `formations`. Rien de ce qui est déposé ici ne touche le vrai Foyer.
// ─────────────────────────────────────────────────────────────────────────

const COLLECTION = 'foyerEssai';
const DOSSIER = 'foyer-essai';

export type PieceType = 'video' | 'audio' | 'pdf' | 'image' | 'fichier';

export interface PieceEssai {
  id: string;
  nom: string;
  type: PieceType;
  chemin: string;
  url: string;
  taille: number;
  contentType: string;
}

export interface LeconEssai {
  id: string;
  titre: string;
  texte?: string;
  ordre: number;
  pieces: PieceEssai[];
  creeLe?: Timestamp;
}

const db = () => {
  if (!app) throw new Error('[FoyerEssai] Firebase not configured');
  return getFirestore(app);
};
const store = () => {
  if (!app) throw new Error('[FoyerEssai] Firebase not configured');
  return getStorage(app);
};

export function typeDePiece(file: File): PieceType {
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type.startsWith('image/')) return 'image';
  return 'fichier';
}

export const poids = (n: number) => (n < 1024 * 1024 ? `${Math.round(n / 1024)} ko` : `${(n / (1024 * 1024)).toFixed(1)} Mo`);

export async function chargerLeconsPorte(porteId: string): Promise<LeconEssai[]> {
  const snap = await getDocs(query(collection(db(), COLLECTION, porteId, 'lecons'), orderBy('ordre')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as LeconEssai));
}

/** Les leçons de chaque porte, en un seul aller : douze petites lectures en
 *  parallèle plutôt qu'une requête `collectionGroup` (qui capturerait aussi
 *  les leçons des vraies formations, puisqu'elles portent le même nom de
 *  sous-collection). */
export async function chargerToutesLecons(): Promise<Record<string, LeconEssai[]>> {
  const paires = await Promise.all(PORTES.map(async porte => [porte.n, await chargerLeconsPorte(porte.n)] as const));
  return Object.fromEntries(paires);
}

export async function creerLeconEssai(porteId: string, titre: string, ordre: number): Promise<void> {
  await setDoc(doc(collection(db(), COLLECTION, porteId, 'lecons')), {
    titre: titre.trim().slice(0, 120) || 'Leçon sans titre', texte: '', pieces: [], ordre, creeLe: serverTimestamp(),
  });
}

export async function majLeconEssai(porteId: string, leconId: string, champs: Partial<Pick<LeconEssai, 'titre' | 'texte'>>): Promise<void> {
  await updateDoc(doc(db(), COLLECTION, porteId, 'lecons', leconId), champs as Record<string, unknown>);
}

export async function setLeconEssaiOrdre(porteId: string, leconId: string, ordre: number): Promise<void> {
  await updateDoc(doc(db(), COLLECTION, porteId, 'lecons', leconId), { ordre });
}

export async function supprimerLeconEssai(porteId: string, lecon: LeconEssai): Promise<void> {
  await deleteDoc(doc(db(), COLLECTION, porteId, 'lecons', lecon.id));
  for (const p of lecon.pieces) { try { await deleteObject(ref(store(), p.chemin)); } catch { /* déjà partie */ } }
}

interface EnvoiPiece { task: UploadTask; done: Promise<PieceEssai> }

/** Dépose une pièce sur une leçon : l'appelante suit `task` pour la barre de
 *  progression, puis écrit la pièce dans le document une fois `done` résolue. */
export function televerserPiece(porteId: string, leconId: string, file: File, onProgress: (pct: number) => void): EnvoiPiece {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const chemin = `${DOSSIER}/${porteId}/${leconId}/${Date.now()}_${safeName}`;
  const storageRef = ref(store(), chemin);
  const task = uploadBytesResumable(storageRef, file, { contentType: file.type || undefined });
  const done = new Promise<PieceEssai>((resolve, reject) => {
    task.on('state_changed',
      s => onProgress((s.bytesTransferred / s.totalBytes) * 100),
      reject,
      async () => {
        try {
          const url = await getDownloadURL(storageRef);
          resolve({
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, nom: file.name, type: typeDePiece(file),
            chemin, url, taille: file.size, contentType: file.type,
          });
        } catch (e) { reject(e); }
      });
  });
  return { task, done };
}

// `arrayUnion`/`arrayRemove` plutôt qu'un lire-puis-écrire sur `lecon.pieces` :
// plusieurs pièces se déposent souvent en même temps (fichiers multiples
// sélectionnés d'un coup) et un lire-puis-écrire sur une valeur locale figée
// en aurait perdu une, la deuxième écriture écrasant la première.
export async function enregistrerPiece(porteId: string, leconId: string, _lecon: LeconEssai, piece: PieceEssai): Promise<void> {
  await updateDoc(doc(db(), COLLECTION, porteId, 'lecons', leconId), { pieces: arrayUnion(piece) });
}

export async function retirerPieceLecon(porteId: string, leconId: string, _lecon: LeconEssai, piece: PieceEssai): Promise<void> {
  await updateDoc(doc(db(), COLLECTION, porteId, 'lecons', leconId), { pieces: arrayRemove(piece) });
  try { await deleteObject(ref(store(), piece.chemin)); } catch { /* déjà partie */ }
}
