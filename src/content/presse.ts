/**
 * La salle de presse : ce que le kit contient, et comment nommer chaque
 * fichier. Tout ce qui est listé ici sort de scripts/presse/build-kit.mjs,
 * et les deux fichiers se relisent ensemble : ajouter une carte demande
 * une entrée dans scripts/presse/cards.mjs, puis la même clé ici.
 *
 * Rien n'est inventé. Chaque légende vient d'une page du site, et les
 * chiffres se recopient de src/content.ts et des pages V2.
 */

export const PRESSE_BASE = '/presse';
export const PRESSE_ZIP = '/presse/kit-presse-krystine-st-laurent.zip';
/** Le poids du zip, à relire après chaque `node scripts/presse/build-kit.mjs`. */
export const PRESSE_ZIP_POIDS = '17 Mo';

export type Langue = 'FR' | 'EN';

export interface Carte {
  key: string;
  n: string;
  labelFR: string;
  labelEN: string;
  legendeFR: string;
  legendeEN: string;
  /** Vrai quand la photo seule, sans texte, existe en 1920 × 1080. */
  nu: boolean;
  /** L'adresse qu'ouvre le code QR de la carte. */
  cible: string;
}

export const CARTES: Carte[] = [
  {
    key: 'portrait', n: '01', nu: true, cible: 'krystinestlaurent.ca/krystine',
    labelFR: 'Krystine St-Laurent', labelEN: 'Krystine St-Laurent',
    legendeFR: 'Le portrait et la biographie tiennent dans une seule image.',
    legendeEN: 'The portrait and the biography, in one image.',
  },
  {
    key: 'conferenciere', n: '02', nu: true, cible: 'krystinestlaurent.ca/conferenciere',
    labelFR: 'La conférencière', labelEN: 'The speaker',
    legendeFR: 'Les trois conférences signature, avec leurs durées et leurs formats.',
    legendeEN: 'The three signature talks and their formats.',
  },
  {
    key: 'livres', n: '03', nu: true, cible: 'krystinestlaurent.ca/medias',
    labelFR: 'Trois livres', labelEN: 'Three books',
    legendeFR: 'Les deux best-sellers, et le titre attendu en février 2027.',
    legendeEN: 'The two best-sellers and the February 2027 title.',
  },
  {
    key: 'origine', n: '04', nu: false, cible: 'krystinestlaurent.ca/origine',
    labelFR: 'L’Expérience Origine', labelEN: 'The Origin Experience',
    legendeFR: 'Le parcours de douze semaines, et la cohorte qui s’ouvre en novembre.',
    legendeEN: 'The twelve-week programme and its next cohort.',
  },
  {
    key: 'podcast', n: '05', nu: true, cible: 'Spotify · Au-delà des tendances',
    labelFR: 'Au-delà des tendances', labelEN: 'Beyond Trends',
    legendeFR: 'Deux saisons en ligne sur Spotify.',
    legendeEN: 'The podcast, two seasons on Spotify.',
  },
  {
    key: 'medias', n: '06', nu: true, cible: 'krystinestlaurent.ca/medias',
    labelFR: 'Trois saisons à l’écran', labelEN: 'Three seasons on air',
    legendeFR: 'Santé la vie, les capsules qui l’ont précédée et les entrevues données depuis.',
    legendeEN: 'Santé la vie, the capsules and the interviews.',
  },
  {
    key: 'boutique', n: '07', nu: true, cible: 'krystinestlaurent.ca/boutique',
    labelFR: 'La boutique', labelEN: 'The shop',
    legendeFR: 'Les huiles corporelles, une par dosha.',
    legendeEN: 'The Vata, Pitta and Kapha body oils.',
  },
  {
    key: 'contact', n: '08', nu: true, cible: 'krystinestlaurent.ca/presse',
    labelFR: 'Demandes de presse', labelEN: 'Press enquiries',
    legendeFR: 'Où écrire, et ce que vous pouvez publier sans rien demander.',
    legendeEN: 'Where to write, and what you may publish.',
  },
];

export interface Feuillet {
  key: string;
  fichier: string;
  labelFR: string;
  labelEN: string;
  legendeFR: string;
  legendeEN: string;
}

/** Les planches photo, légendées en français et en anglais sur l'image. */
export const PLANCHES: Feuillet[] = [
  {
    key: 'krystine-kimono', fichier: 'photo-krystine-kimono.jpg',
    labelFR: 'Krystine en kimono', labelEN: 'Krystine in a kimono',
    legendeFR: 'Un livre ouvert sur les genoux, devant une porte verte.', legendeEN: 'An open book on her lap.',
  },
  {
    key: 'krystine-sourire', fichier: 'photo-krystine-sourire.jpg',
    labelFR: 'Portrait souriant', labelEN: 'Smiling portrait',
    legendeFR: 'Un format vertical, recadré pour la presse.', legendeEN: 'A vertical frame, cropped for the press.',
  },
  {
    key: 'krystine-table', fichier: 'photo-krystine-table.jpg',
    labelFR: 'À table, avec les livres', labelEN: 'At the table, with the books',
    legendeFR: 'Avec Nature & Ayurveda et Féminité & Ayurveda posés devant elle.', legendeEN: 'Nature & Ayurveda and Féminité & Ayurveda.',
  },
  {
    key: 'krystine-tapis', fichier: 'photo-krystine-tapis.jpg',
    labelFR: 'Le visuel d’ouverture', labelEN: 'The opening image',
    legendeFR: 'L’image qui ouvre le site d’Inspira Nature.', legendeEN: 'The image that opens Inspira Nature.',
  },
  {
    key: 'les-livres', fichier: 'photo-les-livres.jpg',
    labelFR: 'Les trois livres', labelEN: 'The three books',
    legendeFR: 'Les trois titres ensemble, dont celui de février 2027.', legendeEN: 'Including the title due in February 2027.',
  },
  {
    key: 'sante-la-vie', fichier: 'photo-sante-la-vie.jpg',
    labelFR: 'Sur le plateau', labelEN: 'On set',
    legendeFR: 'Sur le plateau, parmi les huiles et les crèmes.', legendeEN: 'Santé la vie, among the oils and the creams.',
  },
];

/** Les pages du site, telles qu'elles s'affichaient à la fabrication du kit. */
export const PAGES: Feuillet[] = [
  {
    key: 'site-accueil', fichier: 'site-accueil.jpg',
    labelFR: 'L’accueil', labelEN: 'The home page',
    legendeFR: 'krystinestlaurent.ca', legendeEN: 'krystinestlaurent.ca',
  },
  {
    key: 'site-krystine', fichier: 'site-krystine.jpg',
    labelFR: 'La biographie', labelEN: 'The biography',
    legendeFR: 'krystinestlaurent.ca/krystine', legendeEN: 'krystinestlaurent.ca/krystine',
  },
  {
    key: 'site-conferenciere', fichier: 'site-conferenciere.jpg',
    labelFR: 'Les conférences', labelEN: 'The talks',
    legendeFR: 'krystinestlaurent.ca/conferenciere', legendeEN: 'krystinestlaurent.ca/conferenciere',
  },
  {
    key: 'site-medias', fichier: 'site-medias.jpg',
    labelFR: 'Les médias', labelEN: 'The media page',
    legendeFR: 'krystinestlaurent.ca/medias', legendeEN: 'krystinestlaurent.ca/medias',
  },
  {
    key: 'site-formations', fichier: 'site-formations.jpg',
    labelFR: 'Les formations', labelEN: 'The courses',
    legendeFR: 'krystinestlaurent.ca/formations', legendeEN: 'krystinestlaurent.ca/formations',
  },
  {
    key: 'site-boutique', fichier: 'site-boutique.jpg',
    labelFR: 'La boutique', labelEN: 'The shop',
    legendeFR: 'krystinestlaurent.ca/boutique', legendeEN: 'krystinestlaurent.ca/boutique',
  },
];

/** Les mots-symboles. Le site n'a pas d'autre logo que sa signature typographique. */
export const LOGOS: Feuillet[] = [
  {
    key: 'encre-creme', fichier: 'logos/mot-symbole-encre-sur-creme.png',
    labelFR: 'Encre sur crème', labelEN: 'Ink on cream',
    legendeFR: 'Pour un fond clair.', legendeEN: 'For a light ground.',
  },
  {
    key: 'creme-encre', fichier: 'logos/mot-symbole-creme-sur-encre.png',
    labelFR: 'Crème sur brun', labelEN: 'Cream on brown',
    legendeFR: 'Pour un fond sombre.', legendeEN: 'For a dark ground.',
  },
  {
    key: 'encre-transparent', fichier: 'logos/mot-symbole-encre-transparent.png',
    labelFR: 'Encre, fond transparent', labelEN: 'Ink, transparent ground',
    legendeFR: 'À poser sur votre propre visuel.', legendeEN: 'To place on your own artwork.',
  },
  {
    key: 'creme-transparent', fichier: 'logos/mot-symbole-creme-transparent.png',
    labelFR: 'Crème, fond transparent', labelEN: 'Cream, transparent ground',
    legendeFR: 'À poser sur une photo sombre.', legendeEN: 'To place on a dark photograph.',
  },
];

export interface TexteKit { fichier: string; labelFR: string; labelEN: string; langue: Langue }

export const TEXTES: TexteKit[] = [
  { fichier: 'textes/bio-courte-fr.txt', langue: 'FR', labelFR: 'Biographie courte', labelEN: 'Short biography (FR)' },
  { fichier: 'textes/bio-longue-fr.txt', langue: 'FR', labelFR: 'Biographie longue', labelEN: 'Long biography (FR)' },
  { fichier: 'textes/faits-fr.txt', langue: 'FR', labelFR: 'La fiche des faits', labelEN: 'Fact sheet (FR)' },
  { fichier: 'textes/LISEZ-MOI.txt', langue: 'FR', labelFR: 'Lisez-moi', labelEN: 'Read me (FR)' },
  { fichier: 'textes/bio-courte-en.txt', langue: 'EN', labelFR: 'Biographie courte, en anglais', labelEN: 'Short biography' },
  { fichier: 'textes/bio-longue-en.txt', langue: 'EN', labelFR: 'Biographie longue, en anglais', labelEN: 'Long biography' },
  { fichier: 'textes/facts-en.txt', langue: 'EN', labelFR: 'La fiche des faits, en anglais', labelEN: 'Fact sheet' },
  { fichier: 'textes/READ-ME.txt', langue: 'EN', labelFR: 'Lisez-moi, en anglais', labelEN: 'Read me' },
  { fichier: 'textes/credits.txt', langue: 'FR', labelFR: 'Les crédits', labelEN: 'Credits' },
];

/** Les faits qui tiennent en un mot, repris de src/content.ts et des pages V2. */
export const FAITS: { valeur: string; fr: string; en: string }[] = [
  { valeur: '40', fr: 'ans de pratique', en: 'years of practice' },
  { valeur: '03', fr: 'livres publiés', en: 'published books' },
  { valeur: '03', fr: 'saisons de Santé la vie', en: 'seasons of Santé la vie' },
  { valeur: '02', fr: 'saisons de podcast', en: 'podcast seasons' },
  { valeur: '10', fr: 'ans aux soins critiques', en: 'years in critical care' },
];

/**
 * Le nom d'un fichier de carte. Les quatre variantes textuelles portent la
 * langue, les deux photos seules n'en ont pas besoin puisqu'elles ne
 * portent aucun mot.
 */
export function fichierCarte(c: Carte, lang: Langue, nu: boolean, qr: boolean): string {
  if (nu) return `${c.key}-nu${qr ? '-qr' : ''}.jpg`;
  return `${c.key}-${lang.toLowerCase()}-texte${qr ? '-qr' : ''}.png`;
}

export const pleineRes = (fichier: string) => `${PRESSE_BASE}/${fichier}`;

/** La vignette WebP de 640 px. Les mots-symboles n'en ont pas : ils sont déjà légers. */
export const vignette = (fichier: string) =>
  fichier.startsWith('logos/')
    ? `${PRESSE_BASE}/${fichier}`
    : `${PRESSE_BASE}/thumbs/${fichier.replace(/\.(png|jpg)$/, '')}.webp`;
