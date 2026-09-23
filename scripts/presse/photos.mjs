// ─── Les planches photo de la salle de presse ────────────────────────
// Une photo pleine page en 1920 × 1080, posée sous un bandeau crème qui
// porte la légende en français, sa traduction en anglais et le crédit.
// La légende dit ce que la photo montre, sans rien ajouter : une image
// de presse se décrit, elle ne se raconte pas.
//
// `chemin` est l'adresse qu'ouvre le code QR de la variante « Version QR ».
// Une planche photo n'a pas de sujet à part : elle renvoie à la salle de
// presse, d'où elle sort et où se trouvent les autres formats.

export const PHOTOS = [
  {
    n: '01',
    key: 'krystine-kimono',
    fichier: 'krystine-portrait.jpg',
    chemin: '/presse',
    focus: 0.24,
    focusX: 0.55,
    fr: 'Krystine St-Laurent en kimono, un livre ouvert sur les genoux.',
    en: 'Krystine St-Laurent in a kimono, an open book on her lap.',
  },
  {
    n: '02',
    key: 'krystine-sourire',
    fichier: 'podcast/krystine.jpg',
    chemin: '/presse',
    focus: 0.24,
    focusX: 0.62,
    fr: 'Un portrait recadré depuis un format vertical, devant la porte verte.',
    en: 'A portrait cropped from a vertical frame, against the green door.',
  },
  {
    n: '03',
    key: 'krystine-table',
    fichier: 'accueil/assets/hero-ml-poster.jpg',
    chemin: '/presse',
    focus: 0.32,
    focusX: 0.53,
    fr: 'À table, ses deux premiers livres posés devant elle.',
    en: 'At a table, her first two books set out in front of her.',
  },
  {
    n: '04',
    key: 'krystine-tapis',
    fichier: 'krystine-banner.png',
    chemin: '/presse',
    focus: 0.5,
    focusX: 0.62,
    fr: 'Le visuel qui ouvre le site d’Inspira Nature, mandala en trait blanc à gauche.',
    en: 'The image that opens the Inspira Nature site, a line-drawn mandala on the left.',
  },
  {
    n: '05',
    key: 'les-livres',
    fichier: 'accueil/assets/trilogy-books.png',
    chemin: '/presse',
    focus: 0.55,
    focusX: 0.55,
    fr: 'Nature & Ayurveda, Féminité & Ayurveda et le troisième titre, à paraître en février 2027.',
    en: 'Nature & Ayurveda, Féminité & Ayurveda and the third title, due in February 2027.',
  },
  {
    n: '06',
    key: 'sante-la-vie',
    fichier: 'sante-la-vie.jpg',
    chemin: '/presse',
    focus: 0.3,
    focusX: 0.5,
    fr: 'Sur le plateau de Santé la vie, parmi les huiles et les crèmes.',
    en: 'On the set of Santé la vie, among the oils and the creams.',
  },
];
