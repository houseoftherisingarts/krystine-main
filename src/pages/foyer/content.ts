// Le Foyer d'Origine — copie VERBATIM extraite de foyer-copy.txt (17 août 2026).
// Sections 2 à 9 + FAQ (corps de page). Hero, préloader et route vivent ailleurs.
// Les sauts de ligne du PDF ont été refondus en phrases/paragraphes complets ;
// aucun mot n'a été ajouté, retiré ou reformulé.

export interface TitledBlock {
  title: string;
  body: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export const SECTION2 = {
  eyebrow: 'Une autre façon de choisir',
  title: 'Une autre façon de choisir ce qui entre',
  lead: 'Nous avons appris à trier. À comparer. À enregistrer pour plus tard. À chercher encore.',
  question: 'Mais comment chercher ce que nous ne savons pas encore nommer?',
  statement: 'Le Foyer commence là.',
  body: 'Ce qui entre dans cet espace a été choisi par une personne. Regardé avec attention. Replacé dans un ensemble plus vaste.',
  pullQuote: 'Le choix n’est que le premier geste. La véritable valeur se trouve dans les liens qui apparaissent ensuite.',
  list: [
    'Entre nourrir et soigner.',
    'Entre le corps et la conscience.',
    'Entre la science et la sagesse.',
    'Entre une plante, une œuvre, une idée, une saison, une voix ou une pratique que rien ne semblait réunir.',
  ],
  closing: 'Jusqu\'à ce que le lien apparaisse.',
};

export const SECTION3 = {
  eyebrow: 'Un rythme, pas une obligation',
  title: 'Une place pour être bien pendant que le monde bouge',
  paragraphs: [
    'Le Foyer d’Origine n’est pas une formation à compléter.',
    'C’est une place où revenir.',
    'Comme autour d’un feu commun, chacun peut s\'approcher à sa façon. Ouvrir ce qui attire. Laisser passer ce qui appelle moins. Revenir quand le moment est juste.',
    'On y retrouve un rythme reconnaissable, la présence des autres et le plaisir de découvrir quelque chose que nous n’aurions jamais rencontré seuls.',
  ],
  closing: 'On vient s’y faire chauffer le cœur.',
};

export const SECTION4 = {
  eyebrow: 'Le rythme du mois',
  title: 'Chaque semaine, une nouvelle ouverture',
  intro: 'Le mois n’est pas un sujet découpé en quatre leçons. Il se déploie. Chaque semaine change la perspective.',
  openings: [
    {
      title: 'Regarder autrement',
      body: 'Une idée, une question ou une préoccupation actuelle mérite que nous nous y arrêtions.',
    },
    {
      title: 'Entrer dans la saison',
      body: 'Une plante, un ingrédient, une recette, une pratique ou un savoir ayurvédique nous rapproche du moment que nous traversons.',
    },
    {
      title: 'Découvrir une pièce choisie',
      body: 'Un livre, une œuvre, une personne, une émission ou une voix entre dans Le Foyer parce qu’elle mérite notre attention.',
    },
    {
      title: 'Suivre une découverte récente',
      body: 'Un lieu, une conversation, une expérience ou un savoir-faire ouvre une direction inattendue.',
    },
  ] satisfies TitledBlock[],
  closing: 'Les liens ne sont pas toujours ceux que nous aurions faits nous-mêmes. C’est précisément ce qui donne au mois sa profondeur.',
};

export const SECTION5 = {
  eyebrow: 'Ce que ça change',
  title: 'Ce que Le Foyer rend possible',
  items: [
    {
      title: 'Sortir de la répétition',
      body: 'Les algorithmes nous montrent davantage de ce que nous connaissons déjà. Le Foyer introduit ce qui n’était pas encore dans notre champ de vision.',
    },
    {
      title: 'Découvrir l’inattendu',
      body: 'Une œuvre mène vers une plante. Une conversation éclaire une idée ancienne. Une saison change la façon d’approcher une pratique.',
    },
    {
      title: 'Élargir notre manière de voir',
      body: 'Chaque élément entre dans un ensemble. Le lien révèle ce que l’élément seul ne montrait pas.',
    },
    {
      title: 'Retrouver un rythme humain',
      body: 'Une ouverture à la fois. Un mois qui respire. Une place qui demeure accessible.',
    },
    {
      title: 'Appartenir sans avoir à performer',
      body: 'Il est possible d’être présent sans devoir commenter, publier ou se montrer.',
    },
    {
      title: 'Choisir librement',
      body: 'Tout ouvrir. Choisir une seule pièce. Revenir plus tard. Le Foyer s’adapte à la place disponible.',
    },
    {
      title: 'Être bien pendant que le monde bouge',
      body: 'Le monde peut continuer d’accélérer. Nous pouvons choisir une autre fréquence.',
    },
  ] satisfies TitledBlock[],
};

export const SECTION6 = {
  eyebrow: 'Un temps commun',
  title: 'Le premier samedi du mois',
  subtitle: 'Un temps commun pour habiter ce qui vient de s\'ouvrir',
  paragraphs: [
    'Le premier samedi de chaque mois actif, une méditation guidée en direct rassemble les membres du Foyer.',
  ],
  emphasis: 'Ce rendez-vous donne un autre rythme au mois. Il crée une véritable pause.',
  closingParagraphs: [
    'Un moment partagé pour se déposer, revenir à soi et laisser les liens faire leur chemin.',
    'Chaque méditation demeure accessible en reprise.',
  ],
};

export const SECTION7 = {
  eyebrow: 'La signature du Foyer',
  title: 'Ce qui relie les étoiles',
  lead: 'Choisir une œuvre ou recommander un livre ne suffit pas.',
  emphasis: 'La singularité du Foyer repose sur la capacité de Krystine St-Laurent à reconnaître des liens là où les disciplines ont créé des séparations.',
  paragraphs: [
    'Depuis 37 ans, elle explore les plantes, l\'Ayurveda, la cuisine, les saisons, les rythmes du corps, les grandes questions humaines et les savoirs qui traversent le temps.',
    'Trois livres et près de 1 200 pages. Des années d’émissions, d’entrevues, de podcasts, de conférences, de lectures, de voyages et de conversations.',
    'Une immense réserve de matière.',
  ],
  subhead: 'Mais surtout, une grille profondément personnelle',
  questions: [
    'Qu’est-ce qui mérite d’être regardé maintenant?',
    'Quel pont permet-il d’ouvrir?',
    'Pourquoi maintenant?',
    'Qu’est-ce que ce lien permet de voir que l’élément seul ne montrait pas?',
  ],
  paragraph2: 'Le Foyer ne donne pas accès à une accumulation de recommandations.',
  closing: 'Il donne accès à une manière rare de relier le monde.',
  stats: [
    { value: '37 ans', label: 'à explorer les plantes, l\'Ayurveda, la cuisine, les saisons et les rythmes du corps' },
    { value: '3 livres', label: 'près de 1 200 pages' },
  ],
  photoCaption: 'Krystine St-Laurent',
};

export const SECTION8 = {
  eyebrow: 'Ce qui est inclus',
  title: 'Ce que comprend l’année',
  season: {
    title: 'De septembre à juin',
    openings: [
      'Quatre ouvertures par mois, en texte, en audio ou en vidéo',
      'Dix méditations guidées en direct',
      'Les reprises de chaque méditation',
      'Un rythme hebdomadaire simple et reconnaissable',
    ],
    spaceTitle: 'Un espace privé en ligne',
    space: [
      'Aucun fil infini',
      'Aucune publicité',
      'Aucune recommandation automatisée',
      'L\'accès aux pièces déjà déposées dans Le Foyer',
    ],
  },
  summer: {
    title: 'En juillet et en août',
    text: 'Le rythme s\'allège. Une proposition spéciale est offerte chaque mois pour accompagner l’été, sans rendez-vous en direct promis.',
  },
  yearRound: {
    title: 'Pendant toute l’année',
    text: 'Chaque pièce se suffit à elle-même. Il n’existe aucun ordre obligatoire. Le mois en cours est toujours la meilleure porte d’entrée.',
  },
};

export const SECTION9 = {
  eyebrow: 'Deux espaces, une même maison',
  title: 'Le Foyer d’Origine et l\'Expérience Origine',
  foyer: {
    lead: 'Le Foyer ouvre.',
    text: 'Il offre un lieu d’exploration, un rythme, des découvertes et de nouvelles relations entre des mondes que nous avions appris à separer. Nous y circulons librement.',
  },
  experience: {
    lead: 'L’Expérience Origine accompagne.',
    text: 'C’est un parcours signature structuré de transformation personnelle, avec des enseignements, des outils, des rendez-vous et un accompagnement soutenu.',
  },
  bridgeLead: 'Un même sujet peut traverser les deux espaces. Sa fonction change.',
  bridgeBody: 'Dans Le Foyer, nous le découvrons. Dans l\'Expérience Origine, nous apprenons à l\'observer, à l’expérimenter et à l’intégrer dans notre propre vie.',
};

export const FAQ: FaqItem[] = [
  {
    q: 'Est-ce une formation?',
    a: 'Non. Il n’y a ni modules à suivre ni progression obligatoire. Chaque pièce peut être découverte seule.',
  },
  {
    q: 'Dois-je être présente chaque semaine?',
    a: 'Non. Le rythme est là pour soutenir l’expérience, jamais pour créer une obligation.',
  },
  {
    q: 'Que se passe-t-il si je manque une méditation?',
    a: 'Les méditations demeurent accessibles en reprise.',
  },
  {
    q: 'Dois-je participer aux échanges?',
    a: 'La participation est libre. Il est possible de lire, d’écouter et de découvrir sans devoir prendre la parole.',
  },
  {
    q: 'Le podcast devient-il réservé aux membres?',
    a: 'Non. Le podcast demeure public. Certaines conversations peuvent être reprises dans Le Foyer pour être replacées dans un ensemble plus vaste.',
  },
  {
    q: 'Puis-je commencer en cours d’année?',
    a: 'Oui. Le mois en cours constitue toujours le point d’entrée. Il n’y a rien à reprendre avant de commencer.',
  },
  {
    q: 'Est-ce la même chose que l\'Expérience Origine?',
    a: 'Non. Le Foyer est un espace d’exploration libre. L’Expérience Origine est un parcours signature accompagné de transformation.',
  },
];
