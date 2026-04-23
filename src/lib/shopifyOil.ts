import type { ShopifyProduct } from '../shopify';

// Locate the Shopify oil matching a dosha name. Matches accent/case-insensitively
// against title / productType / tags so "Huile Corporelle Vata", "The Soothing
// Vata", or a product simply tagged "vata" all resolve. Returns undefined if
// nothing matches — caller decides the fallback (redirect to collection, etc.).
export function findOilForDosha(products: ShopifyProduct[], doshaName: string): ShopifyProduct | undefined {
  const needle = doshaName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return products.find(p => {
    const hay = [p.title, p.productType, ...(p.tags || [])]
      .filter(Boolean)
      .map(s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''))
      .join(' | ');
    return hay.includes(needle);
  });
}
