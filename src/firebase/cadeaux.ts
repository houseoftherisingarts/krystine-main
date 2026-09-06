import { collection, onSnapshot, query, where, type Timestamp, type Unsubscribe } from 'firebase/firestore';
import { httpsCallable, getFunctions } from 'firebase/functions';
import app, { db } from '../firebase';

// Les cadeaux et rabais de Krystine (functions/src/cadeaux.ts).

export interface Cadeau {
  id: string;
  uid: string;
  formationId: string;
  formationTitre: string;
  formationImage: string;
  prix: number;
  pourcent: number;
  message: string;
  deNom: string;
  statut: 'offert' | 'utilise';
  creeLe?: Timestamp;
}

/** Les cadeaux encore à utiliser d'une membre, les plus récents d'abord. */
export function suivreMesCadeaux(uid: string, cb: (c: Cadeau[]) => void): Unsubscribe {
  if (!db || !uid) { cb([]); return () => {}; }
  // Sans orderBy (aucun index composé à créer) : le tri se fait ici.
  const q = query(collection(db, 'cadeaux'), where('uid', '==', uid), where('statut', '==', 'offert'));
  return onSnapshot(q, snap => {
    const liste = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Cadeau, 'id'>) }));
    liste.sort((a, b) => (b.creeLe?.toMillis?.() ?? 0) - (a.creeLe?.toMillis?.() ?? 0));
    cb(liste);
  }, () => cb([]));
}

export const prixReduit = (c: Cadeau): number => c.pourcent >= 100 ? 0 : Math.max(0.5, Math.round(c.prix * (100 - c.pourcent)) / 100);

/** Utiliser un cadeau : accordé sur le champ à 100 %, sinon Stripe au prix réduit. */
export async function utiliserCadeau(cadeauId: string): Promise<{ accorde: boolean; url?: string; montant?: number }> {
  if (!app) throw new Error('[Cadeaux] Firebase not configured');
  const call = httpsCallable(getFunctions(app, 'us-central1'), 'utiliserCadeau');
  const res = await call({ cadeauId });
  return res.data as { accorde: boolean; url?: string; montant?: number };
}

/** Admin : offrir un rabais (1 à 99 %) ou la formation entière (100 %) à une cliente. */
export async function offrirCadeau(uid: string, formationId: string, pourcent: number, message: string): Promise<string> {
  if (!app) throw new Error('[Cadeaux] Firebase not configured');
  const call = httpsCallable(getFunctions(app, 'us-central1'), 'offrirCadeau');
  const res = await call({ uid, formationId, pourcent, message });
  return (res.data as { id: string }).id;
}
