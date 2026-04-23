// Premium boutique collections.
// ─────────────────────────────────────────────────────────────────────────────
// We group Shopify products into 6 editorial collections (plus a "tous"
// catch-all) without waiting on a Shopify-side taxonomy overhaul. Each
// manifest carries its own story + banner, and a `match(product)` predicate
// that looks at title / productType / tags. Order matters: `assignCollection`
// returns the first matching manifest, so put the more specific matchers
// higher up.
//
// When Krystine later tags her Shopify catalog properly, the match predicates
// become redundant and these manifests can migrate to real Shopify collection
// handles — without any front-end rewrite.

import type { ShopifyProduct } from '../shopify';
import { ASSETS } from '../content';

export interface CollectionManifest {
  id: string;
  slug: string;
  labelFR: string;
  labelEN: string;
  taglineFR: string;        // short kicker under the title (editorial voice)
  taglineEN: string;
  storyFR: string;          // ~60–100 word manifesto shown on the collection page
  storyEN: string;
  bannerImage: string;      // full-bleed editorial banner
  match: (p: ShopifyProduct) => boolean;
}

// Accent-insensitive, case-insensitive substring check — avoids mismatches
// between "défripante" (Shopify) and "defripante" (our keyword list).
const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const productHas = (p: ShopifyProduct, needles: string[]) => {
  const needlesN = needles.map(normalize);
  const haystack = [
    p.title,
    p.productType || '',
    ...(p.tags || []),
  ].map(normalize);
  return haystack.some(h => needlesN.some(n => h.includes(n)));
};

export const COLLECTIONS: CollectionManifest[] = [
  {
    id: 'bibliotheque',
    slug: 'bibliotheque',
    labelFR: 'La Bibliothèque',
    labelEN: 'The Library',
    taglineFR: 'Les livres signés Krystine',
    taglineEN: 'Books signed by Krystine',
    storyFR:
      "Nature & Ayurveda, Féminité & Ayurveda, La Cuisine Tonique — les ouvrages que Krystine tisse depuis plus de quinze ans. Des livres à lire lentement, en début de saison, pour laisser le propos infuser avant d'agir.",
    storyEN:
      "Nature & Ayurveda, Femininity & Ayurveda, The Tonic Kitchen — the books Krystine has been weaving for more than fifteen years. Books to read slowly, at the turn of a season, letting the thought settle before acting.",
    bannerImage: ASSETS.livresBg,
    // Checked *before* body oils because book titles sometimes mention "Vata"
    // etc. (e.g. an oil-related chapter title) and we don't want those routed
    // into Huiles Corporelles.
    match: p => productHas(p, ['livre', 'book', 'cuisine tonique']),
  },
  {
    id: 'serenite',
    slug: 'serenite',
    labelFR: 'Sérénité',
    labelEN: 'Serenity',
    taglineFR: 'Apaiser · Ancrer · Respirer',
    taglineEN: 'Soothe · Ground · Breathe',
    storyFR:
      "La formule D-Stress et son roll-on nomade. Un rituel aromatique pour ralentir le tempo — au creux du poignet, derrière la nuque, quand le monde s'accélère.",
    storyEN:
      "The D-Stress formula and its travel roll-on. An aromatic ritual to slow the tempo — at the wrist, behind the neck, when the world speeds up.",
    bannerImage: ASSETS.founderHover,
    match: p => productHas(p, ['d-stress', 'destress', 'd stress', 'roll on', 'roll-on', 'serenite']),
  },
  {
    id: 'solaires-saisons',
    slug: 'solaires-saisons',
    labelFR: 'Solaires & Saisons',
    labelEN: 'Sun & Seasons',
    taglineFR: 'Pour la lumière qui change',
    taglineEN: 'For the changing light',
    storyFR:
      "Néroli éclatant, soin after-sun réconfortant. Les essentiels qui accompagnent les peaux exposées et les passages entre deux saisons.",
    storyEN:
      "Radiant neroli, comforting after-sun care. The essentials that accompany sun-touched skin and the crossings between seasons.",
    bannerImage: ASSETS.formationsBg,
    match: p => productHas(p, ['neroli', 'after sun', 'after-sun', 'aftersun', 'solaire']),
  },
  {
    id: 'chandelles',
    slug: 'chandelles',
    labelFR: 'Les Chandelles',
    labelEN: 'The Candles',
    taglineFR: 'Une flamme, une atmosphère',
    taglineEN: 'A flame, an atmosphere',
    storyFR:
      "Cires végétales, mèches de coton, parfums composés pour la méditation et les soirs tranquilles. Des chandelles à brûler lentement, pour poser le soir dans la pièce.",
    storyEN:
      "Plant waxes, cotton wicks, scents composed for meditation and quiet evenings. Candles to burn slowly, to set the evening into the room.",
    bannerImage: ASSETS.shopBg,
    match: p => productHas(p, ['chandelle', 'candle', 'bougie']),
  },
  {
    id: 'rituels',
    slug: 'rituels',
    labelFR: 'Les Rituels',
    labelEN: 'The Rituals',
    taglineFR: 'Les gestes qui entourent la formule',
    taglineEN: 'The gestures that surround the formula',
    storyFR:
      "Les objets qui accompagnent le soin — brosses, coupes, linges. Choisis pour durer, transmis de saison en saison, pensés pour devenir familiers sous la main.",
    storyEN:
      "The objects that accompany care — brushes, cups, cloths. Chosen to last, passed from season to season, made to grow familiar under the hand.",
    bannerImage: ASSETS.blogBg,
    match: p => productHas(p, ['rituel', 'ritual', 'accessoire', 'accessory', 'brosse', 'brush', 'cup', 'coupe']),
  },
  {
    id: 'huiles-corporelles',
    slug: 'huiles-corporelles',
    labelFR: 'Les Huiles Corporelles',
    labelEN: 'The Body Oils',
    taglineFR: 'Vata · Pitta · Kapha · Féminité · Sportive · Défripante',
    taglineEN: 'Vata · Pitta · Kapha · Feminine · Sport · Anti-fatigue',
    storyFR:
      "Six huiles infusées à la main, chacune composée autour d'un dosha ou d'un moment de vie. Des plantes locales, une pression lente, une formulation signée Krystine — pensées pour se rappliquer à soi, matin après matin.",
    storyEN:
      "Six hand-infused oils, each composed around a dosha or a moment in life. Local plants, slow pressing, a formulation signed by Krystine — made to return to oneself, morning after morning.",
    bannerImage: ASSETS.ayurvedaBg,
    // Intentionally the broadest body-oil predicate, placed last so that books
    // /candles / roll-ons aren't swallowed by a stray "vata" keyword.
    match: p => productHas(p, [
      'huile corporelle', 'body oil', 'huile', 'oil',
      'vata', 'pitta', 'kapha',
      'feminite', 'feminine', 'feminity',
      'sportive', 'sport',
      'defripante', 'anti-fatigue',
    ]),
  },
];

// Slug used on the "all products" safety-valve page. Kept as a named constant
// so refactors don't silently break the /boutique → /boutique/tous hand-off.
export const ALL_PRODUCTS_SLUG = 'tous';

export function findCollection(slug: string): CollectionManifest | undefined {
  return COLLECTIONS.find(c => c.slug === slug);
}

// First-match assignment — a product belongs to at most one collection on
// display. Products matching nothing fall through to the "tous" catch-all.
export function assignCollection(p: ShopifyProduct): CollectionManifest | undefined {
  return COLLECTIONS.find(c => c.match(p));
}

// Count matched products per collection — powers the little counters on the
// /boutique landing cards.
export function countByCollection(products: ShopifyProduct[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const p of products) {
    const c = assignCollection(p);
    if (c) counts.set(c.id, (counts.get(c.id) || 0) + 1);
  }
  return counts;
}
