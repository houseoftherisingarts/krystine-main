import app from '../firebase';
import {
  getFirestore, doc, getDoc, setDoc, serverTimestamp,
} from 'firebase/firestore';

// Le parrainage : chaque membre a un code unique; le lien d'invitation est
// /compte?parrain=CODE. Le code se retient en sessionStorage tant que la
// personne n'est pas connectée, puis se réclame une seule fois. Le compteur
// et les badges de paliers se posent côté serveur (functions/parrainage.ts).

const db = () => {
  if (!app) throw new Error('[Parrainage] Firebase not configured');
  return getFirestore(app);
};

const CLE_SESSION = 'krystine-code-parrain';

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
export async function reclamerCodeRetenu(uid: string): Promise<void> {
  let code: string | null = null;
  try { code = sessionStorage.getItem(CLE_SESSION); } catch { return; }
  if (!code) return;
  const codeSnap = await getDoc(doc(db(), 'codesParrain', code));
  const parrainUid = codeSnap.exists() ? (codeSnap.data() as { uid: string }).uid : null;
  try { sessionStorage.removeItem(CLE_SESSION); } catch { /* noop */ }
  if (!parrainUid || parrainUid === uid) return;
  const dejaSnap = await getDoc(doc(db(), 'parrainages', uid));
  if (dejaSnap.exists()) return;
  await setDoc(doc(db(), 'parrainages', uid), { parrainUid, code, creeLe: serverTimestamp() });
}
