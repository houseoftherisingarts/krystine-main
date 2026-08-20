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
  title: 'L’Histoire du feu',
  lead: 'Il était une fois, dans un pays lointain du continent indien, une ville appelée Varanasi.',
  paragraphs: [
    'Dans cette ville, une flamme brûle sans arrêt depuis plus de deux mille cinq cents ans.',
    'Des familles se passent cette responsabilité, de père en fils, pour que cette lumière ne s’éteigne jamais. Jour et nuit, quelqu’un veille sur elle.',
    'Chaque gardien passe le relais au suivant, comme on se passe un secret trop important pour être oublié.',
    'Et puis, la flamme est devenue le centre de la maison, le foyer. L’endroit où la famille se rassemblait, où les anciens racontaient les histoires, où les enfants écoutaient, les yeux grands ouverts.',
  ],
  closingLead: 'Le Foyer d’Origine',
  closing: 'est né de ce même mouvement humain : revenir au cœur, se réchauffer, se nourrir ensemble et transmettre, par les histoires, ce qui compte assez pour ne pas être oublié.',
};

// SECTION 3 · Le rythme
export const SECTION3 = {
  eyebrow: 'Sans obligations',
  title: 'Un rythme régulier',
  subtitle: 'Le feu reste allumé, semaine après semaine.',
  paragraphs: [
    'Chaque semaine, quelque chose de précis est apporté au Foyer : une histoire à écouter, une plante à découvrir, un ingrédient à cuisiner, un livre à ouvrir ou une question à regarder autrement.',
    'En texte, en audio ou en vidéo, nous découvrons d’où cela vient, pourquoi cela mérite notre attention maintenant et ce que cela peut changer dans notre manière de voir.',
    'De septembre à juin, dix méditations guidées sont offertes en direct. Chaque rencontre demeure accessible en rediffusion pendant la durée de l’accès.',
    'Il n’y a ni modules à suivre ni progression à compléter.',
    'Vous pouvez rejoindre ce qui est partagé cette semaine ou revenir plus tard. Vous n’avez rien à rattraper, rien à publier et rien à prouver.',
  ],
  closing: 'On ne suit pas Le Foyer. On y revient.',
};

// SECTION 4 · Les douze portes
export const SECTION4 = {
  eyebrow: 'Une année à découvrir',
  title: 'Douze portes autour du même feu',
  paragraphs: [
    'L’année éditoriale du Foyer se déroule du 15 septembre au 15 août.',
    'Chaque mois, une nouvelle porte s’ouvre. Derrière elle se trouve une composition créée pour le moment de l’année que nous traversons : une histoire, une plante, un ingrédient, une œuvre, une musique, un sage, une rencontre avec l’Ayurveda ou une autre découverte apportée autour du feu.',
    'À l’intérieur de la porte mensuelle, une nouvelle ouverture apparaît chaque semaine. Vous ne recevez pas tout d’un seul coup. Vous avez le temps de découvrir ce qui a été choisi, de comprendre pourquoi cela entre dans Le Foyer maintenant et de voir ce que vous souhaitez en garder.',
    'En entrant en cours d’année, vous accédez immédiatement aux portes déjà ouvertes ainsi qu’aux nouvelles ouvertures déposées jusqu’au 15 août.',
    'Votre accès personnel demeure actif pendant douze mois à partir de votre inscription. Après le 15 août, les contenus déjà déposés restent accessibles jusqu’à la fin de votre période d’accès.',
  ],
  closing: 'Une porte s’ouvre. Une rencontre commence. Le feu demeure au centre.',
};

// SECTION 5 · Ce que le Foyer rend possible
export const SECTION5 = {
  eyebrow: 'Ce que le Foyer rend possible',
  title: 'Une place où les connaissances se rencontrent',
  intro: [
    'Le Foyer rassemble des savoirs, des pratiques et des récits que nous rencontrons habituellement séparément.',
    'L’Ayurveda en forme les racines. Il apporte une lecture du corps, des saisons, des rythmes et des qualités. Au fil des mois, cette perspective rencontre les plantes médicinales, l’aromathérapie, les ingrédients, la respiration, la méditation, les histoires, les œuvres et la parole des sages.',
    'Chaque porte part d’un thème humain lié au moment de l’année. Les ouvertures du mois permettent de l’approcher de plusieurs façons et d’apercevoir les liens entre ce que nous découvrons.',
  ],
  items: [
    {
      title: 'Retrouver une pulsation régulière',
      body: 'Chaque semaine, une nouvelle ouverture apparaît. Ce rythme crée un rendez-vous reconnaissable au fil des mois.',
    },
    {
      title: 'Se laisser surprendre',
      body: 'Les portes s’ouvrent une à une. Chaque mois révèle un nouvel univers, avec des rencontres et des formes différentes.',
    },
    {
      title: 'Se sentir vue et reconnue',
      body: 'Le Foyer s’adresse à ce que nous traversons comme humaines. Chacune y possède pleinement sa place, dans la parole comme dans le silence.',
    },
    {
      title: 'Recevoir à sa manière',
      body: 'Lire. Écouter. Regarder. Cuisiner. Méditer. Revenir. Chacune s’approche du feu selon son temps, son intérêt et le moment qu’elle traverse.',
    },
    {
      title: 'Appartenir à un espace commun',
      body: 'Les mêmes portes s’ouvrent pour toutes. Les mêmes histoires circulent. Les méditations nous réunissent. Le même feu demeure au centre.',
    },
    {
      title: 'Laisser circuler ce qui a été reçu',
      body: 'Une découverte peut transformer un geste, une recette, une conversation ou une manière de regarder ce qui nous entoure. Ce qui entre dans Le Foyer peut ensuite poursuivre son chemin dans nos vies et auprès de ceux qui nous sont chers.',
    },
  ] satisfies TitledBlock[],
};

// SECTION 6 · Les méditations
export const SECTION6 = {
  eyebrow: 'Un temps commun',
  title: 'Dix fois dans l’année, nous nous retrouvons',
  paragraphs: [
    'De septembre à juin, dix méditations guidées en direct rassemblent les membres du Foyer.',
    'Chaque rendez-vous marque un temps d’arrêt dans le mois. Un moment pour se déposer, écouter et laisser ce qui a été rencontré faire son chemin.',
    'Vous pouvez être présente en direct ou retrouver la méditation en rediffusion pendant la durée de votre accès.',
  ],
  emphasis: 'Ce temps partagé nous ramène ensemble autour du feu.',
};

// SECTION 7 · La signature du Foyer
export const SECTION7 = {
  eyebrow: 'Pourquoi ces histoires, ces matières et ces rencontres?',
  title: 'Une manière unique de relier ce que nous avons appris à séparer',
  paragraphs: [
    'Depuis 37 ans, Krystine St-Laurent explore l’Ayurveda, les plantes, la cuisine, les saisons, les rythmes du corps et les grandes questions humaines.',
    'Son parcours traverse les soins infirmiers, la recherche, l’écriture, l’enseignement, les voyages, les rencontres et la création de produits à partir des plantes d’ici.',
    'Trois livres ont été publiés.',
    'Le Foyer naît de cette réserve de connaissances, d’histoires et d’expériences, mais surtout d’une façon particulière de les mettre en relation.',
  ],
  emphasis: 'Il ne s’agit pas de tout savoir.',
  closing: 'Il s’agit de reconnaître ce qui mérite d’être apporté au feu maintenant.',
  stats: [
    { value: '37 ans', label: 'à explorer l’Ayurveda, les plantes, la cuisine, les saisons et les rythmes du corps' },
    { value: '3 livres', label: 'publiés' },
    { value: '3 saisons', label: 'de l’émission Santé la vie à MATV' },
  ],
  photoCaption: 'Krystine St-Laurent',
};

// SECTION 8 · Votre attention
export const SECTION8 = {
  eyebrow: 'Une année composée avec intention',
  title: 'Votre attention est votre monnaie d’échange la plus précieuse',
  subtitle: 'Elle porte un pouvoir de création immense.',
  situations: [
    'Vous prononcez le mot « stress » dans une conversation. Un peu plus tard, une série de publicités apparaît.',
    'Vous vous arrêtez quelques secondes sur une vidéo. Le même sujet commence à vous suivre pendant des semaines.',
    'Vous cherchez une réponse simple. Vous recevez des protocoles, des produits et des experts qui se contredisent.',
  ],
  consequenceTitle: 'Conséquence',
  consequence: [
    'À force d’être sollicitée, observée et orientée, il devient difficile de distinguer le vrai du faux, de reconnaître ce qui mérite notre confiance et de savoir si un nouvel élan vient réellement de nous.',
    'Nous accumulons. Nous enregistrons pour plus tard. Nous hésitons. Nous repoussons certaines décisions. Notre capacité à découvrir se retrouve peu à peu enfermée dans ce que les plateformes ont déjà prévu de nous montrer.',
  ],
  protectionTitle: 'Le Foyer protège une autre qualité d’attention',
  protection: [
    'Chaque élément du Foyer possède une place, un moment et une raison d’être.',
    'La recherche, le choix, la mise en contexte et la composition sont portés à l’intérieur du Foyer. Vous pouvez recevoir ce qui s’ouvre, explorer ce qui vous appelle et décider de ce que vous souhaitez laisser entrer dans votre vie.',
  ],
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
  price: '497 $ CA',
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
  price: '497 $ CAD',
  priceLines: ['Douze mois d’accès', 'Garantie cœur léger de quinze jours'],
  cta: 'Prendre place autour du feu',
};
