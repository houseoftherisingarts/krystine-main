import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { PART_PREMIUM_DEFAUT, RABAIS_DEFAUT, partDe, rabaisDe, commissionDe, type Ambassadrice } from './ambassadricesRegles';

// Le programme des ambassadrices : une membre qui a un compte recommande
// Krystine avec son code de parrainage (le même que celui du parrainage,
// codesParrain/{CODE}). La personne qui crée son compte avec ce code obtient
// un rabais sur les formations, et l'ambassadrice touche une commission sur
// ce qui est réellement payé. Le partage rabais/commission se règle par
// l'ambassadrice elle-même; le rang premium et la part se règlent par
// l'admin seulement (firestore.rules : ambassadrices/{uid} en écriture admin).
//
//   ambassadrices/{uid}              { code, nom, email, premium, part?, rabaisClient, actif, creeLe }
//   commissionsAmbassadrices/{sessionId}  posé par stripeWebhook (paiements.ts)
//   settings/ambassadrices           { partPremium }
//   siteSettings/flags               { ambassadricesOuvert }

const ADMIN_EMAILS = [
  'houseoftherisingarts@gmail.com',
  'krystinestterredhysope@gmail.com',
];

// Miroir de genererCode dans src/firebase/parrainage.ts : le code d'une
// membre se déduit de son uid, le même des deux côtés.
function genererCode(uid: string): string {
  let h = 0;
  for (const c of uid) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h.toString(36).toUpperCase().slice(0, 6).padStart(6, 'K');
}

async function partPremium(): Promise<number> {
  const s = await getFirestore().doc('settings/ambassadrices').get();
  const n = Number(s.data()?.partPremium);
  return Number.isFinite(n) && n > 0 ? n : PART_PREMIUM_DEFAUT;
}

async function inscrire(uid: string, nom: string, email: string, premium: boolean): Promise<string> {
  const db = getFirestore();
  const code = genererCode(uid);
  const codeRef = db.doc(`codesParrain/${code}`);
  if (!(await codeRef.get()).exists) await codeRef.set({ uid, creeLe: FieldValue.serverTimestamp() });
  const ref = db.doc(`ambassadrices/${uid}`);
  const snap = await ref.get();
  if (snap.exists) {
    // Déjà inscrite : on ne touche ni à son réglage ni à sa date. L'admin qui
    // la nomme premium par courriel monte seulement son rang.
    await ref.set({ actif: true, ...(premium ? { premium: true } : {}) }, { merge: true });
  } else {
    await ref.set({ code, nom, email, premium, rabaisClient: RABAIS_DEFAUT, actif: true, creeLe: FieldValue.serverTimestamp() });
  }
  return code;
}

/** Une membre connectée devient ambassadrice (programme ouvert seulement). */
export const devenirAmbassadrice = onCall({ region: 'us-central1' }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Connectez-vous pour devenir ambassadrice.');
  const flags = await getFirestore().doc('siteSettings/flags').get();
  if (flags.data()?.ambassadricesOuvert !== true) throw new HttpsError('failed-precondition', 'Le programme des ambassadrices n\'est pas ouvert pour le moment.');
  const nom = String(req.auth.token.name || req.auth.token.email || 'Membre').slice(0, 80);
  const code = await inscrire(req.auth.uid, nom, String(req.auth.token.email || ''), false);
  return { code };
});

/** L'ambassadrice répartit sa part entre le rabais de sa cliente et sa commission. */
export const reglerAmbassadrice = onCall({ region: 'us-central1' }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Connectez-vous.');
  const ref = getFirestore().doc(`ambassadrices/${req.auth.uid}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Vous n\'êtes pas encore ambassadrice.');
  const pp = await partPremium();
  const a = { ...(snap.data() as Ambassadrice), rabaisClient: Number(req.data?.rabaisClient) };
  const rabaisClient = rabaisDe(a, pp);
  await ref.set({ rabaisClient }, { merge: true });
  return { rabaisClient, commission: commissionDe(a, pp), part: partDe(a, pp) };
});

/** L'admin nomme quelqu'un par son courriel (la personne doit avoir un compte). */
export const nommerAmbassadrice = onCall({ region: 'us-central1' }, async (req) => {
  if (!req.auth || !ADMIN_EMAILS.includes(String(req.auth.token.email || ''))) throw new HttpsError('permission-denied', 'Réservé à l\'admin.');
  const email = String(req.data?.email || '').trim().toLowerCase();
  if (!email) throw new HttpsError('invalid-argument', 'Courriel manquant.');
  let user;
  try { user = await getAuth().getUserByEmail(email); }
  catch { throw new HttpsError('not-found', 'Aucun compte ne porte ce courriel. La personne doit d\'abord créer son espace membre.'); }
  const code = await inscrire(user.uid, String(user.displayName || email).slice(0, 80), email, req.data?.premium === true);
  return { uid: user.uid, code };
});

/** L'ambassadrice d'une acheteuse et les pourcentages qui s'appliquent à son
 *  achat, ou null. Le lien passe par le parrainage existant
 *  (parrainages/{acheteuse}.parrainUid). */
export async function ambassadriceDe(acheteuseUid: string): Promise<{ uid: string; nom: string; rabaisPct: number; commissionPct: number } | null> {
  const db = getFirestore();
  const parrainUid = (await db.doc(`parrainages/${acheteuseUid}`).get()).data()?.parrainUid as string | undefined;
  if (!parrainUid || parrainUid === acheteuseUid) return null;
  const snap = await db.doc(`ambassadrices/${parrainUid}`).get();
  const a = snap.data() as (Ambassadrice & { nom?: string }) | undefined;
  if (!snap.exists || !a || a.actif === false) return null;
  const pp = await partPremium();
  return { uid: parrainUid, nom: a.nom || '', rabaisPct: rabaisDe(a, pp), commissionPct: commissionDe(a, pp) };
}

/** Le rabais qui attend la membre connectée, pour l'afficher sur la fiche d'un cours. */
export const monRabaisAmbassadrice = onCall({ region: 'us-central1' }, async (req) => {
  if (!req.auth) return { rabaisPct: 0, nom: '' };
  const a = await ambassadriceDe(req.auth.uid);
  return { rabaisPct: a?.rabaisPct || 0, nom: a?.nom || '' };
});
