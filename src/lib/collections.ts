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
    taglineFR: 'Les livres de Krystine',
    taglineEN: "Krystine's books",
    storyFR:
      "Nature & Ayurveda, Féminité & Ayurveda et La Cuisine Tonique. Trois livres écrits pour rester près de soi, annotés, repris d'une saison à l'autre. Bien souvent, ce sont eux qui ouvrent la porte, avant même la première huile.",
    storyEN:
      'Nature & Ayurveda, Femininity & Ayurveda and The Tonic Kitchen. Three books written to stay close at hand, annotated, picked up again from one season to the next. Very often they are what opens the door, even before the first oil.',
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
    taglineFR: 'Apaiser, ancrer, respirer',
    taglineEN: 'Soothe, ground, breathe',
    storyFR:
      "La synergie D-Stress et son roll-on, à garder dans le sac. Un rituel aromatique tout simple : quelques gouttes au creux du poignet ou derrière la nuque, trois longues respirations, et le rythme redescend d'un cran.",
    storyEN:
      'The D-Stress synergy and its roll-on, to keep in your bag. A very simple aromatic ritual: a few drops at the wrist or behind the neck, three long breaths, and the pace comes down a notch.',
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
      "La brume au néroli et la brume après-soleil. Deux soins pour la peau qui a pris le soleil, le vent ou l'air sec, et pour ces passages d'une saison à l'autre où le corps cherche encore son équilibre.",
    storyEN:
      'The neroli mist and the after-sun mist. Two treatments for skin that has taken sun, wind or dry air, and for those crossings from one season to the next when the body is still finding its balance.',
    bannerImage: ASSETS.formationsBg,
    match: p => productHas(p, ['neroli', 'after sun', 'after-sun', 'aftersun', 'solaire', 'apres-soleil', 'apres soleil']),
  },
  {
    id: 'visage-sens',
    slug: 'visage-sens',
    labelFR: 'Visage & Sens',
    labelEN: 'Face & Senses',
    taglineFR: 'Le visage, le nez, les yeux',
    taglineEN: 'The face, the nose, the eyes',
    storyFR:
      "Le sérum visage Défripant, l'huile nasale Nez ZEN et le Repose-Yeux. De petits soins pour ce qui s'expose le plus à l'air, au chauffage et aux écrans. Quelques secondes le matin, quelques minutes le soir.",
    storyEN:
      'The Défripant face serum, the Nez ZEN nasal oil and the eye rest. Small treatments for what is most exposed to air, heating and screens. A few seconds in the morning, a few minutes at night.',
    bannerImage: ASSETS.shopBg,
    match: p => productHas(p, ['serum', 'visage', 'nasale', 'nez zen', 'repose yeux', 'repose-yeux']),
  },
  // "Les Chandelles" collection retired at request — no candles on
  // sale right now. Slug + match logic kept commented for the day they
  // come back; flip back in by uncommenting + wiring into COLLECTIONS.
  // {
  //   id: 'chandelles', slug: 'chandelles', labelFR: 'Les Chandelles', ...
  // },
  {
    id: 'rituels',
    slug: 'rituels',
    labelFR: 'Les Rituels',
    labelEN: 'The Rituals',
    taglineFR: 'Les objets qui entourent le soin',
    taglineEN: 'The objects around the care',
    storyFR:
      "Le gratte-langue en cuivre, les bouteilles Inspirata, le palo santo. Des objets choisis pour durer et pour devenir familiers sous la main, parce qu'un rituel tient souvent à un objet qui nous attend au bon endroit.",
    storyEN:
      'The copper tongue scraper, the Inspirata bottles, the palo santo. Objects chosen to last and to grow familiar in the hand, because a ritual often holds on an object waiting for us in the right place.',
    bannerImage: ASSETS.blogBg,
    match: p => productHas(p, ['rituel', 'ritual', 'accessoire', 'accessory', 'brosse', 'brush', 'cup', 'coupe', 'gratte', 'bouteille', 'palo santo']),
  },
  {
    id: 'huiles-corporelles',
    slug: 'huiles-corporelles',
    labelFR: 'Les Huiles Corporelles',
    labelEN: 'The Body Oils',
    taglineFR: 'Une huile pour chaque dominance, et pour les moments de la vie',
    taglineEN: 'An oil for each dominance, and for the moments of life',
    storyFR:
      "Cinq huiles infusées à la main : L'Apaisante Vata (Vent et Espace), La Rafraîchissante Pitta (Feu et Eau), L'Énergisante Kapha (Eau et Terre), La Douceur Féminité et La Sportive. Des plantes d'ici, une infusion lente, une formule signée Krystine. Quelques minutes de massage, matin ou soir, et le corps s'en souvient.",
    storyEN:
      "Five hand-infused oils: L'Apaisante Vata (Wind and Space), La Rafraîchissante Pitta (Fire and Water), L'Énergisante Kapha (Water and Earth), La Douceur Féminité and La Sportive. Local plants, a slow infusion, a formula signed by Krystine. A few minutes of massage, morning or night, and the body remembers.",
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
