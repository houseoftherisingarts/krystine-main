import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { httpsCallable, getFunctions } from 'firebase/functions';
import app, { db } from '../firebase';

// Les achats de l'ancien système (Kajabi) et leurs codes (functions/src/kajabi.ts).

export interface OffreKajabi { id: string; titre: string; charges: number; acheteuses: number; formationIds: string[] }
export interface EtatRegistre { aRestaurer: number; codeEnvoye: number; restaure: number }

/** Cliente : entrer le code reçu pour retrouver une formation. */
export async function utiliserCodeKajabi(code: string): Promise<{ formationId: string; titre: string }> {
  if (!app) throw new Error('[Kajabi] Firebase not configured');
  const call = httpsCallable(getFunctions(app, 'us-central1'), 'kajabiUtiliserCode');
  return (await call({ code })).data as { formationId: string; titre: string };
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
  if (!app) throw new Error('[Kajabi] Firebase not configured');
  const call = httpsCallable(getFunctions(app, 'us-central1'), 'kajabiEmettreCodes');
  return (await call({ formationId, testEmail: testEmail || '' })).data as { envoyes: number; sautes: number; erreurs: number; message?: string };
}
