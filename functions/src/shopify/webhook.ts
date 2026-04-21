import * as crypto from 'crypto';
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore } from 'firebase-admin/firestore';
import { normalizeOrder } from './normalize';
import type { ShopifyOrderPayload } from './types';

// Defined via `firebase functions:secrets:set SHOPIFY_API_SECRET`
// This is the "Client Secret" (shpss_…) of your Shopify custom app — used to verify HMAC.
const SHOPIFY_API_SECRET = defineSecret('SHOPIFY_API_SECRET');

// Shopify signs every webhook body with HMAC-SHA256 using the app's API secret.
// We compute the expected HMAC and compare timing-safely before trusting the payload.
function verifyHmac(rawBody: Buffer, secret: string, sigHeader?: string): boolean {
  if (!sigHeader) return false;
  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(sigHeader));
  } catch {
    return false;
  }
}

export const shopifyWebhook = onRequest(
  { secrets: [SHOPIFY_API_SECRET], cors: false, maxInstances: 10 },
  async (req, res) => {
    if (req.method !== 'POST') { res.status(405).send('Method not allowed'); return; }

    // Shopify requires the raw body to verify HMAC. Firebase Functions v2 exposes `rawBody` on req.
    const rawBody: Buffer = (req as any).rawBody as Buffer;
    if (!rawBody) { res.status(400).send('Missing body'); return; }

    const sig = req.header('X-Shopify-Hmac-Sha256') || undefined;
    if (!verifyHmac(rawBody, SHOPIFY_API_SECRET.value(), sig)) {
      res.status(401).send('Invalid HMAC');
      return;
    }

    const topic = req.header('X-Shopify-Topic') || '';
    const shop = req.header('X-Shopify-Shop-Domain') || '';

    let payload: ShopifyOrderPayload;
    try { payload = JSON.parse(rawBody.toString('utf8')); }
    catch { res.status(400).send('Invalid JSON'); return; }

    const db = getFirestore();

    try {
      if (topic.startsWith('orders/')) {
        const order = normalizeOrder(payload);
        await db.collection('shopifyOrders').doc(order.id).set({ ...order, shop, topic }, { merge: true });
      } else {
        console.info('[shopifyWebhook] ignored topic', topic);
      }
      // Shopify expects 2xx within ~5s or it retries. Acknowledge immediately.
      res.status(200).send('ok');
    } catch (e: any) {
      console.error('[shopifyWebhook] write failed', e);
      res.status(500).send('internal');
    }
  }
);
