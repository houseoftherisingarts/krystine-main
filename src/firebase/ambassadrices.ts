import app, { db } from '../firebase';
import {
  doc, getDoc, setDoc, getDocs, collection, collectionGroup, query, where, serverTimestamp, type Timestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Le programme des ambassadrices, côté navigateur. Les règles et l'argent
// vivent au serveur (functions/src/ambassadrices.ts, paiements.ts) : ici, la
// lecture, les trois appels de la membre et les gestes de l'admin.

// Miroir de functions/src/ambassadricesRegles.ts.
export const PART_DEFAUT = 20;
export const PART_PREMIUM_DEFAUT = 30;
export const RABAIS_DEFAUT = 10;
export const PAS = 5;
export const PART_MAX = 60;

export interface Ambassadrice {
  uid: string;
  code: string;
  nom: string;
  email: string;
  premium: boolean;
  part?: number | null;
  rabaisClient: number;
  actif: boolean;
  creeLe?: Timestamp;
}

export interface Commission {
  id: string;
  ambassadriceUid: string;
  titre: string;
  payeHT: number;       // cents
  rabaisPct: number;
  commissionPct: number;
  commission: number;   // cents
  statut: 'due' | 'versee';
  at?: Timestamp;
}

export const partDe = (a: Pick<Ambassadrice, 'premium' | 'part'>, partPremium = PART_PREMIUM_DEFAUT): number =>
  Math.min(PART_MAX, Math.max(0, typeof a.part === 'number' ? a.part : a.premium ? partPremium : PART_DEFAUT));
export const rabaisDe = (a: Pick<Ambassadrice, 'premium' | 'part' | 'rabaisClient'>, partPremium?: number): number =>
  Math.min(partDe(a, partPremium), Math.max(0, a.rabaisClient ?? RABAIS_DEFAUT));

export const dollars = (cents: number): string =>
  (cents / 100).toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $';

const appel = <T,>(nom: string, data?: unknown): Promise<T> => {
  if (!app) throw new Error('[Ambassadrices] Firebase not configured');
  return httpsCallable(getFunctions(app, 'us-central1'), nom)(data).then(r => r.data as T);
};

// ─── La membre ──────────────────────────────────────────────────────────────

export async function monAmbassadrice(uid: string): Promise<Ambassadrice | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'ambassadrices', uid));
  return snap.exists() ? ({ uid, ...snap.data() } as Ambassadrice) : null;
}

export const devenirAmbassadrice = () => appel<{ code: string }>('devenirAmbassadrice');
export const reglerAmbassadrice = (rabaisClient: number) =>
  appel<{ rabaisClient: number; commission: number; part: number }>('reglerAmbassadrice', { rabaisClient });
export const monRabaisAmbassadrice = () => appel<{ rabaisPct: number; nom: string }>('monRabaisAmbassadrice');

export async function mesCommissions(uid: string): Promise<Commission[]> {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, 'commissionsAmbassadrices'), where('ambassadriceUid', '==', uid)));
  return trier(snap.docs.map(d => ({ id: d.id, ...d.data() } as Commission)));
}

const trier = (l: Commission[]) => l.sort((a, b) => (b.at?.toMillis() || 0) - (a.at?.toMillis() || 0));

export async function getPartPremium(): Promise<number> {
  if (!db) return PART_PREMIUM_DEFAUT;
  const n = Number((await getDoc(doc(db, 'settings', 'ambassadrices'))).data()?.partPremium);
  return Number.isFinite(n) && n > 0 ? n : PART_PREMIUM_DEFAUT;
}

// ─── L'admin ────────────────────────────────────────────────────────────────

export async function listerAmbassadrices(): Promise<Ambassadrice[]> {
  if (!db) return [];
  const snap = await getDocs(collection(db, 'ambassadrices'));
  return snap.docs
    .map(d => ({ uid: d.id, ...d.data() } as Ambassadrice))
    .sort((a, b) => Number(b.premium) - Number(a.premium) || (a.nom || '').localeCompare(b.nom || ''));
}

export async function listerCommissions(): Promise<Commission[]> {
  if (!db) return [];
  const snap = await getDocs(collection(db, 'commissionsAmbassadrices'));
  return trier(snap.docs.map(d => ({ id: d.id, ...d.data() } as Commission)));
}

export async function majAmbassadrice(uid: string, patch: Partial<Pick<Ambassadrice, 'premium' | 'part' | 'actif'>>): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, 'ambassadrices', uid), patch, { merge: true });
}

export async function marquerCommission(id: string, versee: boolean): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, 'commissionsAmbassadrices', id), { statut: versee ? 'versee' : 'due', verseeLe: versee ? serverTimestamp() : null }, { merge: true });
}

export async function setPartPremium(partPremium: number): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, 'settings', 'ambassadrices'), { partPremium }, { merge: true });
}

export const nommerAmbassadrice = (email: string, premium: boolean) =>
  appel<{ uid: string; code: string }>('nommerAmbassadrice', { email, premium });

// ─── Les meilleures candidates ──────────────────────────────────────────────
// Un indice de 0 à 100 qui classe les membres selon ce que leur fiche montre
// déjà : ce qu'elles ont suivi, ce qu'elles ont déjà fait venir, et si elles
// sont encore présentes. Ce n'est pas une prédiction savante : la même
// recette pour tout le monde, lisible ligne par ligne ci-dessous.

export interface Candidate {
  uid: string; nom: string; email: string; indice: number; raisons: string[];
}

interface FicheCandidate {
  formations: number; totalHT: number; filleules: number; filleulesAcheteuses: number;
  joursDepuisVisite: number | null; moisAnciennete: number;
}

export function indiceCandidate(f: FicheCandidate): number {
  const pts =
      Math.min(f.formations, 4) / 4 * 30                 // elle a suivi des formations
    + Math.min(f.totalHT / 50000, 1) * 15                // elle y a investi (plafond 500 $)
    + Math.min(f.filleules, 5) / 5 * 25                  // elle invite déjà
    + Math.min(f.filleulesAcheteuses, 2) / 2 * 15        // ses invitées achètent
    + (f.joursDepuisVisite == null ? 0 : f.joursDepuisVisite <= 30 ? 10 : f.joursDepuisVisite <= 90 ? 5 : 0)
    + (f.moisAnciennete >= 6 ? 5 : 0);
  return Math.round(pts);
}

export async function candidatesAmbassadrices(exclure: string[]): Promise<Candidate[]> {
  if (!db) return [];
  const [membres, achats] = await Promise.all([
    getDocs(collection(db, 'members')),
    getDocs(collectionGroup(db, 'formations')),
  ]);
  // Seules les vraies ventes Stripe comptent (même filtre que commandes.ts).
  const parUid: Record<string, { n: number; ht: number }> = {};
  for (const d of achats.docs) {
    const uid = d.ref.parent.parent?.id;
    const a = d.data() as { sessionId?: string; montantHT?: number; montant?: number };
    if (!uid || d.ref.parent.parent?.parent.id !== 'achatsFormations' || !a.sessionId) continue;
    const e = (parUid[uid] ||= { n: 0, ht: 0 });
    e.n += 1; e.ht += typeof a.montantHT === 'number' ? a.montantHT : Math.round((a.montant || 0) * 100);
  }
  const jour = 86400000, maintenant = Date.now();
  const hors = new Set(exclure);
  return membres.docs
    .map(d => {
      const m = d.data() as { uid?: string; email?: string; displayName?: string; filleules?: number; filleulesAcheteuses?: number; joinedAt?: Timestamp; lastSeenAt?: Timestamp };
      const uid = m.uid || d.id;
      const a = parUid[uid] || { n: 0, ht: 0 };
      const vue = m.lastSeenAt ? Math.floor((maintenant - m.lastSeenAt.toMillis()) / jour) : null;
      const fiche: FicheCandidate = {
        formations: a.n, totalHT: a.ht, filleules: m.filleules || 0, filleulesAcheteuses: m.filleulesAcheteuses || 0,
        joursDepuisVisite: vue, moisAnciennete: m.joinedAt ? (maintenant - m.joinedAt.toMillis()) / (30 * jour) : 0,
      };
      const raisons = [
        a.n ? `${a.n} formation${a.n > 1 ? 's' : ''} suivie${a.n > 1 ? 's' : ''}` : '',
        fiche.filleules ? `${fiche.filleules} invitée${fiche.filleules > 1 ? 's' : ''} déjà` : '',
        fiche.filleulesAcheteuses ? `${fiche.filleulesAcheteuses} invitée${fiche.filleulesAcheteuses > 1 ? 's' : ''} en formation` : '',
        vue != null && vue <= 30 ? 'présente ce mois-ci' : '',
      ].filter(Boolean);
      return { uid, nom: m.displayName || m.email || uid, email: m.email || '', indice: indiceCandidate(fiche), raisons };
    })
    .filter(c => c.indice > 0 && c.email && !hors.has(c.uid) && !hors.has(c.email))
    .sort((x, y) => y.indice - x.indice)
    .slice(0, 15);
}
