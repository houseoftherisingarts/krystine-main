// ─── Les pages du site, telles qu'elles s'affichent ──────────────────
// Les captures prises par capture-site.mjs deviennent des planches de
// 1920 × 1080 avec le nom de la page et son adresse. Une journaliste
// qui illustre un article sur le site a besoin de le montrer, pas d'une
// photo de plus, et ces planches lui évitent de recadrer un écran.

export const SHOTS = [
  {
    n: '01',
    key: 'site-accueil',
    capture: 'accueil.png',
    adresse: 'krystinestlaurent.ca',
    fr: 'L’accueil du site de Krystine St-Laurent.',
    en: 'The home page of Krystine St-Laurent’s site.',
  },
  {
    n: '02',
    key: 'site-krystine',
    capture: 'krystine.png',
    adresse: 'krystinestlaurent.ca/krystine',
    fr: 'La page biographique, en langage magazine.',
    en: 'The biography page, laid out as a magazine.',
  },
  {
    n: '03',
    key: 'site-conferenciere',
    capture: 'conferences.png',
    adresse: 'krystinestlaurent.ca/conferenciere',
    fr: 'La page des conférences et ses trois formats signature.',
    en: 'The speaking page and its three signature formats.',
  },
  {
    n: '04',
    key: 'site-medias',
    capture: 'medias.png',
    adresse: 'krystinestlaurent.ca/medias',
    fr: 'La page Médias, où se rassemblent le podcast et la télévision.',
    en: 'The Media page, where the podcast and the television work are gathered.',
  },
  {
    n: '05',
    key: 'site-formations',
    capture: 'formations.png',
    adresse: 'krystinestlaurent.ca/formations',
    fr: 'Les formations et les parcours saisonniers.',
    en: 'The courses and the seasonal programmes.',
  },
  {
    n: '06',
    key: 'site-boutique',
    capture: 'boutique.png',
    adresse: 'krystinestlaurent.ca/boutique',
    fr: 'La boutique Inspirata Ayurveda.',
    en: 'The Inspirata Ayurveda shop.',
  },
];
