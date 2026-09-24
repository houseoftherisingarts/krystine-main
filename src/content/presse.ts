/**
 * La salle de presse, contenu unique : ce module remplace l'ancien trio
 * cards.mjs/photos.mjs/shots.mjs (des sources d'un script de fabrication
 * hors-ligne) par un seul kit, lu depuis Firestore et rendu en direct par
 * VisuelPresse.tsx. Krystine change une photo ou un paragraphe dans
 * Admin › Kit de presse, elle publie, et la page /presse comme l'image
 * téléchargée reflètent le changement aussitôt : plus de script à relancer.
 *
 * `KIT_DEFAUT` porte le contenu d'origine (celui que build-kit.mjs cuisait
 * en dur), pour que la page ne parte jamais vide tant que personne n'a
 * encore publié depuis l'admin, et pour que chaque champ de l'éditeur ait
 * une valeur de départ vraie plutôt qu'un texte à remplir.
 */

import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';

export const CHEMIN_PRESSE = 'settings/presse';
export const CHEMIN_BROUILLON_PRESSE = 'brouillons/presse';

/** Un cadrage : le fichier source et le point d'intérêt (fractions 0-1). */
export interface Cadrage {
  fichier: string;
  focus: number;
  focusX: number;
}

export interface CartePresse {
  key: string;
  n: string;
  /** Le côté que la photo garde pour elle ; le voile de texte prend l'autre. */
  cote: 'gauche' | 'droite';
  photo: Cadrage;
  /** La photo seule, quand le sujet vaut d'être offert sans texte. */
  nu: Cadrage | null;
  /** L'adresse que le code QR encode réellement (identique en FR et EN à la source). */
  qrCible: string;
  /** Le texte affiché dans « Le code mène à », sur la page. */
  cibleAffiche: string;
  kickerFR: string; titreFR: string; corpsFR: string; metaFR: string;
  kickerEN: string; titreEN: string; corpsEN: string; metaEN: string;
  /** La légende courte, sous la tuile de la grille (distincte du corps peint sur le visuel). */
  legendeFR: string; legendeEN: string;
}

/** Une planche photo ou une page du site : même gabarit de rendu (VisuelPlanche). */
export interface PlanchePresse {
  key: string;
  n: string;
  photo: Cadrage;
  /** L'adresse qu'ouvre le code QR. */
  chemin: string;
  /** La légende peinte sur le visuel, en bas. */
  texteFR: string; texteEN: string;
  /** Le titre et la légende courte de la tuile, dans la grille de la page. */
  labelFR: string; labelEN: string;
  legendeFR: string; legendeEN: string;
  /** Pour une page du site seulement : le domaine affiché en pied de visuel. */
  adresse?: string;
}

export interface TextePresse {
  key: string;
  labelFR: string; labelEN: string;
  texteFR: string;
  /** `credits.txt` n'a jamais eu d'équivalent anglais : rien à inventer ici. */
  texteEN?: string;
}

export interface FaitPresse { valeur: string; fr: string; en: string }

/** Un mot-symbole : un actif de marque fixe, pas un contenu que Krystine édite. */
export interface Logo {
  key: string; fichier: string;
  labelFR: string; labelEN: string;
  legendeFR: string; legendeEN: string;
}

export interface KitPresse {
  cartes: CartePresse[];
  planches: PlanchePresse[];
  pages: PlanchePresse[];
  textes: TextePresse[];
  faits: FaitPresse[];
}

/** L'adresse d'une photo : telle quelle si Krystine l'a déposée dans Storage, sinon depuis /public. */
export const urlPhoto = (fichier: string): string =>
  fichier.startsWith('http') ? fichier : `/${fichier.replace(/^\//, '')}`;

export const urlQrCarte = (key: string): string => `/presse/qr/${key}.png`;
export const urlQrPlanche = (): string => `/presse/qr/presse.png`;
export const urlQrPage = (key: string): string => `/presse/qr/page-${key}.png`;

/** Les mots-symboles : fixes, fabriqués par scripts/presse/build-kit.mjs. */
export const LOGOS: Logo[] = [
  {
    key: 'encre-creme', fichier: 'presse/logos/mot-symbole-encre-sur-creme.png',
    labelFR: 'Encre sur crème', labelEN: 'Ink on cream',
    legendeFR: 'Pour un fond clair.', legendeEN: 'For a light ground.',
  },
  {
    key: 'creme-encre', fichier: 'presse/logos/mot-symbole-creme-sur-encre.png',
    labelFR: 'Crème sur brun', labelEN: 'Cream on brown',
    legendeFR: 'Pour un fond sombre.', legendeEN: 'For a dark ground.',
  },
  {
    key: 'encre-transparent', fichier: 'presse/logos/mot-symbole-encre-transparent.png',
    labelFR: 'Encre, fond transparent', labelEN: 'Ink, transparent ground',
    legendeFR: 'À poser sur votre propre visuel.', legendeEN: 'To place on your own artwork.',
  },
  {
    key: 'creme-transparent', fichier: 'presse/logos/mot-symbole-creme-transparent.png',
    labelFR: 'Crème, fond transparent', labelEN: 'Cream, transparent ground',
    legendeFR: 'À poser sur une photo sombre.', legendeEN: 'To place on a dark photograph.',
  },
];

const CARTES_DEFAUT: CartePresse[] = [
  {
    key: 'portrait', n: '01', cote: 'gauche',
    photo: { fichier: 'accueil/assets/hero-ml-poster.jpg', focus: 0.32, focusX: 0.53 },
    nu: { fichier: 'accueil/assets/hero-ml-poster.jpg', focus: 0.32, focusX: 0.53 },
    qrCible: '/krystine', cibleAffiche: 'krystinestlaurent.ca/krystine',
    kickerFR: 'Biographie', titreFR: 'Krystine St-Laurent',
    corpsFR: "Auteure et conférencière, praticienne en ayurveda depuis près de quarante ans. Avant cela, dix années aux soins critiques comme infirmière d'urgence, jusqu'au jour où elle a choisi les plantes et l'ayurveda, puis l'aromathérapie.",
    metaFR: 'krystinestlaurent.ca/krystine',
    kickerEN: 'Biography', titreEN: 'Krystine St-Laurent',
    corpsEN: 'Author, speaker and Ayurveda practitioner. Nearly forty years in holistic health, ten of them in critical care as an emergency nurse, before she turned to plants, Ayurveda and aromatherapy.',
    metaEN: 'krystinestlaurent.ca/krystine',
    legendeFR: 'Le portrait et la biographie tiennent dans une seule image.',
    legendeEN: 'The portrait and the biography, in one image.',
  },
  {
    key: 'conferenciere', n: '02', cote: 'droite',
    photo: { fichier: 'krystine-banner.png', focus: 0.35, focusX: 0.84 },
    nu: { fichier: 'krystine-banner.png', focus: 0.5, focusX: 0.62 },
    qrCible: '/conferenciere', cibleAffiche: 'krystinestlaurent.ca/conferenciere',
    kickerFR: 'Sur scène', titreFR: 'La conférencière',
    corpsFR: "Trois conférences signature portent le propos : Au-delà des tendances, L'Ayurveda comme boussole intérieure et La femme et ses saisons. Les formats vont de soixante minutes à une demi-journée, en salle, en virtuel ou en hybride, et les scènes se trouvent au Canada, aux États-Unis et en Europe.",
    metaFR: 'krystinestlaurent.ca/conferenciere',
    kickerEN: 'On stage', titreEN: 'The speaker',
    corpsEN: 'Three signature talks carry the work: Beyond Trends, Ayurveda as an Inner Compass, and A Woman and Her Seasons. Formats run from sixty minutes to a half day, in the room, online or hybrid, on stages across Canada, the United States and Europe.',
    metaEN: 'krystinestlaurent.ca/conferenciere',
    legendeFR: 'Les trois conférences signature, avec leurs durées et leurs formats.',
    legendeEN: 'The three signature talks and their formats.',
  },
  {
    key: 'livres', n: '03', cote: 'gauche',
    photo: { fichier: 'accueil/assets/trilogy-books.png', focus: 0.55, focusX: 0.55 },
    nu: { fichier: 'accueil/assets/trilogy-books.png', focus: 0.55, focusX: 0.55 },
    qrCible: '/medias', cibleAffiche: 'krystinestlaurent.ca/medias',
    kickerFR: 'Édition', titreFR: 'Trois livres',
    corpsFR: "Nature & Ayurveda et Féminité & Ayurveda ont tous deux été consacrés best-sellers en francophonie, aux Éditions de l'Homme. Le troisième titre, encore gardé secret, paraît en février 2027 chez le même éditeur.",
    metaFR: 'krystinestlaurent.ca/medias',
    kickerEN: 'Publishing', titreEN: 'Three books',
    corpsEN: 'Nature & Ayurveda and Féminité & Ayurveda both became best-sellers across the French-speaking world, published by Éditions de l’Homme. The third title, still under wraps, comes out in February 2027 with the same house.',
    metaEN: 'krystinestlaurent.ca/medias',
    legendeFR: 'Les deux best-sellers, et le titre attendu en février 2027.',
    legendeEN: 'The two best-sellers and the February 2027 title.',
  },
  {
    key: 'origine', n: '04', cote: 'droite',
    photo: { fichier: 'accueil/assets/portes/origine.png', focus: 0.28, focusX: 0.5 },
    nu: null,
    qrCible: '/origine', cibleAffiche: 'krystinestlaurent.ca/origine',
    kickerFR: 'Parcours signature', titreFR: 'L’Expérience Origine',
    corpsFR: "Douze semaines d'ayurveda, bâties pour retrouver une boussole intérieure plutôt qu'une discipline de plus. Les inscriptions ouvrent en automne, et la liste d'attente en reçoit les détails avant toute annonce publique.",
    metaFR: 'krystinestlaurent.ca/origine',
    kickerEN: 'Signature programme', titreEN: 'The Origin Experience',
    corpsEN: 'Twelve weeks inside Ayurveda, built to restore an inner compass rather than add one more discipline. Registration opens this fall, and the waiting list gets the details before any public announcement.',
    metaEN: 'krystinestlaurent.ca/origine',
    legendeFR: 'Le parcours de douze semaines, et ses inscriptions d’automne.',
    legendeEN: 'The twelve-week programme and its next cohort.',
  },
  {
    key: 'podcast', n: '05', cote: 'gauche',
    photo: { fichier: 'podcast/krystine.jpg', focus: 0.42, focusX: 0.5 },
    nu: { fichier: 'podcast/saison2-cover.webp', focus: 0.5, focusX: 0.5 },
    qrCible: 'https://open.spotify.com/show/0cHEVMLF92tJxiO7MwyOKD', cibleAffiche: 'Spotify · Au-delà des tendances',
    kickerFR: 'Podcast', titreFR: 'Au-delà des tendances',
    corpsFR: "Deux saisons en ligne sur Spotify, faites de conversations longues sur le corps, les plantes et l'art de vivre conscient. Le podcast écoute ce que le corps sait déjà, loin du bruit ambiant.",
    metaFR: 'Spotify · Au-delà des tendances',
    kickerEN: 'Podcast', titreEN: 'Beyond Trends',
    corpsEN: 'Two seasons on Spotify, built from long conversations about the body, plants and conscious living. The show listens to what the body already knows, far from the ambient noise.',
    metaEN: 'Spotify · Beyond Trends',
    legendeFR: 'Deux saisons en ligne sur Spotify.',
    legendeEN: 'The podcast, two seasons on Spotify.',
  },
  {
    key: 'medias', n: '06', cote: 'droite',
    photo: { fichier: 'sante-la-vie.jpg', focus: 0.3, focusX: 0.5 },
    nu: { fichier: 'sante-la-vie.jpg', focus: 0.3, focusX: 0.5 },
    qrCible: '/medias', cibleAffiche: 'krystinestlaurent.ca/medias',
    kickerFR: 'Télévision et entrevues', titreFR: 'Trois saisons à l’écran',
    corpsFR: "Santé la vie a tenu trois saisons, et toutes les capsules qui les ont précédées restent en ligne. Les passages à Salut Bonjour et les entrevues données depuis se rassemblent sur la page Médias du site.",
    metaFR: 'krystinestlaurent.ca/medias',
    kickerEN: 'Television and interviews', titreEN: 'Three seasons on air',
    corpsEN: 'Santé la vie ran for three seasons, and every capsule that came before it is still online. The Salut Bonjour appearances and the interviews given since are gathered on the Media page of the site.',
    metaEN: 'krystinestlaurent.ca/medias',
    legendeFR: 'Santé la vie, les capsules qui l’ont précédée et les entrevues données depuis.',
    legendeEN: 'Santé la vie, the capsules and the interviews.',
  },
  {
    key: 'boutique', n: '07', cote: 'gauche',
    photo: { fichier: 'presse/captures/boutique.png', focus: 0.5, focusX: 0.5 },
    nu: { fichier: 'presse/captures/boutique.png', focus: 0.5, focusX: 0.5 },
    qrCible: '/boutique', cibleAffiche: 'krystinestlaurent.ca/boutique',
    kickerFR: 'Inspira Nature', titreFR: 'La boutique',
    corpsFR: "Des huiles corporelles infusées de plantes entières, formulées pour chacun des trois doshas : Vata, Pitta et Kapha. La boutique Inspirata Ayurveda se tient en ligne, et le site donne aussi la liste de ses points de vente.",
    metaFR: 'krystinestlaurent.ca/boutique',
    kickerEN: 'Inspira Nature', titreEN: 'The shop',
    corpsEN: 'Body oils infused with whole plants, formulated for each of the three doshas: Vata, Pitta and Kapha. The Inspirata Ayurveda shop lives online, and the site also lists every retailer that carries it.',
    metaEN: 'krystinestlaurent.ca/boutique',
    legendeFR: 'Les huiles corporelles, une par dosha.',
    legendeEN: 'The Vata, Pitta and Kapha body oils.',
  },
  {
    key: 'contact', n: '08', cote: 'droite',
    photo: { fichier: 'footer-jacques-cartier.jpg', focus: 0.55, focusX: 0.55 },
    nu: { fichier: 'footer-jacques-cartier.jpg', focus: 0.55, focusX: 0.55 },
    qrCible: '/presse', cibleAffiche: 'krystinestlaurent.ca/presse',
    kickerFR: 'Nous joindre', titreFR: 'Demandes de presse',
    corpsFR: "Les demandes d'entrevue et de conférence passent par l'équipe, à equipe@inspiratanature.com, comme les propositions de partenariat. Les visuels de cette page se téléchargent librement, à la seule condition de créditer Krystine St-Laurent.",
    metaFR: 'equipe@inspiratanature.com',
    kickerEN: 'Get in touch', titreEN: 'Press enquiries',
    corpsEN: 'Speaking, interview and partnership requests go through the team, at equipe@inspiratanature.com. Everything on this page is free to download, on the single condition that Krystine St-Laurent is credited.',
    metaEN: 'equipe@inspiratanature.com',
    legendeFR: 'Où écrire, et ce que vous pouvez publier sans rien demander.',
    legendeEN: 'Where to write, and what you may publish.',
  },
];

const PLANCHES_DEFAUT: PlanchePresse[] = [
  {
    key: 'krystine-kimono', n: '01', chemin: '/presse',
    photo: { fichier: 'krystine-portrait.jpg', focus: 0.44, focusX: 0.55 },
    texteFR: 'Krystine St-Laurent en kimono bleu, cadrée en buste.',
    texteEN: 'Krystine St-Laurent in a blue kimono, framed head and shoulders.',
    labelFR: 'Krystine en kimono', labelEN: 'Krystine in a kimono',
    legendeFR: 'En kimono bleu, cadrée en buste.', legendeEN: 'In a blue kimono, head and shoulders.',
  },
  {
    key: 'krystine-sourire', n: '02', chemin: '/presse',
    photo: { fichier: 'podcast/krystine.jpg', focus: 0.42, focusX: 0.62 },
    texteFR: 'Un portrait recadré depuis un format vertical, devant la porte verte.',
    texteEN: 'A portrait cropped from a vertical frame, against the green door.',
    labelFR: 'Portrait souriant', labelEN: 'Smiling portrait',
    legendeFR: 'Un format vertical, recadré pour la presse.', legendeEN: 'A vertical frame, cropped for the press.',
  },
  {
    key: 'krystine-table', n: '03', chemin: '/presse',
    photo: { fichier: 'accueil/assets/hero-ml-poster.jpg', focus: 0.32, focusX: 0.53 },
    texteFR: 'À table, ses deux premiers livres posés devant elle.',
    texteEN: 'At a table, her first two books set out in front of her.',
    labelFR: 'À table, avec les livres', labelEN: 'At the table, with the books',
    legendeFR: 'Avec Nature & Ayurveda et Féminité & Ayurveda posés devant elle.', legendeEN: 'Nature & Ayurveda and Féminité & Ayurveda.',
  },
  {
    key: 'krystine-tapis', n: '04', chemin: '/presse',
    photo: { fichier: 'krystine-banner.png', focus: 0.5, focusX: 0.62 },
    texteFR: 'Le visuel qui ouvre le site d’Inspira Nature, mandala en trait blanc à gauche.',
    texteEN: 'The image that opens the Inspira Nature site, a line-drawn mandala on the left.',
    labelFR: 'Le visuel d’ouverture', labelEN: 'The opening image',
    legendeFR: 'L’image qui ouvre le site d’Inspira Nature.', legendeEN: 'The image that opens Inspira Nature.',
  },
  {
    key: 'les-livres', n: '05', chemin: '/presse',
    photo: { fichier: 'accueil/assets/trilogy-books.png', focus: 0.55, focusX: 0.55 },
    texteFR: 'Nature & Ayurveda, Féminité & Ayurveda et le troisième titre, à paraître en février 2027.',
    texteEN: 'Nature & Ayurveda, Féminité & Ayurveda and the third title, due in February 2027.',
    labelFR: 'Les trois livres', labelEN: 'The three books',
    legendeFR: 'Les trois titres ensemble, dont celui de février 2027.', legendeEN: 'Including the title due in February 2027.',
  },
  {
    key: 'sante-la-vie', n: '06', chemin: '/presse',
    photo: { fichier: 'sante-la-vie.jpg', focus: 0.3, focusX: 0.5 },
    texteFR: 'Sur le plateau de Santé la vie, parmi les huiles et les crèmes.',
    texteEN: 'On the set of Santé la vie, among the oils and the creams.',
    labelFR: 'Sur le plateau', labelEN: 'On set',
    legendeFR: 'Sur le plateau, parmi les huiles et les crèmes.', legendeEN: 'Santé la vie, among the oils and the creams.',
  },
];

const PAGES_DEFAUT: PlanchePresse[] = [
  {
    key: 'site-accueil', n: '01', chemin: '/', adresse: 'krystinestlaurent.ca',
    photo: { fichier: 'presse/captures/accueil.png', focus: 0, focusX: 0.5 },
    texteFR: 'L’accueil du site de Krystine St-Laurent.', texteEN: 'The home page of Krystine St-Laurent’s site.',
    labelFR: 'L’accueil', labelEN: 'The home page',
    legendeFR: 'krystinestlaurent.ca', legendeEN: 'krystinestlaurent.ca',
  },
  {
    key: 'site-krystine', n: '02', chemin: '/krystine', adresse: 'krystinestlaurent.ca/krystine',
    photo: { fichier: 'presse/captures/krystine.png', focus: 0, focusX: 0.5 },
    texteFR: 'La page biographique, en langage magazine.', texteEN: 'The biography page, laid out as a magazine.',
    labelFR: 'La biographie', labelEN: 'The biography',
    legendeFR: 'krystinestlaurent.ca/krystine', legendeEN: 'krystinestlaurent.ca/krystine',
  },
  {
    key: 'site-conferenciere', n: '03', chemin: '/conferenciere', adresse: 'krystinestlaurent.ca/conferenciere',
    photo: { fichier: 'presse/captures/conferences.png', focus: 0, focusX: 0.5 },
    texteFR: 'La page des conférences et ses trois formats signature.', texteEN: 'The speaking page and its three signature formats.',
    labelFR: 'Les conférences', labelEN: 'The talks',
    legendeFR: 'krystinestlaurent.ca/conferenciere', legendeEN: 'krystinestlaurent.ca/conferenciere',
  },
  {
    key: 'site-medias', n: '04', chemin: '/medias', adresse: 'krystinestlaurent.ca/medias',
    photo: { fichier: 'presse/captures/medias.png', focus: 0, focusX: 0.5 },
    texteFR: 'La page Médias, où se rassemblent le podcast et la télévision.', texteEN: 'The Media page, where the podcast and the television work are gathered.',
    labelFR: 'Les médias', labelEN: 'The media page',
    legendeFR: 'krystinestlaurent.ca/medias', legendeEN: 'krystinestlaurent.ca/medias',
  },
  {
    key: 'site-formations', n: '05', chemin: '/formations', adresse: 'krystinestlaurent.ca/formations',
    photo: { fichier: 'presse/captures/formations.png', focus: 0, focusX: 0.5 },
    texteFR: 'Les formations et les parcours saisonniers.', texteEN: 'The courses and the seasonal programmes.',
    labelFR: 'Les formations', labelEN: 'The courses',
    legendeFR: 'krystinestlaurent.ca/formations', legendeEN: 'krystinestlaurent.ca/formations',
  },
  {
    key: 'site-boutique', n: '06', chemin: '/boutique', adresse: 'krystinestlaurent.ca/boutique',
    photo: { fichier: 'presse/captures/boutique.png', focus: 0, focusX: 0.5 },
    texteFR: 'La boutique Inspirata Ayurveda.', texteEN: 'The Inspirata Ayurveda shop.',
    labelFR: 'La boutique', labelEN: 'The shop',
    legendeFR: 'krystinestlaurent.ca/boutique', legendeEN: 'krystinestlaurent.ca/boutique',
  },
];

const TEXTES_DEFAUT: TextePresse[] = [
  {
    key: 'bio-courte', labelFR: 'Biographie courte', labelEN: 'Short biography',
    texteFR: `KRYSTINE ST-LAURENT · BIOGRAPHIE COURTE (FR)

Krystine St-Laurent est auteure, conférencière et praticienne en ayurveda.
Après dix années aux soins critiques comme infirmière d'urgence, elle a
choisi les plantes et l'ayurveda, puis l'aromathérapie, et elle consacre
depuis près de quarante ans sa pratique à l'art de vivre conscient.

Ses livres Nature & Ayurveda et Féminité & Ayurveda, parus aux Éditions de
l'Homme, ont tous deux été consacrés best-sellers en francophonie. Un
troisième titre paraît en février 2027.

krystinestlaurent.ca`,
    texteEN: `KRYSTINE ST-LAURENT · SHORT BIOGRAPHY (EN)

Krystine St-Laurent is an author, speaker and Ayurveda practitioner. After
ten years in critical care as an emergency nurse, she turned to plants,
Ayurveda and aromatherapy, and she has spent close to forty years since
then on the art of conscious living.

Her books Nature & Ayurveda and Féminité & Ayurveda, both published by
Éditions de l'Homme, became best-sellers across the French-speaking world.
A third title comes out in February 2027.

krystinestlaurent.ca`,
  },
  {
    key: 'bio-longue', labelFR: 'Biographie longue', labelEN: 'Long biography',
    texteFR: `KRYSTINE ST-LAURENT · BIOGRAPHIE LONGUE (FR)

Krystine St-Laurent a passé dix ans aux soins critiques, comme infirmière
d'urgence, avant de quitter le système de santé conventionnel pour les
plantes et l'ayurveda, puis l'aromathérapie. Elle avait vu les coulisses,
la recherche clinique et l'urgence, et c'est de là qu'elle est partie.

Depuis près de quarante ans, elle tisse des rituels enracinés dans
l'ayurveda, les plantes, la respiration et l'écoute intérieure. Ce travail
ne suit pas les tendances : il s'inscrit dans un art de vivre conscient,
qu'elle enseigne autant sur scène que dans ses livres.

Elle a publié Nature & Ayurveda et Féminité & Ayurveda aux Éditions de
l'Homme, tous deux best-sellers en francophonie, et son troisième titre
paraît en février 2027. Elle a animé trois saisons de Santé la vie à la
télévision, et les entrevues qui ont suivi se retrouvent sur son site.

Son podcast Au-delà des tendances compte deux saisons sur Spotify. Elle
monte sur scène au Canada, aux États-Unis et en Europe avec trois
conférences signature, dont L'Ayurveda comme boussole intérieure. Elle
dirige aussi l'Expérience Origine, un parcours de douze semaines, et la
boutique Inspirata Ayurveda, dont les huiles corporelles sont formulées
pour chacun des trois doshas.

Contact : equipe@inspiratanature.com
krystinestlaurent.ca`,
    texteEN: `KRYSTINE ST-LAURENT · LONG BIOGRAPHY (EN)

Krystine St-Laurent spent ten years in critical care as an emergency nurse
before leaving conventional healthcare for plants, Ayurveda and
aromatherapy. She saw the back rooms, the clinical research and the
emergency floor, and that is where she started from.

For close to forty years she has been weaving rituals rooted in Ayurveda,
plants, breathing and inner listening. The work does not follow trends: it
belongs to an art of conscious living that she teaches on stage as much as
in her books.

She published Nature & Ayurveda and Féminité & Ayurveda with Éditions de
l'Homme, both best-sellers across the French-speaking world, and her third
title arrives in February 2027. She hosted three television seasons of
Santé la vie, and the interviews that followed are gathered on her site.

Her podcast, Beyond Trends, runs to two seasons on Spotify. She speaks
across Canada, the United States and Europe with three signature talks,
among them Ayurveda as an Inner Compass. She also leads the Origin
Experience, a twelve-week programme, and the Inspirata Ayurveda shop,
whose body oils are formulated for each of the three doshas.

Contact: equipe@inspiratanature.com
krystinestlaurent.ca`,
  },
  {
    key: 'faits', labelFR: 'La fiche des faits', labelEN: 'Fact sheet',
    texteFR: `KRYSTINE ST-LAURENT · LES FAITS

Métier          Auteure, conférencière et praticienne en ayurveda
Pratique        Près de quarante ans en santé holistique
Avant           Dix ans aux soins critiques, infirmière d'urgence
Livres          Nature & Ayurveda (34,99 $ CA)
                Féminité & Ayurveda (39,99 $ CA)
                Troisième titre à paraître en février 2027
Éditeur         Éditions de l'Homme
Télévision      Santé la vie, trois saisons
Podcast         Au-delà des tendances, deux saisons sur Spotify
Conférences     Au-delà des tendances
                L'Ayurveda comme boussole intérieure
                La femme et ses saisons
Formats         De soixante minutes à une demi-journée
                Présentiel, virtuel ou hybride
Scènes          Canada, États-Unis, Europe
Parcours        L'Expérience Origine, douze semaines
Boutique        Inspirata Ayurveda, huiles Vata, Pitta et Kapha
Site            krystinestlaurent.ca
Contact         equipe@inspiratanature.com`,
    texteEN: `KRYSTINE ST-LAURENT · THE FACTS

Role            Author, speaker and Ayurveda practitioner
Practice        Close to forty years in holistic health
Before          Ten years in critical care as an emergency nurse
Books           Nature & Ayurveda (CAD 34.99)
                Féminité & Ayurveda (CAD 39.99)
                Third title due February 2027
Publisher       Éditions de l'Homme
Television      Santé la vie, three seasons
Podcast         Beyond Trends, two seasons on Spotify
Talks           Beyond Trends
                Ayurveda as an Inner Compass
                A Woman and Her Seasons
Formats         Sixty minutes to a half day
                In person, online or hybrid
Stages          Canada, United States, Europe
Programme       The Origin Experience, twelve weeks
Shop            Inspirata Ayurveda, Vata, Pitta and Kapha oils
Site            krystinestlaurent.ca
Contact         equipe@inspiratanature.com`,
  },
  {
    key: 'lisez-moi', labelFR: 'Lisez-moi', labelEN: 'Read me',
    texteFR: `KIT DE PRESSE · KRYSTINE ST-LAURENT

Ce dossier rassemble tout ce qu'il faut pour parler de Krystine
St-Laurent : les visuels en 1920 × 1080, les planches photo, les pages du
site, les mots-symboles et les textes.

CE QUE VOUS POUVEZ FAIRE
Tout se télécharge et se publie librement, dans la presse écrite, en
ligne, à la télévision et sur les réseaux sociaux, à la seule condition de
créditer Krystine St-Laurent.

CE QU'IL VAUT MIEUX ÉVITER
Les visuels ne se recadrent pas au point de couper le nom, et les photos
gardent leurs couleurs d'origine. Si un format particulier vous manque,
écrivez-nous et nous le préparons.

CONTACT
equipe@inspiratanature.com
krystinestlaurent.ca/presse`,
    texteEN: `PRESS KIT · KRYSTINE ST-LAURENT

This folder holds everything you need to write about Krystine St-Laurent:
the 1920 × 1080 visuals, the photo plates, the pages of the site, the
wordmarks and the texts.

WHAT YOU MAY DO
Everything downloads and publishes freely, in print, online, on television
and on social media, on the single condition that Krystine St-Laurent is
credited.

WHAT TO AVOID
Please do not crop a visual so tightly that the name disappears, and
please keep the photographs in their original colours. If you need a
format that is missing here, write to us and we will prepare it.

CONTACT
equipe@inspiratanature.com
krystinestlaurent.ca/presse`,
  },
  {
    key: 'credits', labelFR: 'Les crédits', labelEN: 'Credits',
    texteFR: `CRÉDITS · KIT DE PRESSE KRYSTINE ST-LAURENT

Photographies et visuels : Inspira Nature.
Mise en page des cartes : Vexel Webstudio.
Mention demandée : Krystine St-Laurent.

Les captures de pages montrent le site krystinestlaurent.ca tel qu'il se
présentait au moment de la fabrication de ce kit.

Toute question sur les droits : equipe@inspiratanature.com`,
  },
];

const FAITS_DEFAUT: FaitPresse[] = [
  { valeur: '40', fr: 'ans de pratique', en: 'years of practice' },
  { valeur: '03', fr: 'livres publiés', en: 'published books' },
  { valeur: '03', fr: 'saisons de Santé la vie', en: 'seasons of Santé la vie' },
  { valeur: '02', fr: 'saisons de podcast', en: 'podcast seasons' },
  { valeur: '10', fr: 'ans aux soins critiques', en: 'years in critical care' },
];

export const KIT_DEFAUT: KitPresse = {
  cartes: CARTES_DEFAUT,
  planches: PLANCHES_DEFAUT,
  pages: PAGES_DEFAUT,
  textes: TEXTES_DEFAUT,
  faits: FAITS_DEFAUT,
};

/** Lit un JSON de kit en le complétant avec KIT_DEFAUT : un champ manquant après une vieille sauvegarde ne casse jamais le rendu. */
export function lireKit(json: string | undefined | null): KitPresse {
  if (!json) return KIT_DEFAUT;
  try {
    const partiel = JSON.parse(json) as Partial<KitPresse>;
    return {
      cartes: partiel.cartes?.length ? partiel.cartes : KIT_DEFAUT.cartes,
      planches: partiel.planches?.length ? partiel.planches : KIT_DEFAUT.planches,
      pages: partiel.pages?.length ? partiel.pages : KIT_DEFAUT.pages,
      textes: partiel.textes?.length ? partiel.textes : KIT_DEFAUT.textes,
      faits: partiel.faits?.length ? partiel.faits : KIT_DEFAUT.faits,
    };
  } catch {
    return KIT_DEFAUT;
  }
}

/**
 * Le kit publié, en direct. Repli sur KIT_DEFAUT tant que Firestore n'a
 * rien répondu ou que le document n'existe pas encore, pour que la page
 * publique ne se vide jamais.
 */
export function usePresse(): KitPresse {
  const [kit, setKit] = useState<KitPresse>(KIT_DEFAUT);
  useEffect(() => {
    if (!db) return;
    const [collection, id] = CHEMIN_PRESSE.split('/');
    return onSnapshot(doc(db, collection, id), snap => {
      const data = snap.data() as { json?: string } | undefined;
      setKit(lireKit(data?.json));
    }, () => setKit(KIT_DEFAUT));
  }, []);
  return kit;
}
