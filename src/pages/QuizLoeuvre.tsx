import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  motion, AnimatePresence, useReducedMotion, useScroll, useTransform,
} from 'framer-motion';
import {
  ArrowRight, ArrowLeft, ArrowDown, Check, ArrowCounterClockwise,
  LockSimple, Clock, Wind, Flame, Leaf,
} from '@phosphor-icons/react';
import { useApp } from '../contexts/AppContext';
import { CONTENT } from '../content';
import { addDoshaQuizResult, updateMember } from '../firebase/firestore';
import { trackLead, trackInterne, noterSource } from '../lib/track';
import { points } from '../firebase/points';
import { envoyerResultatQuiz, suiteQuiz, type EtatSuite } from '../firebase/quiz';
import { RECAPTCHA_SITE_KEY, useRecaptcha } from '../lib/recaptcha';
import { RITUALS } from '../lib/doshaRituals';
import { Planche } from '../components/v2/Magazine';
import { Atmosphere } from '../components/motion/loeuvre';

/**
 * Quiz Dosha, langage V2 « magazine crème » (Fraunces + Inter, crème #f4efe6,
 * filets laiton, système multi-couleur Vata/Pitta/Kapha).
 * Garde 100 % de la logique d'origine : QUIZ_DATA, le calcul des scores et des
 * pourcentages, l'auto-avance, le retour/recommencer et l'écriture CRM
 * (addDoshaQuizResult + updateMember + points.quizCompleted).
 * L'écran du résultat porte une seule action à la fois (Krystine, 4 oct.
 * 2026) : la lecture, puis « Recevoir ma lecture et sa suite », puis, après
 * l'accord seulement, le repère en cadeau, puis une seule offre accessible
 * tout de suite, la même pour tous : les Rituels essentiels (Krystine, 5 oct. 2026).
 * Motion : transitions de question en slide+fade (AnimatePresence), filet de
 * progression qui se trace (scaleX), résultat révélé en rideau (clip-path),
 * médaillons qui éclosent (spring), mot Fraunces en profondeur (parallax).
 */

const ease = [0.22, 1, 0.36, 1] as const;
const SPRING = { type: 'spring' as const, stiffness: 190, damping: 18, mass: 0.9 };

/* ════════════════════════ Primitives V2 ════════════════════════ */

const Kicker: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <p className={`text-[0.7rem] uppercase tracking-[0.34em] text-[#7d6330] ${className}`}>{children}</p>
);

const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string; y?: number }> = ({
  children, delay = 0, className, y = 30,
}) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 1 } : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.95, ease, delay }}
    >
      {children}
    </motion.div>
  );
};

/* Filet laiton qui se trace à l'entrée (scaleX, transform seulement) */
const DrawRule: React.FC<{ className?: string; color?: string; delay?: number }> = ({
  className = '', color = '#9c7a44', delay = 0.15,
}) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      className={`h-px ${className}`}
      style={{ background: color, transformOrigin: 'left center' }}
      initial={reduce ? false : { scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, amount: 0.7 }}
      transition={{ duration: 1.2, ease, delay }}
    />
  );
};

/* Révélation en rideau (clip-path de haut en bas) pour les écrans résultat */
const Curtain: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 1 } : { clipPath: 'inset(0% 0% 100% 0%)' }}
      animate={reduce ? { opacity: 1 } : { clipPath: 'inset(0% 0% 0% 0%)' }}
      transition={{ duration: 1.1, ease }}
    >
      {children}
    </motion.div>
  );
};

/* Mot Fraunces géant qui glisse en profondeur derrière la carte du quiz */
const GiantWord: React.FC<{ word: string }> = ({ word }) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-6%', '10%']);
  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.span
        style={reduce ? undefined : { y }}
        className="absolute top-[2%] right-[-3%] v2-serif font-light leading-none select-none text-[clamp(8rem,22vw,20rem)] text-[#1c1712]/[0.05] will-change-transform"
      >
        {word}
      </motion.span>
    </div>
  );
};

/* ════════════════════════ Données du quiz (logique préservée verbatim) ════════════════════════ */

type DoshaType = 'vata' | 'pitta' | 'kapha';

interface QuizOption {
  fr: string;
  en: string;
  type: DoshaType;
}

interface QuizQuestion {
  categoryFR: string;
  categoryEN: string;
  questionFR: string;
  questionEN: string;
  options: [QuizOption, QuizOption, QuizOption];
}

const QUIZ_DATA: QuizQuestion[] = [
  {
    categoryFR: 'Le corps', categoryEN: 'Physical build',
    questionFR: "La silhouette",
    questionEN: 'How would you describe your physical build?',
    options: [
      { fr: "Je suis plutôt mince, mes articulations se voient et je prends difficilement du poids.",
        en: 'Thin, prominent joints, little padding on the body overall.', type: 'vata' },
      { fr: "Je suis de taille moyenne, bien proportionnée, et je me muscle assez facilement.",
        en: 'Medium, symmetrical build with good musculature.', type: 'pitta' },
      { fr: "J’ai une ossature solide, une peau douce, et je prends du poids facilement.",
        en: 'Solid build, soft well-hydrated skin, gains weight easily.', type: 'kapha' },
    ],
  },
  {
    categoryFR: 'Le corps', categoryEN: 'Sleep',
    questionFR: "Le sommeil",
    questionEN: 'How do you sleep?',
    options: [
      { fr: "Mon sommeil est léger : un bruit me réveille, puis j’ai du mal à me rendormir.",
        en: 'Light, wake easily, trouble falling back asleep.', type: 'vata' },
      { fr: "Je dors bien, d’un sommeil régulier, et je me rendors sans peine.",
        en: 'Regular and deep, I fall back asleep easily.', type: 'pitta' },
      { fr: "Je dors longtemps et profondément, et le matin, j’ai du mal à me lever.",
        en: 'Long and deep, hard to wake up in the morning.', type: 'kapha' },
    ],
  },
  {
    categoryFR: 'Le corps', categoryEN: 'Digestion',
    questionFR: "La digestion",
    questionEN: 'How would you describe your digestion?',
    options: [
      { fr: "Elle change d’un jour à l’autre : l’appétit varie, les ballonnements reviennent souvent.",
        en: 'Irregular, frequent bloating and gas, variable appetite day to day.', type: 'vata' },
      { fr: "J’ai faim à heures fixes, et si je saute un repas, je deviens irritable.",
        en: 'Strong, hungry at set times, irritable if I skip a meal.', type: 'pitta' },
      { fr: "Elle est lente mais stable : je peux sauter un repas sans m’en apercevoir.",
        en: 'Slow but stable, I can easily skip a meal without discomfort.', type: 'kapha' },
    ],
  },
  {
    categoryFR: 'L’esprit', categoryEN: 'Stress response',
    questionFR: "Sous le stress",
    questionEN: 'How do you react to stress?',
    options: [
      { fr: "Je m’inquiète, je me sens coupable et la tête ne s’arrête plus.",
        en: 'Guilt, tendency toward anxiety, mental chatter.', type: 'vata' },
      { fr: "Je m’impatiente, je m’irrite et je veux tout contrôler.",
        en: 'Irritability, impatience, tendency to control.', type: 'pitta' },
      { fr: "J’ai l’air calme, mais je me referme et je résiste à ce qui change.",
        en: 'Calm on the surface, tendency to overprotect, resistance to change.', type: 'kapha' },
    ],
  },
  {
    categoryFR: 'Le corps', categoryEN: 'Daytime energy',
    questionFR: "L’énergie au fil de la journée",
    questionEN: 'How does your energy unfold during the day?',
    options: [
      { fr: "Elle monte d’un coup, puis elle chute sans prévenir.",
        en: 'Jagged: energy spikes followed by sharp drops.', type: 'vata' },
      { fr: "Elle reste forte jusqu’au soir, et j’ai du mal à décrocher.",
        en: 'Sustained and intense through the evening, hard to turn off.', type: 'pitta' },
      { fr: "Le matin, je démarre lentement ; une fois lancée, je tiens longtemps.",
        en: 'Slow to start in the morning, steady once going, natural endurance.', type: 'kapha' },
    ],
  },
  {
    categoryFR: 'L’esprit', categoryEN: 'Relationship to change',
    questionFR: "Face au changement",
    questionEN: 'How do you experience change?',
    options: [
      { fr: "J’aime la nouveauté, et la routine m’ennuie vite.",
        en: 'I love novelty, I get bored quickly with routine.', type: 'vata' },
      { fr: "Je change lorsque c’est logique, mais je déteste le chaos que l’on m’impose.",
        en: "I initiate change when it's logical, I hate imposed chaos.", type: 'pitta' },
      { fr: "Je préfère la stabilité : changer me demande un effort.",
        en: 'I prefer stability, change takes conscious effort.', type: 'kapha' },
    ],
  },
  {
    categoryFR: 'L’esprit', categoryEN: 'Mental quality',
    questionFR: "Le mental",
    questionEN: 'What is the dominant quality of your mind?',
    options: [
      { fr: "Il va vite et part dans tous les sens, plusieurs idées à la fois.",
        en: 'Quick but scattered, several ideas at once.', type: 'vata' },
      { fr: "Il est précis et cherche la solution, parfois jusqu’à trop critiquer.",
        en: 'Precise, analytical, solution-oriented, sometimes too critical.', type: 'pitta' },
      { fr: "Il est calme : je prends le temps de réfléchir avant de répondre.",
        en: 'Calm, reflective, takes time to digest before answering.', type: 'kapha' },
    ],
  },
  {
    categoryFR: 'L’esprit', categoryEN: 'Relationship to emotions',
    questionFR: "Les émotions",
    questionEN: 'How do you move through your emotions?',
    options: [
      { fr: "Je ressens fort, mais cela passe vite et change souvent.",
        en: 'I feel intensely and briefly, my emotions change quickly.', type: 'vata' },
      { fr: "Elles montent comme une chaleur : frustration, colère, impatience.",
        en: 'Emotions rise as heat: frustration, anger, impatience.', type: 'pitta' },
      { fr: "Elles s’installent lentement et restent longtemps : tristesse, attachement.",
        en: 'Emotions accumulate slowly: deep sadness, attachment.', type: 'kapha' },
    ],
  },
  {
    categoryFR: 'Le corps', categoryEN: 'Type of fatigue',
    questionFR: "Lorsque l’épuisement arrive",
    questionEN: 'What does your fatigue look like when it hits?',
    options: [
      { fr: "Je me sens vidée, les nerfs à vif, la tête surmenée.",
        en: 'Nervous exhaustion, feeling drained, mental overload.', type: 'vata' },
      { fr: "Je surchauffe : je m’irrite, j’ai les yeux rouges et mal à la tête.",
        en: 'Exhaustion from overheating: irritability, red eyes, headaches.', type: 'pitta' },
      { fr: "Je deviens lourde, sans envie de rien, et j’ai du mal à me motiver.",
        en: 'Heaviness, wanting to do nothing, difficulty motivating.', type: 'kapha' },
    ],
  },
  {
    categoryFR: 'L’esprit', categoryEN: 'Temperament',
    questionFR: "Le tempérament",
    questionEN: 'How would you describe your temperament?',
    options: [
      { fr: "Je suis vive et enthousiaste, je parle facilement et j’aime ce qui change.",
        en: 'Lively, enthusiastic, easy speaker, loves change.', type: 'vata' },
      { fr: "Je suis intense et directe, et j’aime convaincre.",
        en: 'Powerful and intense, direct, loves to persuade.', type: 'pitta' },
      { fr: "Je suis stable et posée, je m’adapte, et j’aime profiter des bonnes choses.",
        en: 'Stable, adaptable, easy-going, grounded.', type: 'kapha' },
    ],
  },
];

const ALL_DOSHAS: DoshaType[] = ['vata', 'pitta', 'kapha'];

// Textes de Krystine sous la dominance (FR seulement; la 3e phrase est retirée sur l'écran du résultat).
const CARTE_DOMINANCE: Record<DoshaType, [string, string, string]> = {
  vata: [
    'Le mental part dans tous les sens. Le sommeil devient plus fragile.',
    'Lorsque le vent prend trop de place, tout devient plus difficile à tenir ensemble.',
    'Votre profil vous montre ce qui l’attise chez vous, et ce qui l’apaise.',
  ],
  pitta: [
    'Impatience, irritabilité, et le soir, le feu tarde à s’apaiser.',
    'À force d’intensité, même ce qui nous fait avancer peut finir par nous brûler.',
    'Votre profil vous aide à voir ce qui nourrit cette chaleur, et comment la tempérer.',
  ],
  kapha: [
    'Le matin démarre lentement. L’élan tarde à venir et les choses s’accumulent plus facilement.',
    'Lorsque tout devient plus lourd, ce n’est pas toujours qu’il faut faire plus.',
    'Votre profil vous montre ce qui entretient cette lourdeur, et ce qui remet du mouvement.',
  ],
};
const NOM_AYURVEDA: Record<DoshaType, string> = { vata: 'Vata', pitta: 'Pitta', kapha: 'Kapha' };

// La nomenclature (règle absolue de Krystine, 3 oct. 2026) : nous portons les
// cinq éléments, unis en trois doshas; chaque dominance nommée porte ses
// éléments. Textes approuvés le 3 oct. 2026, miroir mot pour mot de
// lireLecture (functions/src/quizCourriel.ts) : toute retouche aux deux endroits.
const ELEMENTS: Record<DoshaType, string> = { vata: 'Vent et Espace', pitta: 'Feu et Eau', kapha: 'Eau et Terre' };
const ELEMENTS_EN: Record<DoshaType, string> = { vata: 'Wind and Space', pitta: 'Fire and Water', kapha: 'Water and Earth' };
const nomme = (d: DoshaType) => `${NOM_AYURVEDA[d]} (${ELEMENTS[d]})`;
const COURANT_PAIRE: Record<string, string> = { 'vata-pitta': 'Vent et Feu', 'vata-kapha': 'Vent et Terre', 'pitta-kapha': 'Feu et Terre' };
const EXPLICATION_DOUBLE = 'Nous sommes faits des cinq éléments : l’Espace, le Vent, le Feu, l’Eau et la Terre. Ils s’unissent en trois doshas : Vata (Vent et Espace), Pitta (Feu et Eau) et Kapha (Eau et Terre). Chez la plupart d’entre nous, deux doshas prennent plus de place que le troisième, l’un dominant, l’autre secondaire : l’Ayurveda appelle cela un type mixte.';
const PAIRE_PHRASE: Record<string, string> = {
  'vata-pitta': 'C’est l’image du vent qui souffle sur le feu : lorsque Vata (Vent et Espace) s’emporte, il attise Pitta (Feu et Eau). La première chose à apaiser, c’est Vata.',
  'vata-kapha': 'Vata (Vent et Espace) disperse et Kapha (Eau et Terre) alourdit : un jour tout s’agite, le lendemain plus rien n’avance. La chaleur et la régularité aident les deux.',
  'pitta-kapha': 'Pitta (Feu et Eau) pousse et Kapha (Eau et Terre) retient : beaucoup d’intensité, avec de la lenteur à se mettre en mouvement. Rafraîchir Pitta et activer Kapha vont ensemble.',
};
const EQUILIBRE_CARTE = 'Vata (Vent et Espace), Pitta (Feu et Eau) et Kapha (Eau et Terre) sont presque à égalité, donc plutôt équilibrés. Cependant, avec le froid et les journées chargées, Vata peut très bien se mettre à dominer.';
const EQUILIBRE_AYURVEDA = 'Dans le langage de l’Ayurveda, Vata (Vent et Espace), Pitta (Feu et Eau) et Kapha (Eau et Terre) sont ici presque à égalité.';

type Lecture = {
  branche: 'equilibre' | 'double' | 'teinte' | 'net';
  montres: DoshaType[];
  libelle: string;
  titre: string;
  noms: string[];
  carte: string[];
  ayurveda: string;
  sousCarte: string;
};
const lireLecture = (p: { vata: number; pitta: number; kapha: number }, lang: 'FR' | 'EN'): Lecture => {
  const { ordre, branche } = lireProfil(p);
  const [d1, d2] = ordre;
  const en = lang === 'EN';
  if (branche === 'equilibre') return {
    branche, montres: ['vata', 'pitta', 'kapha'],
    libelle: en ? 'Your reading today' : 'Votre lecture aujourd’hui', titre: en ? 'Balance' : 'Équilibre',
    noms: (['vata', 'pitta', 'kapha'] as DoshaType[]).map(d => en ? `${NOM_AYURVEDA[d]} (${ELEMENTS_EN[d]})` : nomme(d)), carte: en ? [] : [EQUILIBRE_CARTE],
    ayurveda: en ? 'In the language of Ayurveda, Vata (Wind and Space), Pitta (Fire and Water) and Kapha (Water and Earth) are nearly even here.' : EQUILIBRE_AYURVEDA,
    sousCarte: '',
  };
  if (branche === 'double') {
    const k = `${d1}-${d2}`;
    const n = (d: DoshaType) => (en ? `${NOM_AYURVEDA[d]} (${ELEMENTS_EN[d]})` : nomme(d));
    return {
      branche, montres: [d1, d2],
      libelle: en ? 'Your two dominances today' : 'Vos deux dominances aujourd’hui',
      titre: en ? `${DOMINANCE_EN[d1]} and ${DOMINANCE_EN[d2]}` : COURANT_PAIRE[k],
      noms: [n(d1), n(d2)], carte: en ? [] : [EXPLICATION_DOUBLE, PAIRE_PHRASE[k]],
      ayurveda: en
        ? `In the language of Ayurveda, these two dominances are called ${n(d1)} and ${n(d2)}.`
        : `Dans le langage de l’Ayurveda, ces deux dominances s’appellent ${nomme(d1)} et ${nomme(d2)}.`,
      sousCarte: en ? '' : `Votre lecture montre deux dominances à égalité : ${nomme(d1)} et ${nomme(d2)}.`,
    };
  }
  return {
    branche, montres: [d1],
    libelle: en ? 'Your dominance today' : 'Votre dominance aujourd’hui',
    titre: (en ? DOMINANCE_EN : DOMINANCE_FR)[d1],
    noms: [`${NOM_AYURVEDA[d1]} (${(en ? ELEMENTS_EN : ELEMENTS)[d1]})`],
    carte: en ? [] : [...CARTE_DOMINANCE[d1]],
    ayurveda: en
      ? `In the language of Ayurveda, this dominance is called ${NOM_AYURVEDA[d1]} (${ELEMENTS_EN[d1]}).`
      : `Dans le langage de l’Ayurveda, cette dominance est appelée ${nomme(d1)}.`,
    sousCarte: !en && branche === 'teinte' ? `Votre lecture montre aussi une part importante de ${nomme(d2)}.` : '',
  };
};

/* En-tête du résultat : médaillon(s), libellé, grand mot, puis petit picto + nom de chaque dosha montré */
const EnteteLecture: React.FC<{ L: Lecture; ink: string }> = ({ L, ink }) => (
  <>
    <div className="flex justify-center gap-4">
      {L.montres.map((x, i) => (
        <Medallion key={x} d={x} size={L.montres.length === 1 ? 96 : L.montres.length === 2 ? 76 : 62} delay={0.25 + i * 0.08} />
      ))}
    </div>
    <p className="mt-7 text-[0.68rem] uppercase tracking-[0.32em]" style={{ color: ink }}>{L.libelle}</p>
    <h2 className="mt-3 v2-serif font-light text-[#1c1712] leading-[0.96] text-[clamp(3rem,6.5vw,5rem)]">{L.titre}</h2>
    <p className={`mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[0.8rem] leading-snug text-[#3a2f23] ${L.branche === 'double' ? 'flex-col sm:flex-row' : ''}`}>
      {L.montres.map((x, i) => (
        <React.Fragment key={x}>
          {i > 0 && <span aria-hidden className={`text-[#9c7a44] ${L.branche === 'double' ? 'hidden sm:inline' : ''}`}>·</span>}
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <DoshaPicto d={x} size={20} className="shrink-0" />
            {L.noms[i]}
          </span>
        </React.Fragment>
      ))}
    </p>
  </>
);

/* Carte de Krystine + mention discrète du mot Ayurveda, puis la phrase sous la carte */
const CarteDominance: React.FC<{ L: Lecture; complet: boolean }> = ({ L, complet }) => {
  const double = L.branche === 'double';
  // La 3e phrase de la carte nette est retirée sur l'écran du résultat complet.
  const carte = L.carte.length === 3 && complet ? L.carte.slice(0, 2) : L.carte;
  return (
    <div className="mt-10 max-w-[36ch] mx-auto">
      {carte.length > 0 && (
        <div>
          {carte.map((t, i) => (double ? i === 1 : i === 0)
            ? <p key={i} className={`${i > 0 ? 'mt-4 ' : ''}v2-serif font-light text-[clamp(1.2rem,2vw,1.5rem)] leading-snug text-[#1c1712]`}>{t}</p>
            : <p key={i} className={`${i > 0 ? 'mt-3 ' : ''}text-[0.95rem] leading-[1.75] text-[#3a2f23]`}>{t}</p>)}
        </div>
      )}
      <p className="mt-6 text-[0.75rem] leading-relaxed text-[#1c1712]/55">{L.ayurveda}</p>
      {L.sousCarte && <p className="mt-5 text-[0.95rem] leading-[1.75] text-[#1c1712]">{L.sousCarte}</p>}
    </div>
  );
};

// Icône éditoriale par dosha (Phosphor, weight light), purement décorative.
const DOSHA_ICON: Record<DoshaType, React.ComponentType<{ size?: number; weight?: any; className?: string; style?: React.CSSProperties }>> = {
  vata: Wind,
  pitta: Flame,
  kapha: Leaf,
};

// Système multi-couleur V2 : accent (médaillon plein, filet), accent-encre
// (texte, contraste AA sur crème/tint) et tint de carte, par dosha.
const DOSHA_THEME: Record<DoshaType, { accent: string; ink: string; tint: string }> = {
  // Les couleurs des pictos de Krystine (1er oct. 2026) : Vata vert, Pitta rouge, Kapha bleu.
  // Fond crème du site pour toutes, jamais de teinte pâle (Krystine, 2 oct. 2026 : « couleurs pâlottes, arck »).
  vata:  { accent: '#6e7b45', ink: '#4f5a2e', tint: '#faf6ee' },
  pitta: { accent: '#a8443c', ink: '#83322b', tint: '#faf6ee' },
  kapha: { accent: '#3d5f94', ink: '#2c4670', tint: '#faf6ee' },
};

// Les pictos aquarelle de Krystine, détourés (public/quiz/pictos/).
const DoshaPicto: React.FC<{ d: DoshaType; size: number; className?: string }> = ({ d, size, className = '' }) => (
  <img src={`/quiz/pictos/${d}.png`} alt="" aria-hidden width={size} height={size} className={`object-contain ${className}`} style={{ width: size, height: size }} />
);

const themeForName = (name: string) =>
  DOSHA_THEME[(name || '').trim().toLowerCase() as DoshaType]
  ?? { accent: '#9c7a44', ink: '#7d6330', tint: '#faf6ee' };

// One answer per question : the dosha the user picked. Total score equals the
// number of answered questions; percentages are computed from that total.
// L'algorithme du résultat, miroir de lireProfil (functions/src/quizCourriel.ts) :
// pourcentages par bonds de 10, Vent puis Feu puis Terre à égalité.
const PRIORITE_DOSHA: DoshaType[] = ['vata', 'pitta', 'kapha'];
const TAG_COURANT: Record<DoshaType, string> = { vata: 'vent', pitta: 'feu', kapha: 'terre' };
const lireProfil = (p: { vata: number; pitta: number; kapha: number }) => {
  const dix = (d: DoshaType) => Math.round((Number(p[d]) || 0) / 10) * 10;
  const ordre = [...PRIORITE_DOSHA].sort((a, b) => dix(b) - dix(a));
  const [d1, d2, d3] = ordre;
  const second = `second-${TAG_COURANT[d2]}`;
  const branche: 'equilibre' | 'double' | 'teinte' | 'net' = dix(d1) - dix(d3) <= 10 ? 'equilibre'
    : dix(d1) === dix(d2) ? 'double'
    : dix(d1) - dix(d2) === 10 ? 'teinte'
    : 'net';
  const etiquettes = branche === 'equilibre' ? ['profil-equilibre']
    : branche === 'double' ? ['profil-double', second]
    : branche === 'teinte' ? ['profil-teinte', second]
    : ['profil-net'];
  return { d1, ordre, branche, etiquettes, suite: `suite-${TAG_COURANT[d1]}` };
};

const scoresFromPicks = (picks: (DoshaType | null)[]) => {
  const s = { vata: 0, pitta: 0, kapha: 0 };
  for (const p of picks) if (p) s[p] += 1;
  return s;
};

/* ════════════════════════ Micro-composants du résultat ════════════════════════ */

/* Médaillon plein qui éclot (scale + rotate spring) */
const Medallion: React.FC<{ d: DoshaType; size?: number; delay?: number; className?: string }> = ({
  d, size = 96, delay = 0.25, className = '',
}) => {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className={`grid place-items-center will-change-transform ${className}`}
      style={{ width: size, height: size }}
      initial={reduce ? false : { scale: 0, rotate: -12 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ ...SPRING, delay }}
    >
      <DoshaPicto d={d} size={size} />
    </motion.span>
  );
};

/* Statistique d'un dosha : icône, pourcentage, filet proportionnel qui se trace */
const DoshaStat: React.FC<{ d: DoshaType; pct: number; label: string }> = ({ d, pct, label }) => {
  const th = DOSHA_THEME[d];
  const reduce = useReducedMotion();
  return (
    <div className="flex flex-col items-center gap-1.5">
      <DoshaPicto d={d} size={30} />
      <span className="v2-serif font-light text-3xl md:text-4xl tabular-nums" style={{ color: th.ink }}>{pct}%</span>
      <span className="text-center text-[0.58rem] uppercase tracking-[0.16em] text-[#1c1712]/60">{label}</span>
      <span className="relative mt-1 block h-px w-16 bg-[#1c1712]/10 overflow-hidden">
        <motion.span
          className="absolute inset-0"
          style={{ background: th.accent, transformOrigin: 'left center' }}
          initial={reduce ? false : { scaleX: 0 }}
          animate={{ scaleX: Math.max(pct, 2) / 100 }}
          transition={{ duration: 1.1, ease, delay: 0.5 }}
        />
      </span>
    </div>
  );
};

/* ── La suite de lecture (Krystine, 3 oct. 2026) ──
   Miroir de SUITE_PRETE (functions/src/quizCourriel.ts) : les dominances qui
   ont déjà leur séquence de suite. Jamais d'inscription sans un geste de la
   personne, sauf l'abonnée active (consentement déjà donné), dont l'étiquette
   de suite se pose côté serveur. */
const SUITE_PRETE: Record<DoshaType, boolean> = { vata: true, pitta: true, kapha: true };
const PHRASE_SUITE = (d: DoshaType, prete: boolean) => prete
  ? 'Quelques lettres pour comprendre ce dont vous avez besoin en ce moment et ce qui peut aider. Vous pouvez vous désabonner en un clic.'
  : `Nous vous écrirons lorsque la suite pour ${nomme(d)} sera prête. Vous pouvez vous désabonner en un clic.`;
const PHRASE_FORMULAIRE = (d: DoshaType, prete: boolean) => prete
  ? 'Je souhaite recevoir les lettres de Krystine St-Laurent pour mieux comprendre mes résultats et découvrir les programmes proposés pour aller plus loin. Je peux me désabonner à tout moment.'
  : `Je souhaite recevoir les lettres de Krystine St-Laurent : la suite pour ${nomme(d)} lorsqu’elle sera prête, et les programmes proposés pour aller plus loin. Je peux me désabonner à tout moment.`;
const NOTE_SUITE = (d: DoshaType, prete: boolean) => prete
  ? 'Vos lettres arrivent\u00a0; la première, demain.'
  : `C’est noté. Nous vous écrirons lorsque la suite pour ${nomme(d)} sera prête.`;

const BlocSuite: React.FC<{
  etat: EtatSuite | 'envoyee';
  dosha: DoshaType;
  prete: boolean;
  occupe: boolean;
  onInscrire: () => void;
  onReabonner: () => void;
}> = ({ etat, dosha, prete, occupe, onInscrire, onReabonner }) => {
  const [retour, setRetour] = useState(false);
  let corps: React.ReactNode;
  if (etat === 'offre') {
    corps = (
      <>
        <p className="v2-serif font-light text-[clamp(1.25rem,2vw,1.55rem)] leading-snug text-[#1c1712]">Recevoir la suite de ma lecture</p>
        <p className="mt-3 text-[0.9rem] leading-relaxed text-[#3a2f23] max-w-[44ch] mx-auto">{PHRASE_SUITE(dosha, prete)}</p>
        <button
          type="button"
          onClick={onInscrire}
          disabled={occupe}
          className="mt-6 w-full inline-flex items-center justify-center gap-3 bg-[#1c1712] px-8 py-4 text-[0.7rem] uppercase tracking-[0.18em] text-[#f4efe6] transition-colors duration-300 hover:bg-[#9c7a44] disabled:opacity-60 min-h-[44px]"
        >
          {occupe ? 'Un instant…' : <>{prete ? 'Recevoir la suite de ma lecture' : 'Être avisée lorsque la suite sera prête'} <ArrowRight size={15} weight="regular" /></>}
        </button>
      </>
    );
  } else if (etat === 'auto' || etat === 'deja') {
    corps = (
      <>
        <p className="v2-serif font-light text-[clamp(1.15rem,1.9vw,1.4rem)] leading-snug text-[#1c1712]">
          {etat === 'deja'
            ? 'La suite de votre lecture vous arrive déjà par courriel.'
            : prete
              ? 'Votre lecture continue par courriel : la première lettre arrive demain.'
              : `Votre lecture continuera par courriel lorsque la suite pour ${nomme(dosha)} sera prête.`}
        </p>
      </>
    );
  } else if (etat === 'refusee') {
    corps = <p className="text-[0.95rem] leading-relaxed text-[#3a2f23]">C’est noté : la suite ne vous sera pas envoyée. Vous restez abonnée à nos lettres.</p>;
  } else if (etat === 'desabonnee') {
    // Elle se réinscrit elle-même, d'une case (Krystine, 4 oct. 2026).
    corps = (
      <>
        <p className="text-[0.95rem] leading-relaxed text-[#3a2f23]">Votre adresse ne reçoit plus nos lettres pour le moment.</p>
        <label className="mt-5 flex items-start gap-3 text-left cursor-pointer min-h-[44px]">
          <input type="checkbox" checked={retour} onChange={(e) => setRetour(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#4E6349]" />
          <span className="text-[0.9rem] leading-relaxed text-[#3a2f23]">Je souhaite recevoir de nouveau les lettres de Krystine St-Laurent, avec la suite de ma lecture. Je peux me désabonner à tout moment.</span>
        </label>
        <button
          type="button"
          onClick={onReabonner}
          disabled={!retour || occupe}
          className="mt-5 w-full inline-flex items-center justify-center gap-3 bg-[#1c1712] px-8 py-4 text-[0.7rem] uppercase tracking-[0.18em] text-[#f4efe6] transition-colors duration-300 hover:bg-[#9c7a44] disabled:opacity-40 min-h-[44px]"
        >
          {occupe ? 'Un instant…' : <>Me réinscrire <ArrowRight size={15} weight="regular" /></>}
        </button>
      </>
    );
  } else if (etat === 'confirmation') {
    corps = <p className="text-[0.95rem] leading-relaxed text-[#3a2f23]">Un courriel de confirmation vient de partir à votre adresse. Cliquez sur « Confirmer mon retour » et vos lettres reprennent, avec la suite de votre lecture.</p>;
  } else {
    corps = <p className="v2-serif font-light text-[clamp(1.15rem,1.9vw,1.4rem)] leading-snug text-[#1c1712]">{NOTE_SUITE(dosha, prete)}</p>;
  }
  // Avant l'accord, l'action tient dans un cadre; après, une simple phrase de clôture.
  const action = etat === 'offre' || etat === 'desabonnee' || etat === 'confirmation';
  return (
    <div role="status" className={action ? 'mt-10 mx-auto max-w-[34rem] border border-[#9c7a44]/50 bg-[#faf6ee] px-6 py-7 text-center' : 'mt-8 mx-auto max-w-[34rem] text-center'}>
      {corps}
    </div>
  );
};

// L'accord donné (courriel reçu, ou abonnée active) : seul ce cas ouvre le repère.
const ETATS_ACCORD: (EtatSuite | 'envoyee')[] = ['auto', 'deja', 'inscrite', 'envoyee', 'refusee'];

/* Étape 1, identique avant et après l'envoi : le grand mot, les pourcentages, l'explication. */
const VotreLecture: React.FC<{ L: Lecture; ink: string; percentages: { vata: number; pitta: number; kapha: number }; lang: 'FR' | 'EN'; complet: boolean }> = ({ L, ink, percentages, lang, complet }) => (
  <>
    <EnteteLecture L={L} ink={ink} />
    <div className="mt-10 flex justify-center gap-9 md:gap-12">
      {ALL_DOSHAS.map(d => (
        <DoshaStat key={d} d={d} pct={percentages[d]} label={`${NOM_AYURVEDA[d]} (${(lang === 'FR' ? ELEMENTS : ELEMENTS_EN)[d]})`} />
      ))}
    </div>
    <CarteDominance L={L} complet={complet} />
  </>
);

/* Étape 4, après le repère : les Rituels essentiels (27 $), la même offre pour
   tous les résultats (Krystine, 5 oct. 2026). Miroir de RITUELS_VIVANTS
   (functions/src/quizCourriel.ts) : toute retouche aux deux endroits. La liste
   d'attente du programme saisonnier reste en petit lien souligné dessous. */
const LIEN_ATTENTE: Partial<Record<DoshaType, string>> = {
  pitta: '/liste-attente?programme=pitta',
  kapha: '/liste-attente?programme=kapha',
};
const CarteRituelsEssentiels: React.FC<{ dosha: DoshaType | null }> = ({ dosha }) => {
  const attente = dosha ? LIEN_ATTENTE[dosha] : undefined;
  return (
    <div className="mt-10 mx-auto max-w-[34rem] border border-[#9c7a44] bg-[#f4efe6] px-6 py-8 md:px-9 text-center">
      <p className="text-[0.62rem] uppercase tracking-[0.3em] text-[#7d6330]">Les Rituels essentiels · 27 $</p>
      <h3 className="mt-3 v2-serif font-light text-[#1c1712] leading-[1.05] text-[clamp(1.7rem,3vw,2.3rem)]">Pour commencer dès maintenant à intégrer l’Ayurveda, simplement</h3>
      <p className="mt-4 text-[0.95rem] leading-[1.75] text-[#3a2f23] max-w-[40ch] mx-auto">
        Votre lecture vous dit quoi équilibrer; les Rituels essentiels vous montrent comment, en moins de 5 minutes par jour. Des gestes pratiqués depuis près de 40 ans : l’automassage, les soins du nez, de la bouche, des mains et des pieds. 10 capsules courtes et un bonus.
      </p>
      <p className="mt-5 v2-serif font-light text-[1.9rem] text-[#1c1712]">27 $</p>
      <a
        href="/rituels-essentiels?via=quiz"
        onClick={() => trackInterne('quiz_clic_rituels_vivants')}
        className="mt-6 w-full inline-flex items-center justify-center gap-3 bg-[#1c1712] px-8 py-4 text-[0.7rem] uppercase tracking-[0.18em] text-[#f4efe6] transition-colors duration-300 hover:bg-[#9c7a44] min-h-[44px]"
      >
        Je commence ce soir <ArrowRight size={15} weight="regular" />
      </a>
      {attente && (
        <a
          href={attente}
          className="mt-5 inline-block text-[0.8rem] leading-relaxed text-[#3a2f23] underline underline-offset-4 decoration-[#1c1712]/30 hover:text-[#7d6330] min-h-[44px]"
        >
          Rejoindre la liste d’attente du programme {nomme(dosha as DoshaType)}
        </a>
      )}
    </div>
  );
};

/* Étape 3, après l'accord seulement : le repère offert en cadeau (doshaRituals). */
const RepereCadeau: React.FC<{ dominant: 'Vata' | 'Pitta' | 'Kapha'; th: { accent: string; ink: string }; lang: 'FR' | 'EN' }> = ({ dominant, th, lang }) => {
  const ritual = RITUALS[dominant];
  if (!ritual) return null;
  const soir = dominant === 'Vata';
  return (
    <div className="mx-auto max-w-[34rem] bg-[#faf6ee] border p-7 md:p-9 text-left" style={{ borderColor: `${th.accent}40` }}>
      <p className="text-[0.62rem] uppercase tracking-[0.3em]" style={{ color: th.ink }}>
        {lang === 'FR'
          ? (soir ? 'Votre repère de ce soir' : 'Votre repère de demain matin')
          : (soir ? 'Your practice for tonight' : 'Your practice for tomorrow morning')}
      </p>
      <h3 className="mt-3 v2-serif font-light text-[#1c1712] leading-[1.08] text-[clamp(1.5rem,2.4vw,2rem)]">
        {lang === 'FR' ? ritual.titleFR : ritual.titleEN}
      </h3>
      <p className="mt-5 inline-flex items-center gap-2 border px-3.5 py-1.5 text-[0.58rem] uppercase tracking-[0.2em] text-[#3a2f23]" style={{ borderColor: `${th.accent}55` }}>
        <Clock size={12} weight="light" style={{ color: th.ink }} /> {lang === 'FR' ? ritual.momentFR : ritual.momentEN}
      </p>
      <ol className="mt-7 space-y-4">
        {(lang === 'FR' ? ritual.stepsFR : ritual.stepsEN).map((stepTxt, i) => (
          <li key={i} className="flex gap-4">
            <span className="shrink-0 w-7 h-7 rounded-full grid place-items-center v2-serif text-[0.82rem] text-[#faf6ee]" style={{ backgroundColor: th.accent }}>
              {i + 1}
            </span>
            <span className="flex-1 text-[0.92rem] leading-[1.75] text-[#3a2f23]">{stepTxt}</span>
          </li>
        ))}
      </ol>
    </div>
  );
};

/* ════════════════════════ Le quiz (carte question + progression + résultat) ════════════════════════ */

const Quiz: React.FC<{ lang: 'FR' | 'EN' }> = ({ lang }) => {
  const { user, member, setSignInOpen } = useApp();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const t = CONTENT[lang];
  const ay = t.ayurveda;

  // ── Quiz state ──
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<(DoshaType | null)[]>(
    () => Array<DoshaType | null>(QUIZ_DATA.length).fill(null),
  );
  const [flashPick, setFlashPick] = useState<DoshaType | null>(null);
  const [teaser, setTeaser] = useState<null | { dominant: any; percentages: { vata: number; pitta: number; kapha: number } }>(null);
  const [result, setResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const computeTeaser = (scores: { vata: number; pitta: number; kapha: number }) => {
    const { vata, pitta, kapha } = scores;
    const total = vata + pitta + kapha || 1;
    const percentages = {
      vata: Math.round((vata / total) * 100),
      pitta: Math.round((pitta / total) * 100),
      kapha: Math.round((kapha / total) * 100),
    };
    // Le dominant suit l'algorithme validé : à égalité, Vent, puis Feu, puis Terre.
    const dominant = ay.doshas[PRIORITE_DOSHA.indexOf(lireProfil(percentages).d1)];
    return { dominant, percentages };
  };

  // Single-click answer: records the pick and auto-advances after a brief
  // highlight so the user sees which option they chose.
  const handlePick = (type: DoshaType) => {
    if (flashPick) return; // ignore double-clicks during the reveal
    setFlashPick(type);
    setTimeout(() => {
      const nextPicks = [...picks];
      nextPicks[step] = type;
      const nextStep = step + 1;
      const done = nextStep >= QUIZ_DATA.length;
      setPicks(nextPicks);
      setStep(nextStep);
      setFlashPick(null);
      if (done) setTeaser(computeTeaser(scoresFromPicks(nextPicks)));
    }, 750); // le temps de voir le crochet vert s'allumer (Krystine, 4 oct. 2026)
  };

  const goBack = () => {
    if (step === 0) return;
    const prevStep = step - 1;
    const nextPicks = [...picks];
    nextPicks[prevStep] = null;
    setStep(prevStep);
    setPicks(nextPicks);
    setFlashPick(null);
    setTeaser(null);
  };

  const restart = () => {
    setStep(0);
    setPicks(Array<DoshaType | null>(QUIZ_DATA.length).fill(null));
    setFlashPick(null);
    setTeaser(null);
    setResult(null);
    setEnvoye(false);
    setSuite(null);
    resultatVu.current = false;
  };

  // La suite de lecture à l'écran du résultat. Personne connectée : l'état
  // vient de la fonction suiteQuiz (adresse du compte, dernier résultat).
  // Personne non connectée : 'envoyee' si elle a choisi « Recevoir ma lecture
  // et sa suite », rien si elle a choisi seulement son résultat.
  const [suite, setSuite] = useState<null | { etat: EtatSuite | 'envoyee'; dosha: DoshaType; prete: boolean }>(null);
  const [suiteOccupe, setSuiteOccupe] = useState(false);
  const agirSuite = async (action: 'inscrire' | 'refuser' | 'reabonner') => {
    setSuiteOccupe(true);
    try {
      const r = await suiteQuiz(action);
      setSuite(r);
      if ((action === 'inscrire' || action === 'reabonner') && r.etat === 'inscrite') {
        trackLead('quiz');
        if (user) { try { await points.newsletterSigned(user.uid, 'quiz'); } catch { /* non-fatal */ } }
      }
    } catch { /* le bouton reste là; rien n'est écrit sans réponse du serveur */ }
    finally { setSuiteOccupe(false); }
  };

  // « Recevoir mon résultat » (Krystine, 2 oct. 2026) : une visiteuse reçoit
  // son résultat par courriel sans créer de compte. La fonction
  // `envoyerResultatQuiz` vérifie le jeton reCAPTCHA, enregistre le résultat,
  // envoie le courriel et inscrit au fil seulement par le bouton principal.
  const [prenom, setPrenom] = useState('');
  const [courriel, setCourriel] = useState('');
  const [pot, setPot] = useState('');
  const [erreurEnvoi, setErreurEnvoi] = useState<string | null>(null);
  // Le champ à corriger reçoit le curseur et se souligne en rouge : le message
  // tombe sous le bouton, loin du champ, et se touchait en vain (oct. 2026).
  const [champFautif, setChampFautif] = useState<'prenom' | 'courriel' | null>(null);
  const prenomRef = useRef<HTMLInputElement>(null);
  const courrielRef = useRef<HTMLInputElement>(null);
  const allerAuChamp = (c: 'prenom' | 'courriel' | null) => {
    const el = c === 'prenom' ? prenomRef.current : c === 'courriel' ? courrielRef.current : null;
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.focus({ preventScroll: true });
  };
  // L'envoi a échoué côté serveur : ce qui a été saisi reste, la trace est
  // gardée (quizTentatives) et un bouton Réessayer s'affiche.
  const [echecServeur, setEchecServeur] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const captcha = useRecaptcha(!user && !!teaser && !result);

  // Deux gestes (Krystine, 3 oct. 2026) : le bouton principal « Recevoir ma
  // lecture et sa suite » vaut consentement (geste positif, clairement
  // décrit juste au-dessus); le petit lien donne le résultat seul.
  const [veutSuite, setVeutSuite] = useState(false);
  const envoyerResultat = async (e: React.FormEvent, avecSuite = veutSuite) => {
    e.preventDefault();
    if (!teaser) return;
    setErreurEnvoi(null);
    setEchecServeur(false);
    setChampFautif(null);
    if (!prenom.trim()) { setErreurEnvoi('Entrez votre prénom.'); setChampFautif('prenom'); allerAuChamp('prenom'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(courriel.trim())) { setErreurEnvoi('Entrez une adresse courriel valide.'); setChampFautif('courriel'); allerAuChamp('courriel'); return; }
    // Case expirée ou absente : la lecture part quand même (le serveur le permet
    // une fois par adresse). Seule une case jamais cochée bloque encore.
    if (RECAPTCHA_SITE_KEY && !captcha.getToken() && (captcha.etat === 'prete' || captcha.etat === 'chargement')) {
      setErreurEnvoi('Cochez la case « Je ne suis pas un robot ».');
      return;
    }
    setSubmitting(true);
    try {
      await envoyerResultatQuiz({
        prenom: prenom.trim(),
        email: courriel.trim(),
        dominant: teaser.dominant.name,
        pourcentages: teaser.percentages,
        suite: avecSuite,
        token: captcha.getToken(),
        site: pot,
      });
      if (avecSuite) {
        trackLead('quiz');
        const d1 = lireProfil(teaser.percentages).d1;
        setSuite({ etat: 'envoyee', dosha: d1, prete: SUITE_PRETE[d1] });
      }
      setEnvoye(true);
      setResult({ dominant: teaser.dominant, percentages: teaser.percentages });
    } catch (err: any) {
      captcha.resetWidget();
      const deja = err?.code === 'functions/resource-exhausted' && err?.message;
      // Un refus de la case n'est pas une panne : la case se recharge, et un
      // seul geste suffit (cocher, puis Réessayer).
      const caseRefusee = ['functions/deadline-exceeded', 'functions/permission-denied', 'functions/invalid-argument'].includes(err?.code)
        && /captcha|vérification/i.test(String(err?.message || ''));
      setEchecServeur(!deja);
      setErreurEnvoi(deja
        ? err.message
        : caseRefusee
          ? 'La case « Je ne suis pas un robot » a expiré avant l’envoi. Ce que vous avez écrit est gardé : cochez-la de nouveau, puis touchez Réessayer.'
          : 'Votre résultat n’a pas pu partir. Ce que vous avez écrit est gardé : cochez de nouveau la case « Je ne suis pas un robot », puis touchez Réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuizCompute = async () => {
    if (!user) { setSignInOpen(true); return; }
    const { dominant, percentages } = teaser ?? computeTeaser(scoresFromPicks(picks));
    const fullName = (member?.displayName || user.displayName || '').trim();
    const [firstName, ...rest] = fullName ? fullName.split(/\s+/) : [''];
    const lastName = rest.join(' ');
    setSubmitting(true);
    try {
      await addDoshaQuizResult({
        uid: user.uid,
        firstName: firstName || '',
        lastName: lastName || '',
        email: user.email || '',
        dominant: dominant.name,
        ...percentages,
        source: 'quiz',
        tags: ['dosha-quiz'],
      } as any);
      try { await updateMember(user.uid, { dosha: dominant.name }); } catch { /* non-fatal */ }
      // Loyalty: 5 pts for completing the quiz. Idempotent on quiz:{uid},
      // so retaking the quiz doesn't re-grant.
      try { await points.quizCompleted(user.uid); } catch { /* non-fatal */ }
      // Abonnée active : la suite se pose d'elle-même côté serveur; sinon,
      // l'écran lui offre le bouton. La suite n'empêche jamais le résultat.
      try { setSuite(await suiteQuiz('etat')); } catch { /* sans bloc de suite */ }
    } catch {}
    finally { setSubmitting(false); }
    setResult({ dominant, percentages });
  };

  // Auto-resume the save step if the user signs in while the quiz is paused
  // on the teaser screen (step past the last question, no result yet).
  useEffect(() => {
    if (user && step >= QUIZ_DATA.length && !result && !submitting) {
      handleQuizCompute();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, step]);

  // L'ordre des réponses change à chaque question et à chaque visite : sans
  // cela, la première réponse était toujours Vata (Krystine, 4 oct. 2026).
  const [ordres] = useState(() => QUIZ_DATA.map((q) => {
    const o = q.options.map((_, i) => i);
    for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }
    return o;
  }));
  const current = step < QUIZ_DATA.length ? { ...QUIZ_DATA[step], options: ordres[step].map((i) => QUIZ_DATA[step].options[i]) } : null;

  // Mesure du quiz (sans donnée personnelle) : chaque question atteinte une
  // seule fois par visite, puis le résultat vu avec sa branche et sa dominance.
  const questionsVues = useRef(new Set<number>());
  useEffect(() => {
    if (step < QUIZ_DATA.length && !questionsVues.current.has(step)) {
      questionsVues.current.add(step);
      trackInterne(`quiz_question_${step + 1}`);
    }
  }, [step]);
  const resultatVu = useRef(false);
  useEffect(() => {
    if (!teaser || resultatVu.current) return;
    resultatVu.current = true;
    const { branche, d1 } = lireProfil(teaser.percentages);
    trackInterne('quiz_resultat_vu');
    trackInterne(`quiz_resultat_vu_${branche}_${d1}`);
    noterSource('quiz');
  }, [teaser]);

  /* ── Écran du résultat : la lecture, puis une seule chose à la fois ──
     Avant l'accord : l'action « Recevoir ma lecture et sa suite » (BlocSuite).
     Après l'accord : le repère en cadeau, puis la phrase des lettres.
     Jamais de solution avant d'avoir le courriel (Krystine, 4 oct. 2026 :
     « on donne les solutions avant d'avoir pris le courriel, no way »). */
  if (result) {
    const L = lireLecture(result.percentages, lang);
    // L'équilibre ne prend la couleur d'aucun dosha : le laiton du site.
    const th = themeForName(L.branche === 'equilibre' ? '' : result.dominant.name);
    const accord = lang !== 'FR' || envoye || (!!suite && ETATS_ACCORD.includes(suite.etat));
    const blocSuite = suite && lang === 'FR' && (
      <BlocSuite
        etat={suite.etat}
        dosha={suite.dosha}
        prete={suite.prete}
        occupe={suiteOccupe}
        onInscrire={() => agirSuite('inscrire')}
        onReabonner={() => agirSuite('reabonner')}
      />
    );
    return (
      <Curtain className="max-w-[860px] mx-auto">
        <div className="relative border overflow-hidden text-center" style={{ borderColor: `${th.accent}66`, background: th.tint }}>
          <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: th.accent }} />
          <div className="p-[clamp(2rem,5vw,4rem)]">
            <VotreLecture L={L} ink={th.ink} percentages={result.percentages} lang={lang} complet />

            <div className="mt-11 pt-8 border-t max-w-[42rem] mx-auto" style={{ borderColor: `${th.accent}35` }}>
              {accord ? (
                <>
                  <RepereCadeau dominant={result.dominant.name} th={th} lang={lang} />
                  {envoye && lang === 'FR' && (
                    <p className="mt-9 text-[0.9rem] leading-relaxed text-[#3a2f23]">Votre résultat est en route vers votre courriel.</p>
                  )}
                  {blocSuite}
                  {lang === 'FR' && <CarteRituelsEssentiels dosha={L.branche === 'equilibre' ? null : L.montres[0]} />}
                  <button
                    type="button"
                    onClick={() => { trackInterne('quiz_clic_boutique'); navigate('/boutique'); }}
                    className="mt-10 text-[0.66rem] uppercase tracking-[0.18em] text-[#1c1712]/60 border-b border-[#1c1712]/30 pb-1 transition-colors hover:text-[#7d6330] hover:border-[#9c7a44] min-h-[44px]"
                  >
                    {lang === 'FR' ? 'Découvrir la boutique' : 'Visit the shop'}
                  </button>
                </>
              ) : blocSuite}
            </div>

            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={restart}
                className="inline-flex items-center gap-2 text-[0.62rem] uppercase tracking-[0.2em] text-[#1c1712]/55 transition-colors hover:text-[#7d6330] min-h-[44px]"
              >
                <ArrowCounterClockwise size={13} weight="light" /> {lang === 'FR' ? 'Refaire le quiz' : 'Retake the quiz'}
              </button>
            </div>
          </div>
        </div>
      </Curtain>
    );
  }

  /* ── Écran teaser (toutes les questions répondues, pas encore sauvegardé) ── */
  if (!current && teaser) {
    const L = lireLecture(teaser.percentages, lang);
    const th = themeForName(L.branche === 'equilibre' ? '' : teaser.dominant.name);
    const boutonRecommencer = (
      <button
        type="button"
        onClick={restart}
        className="inline-flex items-center gap-2 text-[0.66rem] uppercase tracking-[0.18em] text-[#1c1712]/60 border-b border-[#1c1712]/30 pb-1 transition-colors hover:text-[#7d6330] hover:border-[#9c7a44] min-h-[44px]"
      >
        <ArrowCounterClockwise size={13} weight="light" /> {lang === 'FR' ? 'Recommencer' : 'Restart'}
      </button>
    );
    return (
      <Curtain className="max-w-[860px] mx-auto">
        <div className="relative border overflow-hidden text-center" style={{ borderColor: `${th.accent}66`, background: th.tint }}>
          <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: th.accent }} />
          <div className="p-[clamp(2rem,5vw,4rem)]">
            <VotreLecture L={L} ink={th.ink} percentages={teaser.percentages} lang={lang} complet={false} />

            <div className="mt-11 pt-8 border-t max-w-[42rem] mx-auto" style={{ borderColor: `${th.accent}35` }}>
              {user ? (
                <>
                  <p className="inline-flex items-center gap-2.5 text-[0.62rem] uppercase tracking-[0.24em] text-[#3a2f23]">
                    <LockSimple size={13} weight="light" style={{ color: th.ink }} /> {lang === 'FR' ? 'Profil complet' : 'Full profile'}
                  </p>
                  <p className="mt-5 v2-serif font-light text-[clamp(1.1rem,1.9vw,1.4rem)] leading-relaxed text-[#3a2f23] max-w-[46ch] mx-auto">
                    {lang === 'FR' ? 'Enregistrez votre résultat dans votre espace pour retrouver votre profil complet.' : 'Save your result to your space to discover your full profile.'}
                  </p>
                  <div className="mt-9 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
                    <button
                      type="button"
                      onClick={handleQuizCompute}
                      disabled={submitting}
                      className="inline-flex items-center gap-3 bg-[#1c1712] px-8 py-4 text-[0.7rem] uppercase tracking-[0.18em] text-[#f4efe6] transition-colors duration-300 hover:bg-[#9c7a44] disabled:opacity-60 min-h-[44px]"
                    >
                      {submitting
                        ? (lang === 'FR' ? 'Enregistrement…' : 'Saving…')
                        : <>{lang === 'FR' ? 'Enregistrer + voir le profil' : 'Save + reveal profile'} <ArrowRight size={15} weight="regular" /></>}
                    </button>
                    {boutonRecommencer}
                  </div>
                </>
              ) : (
                <form onSubmit={envoyerResultat} noValidate className="relative max-w-[34rem] mx-auto text-left">
                  <p className="text-center text-[0.62rem] uppercase tracking-[0.24em] text-[#3a2f23]">
                    {lang === 'FR' ? 'Recevoir votre lecture complète' : 'Receive your full reading'}
                  </p>
                  <input
                    type="text"
                    name="site"
                    value={pot}
                    onChange={e => setPot(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    className="absolute -left-[9999px] h-0 w-0 opacity-0"
                  />
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <input
                      type="text"
                      required
                      autoComplete="given-name"
                      placeholder={lang === 'FR' ? 'Prénom' : 'First name'}
                      aria-label={lang === 'FR' ? 'Prénom' : 'First name'}
                      ref={prenomRef}
                      aria-invalid={champFautif === 'prenom' || undefined}
                      value={prenom}
                      onChange={e => { setPrenom(e.target.value); if (champFautif === 'prenom') setChampFautif(null); }}
                      className={`w-full border-b ${champFautif === 'prenom' ? 'border-[#83322b]' : 'border-[#1c1712]/30'} bg-transparent py-3 text-[0.95rem] text-[#1c1712] placeholder:text-[#1c1712]/45 outline-none transition-colors focus:border-[#9c7a44]`}
                    />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      placeholder={lang === 'FR' ? 'Courriel' : 'Email'}
                      aria-label={lang === 'FR' ? 'Courriel' : 'Email'}
                      ref={courrielRef}
                      aria-invalid={champFautif === 'courriel' || undefined}
                      value={courriel}
                      onChange={e => { setCourriel(e.target.value); if (champFautif === 'courriel') setChampFautif(null); }}
                      className={`w-full border-b ${champFautif === 'courriel' ? 'border-[#83322b]' : 'border-[#1c1712]/30'} bg-transparent py-3 text-[0.95rem] text-[#1c1712] placeholder:text-[#1c1712]/45 outline-none transition-colors focus:border-[#9c7a44]`}
                    />
                  </div>
                  {RECAPTCHA_SITE_KEY && <div ref={captcha.boxRef} className="mt-6 flex justify-center" />}
                  {RECAPTCHA_SITE_KEY && captcha.etat === 'expiree' && (
                    <p role="status" className="mt-3 text-center text-[0.85rem] text-[#83322b]">
                      {lang === 'FR' ? 'La case a expiré, et ce n’est pas grave : touchez le bouton ci-dessous, votre lecture partira.' : 'The box expired, and that’s fine: tap the button below and your reading will be sent.'}
                    </p>
                  )}
                  {RECAPTCHA_SITE_KEY && captcha.etat === 'absente' && (
                    <div role="status" className="mt-3 flex flex-col items-center gap-2 text-center">
                      <p className="text-[0.85rem] text-[#83322b]">
                        {lang === 'FR' ? 'La case « Je ne suis pas un robot » ne s’est pas affichée.' : 'The “I’m not a robot” box did not appear.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => { setErreurEnvoi(null); captcha.recharger(); }}
                        className="inline-flex items-center justify-center border border-[#1c1712] px-5 py-2 text-[0.64rem] uppercase tracking-[0.18em] text-[#1c1712] transition-colors hover:bg-[#1c1712] hover:text-[#f4efe6] min-h-[44px]"
                      >
                        {lang === 'FR' ? 'Afficher la case' : 'Show the box'}
                      </button>
                    </div>
                  )}
                  {/* La fuite du tunnel (analyse du 4 oct. 2026) : la case de la suite,
                      décochée et cachée sous le bouton, ne laissait passer que 17 %
                      des personnes. La suite est LE choix, nommé en clair juste
                      au-dessus du bouton : le clic EST le consentement. Aucune option
                      « sans les lettres » (Krystine, 4 oct. 2026, refusée trois fois). */}
                  <p className="mt-7 text-[0.88rem] leading-relaxed text-[#3a2f23]">
                    {lang === 'FR'
                      ? (SUITE_PRETE[lireProfil(teaser.percentages).d1]
                        ? 'Votre lecture complète arrive par courriel, puis quelques lettres de Krystine St-Laurent pour comprendre ce dont vous avez besoin en ce moment, et les programmes proposés pour aller plus loin. Vous pouvez vous désabonner en un clic.'
                        : PHRASE_FORMULAIRE(lireProfil(teaser.percentages).d1, false))
                      : 'Your full reading arrives by email, followed by a few letters from Krystine St-Laurent and the programs offered to go further. You can unsubscribe in one click.'}
                  </p>
                  <p className="mt-3 text-center text-[0.72rem] leading-relaxed text-[#3a2f23]/70">
                    {lang === 'FR' ? 'Krystine St-Laurent · ' : 'Krystine St-Laurent · '}<a href="mailto:teamksl@inspiratanature.com" className="underline underline-offset-2">teamksl@inspiratanature.com</a>{' · '}<a href="/politique-de-confidentialite" className="underline underline-offset-2">{lang === 'FR' ? 'Politique de confidentialité' : 'Privacy policy'}</a>
                  </p>
                  <div className="mt-5 flex flex-col items-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => envoyerResultat(e, true)}
                      disabled={submitting}
                      className="w-full inline-flex items-center justify-center gap-3 bg-[#1c1712] px-8 py-4 text-[0.7rem] uppercase tracking-[0.18em] text-[#f4efe6] transition-colors duration-300 hover:bg-[#9c7a44] disabled:opacity-60 min-h-[44px]"
                    >
                      {submitting
                        ? (lang === 'FR' ? 'Envoi…' : 'Sending…')
                        : <>{lang === 'FR' ? 'Recevoir ma lecture et sa suite' : 'Receive my reading and what follows'} <ArrowRight size={15} weight="regular" /></>}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignInOpen(true)}
                      className="text-[0.66rem] uppercase tracking-[0.18em] text-[#1c1712]/60 border-b border-[#1c1712]/30 pb-1 transition-colors hover:text-[#7d6330] hover:border-[#9c7a44] min-h-[44px]"
                    >
                      {lang === 'FR' ? 'J’ai déjà un compte' : 'I already have an account'}
                    </button>
                  </div>
                  {erreurEnvoi && <p role="alert" onClick={() => allerAuChamp(champFautif)} className={`mt-4 text-center text-[0.9rem] text-[#83322b] ${champFautif ? 'cursor-pointer' : ''}`}>{erreurEnvoi}</p>}
                  {echecServeur && (
                    <div className="mt-4 flex flex-col items-center gap-3 text-center">
                      <button
                        type="button"
                        onClick={(e) => envoyerResultat(e, true)}
                        disabled={submitting}
                        className="inline-flex items-center justify-center gap-2 border border-[#1c1712] px-6 py-3 text-[0.66rem] uppercase tracking-[0.18em] text-[#1c1712] transition-colors hover:bg-[#1c1712] hover:text-[#f4efe6] disabled:opacity-60 min-h-[44px]"
                      >
                        {lang === 'FR' ? 'Réessayer' : 'Try again'}
                      </button>
                      <p className="text-[0.85rem] text-[#1c1712]/70">
                        {lang === 'FR' ? 'Toujours bloqué ? Écrivez-nous à ' : 'Still stuck? Write to '}
                        <a href="mailto:teamksl@inspiratanature.com" className="underline underline-offset-2">teamksl@inspiratanature.com</a>
                        {lang === 'FR' ? ', nous vous enverrons votre lecture.' : ' and we will send your reading.'}
                      </p>
                    </div>
                  )}
                  <div className="mt-6 flex justify-center">{boutonRecommencer}</div>
                </form>
              )}

              <p className="mt-7 text-[0.58rem] uppercase tracking-[0.18em] text-[#1c1712]/45">
                {lang === 'FR' ? 'Votre lecture reste privée et sécurisée.' : 'Your reading stays private and secure.'}
              </p>
            </div>
          </div>
        </div>
      </Curtain>
    );
  }

  /* ── Écran question (par défaut) : carte crème, filet qui se trace, slide+fade ── */
  const progress = (step + (current ? 0 : 1)) / QUIZ_DATA.length;

  return (
    <Reveal className="max-w-[860px] mx-auto">
      {/* Progression : le filet laiton se trace au fil des réponses */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[0.62rem] uppercase tracking-[0.22em] text-[#1c1712]/60">
          {lang === 'FR' ? 'Question' : 'Question'} {Math.min(step + 1, QUIZ_DATA.length)} / {QUIZ_DATA.length}
        </span>
        <button
          type="button"
          onClick={restart}
          className="text-[0.62rem] uppercase tracking-[0.22em] text-[#1c1712]/60 transition-colors hover:text-[#7d6330] min-h-[44px]"
        >
          {lang === 'FR' ? 'Recommencer' : 'Restart'}
        </button>
      </div>
      <div className="relative h-[2px] bg-[#1c1712]/10 overflow-hidden mb-10">
        <motion.div
          className="absolute inset-0 bg-[#9c7a44]"
          style={{ transformOrigin: 'left center' }}
          initial={false}
          animate={{ scaleX: progress }}
          transition={{ duration: 0.6, ease }}
        />
      </div>

      {current && (
        /* La carte se détache du fond : papier plus clair, cadre fileté
           doré décalé et ombre profonde (Krystine, 4 oct. 2026 : « carré
           blanc sur blanc »). */
        <div className="relative">
          <span aria-hidden className="absolute -inset-[10px] border border-[#9c7a44]/45 pointer-events-none" />
        <div className="relative border border-[#9c7a44] bg-[#fffdf8] overflow-hidden shadow-[0_40px_90px_-40px_rgba(28,23,18,0.55),0_12px_30px_-18px_rgba(28,23,18,0.3)]">
          <span aria-hidden className="absolute inset-x-0 top-0 h-[4px] flex">
            <span className="flex-1 bg-[#6e7b45]" /><span className="flex-1 bg-[#a8443c]" /><span className="flex-1 bg-[#3d5f94]" />
          </span>
          <span
            aria-hidden
            className="absolute top-[4px] -left-px bg-[#1c1712] text-[#f4efe6] px-3 py-1.5 text-[0.56rem] uppercase tracking-[0.24em] z-10"
          >
            {lang === 'FR' ? current.categoryFR : current.categoryEN}
          </span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: 44 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: -44 }}
              transition={{ duration: 0.45, ease }}
              className="p-[clamp(1.75rem,4vw,3.25rem)] pt-[clamp(3rem,5vw,4rem)]"
            >
              <h3 className="v2-serif font-light text-[#1c1712] leading-[1.08] text-[clamp(1.3rem,3vw,2.4rem)] max-w-[30ch]">
                {lang === 'FR' ? current.questionFR : current.questionEN}
              </h3>

              {/* Choix en rangées éditoriales, ordre mélangé, cercle neutre */}
              <div className="mt-9">
                {current.options.map((opt, idx) => {
                  const isFlash = flashPick === opt.type;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handlePick(opt.type)}
                      disabled={!!flashPick}
                      className={`group w-full text-left flex items-start gap-5 py-5 px-2 -mx-2 border-t border-[#1c1712]/10 transition-colors duration-300 min-h-[44px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#9c7a44] ${
                        isFlash ? 'bg-[#9c7a44]/10' : 'hover:bg-[#9c7a44]/[0.06]'
                      }`}
                    >
                      {/* Un cercle neutre; au choix, il s'allume en vert avec un
                          crochet, le même pour toutes les réponses : rien ne
                          trahit le dosha (Krystine, 4 oct. 2026). */}
                      <span
                        aria-hidden="true"
                        className={`mt-[0.35rem] shrink-0 w-[1.35rem] h-[1.35rem] rounded-full border grid place-items-center transition-all duration-300 ${
                          isFlash ? 'border-[#4E6349] bg-[#4E6349] scale-110 shadow-[0_0_0_5px_rgba(78,99,73,0.18)]' : 'border-[#9c7a44]/60 group-hover:border-[#9c7a44] group-hover:shadow-[inset_0_0_0_3px_rgba(156,122,68,0.25)]'
                        }`}
                      >
                        <Check size={12} weight="bold" className={`text-[#faf6ee] transition-opacity duration-200 ${isFlash ? 'opacity-100' : 'opacity-0'}`} />
                      </span>
                      <span className={`flex-1 text-[0.95rem] leading-[1.75] transition-colors duration-300 ${
                        isFlash ? 'text-[#1c1712]' : 'text-[#3a2f23] group-hover:text-[#1c1712]'
                      }`}>
                        {lang === 'FR' ? opt.fr : opt.en}
                      </span>
                      <span className="shrink-0 pt-1">
                        {isFlash
                          ? null
                          : <ArrowRight size={15} weight="regular" className="text-[#7d6330] opacity-0 -translate-x-1.5 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 pt-5 border-t border-[#1c1712]/10 flex items-center justify-between gap-5">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={step === 0}
                  className="inline-flex items-center gap-2 text-[0.62rem] uppercase tracking-[0.2em] text-[#1c1712]/60 transition-colors hover:text-[#7d6330] disabled:opacity-30 disabled:hover:text-[#1c1712]/60 min-h-[44px]"
                >
                  <ArrowLeft size={13} weight="regular" /> {lang === 'FR' ? 'Précédent' : 'Back'}
                </button>
                <span className="v2-serif text-[0.92rem] text-right text-[#1c1712]/50">
                  {lang === 'FR' ? 'Suivez votre premier réflexe' : 'Trust your first instinct'}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
        </div>
      )}
    </Reveal>
  );
};

/* ════════════════════════ Page ════════════════════════ */

const INSIDE = [
  {
    n: '01',
    titleFR: 'Vous répondez à dix questions',
    titleEN: 'You answer ten questions',
    bodyFR: "Le sommeil, la digestion, le stress, l'énergie, le mental, les émotions… Une question à la fois. Suivez votre premier réflexe.",
    bodyEN: 'Build, sleep, digestion, stress, energy, change, mind, emotions, exhaustion and temperament: ten dimensions of body and moment, one question at a time.',
  },
  {
    n: '02',
    titleFR: 'Vous voyez ce qui domine en ce moment',
    titleEN: 'You see what dominates right now',
    bodyFR: 'Vata (Vent et Espace), Pitta (Feu et Eau) et Kapha (Eau et Terre), en pourcentages, tout de suite à l’écran. Il n’y a ni bonne ni mauvaise réponse.',
    bodyEN: 'Vata (Wind and Space), Pitta (Fire and Water) or Kapha (Water and Earth): your unique balance of the moment, drawn from your answers, with no judgment and no right or wrong answer.',
  },
  {
    n: '03',
    titleFR: 'Vous recevez votre lecture par courriel',
    titleEN: 'You receive your reading by email',
    bodyFR: "Votre résultat complet, puis, si vous le souhaitez, quelques lettres pour reconnaître comment cette dominance se manifeste, ce qui l'accentue et comment elle évolue.",
    bodyEN: "Your full result arrives by email. If you wish, the rest of your reading follows: letters to recognize how your dominance shows up, what amplifies it and how it evolves.",
  },
];

const DOMINANCE_FR: Record<string, string> = { vata: 'Vent', pitta: 'Feu', kapha: 'Terre' };
const DOMINANCE_EN: Record<string, string> = { vata: 'Wind', pitta: 'Fire', kapha: 'Earth' };

// « Quelques clés de l'Ayurveda » : la carte vert profond du site (Krystine, 2 oct. 2026, le papier doré écarté).
const CLES_FR: [string, string][] = [
  ['Ayurveda', 'du sanskrit ayus, la vie, et veda, la connaissance, pouvant être traduit par « science de la vie ». Sœur du yoga.'],
  ['Les cinq éléments', 'l’Espace, le Vent, le Feu, l’Eau et la Terre, dont tout est fait, nous compris.'],
  ['Dosha', 'une force née de ces éléments. Il y en a trois, présentes en chacune de nous dans des proportions qui lui sont propres.'],
  ['Vata', 'le Vent et l’Espace, le mouvement.'],
  ['Pitta', 'le Feu et l’Eau, la chaleur et la digestion.'],
  ['Kapha', 'l’Eau et la Terre, la structure et la stabilité.'],
  ['Causes-racines', 'l’Ayurveda remonte à ce qui fait naître un déséquilibre, plutôt que de s’arrêter à ce qui se voit en surface.'],
];
const CLES_EN: [string, string][] = [
  ['Ayurveda', 'from the Sanskrit ayus, life, and veda, knowledge, which can be translated as “the science of life”. Sister of yoga.'],
  ['The five elements', 'Space, Wind, Fire, Water and Earth, of which everything is made, ourselves included.'],
  ['Dosha', 'a force born of these elements. There are three, present in each of us in proportions of our own.'],
  ['Vata', 'Wind and Space, movement.'],
  ['Pitta', 'Fire and Water, heat and digestion.'],
  ['Kapha', 'Water and Earth, structure and stability.'],
  ['Root causes', 'Ayurveda traces back to what gives rise to an imbalance, rather than stopping at what shows on the surface.'],
];

const QuizLoeuvre: React.FC = () => {
  const { lang } = useApp();
  const reduce = useReducedMotion();
  const t = CONTENT[lang];
  const ay = t.ayurveda;

  // Retour du bouton « Recevoir la suite de ma lecture » du courriel (fonction suiteLecture).
  const [suiteOk] = useState(() => { try { return new URLSearchParams(window.location.search).get('suite') === 'ok'; } catch { return false; } });
  // Retour du petit lien « Je préfère ne pas recevoir la suite » du courriel.
  const [suiteNon] = useState(() => { try { return new URLSearchParams(window.location.search).get('suite') === 'non'; } catch { return false; } });

  const heroFade = (delay: number) => ({
    initial: reduce ? { opacity: 1 } : { opacity: 0, y: 22 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 1, ease, delay },
  });

  return (
    <div
      className="relative min-h-screen w-full bg-[#f4efe6] text-[#1c1712] antialiased overflow-x-hidden"
      style={{ fontFamily: '"Inter", system-ui, sans-serif' }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..600&family=Inter:wght@300;400;500&display=swap');
        .v2-serif { font-family: "Fraunces", Georgia, serif; }
        @keyframes v2cue { 0%,100% { transform: translateY(0); opacity:.45 } 50% { transform: translateY(8px); opacity:1 } }
        .v2-cue { animation: v2cue 2.4s cubic-bezier(0.22,1,0.36,1) infinite; }
        @media (prefers-reduced-motion: reduce) { .v2-cue { animation: none; } }
      `}</style>

      {/* ─────────── HERO · une de magazine ─────────── */}
      <section className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] pt-[clamp(6.5rem,12vh,9rem)] pb-[clamp(2rem,5vh,4rem)] min-h-screen flex flex-col">
        {suiteOk && (
          <p role="status" className="border-y border-[#9c7a44]/40 py-3 text-center text-[0.9rem] text-[#1c1712]">
            {lang === 'FR' ? 'C’est noté : la suite de votre lecture arrive par courriel.' : 'Noted: the rest of your reading is on its way by email.'}
          </p>
        )}
        {suiteNon && (
          <p role="status" className="border-y border-[#9c7a44]/40 py-3 text-center text-[0.9rem] text-[#1c1712]">
            {lang === 'FR' ? 'C’est noté : la suite ne vous sera pas envoyée. Vous restez abonnée à nos lettres.' : 'Noted: the rest of your reading will not be sent. You remain subscribed to our letters.'}
          </p>
        )}
        {/* La ligne de tête « N° 05 · Québec » est retirée de la page du quiz (Krystine, 2 oct. 2026 : elle parle aussi à l'Europe). */}

        {/* La vidéo du quiz en bannière, sans le logo d'ouverture (Krystine, 1er oct. 2026) */}
        <motion.div {...heroFade(0.2)} className="mt-6">
          <Planche
            video="/quiz/quiz-dosha-revisee.mp4"
            poster="/quiz/quiz-dosha-revisee-poster.jpg"
            ratio="aspect-[16/9] sm:aspect-[21/9] lg:aspect-[8/3]"
            legende="Vata (Vent et Espace) · Pitta (Feu et Eau) · Kapha (Eau et Terre)"
          />
        </motion.div>

        <div className="flex-1 grid items-center gap-x-[clamp(2rem,5vw,5rem)] gap-y-10 lg:grid-cols-[1.05fr_0.95fr] mt-[clamp(2rem,5vh,4rem)]">
          {/* Masthead + promesse */}
          <div>
            <motion.div {...heroFade(0.1)}>
              <Kicker className="mb-7">{lang === 'FR' ? 'Connaître votre nature' : 'Know your nature'}</Kicker>
            </motion.div>
            <h1 className="v2-serif font-light leading-[0.92] text-[#1c1712] text-[clamp(3.2rem,10vw,9rem)]">
              <span className="block overflow-hidden">
                <motion.span
                  className="block will-change-transform"
                  initial={reduce ? false : { y: '112%' }}
                  animate={{ y: '0%' }}
                  transition={{ duration: 1.2, ease, delay: 0.15 }}
                >
                  {lang === 'FR' ? 'Quiz Dosha' : 'Dosha Quiz'}
                </motion.span>
              </span>
            </h1>
            <motion.div {...heroFade(0.4)} className="mt-7 max-w-[34ch]">
              <p className="v2-serif font-light text-[clamp(1.35rem,2.6vw,2rem)] leading-[1.3] text-[#1c1712]">
                {lang === 'FR'
                  ? 'Voyez ce qui domine, ce qui l’accentue et la direction qui mérite votre attention.'
                  : 'See what dominates, what amplifies it and the direction that deserves your attention.'}
              </p>
              <p className="mt-4 text-[0.82rem] leading-relaxed text-[#3a2f23]/80">
                {lang === 'FR'
                  ? 'Par Krystine St-Laurent, autrice de Nature & Ayurveda et de Féminité & Ayurveda (Éditions de l’Homme)'
                  : 'By Krystine St-Laurent, author of Nature & Ayurveda and Féminité & Ayurveda (Éditions de l’Homme)'}
              </p>
              {/* Ce qu'est l'Ayurveda, dans les mots du livre (Krystine, 9 oct. 2026) :
                  Nature & Ayurveda, Éditions de l'Homme, 2018, p. 41. Citation exacte, jamais paraphrasée. */}
              {lang === 'FR' && (
                <figure className="mt-7 max-w-[54ch] border-l-2 border-[#9c7a44] pl-5">
                  <blockquote className="v2-serif text-[1.05rem] leading-[1.65] text-[#1c1712]">
                    « L’Ayurveda est un art de vivre, une invitation à créer de l’espace dans sa vie pour prendre soin de soi et se connaître davantage, c’est une incitation à renouer avec la nature et notre propre nature. »
                  </blockquote>
                  <figcaption className="mt-2 text-[0.72rem] uppercase tracking-[0.16em] text-[#7d6330]">Krystine St-Laurent, Nature &amp; Ayurveda, p. 41</figcaption>
                </figure>
              )}
            </motion.div>
            <motion.div {...heroFade(0.55)} className="mt-11 flex flex-wrap items-center gap-x-9 gap-y-4">
              <a
                href="#quiz-debut"
                onClick={() => trackInterne('quiz_commence')}
                className="group inline-flex items-center gap-2.5 text-[0.72rem] uppercase tracking-[0.2em] text-[#1c1712] border-b border-[#1c1712] pb-1.5 transition-colors duration-300 hover:text-[#7d6330] hover:border-[#9c7a44] min-h-[44px]"
              >
                {lang === 'FR' ? 'Commencer le quiz' : 'Begin the quiz'}
                <ArrowDown size={15} weight="regular" className="transition-transform duration-300 group-hover:translate-y-0.5" />
              </a>
              <span className="text-[0.62rem] uppercase tracking-[0.2em] text-[#1c1712]/55">
                3 minutes
              </span>
            </motion.div>
          </div>

          {/* Panneau encadré : les trois natures (système multi-couleur) */}
          <motion.div {...heroFade(0.35)} className="relative hidden lg:block self-center">
            <span className="pointer-events-none absolute -inset-2 border border-[#9c7a44]/35" aria-hidden />
            <div className="relative bg-[#faf6ee] px-9 py-4">
              {ay.doshas.map((d: any, i: number) => {
                const key = ALL_DOSHAS[i];
                return (
                  <div key={d.name} className={`flex items-center gap-6 py-6 ${i > 0 ? 'border-t border-[#1c1712]/10' : ''}`}>
                    <DoshaPicto d={key} size={56} className="shrink-0" />
                    <div className="min-w-0">
                      <p className="v2-serif font-light text-[1.35rem] text-[#1c1712]">
                        {lang === 'FR' ? 'Dominance ' : 'Dominance of '}{lang === 'FR' ? DOMINANCE_FR[key] : DOMINANCE_EN[key]}
                      </p>
                      <p className="mt-1 text-[0.78rem] text-[#3a2f23]/80">
                        {NOM_AYURVEDA[key]} ({(lang === 'FR' ? ELEMENTS : ELEMENTS_EN)[key]})
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <span className="absolute -top-2 -left-2 bg-[#1c1712] text-[#f4efe6] px-3 py-1.5 text-[0.58rem] uppercase tracking-[0.24em]">
              {lang === 'FR' ? 'Les trois dominances' : 'The three dominances'}
            </span>
          </motion.div>
        </div>

        <motion.div
          {...heroFade(0.7)}
          className="flex items-end justify-between border-b border-[#1c1712]/15 pb-3.5 mt-[clamp(1.5rem,4vh,3rem)] text-[0.6rem] uppercase tracking-[0.28em] text-[#1c1712]/55"
        >
          <span className="flex items-center gap-2 v2-cue">
            <ArrowDown size={13} weight="regular" />
            {lang === 'FR' ? 'Faire défiler' : 'Scroll'}
          </span>
        </motion.div>
      </section>

      {/* ─────────── LE QUIZ ─────────── */}
      <section id="quiz" className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(5rem,12vh,9rem)] bg-[#e9dfcc] scroll-mt-24 overflow-hidden">
        <GiantWord word="Dosha" />
        <div className="relative z-10">
          <Reveal className="text-center mb-12">
            <Kicker className="mb-5">{lang === 'FR' ? 'À vous de jouer' : 'Your turn'}</Kicker>
            <h2 className="v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2.2rem,5vw,3.8rem)]">
              {lang === 'FR' ? 'Répondez en toute simplicité' : 'Answer, simply'}
            </h2>
            <p className="mt-5 v2-serif font-light text-[clamp(1.1rem,1.8vw,1.4rem)] text-[#3a2f23] max-w-[46ch] mx-auto">
              {lang === 'FR'
                ? "Il n'y a pas de mauvaise réponse, seulement la vôtre, ici et maintenant."
                : 'There is no wrong answer, only yours, here and now.'}
            </p>
          </Reveal>
          {/* « Commencer le quiz » mène à la question même, pour que le bandeau des témoins ne cache pas les choix sur mobile. */}
          <div id="quiz-debut" className="scroll-mt-[82px]"><Quiz lang={lang} /></div>
        </div>
      </section>

      {/* ─────────── QUELQUES CLÉS DE L'AYURVEDA · la carte vert profond ─────────── */}
      <section className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(5rem,12vh,9rem)] bg-[#f4efe6]">
        <Reveal className="max-w-[44rem] mx-auto">
          <div className="bg-[#28352F] px-[clamp(1.5rem,5vw,3.5rem)] pt-[clamp(2rem,4.5vw,3rem)] pb-[clamp(1.5rem,3.5vw,2.25rem)] text-[#EEE7DB]">
            <h2 className="text-center v2-serif font-light leading-[1.1] text-[#EEE7DB] text-[clamp(1.6rem,3.4vw,2.3rem)]">
              {lang === 'FR' ? 'Quelques clés de l’Ayurveda' : 'A few keys to Ayurveda'}
            </h2>
            <p className="pt-2 pb-7 text-center text-[0.68rem] uppercase tracking-[0.24em] text-[#BA7B39]">
              {lang === 'FR' ? 'La science de la vie' : 'The science of life'}
            </p>
            {(lang === 'FR' ? CLES_FR : CLES_EN).map(([mot, def]) => (
              <p key={mot} className="pb-3 text-[1rem] leading-[1.7]">
                <strong className="font-semibold text-[#d79a5c]">{mot}</strong> : {def}
              </p>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ─────────── CE QUE VOUS OBTENEZ · panneau, cascade indexée ─────────── */}
      <section className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(5rem,12vh,9rem)] bg-[#efe6d7]">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-x-[clamp(2.5rem,6vw,6rem)] gap-y-8 items-end mb-14">
          <Reveal>
            <Kicker className="mb-5">{lang === 'FR' ? 'Comment cela se passe' : 'How it works'}</Kicker>
            <h2 className="v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2.2rem,5vw,4rem)]">
              {lang === 'FR' ? 'Trois minutes, trois étapes' : 'Three minutes, three steps'}
            </h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="v2-serif font-light text-[clamp(1.1rem,1.9vw,1.45rem)] leading-snug text-[#3a2f23] max-w-[46ch]">
              {lang === 'FR'
                ? 'Vous répondez à dix questions, vous voyez aussitôt ce qui domine en vous en ce moment, et votre résultat complet arrive par courriel.'
                : 'You answer ten questions, you see right away what dominates in you right now, and your full result arrives by email.'}
            </p>
          </Reveal>
        </div>
        <div className="grid md:grid-cols-3 gap-x-[clamp(1.5rem,3.5vw,3.5rem)] gap-y-10">
          {INSIDE.map((it, i) => (
            <Reveal key={it.n} delay={i * 0.12}>
              <DrawRule className="w-full" delay={0.1 + i * 0.12} />
              <span className="mt-6 block v2-serif font-light text-[2.4rem] leading-none text-[#7d6330] tabular-nums">{it.n}</span>
              <h3 className="mt-4 v2-serif font-light text-[1.45rem] leading-[1.15] text-[#1c1712]">
                {lang === 'FR' ? it.titleFR : it.titleEN}
              </h3>
              <p className="mt-3.5 text-[0.95rem] leading-[1.8] text-[#3a2f23]">
                {lang === 'FR' ? it.bodyFR : it.bodyEN}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─────────── CONTACT ─────────── */}
      <section className="bg-[#f4efe6] py-[clamp(4rem,9vh,6rem)] px-[clamp(1.5rem,5vw,5.5rem)] text-center">
        <a
          href="mailto:teamksl@inspiratanature.com"
          className="v2-serif font-light text-[clamp(1.1rem,1.8vw,1.4rem)] text-[#7d6330] hover:text-[#1c1712] transition-colors duration-300 border-b border-[#9c7a44]/40 pb-1"
        >
          {lang === 'FR' ? 'Une question ? Écrivez à teamksl@inspiratanature.com' : 'A question? Write to teamksl@inspiratanature.com'}
        </a>
      </section>

      {/* Grain éditorial (multiply), sous le chrome global du site */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.045]"
        style={{
          mixBlendMode: 'multiply',
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: '160px 160px',
        }}
      />
    </div>
  );
};

export default QuizLoeuvre;
