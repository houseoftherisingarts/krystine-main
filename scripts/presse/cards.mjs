// ─── Les cartes de la salle de presse ────────────────────────────────
// Une entrée par sujet. Chaque carte se rend en 1920 × 1080 dans
// build-kit.mjs, en français et en anglais, avec ou sans code QR, et la
// photo seule quand la source est assez large pour tenir le 16:9.
//
// Rien ici ne s'invente : chaque phrase vient d'une page du site, et les
// faits vérifiables (titres, prix, dates, formats) se recopient tels
// qu'ils y sont écrits. Aucun chiffre d'audience, aucun téléphone,
// aucune adresse postale, parce que le site n'en publie pas.
//
// `src`  : la photo du cadre fileté, fenêtre portrait de 744 × 850.
// `nu`   : la photo pleine page, quand elle supporte un 16:9 de 1920 px.
// `cote` : le côté où se pose la photo, l'autre revient au texte.
// `focus`, `focusX` : le point d'intérêt, en fraction de la hauteur et
//          de la largeur, pour que le recadrage garde le sujet.

export const SITE = 'https://www.krystinestlaurent.ca';

export const CARTES = [
  {
    n: '01',
    key: 'portrait',
    cote: 'gauche',
    src: { fichier: 'accueil/assets/hero-ml-poster.jpg', focus: 0.32, focusX: 0.53 },
    nu: { fichier: 'accueil/assets/hero-ml-poster.jpg', focus: 0.32, focusX: 0.53 },
    etiquette: { fr: 'Portrait', en: 'Portrait' },
    qr: { fr: '/krystine', en: '/krystine' },
    fr: {
      kicker: 'Portrait',
      titre: 'Krystine St-Laurent',
      corps: "Auteure, conférencière et praticienne en ayurveda. Près de quarante ans de pratique en santé holistique, dont dix années aux soins critiques comme infirmière d'urgence, avant de choisir les plantes, l'ayurveda et l'aromathérapie.",
      meta: 'krystinestlaurent.ca/krystine',
    },
    en: {
      kicker: 'Portrait',
      titre: 'Krystine St-Laurent',
      corps: 'Author, speaker and Ayurveda practitioner. Nearly forty years in holistic health, ten of them in critical care as an emergency nurse, before she turned to plants, Ayurveda and aromatherapy.',
      meta: 'krystinestlaurent.ca/krystine',
    },
  },
  {
    n: '02',
    key: 'conferenciere',
    cote: 'droite',
    src: { fichier: 'krystine-banner.png', focus: 0.35, focusX: 0.84 },
    nu: { fichier: 'krystine-banner.png', focus: 0.5, focusX: 0.62 },
    etiquette: { fr: 'Conférencière', en: 'Speaker' },
    qr: { fr: '/conferenciere', en: '/conferenciere' },
    fr: {
      kicker: 'Sur scène',
      titre: 'La conférencière',
      corps: "Trois conférences signature portent le propos : Au-delà des tendances, L'Ayurveda comme boussole intérieure et La femme et ses saisons. Les formats vont de soixante minutes à une demi-journée, en salle, en virtuel ou en hybride, et les scènes se trouvent au Canada, aux États-Unis et en Europe.",
      meta: 'krystinestlaurent.ca/conferenciere',
    },
    en: {
      kicker: 'On stage',
      titre: 'The speaker',
      corps: 'Three signature talks carry the work: Beyond Trends, Ayurveda as an Inner Compass, and A Woman and Her Seasons. Formats run from sixty minutes to a half day, in the room, online or hybrid, on stages across Canada, the United States and Europe.',
      meta: 'krystinestlaurent.ca/conferenciere',
    },
  },
  {
    n: '03',
    key: 'livres',
    cote: 'gauche',
    src: { fichier: 'accueil/assets/trilogy-books.png', focus: 0.54, focusX: 0.5 },
    nu: { fichier: 'accueil/assets/trilogy-books.png', focus: 0.55, focusX: 0.55 },
    etiquette: { fr: 'Les livres', en: 'The books' },
    qr: { fr: '/medias', en: '/medias' },
    fr: {
      kicker: 'Édition',
      titre: 'Trois livres',
      corps: "Nature & Ayurveda et Féminité & Ayurveda ont tous deux été consacrés best-sellers en francophonie, aux Éditions de l'Homme. Le troisième titre, encore gardé secret, paraît en février 2027 chez le même éditeur.",
      meta: 'krystinestlaurent.ca/medias',
    },
    en: {
      kicker: 'Publishing',
      titre: 'Three books',
      corps: 'Nature & Ayurveda and Féminité & Ayurveda both became best-sellers across the French-speaking world, published by Éditions de l’Homme. The third title, still under wraps, comes out in February 2027 with the same house.',
      meta: 'krystinestlaurent.ca/medias',
    },
  },
  {
    n: '04',
    key: 'origine',
    cote: 'droite',
    src: { fichier: 'accueil/assets/portes/origine.png', focus: 0.28, focusX: 0.5 },
    nu: null,
    etiquette: { fr: 'Le parcours', en: 'The programme' },
    qr: { fr: '/origine', en: '/origine' },
    fr: {
      kicker: 'Parcours signature',
      titre: 'L’Expérience Origine',
      corps: "Douze semaines au cœur de l'ayurveda, bâties pour retrouver une boussole intérieure plutôt qu'une discipline de plus. La prochaine cohorte s'ouvre en novembre, et la liste d'attente reçoit les détails avant toute annonce publique.",
      meta: 'krystinestlaurent.ca/origine',
    },
    en: {
      kicker: 'Signature programme',
      titre: 'The Origin Experience',
      corps: 'Twelve weeks inside Ayurveda, built to restore an inner compass rather than add one more discipline. The next cohort opens in November, and the waiting list gets the details before any public announcement.',
      meta: 'krystinestlaurent.ca/origine',
    },
  },
  {
    n: '05',
    key: 'podcast',
    cote: 'gauche',
    src: { fichier: 'podcast/krystine.jpg', focus: 0.24, focusX: 0.62 },
    nu: { fichier: 'podcast/saison2-cover.webp', focus: 0.5, focusX: 0.5 },
    etiquette: { fr: 'Le podcast', en: 'The podcast' },
    qr: { fr: 'https://open.spotify.com/show/0cHEVMLF92tJxiO7MwyOKD', en: 'https://open.spotify.com/show/0cHEVMLF92tJxiO7MwyOKD' },
    fr: {
      kicker: 'Podcast',
      titre: 'Au-delà des tendances',
      corps: "Deux saisons en ligne sur Spotify, faites de conversations longues sur le corps, les plantes et l'art de vivre conscient. Le podcast écoute ce que le corps sait déjà, loin du bruit ambiant.",
      meta: 'Spotify · Au-delà des tendances',
    },
    en: {
      kicker: 'Podcast',
      titre: 'Beyond Trends',
      corps: 'Two seasons on Spotify, built from long conversations about the body, plants and conscious living. The show listens to what the body already knows, far from the ambient noise.',
      meta: 'Spotify · Beyond Trends',
    },
  },
  {
    n: '06',
    key: 'medias',
    cote: 'droite',
    src: { fichier: 'sante-la-vie.jpg', focus: 0.3, focusX: 0.52 },
    nu: { fichier: 'sante-la-vie.jpg', focus: 0.3, focusX: 0.5 },
    etiquette: { fr: 'Télévision', en: 'Television' },
    qr: { fr: '/medias', en: '/medias' },
    fr: {
      kicker: 'Télévision et entrevues',
      titre: 'Trois saisons à l’écran',
      corps: "Santé la vie a tenu trois saisons, et toutes les capsules qui les ont précédées restent en ligne. Les passages à Salut Bonjour et les entrevues données depuis se rassemblent sur la page Médias du site.",
      meta: 'krystinestlaurent.ca/medias',
    },
    en: {
      kicker: 'Television and interviews',
      titre: 'Three seasons on air',
      corps: 'Santé la vie ran for three seasons, and every capsule that came before it is still online. The Salut Bonjour appearances and the interviews given since are gathered on the Media page of the site.',
      meta: 'krystinestlaurent.ca/medias',
    },
  },
  {
    n: '07',
    key: 'boutique',
    cote: 'gauche',
    src: { capture: 'boutique.png', focus: 0.5, focusX: 0.5 },
    nu: { capture: 'boutique.png', focus: 0.5, focusX: 0.5 },
    etiquette: { fr: 'La boutique', en: 'The shop' },
    qr: { fr: '/boutique', en: '/boutique' },
    fr: {
      kicker: 'Inspira Nature',
      titre: 'La boutique',
      corps: "Des huiles corporelles infusées de plantes entières, formulées pour chacun des trois doshas : Vata, Pitta et Kapha. La boutique Inspirata Ayurveda se tient en ligne, et le site donne aussi la liste de ses points de vente.",
      meta: 'krystinestlaurent.ca/boutique',
    },
    en: {
      kicker: 'Inspira Nature',
      titre: 'The shop',
      corps: 'Body oils infused with whole plants, formulated for each of the three doshas: Vata, Pitta and Kapha. The Inspirata Ayurveda shop lives online, and the site also lists every retailer that carries it.',
      meta: 'krystinestlaurent.ca/boutique',
    },
  },
  {
    n: '08',
    key: 'contact',
    cote: 'droite',
    src: { fichier: 'footer-jacques-cartier.jpg', focus: 0.52, focusX: 0.48 },
    nu: { fichier: 'footer-jacques-cartier.jpg', focus: 0.55, focusX: 0.55 },
    etiquette: { fr: 'Contact', en: 'Contact' },
    qr: { fr: '/presse', en: '/presse' },
    fr: {
      kicker: 'Nous joindre',
      titre: 'Demandes de presse',
      corps: "Les demandes de conférence, d'entrevue et de partenariat passent par l'équipe, à equipe@inspiratanature.com. Les visuels de cette page se téléchargent librement, à la seule condition de créditer Krystine St-Laurent.",
      meta: 'equipe@inspiratanature.com',
    },
    en: {
      kicker: 'Get in touch',
      titre: 'Press enquiries',
      corps: 'Speaking, interview and partnership requests go through the team, at equipe@inspiratanature.com. Everything on this page is free to download, on the single condition that Krystine St-Laurent is credited.',
      meta: 'equipe@inspiratanature.com',
    },
  },
];
