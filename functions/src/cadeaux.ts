import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Les cadeaux et rabais que Krystine offre à une cliente précise depuis son
// admin. Le cadeau vit dans `cadeaux/{id}` (uid, formation, pourcentage,
// message) et un message part dans la messagerie de la cliente. Elle
// l'utilise depuis son espace : à 100 %, la formation lui est accordée sur
// le champ; sinon, Stripe s'ouvre au prix réduit et le webhook marque le
// cadeau utilisé au paiement.

const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
const SITE = 'https://www.krystinestlaurent.ca';
const ADMIN_EMAILS = [
  'admin@krystinestlaurent.ca',
  'krystine@inspiratanature.com',
  'alex@lesalondesinconnus.com',
  'krystinestlaurent@gmail.com',
  'houseoftherisingarts@gmail.com',
  'krystinestterredhysope@gmail.com',
];

const threadId = (a: string, b: string) => [a, b].sort().join('__');

export interface Cadeau {
  uid: string;
  formationId: string;
  formationTitre: string;
  formationImage: string;
  prix: number;
  pourcent: number;
  message: string;
  deUid: string;
  deNom: string;
  statut: 'offert' | 'utilise';
}

export const offrirCadeau = onCall(
  { region: 'us-central1' },
  async (req) => {
    const email = String(req.auth?.token?.email || '').toLowerCase();
    if (!req.auth || !ADMIN_EMAILS.includes(email)) throw new HttpsError('permission-denied', 'Réservé à l\'admin.');
    const uid = String(req.data?.uid || '');
    const formationId = String(req.data?.formationId || '');
    const pourcent = Math.max(1, Math.min(100, Math.round(Number(req.data?.pourcent || 0))));
    const message = String(req.data?.message || '').slice(0, 1200).trim();
    if (!uid || !formationId || !pourcent) throw new HttpsError('invalid-argument', 'Cliente, formation et pourcentage sont requis.');

    const db = getFirestore();
    const [membre, formation, admin] = await Promise.all([
      db.doc(`members/${uid}`).get(),
      db.doc(`formations/${formationId}`).get(),
      db.doc(`members/${req.auth.uid}`).get(),
    ]);
    if (!membre.exists) throw new HttpsError('not-found', 'Cette cliente n\'existe pas.');
    if (!formation.exists) throw new HttpsError('not-found', 'Cette formation n\'existe pas.');
    const f = formation.data() as { titre?: string; imageUrl?: string; prix?: number | null };
    const m = membre.data() as { displayName?: string; photoURL?: string };
    const a = admin.data() as { displayName?: string; photoURL?: string } | undefined;
    const deNom = (a?.displayName || 'Krystine').trim();

    const cadeau: Cadeau = {
      uid, formationId,
      formationTitre: f.titre || formationId,
      formationImage: f.imageUrl || '',
      prix: Number(f.prix || 0),
      pourcent,
      message,
      deUid: req.auth.uid,
      deNom,
      statut: 'offert',
    };
    const ref = await db.collection('cadeaux').add({ ...cadeau, creeLe: FieldValue.serverTimestamp() });

    // Le mot dans la messagerie : le fil entre l'admin et la cliente.
    const id = threadId(req.auth.uid, uid);
    const corps = `${message ? message + '\n\n' : ''}🎁 ${pourcent >= 100 ? 'Je vous offre' : `Je vous offre ${pourcent} % de rabais sur`} « ${cadeau.formationTitre} ». Le cadeau vous attend dans votre espace, sous « Messagerie » : un clic et il est à vous.`;
    const photos: Record<string, string> = {};
    if (a?.photoURL) photos[req.auth.uid] = a.photoURL;
    if (m.photoURL) photos[uid] = m.photoURL;
    await db.doc(`dms/${id}`).set({
      participantUids: [req.auth.uid, uid].sort(),
      participantNames: { [req.auth.uid]: deNom, [uid]: m.displayName || 'Membre' },
      ...(Object.keys(photos).length ? { participantPhotos: photos } : {}),
      lastMessage: corps.slice(0, 140),
      lastMessageAt: FieldValue.serverTimestamp(),
      lastSenderUid: req.auth.uid,
      unread: { [uid]: FieldValue.increment(1) },
    }, { merge: true });
    await db.collection(`dms/${id}/messages`).add({ senderUid: req.auth.uid, senderName: deNom, body: corps, cadeauId: ref.id, createdAt: FieldValue.serverTimestamp() });
    return { id: ref.id };
  },
);

export const utiliserCadeau = onCall(
  { region: 'us-central1', secrets: [STRIPE_SECRET_KEY] },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Connectez-vous pour utiliser votre cadeau.');
    const cadeauId = String(req.data?.cadeauId || '');
    const db = getFirestore();
    const ref = db.doc(`cadeaux/${cadeauId}`);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError('not-found', 'Ce cadeau n\'existe pas.');
    const c = snap.data() as Cadeau;
    if (c.uid !== req.auth.uid) throw new HttpsError('permission-denied', 'Ce cadeau n\'est pas le vôtre.');
    if (c.statut === 'utilise') throw new HttpsError('failed-precondition', 'Ce cadeau a déjà été utilisé.');

    if (c.pourcent >= 100) {
      await db.doc(`achatsFormations/${c.uid}/formations/${c.formationId}`).set({
        titre: c.formationTitre,
        imageUrl: c.formationImage,
        montant: 0,
        source: 'cadeau',
        cadeauId,
        accordeLe: FieldValue.serverTimestamp(),
      }, { merge: true });
      await ref.set({ statut: 'utilise', utiliseLe: FieldValue.serverTimestamp() }, { merge: true });
      return { accorde: true };
    }

    const cents = Math.max(50, Math.round(c.prix * 100 * (100 - c.pourcent) / 100));
    const body = new URLSearchParams({
      mode: 'payment',
      'line_items[0][price_data][currency]': 'cad',
      'line_items[0][price_data][product_data][name]': `${c.formationTitre} · cadeau de ${c.pourcent} %`,
      'line_items[0][price_data][unit_amount]': String(cents),
      'line_items[0][quantity]': '1',
      success_url: `${SITE}/compte?achat=ok`,
      cancel_url: `${SITE}/cours/${c.formationId}`,
      'metadata[uid]': c.uid,
      'metadata[formationId]': c.formationId,
      'metadata[cadeauId]': cadeauId,
    });
    const email = req.auth.token.email;
    if (email) body.set('customer_email', String(email));
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY.value()}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const session = (await r.json()) as { url?: string; error?: { message?: string } };
    if (!r.ok || !session.url) {
      console.error('[cadeaux] session refusée', session.error?.message);
      throw new HttpsError('internal', 'Le paiement n\'a pas pu démarrer. Réessayez.');
    }
    return { accorde: false, url: session.url, montant: cents / 100 };
  },
);
