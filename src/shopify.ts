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

// Ce que le public ne voit pas sur le site (Krystine, 4 oct. 2026) : les
// formats cabine de 500 ml réservés aux massothérapeutes (étiquette B2B,
// « revente interdite ») et les ensembles, à repenser avant d'y revenir.
const ETIQUETTES_CACHEES = ['b2b', 'btob500massagetherapy', 'bundle', 'wholesale'];
export const estPublic = (p: { handle: string; title: string; tags: string[] }) =>
  !p.tags.some((t) => ETIQUETTES_CACHEES.includes(t.toLowerCase()))
  && !/cabine/i.test(p.title)
  && !p.handle.startsWith('bap-');

async function fetchProducts(first: number, lang: 'FR' | 'EN'): Promise<ShopifyProduct[]> {
  // Prix en dollars canadiens pour toutes, même en anglais (Krystine, 4 oct. 2026).
  const country = 'CA';
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
  return data.products.edges.filter(({ node }) => estPublic(node)).map(({ node }) => ({
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
    return cached.filter(estPublic);
  }
  const fresh = await fetchProducts(first, lang);
  writeProductsCache(fresh, first, lang);
  return fresh;
}

// ── La page produit (/boutique/produit/:handle, 4 oct. 2026) ──────────────
// Une seule fiche, avec la description complète (HTML de Shopify, nettoyée
// à l'affichage par src/lib/htmlPropre.ts) et toutes les photos.
export interface ShopifyProductDetail extends ShopifyProduct {
  descriptionHtml: string;
  /** L'identifiant numérique, celui qu'Okendo emploie pour les avis. */
  numericId: string;
}

export async function getProductByHandle(handle: string, lang: 'FR' | 'EN' = 'FR'): Promise<ShopifyProductDetail | null> {
  const query = `
    query Product($handle: String!, $country: CountryCode!, $language: LanguageCode!)
    @inContext(country: $country, language: $language) {
      product(handle: $handle) {
        id handle title description descriptionHtml productType tags availableForSale
        featuredImage { url altText }
        images(first: 20) { edges { node { url altText } } }
        priceRange { minVariantPrice { amount currencyCode } }
        variants(first: 20) { edges { node { id title availableForSale price { amount currencyCode } } } }
        onlineStoreUrl
      }
    }
  `;
  const data = await sf<{ product: (ProductsResponse['products']['edges'][number]['node'] & { descriptionHtml: string }) | null }>(
    query, { handle, country: 'CA', language: lang === 'FR' ? 'FR' : 'EN' },
  );
  const n = data.product;
  if (!n || !estPublic(n)) return null;
  return {
    id: n.id,
    numericId: n.id.split('/').pop() || '',
    handle: n.handle,
    title: n.title,
    description: n.description,
    descriptionHtml: n.descriptionHtml,
    productType: n.productType,
    tags: n.tags,
    availableForSale: n.availableForSale,
    featuredImage: n.featuredImage,
    images: n.images.edges.map(e => e.node),
    priceRange: n.priceRange,
    variants: n.variants.edges.map(e => e.node),
    onlineStoreUrl: n.onlineStoreUrl,
  };
}

// ── Les étiquettes de Shopify en français (4 oct. 2026) ───────────────────
// Le catalogue porte des types et des étiquettes en anglais (« Facial Serum »,
// « Ayurvedic lifestyle », « Kitchen »). En français, une étiquette connue se
// traduit; une étiquette inconnue ne s'affiche pas plutôt que de montrer de
// l'anglais. Ajouter ici toute nouvelle étiquette à traduire.
const ETIQUETTES_FR: Record<string, string> = {
  'ayurvedic lifestyle': 'Art de vivre',
  'aromatherapie': 'Aromathérapie',
  'aromatherapy': 'Aromathérapie',
  'facial serum': 'Sérum visage',
  'serum': 'Sérum',
  'kitchen': 'Cuisine',
  'cuisine': 'Cuisine',
  'book': 'Livre',
  'bottle': 'Bouteille',
  'oil': 'Huile',
  'body oil': 'Huile corporelle',
  'candle': 'Chandelle',
  'chandelle': 'Chandelle',
  'femininity': 'Féminité',
  'feminine': 'Féminité',
  'copper': 'Cuivre',
};

/** Le libellé à afficher pour un type ou une étiquette Shopify, ou null pour le taire. */
export function libelleEtiquette(brut: string | null | undefined, lang: 'FR' | 'EN' = 'FR'): string | null {
  const t = (brut || '').trim();
  if (!t) return null;
  if (lang === 'EN') return t;
  return ETIQUETTES_FR[t.toLowerCase()] || null;
}

/** Pour un libellé déjà posé (panier) : traduit s'il est connu, sinon tel quel. */
export function libelleConnu(brut: string | null | undefined, lang: 'FR' | 'EN' = 'FR'): string {
  const t = (brut || '').trim();
  return (lang === 'FR' && ETIQUETTES_FR[t.toLowerCase()]) || t;
}

/** « 50ML » devient « 50 ml »; « Default Title » (produit sans format) devient null. */
export function libelleFormat(titre: string | null | undefined): string | null {
  const t = (titre || '').trim();
  if (!t || /^default title$/i.test(t)) return null;
  return t.replace(/(\d+)\s*ml\b/gi, '$1 ml');
}

interface CartCreateResponse {
  cartCreate: {
    cart: { id: string; checkoutUrl: string } | null;
    userErrors: { field: string[]; message: string }[];
  };
}

export async function createCheckout(items: { variantId: string; quantity: number }[], lang: 'FR' | 'EN' = 'FR', email?: string): Promise<string> {
  const country = 'CA';
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
  const input = {
    lines: items.map(i => ({ merchandiseId: i.variantId, quantity: i.quantity })),
    buyerIdentity: { countryCode: 'CA', ...(email ? { email } : {}) },
  };
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
