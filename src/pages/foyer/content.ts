// Le Foyer d'Origine · copie VERBATIM du doc « PAGE DE VENTE FINALE » (19 août 2026).
// Une seule version de chaque section. Aucun mot ajouté, retiré ou reformulé.

export interface TitledBlock {
  title: string;
  body: string;
}

export interface FaqItem {
  q: string;
  a: string[];
}

// SECTION 2 · L'Histoire du feu
export const SECTION2 = {
  eyebrow: 'Il était une fois',
  title: 'L’histoire du feu',
  lead: 'Il était une fois, à Varanasi, une flamme gardée vivante depuis plus de deux mille cinq cents ans.',
  paragraphs: [
    'Jour et nuit, des familles se transmettent la responsabilité de veiller sur elle, afin que sa lumière ne s’éteigne jamais.',
    'Autour du feu, nous nous rassemblons. Les anciens racontent. Les enfants écoutent.',
  ],
  closingLead: 'Le Foyer d’Origine',
  closing: 'porte ce même mouvement humain : se rassembler, se nourrir et garder vivant ce qui compte assez pour ne pas être oublié.',
};

// SECTION 3 · Le rythme
export const SECTION3 = {
  eyebrow: 'Au Foyer d’Origine',
  title: 'Un rythme régulier',
  subtitle: 'Le feu reste allumé, semaine après semaine.',
  paragraphs: [
    'Chaque mois, une porte ouvre un nouvel univers.',
    'Puis, chaque semaine, une nouvelle ouverture apparaît à l’intérieur du Foyer : une histoire, une œuvre, une plante, un savoir, une personne, une pratique ou une découverte choisie pour ce moment de l’année.',
    'En texte, en audio ou en vidéo, nous découvrons pourquoi elle a sa place ici maintenant, ce qu’elle révèle et les liens qu’elle permet de faire.',
    'De septembre à juin, dix méditations guidées nous rassemblent en direct. Elles demeurent accessibles en rediffusion pendant la durée de notre accès.',
    'Il n’y a aucune progression à compléter.',
    'Nous pouvons entrer dans ce qui est proposé cette semaine ou y revenir plus tard.',
  ],
  closing: 'Rien à rattraper. Rien à publier. Rien à prouver.',
};

// BIENVENUE · l'arrivée dans le Foyer, entre la scène du feu et les douze portes
export const BIENVENUE = {
  eyebrow: 'Bienvenue dans :',
  title: 'Le Foyer d’Origine',
  promise: 'Une année pour découvrir. Relier. Ressentir.',
  bridge: 'Douze portes à ouvrir…',
};


// SECTION 5 · Ce que le Foyer rend possible
export const SECTION5 = {
  eyebrow: 'Au fil des mois',
  title: 'Une année nourrie par l’Ayurveda, les plantes, les œuvres et les histoires',
  intro: ['Au fil des mois, de nouvelles choses entrent dans notre champ de vision.'],
  items: [
    'Une plante nous fait remarquer un changement de saison.',
    'Une œuvre nous conduit vers une idée inattendue.',
    'Une histoire nous rapproche d’une expérience humaine que nous pensions éloignée de la nôtre.',
    'Un savoir ancien nous aide à comprendre quelque chose de très actuel.',
  ],
  link: 'Et, peu à peu, des liens apparaissent là où nous n’en voyions pas auparavant.',
  release: [
    'Nous n’avons pas à tout retenir.',
    'Certaines découvertes passent.',
    'D’autres nous surprennent, nous touchent ou restent avec nous plus longtemps que prévu.',
  ],
  lead: 'Une année pour découvrir ce que nous n’aurions pas pensé chercher, relier ce que nous avions appris à regarder séparément et rester capables d’être touchés.',
  closing: 'Nous ne suivons pas Le Foyer. Nous y revenons.',
};

// SECTION 6 · Les méditations
export const SECTION6 = {
  eyebrow: 'Un temps commun',
  title: 'Dix fois dans l’année, nous nous retrouvons.',
  lead: 'De septembre à juin, une méditation guidée en direct nous rassemble autour du même feu.',
  modes: [
    { label: 'En direct', body: 'Un rendez-vous pour être là ensemble, au même moment.' },
    { label: 'En rediffusion', body: 'Chaque méditation demeure accessible pendant toute la durée de notre accès.' },
  ],
  pause: 'Un temps pour arrêter de recevoir, revenir au corps, laisser ce qui a été rencontré faire son chemin.',
  tagline: ['Dix rendez-vous.', 'Un même feu.', 'Une année pour y revenir.'],
  badgeNumber: '10',
  badgeLabel: 'méditations en direct',
  contentsTitle: 'Ce que l’année contient',
  contents: [
    'Douze portes mensuelles liées au moment de l’année et à une expérience humaine.',
    'Une nouvelle ouverture chaque semaine, en texte, en audio ou en vidéo.',
    'Dix méditations guidées en direct, avec leurs rediffusions.',
    'Les saisons 1 et 2 de l’émission Santé la vie, dans les archives du Foyer.',
    'Les épisodes du podcast Au-delà des tendances réunis dans la plateforme.',
    'Un espace privé sans publicité ni recommandations automatisées.',
    'Un accès prioritaire aux annonces de retraites, de conférences et d’événements.',
    'Les événements sont offerts séparément, sauf indication contraire.',
    'Douze mois d’accès à partir de votre inscription.',
  ],
};

// SECTION 7 · La signature du Foyer
export const SECTION7 = {
  eyebrow: 'Pourquoi ces histoires, ces matières et ces rencontres?',
  title: 'Près de 40 ans à relier ce que nous avons appris à séparer',
  paragraphs: [
    'Soins infirmiers et recherche clinique. Ayurveda, plantes médicinales et aromathérapie. Cuisine, saisons et rythmes du corps. Écriture, enseignement, voyages et transmission.',
    'Trois livres écrits. Près de 1 200 pages publiées. Une émission de télévision. Des dizaines d’entrevues. Des articles écrits dans de multiples magazines. Des années de conférences, de recherche, d’étude et de transmission.',
  ],
  pillarsLead: 'Depuis près de 40 ans, le même fil traverse sa vision, ses valeurs et son travail :',
  pillars: ['Nourrir et soigner', 'Corps et conscience', 'Science et sagesse'],
  pillarsClosing: 'Relier ce que nous avons appris à regarder séparément.',
  paragraphs2: [
    'Avec les années, cette façon de relier est devenue une manière de choisir : savoir où porter le regard, reconnaître ce qui possède de la substance et voir les liens qui ne sont pas toujours évidents au premier regard.',
    'C’est ce regard qui compose Le Foyer : reconnaître ce qui mérite notre attention, écarter ce qui ajoute du bruit et créer des liens entre des connaissances, des expériences et des disciplines rarement réunies au même endroit.',
  ],
  emphasis: 'Le Foyer ne rassemble pas près de 40 ans de connaissances.',
  closing: 'Il est composé à partir du regard que près de 40 ans ont permis d’affiner.',
  photoCaption: 'Krystine St-Laurent',
};

// SECTION 8 · Votre attention
export const SECTION8 = {
  eyebrow: 'Une année composée avec intention',
  title: 'Notre attention est notre monnaie d’échange la plus précieuse.',
  subtitle: 'Elle porte un pouvoir de création immense.',
  hook: 'Et pourtant, presque tout aujourd’hui cherche à la capter.',
  situations: [
    ['Nous prononçons le mot « stress » dans une conversation.', 'Un peu plus tard, une série de publicités apparaît.'],
    ['Nous nous arrêtons quelques secondes sur une vidéo.', 'Le même sujet commence à nous suivre pendant des semaines.'],
    ['Nous cherchons une réponse simple.', 'Nous recevons des protocoles, des produits et des experts qui se contredisent.'],
  ],
  turnTitle: 'Le Foyer fait l’inverse.',
  turn: [
    'Chaque semaine, quelque chose est choisi avec intention.',
    'Pas pour ajouter du bruit.',
    'Pour vous mettre en présence de ce qui mérite peut-être votre attention.',
  ],
  triptyque: 'Découvrir · Relier · Ressentir',
  closing: 'Le Foyer ne demande pas davantage d’attention. Il prend soin de ce qui mérite d’en recevoir.',
};

// SECTION 9 · L'offre
export const OFFRE = {
  eyebrow: 'L’offre',
  title: 'Le Foyer d’Origine',
  subtitle: 'Une année composée autour du feu',
  items: [
    'Douze portes mensuelles liées au moment de l’année et à une expérience humaine.',
    'Une nouvelle ouverture chaque semaine, en texte, en audio ou en vidéo.',
    'Dix méditations guidées offertes en direct de septembre à juin.',
    'Les rediffusions des méditations accessibles pendant toute la durée de votre abonnement.',
    'Les saisons 1 et 2 de l’émission Santé la vie, soit vingt émissions réunies dans les archives du Foyer.',
    'Les épisodes du podcast Au-delà des tendances réunis dans la plateforme.',
    'Un espace privé sans publicité ni recommandations automatisées.',
    'Un accès prioritaire aux annonces de retraites, de conférences et d’événements. Les événements sont offerts séparément, sauf indication contraire.',
    'Douze mois d’accès à partir de votre inscription.',
  ],
  priceRegular: '597 $ CA',
  price: '497 $ CA',
  priceNote: 'Tarif de lancement',
  paymentLines: [
    'Paiement complet par carte de crédit.',
    'Une option de paiement en trois versements est offerte au moment du paiement.',
    'Garantie cœur léger de quinze jours.',
  ],
  cta: 'Prendre place autour du feu',
};

// SECTION 10 · FAQ
export const FAQ: FaqItem[] = [
  {
    q: 'Quelle est la différence entre le podcast, Le Foyer et Expérience Origine?',
    a: [
      'Le podcast Au-delà des tendances rend visible ce qui nous dirige sans avoir été consciemment choisi et révèle le coût caché des modes et des tendances actuelles.',
      'Le Foyer d’Origine poursuit la relation. Tout au long de l’année, des histoires, des connaissances, des œuvres, des plantes, des ingrédients, des sages, des pratiques et des perspectives sont apportés dans un espace privé.',
      'Expérience Origine accompagne une traversée structurée pour l’âme et le corps. Elle permet de construire sa propre cartographie, de retrouver sa boussole intérieure, de s’observer, de lire son corps, d’en reconnaître les variations, de voir l’impact de ce qui entre dans sa vie et de faire, avec discernement, des choix qui nous ressemblent.',
      'Le podcast rend visible et révèle le coût caché. Le Foyer crée la rencontre et poursuit la relation. Expérience Origine apprend à lire, trier et ancrer afin de choisir avec discernement.',
      'Chaque espace peut être découvert pour lui-même. Ensemble, ils représentent trois profondeurs différentes de l’œuvre de Krystine St-Laurent.',
    ],
  },
  {
    q: 'Est-ce une formation?',
    a: [
      'Le Foyer ne comporte aucun module à suivre ni progression à compléter. Chaque mois ouvre un nouvel univers. Vous pouvez lire, écouter, regarder, cuisiner ou méditer selon ce qui vous appelle.',
    ],
  },
  {
    q: 'Puis-je entrer dans Le Foyer en cours d’année?',
    a: [
      'Oui. L’année éditoriale se déroule du 15 septembre au 15 août. En entrant en cours d’année, vous accédez immédiatement aux portes déjà ouvertes ainsi qu’aux nouvelles ouvertures déposées jusqu’au 15 août.',
      'Votre accès personnel demeure actif pendant douze mois à partir de votre inscription. Après le 15 août, les contenus déjà déposés restent accessibles jusqu’à la fin de votre période d’accès.',
    ],
  },
  {
    q: 'Aurai-je accès aux dix méditations?',
    a: [
      'Dix méditations guidées sont offertes en direct de septembre à juin. En entrant en cours d’année, vous pouvez retrouver les méditations antérieures en rediffusion et participer aux prochains rendez-vous en direct. Toutes les rediffusions demeurent accessibles pendant la durée de votre abonnement.',
    ],
  },
  {
    q: 'Que se passe-t-il si je manque une méditation?',
    a: [
      'Chaque méditation est enregistrée. Vous pouvez la retrouver dans Le Foyer pendant toute la durée de votre accès.',
    ],
  },
  {
    q: 'Dois-je être présente chaque semaine?',
    a: [
      'Vous pouvez découvrir l’ouverture de la semaine lorsqu’elle paraît ou y revenir plus tard. Les contenus déposés demeurent accessibles pendant votre abonnement.',
    ],
  },
  {
    q: 'Dois-je participer aux échanges ou raconter mon histoire?',
    a: [
      'Aucune prise de parole, publication ou histoire personnelle n’est demandée. Vous pouvez recevoir les contenus et assister aux méditations sans vous exposer publiquement.',
    ],
  },
  {
    q: 'Le podcast devient-il réservé aux membres?',
    a: [
      'Non. Au-delà des tendances demeure un podcast public. Ses épisodes sont également réunis dans Le Foyer afin que les membres puissent les retrouver au même endroit que les autres contenus.',
    ],
  },
  {
    q: 'Les retraites, conférences et événements sont-ils inclus?',
    a: [
      'Les événements sont offerts séparément, sauf indication contraire. Les membres du Foyer sont informées en priorité. Lorsqu’un événement comporte un nombre limité de places, une période d’inscription peut leur être réservée avant l’ouverture publique.',
    ],
  },
  {
    q: 'Puis-je conserver mon accès après mes douze mois?',
    a: [
      'Oui. Avant la fin de votre abonnement, vous recevrez une invitation à renouveler votre accès pour une nouvelle période de douze mois, au tarif alors en vigueur.',
      'En renouvelant, vous conservez l’accès aux portes, aux méditations, aux émissions, aux podcasts et aux autres contenus déposés dans Le Foyer. Sans renouvellement, votre accès se termine à la date prévue.',
    ],
  },
  {
    q: 'Mon abonnement se renouvelle-t-il automatiquement?',
    a: [
      'Non. Pour cette première édition, aucun renouvellement automatique n’est prévu. Vous pourrez décider de renouveler votre accès lorsque vous recevrez l’invitation.',
    ],
  },
  {
    q: 'Comment fonctionne la Garantie cœur léger?',
    a: [
      'La garantie commence le jour de votre inscription. Vous disposez de quinze jours pour découvrir les portes, les contenus et l’espace du Foyer.',
      'Si vous choisissez de ne pas poursuivre, écrivez-nous avant la fin de cette période. Votre accès sera fermé et votre achat remboursé.',
    ],
  },
];

// SECTION 11 · Appel final
export const FINAL = {
  title: 'Tout ne mérite pas notre attention.',
  emphasis: 'Mais certaines choses peuvent changer notre manière de voir.',
  sub: 'Le Foyer d’Origine est une place pour les découvrir.',
  lines: [
    'Pour sortir de la répétition.',
    'Pour rencontrer l’inattendu.',
    'Pour accéder à des histoires, des connaissances et des relations que nous n’aurions pas su demander dans une barre de recherche.',
  ],
  closing: 'Pour retrouver un rythme régulier, une place parmi les autres et la possibilité d’être bien pendant que le monde bouge.',
  callout: 'Prenez place autour du feu.',
  priceRegular: '597 $ CAD',
  price: '497 $ CAD',
  priceNote: 'Tarif de lancement',
  priceLines: ['Douze mois d’accès', 'Garantie cœur léger de quinze jours'],
  cta: 'Prendre place autour du feu',
};
