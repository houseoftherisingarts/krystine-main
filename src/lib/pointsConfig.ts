// Loyalty-point configuration.
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for every points-earning rule, tier threshold, and
// reward in the catalog. Kept plain-data on purpose so Krystine can tune
// amounts here without touching any UI code.

// ─── La monnaie ──────────────────────────────────────────────────────────────
// Les points s'appellent des niskas (Alex, 2026-09-06) : le niska du Rig-Véda,
// l'ornement d'or porté au cou qui servait à compter la richesse, puis pièce d'or. Les
// identifiants de code gardent « points »; seul ce que la personne lit change.
export const MONNAIE = {
  fr: { un: 'niska', plusieurs: 'niskas' },
  en: { un: 'niska', plusieurs: 'niskas' },
} as const;

/** « 1 niska », « 12 niskas ». */
export function niskas(n: number, lang: 'FR' | 'EN' | string = 'FR'): string {
  const m = lang === 'EN' ? MONNAIE.en : MONNAIE.fr;
  return `${n} ${Math.abs(n) === 1 ? m.un : m.plusieurs}`;
}

export type PointsKind =
  | 'welcome'         // legacy — auto-granted on older accounts; no longer written
  | 'welcome-claim'   // vingt niskas offerts à la création du compte (serveur reclamerBienvenue)
  | 'quotidien'       // la roue des sept jours : une réclamation par journée civile
  | 'profil'          // profil complété (photo, nom, dosha), une fois
  | 'billet'          // premier billet sur le fil (serveur)
  | 'amitie'          // amitié acceptée (serveur)
  | 'parrainage'      // filleule inscrite par le lien ou le code (serveur)
  | 'parrainage-bienvenue' // dix niskas à la filleule qui s'inscrit avec un code (serveur)
  | 'question'        // question posée pendant un direct, une par direct
  | 'rediffusion'     // rediffusion regardée, une par rediffusion
  | 'commentaire'     // commentaire sous un billet, un par billet
  | 'boutique'        // negative : achat dans la petite boutique (serveur)
  | 'achat-niskas'    // cent niskas achetés pour dix dollars (serveur, Stripe)
  | 'quiz'
  | 'newsletter'
  | 'order'           // awarded once per order; `amount` derived from item count
  | 'video'           // one-shot per videoId
  | 'podcast'         // one-shot per episodeId
  | 'nav'             // one-shot per section
  | 'share'
  | 'formation'
  | 'origine'
  | 'direct'          // participation au direct : présence, message, cœur, pourboire
  | 'redeem'          // negative, subtracts on reward redemption
  | 'adjust';         // manual correction by admin

export const POINTS = {
  welcome:    20,
  profil:      5,
  billet:      5,
  amitie:      2,
  parrainage: 20,
  parrainageBienvenue: 10,
  question:    2,
  rediffusion: 3,
  commentaire: 1,
  quiz:        5,
  newsletter:  5,
  orderPerItem: 10,
  video:       3,
  podcast:     2,
  nav:         1,
  share:       2,
  formation:  50,
  origine:   100,
  // Le direct : la présence se salue une fois, la parole et les cœurs
  // se comptent au geste, le pourboire donne dix points par dollar.
  directPresence: 5,
  directMessage:  2,
  directCoeur:    1,
} as const;

// ─── La roue des sept jours ──────────────────────────────────────────────────
// Une récompense par journée civile (fuseau de Montréal), la roue avance tant
// que la personne revient chaque jour et repart au jour 1 après un jour sauté.
export const ROUE_QUOTIDIENNE = [1, 1, 2, 2, 3, 3, 5] as const;
export const FUSEAU = 'America/Toronto';

/** La journée civile de Montréal, « AAAA-MM-JJ ». */
export function journee(ms = Date.now()): string {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: FUSEAU, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(ms));
  const v = (t: string) => p.find(x => x.type === t)?.value ?? '';
  return `${v('year')}-${v('month')}-${v('day')}`;
}

export const veilleDe = (j: string): string => journee(new Date(`${j}T12:00:00-04:00`).getTime() - 86_400_000);

// ─── La petite boutique ──────────────────────────────────────────────────────
// Jumelle du catalogue serveur (functions/src/niskas.ts). Le serveur seul
// débite; ceci ne sert qu'à afficher.
export const COUT_COSMETIQUE = 5;
export const COUT_EPISODE = 100;
// Les vidéos sont gratuites; ouvrir la section « Les vidéos de Krystine » coûte dix niskas, une fois.
export const COUT_ACCES_VIDEOS = 10;
export const CATALOGUE_VIDEOS = '/compte/videos-krystine.json';

/** Une vidéo de Krystine, telle que scripts/youtube-catalogue.mjs l'écrit. */
export interface VideoKrystine { id: string; titre: string; duree: number; publieLe: string; vues: number; onglet: string; listes: string[] }
export interface CatalogueVideos { chaine: string; genereLe: string; listes: { id: string; titre: string; nb: number }[]; videos: VideoKrystine[] }
export const vignetteYoutube = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
export function dureeLisible(s: number): string {
  const m = Math.floor(s / 60); const h = Math.floor(m / 60);
  return h ? `${h} h ${String(m % 60).padStart(2, '0')}` : `${m} min`;
}
export const PAQUET_NISKAS = { niskas: 100, prix: 10 } as const;
// L'échelle des paquets (miroir de PAQUETS dans functions/src/paiements.ts) :
// plus le paquet est gros, plus le niska est doux.
export interface PaquetNiskas { id: string; niskas: number; prix: number }
export const PAQUETS_NISKAS: PaquetNiskas[] = [
  { id: 'p100', niskas: 100, prix: 10 },
  { id: 'p180', niskas: 180, prix: 15 },
  { id: 'p400', niskas: 400, prix: 30 },
  { id: 'p750', niskas: 750, prix: 50 },
  { id: 'p1600', niskas: 1600, prix: 100 },
  { id: 'p4500', niskas: 4500, prix: 250 },
  { id: 'p10000', niskas: 10000, prix: 500 },
];
export const SANTE_LA_VIE_ID = 'kajabi-2148754050';
export const BANNIERE_DEFAUT = '/compte/bienvenue-bureau.webp';
export const BANNIERE_NATURE = '/compte/bienvenue-bureau-nature.webp';

export interface ArticleBoutique {
  id: 'banniere-nature' | 'musique-origine' | 'skin-medzo' | 'skin-nuit';
  cout: number;
  nomFR: string; nomEN: string;
  descFR: string; descEN: string;
  icone: string;
}

export const BOUTIQUE: ArticleBoutique[] = [
  {
    id: 'banniere-nature', cout: COUT_COSMETIQUE, icone: 'fa-image',
    nomFR: 'Bannière Nature & Ayurveda', nomEN: 'Nature & Ayurveda banner',
    descFR: 'La même scène que votre bannière, avec Nature & Ayurveda posé sur la table.',
    descEN: 'The same scene as your banner, with Nature & Ayurveda on the table.',
  },
  {
    id: 'musique-origine', cout: COUT_COSMETIQUE, icone: 'fa-music',
    nomFR: "La musique d'Origine", nomEN: 'The Origin music',
    descFR: 'La pièce composée pour l’Expérience Origine. Téléchargez-la et faites-en la musique de tout le site.',
    descEN: 'The piece composed for the Origin Experience. Download it and make it the music of the whole site.',
  },
  {
    id: 'skin-medzo', cout: COUT_COSMETIQUE, icone: 'fa-mug-hot',
    nomFR: 'Skin Medzo Café', nomEN: 'Medzo Café skin',
    descFR: 'Un skin, c’est l’habillage de votre espace : les mêmes pages et les mêmes boutons, mais dans d’autres couleurs, comme une nappe neuve sur la même table. Celui-ci est dans des bruns de café au lait. Passez la souris sur la carte pour le voir, et enlevez-le quand vous voulez.',
    descEN: 'A skin is the dress of your space: the same pages and buttons in other colours, like a new tablecloth on the same table. This one comes in café au lait browns. Hover over the card to see it, and take it off whenever you like.',
  },
  {
    id: 'skin-nuit', cout: COUT_COSMETIQUE, icone: 'fa-moon',
    nomFR: 'Skin Nuit', nomEN: 'Night skin',
    descFR: 'L’espace passe en pleine nuit : vert profond et encre, ivoire pour les mots, ambre pour la lumière. Le même espace, les yeux reposés. Survolez la carte pour voir l’espace s’habiller.',
    descEN: 'Your space goes into deep night: deep green and ink, ivory for the words, amber for the light. The same space, eyes at rest. Hover over the card to see it dressed.',
  },
];

// ─── Comment gagner des niskas ───────────────────────────────────────────────
// La liste que lisent le profil, l'onglet Niskas et le PDF. Une ligne = une
// façon, dans l'ordre où une nouvelle membre les rencontre.
export interface FaconDeGagner { pts: string; fr: string; en: string; noteFR?: string; noteEN?: string }
export const FACONS_DE_GAGNER: FaconDeGagner[] = [
  { pts: `${POINTS.welcome}`, fr: 'Créer son compte', en: 'Create your account', noteFR: 'offerts à l’ouverture', noteEN: 'offered at signup' },
  { pts: `${ROUE_QUOTIDIENNE[0]} à ${ROUE_QUOTIDIENNE[6]}`, fr: 'Revenir chaque jour', en: 'Come back every day', noteFR: 'la roue des sept jours', noteEN: 'the seven-day wheel' },
  { pts: `${POINTS.profil}`, fr: 'Compléter son profil (photo, nom, dosha)', en: 'Complete your profile (photo, name, dosha)', noteFR: 'une fois', noteEN: 'once' },
  { pts: `${POINTS.quiz}`, fr: 'Faire le quiz Dosha', en: 'Take the Dosha quiz', noteFR: 'une fois', noteEN: 'once' },
  { pts: `${POINTS.newsletter}`, fr: 'S’abonner à l’infolettre', en: 'Subscribe to the newsletter', noteFR: 'une fois', noteEN: 'once' },
  { pts: `${POINTS.billet}`, fr: 'Publier son premier billet sur le fil', en: 'Post your first note on the feed', noteFR: 'une fois', noteEN: 'once' },
  { pts: `${POINTS.commentaire}`, fr: 'Commenter un billet', en: 'Comment on a note', noteFR: 'un par billet', noteEN: 'one per note' },
  { pts: `${POINTS.amitie}`, fr: 'Se faire une amie', en: 'Make a friend', noteFR: 'par amitié acceptée', noteEN: 'per accepted friendship' },
  { pts: `${POINTS.parrainage}`, fr: 'Inviter une amie qui crée son compte', en: 'Invite a friend who creates an account', noteFR: 'par filleule', noteEN: 'per referral' },
  { pts: `${POINTS.parrainageBienvenue}`, fr: 'S’inscrire avec le code d’une amie', en: 'Sign up with a friend’s code', noteFR: 'une fois, à l’ouverture', noteEN: 'once, at signup' },
  { pts: `${POINTS.directPresence}`, fr: 'Être présente au direct', en: 'Attend the live', noteFR: 'par direct', noteEN: 'per live' },
  { pts: `${POINTS.directMessage}`, fr: 'Écrire dans le clavardage du direct', en: 'Write in the live chat', noteFR: 'par message', noteEN: 'per message' },
  { pts: `${POINTS.question}`, fr: 'Poser une question pour le direct', en: 'Ask a question for the live', noteFR: 'une par direct', noteEN: 'one per live' },
  { pts: `${POINTS.rediffusion}`, fr: 'Regarder une rediffusion', en: 'Watch a replay', noteFR: 'une par rediffusion', noteEN: 'one per replay' },
  { pts: `${POINTS.video}`, fr: 'Regarder une vidéo', en: 'Watch a video', noteFR: 'une par vidéo', noteEN: 'one per video' },
  { pts: `${POINTS.podcast}`, fr: 'Écouter un épisode du podcast', en: 'Listen to a podcast episode', noteFR: 'un par épisode', noteEN: 'one per episode' },
  { pts: `${POINTS.share}`, fr: 'Partager une page sur les réseaux', en: 'Share a page on social media' },
  { pts: `${POINTS.nav}`, fr: 'Explorer une section du site', en: 'Explore a section of the site', noteFR: 'une par section', noteEN: 'one per section' },
  { pts: `${POINTS.orderPerItem}`, fr: 'Chaque produit commandé à la boutique', en: 'Each product ordered from the shop' },
  { pts: '10 par dollar', fr: 'Laisser un pourboire pendant le direct', en: 'Tip during the live', noteFR: '10 par dollar', noteEN: '10 per dollar' },
  { pts: `${POINTS.formation}`, fr: 'S’inscrire à une formation', en: 'Enrol in a program' },
  { pts: `${POINTS.origine}`, fr: 'Rejoindre l’Expérience Origine', en: 'Join the Origin Experience' },
  { pts: `${PAQUET_NISKAS.niskas}`, fr: `Acheter un paquet de ${PAQUET_NISKAS.niskas} niskas`, en: `Buy a pack of ${PAQUET_NISKAS.niskas} niskas`, noteFR: `${PAQUET_NISKAS.prix} $`, noteEN: `$${PAQUET_NISKAS.prix}` },
];

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
  // false = retirée de l'espace client sans être effacée (admin, Récompenses).
  actif?: boolean;
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
  // Le palier Source : Krystine ne donne pas de consultation privée (Alex,
  // 6 septembre 2026), donc une formation courte et un produit de la boutique.
  {
    id: 'masterclass-source',
    cost: 700,
    labelFR: 'La masterclass Santé Parfaite, offerte',
    labelEN: 'The Perfect Health masterclass, on us',
    descFR: "L'accès complet à la masterclass Santé Parfaite. Offert une seule fois, aux membres du palier Source.",
    descEN: 'Full access to the Perfect Health masterclass. Offered once, for Source-tier members.',
    minTier: 'source',
    oneShot: true,
  },
  {
    id: 'huile-source',
    cost: 900,
    labelFR: 'Une Huile Corporelle offerte',
    labelEN: 'A complimentary Body Oil',
    descFR: "L'huile corporelle de votre dosha, envoyée chez vous. Se réclame une seule fois.",
    descEN: 'The body oil of your dosha, sent to you. One-time claim.',
    minTier: 'source',
    oneShot: true,
  },
];

// La liste que lit l'espace client : celle que Krystine a réglée dans l'admin
// (settings/recompenses) quand elle existe, sinon le catalogue ci-dessus.
// Voir src/firebase/recompenses.ts.

// Resolve a reward's required tier threshold. Returns 0 when unset.
export function rewardMinThreshold(reward: Reward): number {
  if (!reward.minTier) return 0;
  return TIERS.find(t => t.id === reward.minTier)?.threshold ?? 0;
}
