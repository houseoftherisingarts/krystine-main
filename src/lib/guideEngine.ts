// "Laissez-vous guider" — recommendation engine.
// ─────────────────────────────────────────────────────────────────────────────
// Routes a visitor to the single Inspirata offering that fits them best,
// based on 5 questions about their intention, familiarity, time available,
// current season of life, and commitment level (a budget proxy). The engine
// is purely deterministic right now — weighted scoring across options. The
// call shape (`computeRecommendation(answers) → GuideRecommendation`) is
// designed so a future Claude-backed recommender can drop in behind the same
// interface without touching the page or the question set.

export type OutcomeId =
  | 'podcast'            // lowest commitment; entry point
  | 'dosha-quiz'         // free self-assessment
  | 'premiers-rituels'   // $27 entry-level ritual program — first paid step
  | 'serenite-oil'       // stress-specific body oil (D-Stress)
  | 'bibliotheque'       // books — learn first
  | 'seasonal-waitlist'  // upcoming Kapha/Pitta/Vata seasonal programs
  | 'origine'            // 12-week signature program
  | 'events';            // in-person / live gatherings

export interface GuideOption {
  id: string;
  fr: string;
  en: string;
  /** Weights awarded to each outcome when this option is selected. */
  weights: Partial<Record<OutcomeId, number>>;
}

export interface GuideQuestion {
  id: string;
  fr: string;
  en: string;
  kickerFR: string;
  kickerEN: string;
  options: GuideOption[];
}

export interface GuideAnswer {
  qid: string;
  optionId: string;
}

export interface GuideRecommendation {
  id: OutcomeId;
  eyebrowFR: string;   eyebrowEN: string;
  titleFR:   string;   titleEN:   string;
  blurbFR:   string;   blurbEN:   string;
  ctaFR:     string;   ctaEN:     string;
  href:      string;   // primary call-to-action destination
  secondaryCtaFR?: string; secondaryCtaEN?: string;
  secondaryHref?:  string;
  accent:   string;    // brand-palette accent used on the result card
  icon?:    string;    // FontAwesome icon class for the badge
}

// ─── The 5 questions ─────────────────────────────────────────────────────────
// Every option carries only the weights that matter — we don't push zero
// scores around just to be exhaustive. Totals per outcome are deliberately
// uneven: Origine and Events are the deepest commitments and only surface
// when the signal is strong (high time + high commitment, or explicit
// "community" preference). Podcast is the soft default for the curious.

export const GUIDE_QUESTIONS: GuideQuestion[] = [
  {
    id: 'intention',
    kickerFR: 'Ce qui vous amène',
    kickerEN: 'What brings you',
    fr: "Qu'est-ce qui vous pousse à explorer Inspirata aujourd'hui ?",
    en: 'What pulls you toward Inspirata today?',
    options: [
      { id: 'curious',         fr: 'Je découvre, je me laisse porter.',
        en: "I'm discovering, letting myself drift.",
        weights: { podcast: 5, 'dosha-quiz': 2, bibliotheque: 2, 'premiers-rituels': 3 } },
      { id: 'intense-period',  fr: "Je traverse une période intense, j'ai besoin de m'apaiser.",
        en: "I'm moving through an intense phase and need to settle.",
        weights: { 'serenite-oil': 5, origine: 3, events: 2 } },
      { id: 'body-imbalance',  fr: 'Un déséquilibre physique à régler (sommeil, digestion, peau, énergie).',
        en: 'A physical imbalance to address (sleep, digestion, skin, energy).',
        weights: { 'seasonal-waitlist': 4, 'dosha-quiz': 3, 'serenite-oil': 3 } },
      { id: 'transform',       fr: 'Je veux transformer ma façon de vivre.',
        en: 'I want to transform the way I live.',
        weights: { origine: 8, 'seasonal-waitlist': 3 } },
      { id: 'learn',           fr: "J'ai soif d'apprendre et de me former.",
        en: 'I hunger to learn and deepen my knowledge.',
        weights: { bibliotheque: 5, origine: 3, 'dosha-quiz': 2, 'premiers-rituels': 3 } },
    ],
  },
  {
    id: 'familiarity',
    kickerFR: 'Vous et Krystine',
    kickerEN: 'You & Krystine',
    fr: 'Comment connaissez-vous Krystine ?',
    en: 'How familiar are you with Krystine?',
    options: [
      { id: 'new',         fr: 'Je viens tout juste de la découvrir.',
        en: "I've just found her.",
        weights: { podcast: 5, 'dosha-quiz': 2, 'premiers-rituels': 3 } },
      { id: 'follower',    fr: 'Je suis son travail à distance.',
        en: 'I follow her work from afar.',
        weights: { bibliotheque: 3, 'seasonal-waitlist': 3, 'serenite-oil': 2, 'premiers-rituels': 3 } },
      { id: 'read-books',  fr: "J'ai lu ses livres.",
        en: "I've read her books.",
        weights: { 'seasonal-waitlist': 5, origine: 3, events: 3 } },
      { id: 'client',      fr: "Je suis déjà cliente ou j'ai fait un programme.",
        en: "I'm already a client or have taken a program.",
        weights: { origine: 5, events: 5, 'seasonal-waitlist': 2 } },
    ],
  },
  {
    id: 'rhythm',
    kickerFR: 'Votre rythme',
    kickerEN: 'Your pace',
    fr: "Combien de temps pouvez-vous réellement y consacrer ?",
    en: 'How much time can you genuinely give?',
    options: [
      { id: 'minutes',   fr: 'Quelques minutes, çà et là.',
        en: 'A few minutes here and there.',
        weights: { podcast: 5, 'serenite-oil': 2, 'premiers-rituels': 4 } },
      { id: 'evenings',  fr: 'Quelques soirs par semaine.',
        en: 'A few evenings a week.',
        weights: { bibliotheque: 5, podcast: 3, 'dosha-quiz': 2, 'premiers-rituels': 3 } },
      { id: 'weekly',    fr: 'Un rendez-vous hebdomadaire régulier.',
        en: 'A steady weekly appointment.',
        weights: { 'seasonal-waitlist': 5, events: 3 } },
      { id: 'full',      fr: 'Un parcours complet, en immersion.',
        en: 'A full, immersive journey.',
        weights: { origine: 10 } },
    ],
  },
  {
    id: 'state',
    kickerFR: 'Votre saison intérieure',
    kickerEN: 'Your inner season',
    fr: 'Qu\'est-ce qui appuie le plus en vous en ce moment ?',
    en: 'What weighs most inside you right now?',
    options: [
      { id: 'exploring', fr: "Rien de pressé — j'explore simplement.",
        en: "Nothing urgent — I'm just exploring.",
        weights: { podcast: 4, 'dosha-quiz': 3, bibliotheque: 2, 'premiers-rituels': 3 } },
      { id: 'constitution', fr: 'Comprendre ma nature ayurvédique (dosha).',
        en: 'Understanding my ayurvedic nature (dosha).',
        weights: { 'dosha-quiz': 10 } },
      { id: 'nerves',    fr: 'Le stress, les nerfs à vif, un sommeil haché.',
        en: 'Stress, frayed nerves, choppy sleep.',
        weights: { 'serenite-oil': 8, origine: 2 } },
      { id: 'physical',  fr: 'Un vrai sujet physique (digestion, peau, chaleur, fatigue).',
        en: 'A real physical concern (digestion, skin, heat, fatigue).',
        weights: { 'seasonal-waitlist': 5, 'dosha-quiz': 3 } },
      { id: 'lonely',    fr: "J'ai besoin de me sentir en communauté, incarnée.",
        en: 'I need to feel part of a living community.',
        weights: { events: 10 } },
    ],
  },
  {
    id: 'format',
    kickerFR: 'Le format qui vous appelle',
    kickerEN: 'The format calling you',
    fr: 'Quel type d\'engagement vous ressemble aujourd\'hui ?',
    en: 'What kind of commitment fits you today?',
    options: [
      { id: 'free',      fr: 'Un premier pas gratuit.',
        en: 'A free first step.',
        weights: { podcast: 5, 'dosha-quiz': 3, 'premiers-rituels': 4 } },
      { id: 'small',     fr: 'Un geste concret pour soi — un livre, une huile.',
        en: 'A small concrete gesture — a book, an oil.',
        weights: { 'serenite-oil': 3, bibliotheque: 3, 'premiers-rituels': 7 } },
      { id: 'journey',   fr: 'Un investissement dans ma transformation.',
        en: 'An investment in my transformation.',
        weights: { 'seasonal-waitlist': 5, origine: 3 } },
      { id: 'immersion', fr: 'Me plonger pleinement dans un parcours.',
        en: 'To fully immerse myself in a journey.',
        weights: { origine: 8 } },
    ],
  },
];

// ─── Outcomes ────────────────────────────────────────────────────────────────

export const OUTCOMES: Record<OutcomeId, GuideRecommendation> = {
  'podcast': {
    id: 'podcast',
    eyebrowFR: 'Entrée en douceur',                    eyebrowEN: 'A gentle entry',
    titleFR:   'Au-delà des tendances',                titleEN:   'Beyond Trends',
    blurbFR:   "Commencez par l'écoute. Le podcast de Krystine est votre premier fil — conversations ancrées, sagesse vivante, aucune pression.",
    blurbEN:   'Start with listening. Krystine\'s podcast is your first thread — grounded conversations, living wisdom, no pressure.',
    ctaFR:     'Écouter le podcast',                   ctaEN:     'Listen to the podcast',
    href:      '/podcast',
    accent:    '#8F9779',
    icon:      'fa-headphones',
  },
  'dosha-quiz': {
    id: 'dosha-quiz',
    eyebrowFR: 'Commencer par vous connaître',         eyebrowEN: 'Start with knowing yourself',
    titleFR:   'Le Quiz Dosha',                        titleEN:   'The Dosha Quiz',
    blurbFR:   "Avant toute formule, découvrez votre signature corporelle — Vata, Pitta ou Kapha. Dix questions, un rituel personnalisé en cadeau.",
    blurbEN:   'Before any formula, discover your bodily signature — Vata, Pitta or Kapha. Ten questions, a personalized ritual as a gift.',
    ctaFR:     'Faire le Quiz Dosha',                  ctaEN:     'Take the Dosha Quiz',
    href:      '/quiz',
    accent:    '#B8532F',
    icon:      'fa-circle-nodes',
  },
  'premiers-rituels': {
    id: 'premiers-rituels',
    eyebrowFR: 'Un premier pas accessible',            eyebrowEN: 'An accessible first step',
    titleFR:   'Les Premiers Rituels',                 titleEN:   'The First Rituals',
    blurbFR:   "Une porte d'entrée concrète dans l'Ayurveda sans s'engager dans un parcours complet : 10 capsules vidéo pour vos premiers gestes — introduction, auto-massage, soins du nez, de la bouche, des mains et des pieds. 27 $, accès immédiat.",
    blurbEN:   "A concrete entry into Ayurveda without committing to a full program: 10 video capsules for your first gestures — introduction, self-massage, care of the nose, mouth, hands and feet. $27, instant access.",
    ctaFR:     'Commencer — 27 $',                     ctaEN:     'Begin — $27',
    href:      'https://www.krystinestlaurent.com/offers/2ksjqcW3/checkout',
    secondaryCtaFR: "Voir d'abord le podcast",         secondaryCtaEN: 'Listen to the podcast first',
    secondaryHref:  '/podcast',
    accent:    '#7A8066',
    icon:      'fa-seedling',
  },
  'serenite-oil': {
    id: 'serenite-oil',
    eyebrowFR: 'Un apaisement immédiat',               eyebrowEN: 'Immediate calm',
    titleFR:   'La collection Sérénité',               titleEN:   'The Serenity Collection',
    blurbFR:   "Quand les nerfs sont à vif, l'Ayurveda suggère l'aromathérapie : D-Stress et son roll-on nomade sont faits pour le creux du poignet, la nuque, les pauses de la journée.",
    blurbEN:   'When nerves are frayed, Ayurveda suggests aromatherapy: D-Stress and its travel roll-on live at the wrist, the nape, the pauses of the day.',
    ctaFR:     'Voir la collection Sérénité',          ctaEN:     'View the Serenity collection',
    href:      '/boutique/serenite',
    secondaryCtaFR: "Faire le Quiz Dosha d'abord",     secondaryCtaEN: 'Take the Dosha Quiz first',
    secondaryHref:  '/quiz',
    accent:    '#BC4A3C',
    icon:      'fa-hand-holding-heart',
  },
  'bibliotheque': {
    id: 'bibliotheque',
    eyebrowFR: "Lire d'abord, incarner ensuite",       eyebrowEN: 'Read first, embody after',
    titleFR:   'La Bibliothèque',                      titleEN:   'The Library',
    blurbFR:   "Krystine a tissé trois best-sellers : Nature & Ayurveda, Féminité & Ayurveda, La Cuisine Tonique. Des ouvrages à lire le soir, en début de saison.",
    blurbEN:   'Krystine has woven three best-sellers: Nature & Ayurveda, Femininity & Ayurveda, The Tonic Kitchen. Books to read at night, at the turn of a season.',
    ctaFR:     'Parcourir la Bibliothèque',            ctaEN:     'Browse the Library',
    href:      '/boutique/bibliotheque',
    accent:    '#6B402E',
    icon:      'fa-book',
  },
  'seasonal-waitlist': {
    id: 'seasonal-waitlist',
    eyebrowFR: 'Au rythme de la saison',               eyebrowEN: 'At the rhythm of the season',
    titleFR:   'Les Programmes Saisonniers',           titleEN:   'The Seasonal Programs',
    blurbFR:   "Trois parcours ciblés pour traverser chaque saison — Printemps (Kapha), Été (Pitta), Automne (Vata). Inscrivez-vous à la liste d'attente du programme qui vous parle.",
    blurbEN:   'Three focused journeys to move through each season — Spring (Kapha), Summer (Pitta), Autumn (Vata). Join the waitlist for the one that calls you.',
    ctaFR:     'Voir les programmes',                  ctaEN:     'View the programs',
    href:      '/formations',
    accent:    '#4A7C9D',
    icon:      'fa-seedling',
  },
  'origine': {
    id: 'origine',
    eyebrowFR: 'Le parcours signature',                eyebrowEN: 'The signature journey',
    titleFR:   "L'Expérience Origine",                 titleEN:   'The Origin Experience',
    blurbFR:   "Douze semaines pour rétablir votre boussole intérieure. L'Ancrage (Terre), l'Alchimie (Feu), la Clarté (Éther). Le parcours le plus profond d'Inspirata.",
    blurbEN:   'Twelve weeks to rebuild your inner compass. Grounding (Earth), Alchemy (Fire), Clarity (Ether). The deepest journey Inspirata offers.',
    ctaFR:     "Découvrir l'Expérience Origine",       ctaEN:     'Discover the Origin Experience',
    href:      '/origine',
    accent:    '#B8532F',
    icon:      'fa-compass',
  },
  'events': {
    id: 'events',
    eyebrowFR: 'En personne, avec Krystine',           eyebrowEN: 'In person, with Krystine',
    titleFR:   'Les prochains événements',             titleEN:   'Upcoming events',
    blurbFR:   "Ateliers, conférences, rencontres en petit groupe — c'est là que vous rencontrez Krystine en chair et en os. Consultez le calendrier de la saison.",
    blurbEN:   'Workshops, talks, small-group gatherings — this is where you meet Krystine face to face. Check the season\'s calendar.',
    ctaFR:     'Voir les événements',                  ctaEN:     'View the events',
    href:      '/krystine#events',
    accent:    '#6B402F',
    icon:      'fa-calendar-heart',
  },
};

// ─── Engine ──────────────────────────────────────────────────────────────────

// Iterate softest → deepest. Combined with the strict `>` comparison
// below, any tie resolves to the softer outcome — so ambiguous answers
// land on Podcast / Dosha Quiz rather than pushing the visitor into
// Origine before they're ready.
const OUTCOME_PRIORITY: OutcomeId[] = [
  'podcast', 'dosha-quiz', 'premiers-rituels', 'bibliotheque', 'serenite-oil',
  'seasonal-waitlist', 'events', 'origine',
];

export function scoreAnswers(answers: GuideAnswer[]): Record<OutcomeId, number> {
  const scores: Record<OutcomeId, number> = {
    podcast: 0, 'dosha-quiz': 0, 'premiers-rituels': 0, 'serenite-oil': 0, bibliotheque: 0,
    'seasonal-waitlist': 0, origine: 0, events: 0,
  };
  for (const ans of answers) {
    const q = GUIDE_QUESTIONS.find(qq => qq.id === ans.qid);
    const opt = q?.options.find(o => o.id === ans.optionId);
    if (!opt) continue;
    for (const [oid, w] of Object.entries(opt.weights)) {
      scores[oid as OutcomeId] += (w || 0);
    }
  }
  return scores;
}

export function computeRecommendation(answers: GuideAnswer[]): GuideRecommendation {
  const scores = scoreAnswers(answers);
  let best: OutcomeId = 'podcast';
  let bestScore = -Infinity;
  // Iterate in priority order so ties resolve toward the *highest* outcome
  // the visitor has earned, but only when the score is actually present.
  for (const id of OUTCOME_PRIORITY) {
    const s = scores[id];
    if (s > bestScore) { bestScore = s; best = id; }
  }
  return OUTCOMES[best];
}
