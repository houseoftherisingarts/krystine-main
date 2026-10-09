// Les Dimanches d'Origine (décisions de Krystine, 8 octobre 2026) : trois
// directs ouverts à toutes, sur inscription, à 9 h, heure du Québec, de 75 à
// 90 minutes chacun. Chaque dimanche est aussi un document `liveEvents/{id}`
// (même identifiant, même étiquette), créé par
// scripts/dimanches/creer-evenements.mjs : c'est lui qui déclenche la
// confirmation, le rappel de la veille, celui d'une
// heure avant et la rediffusion (disponible jusqu'au 20 novembre). Une
// inscription porte les trois étiquettes : une seule suffit pour les trois.
// Les textes de la page vivent ici; ce sont des textes de travail que
// Krystine relit.

export const SERIE_DIMANCHES = 'dimanches-origine';

/** La signature de la série (petite ligne au-dessus du titre, objet des courriels). */
export const SIGNATURE_SERIE = 'Les Dimanches d’Origine';

export const REDIFFUSION_JUSQUA = '20 novembre';

export interface Dimanche {
  id: string;
  tag: string;
  mot: string;
  /** 9 h à Montréal (UTC−4 avant le 1er novembre, UTC−5 ensuite). */
  iso: string;
  question: string;
  vivrons: string;
}

export const DIMANCHES: Dimanche[] = [
  {
    id: 'dimanche-origine-lire', tag: 'dimanche-origine-lire', mot: 'LIRE', iso: '2026-10-25T13:00:00Z',
    question: 'Que se passe-t-il en moi, en ce moment?',
    vivrons: 'Un temps pour observer ce qui se passe en vous ce matin-là, et le nommer avec des mots simples, sans le juger.',
  },
  {
    id: 'dimanche-origine-trier', tag: 'dimanche-origine-trier', mot: 'TRIER', iso: '2026-11-01T14:00:00Z',
    question: 'Qu’est-ce qui me nourrit, et qu’est-ce qui m’encombre?',
    vivrons: 'Un temps pour regarder ce qui vous soutient et ce qui vous pèse dans vos journées, et faire la différence entre les deux.',
  },
  {
    id: 'dimanche-origine-ancrer', tag: 'dimanche-origine-ancrer', mot: 'ANCRER', iso: '2026-11-08T14:00:00Z',
    question: 'Comment garder ce qui me fait du bien?',
    vivrons: 'Un temps pour choisir un geste à garder, à la mesure d’une vraie journée, sans tout changer d’un coup.',
  },
];

/** Les étiquettes posées à l'inscription : la série et chacun des trois directs. */
export const ETIQUETTES_DIMANCHES = [SERIE_DIMANCHES, ...DIMANCHES.map(d => d.tag)];

/** Le lien personnel qu'une inscrite transmet à une amie. La provenance du
 *  site (src/lib/provenance.ts) le lit : source « amie », campagne
 *  « dimanches », contenu = la fiche de l'inscrite (en minuscules). */
export const lienAmie = (abonneId: string) =>
  `https://www.krystinestlaurent.ca/dimanches?via=amie&utm_campaign=dimanches&utm_content=${encodeURIComponent(abonneId.toLowerCase())}`;

/** « Ajouter à mon agenda » : la page maison qui offre Google, Apple, Outlook et le fichier .ics. */
export const lienAgenda = (d: Dimanche) => `/podcast/agenda.html?${new URLSearchParams({
  title: `${SIGNATURE_SERIE} · ${d.mot}`, start: d.iso, dur: '90', url: 'https://www.krystinestlaurent.ca/direct',
}).toString()}`;

// ─── Les textes de la page ───────────────────────────────────────────────────

export const SCENES = [
  {
    titre: 'Le réveil lourd',
    texte: 'Vous avez dormi vos heures. La nuit était complète, et pourtant le matin ne suit pas : la tête est lourde, le corps traîne, et vous ne savez pas quoi regarder en premier.',
  },
  {
    titre: 'Les conseils qui se contredisent',
    texte: 'Vous avez lu, écouté, essayé. Un conseil dit de manger chaud, le suivant dit cru; une semaine il faut retirer, la suivante ajouter. Vous aimeriez savoir sur quoi vous appuyer.',
  },
];

export const DONS = [
  { titre: 'Trois matins en direct', texte: 'Avec Krystine, à 9 h, heure du Québec, de 75 à 90 minutes chacun.' },
  { titre: 'La rediffusion', texte: `Disponible jusqu’au ${REDIFFUSION_JUSQUA}, si vous ne pouvez pas être là.` },
  { titre: 'La méditation de clôture', texte: 'Environ quinze minutes pour terminer chaque matin en douceur.' },
  { titre: 'Vos questions', texte: 'Posez-les dès l’inscription, ou dans le clavardage pendant le direct.' },
  { titre: 'Votre agenda', texte: 'Un lien pour ajouter chaque dimanche à votre calendrier.' },
];

export const BIO = 'Près de 40 ans d’expérience, soins intensifs, recherche clinique, les coulisses du système, avant de choisir l’herboristerie, l’Ayurveda et l’aromathérapie. Auteure de trois livres aux Éditions de l’Homme. Créatrice de Santé la vie et du podcast Au-delà des tendances.';

/** Citations exactes, tirées du sondage de la cohorte fondatrice (9 juillet
 *  2026, consentement « prénom seulement » : oui). Source : 20_formations/
 *  Expérience Origine/Révision Expérience Origine — sondage (2026-07-09).csv */
export const PAROLES = [
  { prenom: 'Joanne', texte: 'Avec Expérience Origine, j’ai appris à mettre des mots sur ce que je vis. Cela aide à m’accepter telle que je suis, à me comprendre.' },
  { prenom: 'Nicole', texte: 'Ralentir, Observer, ressentir et accueillir sont les premiers enseignements importants pour moi qui manquais toujours de temps.' },
  { prenom: 'Patricia', texte: 'Je ne partais pas de zéro et quand même c’est tellement expliqué de façon simple que ces notions ancestrales changent la donne.' },
];

export const CHEMIN = [
  'Un courriel de confirmation arrive dans les minutes qui suivent.',
  'S’il tarde, regardez dans les courriels indésirables ou l’onglet Promotions, et déplacez-le dans votre boîte principale.',
  'La veille de chaque dimanche, nous vous envoyons le lien du direct.',
  'Une heure avant, un dernier rappel.',
  `Si vous ne pouvez pas être là, la rediffusion reste disponible jusqu’au ${REDIFFUSION_JUSQUA}.`,
];

export const QUESTIONS = [
  { q: 'Faut-il connaître l’Ayurveda?', r: 'Non. Nous partons des mots de tous les jours et d’exemples simples. Si vous le connaissez déjà, vous y trouverez de quoi relier ce que vous savez à votre quotidien.' },
  { q: 'Dois-je être là en direct?', r: `C’est l’idéal pour poser vos questions et vivre la méditation avec le groupe. Si vous ne pouvez pas, la rediffusion reste disponible jusqu’au ${REDIFFUSION_JUSQUA}.` },
  { q: 'Combien de temps dure chaque matin?', r: 'De 75 à 90 minutes : l’accueil, l’enseignement, une expérience à vivre ensemble, vos questions, puis une méditation d’environ quinze minutes.' },
  { q: 'Faut-il ouvrir ma caméra?', r: 'Non. Vous pouvez simplement écouter, et écrire vos questions dans le clavardage si vous le souhaitez.' },
  { q: 'Quelle heure est-ce en Europe?', r: 'Le 25 octobre, le direct commence à 14 h en France, en Belgique et en Suisse. Les 1er et 8 novembre, il commence à 15 h. L’écart change parce que l’Europe recule l’heure une semaine avant le Québec.' },
];
