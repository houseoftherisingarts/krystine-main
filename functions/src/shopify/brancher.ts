import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { assertAdmin } from '../newsletter/send';

// Branche les commandes Shopify sur le site (4 oct. 2026). Les abonnements
// webhook doivent être créés par l'app personnalisée elle-même (son jeton
// SHOPIFY_ADMIN_TOKEN), parce que Shopify signe alors chaque envoi avec le
// client secret de cette app (SHOPIFY_API_SECRET), celui que vérifie
// shopifyWebhook. Un webhook créé dans Réglages › Notifications serait signé
// autrement et refusé. Idempotent : seuls les sujets absents sont créés.
// Aucun jeton ne sort d'ici : la réponse ne porte que des ids et des sujets.
const SHOPIFY_ADMIN_TOKEN = defineSecret('SHOPIFY_ADMIN_TOKEN');
const SHOPIFY_SHOP_DOMAIN = defineSecret('SHOPIFY_SHOP_DOMAIN');
const SHOPIFY_API_VERSION = '2026-07';
const ADRESSE = 'https://shopifywebhook-lbj5kip6wa-uc.a.run.app';
const SUJETS = ['ORDERS_PAID', 'ORDERS_CREATE', 'ORDERS_UPDATED'] as const;

interface Abonnement { id: string; topic: string; uri: string }

async function graphql<T>(shop: string, token: string, query: string, variables?: Record<string, unknown>): Promise<T> {
  const resp = await fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!resp.ok) throw new HttpsError('internal', `Shopify ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  const json = (await resp.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new HttpsError('internal', `Shopify : ${json.errors.map(e => e.message).join('; ').slice(0, 300)}`);
  return json.data as T;
}

const LISTE = `query { webhookSubscriptions(first: 100) { nodes { id topic uri } } }`;
const CREER = `mutation creer($topic: WebhookSubscriptionTopic!, $abonnement: WebhookSubscriptionInput!) {
  webhookSubscriptionCreate(topic: $topic, webhookSubscription: $abonnement) {
    webhookSubscription { id topic uri }
    userErrors { field message }
  }
}`;

async function lister(shop: string, token: string): Promise<Abonnement[]> {
  const d = await graphql<{ webhookSubscriptions: { nodes: Abonnement[] } }>(shop, token, LISTE);
  return d.webhookSubscriptions.nodes;
}

// Appel depuis l'admin : httpsCallable(functions, 'shopifyBrancherWebhooks')({}).
export const shopifyBrancherWebhooks = onCall(
  { secrets: [SHOPIFY_ADMIN_TOKEN, SHOPIFY_SHOP_DOMAIN], timeoutSeconds: 60 },
  async (request) => {
    assertAdmin(request);
    const shop = SHOPIFY_SHOP_DOMAIN.value().trim();
    const token = SHOPIFY_ADMIN_TOKEN.value().trim();
    if (!shop || !token) throw new HttpsError('failed-precondition', 'Secrets Shopify manquants.');

    const existants = await lister(shop, token);
    const crees: string[] = [];
    const erreurs: string[] = [];
    for (const topic of SUJETS) {
      if (existants.some(a => a.topic === topic && a.uri === ADRESSE)) continue;
      const d = await graphql<{ webhookSubscriptionCreate: { webhookSubscription: Abonnement | null; userErrors: { message: string }[] } }>(
        shop, token, CREER, { topic, abonnement: { uri: ADRESSE, format: 'JSON' } },
      );
      const r = d.webhookSubscriptionCreate;
      if (r.webhookSubscription) crees.push(topic);
      else erreurs.push(`${topic} : ${r.userErrors.map(e => e.message).join('; ')}`);
    }

    const finale = await lister(shop, token);
    return {
      crees,
      erreurs,
      abonnements: finale.map(a => ({ id: a.id, topic: a.topic, versLeSite: a.uri === ADRESSE })),
    };
  },
);
