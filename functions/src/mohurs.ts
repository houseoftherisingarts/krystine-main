import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, AggregateField } from 'firebase-admin/firestore';

// Les mohurs : la monnaie de l'espace client (le mohur, pièce d'or de l'Inde
// moghole puis britannique, n'a plus cours depuis 1918). Le solde vit dans
// `memberPoints/{uid}` avec le journal `pointsEvents/{cle}`, comme les points
// d'avant : seul le nom change. Ce module tient ce qui doit rester côté
// serveur : les achats de la petite boutique (jamais un débit depuis le
// navigateur) et les crédits que le navigateur ne doit pas pouvoir s'offrir.
//
// Catalogue jumeau : src/lib/pointsConfig.ts (BOUTIQUE, COUT_EPISODE).

export const SANTE_LA_VIE_ID = 'kajabi-2148754050';
export const MUSIQUE_ORIGINE_ID = 'kajabi-2149362766';

const COSMETIQUES: Record<string, { cout: number; nom: string }> = {
  'banniere-nature': { cout: 5, nom: 'Bannière Nature & Ayurveda' },
  'musique-origine': { cout: 5, nom: "La musique d'Origine" },
  'skin-medzo': { cout: 5, nom: 'Skin Medzo Café' },
};
const COUT_EPISODE = 100;

/** Crédite des mohurs une seule fois par clé (journal + solde), avec l'Admin SDK. */
export async function crediterMohurs(
  uid: string,
  kind: string,
  amount: number,
  cle: string,
  meta: Record<string, unknown> = {},
): Promise<boolean> {
  const db = getFirestore();
  const evt = db.doc(`pointsEvents/${cle}`);
  return db.runTransaction(async (tx) => {
    if ((await tx.get(evt)).exists) return false;
    tx.set(evt, { uid, kind, amount, dedupKey: cle, meta, at: FieldValue.serverTimestamp() });
    tx.set(db.doc(`memberPoints/${uid}`), {
      balance: FieldValue.increment(amount),
      lifetime: FieldValue.increment(Math.max(0, amount)),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return true;
  });
}

/** Le solde qu'on croit : le document, plafonné par la somme du journal
 *  (le journal ne se réécrit jamais, le document se corrige au besoin). */
async function soldeVerifie(uid: string, balanceDoc: number): Promise<number> {
  try {
    const agg = await getFirestore().collection('pointsEvents').where('uid', '==', uid)
      .aggregate({ total: AggregateField.sum('amount') }).get();
    const total = Number(agg.data().total || 0);
    return Math.min(balanceDoc, total);
  } catch (e) {
    console.warn('[mohurs] somme du journal indisponible', e);
    return balanceDoc;
  }
}

export const acheterAvecMohurs = onCall(
  { region: 'us-central1' },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Connectez-vous pour acheter.');
    const uid = req.auth.uid;
    const article = String(req.data?.article || '').slice(0, 60);
    const db = getFirestore();

    let cout: number;
    let nom: string;
    let leconId = '';
    if (COSMETIQUES[article]) {
      ({ cout, nom } = COSMETIQUES[article]);
    } else if (article.startsWith('episode:')) {
      leconId = article.slice('episode:'.length);
      const lecon = await db.doc(`formations/${SANTE_LA_VIE_ID}/lecons/${leconId}`).get();
      if (!lecon.exists) throw new HttpsError('not-found', 'Cet épisode est introuvable.');
      cout = COUT_EPISODE;
      nom = String((lecon.data() as { titre?: string }).titre || `Épisode ${leconId}`);
    } else {
      throw new HttpsError('invalid-argument', 'Cet article n\'existe pas.');
    }

    const cle = `boutique:${article}:${uid}`;
    const evt = db.doc(`pointsEvents/${cle}`);
    const balRef = db.doc(`memberPoints/${uid}`);
    const balDoc = Number(((await balRef.get()).data() as { balance?: number } | undefined)?.balance || 0);
    const solde = await soldeVerifie(uid, balDoc);
    if (solde < cout) {
      throw new HttpsError('failed-precondition', `Il vous manque ${cout - solde} mohur${cout - solde > 1 ? 's' : ''}.`);
    }

    const [emission, formation] = leconId
      ? await Promise.all([
          db.doc(`formations/${SANTE_LA_VIE_ID}`).get(),
          Promise.resolve(null),
        ])
      : [null, article === 'musique-origine' ? await db.doc(`formations/${MUSIQUE_ORIGINE_ID}`).get() : null];

    await db.runTransaction(async (tx) => {
      if ((await tx.get(evt)).exists) throw new HttpsError('already-exists', 'Cet article est déjà à vous.');
      tx.set(evt, { uid, kind: 'boutique', amount: -cout, dedupKey: cle, meta: { article, nom }, at: FieldValue.serverTimestamp() });
      tx.set(balRef, { balance: FieldValue.increment(-cout), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      tx.set(db.doc(`boutique/${uid}`), { possede: { [article]: FieldValue.serverTimestamp() } }, { merge: true });

      if (leconId && emission) {
        const f = (emission.data() || {}) as { titre?: string; imageUrl?: string };
        tx.set(db.doc(`achatsFormations/${uid}/formations/${SANTE_LA_VIE_ID}`), {
          titre: f.titre || 'Émission Santé! La Vie!',
          imageUrl: f.imageUrl || '',
          categorie: 'video',
          source: 'mohurs',
          episodes: { [leconId]: FieldValue.serverTimestamp() },
          accordeLe: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
      if (article === 'musique-origine' && formation) {
        const f = (formation.data() || {}) as { titre?: string; imageUrl?: string };
        tx.set(db.doc(`achatsFormations/${uid}/formations/${MUSIQUE_ORIGINE_ID}`), {
          titre: f.titre || 'Expérience Origine · La musique',
          imageUrl: f.imageUrl || '',
          categorie: 'musique',
          source: 'mohurs',
          accordeLe: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    });

    console.log(`[mohurs] ${uid} achète ${article} pour ${cout}`);
    return { solde: solde - cout, article, nom };
  },
);
