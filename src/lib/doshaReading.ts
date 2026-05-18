// Compass Quiz reading engine — Quiz Boussole spec v2 (May 2026).
// Scoring (3-2-1 ranking), profile classification (4 types), and modular
// reading blocks. The quiz UI calls calculateScores → classify → buildReading.

export type DoshaKey = 'vata' | 'pitta' | 'kapha';
export type Lang = 'FR' | 'EN';

export const DOSHA_KEYS: DoshaKey[] = ['vata', 'pitta', 'kapha'];

export const DOSHA_LABEL: Record<DoshaKey, string> = {
  vata: 'Vata',
  pitta: 'Pitta',
  kapha: 'Kapha',
};

export const DOSHA_ACCENT: Record<DoshaKey, string> = {
  vata: '#8F9779',
  pitta: '#BC4A3C',
  kapha: '#4A7C9D',
};

// ─── Scoring ─────────────────────────────────────────────────────────────────
// Per question, the user ranks the three statements: 1st = 3 pts, 2nd = 2 pts,
// 3rd = 1 pt. Across 10 questions, each dosha lands between 10 and 30 pts; the
// three totals always sum to 60. Percentages always sum to 100.

export interface Ranking {
  vata: 1 | 2 | 3;
  pitta: 1 | 2 | 3;
  kapha: 1 | 2 | 3;
}

export type Scores = Record<DoshaKey, number>;
export type Percentages = Record<DoshaKey, number>;

const pointsForRank = (r: 1 | 2 | 3): number => (r === 1 ? 3 : r === 2 ? 2 : 1);

export function calculateScores(rankings: Ranking[]): Scores {
  const s: Scores = { vata: 0, pitta: 0, kapha: 0 };
  for (const r of rankings) {
    s.vata += pointsForRank(r.vata);
    s.pitta += pointsForRank(r.pitta);
    s.kapha += pointsForRank(r.kapha);
  }
  return s;
}

export function calculatePercentages(scores: Scores): Percentages {
  const total = scores.vata + scores.pitta + scores.kapha || 1;
  return {
    vata: Math.round((scores.vata / total) * 1000) / 10,
    pitta: Math.round((scores.pitta / total) * 1000) / 10,
    kapha: Math.round((scores.kapha / total) * 1000) / 10,
  };
}

// ─── Classification ──────────────────────────────────────────────────────────

export type ProfileType =
  | 'mono-prononce'
  | 'mono-clair'
  | 'bi-doshique'
  | 'tri-doshique';

export type Profile =
  | { type: 'mono-prononce'; dominant: DoshaKey; secondary: DoshaKey }
  | { type: 'mono-clair'; dominant: DoshaKey; secondary: DoshaKey }
  | { type: 'bi-doshique'; primary: DoshaKey; secondary: DoshaKey }
  | { type: 'tri-doshique' };

export function classify(pct: Percentages): Profile {
  const sorted = (Object.entries(pct) as [DoshaKey, number][])
    .sort((a, b) => b[1] - a[1]);
  const [first, second, third] = sorted;

  const gap12 = first[1] - second[1];
  const gapMaxMin = first[1] - third[1];

  if (gapMaxMin <= 6) {
    return { type: 'tri-doshique' };
  }
  if (gap12 < 6 && third[1] < 30) {
    return { type: 'bi-doshique', primary: first[0], secondary: second[0] };
  }
  if (first[1] >= 42 && gap12 >= 10) {
    return { type: 'mono-prononce', dominant: first[0], secondary: second[0] };
  }
  return { type: 'mono-clair', dominant: first[0], secondary: second[0] };
}

// ─── Reading blocks ──────────────────────────────────────────────────────────
// Source: Quiz Boussole spec v2, Section 7. Each reading is a 3-movement
// structure: recognition (base) + nuance (secondary tendency) + closing (oil
// + book + Origine). For bi/tri profiles, a single block stands in.

export interface Block { fr: string; en: string; }

export const BASE_BLOCKS: Record<DoshaKey, Block> = {
  vata: {
    fr:
      "Ces dernières semaines, Vata souffle plus fort en vous. Le vent, l'espace, la mobilité, cette qualité se ressent souvent dans un mental qui court, un sommeil qui s'allège, une digestion qui hésite, un corps qui cherche son ancrage.\n\nVata n'est pas un défaut, c'est une force. Lorsqu'elle monte, elle appelle un peu de chaleur, un peu de lenteur, un peu de gras nourrissant. La direction du moment, c'est de ralentir, de réchauffer, d'enraciner.",
    en:
      "These last weeks, Vata is blowing stronger within you. Wind, space, mobility, this quality often shows up as a racing mind, lighter sleep, a hesitating digestion, a body searching for its ground.\n\nVata is not a flaw, it is a force. When it rises, it calls for warmth, for slowness, for nourishing richness. The direction of the moment is to slow down, to warm, to root.",
  },
  pitta: {
    fr:
      "Ces dernières semaines, Pitta brûle plus fort en vous. Le feu, la chaleur, la précision, cette qualité se ressent souvent dans une digestion vive, une peau réactive, un mental tranchant, une émotion qui monte en chaleur.\n\nPitta n'est pas un défaut, c'est une force. Lorsqu'elle monte, elle appelle de la fraîcheur, de la douceur, du desserrement. La direction du moment, c'est de rafraîchir, d'apaiser, d'adoucir.",
    en:
      "These last weeks, Pitta is burning stronger within you. Fire, heat, precision, this quality often shows up as a sharp digestion, reactive skin, a cutting mind, emotion rising as heat.\n\nPitta is not a flaw, it is a force. When it rises, it calls for coolness, for softness, for a loosening of the grip. The direction of the moment is to cool, to soothe, to soften.",
  },
  kapha: {
    fr:
      "Ces dernières semaines, Kapha pèse plus fort en vous. La terre, l'eau, la densité, cette qualité se ressent souvent dans une lourdeur au réveil, une lenteur digestive, une émotion qui s'accumule, une envie de se replier.\n\nKapha n'est pas un défaut, c'est une force. Lorsqu'elle monte, elle appelle du mouvement, de la chaleur, de la légèreté. La direction du moment, c'est d'activer, de stimuler, d'alléger.",
    en:
      "These last weeks, Kapha is settling heavier within you. Earth, water, density, this quality often shows up as morning heaviness, slow digestion, emotions accumulating, an urge to withdraw.\n\nKapha is not a flaw, it is a force. When it rises, it calls for movement, for warmth, for lightness. The direction of the moment is to activate, to stimulate, to lighten.",
  },
};

// NUANCE_BLOCKS[dominant][secondary] — only the 6 cross combinations are
// populated. dominant === secondary entries are undefined and never read,
// since the classifier always returns two distinct doshas for mono profiles.
export const NUANCE_BLOCKS: Record<DoshaKey, Partial<Record<DoshaKey, Block>>> = {
  vata: {
    pitta: {
      fr:
        "Vata domine, et Pitta réchauffe par-dessus. Cela peut se traduire par une dispersion qui s'enflamme lorsque vous êtes à plat, une digestion vive sur fond d'irrégularité, une peau réactive lorsque le mental court trop longtemps. La nuance, c'est de réchauffer sans surchauffer, d'enraciner sans assécher.",
      en:
        "Vata leads, and Pitta warms over the top. This can show up as scattering that flares when you run low, a sharp digestion sitting on top of irregularity, reactive skin when the mind runs too long. The nuance is to warm without overheating, to root without drying out.",
    },
    kapha: {
      fr:
        "Vata domine, et Kapha pèse en sourdine. Cela peut se traduire par une lourdeur matinale alors même que le mental court, une envie d'ancrage que la dispersion empêche, un attachement émotionnel qui co-existe avec le sentiment d'être éparpillé·e. La nuance, c'est de réchauffer Vata sans nourrir l'inertie Kapha.",
      en:
        "Vata leads, and Kapha settles quietly underneath. This can show up as morning heaviness even while the mind races, a need for grounding that the scattering blocks, emotional attachment co-existing with the sense of being spread thin. The nuance is to warm Vata without feeding Kapha's inertia.",
    },
  },
  pitta: {
    vata: {
      fr:
        "Pitta domine, et Vata mobilise par-dessous. Cela peut se traduire par une intensité qui s'éparpille, un sommeil court avec un mental qui démarre tôt, une digestion vive entrecoupée d'irrégularité. La nuance, c'est de rafraîchir sans dessécher, d'apaiser le feu sans laisser le vent prendre toute la place.",
      en:
        "Pitta leads, and Vata mobilizes underneath. This can show up as intensity that scatters, short sleep with the mind starting early, a sharp digestion broken by irregularity. The nuance is to cool without drying out, to soothe the fire without letting the wind take over.",
    },
    kapha: {
      fr:
        "Pitta domine, et Kapha stabilise en arrière-plan. Cela peut se traduire par une intensité qui tient sur la durée, une endurance solide doublée d'irritabilité, une émotion qui s'accumule lentement puis monte en chaleur. La nuance, c'est de rafraîchir Pitta tout en gardant Kapha en mouvement doux.",
      en:
        "Pitta leads, and Kapha steadies in the background. This can show up as intensity that holds over time, solid endurance paired with irritability, emotions accumulating slowly then rising as heat. The nuance is to cool Pitta while keeping Kapha in gentle motion.",
    },
  },
  kapha: {
    vata: {
      fr:
        "Kapha domine, et Vata mobilise par moments. Cela peut se traduire par une lourdeur de fond traversée d'éparpillements mentaux, un sommeil qui pèse mais qui s'interrompt, une lenteur ponctuée d'anxiété. La nuance, c'est d'activer Kapha sans aggraver la dispersion Vata, de choisir le mouvement plutôt que l'agitation.",
      en:
        "Kapha leads, and Vata mobilizes in bursts. This can show up as underlying heaviness crossed by mental scattering, sleep that weighs but breaks, slowness punctuated by anxiety. The nuance is to activate Kapha without worsening Vata's scattering, to choose movement over agitation.",
    },
    pitta: {
      fr:
        "Kapha domine, et Pitta s'active par bouffées. Cela peut se traduire par une stabilité de fond qui éclate en irritabilité, une endurance solide entrecoupée de pics de chaleur, une émotion qui s'accumule puis bascule en colère. La nuance, c'est d'alléger Kapha sans nourrir la surchauffe Pitta.",
      en:
        "Kapha leads, and Pitta flares in waves. This can show up as underlying steadiness erupting into irritability, solid endurance broken by spikes of heat, emotions accumulating then tipping into anger. The nuance is to lighten Kapha without feeding Pitta's overheating.",
    },
  },
};

export const CLOSING_BLOCKS: Record<DoshaKey, Block> = {
  vata: {
    fr:
      "Le geste que l'on recommande : l'**Huile Corporelle Apaisante Vata**, formulée précisément par opposition à cette qualité mobile et sèche. *L'huile ne cherche pas à vous ressembler. Elle cherche à vous rééquilibrer.*\n\nPour aller plus loin, *Nature & Ayurveda* pose les fondations, et l'**Expérience Origine** offre un cadre de douze semaines pour traverser ce mouvement en profondeur.",
    en:
      "The gesture we recommend: the **Soothing Vata Body Oil**, formulated precisely in opposition to this mobile and dry quality. *The oil is not seeking to mirror you. It is seeking to rebalance you.*\n\nTo go further, *Nature & Ayurveda* lays the foundations, and the **Origin Experience** offers a twelve-week frame to cross this movement in depth.",
  },
  pitta: {
    fr:
      "Le geste que l'on recommande : l'**Huile Corporelle Rafraîchissante Pitta**, formulée précisément par opposition à cette qualité chaude et tranchante. *L'huile ne cherche pas à vous ressembler. Elle cherche à vous rééquilibrer.*\n\nPour aller plus loin, *Nature & Ayurveda* pose les fondations, et l'**Expérience Origine** offre un cadre de douze semaines pour traverser ce mouvement en profondeur.",
    en:
      "The gesture we recommend: the **Refreshing Pitta Body Oil**, formulated precisely in opposition to this hot and cutting quality. *The oil is not seeking to mirror you. It is seeking to rebalance you.*\n\nTo go further, *Nature & Ayurveda* lays the foundations, and the **Origin Experience** offers a twelve-week frame to cross this movement in depth.",
  },
  kapha: {
    fr:
      "Le geste que l'on recommande : l'**Huile Corporelle Énergisante Kapha**, formulée précisément par opposition à cette qualité lourde et statique. *L'huile ne cherche pas à vous ressembler. Elle cherche à vous rééquilibrer.*\n\nPour aller plus loin, *Nature & Ayurveda* pose les fondations, et l'**Expérience Origine** offre un cadre de douze semaines pour traverser ce mouvement en profondeur.",
    en:
      "The gesture we recommend: the **Energizing Kapha Body Oil**, formulated precisely in opposition to this heavy and static quality. *The oil is not seeking to mirror you. It is seeking to rebalance you.*\n\nTo go further, *Nature & Ayurveda* lays the foundations, and the **Origin Experience** offers a twelve-week frame to cross this movement in depth.",
  },
};

// Bi-doshique keys are normalized alphabetically so vata-pitta and pitta-vata
// resolve to the same reading.
export const BI_DOSHIQUE_READINGS: Record<string, Block> = {
  'kapha-vata': {
    fr:
      "Ces dernières semaines, deux forces se partagent la scène : Vata et Kapha. Le vent et la terre cohabitent, ce qui peut sembler paradoxal. Vous reconnaissez peut-être une lourdeur du matin mais un mental qui s'éparpille, une envie d'ancrage et un besoin de mouvement.\n\nCette combinaison n'est pas une contradiction, c'est une signature. La direction du moment, c'est de réchauffer doucement, de stabiliser sans alourdir.\n\nLe geste que l'on recommande : l'**Huile Corporelle Apaisante Vata** lorsque la dispersion domine, ou l'**Huile Corporelle Énergisante Kapha** lorsque la lourdeur domine. *L'huile ne cherche pas à vous ressembler. Elle cherche à vous rééquilibrer.*\n\n*Nature & Ayurveda* vous donne les repères saisonniers, et l'**Expérience Origine** offre un cadre de douze semaines pour lire ces deux forces en profondeur.",
    en:
      "These last weeks, two forces are sharing the stage: Vata and Kapha. Wind and earth cohabit, which can feel paradoxical. You may recognize morning heaviness alongside a scattering mind, a longing for grounding next to a need for movement.\n\nThis combination is not a contradiction, it is a signature. The direction of the moment is to warm gently, to steady without adding weight.\n\nThe gesture we recommend: the **Soothing Vata Body Oil** when the scattering takes the lead, or the **Energizing Kapha Body Oil** when the heaviness takes the lead. *The oil is not seeking to mirror you. It is seeking to rebalance you.*\n\n*Nature & Ayurveda* gives you the seasonal landmarks, and the **Origin Experience** offers a twelve-week frame to read these two forces in depth.",
  },
  'pitta-vata': {
    fr:
      "Ces dernières semaines, deux forces se partagent la scène : Vata et Pitta. Le vent et le feu cohabitent. Vous reconnaissez peut-être un mental rapide qui s'échauffe vite, un sommeil léger mais une digestion vive, l'enthousiasme qui bascule en irritabilité.\n\nCette combinaison n'est pas une contradiction, c'est une signature. La direction du moment, c'est d'apaiser ce qui chauffe sans dessécher davantage, de ralentir sans surchauffer.\n\nLe geste que l'on recommande : commencer par l'**Huile Corporelle Apaisante Vata** lorsque la mobilité domine (mental qui court, sommeil léger), ou l'**Huile Corporelle Rafraîchissante Pitta** lorsque la chaleur domine (irritabilité, digestion vive). *L'huile ne cherche pas à vous ressembler. Elle cherche à vous rééquilibrer.*\n\n*Nature & Ayurveda* vous donne les repères saisonniers, et l'**Expérience Origine** offre un cadre de douze semaines pour lire ces deux forces en profondeur.",
    en:
      "These last weeks, two forces are sharing the stage: Vata and Pitta. Wind and fire cohabit. You may recognize a quick mind that overheats fast, light sleep paired with a sharp digestion, enthusiasm tipping into irritability.\n\nThis combination is not a contradiction, it is a signature. The direction of the moment is to soothe what heats without drying further, to slow down without overheating.\n\nThe gesture we recommend: begin with the **Soothing Vata Body Oil** when mobility takes the lead (racing mind, light sleep), or the **Refreshing Pitta Body Oil** when heat takes the lead (irritability, sharp digestion). *The oil is not seeking to mirror you. It is seeking to rebalance you.*\n\n*Nature & Ayurveda* gives you the seasonal landmarks, and the **Origin Experience** offers a twelve-week frame to read these two forces in depth.",
  },
  'kapha-pitta': {
    fr:
      "Ces dernières semaines, deux forces se partagent la scène : Pitta et Kapha. Le feu et la terre cohabitent. Vous reconnaissez peut-être une endurance solide qui se double d'intensité, une lenteur de fond traversée par des pics de chaleur, une émotion qui s'accumule puis explose.\n\nCette combinaison n'est pas une contradiction, c'est une signature. La direction du moment, c'est d'alléger sans surchauffer, de rafraîchir sans alourdir.\n\nLe geste que l'on recommande : l'**Huile Corporelle Rafraîchissante Pitta** lorsque la chaleur domine, ou l'**Huile Corporelle Énergisante Kapha** lorsque la lourdeur domine. *L'huile ne cherche pas à vous ressembler. Elle cherche à vous rééquilibrer.*\n\n*Nature & Ayurveda* vous donne les repères saisonniers, et l'**Expérience Origine** offre un cadre de douze semaines pour lire ces deux forces en profondeur.",
    en:
      "These last weeks, two forces are sharing the stage: Pitta and Kapha. Fire and earth cohabit. You may recognize solid endurance doubled with intensity, an underlying slowness crossed by spikes of heat, emotions accumulating then erupting.\n\nThis combination is not a contradiction, it is a signature. The direction of the moment is to lighten without overheating, to cool without adding weight.\n\nThe gesture we recommend: the **Refreshing Pitta Body Oil** when heat takes the lead, or the **Energizing Kapha Body Oil** when heaviness takes the lead. *The oil is not seeking to mirror you. It is seeking to rebalance you.*\n\n*Nature & Ayurveda* gives you the seasonal landmarks, and the **Origin Experience** offers a twelve-week frame to read these two forces in depth.",
  },
};

export const TRI_DOSHIQUE_READING: Block = {
  fr:
    "Ces dernières semaines, vos trois forces se répartissent de façon relativement équilibrée. Aucune ne tire fortement plus que les autres. Cela peut signaler un état de bonne harmonie, ou simplement un moment où les déséquilibres ne sont pas marqués au point de basculer la lecture.\n\nUne lecture tri-doshique n'est pas un verdict, c'est une invitation à l'observation fine. La direction du moment, c'est d'écouter quelle qualité se manifeste dans quel contexte, lorsque, par exemple, le mental court, ou que la chaleur monte, ou que la lourdeur s'installe.\n\nLe geste que l'on recommande : commencer par observer ce qui se manifeste chaque jour, et choisir l'huile correspondante au moment. *L'huile ne cherche pas à vous ressembler. Elle cherche à vous rééquilibrer.*\n\n*Nature & Ayurveda* pose le cadre d'observation, et l'**Expérience Origine** offre un cadre de douze semaines pour affiner cette lecture.",
  en:
    "These last weeks, your three forces are distributed in a relatively balanced way. None pulls strongly more than the others. This can signal a state of harmony, or simply a moment when imbalances are not pronounced enough to tip the reading.\n\nA tri-doshic reading is not a verdict, it is an invitation to fine observation. The direction of the moment is to listen for which quality shows up in which context, when, for example, the mind races, or heat rises, or heaviness settles in.\n\nThe gesture we recommend: begin by observing what shows up each day, and choose the oil that matches the moment. *The oil is not seeking to mirror you. It is seeking to rebalance you.*\n\n*Nature & Ayurveda* sets the observation frame, and the **Origin Experience** offers a twelve-week frame to refine this reading.",
  };

const biKey = (a: DoshaKey, b: DoshaKey) => [a, b].sort().join('-');

export function biDoshiqueReading(a: DoshaKey, b: DoshaKey): Block {
  return BI_DOSHIQUE_READINGS[biKey(a, b)];
}

// ─── Reading assembly ────────────────────────────────────────────────────────
// Returns the language-specific reading text for the resolved profile.

export function buildReading(profile: Profile, lang: Lang): string {
  const pick = (b: Block) => (lang === 'FR' ? b.fr : b.en);
  if (profile.type === 'tri-doshique') {
    return pick(TRI_DOSHIQUE_READING);
  }
  if (profile.type === 'bi-doshique') {
    return pick(biDoshiqueReading(profile.primary, profile.secondary));
  }
  const base = pick(BASE_BLOCKS[profile.dominant]);
  const nuanceMap = NUANCE_BLOCKS[profile.dominant];
  const nuance = nuanceMap[profile.secondary];
  const closing = pick(CLOSING_BLOCKS[profile.dominant]);
  return nuance ? `${base}\n\n${pick(nuance)}\n\n${closing}` : `${base}\n\n${closing}`;
}

// Returns the list of dosha keys to recommend an oil for. Mono profiles
// → single dominant; bi profiles → two; tri → none (observe first).
export function oilTargetsForProfile(profile: Profile): DoshaKey[] {
  if (profile.type === 'tri-doshique') return [];
  if (profile.type === 'bi-doshique') return [profile.primary, profile.secondary];
  return [profile.dominant];
}

// Stable identifier for persistence (Firestore dosha field). Mono profiles
// store the dominant alone; bi profiles store an alphabetically-sorted pair;
// tri profiles store 'tri'.
export function persistedDoshaCode(profile: Profile): string {
  if (profile.type === 'tri-doshique') return 'tri';
  if (profile.type === 'bi-doshique') return biKey(profile.primary, profile.secondary);
  return profile.dominant;
}
