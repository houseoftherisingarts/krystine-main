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
import { addDoshaQuizResult, updateMember, addNewsletterSubscriber } from '../firebase/firestore';
import { trackLead } from '../lib/track';
import { points } from '../firebase/points';
import { envoyerResultatQuiz } from '../firebase/quiz';
import { RECAPTCHA_SITE_KEY, useRecaptcha } from '../lib/recaptcha';
import {
  getProducts, formatMoney, isShopifyConfigured, type ShopifyProduct,
} from '../shopify';
import { findOilForDosha } from '../lib/shopifyOil';
import { RITUALS } from '../lib/doshaRituals';
import { Planche } from '../components/v2/Magazine';
import { Atmosphere } from '../components/motion/loeuvre';

/**
 * Quiz Dosha, langage V2 « magazine crème » (Fraunces + Inter, crème #f4efe6,
 * filets laiton, système multi-couleur Vata/Pitta/Kapha).
 * Garde 100 % de la logique d'origine : QUIZ_DATA, le calcul des scores et des
 * pourcentages, l'auto-avance, le retour/recommencer, l'écriture CRM
 * (addDoshaQuizResult + updateMember + points.quizCompleted) et l'ajout au
 * panier de l'huile dosha (findOilForDosha). Branche aussi le vrai
 * NewsletterSignup (source="quiz").
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
    categoryFR: 'Constitution physique', categoryEN: 'Physical build',
    questionFR: 'Comment décririez-vous votre constitution physique ?',
    questionEN: 'How would you describe your physical build?',
    options: [
      { fr: "Mince, articulations proéminentes, peu de protection sur l'ensemble du corps.",
        en: 'Thin, prominent joints, little padding on the body overall.', type: 'vata' },
      { fr: 'Constitution moyenne et symétrique, bonne musculature.',
        en: 'Medium, symmetrical build with good musculature.', type: 'pitta' },
      { fr: 'Constitution solide, peau douce et bien hydratée, prend du poids facilement.',
        en: 'Solid build, soft well-hydrated skin, gains weight easily.', type: 'kapha' },
    ],
  },
  {
    categoryFR: 'Sommeil', categoryEN: 'Sleep',
    questionFR: 'Comment dormez-vous ?',
    questionEN: 'How do you sleep?',
    options: [
      { fr: "Léger, tendance à s'éveiller facilement, difficulté à me rendormir.",
        en: 'Light, wake easily, trouble falling back asleep.', type: 'vata' },
      { fr: 'Régulier et profond, je me rendors facilement.',
        en: 'Regular and deep, I fall back asleep easily.', type: 'pitta' },
      { fr: 'Long et profond, difficulté à me lever le matin.',
        en: 'Long and deep, hard to wake up in the morning.', type: 'kapha' },
    ],
  },
  {
    categoryFR: 'Digestion', categoryEN: 'Digestion',
    questionFR: 'Comment décririez-vous votre digestion ?',
    questionEN: 'How would you describe your digestion?',
    options: [
      { fr: "Irrégulière, ballonnements et gaz fréquents, appétit variable d'un jour à l'autre.",
        en: 'Irregular, frequent bloating and gas, variable appetite day to day.', type: 'vata' },
      { fr: "Forte, j'ai faim à heures fixes, irritable si je saute un repas.",
        en: 'Strong, hungry at set times, irritable if I skip a meal.', type: 'pitta' },
      { fr: 'Lente mais stable, je peux facilement sauter un repas sans inconfort.',
        en: 'Slow but stable, I can easily skip a meal without discomfort.', type: 'kapha' },
    ],
  },
  {
    categoryFR: 'Réaction au stress', categoryEN: 'Stress response',
    questionFR: 'Comment réagissez-vous au stress ?',
    questionEN: 'How do you react to stress?',
    options: [
      { fr: "Culpabilité, tendance à l'anxiété, bavardage mental.",
        en: 'Guilt, tendency toward anxiety, mental chatter.', type: 'vata' },
      { fr: 'Irritabilité, impatience, tendance à vouloir contrôler.',
        en: 'Irritability, impatience, tendency to control.', type: 'pitta' },
      { fr: 'Calme en apparence, tendance à surprotéger, résistance au changement.',
        en: 'Calm on the surface, tendency to overprotect, resistance to change.', type: 'kapha' },
    ],
  },
  {
    categoryFR: 'Énergie dans la journée', categoryEN: 'Daytime energy',
    questionFR: 'Comment se distribue votre énergie au fil de la journée ?',
    questionEN: 'How does your energy unfold during the day?',
    options: [
      { fr: "En dents de scie, pics d'énergie suivis de chutes brutales.",
        en: 'Jagged: energy spikes followed by sharp drops.', type: 'vata' },
      { fr: "Soutenue et intense jusqu'en fin de journée, difficile à éteindre.",
        en: 'Sustained and intense through the evening, hard to turn off.', type: 'pitta' },
      { fr: 'Lente à démarrer le matin, constante une fois lancée, endurance naturelle.',
        en: 'Slow to start in the morning, steady once going, natural endurance.', type: 'kapha' },
    ],
  },
  {
    categoryFR: 'Relation au changement', categoryEN: 'Relationship to change',
    questionFR: 'Comment vivez-vous le changement ?',
    questionEN: 'How do you experience change?',
    options: [
      { fr: "J'adore la nouveauté, je m'ennuie vite dans la routine.",
        en: 'I love novelty, I get bored quickly with routine.', type: 'vata' },
      { fr: "J'initie le changement lorsqu'il est logique, je déteste le chaos imposé.",
        en: "I initiate change when it's logical, I hate imposed chaos.", type: 'pitta' },
      { fr: 'Je préfère la stabilité, le changement me demande un effort conscient.',
        en: 'I prefer stability, change takes conscious effort.', type: 'kapha' },
    ],
  },
  {
    categoryFR: 'Qualité du mental', categoryEN: 'Mental quality',
    questionFR: 'Quelle est la qualité dominante de votre mental ?',
    questionEN: 'What is the dominant quality of your mind?',
    options: [
      { fr: 'Vif mais dispersé, plusieurs idées en même temps.',
        en: 'Quick but scattered, several ideas at once.', type: 'vata' },
      { fr: 'Précis, analytique, orienté vers la résolution, parfois trop critique.',
        en: 'Precise, analytical, solution-oriented, sometimes too critical.', type: 'pitta' },
      { fr: 'Calme, réfléchi, prend le temps de digérer avant de répondre.',
        en: 'Calm, reflective, takes time to digest before answering.', type: 'kapha' },
    ],
  },
  {
    categoryFR: 'Relation aux émotions', categoryEN: 'Relationship to emotions',
    questionFR: 'Comment traversez-vous vos émotions ?',
    questionEN: 'How do you move through your emotions?',
    options: [
      { fr: 'Je ressens intensément et brièvement, mes émotions changent vite.',
        en: 'I feel intensely and briefly, my emotions change quickly.', type: 'vata' },
      { fr: 'Les émotions montent en chaleur : frustration, colère, impatience.',
        en: 'Emotions rise as heat: frustration, anger, impatience.', type: 'pitta' },
      { fr: "Les émotions s'accumulent lentement : tristesse profonde, attachement.",
        en: 'Emotions accumulate slowly: deep sadness, attachment.', type: 'kapha' },
    ],
  },
  {
    categoryFR: 'Type d\'épuisement', categoryEN: 'Type of fatigue',
    questionFR: "À quoi ressemble votre épuisement lorsqu'il survient ?",
    questionEN: 'What does your fatigue look like when it hits?',
    options: [
      { fr: "Épuisement nerveux, sensation d'être vidé·e, surmenage mental.",
        en: 'Nervous exhaustion, feeling drained, mental overload.', type: 'vata' },
      { fr: 'Épuisement par surchauffe : irritabilité, yeux rouges, maux de tête.',
        en: 'Exhaustion from overheating: irritability, red eyes, headaches.', type: 'pitta' },
      { fr: 'Lourdeur, envie de ne rien faire, difficulté à se motiver.',
        en: 'Heaviness, wanting to do nothing, difficulty motivating.', type: 'kapha' },
    ],
  },
  {
    categoryFR: 'Tempérament', categoryEN: 'Temperament',
    questionFR: 'Comment décririez-vous votre tempérament ?',
    questionEN: 'How would you describe your temperament?',
    options: [
      { fr: 'Vivant, enthousiaste, parole facile, aime le changement.',
        en: 'Lively, enthusiastic, easy speaker, loves change.', type: 'vata' },
      { fr: 'Puissant et intense, direct, aime convaincre.',
        en: 'Powerful and intense, direct, loves to persuade.', type: 'pitta' },
      { fr: 'Stable, adaptable, bon vivant, ancré.',
        en: 'Stable, adaptable, easy-going, grounded.', type: 'kapha' },
    ],
  },
];

const ALL_DOSHAS: DoshaType[] = ['vata', 'pitta', 'kapha'];

// Textes de Krystine sous la dominance (FR seulement; la 3e phrase est retirée sur l'écran du résultat).
const CARTE_DOMINANCE: Record<DoshaType, [string, string, string]> = {
  vata: [
    'Le mental part dans tous les sens. Le sommeil devient plus fragile.',
    'Quand le vent prend trop de place, tout devient plus difficile à tenir ensemble.',
    'Votre profil vous montre ce qui l’attise chez vous, et ce qui l’apaise.',
  ],
  pitta: [
    'Impatience, irritabilité, et le soir, le feu tarde à s’apaiser.',
    'À force d’intensité, même ce qui nous fait avancer peut finir par nous brûler.',
    'Votre profil vous aide à voir ce qui nourrit cette chaleur, et comment la tempérer.',
  ],
  kapha: [
    'Le matin démarre lentement. L’élan tarde à venir et les choses s’accumulent plus facilement.',
    'Quand tout devient plus lourd, ce n’est pas toujours qu’il faut faire plus.',
    'Votre profil vous montre ce qui entretient cette lourdeur, et ce qui remet du mouvement.',
  ],
};
const NOM_AYURVEDA: Record<DoshaType, string> = { vata: 'Vata', pitta: 'Pitta', kapha: 'Kapha' };

/* Carte de Krystine + mention discrète du mot Ayurveda */
const CarteDominance: React.FC<{ d: DoshaType; lang: 'FR' | 'EN'; complet: boolean }> = ({ d, lang, complet }) => {
  const [p1, p2, p3] = CARTE_DOMINANCE[d];
  return (
    <div className="mt-10 max-w-[36ch] mx-auto">
      {lang === 'FR' && (
        <div>
          <p className="v2-serif font-light text-[clamp(1.2rem,2vw,1.5rem)] leading-snug text-[#1c1712]">{p1}</p>
          <p className="mt-3 text-[0.95rem] leading-[1.75] text-[#3a2f23]">{p2}</p>
          {!complet && <p className="mt-3 text-[0.95rem] leading-[1.75] text-[#3a2f23]">{p3}</p>}
        </div>
      )}
      <p className="mt-6 text-[0.75rem] leading-relaxed text-[#1c1712]/55">
        {lang === 'FR'
          ? `Dans le langage de l’Ayurveda, cette dominance est appelée ${NOM_AYURVEDA[d]}.`
          : `In the language of Ayurveda, this dominance is called ${NOM_AYURVEDA[d]}.`}
      </p>
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
  const etiquettes = dix(d1) - dix(d3) <= 10 ? ['profil-equilibre']
    : dix(d1) === dix(d2) ? ['profil-double', second]
    : dix(d1) - dix(d2) === 10 ? ['profil-teinte', second]
    : ['profil-net'];
  return { d1, etiquettes, suite: `suite-${TAG_COURANT[d1]}` };
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
      <span className="text-[0.58rem] uppercase tracking-[0.22em] text-[#1c1712]/60">{label}</span>
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

/* ════════════════════════ Le quiz (carte question + progression + résultat) ════════════════════════ */

const Quiz: React.FC<{ lang: 'FR' | 'EN' }> = ({ lang }) => {
  const { addToCart, user, member, setSignInOpen } = useApp();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const t = CONTENT[lang];
  const ay = t.ayurveda;

  // Shopify catalog, fetched so the quiz recommendation lands a genuine
  // variantId in the cart (without which CartDrawer rightly marks items
  // ineligible for checkout).
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  useEffect(() => {
    if (!isShopifyConfigured) return;
    getProducts(50, lang).then(setProducts).catch(() => setProducts([]));
  }, [lang]);

  const addDoshaOil = (doshaName: string) => {
    const product = findOilForDosha(products, doshaName);
    const variant = product?.variants.find(v => v.availableForSale) || product?.variants[0];
    if (!product || !variant) {
      navigate('/boutique/huiles-corporelles');
      return;
    }
    addToCart({
      id: product.id,
      variantId: variant.id,
      title: product.title,
      type: product.productType || 'Huile Corporelle',
      price: formatMoney(variant.price, lang),
      priceAmount: variant.price.amount,
      priceCurrency: variant.price.currencyCode,
      image: product.featuredImage?.url,
    });
  };

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
    }, 280);
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
  };

  // Le consentement au fil, demandé au moment de créer son compte pour voir le
  // résultat (Krystine, 2 oct. 2026 : 95 quiz, 13 inscrites). Jamais coché
  // d'avance; gardé le temps de la connexion Google.
  const [fil, setFil] = useState<boolean>(() => { try { return sessionStorage.getItem('quiz-fil') === '1'; } catch { return false; } });
  const choisirFil = (v: boolean) => { setFil(v); try { sessionStorage.setItem('quiz-fil', v ? '1' : '0'); } catch { /* sans stockage */ } };

  // « Recevoir mon résultat » (Krystine, 2 oct. 2026) : une visiteuse reçoit
  // son résultat par courriel sans créer de compte. La fonction
  // `envoyerResultatQuiz` vérifie le jeton reCAPTCHA, enregistre le résultat,
  // envoie le courriel et inscrit au fil seulement si la case est cochée.
  const [prenom, setPrenom] = useState('');
  const [courriel, setCourriel] = useState('');
  const [pot, setPot] = useState('');
  const [erreurEnvoi, setErreurEnvoi] = useState<string | null>(null);
  const [envoye, setEnvoye] = useState(false);
  const captcha = useRecaptcha(!user && !!teaser && !result);

  const envoyerResultat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teaser) return;
    setErreurEnvoi(null);
    if (!prenom.trim()) { setErreurEnvoi('Entrez votre prénom.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(courriel.trim())) { setErreurEnvoi('Entrez une adresse courriel valide.'); return; }
    if (RECAPTCHA_SITE_KEY && !captcha.getToken()) { setErreurEnvoi('Cochez la case « Je ne suis pas un robot ».'); return; }
    setSubmitting(true);
    try {
      await envoyerResultatQuiz({
        prenom: prenom.trim(),
        email: courriel.trim(),
        dominant: teaser.dominant.name,
        pourcentages: teaser.percentages,
        suite: fil,
        token: captcha.getToken(),
        site: pot,
      });
      if (fil) { trackLead('quiz'); try { sessionStorage.removeItem('quiz-fil'); } catch { /* sans stockage */ } }
      setEnvoye(true);
      setResult({ dominant: teaser.dominant, percentages: teaser.percentages });
    } catch (err: any) {
      captcha.resetWidget();
      setErreurEnvoi(err?.code === 'functions/resource-exhausted' && err?.message
        ? err.message
        : "Votre résultat n'a pas pu être envoyé. Réessayez dans un instant.");
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
      if (fil && user.email) {
        try {
          const profil = lireProfil(percentages);
          const ins = await addNewsletterSubscriber({ email: user.email, firstName: firstName || undefined, source: 'quiz', tags: ['quiz', `dosha-${String(dominant.name || '').toLowerCase()}`, ...profil.etiquettes] } as any);
          // L'étiquette de suite part dans un second appel, APRÈS l'inscription :
          // la séquence ne démarre que sur une fiche modifiée, jamais à sa création.
          if (ins && ins.status === 'active') {
            try { await addNewsletterSubscriber({ email: user.email, source: 'quiz', tags: [profil.suite] } as any); } catch { /* la suite n'empêche jamais le résultat */ }
          }
          trackLead('quiz');
          try { await points.newsletterSigned(user.uid, 'quiz'); } catch { /* non-fatal */ }
          try { sessionStorage.removeItem('quiz-fil'); } catch { /* sans stockage */ }
        } catch { /* l'inscription au fil n'empêche jamais le résultat */ }
      }
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

  const current = step < QUIZ_DATA.length ? QUIZ_DATA[step] : null;

  /* ── Écran résultat complet (dosha + rituel + CTA huile), vedette pleine largeur ── */
  if (result) {
    const ritual = RITUALS[result.dominant.name as 'Vata' | 'Pitta' | 'Kapha'];
    const th = themeForName(result.dominant.name);
    const dRes = ((result.dominant.name || '').toLowerCase() as DoshaType) in DOSHA_THEME ? (result.dominant.name || '').toLowerCase() as DoshaType : 'vata';
    return (
      <Curtain>
        <div className="relative border overflow-hidden" style={{ borderColor: `${th.accent}66`, background: th.tint }}>
          <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: th.accent }} />

          {envoye && (
            <div className="px-6 pt-8 text-center" role="status">
              <p className="v2-serif font-light text-[clamp(1.1rem,1.8vw,1.35rem)] text-[#1c1712]">
                Votre résultat est en route vers votre courriel.
              </p>
              {!user && (
                <button
                  type="button"
                  onClick={() => setSignInOpen(true)}
                  className="mt-3 text-[0.66rem] uppercase tracking-[0.18em] text-[#1c1712]/60 border-b border-[#1c1712]/30 pb-1 transition-colors hover:text-[#7d6330] hover:border-[#9c7a44] min-h-[44px]"
                >
                  Créer mon espace pour le garder
                </button>
              )}
            </div>
          )}

          <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
            {/* Identité : médaillon, dominance, répartition, définition */}
            <div className="p-[clamp(2rem,4.5vw,3.75rem)] text-center lg:border-r" style={{ borderColor: `${th.accent}2e` }}>
              <Medallion d={dRes} className="mx-auto" />
              <p className="mt-7 text-[0.68rem] uppercase tracking-[0.32em]" style={{ color: th.ink }}>
                {lang === 'FR' ? 'Votre dominance aujourd’hui' : 'Your dominance today'}
              </p>
              <h2 className="mt-3 v2-serif font-light text-[#1c1712] leading-[0.96] text-[clamp(3rem,6.5vw,5rem)]">
                {(lang === 'FR' ? DOMINANCE_FR : DOMINANCE_EN)[dRes]}
              </h2>

              {/* Répartition des trois doshas */}
              <div className="mt-10 flex justify-center gap-9 md:gap-12">
                {ALL_DOSHAS.map(d => (
                  <DoshaStat key={d} d={d} pct={result.percentages[d]} label={(lang === 'FR' ? DOMINANCE_FR : DOMINANCE_EN)[d]} />
                ))}
              </div>

              <CarteDominance d={dRes} lang={lang} complet />

              <p className="mt-10 v2-serif font-light text-[clamp(1.1rem,1.9vw,1.45rem)] leading-relaxed text-[#3a2f23] max-w-[46ch] mx-auto">
                {result.dominant.definition}
              </p>
            </div>

            {/* Rituel associé, transcrit de "Guide Rituels, Partie 1", + CTA huile */}
            <div className="p-[clamp(2rem,4.5vw,3.75rem)] flex flex-col justify-center">
              {ritual && (
                <div className="bg-[#faf6ee] border p-7 md:p-9 text-left" style={{ borderColor: `${th.accent}40` }}>
                  <p className="text-[0.62rem] uppercase tracking-[0.3em]" style={{ color: th.ink }}>
                    {lang === 'FR' ? 'Votre repère' : 'Your practice'}
                  </p>
                  <h3 className="mt-3 v2-serif font-light text-[#1c1712] leading-[1.08] text-[clamp(1.5rem,2.4vw,2rem)]">
                    {lang === 'FR' ? ritual.titleFR : ritual.titleEN}
                  </h3>
                  <p className="mt-2 v2-serif text-[0.98rem] md:text-[1.05rem]" style={{ color: th.ink }}>
                    {lang === 'FR' ? ritual.subtitleFR : ritual.subtitleEN}
                  </p>
                  <p className="mt-5 inline-flex items-center gap-2 border px-3.5 py-1.5 text-[0.58rem] uppercase tracking-[0.2em] text-[#3a2f23]" style={{ borderColor: `${th.accent}55` }}>
                    <Clock size={12} weight="light" style={{ color: th.ink }} /> {lang === 'FR' ? ritual.momentFR : ritual.momentEN}
                  </p>
                  <ol className="mt-7 space-y-4">
                    {(lang === 'FR' ? ritual.stepsFR : ritual.stepsEN).map((stepTxt, i) => (
                      <li key={i} className="flex gap-4">
                        <span
                          className="shrink-0 w-7 h-7 rounded-full grid place-items-center v2-serif text-[0.82rem] text-[#faf6ee]"
                          style={{ backgroundColor: th.accent }}
                        >
                          {i + 1}
                        </span>
                        <span className="flex-1 text-[0.92rem] leading-[1.75] text-[#3a2f23]">{stepTxt}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
                <button
                  type="button"
                  onClick={() => addDoshaOil(result.dominant.name)}
                  className="inline-flex items-center gap-3 bg-[#1c1712] px-8 py-4 text-[0.7rem] uppercase tracking-[0.18em] text-[#f4efe6] transition-colors duration-300 hover:bg-[#9c7a44] min-h-[44px]"
                >
                  {lang === 'FR' ? `Ajouter l'huile ${result.dominant.name}` : `Add ${result.dominant.name} oil`}
                  <ArrowRight size={15} weight="regular" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/boutique/huiles-corporelles')}
                  className="group inline-flex items-center gap-2.5 text-[0.7rem] uppercase tracking-[0.2em] text-[#1c1712] border-b border-[#1c1712] pb-1.5 transition-colors duration-300 hover:text-[#7d6330] hover:border-[#9c7a44] min-h-[44px]"
                >
                  {lang === 'FR' ? 'Explorer la collection' : 'Explore the collection'}
                  <ArrowRight size={14} weight="regular" className="transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-[#1c1712]/10">
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
        </div>
      </Curtain>
    );
  }

  /* ── Écran teaser (toutes les questions répondues, pas encore sauvegardé) ── */
  if (!current && teaser) {
    const th = themeForName(teaser.dominant.name);
    const dRes = ((teaser.dominant.name || '').toLowerCase() as DoshaType) in DOSHA_THEME ? (teaser.dominant.name || '').toLowerCase() as DoshaType : 'vata';
    // Jamais cochée d'avance.
    const caseSuite = (
      <label className="mt-7 mx-auto flex max-w-[34rem] cursor-pointer items-start gap-3 text-left text-[#3a2f23]">
        <input
          type="checkbox"
          checked={fil}
          onChange={e => choisirFil(e.target.checked)}
          className="mt-1 h-[18px] w-[18px] shrink-0 cursor-pointer"
          style={{ accentColor: th.accent }}
        />
        <span>
          <span className="block text-[0.95rem] leading-relaxed">{lang === 'FR' ? 'Recevoir la suite de ma lecture' : 'Receive the rest of my reading'}</span>
          <span className="mt-1 block text-[0.8rem] leading-relaxed text-[#3a2f23]/75">
            {lang === 'FR'
              ? 'Des repères adaptés à votre résultat pour mieux reconnaître ce qui change, ce qui s’accumule et ce qui vous influence.'
              : 'Markers suited to your result, to better recognize what changes, what builds up and what influences you.'}
          </span>
        </span>
      </label>
    );
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
            <Medallion d={dRes} className="mx-auto" />
            <p className="mt-7 text-[0.68rem] uppercase tracking-[0.32em]" style={{ color: th.ink }}>
              {lang === 'FR' ? 'Votre dominance aujourd’hui' : 'Your dominance today'}
            </p>
            <h2 className="mt-3 v2-serif font-light text-[#1c1712] leading-[0.96] text-[clamp(3rem,6.5vw,5rem)]">
              {(lang === 'FR' ? DOMINANCE_FR : DOMINANCE_EN)[dRes]}
            </h2>

            <div className="mt-10 flex justify-center gap-9 md:gap-12">
              {ALL_DOSHAS.map(d => (
                <DoshaStat key={d} d={d} pct={teaser.percentages[d]} label={(lang === 'FR' ? DOMINANCE_FR : DOMINANCE_EN)[d]} />
              ))}
            </div>

            <CarteDominance d={dRes} lang={lang} complet={false} />

            <div className="mt-11 pt-8 border-t max-w-[42rem] mx-auto" style={{ borderColor: `${th.accent}35` }}>
              {user ? (
                <>
                  <p className="inline-flex items-center gap-2.5 text-[0.62rem] uppercase tracking-[0.24em] text-[#3a2f23]">
                    <LockSimple size={13} weight="light" style={{ color: th.ink }} /> {lang === 'FR' ? 'Profil complet' : 'Full profile'}
                  </p>
                  <p className="mt-5 v2-serif font-light text-[clamp(1.1rem,1.9vw,1.4rem)] leading-relaxed text-[#3a2f23] max-w-[46ch] mx-auto">
                    {lang === 'FR' ? 'Enregistrez votre résultat dans votre espace pour retrouver votre profil complet.' : 'Save your result to your space to discover your full profile.'}
                  </p>
                  {caseSuite}
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
                    {lang === 'FR' ? 'Votre résultat complet' : 'Your full result'}
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
                      value={prenom}
                      onChange={e => setPrenom(e.target.value)}
                      className="w-full border-b border-[#1c1712]/30 bg-transparent py-3 text-[0.95rem] text-[#1c1712] placeholder:text-[#1c1712]/45 outline-none transition-colors focus:border-[#9c7a44]"
                    />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      placeholder={lang === 'FR' ? 'Courriel' : 'Email'}
                      aria-label={lang === 'FR' ? 'Courriel' : 'Email'}
                      value={courriel}
                      onChange={e => setCourriel(e.target.value)}
                      className="w-full border-b border-[#1c1712]/30 bg-transparent py-3 text-[0.95rem] text-[#1c1712] placeholder:text-[#1c1712]/45 outline-none transition-colors focus:border-[#9c7a44]"
                    />
                  </div>
                  {caseSuite}
                  {RECAPTCHA_SITE_KEY && <div ref={captcha.boxRef} className="mt-6 flex justify-center" />}
                  <div className="mt-8 flex flex-col items-center gap-3">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-3 bg-[#1c1712] px-8 py-4 text-[0.7rem] uppercase tracking-[0.18em] text-[#f4efe6] transition-colors duration-300 hover:bg-[#9c7a44] disabled:opacity-60 min-h-[44px]"
                    >
                      {submitting
                        ? (lang === 'FR' ? 'Envoi…' : 'Sending…')
                        : <>{lang === 'FR' ? 'Recevoir mon résultat' : 'Receive my result'} <ArrowRight size={15} weight="regular" /></>}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignInOpen(true)}
                      className="text-[0.66rem] uppercase tracking-[0.18em] text-[#1c1712]/60 border-b border-[#1c1712]/30 pb-1 transition-colors hover:text-[#7d6330] hover:border-[#9c7a44] min-h-[44px]"
                    >
                      {lang === 'FR' ? 'J’ai déjà un compte' : 'I already have an account'}
                    </button>
                  </div>
                  {erreurEnvoi && <p role="alert" className="mt-4 text-center text-[0.9rem] text-[#83322b]">{erreurEnvoi}</p>}
                  <div className="mt-6 flex justify-center">{boutonRecommencer}</div>
                </form>
              )}

              <p className="mt-7 text-[0.58rem] uppercase tracking-[0.18em] text-[#1c1712]/45">
                {lang === 'FR' ? 'Vos résultats restent privés et sécurisés.' : 'Your results stay private and secure.'}
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
        <div className="relative border border-[#9c7a44]/35 bg-[#faf6ee] overflow-hidden">
          <span
            aria-hidden
            className="absolute -top-px -left-px bg-[#1c1712] text-[#f4efe6] px-3 py-1.5 text-[0.56rem] uppercase tracking-[0.24em] z-10"
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
              <h3 className="v2-serif font-light text-[#1c1712] leading-[1.08] text-[clamp(1.6rem,3vw,2.4rem)] max-w-[30ch]">
                {lang === 'FR' ? current.questionFR : current.questionEN}
              </h3>

              {/* Choix en rangées éditoriales indexées 01/02/03 */}
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
                      <span
                        className={`v2-serif text-[1.05rem] tabular-nums pt-0.5 transition-colors duration-300 ${
                          isFlash ? 'text-[#7d6330]' : 'text-[#1c1712]/40 group-hover:text-[#7d6330]'
                        }`}
                      >
                        0{idx + 1}
                      </span>
                      <span className={`flex-1 text-[0.95rem] leading-[1.75] transition-colors duration-300 ${
                        isFlash ? 'text-[#1c1712]' : 'text-[#3a2f23] group-hover:text-[#1c1712]'
                      }`}>
                        {lang === 'FR' ? opt.fr : opt.en}
                      </span>
                      <span className="shrink-0 pt-1">
                        {isFlash
                          ? <Check size={16} weight="bold" className="text-[#7d6330]" />
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
      )}
    </Reveal>
  );
};

/* ════════════════════════ Page ════════════════════════ */

const INSIDE = [
  {
    n: '01',
    titleFR: 'Dix lectures de votre nature',
    titleEN: 'Ten readings of your nature',
    bodyFR: "Constitution, sommeil, digestion, stress, énergie, changement, mental, émotions, épuisement et tempérament : dix dimensions du corps et de l'instant, une question à la fois.",
    bodyEN: 'Build, sleep, digestion, stress, energy, change, mind, emotions, exhaustion and temperament: ten dimensions of body and moment, one question at a time.',
  },
  {
    n: '02',
    titleFR: 'Votre dominance, en pourcentages',
    titleEN: 'Your dominance, in percentages',
    bodyFR: 'Vent, Feu ou Terre : votre répartition unique du moment, calculée à partir de vos réponses, sans jugement et sans bonne ou mauvaise réponse.',
    bodyEN: 'Wind, Fire or Earth: your unique balance of the moment, drawn from your answers, with no judgment and no right or wrong answer.',
  },
  {
    n: '03',
    titleFR: 'Votre résultat, puis la suite',
    titleEN: 'Your result, then what follows',
    bodyFR: "Votre résultat complet arrive par courriel. Si vous le souhaitez, la suite de votre lecture suit : des lettres pour reconnaître comment votre dominance se manifeste, ce qui l'accentue et comment elle évolue.",
    bodyEN: "Your full result arrives by email. If you wish, the rest of your reading follows: letters to recognize how your dominance shows up, what amplifies it and how it evolves.",
  },
];

const DOMINANCE_FR: Record<string, string> = { vata: 'Vent', pitta: 'Feu', kapha: 'Terre' };
const DOMINANCE_EN: Record<string, string> = { vata: 'Wind', pitta: 'Fire', kapha: 'Earth' };

// « Quelques clés de l'Ayurveda » : la carte vert profond du site (Krystine, 2 oct. 2026, le papier doré écarté).
const CLES_FR: [string, string][] = [
  ['Ayurveda', 'du sanskrit ayus, la vie, et veda, la connaissance, pouvant être traduit par « science de la vie ». Sœur du yoga.'],
  ['Les cinq éléments', 'l’Espace, l’Air, le Feu, l’Eau et la Terre, dont tout est fait, nous compris.'],
  ['Dosha', 'une force née de ces éléments. Il y en a trois, présentes en chacune de nous dans des proportions qui lui sont propres.'],
  ['Vata', 'l’Air et l’Espace, le mouvement.'],
  ['Pitta', 'le Feu et l’Eau, la chaleur et la digestion.'],
  ['Kapha', 'l’Eau et la Terre, la structure et la stabilité.'],
  ['Causes-racines', 'l’Ayurveda remonte à ce qui fait naître un déséquilibre, plutôt que de s’arrêter à ce qui se voit en surface.'],
];
const CLES_EN: [string, string][] = [
  ['Ayurveda', 'from the Sanskrit ayus, life, and veda, knowledge, which can be translated as “the science of life”. Sister of yoga.'],
  ['The five elements', 'Space, Air, Fire, Water and Earth, of which everything is made, ourselves included.'],
  ['Dosha', 'a force born of these elements. There are three, present in each of us in proportions of our own.'],
  ['Vata', 'Air and Space, movement.'],
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
        {/* La ligne de tête « N° 05 · Québec » est retirée de la page du quiz (Krystine, 2 oct. 2026 : elle parle aussi à l'Europe). */}

        {/* La vidéo du quiz en bannière, sans le logo d'ouverture (Krystine, 1er oct. 2026) */}
        <motion.div {...heroFade(0.2)} className="mt-6">
          <Planche
            video="/quiz/quiz-dosha-revisee.mp4"
            poster="/quiz/quiz-dosha-revisee-poster.jpg"
            ratio="aspect-[16/9] sm:aspect-[21/9] lg:aspect-[8/3]"
            etiquette="Vent · Feu · Terre"
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
            </motion.div>
            <motion.div {...heroFade(0.55)} className="mt-11 flex flex-wrap items-center gap-x-9 gap-y-4">
              <a
                href="#quiz-debut"
                className="group inline-flex items-center gap-2.5 text-[0.72rem] uppercase tracking-[0.2em] text-[#1c1712] border-b border-[#1c1712] pb-1.5 transition-colors duration-300 hover:text-[#7d6330] hover:border-[#9c7a44] min-h-[44px]"
              >
                {lang === 'FR' ? 'Commencer le quiz' : 'Begin the quiz'}
                <ArrowDown size={15} weight="regular" className="transition-transform duration-300 group-hover:translate-y-0.5" />
              </a>
              <span className="text-[0.62rem] uppercase tracking-[0.2em] text-[#1c1712]/55">
                {lang === 'FR' ? 'Gratuit · 3 minutes' : 'Free · 3 minutes'}
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
      <section id="quiz" className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(5rem,12vh,9rem)] bg-[#f4efe6] scroll-mt-24 overflow-hidden">
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
            <Kicker className="mb-5">{lang === 'FR' ? 'Ce qui vous attend' : 'What you get'}</Kicker>
            <h2 className="v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2.2rem,5vw,4rem)]">
              {lang === 'FR' ? 'Le miroir de votre nature' : 'The mirror of your nature'}
            </h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="v2-serif font-light text-[clamp(1.1rem,1.9vw,1.45rem)] leading-snug text-[#3a2f23] max-w-[46ch]">
              {lang === 'FR'
                ? 'Dix questions, votre dominance du moment et ce qui l’accentue. Suivez votre premier réflexe.'
                : 'Ten questions, your dominance of the moment and what amplifies it. Trust your first instinct.'}
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
