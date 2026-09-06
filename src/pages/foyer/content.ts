// Le Foyer d'Origine · copie VERBATIM du doc « MAJ 10 AM 24 AOÛT finale FOYER » (24 août 2026).
// Une seule version de chaque section. Aucun mot ajouté, retiré ou reformulé.

export interface TitledBlock {
  title: string;
  body: string;
}

export interface FaqItem {
  q: string;
  a: string[];
}

// SECTION 2 · Le hook, puis l'entrée dans Le Foyer
export const BIENVENUE = {
  title: 'Notre attention est prise en otage.',
  paragraphs: [
    'Nous n’avons jamais eu accès à autant de contenu.',
    'Chaque jour, les plateformes, les tendances et les algorithmes orientent ce que nous regardons, ce que nous lisons et ce que nous écoutons.',
    'Plus quelque chose retient notre attention, plus ils nous en montrent.',
  ],
  kicker: 'Plus on nous montre, moins on voit.',
  eyebrow: 'Le Foyer d’Origine',
  promise: 'Une année pour découvrir l’inattendu et relier des mondes que nous avons appris à voir séparément.',
  body: 'Dans un monde où les algorithmes nous ramènent sans cesse vers ce que nous avons déjà regardé, Le Foyer fait l’inverse. Il fait entrer autre chose dans notre champ de vision et dans nos sens.',
  marks: ['Douze portes.', 'Dix méditations en direct.', '12 mois d’accès'],
  cta: 'Prendre place autour du feu',
};

// SECTION 3 · L'histoire du feu
export const SECTION2 = {
  eyebrow: 'Il était une fois',
  title: 'L’histoire du feu',
  lead: 'À Varanasi, une flamme brûle sans interruption depuis plus de deux mille cinq cents ans.',
  paragraphs: [
    'Jour et nuit, des familles se transmettent la responsabilité de veiller sur elle pour que sa lumière ne s’éteigne pas.',
    'Autour du feu, on se rassemble. Les anciens racontent. Les enfants écoutent.',
  ],
  // les mots en gras du doc : le nom, puis le mouvement humain
  closingLead: 'Le Foyer d’Origine',
  closingMid: ' porte ce même mouvement humain : ',
  closingEnd: 'se rassembler, se nourrir et garder vivant ce qui compte assez pour ne pas être oublié.',
};

// SECTION 4 · Les douze portes
export const PORTES_INTRO = {
  title: 'Douze portes à ouvrir… une par mois',
  cta: 'Prendre place autour du feu',
};

// SECTION 5 · Une année nourrie
export const SECTION5 = {
  eyebrow: 'Au fil des mois',
  title: 'Une année nourrie par l’Ayurveda, les saisons, les plantes, les œuvres et les savoirs',
  intro: 'Au fil des mois, nous rencontrons des matières différentes et faisons des liens entre elles.',
  items: [
    'Une plante peut nous faire remarquer une saison autrement.',
    'Une œuvre peut éclairer une question actuelle.',
    'Un savoir ancien peut donner un autre angle à quelque chose que nous vivons aujourd’hui.',
  ],
  rhythmLead: 'Chaque semaine,',
  rhythm: ' une nouvelle ouverture est proposée, en texte, en audio ou en vidéo.',
  meditations:
    'De septembre à juin, dix méditations guidées sont offertes en direct et demeurent accessibles en rediffusion pendant vos 12 mois d’accès.',
  keep: 'Certaines découvertes passent. D’autres restent avec nous, nous touchent ou changent simplement notre manière de regarder quelque chose.',
  receiveTitle: 'Recevoir à sa manière.',
  receive: 'Lire. Écouter. Regarder. Cuisiner. Méditer. Revenir.',
  release: 'Rien à rattraper, rien à publier, rien à prouver.',
  closing: 'On ne suit pas Le Foyer. On y revient.',
};

// SECTION 6 · Le regard qui compose Le Foyer
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
  bridge:
    'C’est de là que viennent les matières, les œuvres, les plantes, les savoirs et les rencontres qui entrent dans Le Foyer.',
  emphasis: 'Il ne s’agit pas de tout savoir.',
  closing: 'Il s’agit de reconnaître ce qui mérite d’être apporté au feu maintenant.',
  photoCaption: 'Krystine St-Laurent',
};

// SECTION 7 · Ce que l'année contient
export const CONTENU = {
  eyebrow: 'Ce que l’année contient',
  title: '12 portes · 48 ouvertures au fil de l’année',
  stats: [
    { n: '12', label: 'portes' },
    { n: '48', label: 'ouvertures au fil de l’année' },
    { n: '12', label: 'fiches à conserver' },
    { n: '10', label: 'méditations en direct' },
  ],
  intro: [
    'Chaque mois, une nouvelle porte nous entraîne ailleurs que dans ce qu’on nous montre déjà.',
    'Puis, semaine après semaine, quatre nouvelles ouvertures viennent élargir ce que nous regardons, nous faire remarquer ce que nous ne voyions plus, créer des liens inattendus et laisser certaines choses nous toucher autrement.',
    'Ces 48 ouvertures peuvent puiser dans l’Ayurveda, l’herboristerie, l’aromathérapie, les saisons, la cuisine, les œuvres, les livres, les recherches, les personnes et les pratiques.',
  ],
  equation: '12 portes × 4 ouvertures = 48 occasions,',
  equationSub: 'au fil de l’année, de sortir de nos habitudes de regard.',
  items: [
    {
      title: '12 fiches à conserver',
      body: 'Une fiche par mois pour garder à portée de main les repères, références et découvertes essentielles du Foyer.',
    },
    {
      title: '10 méditations guidées en direct',
      body: 'De septembre à juin, avec leurs rediffusions accessibles pendant toute l’édition.',
    },
    {
      title: 'Accès aux rediffusions du contenu',
      body: 'Tout le contenu du Foyer demeure accessible en tout temps dans Circle pendant l’édition.',
    },
    {
      title: 'Un espace privé',
      body: 'Un lieu pour retrouver ce qui entre dans Le Foyer et échanger lorsque nous en avons envie, sans publicité externe ni recommandations automatisées.',
    },
    {
      title: 'Un accès prioritaire',
      body: 'Aux annonces d’Expérience Origine, des retraites, conférences et événements de l’univers KSL.',
    },
    {
      title: 'Une édition complète',
      body: '12 mois d’accès à partir de l’inscription.',
    },
  ],
  bonisTitle: 'Bonis',
  bonis: [
    {
      title: 'Boni 1 · La saison 2 du podcast Au-delà des tendances',
      body: 'Tous les épisodes de la saison 2 réunis dans la plateforme.',
    },
    {
      title: 'Boni 2 · Les saisons 1 et 2 de Santé la vie',
      body: '20 émissions réunies dans les archives du Foyer, à découvrir ou à revoir.',
    },
  ],
};

// SECTION 9 · L'offre
export const OFFRE = {
  eyebrow: 'L’offre',
  title: 'Le Foyer d’Origine',
  subtitle: 'Début le 1er octobre · 12 mois d’accès à partir de l’inscription',
  items: [
    '12 portes',
    '48 ouvertures au fil de l’année',
    '12 fiches à conserver',
    '10 méditations guidées en direct',
    'Accès aux rediffusions et aux contenus dans Circle pendant toute l’édition',
    'Un espace privé',
    'Un accès prioritaire aux annonces de l’univers KSL',
  ],
  bonis: [
    { title: 'Boni 1', body: 'La saison 2 du podcast Au-delà des tendances, réunie dans la plateforme.' },
    { title: 'Boni 2', body: 'Les saisons 1 et 2 de Santé la vie : 20 émissions à découvrir ou à revoir.' },
  ],
  priceRegular: '597 $ CA',
  price: '497 $ CA',
  priceNote: 'Prix de lancement',
  paymentLines: [
    'Paiement complet par carte de crédit.',
    'Options de paiement disponibles.',
    'Garantie cœur léger de 15 jours.',
  ],
  cta: 'Prendre place autour du feu',
};

// SECTION 10 · Questions fréquentes
export const FAQ: FaqItem[] = [
  {
    q: 'Est-ce que le contenu du podcast, du Foyer et d’Expérience Origine est le même?',
    a: [
      'Non. Les trois appartiennent au même univers, mais chacun a son propre contenu et sa propre fonction.',
      'Le podcast Au-delà des tendances rend visible ce qui nous dirige sans avoir été consciemment choisi et révèle le coût caché des modes et des tendances actuelles.',
      'Le Foyer d’Origine prend place dans un monde où notre attention est prise en otage, où les algorithmes décident en boucle ce que nous voyons, ce qui nous est recommandé et les publicités qui nous suivent, nous ramenant toujours vers ce qui ressemble à ce que nous avons déjà regardé.',
      'Le Foyer fait l’inverse. Il fait volontairement entrer autre chose dans notre champ de vision et dans nos sens : Ayurveda, plantes, livres, œuvres, saisons et savoirs que nous n’aurions probablement pas pensé chercher ou relier ainsi. Il élargit ce que nous rencontrons, ce que nous remarquons et ce que nous ressentons.',
      'Expérience Origine contient ses propres enseignements, outils, pratiques et méditations, organisés dans une traversée structurée de 12 semaines : Lire · Trier · Ancrer. Elle comprend aussi des lives d’approfondissement avec Krystine, où les participantes peuvent poser leurs questions, recevoir ses réponses et approfondir ce qui se présente dans leur propre réalité.',
    ],
  },
  {
    q: 'Le Foyer d’Origine est-il seulement pour les femmes?',
    a: [
      'Non. Le Foyer est ouvert à toute personne qui se reconnaît dans cette façon de découvrir, de relier et d’élargir ce qui entre dans son champ de vision.',
    ],
  },
  {
    q: 'Y aura-t-il un lieu d’échange?',
    a: [
      'Oui. Un espace privé dans Circle permet de retrouver le contenu du Foyer et d’échanger avec les autres personnes présentes.',
      'La participation demeure entièrement libre. Rien n’oblige à publier, commenter ou raconter son histoire.',
    ],
  },
  {
    q: 'Est-ce une formation?',
    a: [
      'Non. Il n’y a ni modules à compléter ni progression à suivre.',
      'Chaque semaine, une nouvelle ouverture est proposée. Nous pouvons lire, écouter, regarder, cuisiner, méditer, laisser passer ou revenir selon notre temps et notre intérêt.',
    ],
  },
  {
    q: 'Puis-je entrer dans Le Foyer en cours d’année?',
    a: [
      'Oui.',
      'En entrant en cours d’année, vous accédez immédiatement à tout ce qui a déjà été déposé dans cette édition, puis aux nouvelles ouvertures jusqu’en août 2027.',
      'Votre accès demeure actif pendant 12 mois à partir de votre inscription.',
    ],
  },
  {
    q: 'Aurai-je accès aux dix méditations?',
    a: [
      'Oui. Dix méditations guidées sont offertes en direct, de septembre à juin.',
      'Si vous entrez en cours d’année, vous pouvez retrouver les méditations précédentes en rediffusion et participer aux prochains rendez-vous en direct, s’il en reste à venir.',
    ],
  },
  {
    q: 'Que se passe-t-il si je manque une méditation ou une ouverture?',
    a: [
      'Rien à rattraper.',
      'Les méditations et les contenus déposés restent accessibles dans Circle pendant la durée de votre accès. Vous pouvez y revenir lorsque vous le souhaitez.',
    ],
  },
  {
    q: 'Dois-je être présente chaque semaine?',
    a: [
      'Non.',
      'Le rythme hebdomadaire permet au Foyer de rester en mouvement, mais il n’y a aucune obligation de suivre chaque ouverture au moment où elle paraît.',
      'On ne suit pas Le Foyer. On y revient.',
    ],
  },
  {
    q: 'Dois-je participer aux échanges ou raconter mon histoire?',
    a: [
      'Non.',
      'Aucune publication, prise de parole ou histoire personnelle n’est demandée.',
      'Vous pouvez participer, lire en silence, assister aux méditations ou simplement recevoir ce qui est proposé.',
    ],
  },
  {
    q: 'Le podcast devient-il réservé aux personnes du Foyer?',
    a: [
      'Non. Au-delà des tendances demeure public.',
      'En boni, les épisodes de la saison 2 sont aussi réunis dans la plateforme du Foyer afin de pouvoir les retrouver facilement.',
    ],
  },
  {
    q: 'Les retraites, conférences et Expérience Origine sont-elles incluses?',
    a: [
      'Non. Ces expériences sont offertes séparément.',
      'Les personnes du Foyer bénéficient toutefois d’un accès prioritaire aux annonces concernant Expérience Origine, les retraites, conférences et événements de l’univers KSL.',
    ],
  },
  {
    q: 'Que se passe-t-il après août 2027 si mon accès de douze mois n’est pas terminé?',
    a: [
      'Vous conservez l’accès au contenu de cette édition dans Circle jusqu’à la fin de vos douze mois d’accès.',
      'Les nouvelles ouvertures de cette édition se terminent en août 2027, mais les contenus déjà déposés demeurent accessibles pendant la durée restante de votre accès.',
    ],
  },
  {
    q: 'Mon accès se renouvelle-t-il automatiquement?',
    a: [
      'Non. Aucun renouvellement automatique n’est prévu.',
      'Si une nouvelle édition du Foyer est proposée, vous pourrez recevoir une invitation à y prendre place.',
    ],
  },
  {
    q: 'Comment fonctionne la Garantie cœur léger?',
    a: [
      'La garantie commence le jour de votre inscription.',
      'Vous disposez de 15 jours pour découvrir Le Foyer, son contenu et son espace privé.',
      'Si vous choisissez de ne pas poursuivre, il suffit de nous écrire avant la fin de cette période. Votre accès sera fermé et votre achat remboursé.',
    ],
  },
];

// SECTION 11 · Prendre place autour du feu
export const FINAL = {
  title: 'Plus on nous montre, moins on voit.',
  emphasis: 'Le Foyer d’Origine est une année pour faire entrer autre chose dans notre champ de vision.',
  lines: [
    'Pour découvrir ce que nous n’aurions probablement pas rencontré seuls.',
    'Pour relier ce que nous avions appris à regarder séparément.',
    'Pour rester capables d’être surpris, touchés et déplacés par autre chose que ce qui nous est déjà servi.',
  ],
  closing: '12 portes. 48 ouvertures. Une année autour du même feu.',
  callout: 'Prendre place autour du feu',
  priceRegular: '597 $ CA',
  price: '497 $ CA',
  priceNote: 'Prix de lancement',
  priceLines: ['Garantie cœur léger de 15 jours'],
  cta: 'Prendre place autour du feu',
};
