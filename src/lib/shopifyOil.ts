import type { ShopifyProduct } from '../shopify';

// Locate the Shopify oil matching a dosha name. Matches accent/case-insensitively
// against title / productType / tags so "Huile Corporelle Vata", "The Soothing
// Vata", or a product simply tagged "vata" all resolve. Returns undefined if
// nothing matches — caller decides the fallback (redirect to collection, etc.).
export function findOilForDosha(products: ShopifyProduct[], doshaName: string): ShopifyProduct | undefined {
  const needle = doshaName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  // Jamais le format cabine (500 ml, réservé aux praticiennes) : Krystine, 3 oct. 2026.
  return products.filter(p => !/cabine/i.test(p.title)).find(p => {
    const hay = [p.title, p.productType, ...(p.tags || [])]
      .filter(Boolean)
      .map(s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''))
      .join(' | ');
    return hay.includes(needle);
  });
}

// Le format à proposer : le flacon de détail (50 ml), jamais la cabine ni la
// recharge de 500 ml, qui restent offertes sur la fiche produit. À défaut,
// le format le moins cher qui est en vente.
type Variante = ShopifyProduct['variants'][number];
export function formatDetail(product: ShopifyProduct): Variante | undefined {
  const enVente = product.variants.filter(v => v.availableForSale);
  const pool = enVente.length ? enVente : product.variants;
  const detail = pool.filter(v => !/cabine|500|recharge|refill/i.test(v.title));
  const choix = detail.length ? detail : pool;
  return [...choix].sort((a, b) => Number(a.price.amount) - Number(b.price.amount))[0];
}
