import { db } from '../firebase';
import { doc, onSnapshot, setDoc, serverTimestamp, type Timestamp } from 'firebase/firestore';

// ─── Le live de Krystine ─────────────────────────────────────────────────────
// Un seul document, livesEnCours/actuel : soit un live est en cours, soit non.
// Public (fil de la communauté) ou exclusif à une formation (formationId posé).
// Lecture publique (la pastille « Live en cours » s'affiche partout), écriture
// réservée à l'admin par les règles Firestore.

export interface LiveEnCours {
  actif: boolean;
  titre: string;
  /** Lien de diffusion (YouTube, Zoom, Daily…). */
  url?: string;
  /** Posé = live exclusif à cette formation; absent = live public. */
  formationId?: string;
  commenceLe?: Timestamp;
}

export function suivreLiveEnCours(cb: (live: LiveEnCours | null) => void): () => void {
  if (!db) { cb(null); return () => {}; }
  return onSnapshot(doc(db, 'livesEnCours', 'actuel'), snap => {
    const d = snap.data() as LiveEnCours | undefined;
    cb(d && d.actif ? d : null);
  }, () => cb(null));
}

export async function demarrerLive(opts: { titre: string; url?: string; formationId?: string }): Promise<void> {
  if (!db) throw new Error('Firestore non configuré');
  await setDoc(doc(db, 'livesEnCours', 'actuel'), {
    actif: true,
    titre: opts.titre.trim().slice(0, 140),
    ...(opts.url ? { url: opts.url.trim() } : {}),
    ...(opts.formationId ? { formationId: opts.formationId } : {}),
    commenceLe: serverTimestamp(),
  });
}

export async function terminerLive(): Promise<void> {
  if (!db) throw new Error('Firestore non configuré');
  await setDoc(doc(db, 'livesEnCours', 'actuel'), { actif: false }, { merge: true });
}
