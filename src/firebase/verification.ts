import app from '../firebase';
import { getFirestore, doc, onSnapshot, type Timestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, deleteObject } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFormations, getMesFormations } from './formations';
import { EXTENSIONS_PIECE, TAILLE_PIECE_MAX, cheminPiece, type StatutVerification } from '../lib/badgeBleu';

// Le Badge Bleu, côté membre : suivre sa demande, compter ses programmes,
// téléverser la pièce d'identité et déposer la demande. Le serveur juge tout
// (functions/src/verification.ts); ici, on montre. Plan : docs/badge-bleu-plan.md.

export interface Verification {
  statut: StatutVerification;
  programmes: number;
  pieceChemin?: string | null;
  demandeLe?: Timestamp;
  decideLe?: Timestamp | null;
  decidePar?: string | null;
  motif?: string | null;
}

/** verifications/{uid} en temps réel; null quand il n'y a pas de demande (ou que la lecture est refusée). */
export function suivreVerification(uid: string, cb: (v: Verification | null) => void): () => void {
  if (!app) { cb(null); return () => {}; }
  return onSnapshot(
    doc(getFirestore(app), 'verifications', uid),
    (s) => cb(s.exists() ? (s.data() as Verification) : null),
    () => cb(null),
  );
}

/** Affichage seulement : les achats de la membre croisés avec les formations payantes hors musique. Le serveur refait le compte. */
export async function compterProgrammesSuivis(uid: string): Promise<number> {
  const [miens, toutes] = await Promise.all([getMesFormations(uid), getFormations()]);
  const programmes = new Set(toutes.filter((f) => f.paywall === true && f.categorie !== 'musique').map((f) => f.id));
  return miens.filter((a) => programmes.has(a.id)).length;
}

/** Téléverse la pièce dans verifications/{uid}/piece.<ext> et rend ce chemin. Refuse un type ou une taille hors norme. */
export async function televerserPiece(uid: string, file: File, lang = 'FR'): Promise<string> {
  const fr = lang === 'FR';
  if (!app) throw new Error(fr ? 'Le service n’est pas disponible pour le moment.' : 'The service is not available right now.');
  const ext = EXTENSIONS_PIECE[file.type];
  if (!ext) throw new Error(fr ? 'Choisissez une image (JPG, PNG, WebP ou HEIC) ou un PDF.' : 'Choose an image (JPG, PNG, WebP or HEIC) or a PDF.');
  if (file.size > TAILLE_PIECE_MAX) throw new Error(fr ? 'Le fichier dépasse 8 Mo. Choisissez une version plus légère.' : 'The file is over 8 MB. Choose a lighter version.');
  const chemin = cheminPiece(uid, ext);
  await uploadBytes(ref(getStorage(app), chemin), file, { contentType: file.type });
  return chemin;
}

/** Dépose la demande. Si le serveur refuse après un téléversement réussi, la pièce est retirée du Storage avant de relancer l'erreur. */
export async function demanderBadgeBleu(pieceChemin: string): Promise<{ ok: boolean; programmes: number }> {
  if (!app) throw new Error('Firebase not configured');
  const call = httpsCallable<{ pieceChemin: string }, { ok: boolean; programmes: number }>(getFunctions(app, 'us-central1'), 'demanderBadgeBleu');
  try {
    return (await call({ pieceChemin })).data;
  } catch (e) {
    await deleteObject(ref(getStorage(app), pieceChemin)).catch(() => {});
    throw e;
  }
}
