import * as crypto from 'crypto';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { crediterNiskas, SANTE_LA_VIE_ID, SAISONS, PRIX_SAISON_CAD } from './niskas';
import { exigerModule } from './gamification';
import { inscrireSequencesAchat } from './newsletter/sequences';
import { traiterPaiementBillets } from './billetterie';
import { MAIL_SECRETS } from './newsletter/mail';
import { prixEnVigueur, versementsPermis, montantVersement, FORMATION_VATA_ID } from './versements';

// Le paywall des formations natives (migration Kajabi, 2026-08-28).
// Trois portes : créer la session Stripe Checkout, encaisser le webhook qui
// écrit la preuve d'achat, et servir les fichiers de leçon aux acheteuses.
// Tout passe par l'API REST de Stripe : aucune dépendance npm.

const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');

const SITE = 'https://www.krystinestlaurent.ca';
// Le retour de Stripe se fait sur l'adresse d'où l'achat est parti (avec ou
// sans « www ») : sinon la connexion ne suit pas et la cliente arrive
// déconnectée après avoir payé (achat test de Vata, 30 sept. 2026).
const siteDe = (req: { rawRequest?: { headers?: Record<string, unknown> } }): string => {
  const o = String(req.rawRequest?.headers?.origin || '');
  return o === 'https://krystinestlaurent.ca' || o === 'https://www.krystinestlaurent.ca' ? o : SITE;
};

// TPS + TVQ du Québec, via Stripe Tax (calcul automatique selon l'adresse de
// facturation). Tant que l'enregistrement fiscal Québec n'est pas activé dans
// le tableau de bord Stripe (Paramètres > Fiscalité), Stripe ne facture 0 $
// de taxe : jamais de taxe inventée côté code. Voir stripeWebhook plus bas
// pour la répartition TPS/TVQ enregistrée dans la commande.
const TAXES_QC = {
  'automatic_tax[enabled]': 'true',
  billing_address_collection: 'required',
} as const;

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
    // Vata : le tarif de lancement (prix de la fiche) tient jusqu'au 1er novembre
    // 2026 inclus, puis le prix régulier s'applique tout seul (Krystine, 30 sept. 2026).
    // La bascule vit dans versements.ts, partagée avec la page de choix.
    const prix = prixEnVigueur(formationId, f.prix);

    // Le paiement en versements (Krystine, 30 sept. 2026) : la règle de
    // versements.ts décide ce qui est permis pour ce prix, jamais le navigateur.
    const versements = req.data?.versements === undefined ? 1 : Number(req.data.versements);
    if (!Number.isInteger(versements) || !versementsPermis(prix).includes(versements)) {
      throw new HttpsError('invalid-argument', 'Ce nombre de versements n\'est pas offert pour cette formation.');
    }

    const body = new URLSearchParams({
      'line_items[0][price_data][currency]': 'cad',
      'line_items[0][price_data][product_data][name]': f.titre,
      'line_items[0][price_data][tax_behavior]': 'exclusive',
      'line_items[0][quantity]': '1',
      ...TAXES_QC,
      locale: 'fr', // la caisse Stripe en français (Krystine, 2 oct. 2026)
      'metadata[uid]': req.auth.uid,
      'metadata[formationId]': formationId,
      'metadata[versements]': String(versements),
    });
    if (versements === 1) {
      body.set('mode', 'payment');
      body.set('line_items[0][price_data][unit_amount]', String(Math.round(prix * 100)));
      // Le code de la récompense « 50 $ sur une formation » se tape ici
      // (echangerRecompense, functions/src/recompenses.ts) : il porte déjà
      // sa propre restriction de 50 $ minimum côté Stripe.
      body.set('allow_promotion_codes', 'true');
    } else {
      // Un abonnement mensuel que le webhook annule au dernier versement. Les
      // métadonnées suivent l'abonnement pour que chaque facture retrouve l'achat.
      body.set('mode', 'subscription');
      body.set('line_items[0][price_data][unit_amount]', String(montantVersement(prix, versements) * 100));
      body.set('line_items[0][price_data][recurring][interval]', 'month');
      body.set('subscription_data[metadata][uid]', req.auth.uid);
      body.set('subscription_data[metadata][formationId]', formationId);
      body.set('subscription_data[metadata][versements]', String(versements));
    }
    const email = req.auth.token.email;
    if (email) body.set('customer_email', String(email));

    // Le paiement intégré dans la page du site (Krystine, 2 oct. 2026) : la
    // même session, affichée dans /paiement/<formation> au lieu de la page
    // Stripe. Sans `integre`, l'ancienne redirection reste le repli.
    const integre = req.data?.integre === true;
    const retour = `${siteDe(req)}/compte?achat=ok&formation=${encodeURIComponent(formationId)}`;
    if (integre) {
      body.set('return_url', `${retour}&session_id={CHECKOUT_SESSION_ID}`);
    } else {
      body.set('success_url', retour);
      // Un paiement abandonné ramène à la page de vente : /vata pour VATA Essentiel.
      body.set('cancel_url', formationId === FORMATION_VATA_ID ? `${siteDe(req)}/vata` : `${siteDe(req)}/cours/${formationId}`);
    }

    const creer = async () => {
      const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY.value()}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });
      return { ok: r.ok, session: (await r.json()) as { url?: string; client_secret?: string; error?: { message?: string; param?: string } } };
    };
    // Stripe a renommé « embedded » en « embedded_page » (version 2026-03-25) :
    // la version du compte décide lequel est accepté, on essaie l'un puis l'autre.
    if (integre) body.set('ui_mode', 'embedded_page');
    let { ok, session } = await creer();
    if (integre && !ok && session.error?.param === 'ui_mode') {
      body.set('ui_mode', 'embedded');
      ({ ok, session } = await creer());
    }
    if (!ok || !(integre ? session.client_secret : session.url)) {
      console.error('[paiements] checkout session refusée', session.error?.message);
      throw new HttpsError('internal', 'Le paiement n\'a pas pu démarrer. Réessayez.');
    }
    return integre ? { clientSecret: session.client_secret } : { url: session.url };
  },
);

// ─── Pourboire pendant le direct ─────────────────────────────────────────────
// Pas de taxe ici : un pourboire volontaire n'est pas la contrepartie d'un
// bien ou d'un service, donc pas une fourniture taxable au sens TPS/TVQ.
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
      locale: 'fr', // la caisse Stripe en français (Krystine, 2 oct. 2026)
      success_url: `${siteDe(req)}/direct?merci=1`,
      cancel_url: `${siteDe(req)}/direct`,
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
// Sept paquets fixes, de 100 pour 10 $ à 10 000 pour 500 $ (plus le paquet est
// gros, plus le niska est doux). Le navigateur nomme le paquet, le serveur
// connaît le prix. Miroir client : PAQUETS_NISKAS dans src/lib/pointsConfig.ts.
const PAQUETS: Record<string, { niskas: number; cents: number }> = {
  p100: { niskas: 100, cents: 1000 },
  p180: { niskas: 180, cents: 1500 },
  p400: { niskas: 400, cents: 3000 },
  p750: { niskas: 750, cents: 5000 },
  p1600: { niskas: 1600, cents: 10000 },
  p2800: { niskas: 2800, cents: 16000 },
  p4500: { niskas: 4500, cents: 25000 },
  p10000: { niskas: 10000, cents: 50000 },
};
const NISKAS_PAR_PAQUET = PAQUETS.p100.niskas;

export const creerSessionNiskas = onCall(
  { region: 'us-central1', secrets: [STRIPE_SECRET_KEY] },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Connectez-vous pour acheter des niskas.');
    await exigerModule('acheterNiskas');
    const paquet = PAQUETS[String(req.data?.paquet || 'p100')];
    if (!paquet) throw new HttpsError('invalid-argument', 'Ce paquet n\'existe pas.');
    const body = new URLSearchParams({
      mode: 'payment',
      'line_items[0][price_data][currency]': 'cad',
      'line_items[0][price_data][product_data][name]': `${paquet.niskas} niskas · votre espace chez Krystine`,
      'line_items[0][price_data][unit_amount]': String(paquet.cents),
      'line_items[0][price_data][tax_behavior]': 'exclusive',
      'line_items[0][quantity]': '1',
      ...TAXES_QC,
      locale: 'fr', // la caisse Stripe en français (Krystine, 2 oct. 2026)
      success_url: `${siteDe(req)}/compte?niskas=ok`,
      cancel_url: `${siteDe(req)}/compte`,
      'metadata[uid]': req.auth.uid,
      'metadata[type]': 'niskas',
      'metadata[niskas]': String(paquet.niskas),
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

// ─── Une saison de Santé la vie, payée en argent ─────────────────────────────
// Jumeau Stripe d'acheterAvecNiskas('saison:N') : même prix par saison affiché
// partout (175 niskas), même octroi à l'arrivée (le webhook plus bas écrit
// exactement les mêmes episodes que le chemin niskas), pour que obtenirLecon
// n'ait jamais à savoir comment la saison a été payée.
export const creerSessionSaison = onCall(
  { region: 'us-central1', secrets: [STRIPE_SECRET_KEY] },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Connectez-vous pour acheter.');
    const saison = String(req.data?.saison || '');
    if (!SAISONS[saison]) throw new HttpsError('invalid-argument', 'Cette saison est introuvable.');

    const body = new URLSearchParams({
      mode: 'payment',
      'line_items[0][price_data][currency]': 'cad',
      'line_items[0][price_data][product_data][name]': `Santé la vie · saison ${saison} complète`,
      'line_items[0][price_data][unit_amount]': String(PRIX_SAISON_CAD * 100),
      'line_items[0][price_data][tax_behavior]': 'exclusive',
      'line_items[0][quantity]': '1',
      ...TAXES_QC,
      locale: 'fr', // la caisse Stripe en français (Krystine, 2 oct. 2026)
      success_url: `${siteDe(req)}/compte?onglet=telechargements&saison=ok`,
      cancel_url: `${siteDe(req)}/compte?onglet=telechargements`,
      'metadata[uid]': req.auth.uid,
      'metadata[type]': 'saison',
      'metadata[saison]': saison,
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
      console.error('[paiements] session saison refusée', session.error?.message);
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

// Répartit ce que Stripe a réellement facturé entre TPS (5 %) et TVQ
// (9,975 %). Stripe ne détaille pas les deux composantes dans
// total_details.amount_tax sans un appel API additionnel; les taux du Québec
// étant fixes, on recalcule la TPS depuis le sous-total et la TVQ prend le
// reliquat d'arrondi, pour que tps + tvq colle toujours exactement au montant
// réellement chargé. Si Stripe n'a rien facturé (Stripe Tax pas encore actif
// dans le tableau de bord), tout reste à zéro : jamais une taxe inventée.
function detailTaxesQC(session: { amount_subtotal?: number; amount_total?: number; total_details?: { amount_tax?: number } }) {
  const montantHT = session.amount_subtotal ?? session.amount_total ?? 0;
  const total = session.amount_total ?? 0;
  const taxes = session.total_details?.amount_tax ?? 0;
  const tps = taxes > 0 ? Math.round(montantHT * 0.05) : 0;
  const tvq = taxes > 0 ? taxes - tps : 0;
  return { montantHT, tps, tvq, taxes, total };
}

// ─── Les versements : l'abonnement Stripe derrière un achat ─────────────────
// Un achat en n versements est un abonnement mensuel. Ses métadonnées (uid,
// formationId, versements) disent à quel achat chaque facture appartient.
type MetaVersements = { uid?: string; formationId?: string; versements?: string };

async function appelStripe(methode: 'GET' | 'DELETE', chemin: string): Promise<{ ok: boolean; status: number; data: any }> {
  const r = await fetch(`https://api.stripe.com/v1/${chemin}`, {
    method: methode,
    headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY.value()}` },
  });
  return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) };
}

// L'abonnement et ses métadonnées d'une facture. Selon la version de l'API
// du point de terminaison, Stripe les range dans invoice.parent (2025 et
// après) ou directement sur la facture (avant); au besoin on relit l'abonnement.
async function versementsDeFacture(invoice: any): Promise<{ meta: MetaVersements; abonnementId: string }> {
  const brut = invoice.parent?.subscription_details?.subscription ?? invoice.subscription ?? '';
  const abonnementId = typeof brut === 'string' ? brut : String(brut?.id || '');
  let meta: MetaVersements = invoice.parent?.subscription_details?.metadata || invoice.subscription_details?.metadata || {};
  if (!meta.formationId && abonnementId) {
    const r = await appelStripe('GET', `subscriptions/${abonnementId}`);
    if (r.ok) meta = r.data?.metadata || {};
  }
  return { meta, abonnementId };
}

// Le dernier versement réglé : on arrête l'abonnement pour qu'aucun mois de
// trop ne soit prélevé. Un abonnement déjà annulé (404) compte comme fait.
async function annulerAbonnementSiComplet(ref: FirebaseFirestore.DocumentReference, abonnementId: string): Promise<boolean> {
  const a = (await ref.get()).data() as { versements?: number; versementsPayes?: number; abonnementAnnule?: boolean } | undefined;
  if (!a || !a.versements || (a.versementsPayes || 0) < a.versements || a.abonnementAnnule) return true;
  const r = await appelStripe('DELETE', `subscriptions/${abonnementId}`);
  if (!r.ok && r.status !== 404) {
    console.error('[paiements] annulation de l\'abonnement refusée', abonnementId, r.data?.error?.message);
    return false;
  }
  await ref.set({ versementsTermine: true, abonnementAnnule: true, termineLe: FieldValue.serverTimestamp() }, { merge: true });
  console.log(`[paiements] versements terminés, abonnement ${abonnementId} annulé`);
  return true;
}

export const stripeWebhook = onRequest(
  // Les secrets de la lettre voyagent avec le webhook : la branche des billets
  // envoie le courriel qui les porte, et Firebase refuse à l'exécution la
  // lecture d'un secret qui n'est pas déclaré ici. Sans cette ligne, les
  // billets s'écriraient en base sans jamais atteindre l'acheteuse.
  // STRIPE_SECRET_KEY : les versements relisent et annulent l'abonnement.
  { region: 'us-central1', secrets: [STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY, ...MAIL_SECRETS], cors: false, maxInstances: 5 },
  async (req, res) => {
    if (req.method !== 'POST') { res.status(405).send('Method not allowed'); return; }
    const rawBody: Buffer = (req as any).rawBody as Buffer;
    if (!rawBody) { res.status(400).send('Missing body'); return; }
    if (!verifierSignatureStripe(rawBody, req.header('Stripe-Signature'), STRIPE_WEBHOOK_SECRET.value())) {
      res.status(401).send('Invalid signature'); return;
    }

    const event = JSON.parse(rawBody.toString('utf8'));

    // ── Les versements suivants : une facture mensuelle réglée ──
    if (event.type === 'invoice.paid') {
      const invoice = event.data?.object || {};
      const { meta, abonnementId } = await versementsDeFacture(invoice);
      if (!meta.uid || !meta.formationId || !abonnementId) { res.status(200).send('ignored'); return; }
      // Le premier versement est compté par checkout.session.completed.
      if (invoice.billing_reason === 'subscription_create') { res.status(200).send('premier versement'); return; }
      const db = getFirestore();
      const ref = db.doc(`achatsFormations/${meta.uid}/formations/${meta.formationId}`);
      // Une même facture ne se compte jamais deux fois (Stripe peut renvoyer l'événement).
      const compte = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) return 'absent';
        const payees = (snap.data() as { facturesPayees?: string[] }).facturesPayees || [];
        if (payees.includes(String(invoice.id))) return 'deja';
        tx.set(ref, {
          versementsPayes: FieldValue.increment(1),
          suspendu: false,
          facturesPayees: FieldValue.arrayUnion(String(invoice.id)),
          dernierVersementLe: FieldValue.serverTimestamp(),
        }, { merge: true });
        return 'compte';
      });
      // L'achat pas encore écrit : Stripe réessaiera plus tard.
      if (compte === 'absent') { res.status(500).send('achat absent'); return; }
      const annule = await annulerAbonnementSiComplet(ref, abonnementId);
      console.log(`[paiements] versement ${compte} pour ${meta.uid} -> ${meta.formationId}`);
      res.status(annule ? 200 : 500).send(annule ? 'ok' : 'annulation en attente'); return;
    }

    // ── Un prélèvement qui échoue, ou un abonnement arrêté avant la fin ──
    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const sub = event.data?.object || {};
      const meta: MetaVersements = sub.metadata || {};
      if (!meta.uid || !meta.formationId) { res.status(200).send('ignored'); return; }
      const ref = getFirestore().doc(`achatsFormations/${meta.uid}/formations/${meta.formationId}`);
      const a = (await ref.get()).data() as { versements?: number; versementsPayes?: number; versementsTermine?: boolean } | undefined;
      if (!a) { res.status(200).send('achat absent'); return; }
      const impaye = event.type === 'customer.subscription.updated'
        && (sub.status === 'unpaid' || sub.status === 'past_due') && !a.versementsTermine;
      const arreteTot = event.type === 'customer.subscription.deleted'
        && (a.versementsPayes || 0) < (a.versements || Number(meta.versements) || 0);
      if (impaye || arreteTot) {
        await ref.set({ suspendu: true, suspenduLe: FieldValue.serverTimestamp() }, { merge: true });
        console.log(`[paiements] accès suspendu : ${meta.uid} -> ${meta.formationId} (${event.type}, ${sub.status})`);
      }
      res.status(200).send('ok'); return;
    }

    if (event.type !== 'checkout.session.completed') { res.status(200).send('ignored'); return; }
    const session = event.data?.object || {};
    const uid = session.metadata?.uid;
    const formationId = session.metadata?.formationId;
    // Le détail des taxes, commun aux trois types de vente Stripe. En cents, CAD.
    const detailTaxes = detailTaxesQC(session);

    // Un paquet de niskas : cent pièces, une seule fois par paiement.
    if (uid && session.metadata?.type === 'niskas' && session.payment_status === 'paid') {
      const n = Number(session.metadata?.niskas || NISKAS_PAR_PAQUET);
      const montant = (session.amount_total || 0) / 100;
      const credite = await crediterNiskas(uid, 'achat-niskas', n, `stripe:${session.id}`, { montant, ...detailTaxes });
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
        ...detailTaxes, // pas de taxe sur un pourboire : taxes/tps/tvq restent à 0
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

    // Une saison de Santé la vie payée en argent : même octroi que le chemin
    // niskas (acheterAvecNiskas), les episodes de la saison, jamais toute l'émission.
    if (uid && session.metadata?.type === 'saison' && session.payment_status === 'paid') {
      const db = getFirestore();
      const saison = String(session.metadata?.saison || '');
      const moduleNom = SAISONS[saison];
      if (moduleNom) {
        const lecons = await db.collection(`formations/${SANTE_LA_VIE_ID}/lecons`).where('moduleNom', '==', moduleNom).get();
        const episodes: Record<string, FieldValue> = {};
        for (const d of lecons.docs) episodes[d.id] = FieldValue.serverTimestamp();
        const f = (await db.doc(`formations/${SANTE_LA_VIE_ID}`).get()).data() as { titre?: string; imageUrl?: string } | undefined;
        await db.doc(`achatsFormations/${uid}/formations/${SANTE_LA_VIE_ID}`).set({
          titre: f?.titre || 'Émission Santé! La Vie!',
          imageUrl: f?.imageUrl || '',
          categorie: 'video',
          source: 'stripe',
          episodes,
          montant: (session.amount_total || 0) / 100,
          sessionId: session.id || '',
          accordeLe: FieldValue.serverTimestamp(),
          ...detailTaxes,
        }, { merge: true });
        console.log(`[paiements] saison ${saison} de Santé la vie pour ${uid} via Stripe`);
      }
      res.status(200).send('ok'); return;
    }

    // Des billets pour un événement de la billetterie maison : fabrication
    // des billets et envoi du courriel, tout dans functions/src/billetterie.ts.
    if (uid && session.metadata?.type === 'billets') {
      await traiterPaiementBillets(session);
      res.status(200).send('ok'); return;
    }

    // Un code promo à 100 % rend « no_payment_required » au lieu de « paid » :
    // l'accès s'ouvre quand même (achat test de Vata, 29 septembre 2026).
    const reglee = session.payment_status === 'paid' || session.payment_status === 'no_payment_required';
    if (!uid || !formationId || !reglee) { res.status(200).send('incomplete'); return; }

    const db = getFirestore();
    const fSnap = await db.doc(`formations/${formationId}`).get();
    const f = fSnap.exists ? (fSnap.data() as { titre?: string; imageUrl?: string }) : {};
    const refAchat = db.doc(`achatsFormations/${uid}/formations/${formationId}`);
    // Un achat en versements : le premier est réglé, les suivants arrivent par
    // invoice.paid. Un renvoi du même événement ne remet pas le compteur à 1.
    let champsVersements: Record<string, unknown> = {};
    if (session.mode === 'subscription' && session.subscription) {
      const abonnementId = typeof session.subscription === 'string' ? session.subscription : String(session.subscription.id || '');
      const deja = ((await refAchat.get()).data() as { abonnementId?: string } | undefined)?.abonnementId === abonnementId;
      if (!deja) {
        champsVersements = {
          versements: Number(session.metadata?.versements) || 1,
          versementsPayes: 1,
          abonnementId,
          suspendu: false,
        };
      }
    }
    await refAchat.set({
      ...champsVersements,
      titre: f.titre || formationId,
      imageUrl: f.imageUrl || '',
      montant: (session.amount_total || 0) / 100,
      sessionId: session.id || '',
      acheteLe: FieldValue.serverTimestamp(),
      ...detailTaxes,
      ...(session.metadata?.cadeauId ? { source: 'cadeau', cadeauId: session.metadata.cadeauId } : {}),
    }, { merge: true });
    if (session.metadata?.cadeauId) {
      await db.doc(`cadeaux/${session.metadata.cadeauId}`).set({ statut: 'utilise', utiliseLe: FieldValue.serverTimestamp(), sessionId: session.id || '' }, { merge: true });
    }
    console.log(`[paiements] achat enregistré: ${uid} -> ${formationId}`);
    // Les séquences déclenchées par cet achat (onboarding, suite de bienvenue) :
    // l'inscription et la première étape, sans jamais faire échouer le webhook.
    try { await inscrireSequencesAchat(uid, formationId, session.customer_details?.email || null); }
    catch (err) { console.error('[paiements] séquences', err); }
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
        // Un achat en versements dont un prélèvement a échoué : fermé jusqu'au paiement.
        if ((achat.data() as { suspendu?: boolean } | undefined)?.suspendu) {
          throw new HttpsError('permission-denied', 'Votre accès est suspendu : un versement n\'a pas pu être prélevé.');
        }
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
