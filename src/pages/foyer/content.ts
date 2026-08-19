// Le Foyer d'Origine · copie VERBATIM extraite de foyer-copy.txt (17 août 2026).
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

// SECTION 2 refondue le 19 août 2026 (PDF « SECTION HERO ») : L'Histoire du feu.
export const SECTION2 = {
  eyebrow: 'L’histoire du feu',
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

// SECTION 3 refondue le 19 août 2026 (PDF « SECTION HERO »).
export const SECTION3 = {
  eyebrow: 'Un rythme régulier, sans obligations',
  title: 'Le feu reste allumé, semaine après semaine',
  paragraphs: [
    'Chaque semaine, quelque chose de précis est apporté au Foyer : une histoire à écouter, une plante à découvrir, un ingrédient à cuisiner, un livre à ouvrir ou une question à regarder autrement.',
    'En texte, en audio ou en vidéo, nous découvrons d’où cela vient, pourquoi cela mérite notre attention maintenant et ce que cela peut changer dans notre manière de voir.',
    'De septembre à juin, le premier samedi du mois, une méditation guidée en direct nous rassemble autour du feu. Chaque rencontre demeure accessible en reprise.',
    'Il n’y a ni modules à suivre ni progression à compléter.',
    'Vous pouvez rejoindre ce qui est partagé cette semaine ou revenir plus tard. Vous n’avez rien à rattraper, rien à publier et rien à prouver.',
  ],
  closing: 'On ne suit pas Le Foyer. On y revient.',
};

// Titre du PDF du 19 août; le reste de la section est marqué « À COMPLÉTER »
// dans le PDF : les ouvertures existantes restent en place en attendant la copie.
export const SECTION4 = {
  eyebrow: 'Le rythme du mois',
  title: 'Un mois autour du feu',
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
  title: 'Le Foyer et l’Expérience',
  foyer: {
    lead: 'Le Foyer ouvre.',
    text: 'Il offre un lieu d’exploration, un rythme, des découvertes et de nouvelles relations entre des mondes que nous avions appris à séparer. Nous y circulons librement.',
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
