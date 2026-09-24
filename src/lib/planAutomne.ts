// Le plan d'automne 2026 de Krystine, repris mot pour mot de l'infographie
// « KSL AUTOMNE 2026 » (Onyx › 10_projects/krystine/plan-ksl-automne-2026-infographie.jpg).
// Ce fichier ne porte que le texte et les couleurs du plan : l'état coché, les
// mesures de succès et les résultats vivent dans Firestore (planAutomne/2026),
// pour que Krystine puisse tout modifier elle-même sans qu'on touche au code.
//
// Les identifiants sont stables et ne se renomment jamais : c'est par eux que
// Firestore retrouve une case cochée. c1.a1 est la première action clé du
// premier chantier, p1.1 la première puce de la phase 1, t.1 la première étape
// de la frise de tournée, parc.1 le premier élément parké.
//
// Les tirets cadratins de l'infographie sont remplacés par un point médian ou
// deux points, et rien n'est en italique : c'est la règle de la maison.

export interface Cochable {
  id: string;
  texte: string;
}

export interface Chantier {
  id: string;
  numero: number;
  titre: string;
  sousTitre?: string;
  devise: string;
  icone: string;
  objectifs: string[];
  actions: Cochable[];
  pied: string;
  /** Mention entre parenthèses à côté de « ACTIONS CLÉS », s'il y en a une. */
  mentionActions?: string;
  couleurs: {
    /** Fond de la tête de colonne. */
    tete: string;
    /** Fond de la carte OBJECTIFS et de la carte ACTIONS CLÉS. */
    carte: string;
    /** Fond du bandeau de pied. */
    pied: string;
    /** Le rond du numéro, les puces, les intertitres. */
    accent: string;
    /** Le contour de la colonne. */
    bord: string;
  };
}

export interface Phase {
  id: string;
  titre: string;
  dates: string;
  intention: string;
  puces: Cochable[];
  couleurs: { tete: string; corps: string; texte: string };
}

export interface Axe {
  titre: string;
  sousTitre: string;
  icone: string;
}

export interface LigneEquipe {
  nom: string;
  role: string;
  couleur: string;
}

export interface ZoneTournee {
  drapeau: string;
  nom: string;
  puces: string[];
}

// ─── L'en-tête ───────────────────────────────────────────────────────────────

export const ENTETE = {
  marque: 'KSL',
  saison: 'AUTOMNE 2026',
  devise: 'FOCUS. IMPACT. LIBERTÉ.',
  sousDevise: 'Moins dans le faire. Plus dans l\'essentiel.',
  phrase: ['Une entreprise', 'qui me ressemble.', 'Un impact qui dépasse.'],
  souffle: ['Même mission.', 'Plus de souffle.'],
  citation: '« Bâtir aujourd\'hui ce qui me donne la liberté de demain. »',
  signature: 'Krystine',
  photo: '/plan-automne/entete.jpg',
};

export const AXES: Axe[] = [
  { titre: 'CRÉATION',   sousTitre: 'Manuscrit · Voix · Idées',          icone: 'fa-gem' },
  { titre: 'CROISSANCE', sousTitre: 'Expérience Origine',                icone: 'fa-chart-simple' },
  { titre: 'VISIBILITÉ', sousTitre: 'Médias · Conférences · Tournée',    icone: 'fa-users' },
  { titre: 'SYSTÈME',    sousTitre: 'Opérations · Équipe',               icone: 'fa-gear' },
  { titre: 'LIBERTÉ',    sousTitre: 'Famille · Lieux · Vie',             icone: 'fa-globe' },
];

export const VUE_ENSEMBLE = {
  titre: 'VUE D\'ENSEMBLE · 5 GRANDS CHANTIERS',
  periode: '15 SEPTEMBRE → 1 DÉCEMBRE 2026',
  apres: 'APRÈS DÉCEMBRE',
};

// ─── Les cinq chantiers ──────────────────────────────────────────────────────

export const CHANTIERS: Chantier[] = [
  {
    id: 'c1',
    numero: 1,
    titre: 'EXPÉRIENCE ORIGINE',
    sousTitre: 'Manuscrit · Croissance',
    devise: 'Vendre. Transformer. Rayonner.',
    icone: 'fa-bullseye',
    mentionActions: '(maintenant)',
    objectifs: [
      'Revenus avant le 1er décembre',
      'Lancement orchestré EO2',
      '4 parcours clientes',
      'Page, Stripe, onboarding',
      'Expérience mémorable',
    ],
    actions: [
      { id: 'c1.a1', texte: 'Finaliser l\'offre et les prix' },
      { id: 'c1.a2', texte: 'Créer les parcours clientes' },
      { id: 'c1.a3', texte: 'Mettre à jour la page de vente (Alex)' },
      { id: 'c1.a4', texte: 'Configurer Stripe et automatisations' },
      { id: 'c1.a5', texte: 'Planifier le calendrier de lancement' },
      { id: 'c1.a6', texte: 'Réactiver anciennes EO' },
      { id: 'c1.a7', texte: 'Tester achat complet' },
    ],
    pied: 'PRIORITÉ #1 · ARGENT',
    couleurs: { tete: '#f6ccd6', carte: '#fffbfa', pied: '#ba5e75', accent: '#9e3d57', bord: '#f3c3cf' },
  },
  {
    id: 'c2',
    numero: 2,
    titre: 'MANUSCRIT & IP',
    sousTitre: 'Création',
    devise: 'Écrire ce qui transforme.',
    icone: 'fa-book-open',
    objectifs: [
      'Révision par lots',
      'Préparer le terrain pour la sortie',
      'Aligner livre, talks et positionnement',
    ],
    actions: [
      { id: 'c2.a1', texte: 'Plan de révision par sections' },
      { id: 'c2.a2', texte: 'Rencontres éditoriales au besoin' },
      { id: 'c2.a3', texte: 'Intégrer les apprentissages récents' },
      { id: 'c2.a4', texte: 'Préparer les actifs de communication' },
      { id: 'c2.a5', texte: 'Identifier angles pour conférences' },
    ],
    pied: 'VOTRE ZONE DE GÉNIE',
    couleurs: { tete: '#bae0f7', carte: '#f4f9fd', pied: '#2e72a3', accent: '#1d5c8a', bord: '#b3d9f2' },
  },
  {
    id: 'c3',
    numero: 3,
    titre: 'VOIX PUBLIQUE & AUTORITÉ',
    devise: 'Inspirer. Influencer. Ouvrir des portes.',
    icone: 'fa-microphone',
    objectifs: [
      'Podcast + lettre en continu',
      'Clips en batch',
      'Tournée de conférences 2026-2027',
      'TEDxQuébec',
      'TCCHE et opportunités majeures',
      'Pipeline médias et booking',
    ],
    actions: [
      { id: 'c3.a1', texte: 'Enregistrer podcast (batch)' },
      { id: 'c3.a2', texte: 'Planifier contenus (1 thème/sem)' },
      { id: 'c3.a3', texte: 'Maintenir la lettre (hors de l\'ancien site)' },
      { id: 'c3.a4', texte: 'Construire le pipeline conférences' },
      { id: 'c3.a5', texte: 'Approcher TEDxQuébec' },
      { id: 'c3.a6', texte: 'Suivre TCCHE' },
      { id: 'c3.a7', texte: 'Préparer speaker kit' },
      { id: 'c3.a8', texte: 'Identifier et contacter nouvelles cibles' },
    ],
    pied: 'VISIBILITÉ = OPPORTUNITÉS',
    couleurs: { tete: '#c9eddf', carte: '#fbfdfc', pied: '#306a51', accent: '#26604a', bord: '#bfe6d6' },
  },
  {
    id: 'c4',
    numero: 4,
    titre: 'OPÉRATIONS & TECHNIQUE',
    devise: 'Un système qui soutient, pas qui épuise.',
    icone: 'fa-gear',
    objectifs: [
      'Site et pages qui fonctionnent',
      'Migration Vata + EO',
      'Parcours d\'achat fluide',
      'Expérience cliente solide',
      'Processus clairs',
    ],
    actions: [
      { id: 'c4.a1', texte: 'Liste des changements site (pour Alex)' },
      { id: 'c4.a2', texte: 'Vérifier fonctionnement des pages' },
      { id: 'c4.a3', texte: 'Configurer Stripe et accès (vous)' },
      { id: 'c4.a4', texte: 'Migrer courriels et anciens accès' },
      { id: 'c4.a5', texte: 'Tester parcours complet' },
      { id: 'c4.a6', texte: 'Documenter le service client' },
      { id: 'c4.a7', texte: 'Supprimer ancien lien 21 jours' },
    ],
    pied: 'FIABILITÉ = CROISSANCE',
    couleurs: { tete: '#d8d6ee', carte: '#f8f7fc', pied: '#7777a9', accent: '#565490', bord: '#cecbe6' },
  },
  {
    id: 'c5',
    numero: 5,
    titre: 'TOURNÉE DE CONFÉRENCES & SPEAKER',
    devise: 'Porter le message plus loin.',
    icone: 'fa-users',
    objectifs: [
      'Planifier la tournée 2026-2027',
      'TEDxQuébec (priorité)',
      'TCCHE et événements clés',
      'Conférences, entreprises, associations',
      'Book publicity (Tome 3)',
      'Québec, France, Belgique, international',
    ],
    actions: [
      { id: 'c5.a1', texte: 'Créer la liste des cibles (Dream 50/60)' },
      { id: 'c5.a2', texte: 'Définir disponibilité et calendrier' },
      { id: 'c5.a3', texte: 'Préparer le speaker kit (FR/EN)' },
      { id: 'c5.a4', texte: 'Approcher TEDxQuébec' },
      { id: 'c5.a5', texte: 'Approcher TCCHE' },
      { id: 'c5.a6', texte: 'Suivre les opportunités de talk' },
      { id: 'c5.a7', texte: 'Confirmer bookings et logistique' },
      { id: 'c5.a8', texte: 'Aligner avec la sortie du livre' },
    ],
    pied: 'PLUS DE SCÈNES, PLUS D\'IMPACT',
    couleurs: { tete: '#f8e5d7', carte: '#fdfcfa', pied: '#b68e5a', accent: '#9a6f3b', bord: '#f0dbc7' },
  },
];

// ─── Le calendrier de lancement ──────────────────────────────────────────────

export const CALENDRIER = {
  titre: 'CALENDRIER DE LANCEMENT · EXPÉRIENCE ORIGINE',
  citation: '"Des premières ventes maintenant, un grand élan en décembre."',
};

export const PHASES: Phase[] = [
  {
    id: 'p1', titre: 'PHASE 1', dates: '15 · 27 SEPTEMBRE', intention: 'Architecture + cash immédiat',
    puces: [
      { id: 'p1.1', texte: 'Offre, prix, parcours' },
      { id: 'p1.2', texte: 'Page de vente (Alex)' },
      { id: 'p1.3', texte: 'Stripe et setup (vous)' },
      { id: 'p1.4', texte: 'Calendrier maître' },
    ],
    couleurs: { tete: '#facfd9', corps: '#fef3f7', texte: '#8d3f55' },
  },
  {
    id: 'p2', titre: 'PHASE 2', dates: '28 SEPT. · 11 OCT.', intention: 'Réactivation des audiences',
    puces: [
      { id: 'p2.1', texte: 'Anciennes EO' },
      { id: 'p2.2', texte: 'Liste email' },
      { id: 'p2.3', texte: 'Conversations & offres' },
      { id: 'p2.4', texte: 'Premières ventes' },
      { id: 'p2.5', texte: 'Tester et ajuster' },
    ],
    couleurs: { tete: '#fcd7df', corps: '#fef5f8', texte: '#8d3f55' },
  },
  {
    id: 'p3', titre: 'PHASE 3', dates: '12 · 25 OCTOBRE', intention: 'Nurture organisé',
    puces: [
      { id: 'p3.1', texte: 'Podcast, lettre, clips' },
      { id: 'p3.2', texte: 'Page, FAQ, témoignages' },
      { id: 'p3.3', texte: 'Emails et automatisations' },
      { id: 'p3.4', texte: 'Onboarding' },
    ],
    couleurs: { tete: '#fbdae3', corps: '#fffdfe', texte: '#8d3f55' },
  },
  {
    id: 'p4', titre: 'PHASE 4', dates: '26 OCT. · 8 NOV.', intention: 'Découverte / acquisition',
    puces: [
      { id: 'p4.1', texte: 'Événement live ou série' },
      { id: 'p4.2', texte: 'Attirer nouvelles clientes' },
      { id: 'p4.3', texte: 'Convertir les tièdes' },
      { id: 'p4.4', texte: 'Système de suivi' },
    ],
    couleurs: { tete: '#fce1e8', corps: '#fffdfe', texte: '#8d3f55' },
  },
  {
    id: 'p5', titre: 'PHASE 5', dates: '9 · 22 NOVEMBRE', intention: 'Pré-lancement',
    puces: [
      { id: 'p5.1', texte: 'Séquence de lancement' },
      { id: 'p5.2', texte: 'Preuves et histoires' },
      { id: 'p5.3', texte: 'Questions et objections' },
      { id: 'p5.4', texte: 'Tout tester et finaliser' },
    ],
    couleurs: { tete: '#fcddd8', corps: '#fefaf9', texte: '#8d4b46' },
  },
  {
    id: 'p6', titre: 'PHASE 6', dates: '23 · 27 NOV.', intention: 'Tallinn',
    puces: [
      { id: 'p6.1', texte: 'En pilote automatique' },
      { id: 'p6.2', texte: 'Emails programmés' },
      { id: 'p6.3', texte: 'Support géré' },
      { id: 'p6.4', texte: 'Aucun gros changement' },
    ],
    couleurs: { tete: '#b6e0f6', corps: '#f6fbff', texte: '#1d5c8a' },
  },
  {
    id: 'p7', titre: 'PHASE 7', dates: '28 NOV. · 1ER DÉC.', intention: 'Ouverture principale',
    puces: [
      { id: 'p7.1', texte: 'Lancement EO2' },
      { id: 'p7.2', texte: 'Lives si besoin' },
      { id: 'p7.3', texte: 'Suivi et relances' },
      { id: 'p7.4', texte: 'Accueillir les nouvelles clientes' },
    ],
    couleurs: { tete: '#fdedd4', corps: '#fdfcf8', texte: '#9a6f3b' },
  },
];

// ─── Équipe, tournée, parké ──────────────────────────────────────────────────

export const EQUIPE_TITRE = 'ÉQUIPE & RESPONSABILITÉS (ACTUEL)';

export const EQUIPE: LigneEquipe[] = [
  {
    nom: 'KRYSTINE',
    role: 'Décisions · Message · Expérience EO · Podcast/Lettre · Manuscrit · Grandes décisions (+ temporairement Stripe, automatisations, coordination)',
    couleur: '#f0d7db',
  },
  {
    nom: 'ALEX',
    role: 'Site · Pages · Affichage · Liens · Fonctionnement du site · Corrections web',
    couleur: '#c9e5fa',
  },
  {
    nom: 'MARC',
    role: 'À définir (retour à préciser) · Aucun rôle critique pour le lancement à ce stade',
    couleur: '#cde8f9',
  },
  {
    nom: 'POSTE À COMBLER',
    role: 'Launch / Operations · Speaker / PR / Booking · Customer Experience',
    couleur: '#fcf4df',
  },
];

export const TOURNEE_TITRE = 'TOURNÉE DE CONFÉRENCES 2026 · 2027';

export const TOURNEE_ZONES: ZoneTournee[] = [
  { drapeau: '🌎', nom: 'QUÉBEC',        puces: ['TEDxQuébec', 'Entreprises', 'Associations', 'Événements locaux'] },
  { drapeau: '🇫🇷', nom: 'FRANCE',        puces: ['Conférences', 'Médias', 'Événements clés'] },
  { drapeau: '🇧🇪', nom: 'BELGIQUE',      puces: ['Conférences', 'Partenariats', 'Réseaux FR'] },
  { drapeau: '🌍', nom: 'INTERNATIONAL', puces: ['TCCHE (priorité)', 'Conférences EN', 'Opportunités globales'] },
];

export const TOURNEE_FRISE: Cochable[] = [
  { id: 't.1', texte: 'Recherche cibles' },
  { id: 't.2', texte: 'Contacts et dossier' },
  { id: 't.3', texte: 'Envois et relances' },
  { id: 't.4', texte: 'Bookings et logistique' },
  { id: 't.5', texte: 'Tournée 2026-2027' },
];

export const PARKE_TITRE = ['CE QUI EST PARKÉ', '(POUR PLUS TARD)'];

export const PARKE: Cochable[] = [
  { id: 'parc.1', texte: 'Foyer d\'Origine' },
  { id: 'parc.2', texte: 'Gamification' },
  { id: 'parc.3', texte: 'Journal d\'Origine et anciens assets' },
  { id: 'parc.4', texte: 'Freedom Plan géographique détaillé' },
  { id: 'parc.5', texte: 'Nouveau programme' },
  { id: 'parc.6', texte: 'Refonte du positionnement' },
  { id: 'parc.7', texte: 'Expansion Pure Human' },
];

export const PIED_DE_PAGE = {
  marque: 'KSL',
  nom: 'KRYSTINE ST-LAURENT',
  phrase: 'Des femmes qui se choisissent changent le monde.',
  saison: 'AUTOMNE 2026',
};

// ─── Tous les items cochables, à plat ────────────────────────────────────────

/** L'ordre de lecture du plan : chantiers, phases, tournée, parké. */
export const TOUS_LES_ITEMS: Cochable[] = [
  ...CHANTIERS.flatMap(c => c.actions),
  ...PHASES.flatMap(p => p.puces),
  ...TOURNEE_FRISE,
  ...PARKE,
];

export const LIBELLE_ITEM: Record<string, string> = Object.fromEntries(
  TOUS_LES_ITEMS.map(i => [i.id, i.texte]),
);

// ─── Les mesures de succès proposées ─────────────────────────────────────────
// Cocher une case dit que la chose est faite. Ça ne dit pas qu'elle a marché.
// Chaque item porte donc une mesure de succès, préremplie ici et modifiable par
// Krystine dans l'admin. Les repères chiffrés viennent des sources listées plus
// bas; quand aucun repère public n'existe pour un geste, la mesure porte le mot
// « proposition » et reste à ajuster selon ses propres chiffres.

export const MESURES_DEFAUT: Record<string, string> = {
  // Chantier 1 · Expérience Origine
  'c1.a1': 'Prix, inclusions et garantie écrits et figés avant le 27 septembre, et trois personnes les redisent sans se tromper.',
  'c1.a2': 'Les 4 parcours existent sur papier, chacun avec sa promesse, son prix et sa durée, et chacun tient sur une page.',
  'c1.a3': 'La page charge sous 2,5 secondes au 75e centile sur mobile (seuil LCP de Google) et l\'abandon de panier reste sous 70 %, la moyenne mesurée sur 50 études.',
  'c1.a4': 'Un achat test passe de bout en bout sans intervention : paiement, reçu, accès ouvert, courriel de bienvenue reçu.',
  'c1.a5': 'Les 7 phases ont chacune leur date et leur responsable au 27 septembre, et aucune case du calendrier ne reste vide.',
  'c1.a6': 'Sur les trois premières lettres aux anciennes EO : clic au-dessus de 0,8 % des envoyés (médiane 2025 du secteur santé) et désabonnement sous 0,2 %.',
  'c1.a7': 'Trois achats tests complets réussis sans une seule erreur avant le 27 septembre, sur mobile et sur ordinateur.',

  // Chantier 2 · Manuscrit & IP
  'c2.a1': 'Un plan daté par section, et une cadence tenue 4 semaines de suite : la fourchette des auteurs professionnels va de 500 à 3 000 mots par jour de travail.',
  'c2.a2': 'Chaque rencontre repart avec une décision écrite, et un retour éditorial demandé arrive dans les 6 à 8 semaines d\'usage.',
  'c2.a3': 'Les passages réécrits sont nommés un par un. Proposition : aucune cadence de révision publique n\'existe, alors prenez votre propre médiane sur 4 semaines.',
  'c2.a4': 'Le dossier est complet (bio, photos, résumé, extraits) et chaque pièce s\'envoie telle quelle, sans retouche de dernière minute.',
  'c2.a5': 'Proposition : au moins 5 angles écrits, chacun relié à un chapitre et à un public nommé.',

  // Chantier 3 · Voix publique & autorité
  'c3.a1': 'Chaque épisode dépasse 27 écoutes en 7 jours, la médiane des balados mesurée par Buzzsprout, et l\'avance ne descend jamais sous 3 épisodes enregistrés.',
  'c3.a2': 'Proposition : 12 semaines de thèmes d\'avance au tableau, et aucune semaine sans thème d\'ici au 1er décembre.',
  'c3.a3': 'Par envoi : clic au-dessus de 0,8 % des envoyés, désabonnement sous 0,2 %, et plaintes pour pourriel toujours sous 0,1 %, le plafond de Gmail.',
  'c3.a4': '50 cibles dans la liste, chacune avec sa personne-contact nommée et sa date de relance inscrite.',
  'c3.a5': 'Candidature déposée et accusée. Comptez de 5 à 8 mois entre le dépôt et la scène, et de 2 % à 7 % de candidats retenus selon les TEDx qui publient leurs chiffres.',
  'c3.a6': 'Dossier déposé dans les délais annoncés, avec une relance datée au calendrier si le silence dépasse 6 semaines.',
  'c3.a7': 'Le kit part en un seul envoi, sans retouche, et un organisateur confirme qu\'il a reçu tout ce dont il avait besoin.',
  'c3.a8': 'Réponse au-dessus de 3,4 %, la moyenne du démarchage à froid en 2026. Proposition : aucun repère public n\'existe pour l\'approche de conférencières.',

  // Chantier 4 · Opérations & technique
  'c4.a1': 'Chaque demande porte un état visible, et aucune ne dort plus de 7 jours sans réponse.',
  'c4.a2': 'Toutes les pages clés passent les trois signaux de Google au 75e centile : LCP sous 2,5 s, INP sous 200 ms, CLS sous 0,1.',
  'c4.a3': 'Un paiement test réussit et l\'accès s\'ouvre tout seul, sans qu\'une main s\'en mêle nulle part dans la chaîne.',
  'c4.a4': 'Premier envoi au seul segment engagé, comme le recommandent les guides de migration : rebond sous 3 %, plaintes sous 0,1 %, et jamais 0,3 %.',
  'c4.a5': 'Le parcours complet passe au vert 9 fois sur 10 : le repère du métier pour une chaîne de tests est de 90 % de réussite.',
  'c4.a6': 'Proposition : les 10 questions les plus fréquentes ont leur réponse écrite, et deux personnes différentes répondent la même chose.',
  'c4.a7': 'Le lien ne mène plus nulle part, et aucune cliente n\'écrit à ce sujet dans les 30 jours qui suivent.',

  // Chantier 5 · Tournée de conférences & speaker
  'c5.a1': '50 à 60 cibles nommées, chacune avec sa personne-contact, son mois d\'approche et la raison pour laquelle elle est là.',
  'c5.a2': 'Vos dates libres sont au calendrier jusqu\'en juin 2027, et aucun engagement ne vient les chevaucher.',
  'c5.a3': 'Les deux versions partent sans retouche, et un organisateur anglophone confirme qu\'il a tout compris du premier coup.',
  'c5.a4': 'Candidature déposée et accusée. De 2 % à 7 % des candidats sont retenus selon les TEDx qui publient leurs chiffres, alors la mesure qui compte est le nombre de candidatures déposées.',
  'c5.a5': 'Dossier envoyé, réponse obtenue, et une relance datée si le silence dépasse 6 semaines.',
  'c5.a6': 'Proposition : aucune occasion ne reste sans suite plus de 7 jours, faute de repère public sur le rythme de suivi.',
  'c5.a7': 'Chaque engagement a son contrat, son cachet et son voyage réglés 30 jours d\'avance. La médiane du marché est de 2 500 $ US par conférence.',
  'c5.a8': 'Les dates de scène tombent dans les 8 semaines autour de la sortie du livre, et pas après.',

  // Phase 1 · Architecture + cash immédiat
  'p1.1': 'Le prix et les 4 parcours sont figés au 27 septembre, et plus personne ne les rediscute après cette date.',
  'p1.2': 'La page est en ligne et charge sous 2,5 secondes au 75e centile sur mobile, le seuil LCP de Google.',
  'p1.3': 'Un paiement test de 1 $ entre pour vrai, et le reçu part tout seul.',
  'p1.4': 'Les 7 phases ont chacune leur date et leur responsable, sans un seul trou.',

  // Phase 2 · Réactivation des audiences
  'p2.1': 'Ouverture au-dessus de 30 %, la médiane 2025 toutes catégories. Proposition : visez aussi 10 réponses personnelles sur le premier message.',
  'p2.2': 'La liste importée ne garde que les engagés : rebond sous 3 % et plaintes sous 0,1 % sur le premier envoi.',
  'p2.3': 'Proposition : 20 vraies conversations tenues, chacune close par une offre nommée, à réajuster sur votre médiane.',
  'p2.4': 'Les premières ventes entrent avant le 11 octobre, et vous savez de quel message vient chacune.',
  'p2.5': 'Une seule chose changée par semaine, mesurée sur le clic avant et après le changement.',

  // Phase 3 · Nurture organisé
  'p3.1': 'Chaque épisode dépasse 27 écoutes en 7 jours et chaque lettre garde son clic au-dessus de 0,8 % des envoyés.',
  'p3.2': 'La FAQ répond aux questions qui reviennent vraiment, et les mêmes objections cessent d\'arriver par courriel.',
  'p3.3': 'Les séquences automatiques tiennent leur promesse : clic au-dessus de 4,6 %, la médiane 2025 des courriels automatisés.',
  'p3.4': 'Chaque nouvelle cliente reçoit son accès en moins d\'une heure, sans un seul courriel de rappel de sa part.',

  // Phase 4 · Découverte et acquisition
  'p4.1': 'Présence en direct au-dessus de 47,7 % des inscrits, la moyenne 2025, et le replay reste en accès libre : il récolte alors environ 3,7 fois plus de vues.',
  'p4.2': 'Proposition : les nouvelles inscriptions dépassent les désabonnements chaque semaine d\'ici au 8 novembre.',
  'p4.3': 'Une relance ciblée par segment tiède, et vous savez combien de personnes ont acheté après l\'avoir reçue.',
  'p4.4': 'Chaque contact chaud porte un prochain geste daté, et aucun ne dort plus de 7 jours.',

  // Phase 5 · Pré-lancement
  'p5.1': 'Toute la séquence est programmée et testée avant le 22 novembre, sans une seule variable laissée vide.',
  'p5.2': 'Proposition : au moins 5 témoignages nommés et datés, chacun relié à un parcours précis.',
  'p5.3': 'Les objections entendues sont écrites et répondues, et aucune nouvelle n\'apparaît la dernière semaine.',
  'p5.4': 'Trois achats tests réussis de bout en bout, sur mobile et sur ordinateur, avant le 22 novembre.',

  // Phase 6 · Tallinn
  'p6.1': 'Aucune intervention manuelle pendant les 5 jours, et tout ce qui devait partir est parti.',
  'p6.2': 'Tous les envois de la semaine sont programmés et relus avant votre départ.',
  'p6.3': 'Toute question reçoit une réponse en moins de 24 heures, même sans vous.',
  'p6.4': 'Zéro changement au site et à l\'offre entre le 23 et le 27 novembre.',

  // Phase 7 · Ouverture principale
  'p7.1': 'Les ventes du 28 novembre au 1er décembre dépassent celles des phases 2 à 5 réunies.',
  'p7.2': 'Si un direct a lieu : présence au-dessus de 47,7 % des inscrits, et replay laissé en accès libre.',
  'p7.3': 'Chaque panier laissé reçoit sa relance, et l\'abandon reste sous 70 %, la moyenne mesurée sur 50 études.',
  'p7.4': 'Chaque nouvelle cliente a son accès et son mot de bienvenue en moins d\'une heure.',

  // La frise de la tournée
  't.1': '50 à 60 cibles nommées, chacune avec son contact, son mois d\'approche et sa raison d\'être dans la liste.',
  't.2': 'Chaque cible a une personne, un courriel valide et un dossier prêt à partir sans retouche.',
  't.3': 'Réponse au-dessus de 3,4 %, la moyenne du démarchage à froid en 2026, avec deux relances par cible au maximum.',
  't.4': 'Chaque date confirmée a son contrat, son cachet et son voyage réglés 30 jours d\'avance.',
  't.5': 'Proposition : au moins 6 scènes confirmées. La médiane du marché est de 2 500 $ US par conférence.',

  // Ce qui est parké : cocher veut dire « repris »
  'parc.1': 'Proposition : repris seulement quand l\'Expérience Origine tourne sans vous pendant un mois complet.',
  'parc.2': 'Proposition : repris quand le parcours d\'achat passe sans faute trois fois de suite.',
  'parc.3': 'Proposition : repris quand le manuscrit est parti chez l\'éditeur.',
  'parc.4': 'Proposition : repris après le 1er décembre, une fois la tournée confirmée.',
  'parc.5': 'Proposition : repris seulement si EO2 dépasse son objectif de revenus.',
  'parc.6': 'Proposition : repris quand les conférences donnent assez de retours pour trancher.',
  'parc.7': 'Proposition : repris quand l\'espace anglophone a fait sa première vente.',
};

export interface SourceMesure {
  titre: string;
  organisme: string;
  url: string;
  note: string;
}

export const SOURCES_MESURES: SourceMesure[] = [
  {
    titre: 'Webinar Benchmark Report 2026',
    organisme: 'Livestorm',
    url: 'https://livestorm.co/webinar-benchmark-report-2026',
    note: '33 786 sessions et plus de 7 millions d\'inscriptions en 2025 : 47,7 % de présence en direct, et un replay libre d\'accès qui récolte environ 3,7 fois plus de vues.',
  },
  {
    titre: 'Email Marketing Benchmarks',
    organisme: 'Omnisend',
    url: 'https://www.omnisend.com/blog/email-marketing-benchmarks/',
    note: 'Plus de 20 milliards de courriels en 2025 : 30,4 % d\'ouverture et 0,74 % de clic en campagne, 4,66 % de clic en automatisé, et 0,79 % de clic pour le secteur santé.',
  },
  {
    titre: 'Email Marketing Benchmarks by Industry',
    organisme: 'GetResponse',
    url: 'https://www.getresponse.com/resources/reports/email-marketing-benchmarks',
    note: '4,4 milliards de messages : santé et beauté à 0,12 % de désabonnement et 3,06 % de rebond, soins de santé à 0,21 % et 3,17 %.',
  },
  {
    titre: 'Email Marketing Benchmarks',
    organisme: 'Mailchimp',
    url: 'https://mailchimp.com/resources/email-marketing-benchmarks/',
    note: 'Éducation et formation à 35,6 % d\'ouverture, 3,02 % de clic et 0,18 % de désabonnement.',
  },
  {
    titre: 'Email sender guidelines FAQ',
    organisme: 'Google, aide de Gmail',
    url: 'https://support.google.com/mail/answer/14229414',
    note: 'Le plafond dur de la délivrabilité : les plaintes pour pourriel restent sous 0,1 % et ne doivent jamais atteindre 0,3 %.',
  },
  {
    titre: 'How to migrate from another email service provider',
    organisme: 'Klaviyo, centre d\'aide',
    url: 'https://help.klaviyo.com/hc/en-us/articles/115005082767',
    note: 'La réputation d\'expéditeur ne se transfère pas : on importe une liste nettoyée et on n\'écrit d\'abord qu\'au segment engagé.',
  },
  {
    titre: 'Podcast Stats',
    organisme: 'Buzzsprout',
    url: 'https://www.buzzsprout.com/stats',
    note: 'Écoutes dans les 7 premiers jours : 27 pour la médiane, 96 pour le quart supérieur, 407 pour le dixième supérieur.',
  },
  {
    titre: 'L\'écoute de balados au Québec',
    organisme: 'Institut de la statistique du Québec',
    url: 'https://statistique.quebec.ca/fr/document/ecoute-balados-au-quebec',
    note: '49 % de la population écoute des balados; parmi ces personnes, 55 % écoutent surtout en français et 46 % surtout des balados d\'ici.',
  },
  {
    titre: 'How Much Does a Keynote Speaker Cost',
    organisme: 'Talkadot',
    url: 'https://www.talkadot.com/resources/for-event-planners/how-much-does-a-keynote-speaker-cost',
    note: 'Médiane du marché à 2 500 $ US, quartile supérieur à 5 000 $, et une relation en format atelier qui vaut 2,1 événements en moyenne.',
  },
  {
    titre: 'Cold Email Benchmark Report 2026',
    organisme: 'Instantly',
    url: 'https://instantly.ai/cold-email-benchmark-report-2026',
    note: 'Taux de réponse moyen d\'une approche à froid autour de 3,4 %, les meilleures campagnes dépassant 10 %.',
  },
  {
    titre: 'Apply to Speak',
    organisme: 'TEDxAtlanta',
    url: 'https://tedxatlanta.com/apply-to-speak/',
    note: 'Environ 700 candidatures par année pour 15 à 16 places, soit près de 2 % de retenus.',
  },
  {
    titre: 'Speakers Guide',
    organisme: 'TEDxLogan Circle',
    url: 'https://tedxlogancircle.com/speakers/',
    note: '178 candidatures et 12 conférenciers en 2024, soit 6,7 %, et de 5 à 8 mois entre le dépôt et la scène.',
  },
  {
    titre: 'Daily Word Counts of Professional Authors',
    organisme: 'Authorlytica',
    url: 'https://authorlytica.com/daily-word-counts-of-authors/',
    note: 'Cadence des auteurs en exercice : de 500 à 3 000 mots par jour de travail, la cible la plus citée étant 2 000.',
  },
  {
    titre: 'Literary Agent Response Times',
    organisme: 'Good Story Company',
    url: 'https://www.goodstorycompany.com/blog/literary-agent-response-times',
    note: 'De six à huit semaines pour une réponse à une sollicitation, le silence valant refus chez un nombre croissant d\'agents.',
  },
  {
    titre: 'Web Vitals',
    organisme: 'Google, web.dev',
    url: 'https://web.dev/articles/vitals',
    note: 'Les trois seuils d\'une page qui répond bien, évalués au 75e centile : LCP sous 2,5 s, INP sous 200 ms, CLS sous 0,1.',
  },
  {
    titre: 'Cart Abandonment Rate',
    organisme: 'Baymard Institute',
    url: 'https://baymard.com/lists/cart-abandonment-rate',
    note: 'Moyenne de 70,22 % d\'abandon de panier, calculée sur 50 études distinctes, mise à jour en septembre 2025.',
  },
  {
    titre: 'State of Software Delivery 2026',
    organisme: 'CircleCI',
    url: 'https://circleci.com/blog/five-takeaways-2026-software-delivery-report/',
    note: 'Plus de 28 millions d\'exécutions de tests : le repère recommandé pour une chaîne de tests reste 90 % de réussite.',
  },
  {
    titre: '2026 Social Media Industry Benchmark Report',
    organisme: 'Quid, anciennement Rival IQ',
    url: 'https://www.quid.com/knowledge-hub/resource-library/blog/2026-social-media-industry-benchmark-report',
    note: 'Engagement médian par abonné : 2,01 % sur TikTok, 0,30 % sur Instagram, 0,21 % sur YouTube. Aucune catégorie mieux-être n\'est publiée.',
  },
];
