import { defineSecret } from 'firebase-functions/params';

// Jeton Admin Shopify (7 oct. 2026). L'app « krystinestlaurent.ca » vit dans le
// Dev Dashboard : Shopify n'y affiche plus de jeton fixe. Le site échange son
// identifiant client et son secret contre un jeton valide 24 h (client
// credentials grant), gardé en mémoire et redemandé avant d'expirer.
// SHOPIFY_API_SECRET est le même secret client qui signe les webhooks.
export const SHOPIFY_CLIENT_ID = defineSecret('SHOPIFY_CLIENT_ID');
export const SHOPIFY_API_SECRET = defineSecret('SHOPIFY_API_SECRET');
export const SHOPIFY_SHOP_DOMAIN = defineSecret('SHOPIFY_SHOP_DOMAIN');
export const SECRETS_SHOPIFY = [SHOPIFY_CLIENT_ID, SHOPIFY_API_SECRET, SHOPIFY_SHOP_DOMAIN];

let cache: { jeton: string; expire: number } | null = null;

export async function jetonShopify(): Promise<{ shop: string; token: string }> {
  const shop = SHOPIFY_SHOP_DOMAIN.value().trim();
  const id = SHOPIFY_CLIENT_ID.value().trim();
  const secret = SHOPIFY_API_SECRET.value().trim();
  if (!shop || !id || !secret) throw new Error('Secrets Shopify manquants.');
  if (cache && cache.expire > Date.now()) return { shop, token: cache.jeton };

  const resp = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: id, client_secret: secret }),
  });
  if (!resp.ok) throw new Error(`Shopify (jeton) ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  const json = (await resp.json()) as { access_token: string; expires_in?: number };
  // Marge de 10 minutes avant l'expiration annoncée (86 399 s par défaut).
  cache = { jeton: json.access_token, expire: Date.now() + ((json.expires_in ?? 86399) - 600) * 1000 };
  return { shop, token: json.access_token };
}
