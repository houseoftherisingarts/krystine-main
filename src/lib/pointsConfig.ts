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
  | 'quotidien'       // legacy — le cadeau du jour d'avant le 7 septembre 2026, gardé pour l'historique
  | 'cadeau'          // le cadeau du jour : une ouverture par journée civile (serveur reclamerQuotidien)
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
  | 'badge-bleu'      // deux cents niskas à l'approbation du Badge Bleu (serveur deciderBadgeBleu)
  | 'foyer-hebdo'     // cadeau de la semaine complète du Foyer d'Origine (serveur reclamerQuotidien)
  | 'foyer-mois'      // cadeau du mois complet du Foyer d'Origine (serveur reclamerQuotidien)
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
  | 'sondage'         // dix niskas pour un sondage complété (serveur repondreSondage)
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

// ─── Le cadeau du jour ────────────────────────────────────────────────────────
// Plus de roue ni de hasard (Alex, 7 septembre 2026) : à la première visite de
// chaque journée civile (fuseau de Montréal), un cadeau tombe et le compteur
// jourCadeau avance de un, sans jamais reculer même si une journée est
// sautée. Cinq niskas les jours 1 à 6 d'un cycle de sept, une bannière
// exclusive au septième, puis quinze niskas au septième jour une fois les
// sept bannières distribuées. La mécanique vit dans
// functions/src/badgeBleuConfig.ts (calculerCadeauDuJour) et son miroir
// src/lib/badgeBleu.ts.
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
// Le même prix en argent (Stripe), jumeau serveur : PRIX_SAISON_CAD dans functions/src/niskas.ts.
export const PRIX_SAISON_CAD = 30;
export const SAISONS_SANTE_LA_VIE: Record<string, { module: string; n: number }> = { '1': { module: 'Module 1', n: 1 }, '2': { module: 'Module 2', n: 2 } };
// Les vidéos sont gratuites; ouvrir la section « Les vidéos de Krystine » coûte dix niskas, une fois.
export const COUT_ACCES_VIDEOS = 30;
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
  { id: 'p2800', niskas: 2800, prix: 160 },
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
export interface Banniere {
  cle: string; cout: number; nomFR: string; nomEN: string; descFR: string; descEN: string; image: string; fond: string | null;
  /** Vraie seulement pour les sept bannières du cadeau du jour : jamais en vente, jamais dans un coffre,
   *  posées par le serveur (functions/src/niskas.ts). Elles n'entrent dans BOUTIQUE que si `!exclusif`. */
  exclusif?: boolean;
  /** Variante 720 px, plus légère, pour la petite carte de révélation du cadeau du jour. */
  image720?: string;
}
export const BANNIERES: Banniere[] = [
  // La bannière d'origine est à tout le monde (cout 0) : elle entre à la
  // boutique pour son fond d'écran, son aperçu et sa version sans signature.
  { cle: 'defaut', cout: 0, nomFR: 'Bannière Féminité & Ayurveda', nomEN: 'Féminité & Ayurveda banner',
    descFR: 'La bannière d’origine de votre espace : le bureau, le carnet et Féminité & Ayurveda. Offerte à toutes.', descEN: 'Your space’s original banner: the desk, the journal and Féminité & Ayurveda. Yours from the start.',
    image: BANNIERE_DEFAUT, fond: '/compte/fonds/defaut-1920.webp' },
  { cle: 'nature', cout: 5, nomFR: 'Bannière Nature & Ayurveda', nomEN: 'Nature & Ayurveda banner',
    descFR: 'La même scène que votre bannière, avec Nature & Ayurveda posé sur la table.', descEN: 'The same scene as your banner, with Nature & Ayurveda on the table.',
    image: BANNIERE_NATURE, fond: '/compte/fonds/nature-1920.webp' },
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
  // Les sept bannières du cadeau du jour (Alex, 7 septembre 2026) : jamais à
  // la boutique, jamais dans un coffre. Le septième jour de chaque cycle de
  // sept (jourCadeau 7, 14, 21…49) en pose une, dans cet ordre exact —
  // calculerCadeauDuJour (functions/src/badgeBleuConfig.ts) en décide.
  { cle: 'aube', cout: 0, exclusif: true, nomFR: 'L’aube sur le lac', nomEN: 'Dawn on the lake',
    descFR: 'Le premier jour de lumière sur l’eau immobile, un canot au bord des roseaux.', descEN: 'The first light of day on still water, a canoe at the edge of the reeds.',
    image: '/compte/bannieres/cadeau-aube.webp', image720: '/compte/bannieres/cadeau-aube-720.webp', fond: '/compte/fonds/cadeau-aube.webp' },
  { cle: 'sousbois', cout: 0, exclusif: true, nomFR: 'Le sous-bois', nomEN: 'The undergrowth',
    descFR: 'Fougères, mousse et un bouleau couché, dans les rayons du matin.', descEN: 'Ferns, moss and a fallen birch, in the morning light.',
    image: '/compte/bannieres/cadeau-sousbois.webp', image720: '/compte/bannieres/cadeau-sousbois-720.webp', fond: '/compte/fonds/cadeau-sousbois.webp' },
  { cle: 'lavande', cout: 0, exclusif: true, nomFR: 'La lavande au crépuscule', nomEN: 'Lavender at dusk',
    descFR: 'Un champ de lavande et de sauge sur la colline, sous un ciel de lilas.', descEN: 'A field of lavender and sage on the hillside, under a lilac sky.',
    image: '/compte/bannieres/cadeau-lavande.webp', image720: '/compte/bannieres/cadeau-lavande-720.webp', fond: '/compte/fonds/cadeau-lavande.webp' },
  { cle: 'rivage', cout: 0, exclusif: true, nomFR: 'Le rivage du fleuve', nomEN: 'The river shore',
    descFR: 'Les galets du Saint-Laurent à marée basse, la brume et le bois flotté.', descEN: 'The pebbles of the St. Lawrence at low tide, the mist and the driftwood.',
    image: '/compte/bannieres/cadeau-rivage.webp', image720: '/compte/bannieres/cadeau-rivage-720.webp', fond: '/compte/fonds/cadeau-rivage.webp' },
  { cle: 'erables', cout: 0, exclusif: true, nomFR: 'Les érables d’octobre', nomEN: 'October maples',
    descFR: 'Un sentier couvert de feuilles rouges et or, la lumière entre les troncs.', descEN: 'A path covered in red and gold leaves, light between the trunks.',
    image: '/compte/bannieres/cadeau-erables.webp', image720: '/compte/bannieres/cadeau-erables-720.webp', fond: '/compte/fonds/cadeau-erables.webp' },
  { cle: 'verger', cout: 0, exclusif: true, nomFR: 'Le verger en fleurs', nomEN: 'The orchard in bloom',
    descFR: 'Les pommiers en pleine floraison et une vieille ruche de bois dans l’herbe.', descEN: 'Apple trees in full bloom and an old wooden hive in the grass.',
    image: '/compte/bannieres/cadeau-verger.webp', image720: '/compte/bannieres/cadeau-verger-720.webp', fond: '/compte/fonds/cadeau-verger.webp' },
  { cle: 'neige', cout: 0, exclusif: true, nomFR: 'La cabane sous la neige', nomEN: 'The cabin in the snow',
    descFR: 'Une cabane de bois au petit matin d’hiver, la fumée et une lanterne allumée.', descEN: 'A wooden cabin on a winter morning, smoke rising and a lantern lit.',
    image: '/compte/bannieres/cadeau-neige.webp', image720: '/compte/bannieres/cadeau-neige-720.webp', fond: '/compte/fonds/cadeau-neige.webp' },
];
export const banniereParCle = (cle: string) => BANNIERES.find(b => b.cle === cle);
export const FOND_DEFAUT = '/compte/fonds/defaut-1920.webp';

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
// « exclusif » : ni boutique ni coffre, le serveur le pose lui-même (le Skin
// Vérifié du Badge Bleu, `reserve: 'badge-bleu'`, docs/badge-bleu-plan.md).
// `enTravail` : le drapeau par défaut d'une skin qu'on retire de la
// circulation le temps de la finir (Alex, 7 septembre 2026 : Vata, Pitta,
// Kapha, Aurore, Or pur, Féminité). Une skin en travail ne se propose plus
// nulle part (boutique, coffres, roue), mais une membre qui l'a déjà la
// garde et peut l'activer. `settings/skins` dans Firestore (écrit depuis
// l'admin, section « Skins à travailler ») peut fusionner par-dessus ce
// drapeau, sans déploiement : voir `skinEnTravail` plus bas et son miroir
// serveur, `skinsEnTravail` dans functions/src/coffres.ts.
export type RareteSkin = 'commun' | 'rare' | 'legendaire' | 'exclusif';
export interface PaletteSkin { fond: string; panneau: string; encre: string; accent: string; accentClair: string; accentProfond: string; sombre: boolean }
export interface Skin {
  cle: string; nomFR: string; nomEN: string; descFR: string; descEN: string; icone: string;
  cout: number | null; rarete: RareteSkin; coffre?: 'bronze' | 'argent' | 'or'; reserve?: 'badge-bleu'; palette: PaletteSkin;
  enTravail?: boolean;
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
  // Le rose et le vert du livre : le sarcelle profond de la couverture, et le
  // rose de la couronne de fleurs qui court autour du titre. L'« accentProfond »
  // est le rose CLAIR, parce que sur un skin sombre c'est lui qui porte les
  // libellés : le rose foncé (#b8657f) tombait à 2,4 pour 1 sur le panneau. Il
  // reste dans la maison, en ombre des pétales et en liseré de carte.
  { cle: 'feminite', cout: null, rarete: 'rare', coffre: 'argent', icone: 'fa-leaf', enTravail: true, nomFR: 'Skin Féminité & Ayurveda', nomEN: 'Féminité & Ayurveda skin',
    descFR: 'Le vert sarcelle profond de la couverture enveloppe tout l’espace, et le rose de la couronne de fleurs éclaire chaque bouton. Des pétales roses et des feuilles blanches dérivent derrière votre espace. Rare : dans le coffre d’argent seulement.',
    descEN: 'The deep teal green of the book’s cover wraps around the whole space, and the pink of its flower crown lights up every button. Pink petals and white leaves drift behind your space. Rare: in the silver chest only.',
    palette: { fond: '#1d3a35', panneau: '#274a44', encre: '#f3f1e8', accent: '#d98aa3', accentClair: '#efb7c6', accentProfond: '#efb7c6', sombre: true } },
  // Sarcelle et orange brûlé : l'étalonnage que le cinéma pose sur presque
  // toutes ses affiches depuis vingt ans, la peau chaude détachée d'un fond
  // froid. Halos de bokeh et grain de pellicule, rien de plus.
  { cle: 'teal-orange', cout: null, rarete: 'rare', coffre: 'argent', icone: 'fa-film', nomFR: 'Skin Sarcelle & Orange', nomEN: 'Teal & Orange skin',
    descFR: 'L’étalonnage du cinéma : un fond sarcelle profond, des halos chauds qui traversent le champ et le grain d’une pellicule. Rare : dans le coffre d’argent seulement.',
    descEN: 'The cinema colour grade: a deep teal ground, warm halos drifting across the frame, and the grain of real film. Rare: in the silver chest only.',
    palette: { fond: '#08252b', panneau: '#0e3740', encre: '#f6ece2', accent: '#e2753a', accentClair: '#f3a56b', accentProfond: '#f0995c', sombre: true } },
  { cle: 'nature', cout: null, rarete: 'rare', coffre: 'argent', icone: 'fa-seedling', nomFR: 'Skin Nature & Ayurveda', nomEN: 'Nature & Ayurveda skin',
    descFR: 'Le blanc cassé de la couverture s’ouvre sur une aquarelle olive et l’esperluette dorée du titre. Rare : dans le coffre d’argent seulement.',
    descEN: 'The off-white cover opens onto an olive watercolor and the gilded ampersand of the title. Rare: in the silver chest only.',
    palette: { fond: '#efeae0', panneau: '#fbf9f4', encre: '#2f3a2c', accent: '#6e7f4f', accentClair: '#9aa97a', accentProfond: '#4d5c37', sombre: false } },
  { cle: 'aurore', cout: null, rarete: 'rare', coffre: 'or', icone: 'fa-wind', enTravail: true, nomFR: 'Skin Aurore', nomEN: 'Aurora skin',
    descFR: 'La nuit polaire et ses voiles verts qui dansent en fond d’espace. Rare : dans le coffre d’or seulement.',
    descEN: 'The polar night and its green veils dancing behind your space. Rare: in the gold chest only.',
    palette: { fond: '#071019', panneau: '#0f1c28', encre: '#e6f3f0', accent: '#58d3b0', accentClair: '#a5f0da', accentProfond: '#a5f0da', sombre: true } },
  { cle: 'or-pur', cout: null, rarete: 'rare', coffre: 'or', icone: 'fa-crown', enTravail: true, nomFR: 'Skin Or pur', nomEN: 'Pure Gold skin',
    descFR: 'Du noir profond et de l’or qui miroite sur chaque bouton, avec une pluie de paillettes d’or. Rare : dans le coffre d’or seulement.',
    descEN: 'Deep black and gold that shimmers on every button, with a drift of gold flecks. Rare: in the gold chest only.',
    palette: { fond: '#0b0a08', panneau: '#171410', encre: '#fbf3df', accent: '#e0b94f', accentClair: '#fff0b8', accentProfond: '#f0cf6a', sombre: true } },
  // L'heure dorée : vert et or, jamais brun. La lumière de fin de journée est
  // mesurée entre 2 000 et 3 000 K, elle arrive de côté et traverse le feuillage
  // à contre-jour; le feuillage vire alors au vert olive à sous-ton doré et les
  // hautes lumières partent dans l'ambre. D'où le fond vert profond, l'or
  // ambré des rais et la crème chaude de l'encre.
  // Sources : naturettl.com/editing-guide-golden-hour-photography (température
  // et virage des jaunes-verts), colordrop.io/palette/95262 (#ffeb85 #f3c94c
  // #e8a024 #c97b1f), colorseasonai.com/color-palette/olive-green (l'olive est
  // un vert à sous-ton doré).
  { cle: 'golden-hour', cout: null, rarete: 'rare', coffre: 'or', icone: 'fa-sun', nomFR: 'Skin Heure dorée', nomEN: 'Golden Hour skin',
    descFR: 'La dernière heure avant le coucher du soleil : la lumière entre de biais, traverse le feuillage vert et pose de l’or sur tout. La poussière reste en suspension dans les rais. Rare : dans le coffre d’or seulement.',
    descEN: 'The last hour before sunset: light comes in sideways, crosses the green leaves and lays gold over everything. Dust hangs in the shafts. Rare: in the gold chest only.',
    palette: { fond: '#16210f', panneau: '#22301a', encre: '#f7f0dd', accent: '#e0a83c', accentClair: '#ffda9e', accentProfond: '#f3c94c', sombre: true } },
  // Les trois légendaires : un dosha chacun, et une vraie scène animée derrière
  // l'espace (feu, eau, vent), des survols et des gestes de souris qui leur sont
  // propres. Ils ne se trouvent que dans les coffres.
  { cle: 'vata', cout: null, rarete: 'legendaire', coffre: 'bronze', icone: 'fa-wind', enTravail: true, nomFR: 'Skin Vata · le vent', nomEN: 'Vata skin · the wind',
    descFR: 'Un sous-bois vert traversé de vent : des feuilles passent derrière votre espace et s’écartent sous votre souris. Légendaire.',
    descEN: 'A green undergrowth crossed by wind: leaves drift behind your space and scatter under your mouse. Legendary.',
    palette: { fond: '#0e1f17', panneau: '#173024', encre: '#eaf3e6', accent: '#8fd17a', accentClair: '#c6f0b0', accentProfond: '#b6ea9c', sombre: true } },
  { cle: 'pitta', cout: null, rarete: 'legendaire', coffre: 'bronze', icone: 'fa-fire', enTravail: true, nomFR: 'Skin Pitta · le feu', nomEN: 'Pitta skin · the fire',
    descFR: 'La nuit près du feu : des braises montent derrière votre espace et s’avivent quand vous survolez un bouton. Légendaire.',
    descEN: 'Night by the fire: embers rise behind your space and flare when you hover a button. Legendary.',
    palette: { fond: '#1a0b06', panneau: '#2b140c', encre: '#fbe9dc', accent: '#ff7a2f', accentClair: '#ffb36b', accentProfond: '#ffa45c', sombre: true } },
  { cle: 'kapha', cout: null, rarete: 'legendaire', coffre: 'bronze', icone: 'fa-water', enTravail: true, nomFR: 'Skin Kapha · l’eau', nomEN: 'Kapha skin · the water',
    descFR: 'Le fond d’un aquarium : la lumière ondule sur les murs, des bulles montent, et l’eau frémit sous vos gestes. Légendaire.',
    descEN: 'The bottom of an aquarium: light ripples on the walls, bubbles rise, and the water quivers under your gestures. Legendary.',
    palette: { fond: '#061a2b', panneau: '#0c2740', encre: '#e4f4fb', accent: '#3fb7d9', accentClair: '#9fe4f5', accentProfond: '#8ddcf0', sombre: true } },
  // Le Skin Vérifié : réservé au Badge Bleu. Ni en boutique, ni dans un coffre :
  // deciderBadgeBleu le pose à l'approbation. Bleu profond et blanc cassé, une
  // coche en motif discret (skins.css). L'accentProfond est très pâle parce que
  // c'est lui qui porte les libellés sur le panneau bleu : #e4f1ff sur #2f6fb0
  // donne 4,6 pour 1, l'accent #7fb4ff n'y donnerait que 2,5.
  { cle: 'verifie', cout: null, rarete: 'exclusif', reserve: 'badge-bleu', icone: 'fa-circle-check', nomFR: 'Skin Vérifié', nomEN: 'Verified skin',
    descFR: 'Le bleu profond du Badge Bleu sur tout l’espace, du blanc cassé pour les mots et une coche discrète qui court en motif. Réservé aux membres qui portent le Badge Bleu.',
    descEN: 'The deep blue of the Blue Badge over the whole space, off-white for the words and a discreet check running as a pattern. Reserved for members who carry the Blue Badge.',
    palette: { fond: '#1e4a7a', panneau: '#2f6fb0', encre: '#f2f6fb', accent: '#7fb4ff', accentClair: '#b5d4ff', accentProfond: '#e4f1ff', sombre: true } },
];
export const skinParCle = (cle: string) => SKINS.find(s => s.cle === cle);
export const SKINS_LEGENDAIRES = SKINS.filter(s => s.rarete === 'legendaire');
export const SKINS_RARES = SKINS.filter(s => s.cout === null && s.rarete !== 'exclusif');

// ─── Skins en travail (Firestore `settings/skins`) ───────────────────────────
// Le document, écrit par l'admin (section « Skins à travailler »), fusionné
// par-dessus le drapeau par défaut de chaque skin (`Skin.enTravail` ci-dessus).
// Clé : l'article (`skin-${cle}`), comme partout ailleurs dans la boutique.
export type SkinsSettings = Record<string, { enTravail?: boolean }>;

/** Une skin est en travail si Firestore le dit, sinon si son drapeau par défaut le dit. */
export function skinEnTravail(id: string, overrides: SkinsSettings = {}): boolean {
  const override = overrides[id]?.enTravail;
  if (override !== undefined) return override;
  return skinParCle(id.startsWith('skin-') ? id.slice(5) : id)?.enTravail ?? false;
}

export interface ArticleBoutique {
  id: string;
  categorie: CategorieBoutique;
  cout: number;
  nomFR: string; nomEN: string;
  descFR: string; descEN: string;
  icone: string;
}

export const BOUTIQUE: ArticleBoutique[] = [
  // Les bannières exclusives du cadeau du jour ne sont jamais en vente : le
  // choix de bannière (ClientPortal.tsx) les montre seulement une fois possédées.
  ...BANNIERES.filter(b => !b.exclusif).map((b): ArticleBoutique => ({ id: `banniere-${b.cle}`, categorie: 'banniere', cout: b.cout, icone: 'fa-image', nomFR: b.nomFR, nomEN: b.nomEN, descFR: b.descFR, descEN: b.descEN })),
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
  { pts: '5', fr: 'Revenir chaque jour', en: 'Come back every day', noteFR: 'le cadeau du jour, une bannière exclusive au 7e jour', noteEN: "today's gift, an exclusive banner every 7th day" },
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
  // Dix stades, de la graine au grand jardin avec sa source (Alex, 6 septembre
  // 2026). Chaque stade a sa figurine (/compte/plante/{id}.webp).
  { id: 'graine',     threshold:     0, labelFR: 'Graine',       labelEN: 'Seed',        accent: '#8F9779' },
  { id: 'pousse',     threshold:    50, labelFR: 'Pousse',       labelEN: 'Sprout',      accent: '#6E8E4B' },
  { id: 'tige',       threshold:   150, labelFR: 'Tige',         labelEN: 'Stem',        accent: '#5E7A3E' },
  { id: 'fleur',      threshold:   350, labelFR: 'Fleur',        labelEN: 'Bloom',       accent: '#D9A05B' },
  { id: 'arbrisseau', threshold:   700, labelFR: 'Arbrisseau',   labelEN: 'Sapling',     accent: '#7FA36A' },
  { id: 'arbre',      threshold:  1500, labelFR: 'Arbre',        labelEN: 'Tree',        accent: '#4A7C9D' },
  { id: 'lotus',      threshold:  3500, labelFR: 'Arbre aux lotus', labelEN: 'Lotus tree', accent: '#C97B9B' },
  { id: 'bosquet',    threshold:  7500, labelFR: 'Bosquet',      labelEN: 'Grove',       accent: '#B8532F' },
  { id: 'foret',      threshold: 18000, labelFR: 'Forêt',        labelEN: 'Forest',      accent: '#BC4A3C' },
  { id: 'jardin',     threshold: 50000, labelFR: 'Grand jardin', labelEN: 'Grand garden', accent: '#BA7B39' },
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

// La grille (Alex, 7 septembre 2026, doc « gamify-cadeaux-niskas-priorites ») :
// 80 % des récompenses à coût marginal quasi nul (numérique, livré tout
// seul), 15 % liées à une transaction ou une autre porte de l'écosystème,
// 5 % de physique rare et contrôlé. Rien qui parte seul à la poste : un
// rabais ou un crédit qui mène à un envoi passe seulement en ajout à une
// commande, jamais en cadeau autonome. Les récompenses marquées `actif:
// false` n'ont pas encore leur fichier (audio, PDF) : elles attendent que
// Krystine dépose le contenu et les rallume dans l'admin (Récompenses).
export const REWARDS: Reward[] = [
  // ── Priorité 1 : numérique, coût marginal nul ────────────────────────────
  {
    id: 'surprise-numerique',
    cost: 150,
    labelFR: 'Une découverte surprise (bientôt)',
    labelEN: 'A surprise discovery (soon)',
    descFR: "Un audio exclusif, une courte pratique guidée ou une petite ressource numérique, tirée au hasard. En préparation : s'allume dès que Krystine dépose le premier lot.",
    descEN: 'An exclusive audio, a short guided practice, or a small digital resource, drawn at random. In progress: turns on once Krystine uploads the first batch.',
    actif: false,
  },
  {
    id: 'carnet-ksl',
    cost: 275,
    labelFR: 'Un carnet numérique KSL (bientôt)',
    labelEN: 'A KSL digital notebook (soon)',
    descFR: "Un carnet PDF téléchargeable, rituel ou recettes selon la saison. Remplace l'ancien livret imprimé envoyé par la poste. En préparation.",
    descEN: 'A downloadable PDF notebook, seasonal rituals or recipes. Replaces the old printed booklet mailed to your door. In progress.',
    actif: false,
  },
  {
    id: 'masterclass-archives',
    cost: 400,
    labelFR: 'Une masterclass des archives (bientôt)',
    labelEN: 'An archive masterclass (soon)',
    descFR: "Gestion du stress : aromathérapie et Ayurveda, ou une autre masterclass des archives. En préparation : n'est pas encore importée au catalogue des formations (voir le rapport de l'agent).",
    descEN: "Stress management: aromatherapy and Ayurveda, or another archive masterclass. In progress: not yet imported into the formations catalog (see the agent's report).",
    actif: false,
  },

  // ── Priorité 2 : liée à une transaction ou une autre porte ──────────────
  {
    id: 'reb-10-boutique',
    cost: 500,
    labelFR: '10 % sur la boutique, dès 75 $ d’achat',
    labelEN: '10% off the shop, from $75 spent',
    descFR: "Un rabais de 10 % applicable sur votre prochaine commande en boutique, à partir de 75 $ d'achat.",
    descEN: 'A 10% discount on your next shop order, from $75 spent.',
  },
  {
    id: 'reb-formation',
    cost: 435,
    labelFR: '50 $ sur une formation Krystine St-Laurent',
    labelEN: '$50 off a Krystine St-Laurent program',
    descFR: "Un crédit de 50 $ applicable à l'Expérience Origine ou au Programme Vata. Une seule fois.",
    descEN: 'A $50 credit for the Origin Experience or the Vata Program. One-time.',
    minTier: 'fleur',
    oneShot: true,
  },
  // Le palier Arbre : Krystine ne donne pas de consultation privée (Alex,
  // 6 septembre 2026), donc une formation numérique complète.
  {
    id: 'masterclass-source',
    cost: 725,
    labelFR: 'La masterclass Santé Parfaite, offerte',
    labelEN: 'The Perfect Health masterclass, on us',
    descFR: "L'accès complet à la masterclass Santé Parfaite. Offert une seule fois, aux membres du palier Arbre.",
    descEN: 'Full access to the Perfect Health masterclass. Offered once, for Tree-tier members.',
    minTier: 'arbre',
    oneShot: true,
  },

  // ── Priorité 4 : hauts paliers ────────────────────────────────────────────
  {
    id: 'privilege-ksl',
    cost: 850,
    labelFR: 'Un privilège KSL (bientôt)',
    labelEN: 'A KSL privilege (soon)',
    descFR: "Accès anticipé au Foyer d'Origine ou à l'Expérience Origine, ou une collection premium. En préparation.",
    descEN: 'Early access to the Origin Hearth or the Origin Experience, or a premium collection. In progress.',
    minTier: 'arbrisseau',
    actif: false,
  },
  {
    id: 'grande-recompense',
    cost: 1750,
    labelFR: 'Un grand cadeau numérique (bientôt)',
    labelEN: 'A big digital gift (soon)',
    descFR: "Une formation complète, la bibliothèque des archives ou un bundle de masterclasses. En préparation.",
    descEN: 'A full program, the archive library, or a masterclass bundle. In progress.',
    minTier: 'arbre',
    actif: false,
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
