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

export async function aAchete(uid: string, formationId: string): Promise<boolean> {
  const snap = await getDoc(doc(db(), 'achatsFormations', uid, 'formations', formationId));
  return snap.exists();
}

export async function getFormationsPubliees(): Promise<Formation[]> {
  const snap = await getDocs(query(collection(db(), 'formations'), where('statut', '==', 'publie')));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Formation))
    .sort((a, b) => a.titre.localeCompare(b.titre, 'fr'));
}

export async function getFormation(id: string): Promise<Formation | null> {
  const snap = await getDoc(doc(db(), 'formations', id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Formation) : null;
}

// ─── Les leçons d'un cours ───────────────────────────────────────────────────
// Le fichier vit dans Storage sous formations-contenu/ (illisible au public);
// la lecture passe par la fonction obtenirLecon qui vérifie l'achat.

export type LeconType = 'video' | 'audio' | 'pdf' | 'fichier';

export interface Lecon {
  id: string;
  titre: string;
  type: LeconType;
  chemin: string;
  duree?: string;
  ordre: number;
}

export function typeDeLecon(file: File): LeconType {
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type === 'application/pdf') return 'pdf';
  return 'fichier';
}

export async function getLecons(formationId: string): Promise<Lecon[]> {
  const snap = await getDocs(query(collection(db(), 'formations', formationId, 'lecons'), orderBy('ordre')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Lecon));
}

export async function ajouterLecon(formationId: string, file: File, titre: string, ordre: number): Promise<void> {
  if (!app) throw new Error('[Formations] Firebase not configured');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const chemin = `formations-contenu/${formationId}/${Date.now()}_${safeName}`;
  await uploadBytes(ref(getStorage(app), chemin), file);
  await setDoc(doc(collection(db(), 'formations', formationId, 'lecons')), {
    titre, type: typeDeLecon(file), chemin, ordre, creeLe: serverTimestamp(),
  });
}

export async function supprimerLecon(formationId: string, lecon: Lecon): Promise<void> {
  if (!app) throw new Error('[Formations] Firebase not configured');
  await deleteDoc(doc(db(), 'formations', formationId, 'lecons', lecon.id));
  try { await deleteObject(ref(getStorage(app), lecon.chemin)); } catch { /* fichier deja parti */ }
}

export async function setLeconOrdre(formationId: string, leconId: string, ordre: number): Promise<void> {
  await updateDoc(doc(db(), 'formations', formationId, 'lecons', leconId), { ordre });
}

// ─── La progression d'une membre ────────────────────────────────────────────

export interface Progression {
  terminees: Record<string, boolean>;
  derniereLecon?: string;
}

export async function getProgression(uid: string, formationId: string): Promise<Progression> {
  const snap = await getDoc(doc(db(), 'progression', uid, 'formations', formationId));
  return snap.exists() ? (snap.data() as Progression) : { terminees: {} };
}

export async function marquerLecon(uid: string, formationId: string, leconId: string, terminee: boolean): Promise<void> {
  await setDoc(doc(db(), 'progression', uid, 'formations', formationId), {
    terminees: { [leconId]: terminee },
    derniereLecon: leconId,
    maj: serverTimestamp(),
  }, { merge: true });
}

// ─── Les appels serveur (paywall) ───────────────────────────────────────────

export async function acheterFormation(formationId: string): Promise<string> {
  if (!app) throw new Error('[Formations] Firebase not configured');
  const call = httpsCallable(getFunctions(app, 'us-central1'), 'creerSessionPaiement');
  const res = await call({ formationId });
  return (res.data as { url: string }).url;
}

export async function urlDeLecon(formationId: string, leconId: string): Promise<string> {
  if (!app) throw new Error('[Formations] Firebase not configured');
  const call = httpsCallable(getFunctions(app, 'us-central1'), 'obtenirLecon');
  const res = await call({ formationId, leconId });
  return (res.data as { url: string }).url;
}
