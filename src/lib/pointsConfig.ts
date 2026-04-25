// Loyalty-point configuration.
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for every points-earning rule, tier threshold, and
// reward in the catalog. Kept plain-data on purpose so Krystine can tune
// amounts here without touching any UI code.

export type PointsKind =
  | 'welcome'         // legacy — auto-granted on older accounts; no longer written
  | 'welcome-claim'   // current claim-once bonus, earned via button in Points tab
  | 'quiz'
  | 'newsletter'
  | 'order'           // awarded once per order; `amount` derived from item count
  | 'video'           // one-shot per videoId
  | 'podcast'         // one-shot per episodeId
  | 'nav'             // one-shot per section
  | 'share'
  | 'formation'
  | 'origine'
  | 'redeem'          // negative, subtracts on reward redemption
  | 'adjust';         // manual correction by admin

export const POINTS = {
  welcome:    50,
  quiz:        5,
  newsletter:  5,
  orderPerItem: 10,
  video:       3,
  podcast:     2,
  nav:         1,
  share:       2,
  formation:  50,
  origine:   100,
} as const;

// ─── Tiers (cosmetic + milestone) ────────────────────────────────────────────
// Display-only for now — used by the client Fidélité tab to render a
// progress-to-next-tier bar. Doesn't gate anything by itself; gating happens
// at redemption time via the REWARDS catalog below.
export interface Tier {
  id: string;
  threshold: number;
  labelFR: string;
  labelEN: string;
  // Thematic accent color (from the brand palette) used by the tab UI.
  accent: string;
}

export const TIERS: Tier[] = [
  { id: 'graine', threshold:    0, labelFR: 'Graine',   labelEN: 'Seed',   accent: '#8F9779' },
  { id: 'pousse', threshold:   50, labelFR: 'Pousse',   labelEN: 'Sprout', accent: '#6E8E4B' },
  { id: 'tige',   threshold:  150, labelFR: 'Tige',     labelEN: 'Stem',   accent: '#B8532F' },
  { id: 'fleur',  threshold:  350, labelFR: 'Fleur',    labelEN: 'Bloom',  accent: '#BC4A3C' },
  { id: 'source', threshold:  700, labelFR: 'Source',   labelEN: 'Source', accent: '#4A7C9D' },
];

// Given a lifetime point total, return the tier they currently sit in and
// the next tier they're working toward (if any). Lifetime is append-only
// (only incremented by `awardPoints` on positive amounts; redemptions and
// admin debits never reduce it), so the tier returned here is a high-water
// mark — the plant never regresses when the client spends points.
export function tierFromLifetime(lifetime: number): { current: Tier; next: Tier | null } {
  let current = TIERS[0];
  for (const t of TIERS) {
    if (lifetime >= t.threshold) current = t;
    else break;
  }
  const nextIdx = TIERS.indexOf(current) + 1;
  return { current, next: TIERS[nextIdx] || null };
}

// ─── Rewards catalog ─────────────────────────────────────────────────────────
// Each reward has a point cost and a short description shown to the client.
// Redemption is currently manual — "Échanger" writes a pending redemption
// record to Firestore that Krystine fulfills by emailing a Shopify code.
// Auto-generated codes can slot in later without changing this shape.
//
// `minTier` locks a reward until the member's plant has grown to (at least)
// that tier. Rewards without `minTier` are always available (subject to
// balance). `oneShot: true` means the reward can only be claimed once per
// member across their lifetime — used for tangible gifts (printed booklet,
// 1:1 call) where a repeat claim doesn't make sense.
export interface Reward {
  id: string;
  cost: number;
  labelFR: string;
  labelEN: string;
  descFR: string;
  descEN: string;
  minTier?: string;
  oneShot?: boolean;
}

export const REWARDS: Reward[] = [
  // Repeatable rebates — any tier, no uniqueness.
  {
    id: 'reb-10-boutique',
    cost: 50,
    labelFR: '10% sur la boutique',
    labelEN: '10% off the shop',
    descFR: "Un rabais de 10% applicable sur votre prochaine commande en boutique.",
    descEN: 'A 10% discount on your next shop order.',
  },
  {
    id: 'reb-huiles',
    cost: 120,
    labelFR: "15% sur les Huiles Corporelles",
    labelEN: '15% off the Body Oils',
    descFR: "Rabais de 15% sur toute la collection des Huiles Corporelles.",
    descEN: '15% discount across the Body Oils collection.',
  },

  // Tree-gated, one-shot gifts — unlocked as the plant matures.
  {
    id: 'rituel-offert',
    cost: 250,
    labelFR: "Un livret de rituels offert",
    labelEN: 'A complimentary rituals booklet',
    descFR: "Le Guide Rituels Inspirata en version imprimée, envoyé chez vous. Se réclame une seule fois.",
    descEN: 'The Inspirata Rituals Guide in print, sent to you. One-time claim.',
    minTier: 'tige',
    oneShot: true,
  },
  {
    id: 'reb-formation',
    cost: 500,
    labelFR: "50 $ sur une formation Inspirata",
    labelEN: '$50 off an Inspirata program',
    descFR: "Un crédit de 50 $ applicable à l'Expérience Origine ou au Programme Vata. Une seule fois.",
    descEN: 'A $50 credit for the Origin Experience or the Vata Program. One-time.',
    minTier: 'fleur',
    oneShot: true,
  },
  {
    id: 'appel-krystine',
    cost: 700,
    labelFR: "Appel privé avec Krystine (15 min)",
    labelEN: 'Private call with Krystine (15 min)',
    descFR: "Une rencontre virtuelle 1:1 de 15 minutes avec Krystine. Offerte une seule fois, aux membres du palier Source.",
    descEN: 'A 15-minute 1:1 virtual meeting with Krystine. Offered once, for Source-tier members.',
    minTier: 'source',
    oneShot: true,
  },
];

// Resolve a reward's required tier threshold. Returns 0 when unset.
export function rewardMinThreshold(reward: Reward): number {
  if (!reward.minTier) return 0;
  return TIERS.find(t => t.id === reward.minTier)?.threshold ?? 0;
}
