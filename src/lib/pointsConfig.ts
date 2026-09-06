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
  // Au plus vingt niskas de clavardage par direct (dix messages), pour que
  // personne ne se fasse spammer (Alex, 6 septembre 2026).
  directMessageMax: 20,
} as const;

// Une rediffusion, une vidéo ou un épisode de podcast ne rapporte qu'à la
// fin : il faut en avoir écouté plus de 80 %.
export const PART_ECOUTEE = 0.8;

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
export const COUT_EPISODE = 25;
// Une saison complète de Santé la vie (Module 1 = saison 1, Module 2 = saison 2).
export const COUT_SAISON = 175;
export const SAISONS_SANTE_LA_VIE: Record<string, { module: string; n: number }> = { '1': { module: 'Module 1', n: 1 }, '2': { module: 'Module 2', n: 2 } };
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

// ─── Les bannières ───────────────────────────────────────────────────────────
// Chaque bannière achetée se met en haut de l'espace et se télécharge; son
// fond d'écran (1920 × 1080) s'ouvre dans une fenêtre avec la marche à suivre
// Mac ou PC (Alex, 6 septembre 2026). Les cinq nouvelles gardent le thème du
// bureau, sous d'autres angles, avec des fleurs (l'iris versicolore de Krystine).
export interface Banniere { cle: string; cout: number; nomFR: string; nomEN: string; descFR: string; descEN: string; image: string; fond: string | null }
export const BANNIERES: Banniere[] = [
  { cle: 'nature', cout: 5, nomFR: 'Bannière Nature & Ayurveda', nomEN: 'Nature & Ayurveda banner',
    descFR: 'La même scène que votre bannière, avec Nature & Ayurveda posé sur la table.', descEN: 'The same scene as your banner, with Nature & Ayurveda on the table.',
    image: BANNIERE_NATURE, fond: '/compte/fonds/nature.webp' },
  { cle: 'iris', cout: 8, nomFR: 'Bannière L’iris du matin', nomEN: 'Morning Iris banner',
    descFR: 'Le bureau de trois quarts, au soleil du matin, avec un iris versicolore en pot et le carnet ouvert.', descEN: 'The desk at a three-quarter angle in morning sun, a potted iris versicolor and the open journal.',
    image: '/compte/bannieres/iris.webp', fond: '/compte/fonds/iris.webp' },
  { cle: 'pivoine', cout: 12, nomFR: 'Bannière La pivoine', nomEN: 'Peony banner',
    descFR: 'Une tisane qui fume, deux livres de lin, une pivoine dans un verre et la lumière de fin d’après-midi.', descEN: 'Steaming herbal tea, two linen books, a peony in a glass and late-afternoon light.',
    image: '/compte/bannieres/pivoine.webp', fond: '/compte/fonds/pivoine.webp' },
  { cle: 'huiles', cout: 12, nomFR: 'Bannière Les huiles', nomEN: 'The Oils banner',
    descFR: 'Au ras du bureau de noyer : les flacons d’ambre, un bol d’herbes séchées et une chandelle qui veille.', descEN: 'Low across the walnut desk: amber bottles, a bowl of dried herbs and a candle keeping watch.',
    image: '/compte/bannieres/huiles.webp', fond: '/compte/fonds/huiles.webp' },
  { cle: 'jardin', cout: 15, nomFR: 'Bannière Le jardin après la pluie', nomEN: 'Garden After Rain banner',
    descFR: 'Le bureau devant la grande fenêtre, le jardin mouillé derrière, et l’iris en terre cuite au premier plan.', descEN: 'The desk before the big window, the wet garden behind, the iris in terracotta up front.',
    image: '/compte/bannieres/jardin.webp', fond: '/compte/fonds/jardin.webp' },
  { cle: 'soir', cout: 18, nomFR: 'Bannière Le soir à la lampe', nomEN: 'Evening Lamp banner',
    descFR: 'La lampe de laiton allumée, le carnet ouvert et un bouquet de fleurs sauvages dans la cruche de grès.', descEN: 'The brass lamp lit, the journal open and a jug of wildflowers on the desk.',
    image: '/compte/bannieres/soir.webp', fond: '/compte/fonds/soir.webp' },
];
export const banniereParCle = (cle: string) => BANNIERES.find(b => b.cle === cle);
export const FOND_DEFAUT = '/compte/fonds/defaut.webp';

export type CategorieBoutique = 'banniere' | 'musique' | 'skin';
export const CATEGORIES_BOUTIQUE: { id: CategorieBoutique; titreFR: string; titreEN: string; texteFR: string; texteEN: string; icone: string }[] = [
  { id: 'banniere', icone: 'fa-image', titreFR: 'Les bannières', titreEN: 'Banners',
    texteFR: 'La bannière est la grande image en haut de votre espace. Vous pouvez y mettre votre propre photo, ou une des images de la boutique. Chaque bannière achetée se télécharge aussi en fond d’écran (1920 × 1080) pour votre ordinateur.',
    texteEN: 'The banner is the large picture at the top of your space. You can put your own photo there, or one of the shop’s pictures. Every banner you buy also downloads as a desktop wallpaper (1920 × 1080).' },
  { id: 'musique', icone: 'fa-music', titreFR: 'Les musiques', titreEN: 'Music',
    texteFR: 'Une musique achetée se télécharge sur votre ordinateur et peut devenir la musique d’ambiance de tout le site, celle du petit bouton en haut de page.',
    texteEN: 'A purchased piece downloads to your computer and can become the ambient music of the whole site, the one behind the little button at the top of the page.' },
  { id: 'skin', icone: 'fa-palette', titreFR: 'Les skins', titreEN: 'Skins',
    texteFR: 'Un skin, c’est l’habillage de votre espace : les mêmes pages et les mêmes boutons, mais dans d’autres couleurs, comme une nappe neuve sur la même table. Passez la souris sur une carte pour voir votre espace s’habiller, et enlevez le skin quand vous voulez.',
    texteEN: 'A skin is the dress of your space: the same pages and buttons in other colours, like a new tablecloth on the same table. Hover over a card to see your space dressed, and take the skin off whenever you like.' },
];

// ─── Les skins ───────────────────────────────────────────────────────────────
// Chaque skin est une palette : le CSS (skins.css) et l'aperçu de la boutique
// en découlent. `cout` null = skin rare, qui ne s'obtient que dans un coffre
// (Alex, 6 septembre 2026). Les identifiants d'article sont `skin-${cle}`.
export type RareteSkin = 'commun' | 'rare' | 'legendaire';
export interface PaletteSkin { fond: string; panneau: string; encre: string; accent: string; accentClair: string; accentProfond: string; sombre: boolean }
export interface Skin {
  cle: string; nomFR: string; nomEN: string; descFR: string; descEN: string; icone: string;
  cout: number | null; rarete: RareteSkin; coffre?: 'bronze' | 'argent' | 'or'; palette: PaletteSkin;
}
export const SKINS: Skin[] = [
  { cle: 'medzo', cout: 5, rarete: 'commun', icone: 'fa-mug-hot', nomFR: 'Skin Medzo Café', nomEN: 'Medzo Café skin',
    descFR: 'Des bruns de café au lait, chauds et calmes, comme une table de bistro en fin d’après-midi.',
    descEN: 'Warm, calm café au lait browns, like a bistro table late in the afternoon.',
    palette: { fond: '#e9d2b6', panneau: '#fbf1e2', encre: '#3b2214', accent: '#96592a', accentClair: '#d29a52', accentProfond: '#6d3d1a', sombre: false } },
  { cle: 'nuit', cout: 5, rarete: 'commun', icone: 'fa-moon', nomFR: 'Skin Nuit', nomEN: 'Night skin',
    descFR: 'L’espace passe en pleine nuit : vert profond et encre, ivoire pour les mots, ambre pour la lumière. Le même espace, les yeux reposés.',
    descEN: 'Your space goes into deep night: deep green and ink, ivory for the words, amber for the light. The same space, eyes at rest.',
    palette: { fond: '#151d19', panneau: '#1e2823', encre: '#EEE7DB', accent: '#BA7B39', accentClair: '#d9a05b', accentProfond: '#d9a05b', sombre: true } },
  { cle: 'coffee', cout: 5, rarete: 'commun', icone: 'fa-coffee', nomFR: 'Skin Dark Coffee', nomEN: 'Dark Coffee skin',
    descFR: 'Un café noir, serré : fonds brun profond, crème pour les mots, cuivre pour la lumière. Le skin sombre et chaud.',
    descEN: 'A short black coffee: deep brown grounds, cream for the words, copper for the light. The dark, warm skin.',
    palette: { fond: '#1b120c', panneau: '#2a1c13', encre: '#f1e6d6', accent: '#b8733f', accentClair: '#d99a5f', accentProfond: '#d99a5f', sombre: true } },
  { cle: 'aube', cout: 15, rarete: 'commun', icone: 'fa-sun', nomFR: 'Skin Aube rose', nomEN: 'Rose Dawn skin',
    descFR: 'Le rose pâle du ciel juste avant le soleil, et un vieux rose pour les boutons. Un espace qui se réveille doucement.',
    descEN: 'The pale pink of the sky right before sunrise, dusty rose for the buttons. A space that wakes up gently.',
    palette: { fond: '#f8dcd6', panneau: '#fff4f0', encre: '#4a2630', accent: '#d2657f', accentClair: '#ea9bb0', accentProfond: '#963c56', sombre: false } },
  { cle: 'terre', cout: 20, rarete: 'commun', icone: 'fa-fire-flame-simple', nomFR: 'Skin Terre cuite', nomEN: 'Terracotta skin',
    descFR: 'La chaleur d’un pot de terre au soleil : sable, argile et brique. Le skin des après-midi d’été.',
    descEN: 'The warmth of a clay pot in the sun: sand, clay and brick. The skin of summer afternoons.',
    palette: { fond: '#f0cfae', panneau: '#faebdc', encre: '#4a2617', accent: '#c4552a', accentClair: '#e08a58', accentProfond: '#85361a', sombre: false } },
  { cle: 'foret', cout: 25, rarete: 'commun', icone: 'fa-tree', nomFR: 'Skin Forêt', nomEN: 'Forest skin',
    descFR: 'Le sous-bois à la tombée du jour : vert sombre, mousse et lichen clair pour la lumière.',
    descEN: 'The undergrowth at dusk: dark green, moss, pale lichen for the light.',
    palette: { fond: '#0f1a14', panneau: '#182620', encre: '#e6ebdd', accent: '#7fa36a', accentClair: '#a9c68f', accentProfond: '#a9c68f', sombre: true } },
  { cle: 'ocean', cout: 35, rarete: 'commun', icone: 'fa-water', nomFR: 'Skin Océan', nomEN: 'Ocean skin',
    descFR: 'Le bleu profond du large et l’écume turquoise. Un espace frais, qui respire.',
    descEN: 'The deep blue of open water and turquoise foam. A cool space that breathes.',
    palette: { fond: '#0b1620', panneau: '#122232', encre: '#e3eef2', accent: '#4fa3a8', accentClair: '#8dd3d6', accentProfond: '#8dd3d6', sombre: true } },
  { cle: 'encre', cout: 55, rarete: 'commun', icone: 'fa-feather-pointed', nomFR: 'Skin Encre & or', nomEN: 'Ink & Gold skin',
    descFR: 'Du noir d’encre et de l’or pour chaque bouton. Le skin le plus habillé de la boutique.',
    descEN: 'Ink black and gold on every button. The most dressed-up skin in the shop.',
    palette: { fond: '#0e0d0b', panneau: '#1b1916', encre: '#f2ecdf', accent: '#c9a052', accentClair: '#f3dfa2', accentProfond: '#e4c46e', sombre: true } },
  // Les skins rares : ils ne s'achètent pas, ils se trouvent dans un coffre.
  { cle: 'lotus', cout: null, rarete: 'rare', coffre: 'argent', icone: 'fa-spa', nomFR: 'Skin Lotus', nomEN: 'Lotus skin',
    descFR: 'Un mauve de crépuscule et le rose du lotus. Rare : il se trouve dans le coffre d’argent seulement.',
    descEN: 'Dusk mauve and lotus pink. Rare: found in the silver chest only.',
    palette: { fond: '#1a1420', panneau: '#261d2e', encre: '#f4e9f1', accent: '#d48ca8', accentClair: '#f2bfd2', accentProfond: '#f2bfd2', sombre: true } },
  { cle: 'aurore', cout: null, rarete: 'rare', coffre: 'or', icone: 'fa-wind', nomFR: 'Skin Aurore', nomEN: 'Aurora skin',
    descFR: 'La nuit polaire et ses voiles verts qui dansent en fond d’espace. Rare : dans le coffre d’or seulement.',
    descEN: 'The polar night and its green veils dancing behind your space. Rare: in the gold chest only.',
    palette: { fond: '#071019', panneau: '#0f1c28', encre: '#e6f3f0', accent: '#58d3b0', accentClair: '#a5f0da', accentProfond: '#a5f0da', sombre: true } },
  { cle: 'or-pur', cout: null, rarete: 'rare', coffre: 'or', icone: 'fa-crown', nomFR: 'Skin Or pur', nomEN: 'Pure Gold skin',
    descFR: 'Du noir profond et de l’or qui miroite sur chaque bouton, avec une pluie de paillettes d’or. Rare : dans le coffre d’or seulement.',
    descEN: 'Deep black and gold that shimmers on every button, with a drift of gold flecks. Rare: in the gold chest only.',
    palette: { fond: '#0b0a08', panneau: '#171410', encre: '#fbf3df', accent: '#e0b94f', accentClair: '#fff0b8', accentProfond: '#f0cf6a', sombre: true } },
  // Les trois légendaires : un dosha chacun, et une vraie scène animée derrière
  // l'espace (feu, eau, vent), des survols et des gestes de souris qui leur sont
  // propres. Ils ne se trouvent que dans les coffres.
  { cle: 'vata', cout: null, rarete: 'legendaire', coffre: 'bronze', icone: 'fa-wind', nomFR: 'Skin Vata · le vent', nomEN: 'Vata skin · the wind',
    descFR: 'Un sous-bois vert traversé de vent : des feuilles passent derrière votre espace et s’écartent sous votre souris. Légendaire.',
    descEN: 'A green undergrowth crossed by wind: leaves drift behind your space and scatter under your mouse. Legendary.',
    palette: { fond: '#0e1f17', panneau: '#173024', encre: '#eaf3e6', accent: '#8fd17a', accentClair: '#c6f0b0', accentProfond: '#b6ea9c', sombre: true } },
  { cle: 'pitta', cout: null, rarete: 'legendaire', coffre: 'bronze', icone: 'fa-fire', nomFR: 'Skin Pitta · le feu', nomEN: 'Pitta skin · the fire',
    descFR: 'La nuit près du feu : des braises montent derrière votre espace et s’avivent quand vous survolez un bouton. Légendaire.',
    descEN: 'Night by the fire: embers rise behind your space and flare when you hover a button. Legendary.',
    palette: { fond: '#1a0b06', panneau: '#2b140c', encre: '#fbe9dc', accent: '#ff7a2f', accentClair: '#ffb36b', accentProfond: '#ffa45c', sombre: true } },
  { cle: 'kapha', cout: null, rarete: 'legendaire', coffre: 'bronze', icone: 'fa-water', nomFR: 'Skin Kapha · l’eau', nomEN: 'Kapha skin · the water',
    descFR: 'Le fond d’un aquarium : la lumière ondule sur les murs, des bulles montent, et l’eau frémit sous vos gestes. Légendaire.',
    descEN: 'The bottom of an aquarium: light ripples on the walls, bubbles rise, and the water quivers under your gestures. Legendary.',
    palette: { fond: '#061a2b', panneau: '#0c2740', encre: '#e4f4fb', accent: '#3fb7d9', accentClair: '#9fe4f5', accentProfond: '#8ddcf0', sombre: true } },
];
export const skinParCle = (cle: string) => SKINS.find(s => s.cle === cle);
export const SKINS_LEGENDAIRES = SKINS.filter(s => s.rarete === 'legendaire');
export const SKINS_RARES = SKINS.filter(s => s.cout === null);

export interface ArticleBoutique {
  id: string;
  categorie: CategorieBoutique;
  cout: number;
  nomFR: string; nomEN: string;
  descFR: string; descEN: string;
  icone: string;
}

export const BOUTIQUE: ArticleBoutique[] = [
  ...BANNIERES.map((b): ArticleBoutique => ({ id: `banniere-${b.cle}`, categorie: 'banniere', cout: b.cout, icone: 'fa-image', nomFR: b.nomFR, nomEN: b.nomEN, descFR: b.descFR, descEN: b.descEN })),
  {
    id: 'musique-origine', categorie: 'musique', cout: COUT_COSMETIQUE, icone: 'fa-music',
    nomFR: "La musique d'Origine", nomEN: 'The Origin music',
    descFR: 'La pièce composée pour l’Expérience Origine. Téléchargez-la et faites-en la musique de tout le site.',
    descEN: 'The piece composed for the Origin Experience. Download it and make it the music of the whole site.',
  },
  ...SKINS.map((k): ArticleBoutique => ({ id: `skin-${k.cle}`, categorie: 'skin', cout: k.cout ?? 0, icone: k.icone, nomFR: k.nomFR, nomEN: k.nomEN, descFR: k.descFR, descEN: k.descEN })),
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
  { pts: `${POINTS.parrainageBienvenue}`, fr: 'S’inscrire avec le code d’une amie d’origine', en: 'Sign up with an Origine friend’s code', noteFR: 'une fois, à l’ouverture', noteEN: 'once, at signup' },
  { pts: `${POINTS.directPresence}`, fr: 'Être présente au direct', en: 'Attend the live', noteFR: 'par direct', noteEN: 'per live' },
  { pts: `${POINTS.directMessage}`, fr: 'Écrire dans le clavardage du direct', en: 'Write in the live chat', noteFR: `par message, ${POINTS.directMessageMax} au plus par direct`, noteEN: `per message, up to ${POINTS.directMessageMax} per live` },
  { pts: `${POINTS.question}`, fr: 'Poser une question pour le direct', en: 'Ask a question for the live', noteFR: 'une par direct', noteEN: 'one per live' },
  { pts: `${POINTS.rediffusion}`, fr: 'Regarder une rediffusion jusqu’au bout', en: 'Watch a replay to the end', noteFR: 'plus de 80 %, une par rediffusion', noteEN: 'over 80%, one per replay' },
  { pts: `${POINTS.video}`, fr: 'Regarder une vidéo jusqu’au bout', en: 'Watch a video to the end', noteFR: 'plus de 80 %, une par vidéo', noteEN: 'over 80%, one per video' },
  { pts: `${POINTS.podcast}`, fr: 'Écouter un épisode du podcast jusqu’au bout', en: 'Listen to a podcast episode to the end', noteFR: 'plus de 80 %, un par épisode', noteEN: 'over 80%, one per episode' },
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
  // Après l'arbre (Alex, 6 septembre 2026) : des lotus poussent dans ses
  // branches, puis l'arbre s'allume de lucioles.
  { id: 'lotus',   threshold: 1500, labelFR: 'Lotus',    labelEN: 'Lotus',  accent: '#C97B9B' },
  { id: 'lumiere', threshold: 3500, labelFR: 'Lumière',  labelEN: 'Light',  accent: '#D9A05B' },
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
// La grille des prix (Alex, 6 septembre 2026, « inspirée de League of
// Legends ») : cent niskas valent dix dollars. Un article coûte un peu moins
// en niskas que sa valeur en dollars (huit à neuf niskas par dollar), donc
// les utiliser reste un petit avantage sans jamais devenir la façon d'acheter
// tout à la boutique. Aucun prix n'est rond par rapport aux paquets (100,
// 180, 400, 750…) : il reste toujours un fond de bourse, qui sert aux skins.
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
    cost: 500,
    labelFR: '10% sur la boutique',
    labelEN: '10% off the shop',
    descFR: "Un rabais de 10% applicable sur votre prochaine commande en boutique.",
    descEN: 'A 10% discount on your next shop order.',
  },
  {
    id: 'reb-huiles',
    cost: 650,
    labelFR: "15% sur les Huiles Corporelles",
    labelEN: '15% off the Body Oils',
    descFR: "Rabais de 15% sur toute la collection des Huiles Corporelles.",
    descEN: '15% discount across the Body Oils collection.',
  },

  // Tree-gated, one-shot gifts — unlocked as the plant matures.
  {
    id: 'rituel-offert',
    cost: 275,
    labelFR: "Un livret de rituels offert",
    labelEN: 'A complimentary rituals booklet',
    descFR: "Le Guide Rituels Inspirata en version imprimée, envoyé chez vous. Se réclame une seule fois.",
    descEN: 'The Inspirata Rituals Guide in print, sent to you. One-time claim.',
    minTier: 'tige',
    oneShot: true,
  },
  {
    id: 'reb-formation',
    cost: 435,
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
    cost: 725,
    labelFR: 'La masterclass Santé Parfaite, offerte',
    labelEN: 'The Perfect Health masterclass, on us',
    descFR: "L'accès complet à la masterclass Santé Parfaite. Offert une seule fois, aux membres du palier Source.",
    descEN: 'Full access to the Perfect Health masterclass. Offered once, for Source-tier members.',
    minTier: 'source',
    oneShot: true,
  },
  {
    id: 'huile-source',
    cost: 395,
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
