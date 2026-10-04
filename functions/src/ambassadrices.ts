import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { PART_PREMIUM_DEFAUT, RABAIS_DEFAUT, partDe, rabaisDe, commissionDe, filiationRecevable, courrielNormalise, type Ambassadrice } from './ambassadricesRegles';
import { ADMIN_EMAILS } from './newsletter/send';

// Le programme des ambassadrices : une membre qui a un compte recommande
// Krystine avec son code de parrainage (le même que celui du parrainage,
// codesParrain/{CODE}). La personne qui crée son compte avec ce code obtient
// un rabais sur les formations, et l'ambassadrice touche une commission sur
// ce qui est réellement payé. Le partage rabais/commission se règle par
// l'ambassadrice elle-même; le rang premium et la part se règlent par
// l'admin seulement (firestore.rules : ambassadrices/{uid} en écriture admin).
//
//   ambassadrices/{uid}              { code, nom, email, premium, part?, rabaisClient, actif, creeLe }
//   commissionsAmbassadrices/{sessionId ou factureId}  posé par stripeWebhook
//       (paiements.ts), une ligne par paiement réellement reçu; statut
//       en-attente (garantie de 15 jours) -> due -> versee, ou annulee
//   settings/ambassadrices           { partPremium, cadenceJours? }
//   siteSettings/flags               { ambassadricesOuvert }
//
// La liste des admins est celle de l'infolettre (newsletter/send.ts), la même
// que firestore.rules isAdmin() : krystine@inspiratanature.com y est.

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

/** La filiation d'une filleule tient-elle ? Oui seulement si son compte
 *  avait au plus 48 h au rattachement, qu'aucune vraie vente Stripe ne l'a
 *  précédé, et que la marraine n'est pas elle-même (même compte ou même
 *  adresse). La date du rattachement est celle que Firestore a posée à la
 *  création du document, jamais une date écrite par le navigateur. Vérifié
 *  ici, que le module Parrainage soit ouvert ou non. Lance si l'âge du compte
 *  est illisible : à l'appelant de décider (refus pour un rabais). */
export async function filiationTient(filleulUid: string): Promise<{ parrainUid: string } | null> {
  const db = getFirestore();
  const snap = await db.doc(`parrainages/${filleulUid}`).get();
  const parrainUid = snap.data()?.parrainUid as string | undefined;
  if (!snap.exists || !snap.createTime || !parrainUid || parrainUid === filleulUid) return null;
  const filiationMs = snap.createTime.toMillis();
  const [filleule, marraine, achats] = await Promise.all([
    getAuth().getUser(filleulUid),
    getAuth().getUser(parrainUid).catch(() => null),
    db.collection(`achatsFormations/${filleulUid}/formations`).get(),
  ]);
  // Une vraie vente porte un sessionId (un cadeau ou un octroi manuel, non).
  const achatAvant = achats.docs.some(d => !!d.data().sessionId && d.createTime.toMillis() < filiationMs);
  if (!filiationRecevable(Date.parse(filleule.metadata.creationTime || ''), filiationMs, achatAvant)) return null;
  const a = courrielNormalise(filleule.email), b = courrielNormalise(marraine?.email);
  if (a && a === b) return null;
  return { parrainUid };
}

/** L'ambassadrice d'une acheteuse et les pourcentages qui s'appliquent à son
 *  achat, ou null. Le lien passe par le parrainage existant
 *  (parrainages/{acheteuse}.parrainUid), et seulement s'il tient. */
export async function ambassadriceDe(acheteuseUid: string): Promise<{ uid: string; nom: string; rabaisPct: number; commissionPct: number } | null> {
  const db = getFirestore();
  const filiation = await filiationTient(acheteuseUid);
  if (!filiation) return null;
  const parrainUid = filiation.parrainUid;
  const snap = await db.doc(`ambassadrices/${parrainUid}`).get();
  const a = snap.data() as (Ambassadrice & { nom?: string }) | undefined;
  if (!snap.exists || !a || a.actif === false) return null;
  const pp = await partPremium();
  return { uid: parrainUid, nom: a.nom || '', rabaisPct: rabaisDe(a, pp), commissionPct: commissionDe(a, pp) };
}

/** Le rabais qui attend la membre connectée, pour l'afficher sur la fiche d'un cours. */
export const monRabaisAmbassadrice = onCall({ region: 'us-central1' }, async (req) => {
  if (!req.auth) return { rabaisPct: 0, nom: '' };
  // Une vérification illisible n'affiche aucun rabais (le serveur ne l'accordera pas non plus).
  const a = await ambassadriceDe(req.auth.uid).catch(() => null);
  return { rabaisPct: a?.rabaisPct || 0, nom: a?.nom || '' };
});

/** Chaque matin, les commissions dont la garantie est passée deviennent dues.
 *  Rien n'est versé : l'admin verse, puis coche la ligne. Une ligne annulée
 *  entre-temps (remboursement) n'est jamais remise à « due ». */
export const commissionsEchues = onSchedule(
  { schedule: 'every day 06:00', timeZone: 'America/Toronto', region: 'us-central1' },
  async () => {
    const db = getFirestore();
    const snap = await db.collection('commissionsAmbassadrices').where('statut', '==', 'en-attente').get();
    const maintenant = Date.now();
    let n = 0;
    for (const d of snap.docs) {
      const echeance = (d.data().dueLe as FirebaseFirestore.Timestamp | undefined)?.toMillis();
      if (!echeance || echeance > maintenant) continue;
      const passee = await db.runTransaction(async (tx) => {
        const l = await tx.get(d.ref);
        if (l.data()?.statut !== 'en-attente') return false;
        tx.update(d.ref, { statut: 'due', devenueDueLe: FieldValue.serverTimestamp() });
        return true;
      });
      if (passee) n += 1;
    }
    if (n) console.log(`[ambassadrices] ${n} commission(s) devenue(s) due(s)`);
  },
);
