# Shopify → Firebase sync

Syncs Shopify order data into Firestore so the admin dashboard can show live analytics.

- **Webhooks** — real-time order updates (create / updated / paid / fulfilled / cancelled).
- **Backfill** — one-shot historical import triggered from the admin dashboard.

## Architecture

```
Shopify (Admin)  ──►  Cloud Function (shopifyWebhook)  ──►  Firestore /shopifyOrders
Admin Dashboard  ──►  Cloud Function (shopifyBackfill) ──►  Shopify Admin API ──► Firestore
```

Both functions live in `functions/src/shopify/`. They use the **Shopify Admin API** (private) —
tokens stay server-side. The browser never sees them.

## One-time setup

### 1. Upgrade Firebase to the Blaze plan
Cloud Functions that make outbound HTTP calls require Blaze. Realistic monthly cost at
Krystine's volume: well under $1.
Console → ⚙ Project settings → Usage and billing → **Modify plan** → Blaze.

### 2. Create a Shopify Admin-API app
Shopify admin → Settings → Apps and sales channels → Develop apps (open the **InspirataboutiqueAG**
app you already created, or create a new one).

**Admin API scopes** (Configuration → Configure):
- `read_orders`
- `read_products`
- `read_customers`

**Install app** → copy the **Admin API access token** (starts with `shpat_`).
Also note the **API secret key** (starts with `shpss_`) from the **API credentials** tab —
this is used to verify webhook signatures.

### 3. Install Firebase CLI (once per machine)

```bash
npm install -g firebase-tools
firebase login
```

If the global install hits `EACCES`, use `sudo` or a node version manager (nvm, volta).

### 4. Link the project

```bash
cd "/Users/lesalondesinconnus/Documents/Websites/Krystine Main"
firebase use krystinestlaurent-87566
```

### 5. Install function dependencies

```bash
cd functions
npm install
cd ..
```

### 6. Set Shopify secrets in Firebase

```bash
firebase functions:secrets:set SHOPIFY_API_SECRET
# → paste shpss_...  (app Client Secret from API credentials)

firebase functions:secrets:set SHOPIFY_ADMIN_TOKEN
# → paste shpat_...  (Admin API access token)

firebase functions:secrets:set SHOPIFY_SHOP_DOMAIN
# → paste: inspirata-ayurveda.myshopify.com
```

### 7. Deploy the functions

```bash
firebase deploy --only functions
```

Note the function URL from the output, e.g.:
```
https://shopifywebhook-xxxxx-uc.a.run.app
```

### 8. Register the Shopify webhooks
Shopify admin → Settings → Notifications → **Webhooks** section at the bottom.

Add a webhook for each of the following events, format **JSON**, URL = your deployed
`shopifyWebhook` URL, API version **2025-01**:

- `Order creation`
- `Order updated`
- `Order payment` (or `Order paid`)
- `Order fulfilled`
- `Order cancelled`

Shopify will sign each webhook with your app's API secret — the Cloud Function verifies the
HMAC signature before writing to Firestore. Requests without a valid signature are rejected
with 401.

### 9. Backfill historical orders
Open the admin dashboard → **Analytics Shopify** section → click **Importer l'historique**.
This calls the `shopifyBackfill` Cloud Function which pages through every order and writes
them into Firestore. Runs in one go for typical shops; capped at 25,000 orders.

## Redeploy after code changes

```bash
cd functions && npm run build && cd ..
firebase deploy --only functions
```

## Cost expectation
- ~1 invocation per Shopify event + 1 Firestore write each.
- Backfill: ~250 orders per API call, batched 250 writes each.
- At 60 orders/month × 5 events = 300 function runs. Blaze free tier covers 2M/month.
- Shopify Admin API rate limit: 40 req / 20s (REST) — backfill stays well under.

## Troubleshooting
- **`401 Invalid HMAC`** in function logs → secret mismatch. Re-copy Client Secret from Shopify
  and update `SHOPIFY_API_SECRET`, then redeploy.
- **`permission-denied` on backfill** → signed-in user isn't in `ADMIN_EMAILS` (`functions/src/shopify/backfill.ts`).
- **Empty Analytics dashboard** → webhooks not yet firing and no backfill run. Click "Importer
  l'historique" once.
- **Logs**: `firebase functions:log --only shopifyWebhook` (or tail in Console → Functions → Logs).
