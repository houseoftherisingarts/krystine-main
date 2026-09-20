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
      { id: 'c3.a3', texte: 'Maintenir la lettre (hors Kajabi)' },
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

export const MESURES_DEFAUT: Record<string, string> = MESURES_PLACEHOLDER();

function MESURES_PLACEHOLDER(): Record<string, string> { return {}; }

export interface SourceMesure {
  titre: string;
  organisme: string;
  url: string;
  note: string;
}

export const SOURCES_MESURES: SourceMesure[] = [];
