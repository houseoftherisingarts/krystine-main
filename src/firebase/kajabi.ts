import { collection, doc, getDoc, getDocs, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { getAuth, sendEmailVerification } from 'firebase/auth';
import app, { db } from '../firebase';

// Les achats de l'ancien système (Kajabi) et leurs codes (functions/src/kajabi.ts).

export interface OffreKajabi { id: string; titre: string; charges: number; acheteuses: number; formationIds: string[] }
export interface EtatRegistre { aRestaurer: number; codeEnvoye: number; restaure: number }

/** Cliente : entrer le code reçu pour retrouver une formation. */
export async function utiliserCodeKajabi(code: string): Promise<{ formationId: string; titre: string }> {
  if (!app) throw new Error('[Codes] Firebase not configured');
  const call = httpsCallable(getFunctions(app, 'us-central1'), 'kajabiUtiliserCode');
  return (await call({ code })).data as { formationId: string; titre: string };
}

/** Cliente : à la connexion, les achats de l'ancien système à son adresse
 *  reviennent d'eux-mêmes (kajabiRestaurerAuto). Un seul appel par session et
 *  par compte, sauf si l'adresse reste à confirmer. Ne lance jamais d'erreur. */
export interface EtatRestauration { restaurees: number; aVerifier: boolean }
const restaurations = new Map<string, Promise<EtatRestauration>>();
export function restaurerKajabiAuto(uid: string): Promise<EtatRestauration> {
  const cle = `kajabiRestaure:${uid}`;
  const vide = { restaurees: 0, aVerifier: false };
  let p = restaurations.get(uid);
  if (p) return p;
  let dejaFait = false;
  try { dejaFait = sessionStorage.getItem(cle) === '1'; } catch { /* stockage bloqué */ }
  p = dejaFait || !app ? Promise.resolve(vide) : (async () => {
    // Revenue du lien de confirmation : le jeton doit le savoir avant l'appel.
    const moi = getAuth(app).currentUser;
    if (moi && !moi.emailVerified) { await moi.reload(); if (moi.emailVerified) await moi.getIdToken(true); }
    const call = httpsCallable(getFunctions(app, 'us-central1'), 'kajabiRestaurerAuto');
    const r = (await call({})).data as { restaurees?: string[]; aVerifier?: boolean };
    if (!r.aVerifier) try { sessionStorage.setItem(cle, '1'); } catch { /* stockage bloqué */ }
    return { restaurees: r.restaurees?.length || 0, aVerifier: !!r.aVerifier };
  })().catch(() => vide);
  restaurations.set(uid, p);
  return p;
}

/** Cliente : le lien qui confirme son adresse (compte courriel et mot de passe). */
export async function confirmerAdresseKajabi(): Promise<void> {
  if (!app) throw new Error('[Codes] Firebase not configured');
  const auth = getAuth(app);
  if (!auth.currentUser) throw new Error('Connectez-vous.');
  auth.languageCode = 'fr';
  await sendEmailVerification(auth.currentUser, { url: `${window.location.origin}/compte?onglet=formations` });
}

/** Admin : la table offre Kajabi → formations du site. */
export async function getOffresKajabi(): Promise<OffreKajabi[]> {
  if (!db) return [];
  const snap = await getDocs(collection(db, 'kajabiOffres'));
  return snap.docs.map(d => ({ id: d.id, formationIds: [], charges: 0, acheteuses: 0, titre: '', ...(d.data() as Partial<OffreKajabi>) }))
    .sort((a, b) => b.acheteuses - a.acheteuses);
}

export async function relierOffreKajabi(offerId: string, formationIds: string[]): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, 'kajabiOffres', offerId), { formationIds });
}

/** Admin : où en est le registre, offre par offre. */
export async function getEtatRegistreKajabi(): Promise<Record<string, EtatRegistre>> {
  if (!db) return {};
  const snap = await getDocs(collection(db, 'kajabiRegistre'));
  const out: Record<string, EtatRegistre> = {};
  for (const d of snap.docs) {
    const r = d.data() as { kjbOfferId: string; statut: string };
    const e = (out[r.kjbOfferId] ||= { aRestaurer: 0, codeEnvoye: 0, restaure: 0 });
    if (r.statut === 'code_envoye') e.codeEnvoye++; else if (r.statut === 'restaure') e.restaure++; else e.aRestaurer++;
  }
  return out;
}

/** Une acheteuse de l'ancien système, telle que le registre la connaît. */
export interface AcheteuseKajabi { nom: string; email: string; offreId: string; acheteLe: string; montant: number; statut: string }

/** Admin : la liste des acheteuses des offres données (pour la télécharger,
 *  demande de Krystine du 11 septembre 2026 : « tu peux m'extraire la liste des gens ? »). */
export async function getAcheteusesKajabi(offerIds: string[]): Promise<AcheteuseKajabi[]> {
  if (!db || !offerIds.length) return [];
  const voulues = new Set(offerIds);
  const snap = await getDocs(collection(db, 'kajabiRegistre'));
  const out: AcheteuseKajabi[] = [];
  for (const d of snap.docs) {
    const r = d.data() as { kjbOfferId?: string; nom?: string; emailNormalise?: string; acheteLe?: string; montant?: number; statut?: string };
    if (!r.kjbOfferId || !voulues.has(r.kjbOfferId)) continue;
    out.push({ nom: r.nom || '', email: r.emailNormalise || '', offreId: r.kjbOfferId, acheteLe: r.acheteLe || '', montant: r.montant || 0, statut: r.statut || '' });
  }
  return out.sort((a, b) => a.acheteLe.localeCompare(b.acheteLe) || a.email.localeCompare(b.email));
}

/** Admin : envoyer les codes d'une formation migrée (ou un seul, à une adresse de test). */
export async function emettreCodesKajabi(formationId: string, testEmail?: string): Promise<{ envoyes: number; sautes: number; erreurs: number; message?: string }> {
  if (!app) throw new Error('[Codes] Firebase not configured');
  const call = httpsCallable(getFunctions(app, 'us-central1'), 'kajabiEmettreCodes');
  return (await call({ formationId, testEmail: testEmail || '' })).data as { envoyes: number; sautes: number; erreurs: number; message?: string };
}

// ─── Où en est la migration (28 sept. 2026) ────────────────────────────────
// Les chiffres se calculent côté serveur (functions/src/kajabiMigration.ts);
// l'historique du lundi et la cible de rythme vivent dans
// analyseInfolettre/_migration, réservé à l'admin.

export interface LigneMigration { formationId: string; titre: string; personnes: number; codesEmis: number; codesEnvoyes: number; restaures: number; reste: number }
export interface EtatMigration {
  calculeLe: string;
  formations: LigneMigration[];
  total: Omit<LigneMigration, 'formationId' | 'titre'> & { pourcentage: number; personnesDistinctes: number };
  nonReliees: number;
}
export interface PointMigration { semaine: string; personnes: number; codesEmis: number; codesEnvoyes: number; restaures: number; reste: number; pourcentage: number }
export interface SuiviMigration { historique: PointMigration[]; cibleParSemaine: number | null }

/** Admin : les chiffres de la migration, calculés maintenant. */
export async function getEtatMigration(): Promise<EtatMigration> {
  if (!app) throw new Error('[Codes] Firebase not configured');
  const call = httpsCallable(getFunctions(app, 'us-central1'), 'kajabiEtatMigration');
  return (await call({})).data as EtatMigration;
}

/** Admin : l'historique des lundis et la cible de rythme. */
export async function getSuiviMigration(): Promise<SuiviMigration> {
  if (!db) return { historique: [], cibleParSemaine: null };
  const snap = await getDoc(doc(db, 'analyseInfolettre', '_migration'));
  const d = (snap.data() || {}) as { historique?: PointMigration[]; cible?: { parSemaine?: number } };
  return { historique: d.historique || [], cibleParSemaine: typeof d.cible?.parSemaine === 'number' ? d.cible.parSemaine : null };
}

/** Admin : la cible de rythme (personnes à migrer par semaine). */
export async function setCibleMigration(parSemaine: number): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, 'analyseInfolettre', '_migration'), { cible: { parSemaine, majLe: serverTimestamp() } }, { merge: true });
}
