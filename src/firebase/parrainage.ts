import app from '../firebase';
import {
  getFirestore, doc, getDoc, setDoc, serverTimestamp,
  collection, query, where, getDocs, type Timestamp,
} from 'firebase/firestore';

// Le parrainage : chaque membre a un code unique; le lien d'invitation est
// /compte?parrain=CODE. Le code se retient en sessionStorage tant que la
// personne n'est pas connectée, puis se réclame une seule fois. Les
// compteurs, les badges et les cadeaux se posent côté serveur
// (functions/parrainage.ts). Deux échelles distinctes :
//  - les INVITATIONS donnent des badges honorifiques;
//  - les filleules qui ACHÈTENT une formation donnent des cadeaux réels.

const db = () => {
  if (!app) throw new Error('[Parrainage] Firebase not configured');
  return getFirestore(app);
};

const CLE_SESSION = 'krystine-code-parrain';

export const PALIERS_BADGES: Array<{ seuil: number; badgeId: string }> = [
  { seuil: 1, badgeId: 'ambassadrice' },
  { seuil: 5, badgeId: 'porteuse-flambeau' },
  { seuil: 10, badgeId: 'gardienne-cercle' },
  { seuil: 20, badgeId: 'fondatrice-feu' },
];

// Miroir de CADEAUX dans functions/src/parrainage.ts.
export const CADEAUX_PARRAINAGE: Array<{ seuil: number; fr: string; en: string; icone: string }> = [
  { seuil: 1,  fr: 'La musique de l\'Expérience Origine vous est offerte', en: 'The Origine Experience music, yours to keep', icone: 'fa-music' },
  { seuil: 3,  fr: 'Pitta, trois jours de découverte, offert',            en: 'Pitta, three days of discovery, on us',       icone: 'fa-sun' },
  { seuil: 5,  fr: 'La masterclass Santé Parfaite, offerte',              en: 'The Perfect Health masterclass, on us',      icone: 'fa-leaf' },
  { seuil: 10, fr: 'Vitalité et Clarté, trente jours, offert',            en: 'Vitality and Clarity, thirty days, on us',   icone: 'fa-spa' },
  { seuil: 20, fr: 'L\'accès à vie à toutes les formations',              en: 'Lifetime access to every course',            icone: 'fa-infinity' },
];

export interface Filleule { uid: string; nom: string; creeLe?: Timestamp; achatCompte?: boolean }

export function retenirCodeDepuisUrl(): void {
  try {
    const code = new URLSearchParams(window.location.search).get('parrain');
    if (code) sessionStorage.setItem(CLE_SESSION, code.toUpperCase());
  } catch { /* stockage bloqué */ }
}

function genererCode(uid: string): string {
  let h = 0;
  for (const c of uid) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h.toString(36).toUpperCase().slice(0, 6).padStart(6, 'K');
}

// Retourne le code du membre, en le créant au premier appel.
export async function monCodeParrain(uid: string): Promise<string> {
  const code = genererCode(uid);
  const ref = doc(db(), 'codesParrain', code);
  const snap = await getDoc(ref);
  if (!snap.exists()) await setDoc(ref, { uid, creeLe: serverTimestamp() });
  return code;
}

// Réclame le code retenu (une seule fois, jamais soi-même).
export async function reclamerCodeRetenu(uid: string, nom = ''): Promise<void> {
  let code: string | null = null;
  try { code = sessionStorage.getItem(CLE_SESSION); } catch { return; }
  if (!code) return;
  const codeSnap = await getDoc(doc(db(), 'codesParrain', code));
  const parrainUid = codeSnap.exists() ? (codeSnap.data() as { uid: string }).uid : null;
  try { sessionStorage.removeItem(CLE_SESSION); } catch { /* noop */ }
  if (!parrainUid || parrainUid === uid) return;
  const dejaSnap = await getDoc(doc(db(), 'parrainages', uid));
  if (dejaSnap.exists()) return;
  await setDoc(doc(db(), 'parrainages', uid), { parrainUid, code, filleulNom: nom, creeLe: serverTimestamp() });
}

// Les filleules d'une marraine (les règles n'ouvrent que les docs où
// parrainUid == moi, donc la requête doit filtrer là-dessus).
export async function listerMesFilleules(uid: string): Promise<Filleule[]> {
  const snap = await getDocs(query(collection(db(), 'parrainages'), where('parrainUid', '==', uid)));
  return snap.docs
    .map(d => {
      const x = d.data() as { filleulNom?: string; creeLe?: Timestamp; achatCompte?: boolean };
      return { uid: d.id, nom: x.filleulNom || '', creeLe: x.creeLe, achatCompte: !!x.achatCompte };
    })
    .sort((a, b) => (b.creeLe?.toMillis?.() || 0) - (a.creeLe?.toMillis?.() || 0));
}

// Qui m'a invitée (si je suis entrée par un lien).
export async function maMarraine(uid: string): Promise<string | null> {
  const snap = await getDoc(doc(db(), 'parrainages', uid));
  return snap.exists() ? ((snap.data() as { code?: string }).code || null) : null;
}
