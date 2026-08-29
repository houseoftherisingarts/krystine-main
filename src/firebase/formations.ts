import app from '../firebase';
import {
  getFirestore, collection, doc, getDoc, getDocs, orderBy, query, where, setDoc,
  updateDoc, deleteDoc, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, deleteObject } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Les formations natives (migration Kajabi, 2026-08-28). Les documents sont
// créés par l'import; l'admin les publie, les masque ou les supprime.
// statut 'masque' = invisible au public; 'publie' = visible dans la vitrine.

export interface Formation {
  id: string;
  titre: string;
  description: string;
  imageUrl: string;
  kajabiId: string;
  statut: 'masque' | 'publie';
  prix: number | null;
  // Options de mise en vente (panneau « Options » de l'admin).
  paywall?: boolean;
  evergreen?: boolean;
  dateSortie?: string | null;      // AAAA-MM-JJ quand la sortie est datée
  lancementOrchestre?: boolean;
  messageAcheteursEnvoye?: boolean;
  creeLe?: Timestamp;
  maj?: Timestamp;
}

export type FormationOptions = Pick<Formation,
  'paywall' | 'prix' | 'evergreen' | 'dateSortie' | 'lancementOrchestre' | 'messageAcheteursEnvoye'>;

const db = () => {
  if (!app) throw new Error('[Formations] Firebase not configured');
  return getFirestore(app);
};

export async function getFormations(): Promise<Formation[]> {
  const snap = await getDocs(query(collection(db(), 'formations'), orderBy('titre')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Formation));
}

export async function setFormationStatut(id: string, statut: Formation['statut']) {
  await updateDoc(doc(db(), 'formations', id), { statut, maj: serverTimestamp() });
}

export async function deleteFormation(id: string) {
  await deleteDoc(doc(db(), 'formations', id));
}

export async function updateFormationOptions(id: string, options: FormationOptions) {
  await updateDoc(doc(db(), 'formations', id), { ...options, maj: serverTimestamp() });
}

// Les formations achetées par un membre. La preuve d'achat sera écrite par le
// webhook Stripe; l'admin peut aussi en accorder une à la main (tests, cadeaux).
export interface AchatFormation {
  id: string;            // = id de la formation
  titre: string;
  imageUrl: string;
  acheteLe?: Timestamp;
}

export async function getMesFormations(uid: string): Promise<AchatFormation[]> {
  const snap = await getDocs(collection(db(), 'achatsFormations', uid, 'formations'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as AchatFormation));
}
