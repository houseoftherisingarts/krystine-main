import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore } from 'firebase-admin/firestore';
import { normalizeOrder } from './normalize';
import type { ShopifyOrderPayload } from './types';

// Admin-API access token (shpat_…) used to read historical orders.
const SHOPIFY_ADMIN_TOKEN = defineSecret('SHOPIFY_ADMIN_TOKEN');
const SHOPIFY_SHOP_DOMAIN = defineSecret('SHOPIFY_SHOP_DOMAIN');
const SHOPIFY_API_VERSION = '2025-01';

const ADMIN_EMAILS = [
  'admin@krystinestlaurent.ca',
  'krystine@inspiratanature.com',
];

// Fetch one page of orders from the Shopify Admin REST API.
// `pageInfoUrl` is the full URL returned in the `Link` header for cursor-paginated pages.
async function fetchOrdersPage(shop: string, token: string, pageInfoUrl?: string) {
  const url = pageInfoUrl
    ? pageInfoUrl
    : `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/orders.json?status=any&limit=250`;
  const resp = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
    },
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new HttpsError('internal', `Shopify ${resp.status}: ${body.slice(0, 200)}`);
  }
  const link = resp.headers.get('link') || '';
  // Parse the `next` link from the Shopify Link header (RFC 5988).
  const nextMatch = link.match(/<([^>]+)>;\s*rel="next"/);
  const json = (await resp.json()) as { orders: ShopifyOrderPayload[] };
  return { orders: json.orders || [], next: nextMatch?.[1] };
}

// Callable function — admin-only. Pulls every order and writes/merges into Firestore.
// Usage from admin dashboard: httpsCallable(functions, 'shopifyBackfill')({}).
export const shopifyBackfill = onCall(
  { secrets: [SHOPIFY_ADMIN_TOKEN, SHOPIFY_SHOP_DOMAIN], timeoutSeconds: 540, memory: '512MiB' },
  async (request) => {
    const email = request.auth?.token?.email;
    if (!email || !ADMIN_EMAILS.includes(email)) {
      throw new HttpsError('permission-denied', 'Admin only.');
    }

    const shop = SHOPIFY_SHOP_DOMAIN.value();
    const token = SHOPIFY_ADMIN_TOKEN.value();
    if (!shop || !token) throw new HttpsError('failed-precondition', 'Shopify secrets not configured.');

    const db = getFirestore();
    let imported = 0;
    let next: string | undefined;
    let page = 0;

    do {
      const { orders, next: n } = await fetchOrdersPage(shop, token, next);
      if (!orders.length) break;

      // Firestore batch max is 500; we stay well under with 250-per-page chunks.
      const batch = db.batch();
      for (const o of orders) {
        const norm = normalizeOrder(o);
        batch.set(db.collection('shopifyOrders').doc(norm.id), { ...norm, shop, topic: 'backfill' }, { merge: true });
      }
      await batch.commit();
      imported += orders.length;
      next = n;
      page++;
      if (page > 100) break; // safety cap: 25k orders
    } while (next);

    return { imported, pages: page };
  }
);
