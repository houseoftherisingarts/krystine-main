// Shopify Storefront API client.
// Uses the public (unauthenticated) Storefront API token — safe to ship in-browser.

const DOMAIN = import.meta.env.VITE_SHOPIFY_DOMAIN as string | undefined;
const TOKEN = import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN as string | undefined;
const VERSION = (import.meta.env.VITE_SHOPIFY_API_VERSION as string | undefined) || '2025-01';

export const isShopifyConfigured = !!DOMAIN && !!TOKEN;

async function sf<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  if (!isShopifyConfigured) throw new Error('[Shopify] VITE_SHOPIFY_DOMAIN / VITE_SHOPIFY_STOREFRONT_TOKEN not set');
  const res = await fetch(`https://${DOMAIN}/api/${VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': TOKEN!,
      Accept: 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`[Shopify] HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(`[Shopify] ${json.errors.map((e: any) => e.message).join('; ')}`);
  return json.data as T;
}

export interface ShopifyMoney {
  amount: string;
  currencyCode: string;
}

export interface ShopifyProduct {
  id: string;
  handle: string;
  title: string;
  description: string;
  productType: string;
  tags: string[];
  availableForSale: boolean;
  featuredImage: { url: string; altText: string | null } | null;
  images: { url: string; altText: string | null }[];
  priceRange: { minVariantPrice: ShopifyMoney };
  variants: { id: string; title: string; availableForSale: boolean; price: ShopifyMoney }[];
  onlineStoreUrl: string | null;
}

interface ProductsResponse {
  products: {
    edges: { node: {
      id: string;
      handle: string;
      title: string;
      description: string;
      productType: string;
      tags: string[];
      availableForSale: boolean;
      featuredImage: { url: string; altText: string | null } | null;
      images: { edges: { node: { url: string; altText: string | null } }[] };
      priceRange: { minVariantPrice: ShopifyMoney };
      variants: { edges: { node: { id: string; title: string; availableForSale: boolean; price: ShopifyMoney } }[] };
      onlineStoreUrl: string | null;
    } }[];
  };
}

// Cache products in localStorage for fast repeat visits. Stale-while-revalidate:
// we return the cached payload immediately (if fresh) and still refire the
// network request in the background so the next mount has up-to-date data.
const PRODUCTS_CACHE_KEY = 'inspirata.shopify.products.v1';
const PRODUCTS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface ProductsCache {
  at: number;
  lang: 'FR' | 'EN';
  first: number;
  products: ShopifyProduct[];
}

function readProductsCache(first: number, lang: 'FR' | 'EN'): ShopifyProduct[] | null {
  try {
    const raw = localStorage.getItem(PRODUCTS_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as ProductsCache;
    if (cache.lang !== lang || cache.first < first) return null;
    if (Date.now() - cache.at > PRODUCTS_CACHE_TTL_MS) return null;
    return cache.products;
  } catch { return null; }
}

function writeProductsCache(products: ShopifyProduct[], first: number, lang: 'FR' | 'EN') {
  try {
    const cache: ProductsCache = { at: Date.now(), lang, first, products };
    localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(cache));
  } catch { /* storage full / disabled — ignore */ }
}

export function invalidateProductsCache() {
  try { localStorage.removeItem(PRODUCTS_CACHE_KEY); } catch { /* noop */ }
}

async function fetchProducts(first: number, lang: 'FR' | 'EN'): Promise<ShopifyProduct[]> {
  const country = lang === 'FR' ? 'CA' : 'US';
  const language = lang === 'FR' ? 'FR' : 'EN';
  const query = `
    query Products($first: Int!, $country: CountryCode!, $language: LanguageCode!)
    @inContext(country: $country, language: $language) {
      products(first: $first, sortKey: BEST_SELLING) {
        edges {
          node {
            id
            handle
            title
            description
            productType
            tags
            availableForSale
            featuredImage { url altText }
            images(first: 5) { edges { node { url altText } } }
            priceRange { minVariantPrice { amount currencyCode } }
            variants(first: 10) { edges { node { id title availableForSale price { amount currencyCode } } } }
            onlineStoreUrl
          }
        }
      }
    }
  `;
  const data = await sf<ProductsResponse>(query, { first, country, language });
  return data.products.edges.map(({ node }) => ({
    id: node.id,
    handle: node.handle,
    title: node.title,
    description: node.description,
    productType: node.productType,
    tags: node.tags,
    availableForSale: node.availableForSale,
    featuredImage: node.featuredImage,
    images: node.images.edges.map(e => e.node),
    priceRange: node.priceRange,
    variants: node.variants.edges.map(e => e.node),
    onlineStoreUrl: node.onlineStoreUrl,
  }));
}

export async function getProducts(first = 50, lang: 'FR' | 'EN' = 'FR'): Promise<ShopifyProduct[]> {
  const cached = readProductsCache(first, lang);
  if (cached) {
    // Revalidate silently so next mount sees fresh data.
    fetchProducts(first, lang)
      .then(fresh => writeProductsCache(fresh, first, lang))
      .catch(() => { /* keep cached */ });
    return cached;
  }
  const fresh = await fetchProducts(first, lang);
  writeProductsCache(fresh, first, lang);
  return fresh;
}

interface CartCreateResponse {
  cartCreate: {
    cart: { id: string; checkoutUrl: string } | null;
    userErrors: { field: string[]; message: string }[];
  };
}

export async function createCheckout(items: { variantId: string; quantity: number }[], lang: 'FR' | 'EN' = 'FR'): Promise<string> {
  const country = lang === 'FR' ? 'CA' : 'US';
  const language = lang === 'FR' ? 'FR' : 'EN';
  const query = `
    mutation CartCreate($input: CartInput!, $country: CountryCode!, $language: LanguageCode!)
    @inContext(country: $country, language: $language) {
      cartCreate(input: $input) {
        cart { id checkoutUrl }
        userErrors { field message }
      }
    }
  `;
  const input = { lines: items.map(i => ({ merchandiseId: i.variantId, quantity: i.quantity })) };
  const data = await sf<CartCreateResponse>(query, { input, country, language });
  const errors = data.cartCreate.userErrors;
  if (errors?.length) throw new Error(`[Shopify] ${errors.map(e => e.message).join('; ')}`);
  const url = data.cartCreate.cart?.checkoutUrl;
  if (!url) throw new Error('[Shopify] No checkout URL returned');
  return url;
}

export function formatMoney(money: ShopifyMoney, lang: 'FR' | 'EN' = 'FR'): string {
  const amount = parseFloat(money.amount);
  const locale = lang === 'FR' ? 'fr-CA' : 'en-CA';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: money.currencyCode,
    maximumFractionDigits: 2,
  }).format(amount);
}
