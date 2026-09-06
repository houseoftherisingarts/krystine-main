import app from '../firebase';
import {  getFirestore, collection, collectionGroup, doc, getDoc, getDocs, orderBy, query, where, setDoc,
  updateDoc, deleteDoc, serverTimestamp, Timestamp, addDoc, onSnapshot,} from 'firebase/firestore';
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
  categorie?: 'cours' | 'musique';
  lienFiche?: string;   // page de vente dédiée (ex. /foyer) au lieu de /cours/:id
  paywall?: boolean;
  evergreen?: boolean;
  dateSortie?: string | null;      // AAAA-MM-JJ quand la sortie est datée
  lancementOrchestre?: boolean;
  messageAcheteursEnvoye?: boolean;
  creeLe?: Timestamp;
  maj?: Timestamp;
}

export type FormationOptions = Pick<Formation,
  'paywall' | 'prix' | 'evergreen' | 'dateSortie' | 'lancementOrchestre' | 'messageAcheteursEnvoye' | 'categorie'>;

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

export interface AcheteurFormation {
  uid: string;
  acheteLe?: Timestamp;
  montant?: number;
  source?: string;
}

// Toutes les personnes qui possèdent une formation (admin seulement, via la
// règle collection-group). ponytail: lit tous les achats puis filtre par id de
// document; passer à un champ formationId indexé si le volume le demande.
export async function getAcheteursDe(formationId: string): Promise<AcheteurFormation[]> {
  const snap = await getDocs(collectionGroup(db(), 'formations'));
  return snap.docs
    .filter(d => d.id === formationId && d.ref.parent.parent?.parent.id === 'achatsFormations')
    .map(d => ({
      uid: d.ref.parent.parent!.id,
      acheteLe: (d.data() as { acheteLe?: Timestamp }).acheteLe,
      montant: (d.data() as { montant?: number }).montant,
      source: (d.data() as { source?: string }).source,
    }));
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

// 'texte' = une page sans fichier (accueil, consigne, exercice écrit), façon Kajabi.
export type LeconType = 'video' | 'audio' | 'pdf' | 'fichier' | 'texte';

export interface Lecon {
  id: string;
  titre: string;
  type: LeconType;
  chemin: string;
  duree?: string;
  ordre: number;
  /** La section du cours (module Kajabi, section Circle) qui regroupe la leçon. */
  moduleNom?: string;
  /** Le texte d'accompagnement, mise en forme légère (## titre, **gras**, - liste, liens). */
  texte?: string;
  /** Le mois de la porte du Foyer (ex. 'septembre'). */
  mois?: string;
  /** Les documents déposés par Krystine sous la leçon. */
  docs?: Array<{ nom: string; chemin: string }>;
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

/** Une leçon sans fichier : une page de texte (accueil, consigne, exercice écrit). */
export async function creerLeconTexte(formationId: string, titre: string, ordre: number): Promise<void> {
  await setDoc(doc(collection(db(), 'formations', formationId, 'lecons')), {
    titre: titre.trim().slice(0, 120) || 'Page de texte', type: 'texte', chemin: '', ordre, creeLe: serverTimestamp(),
  });
}

/** Remplace (ou ajoute) le fichier média d'une leçon; l'ancien quitte Storage. */
export async function remplacerFichierLecon(formationId: string, lecon: Lecon, file: File): Promise<void> {
  if (!app) throw new Error('[Formations] Firebase not configured');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const chemin = `formations-contenu/${formationId}/${Date.now()}_${safeName}`;
  await uploadBytes(ref(getStorage(app), chemin), file);
  await updateDoc(doc(db(), 'formations', formationId, 'lecons', lecon.id), { chemin, type: typeDeLecon(file) });
  if (lecon.chemin) { try { await deleteObject(ref(getStorage(app), lecon.chemin)); } catch { /* déjà parti */ } }
}

export async function supprimerLecon(formationId: string, lecon: Lecon): Promise<void> {
  if (!app) throw new Error('[Formations] Firebase not configured');
  await deleteDoc(doc(db(), 'formations', formationId, 'lecons', lecon.id));
  if (lecon.chemin) { try { await deleteObject(ref(getStorage(app), lecon.chemin)); } catch { /* fichier deja parti */ } }
  for (const d of lecon.docs || []) { try { await deleteObject(ref(getStorage(app), d.chemin)); } catch { /* déjà parti */ } }
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

// ─── Les onglets d'un espace de formation (façon Circle) ────────────────────
// Krystine crée des onglets depuis l'admin; chacun porte son propre fil
// (`formation:{id}--{onglet}`) dans la même collection mur.

export interface OngletFormation {
  id: string;
  nom: string;
  ordre: number;
}

export async function getOngletsFormation(formationId: string): Promise<OngletFormation[]> {
  const snap = await getDocs(query(collection(db(), 'formations', formationId, 'onglets'), orderBy('ordre')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as OngletFormation));
}

export async function ajouterOngletFormation(formationId: string, nom: string, ordre: number): Promise<void> {
  const id = nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || `onglet-${Date.now()}`;
  await setDoc(doc(db(), 'formations', formationId, 'onglets', id), { nom: nom.trim().slice(0, 40), ordre });
}

export async function supprimerOngletFormation(formationId: string, ongletId: string): Promise<void> {
  await deleteDoc(doc(db(), 'formations', formationId, 'onglets', ongletId));
}

// ─── Les membres d'un groupe de formation ───────────────────────────────────
// Miroir écrit par la fonction groupeMembre à chaque achat (lisible par toute
// personne connectée : la colonne Membres de l'espace du cours).

export interface MembreGroupe {
  uid: string;
  ajouteLe?: Timestamp;
}

export async function getMembresGroupe(formationId: string): Promise<MembreGroupe[]> {
  const snap = await getDocs(collection(db(), 'groupes', formationId, 'membres'));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() } as MembreGroupe));
}

// ─── Le contenu riche d'une leçon (admin) ───────────────────────────────────
export async function majLecon(formationId: string, leconId: string, champs: Partial<Pick<Lecon, 'titre' | 'texte' | 'mois' | 'duree' | 'moduleNom'>>): Promise<void> {
  await updateDoc(doc(db(), 'formations', formationId, 'lecons', leconId), champs as Record<string, unknown>);
}

export async function ajouterDocumentLecon(formationId: string, leconId: string, file: File): Promise<void> {
  if (!app) throw new Error('[Formations] Firebase not configured');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const chemin = `formations-contenu/${formationId}/docs/${Date.now()}_${safeName}`;
  await uploadBytes(ref(getStorage(app), chemin), file);
  const lecon = (await getDoc(doc(db(), 'formations', formationId, 'lecons', leconId))).data() as Lecon | undefined;
  const docs = [...(lecon?.docs || []), { nom: file.name, chemin }];
  await updateDoc(doc(db(), 'formations', formationId, 'lecons', leconId), { docs });
}

export async function retirerDocumentLecon(formationId: string, leconId: string, chemin: string): Promise<void> {
  if (!app) throw new Error('[Formations] Firebase not configured');
  const lecon = (await getDoc(doc(db(), 'formations', formationId, 'lecons', leconId))).data() as Lecon | undefined;
  const docs = (lecon?.docs || []).filter(d => d.chemin !== chemin);
  await updateDoc(doc(db(), 'formations', formationId, 'lecons', leconId), { docs });
  try { await deleteObject(ref(getStorage(app), chemin)); } catch { /* déjà parti */ }
}

/** URL signée d'un document d'une leçon (même barrière d'achat que la leçon). */
export async function urlDeDocumentLecon(formationId: string, leconId: string, docIndex: number): Promise<string> {
  if (!app) throw new Error('[Formations] Firebase not configured');
  const call = httpsCallable(getFunctions(app, 'us-central1'), 'obtenirLecon');
  const res = await call({ formationId, leconId, docIndex });
  return (res.data as { url: string }).url;
}

// ─── Les questions sous une leçon ───────────────────────────────────────────
// Chaque membre pose sa question; Krystine répond depuis la même carte.

export interface QuestionLecon {
  id: string;
  uid: string;
  nom: string;
  texte: string;
  creeLe?: Timestamp;
  reponse?: string;
  reponduLe?: Timestamp;
}

export async function poserQuestion(formationId: string, leconId: string, opts: { uid: string; nom: string; texte: string }): Promise<void> {
  await addDoc(collection(db(), 'formations', formationId, 'lecons', leconId, 'questions'), {
    uid: opts.uid, nom: opts.nom, texte: opts.texte.trim().slice(0, 2000), creeLe: serverTimestamp(),
  });
}

export function suivreQuestions(formationId: string, leconId: string, cb: (qs: QuestionLecon[]) => void): () => void {
  const q = query(collection(db(), 'formations', formationId, 'lecons', leconId, 'questions'), orderBy('creeLe', 'desc'));
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as QuestionLecon))), () => cb([]));
}

export async function repondreQuestion(formationId: string, leconId: string, questionId: string, reponse: string): Promise<void> {
  await updateDoc(doc(db(), 'formations', formationId, 'lecons', leconId, 'questions', questionId), {
    reponse: reponse.trim().slice(0, 4000), reponduLe: serverTimestamp(),
  });
}
