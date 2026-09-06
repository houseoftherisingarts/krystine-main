import * as crypto from 'crypto';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { crediterNiskas } from './niskas';

// Le paywall des formations natives (migration Kajabi, 2026-08-28).
// Trois portes : créer la session Stripe Checkout, encaisser le webhook qui
// écrit la preuve d'achat, et servir les fichiers de leçon aux acheteuses.
// Tout passe par l'API REST de Stripe : aucune dépendance npm.

const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');

const SITE = 'https://www.krystinestlaurent.ca';

const ADMIN_EMAILS = [
  'admin@krystinestlaurent.ca',
  'krystine@inspiratanature.com',
  'alex@lesalondesinconnus.com',
  'krystinestlaurent@gmail.com',
  'houseoftherisingarts@gmail.com',
  'krystinestterredhysope@gmail.com',
];

export const creerSessionPaiement = onCall(
  { region: 'us-central1', secrets: [STRIPE_SECRET_KEY] },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Connectez-vous pour acheter une formation.');
    const formationId = String(req.data?.formationId || '');
    if (!formationId) throw new HttpsError('invalid-argument', 'Formation manquante.');

    const snap = await getFirestore().doc(`formations/${formationId}`).get();
    if (!snap.exists) throw new HttpsError('not-found', 'Formation introuvable.');
    const f = snap.data() as { titre: string; statut: string; paywall?: boolean; prix?: number | null; imageUrl?: string };
    if (f.statut !== 'publie') throw new HttpsError('failed-precondition', 'Cette formation n\'est pas en vente.');
    if (!f.paywall || !f.prix || f.prix <= 0) throw new HttpsError('failed-precondition', 'Cette formation n\'a pas de prix.');

    const body = new URLSearchParams({
      mode: 'payment',
      'line_items[0][price_data][currency]': 'cad',
      'line_items[0][price_data][product_data][name]': f.titre,
      'line_items[0][price_data][unit_amount]': String(Math.round(f.prix * 100)),
      'line_items[0][quantity]': '1',
      success_url: `${SITE}/compte?achat=ok`,
      cancel_url: `${SITE}/cours/${formationId}`,
      'metadata[uid]': req.auth.uid,
      'metadata[formationId]': formationId,
    });
    const email = req.auth.token.email;
    if (email) body.set('customer_email', String(email));

    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY.value()}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    const session = (await r.json()) as { url?: string; error?: { message?: string } };
    if (!r.ok || !session.url) {
      console.error('[paiements] checkout session refusée', session.error?.message);
      throw new HttpsError('internal', 'Le paiement n\'a pas pu démarrer. Réessayez.');
    }
    return { url: session.url };
  },
);

// ─── Pourboire pendant le direct ─────────────────────────────────────────────
// Montants fixes, jamais un montant libre venu du navigateur. Les points se
// créditent au retour du webhook, une fois le paiement confirmé.
const MONTANTS_POURBOIRE = [5, 10, 25, 50];

export const creerPourboire = onCall(
  { region: 'us-central1', secrets: [STRIPE_SECRET_KEY] },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Connectez-vous pour envoyer un pourboire.');
    const montant = Number(req.data?.montant || 0);
    if (!MONTANTS_POURBOIRE.includes(montant)) throw new HttpsError('invalid-argument', 'Montant non permis.');
    const directId = String(req.data?.directId || 'direct');
    const titre = String(req.data?.titre || 'Le direct de Krystine').slice(0, 120);

    const body = new URLSearchParams({
      mode: 'payment',
      'line_items[0][price_data][currency]': 'cad',
      'line_items[0][price_data][product_data][name]': `Pourboire · ${titre}`,
      'line_items[0][price_data][unit_amount]': String(Math.round(montant * 100)),
      'line_items[0][quantity]': '1',
      success_url: `${SITE}/direct?merci=1`,
      cancel_url: `${SITE}/direct`,
      'metadata[uid]': req.auth.uid,
      'metadata[type]': 'pourboire',
      'metadata[directId]': directId,
    });
    const email = req.auth.token.email;
    if (email) body.set('customer_email', String(email));

    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY.value()}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    const session = (await r.json()) as { url?: string; error?: { message?: string } };
    if (!r.ok || !session.url) {
      console.error('[paiements] pourboire refusé', session.error?.message);
      throw new HttpsError('internal', 'Le paiement n\'a pas pu démarrer. Réessayez.');
    }
    return { url: session.url };
  },
);

// ─── Les niskas : 100 pour 10 $ ──────────────────────────────────────────────
// Un seul paquet, jamais un montant libre venu du navigateur. Le crédit se
// fait au retour du webhook, une seule fois par paiement.
const NISKAS_PAR_PAQUET = 100;
const PRIX_PAQUET_CENTS = 1000;

export const creerSessionNiskas = onCall(
  { region: 'us-central1', secrets: [STRIPE_SECRET_KEY] },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Connectez-vous pour acheter des niskas.');
    const body = new URLSearchParams({
      mode: 'payment',
      'line_items[0][price_data][currency]': 'cad',
      'line_items[0][price_data][product_data][name]': `${NISKAS_PAR_PAQUET} niskas · votre espace chez Krystine`,
      'line_items[0][price_data][unit_amount]': String(PRIX_PAQUET_CENTS),
      'line_items[0][quantity]': '1',
      success_url: `${SITE}/compte?niskas=ok`,
      cancel_url: `${SITE}/compte`,
      'metadata[uid]': req.auth.uid,
      'metadata[type]': 'niskas',
      'metadata[niskas]': String(NISKAS_PAR_PAQUET),
    });
    const email = req.auth.token.email;
    if (email) body.set('customer_email', String(email));

    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY.value()}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    const session = (await r.json()) as { url?: string; error?: { message?: string } };
    if (!r.ok || !session.url) {
      console.error('[paiements] session niskas refusée', session.error?.message);
      throw new HttpsError('internal', 'Le paiement n\'a pas pu démarrer. Réessayez.');
    }
    return { url: session.url };
  },
);

// Vérification de signature Stripe (schéma t=...,v1=... ; HMAC-SHA256 de "t.corps").
function verifierSignatureStripe(rawBody: Buffer, header: string | undefined, secret: string): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(',').map(p => p.split('=') as [string, string]));
  const t = parts['t']; const v1 = parts['v1'];
  if (!t || !v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 600) return false; // rejoue trop vieux
  const attendu = crypto.createHmac('sha256', secret).update(`${t}.${rawBody.toString('utf8')}`).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(attendu), Buffer.from(v1));
  } catch { return false; }
}

export const stripeWebhook = onRequest(
  { region: 'us-central1', secrets: [STRIPE_WEBHOOK_SECRET], cors: false, maxInstances: 5 },
  async (req, res) => {
    if (req.method !== 'POST') { res.status(405).send('Method not allowed'); return; }
    const rawBody: Buffer = (req as any).rawBody as Buffer;
    if (!rawBody) { res.status(400).send('Missing body'); return; }
    if (!verifierSignatureStripe(rawBody, req.header('Stripe-Signature'), STRIPE_WEBHOOK_SECRET.value())) {
      res.status(401).send('Invalid signature'); return;
    }

    const event = JSON.parse(rawBody.toString('utf8'));
    if (event.type !== 'checkout.session.completed') { res.status(200).send('ignored'); return; }
    const session = event.data?.object || {};
    const uid = session.metadata?.uid;
    const formationId = session.metadata?.formationId;

    // Un paquet de niskas : cent pièces, une seule fois par paiement.
    if (uid && session.metadata?.type === 'niskas' && session.payment_status === 'paid') {
      const n = Number(session.metadata?.niskas || NISKAS_PAR_PAQUET);
      const montant = (session.amount_total || 0) / 100;
      const credite = await crediterNiskas(uid, 'achat-niskas', n, `stripe:${session.id}`, { montant });
      console.log(`[paiements] ${n} niskas pour ${uid} (${montant} $) ${credite ? 'crédités' : 'déjà crédités'}`);
      res.status(200).send('ok'); return;
    }

    // Un pourboire du direct : on garde la trace et on crédite les points.
    if (uid && session.metadata?.type === 'pourboire' && session.payment_status === 'paid') {
      const db = getFirestore();
      const montant = (session.amount_total || 0) / 100;
      const directId = String(session.metadata?.directId || 'direct');
      const membre = await db.doc(`members/${uid}`).get();
      const nom = (membre.data() as { displayName?: string } | undefined)?.displayName || 'Une auditrice';
      await db.doc(`pourboires/${session.id}`).set({
        uid, nom, montant, directId, at: FieldValue.serverTimestamp(),
      }, { merge: true });
      // Dix points par dollar, une seule fois par paiement.
      const points = Math.round(montant * 10);
      const cle = `pourboire:${session.id}`;
      const evt = db.doc(`pointsEvents/${cle}`);
      if (!(await evt.get()).exists) {
        await evt.set({ uid, kind: 'direct', amount: points, dedupKey: cle, meta: { montant, directId }, at: FieldValue.serverTimestamp() });
        await db.doc(`memberPoints/${uid}`).set({
          balance: FieldValue.increment(points),
          lifetime: FieldValue.increment(points),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
      console.log(`[paiements] pourboire ${montant} $ de ${uid}, ${points} points`);
      res.status(200).send('ok'); return;
    }

    if (!uid || !formationId || session.payment_status !== 'paid') { res.status(200).send('incomplete'); return; }

    const db = getFirestore();
    const fSnap = await db.doc(`formations/${formationId}`).get();
    const f = fSnap.exists ? (fSnap.data() as { titre?: string; imageUrl?: string }) : {};
    await db.doc(`achatsFormations/${uid}/formations/${formationId}`).set({
      titre: f.titre || formationId,
      imageUrl: f.imageUrl || '',
      montant: (session.amount_total || 0) / 100,
      sessionId: session.id || '',
      acheteLe: FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log(`[paiements] achat enregistré: ${uid} -> ${formationId}`);
    res.status(200).send('ok');
  },
);

// Sert un fichier de leçon à une acheteuse (URL signée 2 h). Les fichiers de
// contenu vivent sous formations-contenu/ dans Storage, illisibles au public.
export const obtenirLecon = onCall(
  { region: 'us-central1' },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Connectez-vous.');
    const formationId = String(req.data?.formationId || '');
    const leconId = String(req.data?.leconId || '');
    if (!formationId || !leconId) throw new HttpsError('invalid-argument', 'Leçon manquante.');

    const db = getFirestore();
    const estAdmin = ADMIN_EMAILS.includes(String(req.auth.token.email || ''));
    if (!estAdmin) {
      const fSnap = await db.doc(`formations/${formationId}`).get();
      const fiche = fSnap.data() as { paywall?: boolean; statut?: string } | undefined;
      // Une formation payante, ou une formation qui n'est pas publiée (Santé
      // la vie, vendue à l'épisode en niskas), ne se sert qu'à qui la possède.
      const paywall = !!fiche?.paywall || fiche?.statut !== 'publie';
      if (paywall) {
        const achat = await db.doc(`achatsFormations/${req.auth.uid}/formations/${formationId}`).get();
        // Un achat à l'épisode (Santé la vie, en niskas) n'ouvre que ses épisodes.
        const episodes = (achat.data() as { episodes?: Record<string, unknown> } | undefined)?.episodes;
        if (achat.exists && episodes && !episodes[leconId]) {
          throw new HttpsError('permission-denied', 'Cet épisode ne vous appartient pas encore.');
        }
        if (!achat.exists) {
          // Accès à vie : le vingtième palier du parrainage.
          const m = await db.doc(`members/${req.auth.uid}`).get();
          if (!(m.data() as { accesVie?: boolean } | undefined)?.accesVie) {
            throw new HttpsError('permission-denied', 'Cette formation ne vous appartient pas encore.');
          }
        }
      }
    }

    const lSnap = await db.doc(`formations/${formationId}/lecons/${leconId}`).get();
    if (!lSnap.exists) throw new HttpsError('not-found', 'Leçon introuvable.');
    // Un document déposé sous la leçon : même barrière, autre chemin.
    const docIndex = req.data?.docIndex;
    if (typeof docIndex === 'number') {
      const docs = (lSnap.data() as { docs?: Array<{ chemin?: string }> }).docs || [];
      const d = docs[docIndex];
      if (!d?.chemin) throw new HttpsError('not-found', 'Document introuvable.');
      const [urlDoc] = await getStorage().bucket().file(d.chemin).getSignedUrl({
        action: 'read', expires: Date.now() + 60 * 60 * 1000,
      });
      return { url: urlDoc };
    }
    const chemin = (lSnap.data() as { chemin?: string }).chemin;
    if (!chemin) throw new HttpsError('not-found', 'Fichier absent.');

    const [url] = await getStorage().bucket().file(chemin).getSignedUrl({
      action: 'read',
      expires: Date.now() + 2 * 60 * 60 * 1000,
    });
    return { url };
  },
);
