import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore, FieldValue, type Firestore } from 'firebase-admin/firestore';
import { soldeVerifie } from './niskas';

// L'échange des récompenses niskas (Alex, 7 septembre 2026). Jumeau serveur
// de REWARDS dans src/lib/pointsConfig.ts : SEULES les trois récompenses
// « actif » aujourd'hui s'échangent ici; les « bientôt » n'ont pas d'entrée,
// donc echangerRecompense les refuse d'elle-même (invalid-argument).

const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
const SHOPIFY_ADMIN_TOKEN = defineSecret('SHOPIFY_ADMIN_TOKEN');
const SHOPIFY_SHOP_DOMAIN = defineSecret('SHOPIFY_SHOP_DOMAIN');
const SHOPIFY_API_VERSION = '2025-01';

export const MASTERCLASS_SANTE_PARFAITE_ID = 'kajabi-2149362090';

interface RecompenseServeur { cost: number; oneShot?: boolean; label: string }
export const RECOMPENSES_ECHANGEABLES: Record<string, RecompenseServeur> = {
  'reb-formation': { cost: 435, oneShot: true, label: '50 $ sur une formation Krystine St-Laurent' },
  'reb-10-boutique': { cost: 500, label: '10 % sur la boutique, dès 75 $ d’achat' },
  'masterclass-source': { cost: 725, oneShot: true, label: 'La masterclass Santé Parfaite, offerte' },
};

// ─── Le noyau pur : les corps de requête, testables sans réseau ni clé ──────
export function corpsCouponFormation(): URLSearchParams {
  return new URLSearchParams({
    amount_off: '5000',
    currency: 'cad',
    duration: 'once',
    name: 'Cadeau niskas · 50 $ sur une formation',
  });
}

export function corpsPromotionCode(couponId: string, code: string, uid: string): URLSearchParams {
  return new URLSearchParams({
    coupon: couponId,
    code,
    max_redemptions: '1',
    // Jamais sous 50 $ : le rabais ne s'applique qu'à un panier qui le justifie.
    'restrictions[minimum_amount]': '5000',
    'restrictions[minimum_amount_currency]': 'cad',
    'metadata[uid]': uid,
  });
}

export function genererCodePromo(uid: string, prefixe = 'NISKAS'): string {
  return `${prefixe}${uid.slice(0, 6).toUpperCase()}${Date.now().toString(36).toUpperCase()}`;
}

/** Coupon Stripe (50 $ de rabais) + son code de promotion à usage unique.
 *  `creerSessionPaiement` (paiements.ts) accepte déjà allow_promotion_codes. */
async function creerCodeStripeFormation(uid: string): Promise<string> {
  const headers = {
    Authorization: `Bearer ${STRIPE_SECRET_KEY.value()}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  const couponRes = await fetch('https://api.stripe.com/v1/coupons', { method: 'POST', headers, body: corpsCouponFormation() });
  const coupon = (await couponRes.json()) as { id?: string; error?: { message?: string } };
  if (!couponRes.ok || !coupon.id) {
    console.error('[recompenses] coupon Stripe refusé', coupon.error?.message);
    throw new Error('coupon Stripe refusé');
  }
  const code = genererCodePromo(uid);
  const promoRes = await fetch('https://api.stripe.com/v1/promotion_codes', { method: 'POST', headers, body: corpsPromotionCode(coupon.id, code, uid) });
  const promo = (await promoRes.json()) as { code?: string; error?: { message?: string } };
  if (!promoRes.ok || !promo.code) {
    console.error('[recompenses] code de promotion Stripe refusé', promo.error?.message);
    throw new Error('code de promotion Stripe refusé');
  }
  return promo.code;
}

/** Un code Shopify unique (10 %, dès 75 $, une utilisation) si l'API Admin
 *  est vraiment configurée; sinon lève, pour laisser le repli s'exécuter. */
async function creerCodeShopifyBoutique(uid: string): Promise<string> {
  const token = SHOPIFY_ADMIN_TOKEN.value();
  const shop = SHOPIFY_SHOP_DOMAIN.value();
  if (!token || token === 'placeholder' || !shop) throw new Error('Shopify Admin API non configurée');

  const headers = { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' };
  const code = genererCodePromo(uid);
  const ruleRes = await fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/price_rules.json`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      price_rule: {
        title: code,
        target_type: 'line_item',
        target_selection: 'all',
        allocation_method: 'across',
        value_type: 'percentage',
        value: '-10.0',
        customer_selection: 'all',
        prerequisite_subtotal_range: { greater_than_or_equal_to: '75.00' },
        usage_limit: 1,
        starts_at: new Date().toISOString(),
      },
    }),
  });
  const rule = (await ruleRes.json()) as { price_rule?: { id?: number } };
  if (!ruleRes.ok || !rule.price_rule?.id) throw new Error('price_rule Shopify refusée');
  const codeRes = await fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/price_rules/${rule.price_rule.id}/discount_codes.json`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ discount_code: { code } }),
  });
  if (!codeRes.ok) throw new Error('discount_code Shopify refusé');
  return code;
}

/** Le code boutique : unique par Shopify si l'API répond, sinon le code fixe
 *  que Krystine crée elle-même dans Shopify et pose dans
 *  settings/recompensesCodes (champ codeBoutique10), un document séparé de
 *  settings/recompenses exprès : celui-là se réécrit en entier (setDoc sans
 *  merge) à chaque sauvegarde des récompenses dans l'admin — y poser le code
 *  l'aurait effacé à la première édition. */
async function codeBoutique10(db: Firestore, uid: string): Promise<string> {
  try {
    return await creerCodeShopifyBoutique(uid);
  } catch (e) {
    console.warn('[recompenses] Shopify indisponible, repli sur le code fixe', e);
  }
  const s = await db.doc('settings/recompensesCodes').get();
  const code = (s.data() as { codeBoutique10?: string } | undefined)?.codeBoutique10;
  if (!code) throw new HttpsError('failed-precondition', 'Le code boutique n’est pas encore prêt. Écrivez à Krystine, elle vous l’enverra.');
  return code;
}

export const echangerRecompense = onCall(
  { region: 'us-central1', secrets: [STRIPE_SECRET_KEY, SHOPIFY_ADMIN_TOKEN, SHOPIFY_SHOP_DOMAIN] },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Connectez-vous pour échanger une récompense.');
    const uid = req.auth.uid;
    const rewardId = String(req.data?.rewardId || '');
    const recompense = RECOMPENSES_ECHANGEABLES[rewardId];
    if (!recompense) throw new HttpsError('invalid-argument', 'Cette récompense n’existe pas.');
    const db = getFirestore();

    if (recompense.oneShot) {
      const mine = await db.collection('rewardRedemptions').where('uid', '==', uid).get();
      const deja = mine.docs.some((d) => {
        const data = d.data() as { rewardId?: string; status?: string };
        return data.rewardId === rewardId && data.status !== 'cancelled';
      });
      if (deja) throw new HttpsError('already-exists', 'Cette récompense a déjà été réclamée.');
    }

    const balRef = db.doc(`memberPoints/${uid}`);
    const balDoc = Number(((await balRef.get()).data() as { balance?: number } | undefined)?.balance || 0);
    const solde = await soldeVerifie(uid, balDoc);
    if (solde < recompense.cost) {
      throw new HttpsError('failed-precondition', `Il vous manque ${recompense.cost - solde} niska${recompense.cost - solde > 1 ? 's' : ''}.`);
    }

    // Le débit d'abord, en transaction (jamais deux fois pour la même
    // demande) : la personne « paie » sa récompense avant qu'on la fabrique.
    const redemptionRef = db.collection('rewardRedemptions').doc();
    const evt = db.doc(`pointsEvents/redeem:${redemptionRef.id}`);
    await db.runTransaction(async (tx) => {
      if ((await tx.get(evt)).exists) throw new HttpsError('already-exists', 'Cette demande est déjà traitée.');
      tx.set(redemptionRef, {
        uid,
        email: req.auth!.token.email || null,
        rewardId,
        rewardLabel: recompense.label,
        cost: recompense.cost,
        status: 'pending',
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.set(evt, { uid, kind: 'redeem', amount: -recompense.cost, dedupKey: `redeem:${redemptionRef.id}`, meta: { rewardId }, at: FieldValue.serverTimestamp() });
      tx.set(balRef, { balance: FieldValue.increment(-recompense.cost), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    });

    let code: string | undefined;
    try {
      if (rewardId === 'reb-formation') {
        code = await creerCodeStripeFormation(uid);
      } else if (rewardId === 'reb-10-boutique') {
        code = await codeBoutique10(db, uid);
      } else if (rewardId === 'masterclass-source') {
        await db.doc(`achatsFormations/${uid}/formations/${MASTERCLASS_SANTE_PARFAITE_ID}`).set(
          { source: 'recompense', offertLe: FieldValue.serverTimestamp() },
          { merge: true },
        );
      }
      await redemptionRef.update({
        status: 'fulfilled',
        fulfilledAt: FieldValue.serverTimestamp(),
        ...(code ? { fulfillmentNote: code } : {}),
      });
    } catch (e) {
      // Les niskas restent débités (la demande est faite) : elle reste
      // 'pending', Krystine la complète à la main depuis l'admin.
      console.error('[recompenses] échange non honoré tout de suite', rewardId, uid, e);
      throw new HttpsError('internal', 'Vos niskas sont débités; votre code arrivera par courriel sous peu.');
    }

    console.log(`[recompenses] ${uid} échange ${rewardId} pour ${recompense.cost} niskas`);
    return { ok: true, redemptionId: redemptionRef.id, code: code || null };
  },
);
