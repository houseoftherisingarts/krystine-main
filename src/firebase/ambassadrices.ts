import app, { db } from '../firebase';
import {
  doc, getDoc, setDoc, getDocs, collection, query, where, serverTimestamp, type Timestamp,
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
