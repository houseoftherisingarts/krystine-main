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
import { points } from '../firebase/points';
import {
  getProducts, formatMoney, isShopifyConfigured, type ShopifyProduct,
} from '../shopify';
import { findOilForDosha } from '../lib/shopifyOil';
import { RITUALS } from '../lib/doshaRituals';
import NewsletterSignup from '../components/NewsletterSignup';
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
        className="absolute top-[2%] right-[-3%] v2-serif italic font-light leading-none select-none text-[clamp(8rem,22vw,20rem)] text-[#1c1712]/[0.05] will-change-transform"
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
      { fr: "Mince, jointures proéminentes, peu de protection sur l'ensemble du corps.",
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
    categoryFR: 'Type de fatigue', categoryEN: 'Type of fatigue',
    questionFR: 'À quoi ressemble votre fatigue quand elle survient ?',
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

// Icône éditoriale par dosha (Phosphor, weight light), purement décorative.
const DOSHA_ICON: Record<DoshaType, React.ComponentType<{ size?: number; weight?: any; className?: string; style?: React.CSSProperties }>> = {
  vata: Wind,
  pitta: Flame,
  kapha: Leaf,
};

// Système multi-couleur V2 : accent (médaillon plein, filet), accent-encre
// (texte, contraste AA sur crème/tint) et tint de carte, par dosha.
const DOSHA_THEME: Record<DoshaType, { accent: string; ink: string; tint: string }> = {
  vata:  { accent: '#b9822f', ink: '#8a5e1f', tint: '#efe1c6' },
  pitta: { accent: '#b4533a', ink: '#8f3d29', tint: '#f1ddcf' },
  kapha: { accent: '#74824a', ink: '#55602f', tint: '#e6e8cf' },
};

const themeForName = (name: string) =>
  DOSHA_THEME[(name || '').trim().toLowerCase() as DoshaType]
  ?? { accent: '#9c7a44', ink: '#7d6330', tint: '#faf6ee' };

// One answer per question : the dosha the user picked. Total score equals the
// number of answered questions; percentages are computed from that total.
const scoresFromPicks = (picks: (DoshaType | null)[]) => {
  const s = { vata: 0, pitta: 0, kapha: 0 };
  for (const p of picks) if (p) s[p] += 1;
  return s;
};

/* ════════════════════════ Micro-composants du résultat ════════════════════════ */

/* Médaillon plein qui éclot (scale + rotate spring) */
const Medallion: React.FC<{ Icon: React.ComponentType<any>; accent: string; size?: number; iconSize?: number; delay?: number; className?: string }> = ({
  Icon, accent, size = 64, iconSize = 28, delay = 0.25, className = '',
}) => {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className={`grid place-items-center rounded-full text-[#faf6ee] will-change-transform ${className}`}
      style={{ background: accent, width: size, height: size }}
      initial={reduce ? false : { scale: 0, rotate: -12 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ ...SPRING, delay }}
    >
      <Icon size={iconSize} weight="light" />
    </motion.span>
  );
};

/* Statistique d'un dosha : icône, pourcentage, filet proportionnel qui se trace */
const DoshaStat: React.FC<{ d: DoshaType; pct: number }> = ({ d, pct }) => {
  const Icon = DOSHA_ICON[d];
  const th = DOSHA_THEME[d];
  const reduce = useReducedMotion();
  return (
    <div className="flex flex-col items-center gap-1.5">
      <Icon size={18} weight="light" style={{ color: th.accent }} />
      <span className="v2-serif font-light text-3xl md:text-4xl tabular-nums" style={{ color: th.ink }}>{pct}%</span>
      <span className="text-[0.58rem] uppercase tracking-[0.22em] text-[#1c1712]/60">{d}</span>
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
    let dominant = ay.doshas[0];
    if (pitta >= vata && pitta >= kapha) dominant = ay.doshas[1];
    if (kapha >= vata && kapha >= pitta) dominant = ay.doshas[2];
    if (vata >= pitta && vata >= kapha) dominant = ay.doshas[0];
    const total = vata + pitta + kapha || 1;
    return {
      dominant,
      percentages: {
        vata: Math.round((vata / total) * 100),
        pitta: Math.round((pitta / total) * 100),
        kapha: Math.round((kapha / total) * 100),
      },
    };
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
    const Icon = DOSHA_ICON[(result.dominant.name || '').toLowerCase() as DoshaType] ?? Wind;
    return (
      <Curtain>
        <div className="relative border overflow-hidden" style={{ borderColor: `${th.accent}66`, background: th.tint }}>
          <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: th.accent }} />

          <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
            {/* Identité : médaillon, dominance, répartition, définition */}
            <div className="p-[clamp(2rem,4.5vw,3.75rem)] text-center lg:border-r" style={{ borderColor: `${th.accent}2e` }}>
              <Medallion Icon={Icon} accent={th.accent} className="mx-auto" />
              <p className="mt-7 text-[0.68rem] uppercase tracking-[0.32em]" style={{ color: th.ink }}>
                {lang === 'FR' ? 'Votre nature dominante est' : 'Your dominant nature is'}
              </p>
              <h2 className="mt-3 v2-serif font-light text-[#1c1712] leading-[0.96] text-[clamp(3rem,6.5vw,5rem)]">
                {result.dominant.name}
              </h2>
              {result.dominant.elements && (
                <p className="mt-3 text-[0.62rem] uppercase tracking-[0.26em] text-[#1c1712]/55">
                  {result.dominant.elements}
                </p>
              )}

              {/* Répartition des trois doshas */}
              <div className="mt-10 flex justify-center gap-9 md:gap-12">
                {ALL_DOSHAS.map(d => (
                  <DoshaStat key={d} d={d} pct={result.percentages[d]} />
                ))}
              </div>

              <p className="mt-10 v2-serif italic font-light text-[clamp(1.1rem,1.9vw,1.45rem)] leading-relaxed text-[#3a2f23] max-w-[46ch] mx-auto">
                {result.dominant.definition}
              </p>
            </div>

            {/* Rituel associé, transcrit de "Guide Rituels, Partie 1", + CTA huile */}
            <div className="p-[clamp(2rem,4.5vw,3.75rem)] flex flex-col justify-center">
              {ritual && (
                <div className="bg-[#faf6ee] border p-7 md:p-9 text-left" style={{ borderColor: `${th.accent}40` }}>
                  <p className="text-[0.62rem] uppercase tracking-[0.3em]" style={{ color: th.ink }}>
                    {lang === 'FR' ? 'Votre rituel' : 'Your ritual'}
                  </p>
                  <h3 className="mt-3 v2-serif font-light text-[#1c1712] leading-[1.08] text-[clamp(1.5rem,2.4vw,2rem)]">
                    {lang === 'FR' ? ritual.titleFR : ritual.titleEN}
                  </h3>
                  <p className="mt-2 v2-serif italic text-[0.98rem] md:text-[1.05rem]" style={{ color: th.ink }}>
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
    const Icon = DOSHA_ICON[(teaser.dominant.name || '').toLowerCase() as DoshaType] ?? Wind;
    return (
      <Curtain className="max-w-[860px] mx-auto">
        <div className="relative border overflow-hidden text-center" style={{ borderColor: `${th.accent}66`, background: th.tint }}>
          <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: th.accent }} />
          <div className="p-[clamp(2rem,5vw,4rem)]">
            <Medallion Icon={Icon} accent={th.accent} className="mx-auto" />
            <p className="mt-7 text-[0.68rem] uppercase tracking-[0.32em]" style={{ color: th.ink }}>
              {lang === 'FR' ? 'Votre nature dominante' : 'Your dominant nature'}
            </p>
            <h2 className="mt-3 v2-serif font-light text-[#1c1712] leading-[0.96] text-[clamp(3rem,6.5vw,5rem)]">
              {teaser.dominant.name}
            </h2>
            {teaser.dominant.elements && (
              <p className="mt-3 text-[0.62rem] uppercase tracking-[0.26em] text-[#1c1712]/55">
                {teaser.dominant.elements}
              </p>
            )}

            <div className="mt-10 flex justify-center gap-9 md:gap-12">
              {ALL_DOSHAS.map(d => (
                <DoshaStat key={d} d={d} pct={teaser.percentages[d]} />
              ))}
            </div>

            <div className="mt-11 pt-8 border-t max-w-[42rem] mx-auto" style={{ borderColor: `${th.accent}35` }}>
              <p className="inline-flex items-center gap-2.5 text-[0.62rem] uppercase tracking-[0.24em] text-[#3a2f23]">
                <LockSimple size={13} weight="light" style={{ color: th.ink }} /> {lang === 'FR' ? 'Profil complet' : 'Full profile'}
              </p>
              <p className="mt-5 v2-serif italic font-light text-[clamp(1.1rem,1.9vw,1.4rem)] leading-relaxed text-[#3a2f23] max-w-[46ch] mx-auto">
                {user
                  ? (lang === 'FR' ? 'Enregistrez votre résultat dans votre espace pour accéder à vos rituels et recommandations personnalisés.' : 'Save your result to your space to unlock your personalized rituals and recommendations.')
                  : (lang === 'FR' ? 'Connectez-vous pour enregistrer votre profil et débloquer vos rituels personnalisés.' : 'Sign in to save your profile and unlock your personalized rituals.')}
              </p>

              <div className="mt-9 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
                {user ? (
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
                ) : (
                  <button
                    type="button"
                    onClick={() => setSignInOpen(true)}
                    className="inline-flex items-center gap-3 bg-[#1c1712] px-8 py-4 text-[0.7rem] uppercase tracking-[0.18em] text-[#f4efe6] transition-colors duration-300 hover:bg-[#9c7a44] min-h-[44px]"
                  >
                    {lang === 'FR' ? 'Se connecter pour sauvegarder' : 'Sign in to save'} <ArrowRight size={15} weight="regular" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={restart}
                  className="inline-flex items-center gap-2 text-[0.66rem] uppercase tracking-[0.18em] text-[#1c1712]/60 border-b border-[#1c1712]/30 pb-1 transition-colors hover:text-[#7d6330] hover:border-[#9c7a44] min-h-[44px]"
                >
                  <ArrowCounterClockwise size={13} weight="light" /> {lang === 'FR' ? 'Recommencer' : 'Restart'}
                </button>
              </div>

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

              <div className="mt-8 pt-5 border-t border-[#1c1712]/10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={step === 0}
                  className="inline-flex items-center gap-2 text-[0.62rem] uppercase tracking-[0.2em] text-[#1c1712]/60 transition-colors hover:text-[#7d6330] disabled:opacity-30 disabled:hover:text-[#1c1712]/60 min-h-[44px]"
                >
                  <ArrowLeft size={13} weight="regular" /> {lang === 'FR' ? 'Précédent' : 'Back'}
                </button>
                <span className="v2-serif italic text-[0.92rem] text-[#1c1712]/50">
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
    bodyFR: "Constitution, sommeil, digestion, stress, énergie, émotions, fatigue, tempérament. Dix dimensions du corps et de l'instant, une question à la fois.",
    bodyEN: 'Build, sleep, digestion, stress, energy, emotions, fatigue, temperament. Ten dimensions of body and moment, one question at a time.',
  },
  {
    n: '02',
    titleFR: 'Votre dominance, en pourcentages',
    titleEN: 'Your dominance, in percentages',
    bodyFR: 'Vata, Pitta ou Kapha : votre répartition unique du moment, calculée à partir de vos réponses, sans jugement et sans bonne ou mauvaise réponse.',
    bodyEN: 'Vata, Pitta or Kapha: your unique balance of the moment, drawn from your answers, with no judgment and no right or wrong answer.',
  },
  {
    n: '03',
    titleFR: 'Un rituel taillé pour vous',
    titleEN: 'A ritual made for you',
    bodyFR: "À la fin, le rituel associé à votre dominance et l'huile corporelle qui l'accompagne, transcrits du Guide Rituels d'Inspirata Ayurveda.",
    bodyEN: "At the end, the ritual matched to your dominance and the body oil that goes with it, drawn from the Inspirata Ayurveda Ritual Guide.",
  },
];

const QuizLoeuvre: React.FC = () => {
  const { lang } = useApp();
  const reduce = useReducedMotion();
  const t = CONTENT[lang];
  const ay = t.ayurveda;

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
        <motion.div
          {...heroFade(0.55)}
          className="flex items-center justify-between border-t border-[#1c1712]/15 pt-3.5 text-[0.6rem] uppercase tracking-[0.28em] text-[#1c1712]/55"
        >
          <span>N&deg; 05 &middot; Quiz Dosha</span>
          <span className="hidden sm:inline">Québec &middot; MMXXVI</span>
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
            <motion.p
              {...heroFade(0.4)}
              className="mt-7 v2-serif italic font-light text-[clamp(1.35rem,2.6vw,2rem)] leading-[1.3] text-[#3a2f23] max-w-[28ch]"
            >
              {lang === 'FR'
                ? <>Dix questions pour révéler <span className="not-italic text-[#1c1712]">votre dominance du moment.</span></>
                : <>Ten questions to reveal <span className="not-italic text-[#1c1712]">your dominance of the moment.</span></>}
            </motion.p>
            <motion.div {...heroFade(0.55)} className="mt-11 flex flex-wrap items-center gap-x-9 gap-y-4">
              <a
                href="#quiz"
                className="group inline-flex items-center gap-2.5 text-[0.72rem] uppercase tracking-[0.2em] text-[#1c1712] border-b border-[#1c1712] pb-1.5 transition-colors duration-300 hover:text-[#7d6330] hover:border-[#9c7a44] min-h-[44px]"
              >
                {lang === 'FR' ? 'Commencer le quiz' : 'Begin the quiz'}
                <ArrowDown size={15} weight="regular" className="transition-transform duration-300 group-hover:translate-y-0.5" />
              </a>
              <span className="text-[0.62rem] uppercase tracking-[0.2em] text-[#1c1712]/55">
                {lang === 'FR' ? 'Gratuit · 3 minutes · Vata · Pitta · Kapha' : 'Free · 3 minutes · Vata · Pitta · Kapha'}
              </span>
            </motion.div>
          </div>

          {/* Panneau encadré : les trois natures (système multi-couleur) */}
          <motion.div {...heroFade(0.35)} className="relative hidden lg:block self-center">
            <span className="pointer-events-none absolute -inset-2 border border-[#9c7a44]/35" aria-hidden />
            <div className="relative bg-[#faf6ee] px-9 py-4">
              {ay.doshas.map((d: any, i: number) => {
                const key = ALL_DOSHAS[i];
                const th = DOSHA_THEME[key];
                const Icon = DOSHA_ICON[key];
                return (
                  <div key={d.name} className={`flex items-center gap-6 py-6 ${i > 0 ? 'border-t border-[#1c1712]/10' : ''}`}>
                    <span className="shrink-0 grid place-items-center w-12 h-12 rounded-full text-[#faf6ee]" style={{ background: th.accent }}>
                      <Icon size={22} weight="light" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-3">
                        <p className="v2-serif font-light text-[1.35rem] text-[#1c1712]">{d.name}</p>
                        <p className="text-[0.56rem] uppercase tracking-[0.22em]" style={{ color: th.ink }}>{d.elements}</p>
                      </div>
                      <p className="mt-1 text-[0.85rem] leading-[1.6] text-[#3a2f23]">{d.action}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <span className="absolute -top-2 -left-2 bg-[#1c1712] text-[#f4efe6] px-3 py-1.5 text-[0.58rem] uppercase tracking-[0.24em]">
              {lang === 'FR' ? 'Les trois natures' : 'The three natures'}
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
          <span className="hidden sm:inline">Vata &middot; Pitta &middot; Kapha</span>
        </motion.div>
      </section>

      {/* ─────────── QU'EST-CE QUE L'AYURVEDA · 2 colonnes pleine largeur ─────────── */}
      <section className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(5rem,12vh,9rem)] bg-[#f4efe6]">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-x-[clamp(2.5rem,6vw,6rem)] gap-y-10 items-start">
          <Reveal>
            <Kicker className="mb-5">{lang === 'FR' ? 'La sagesse derrière le quiz' : 'The wisdom behind the quiz'}</Kicker>
            <h2 className="v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2.2rem,5vw,4rem)]">
              {lang === 'FR' ? "Qu'est-ce que l'Ayurveda ?" : 'What is Ayurveda?'}
            </h2>
            <DrawRule className="mt-7 w-24" />
          </Reveal>
          <Reveal delay={0.12}>
            <p className="v2-serif italic font-light text-[clamp(1.25rem,2.2vw,1.75rem)] leading-[1.45] text-[#3a2f23]">
              {ay.whatIsText}
            </p>
            <p className="mt-7 text-[1rem] leading-[1.85] text-[#3a2f23] max-w-[62ch]">
              {ay.desc}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ─────────── CE QUE VOUS OBTENEZ · panneau, cascade indexée ─────────── */}
      <section className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(5rem,12vh,9rem)] bg-[#efe6d7]">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-x-[clamp(2.5rem,6vw,6rem)] gap-y-8 items-end mb-14">
          <Reveal>
            <Kicker className="mb-5">{lang === 'FR' ? 'Ce qui vous attend' : 'What you get'}</Kicker>
            <h2 className="v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2.2rem,5vw,4rem)]">
              {lang === 'FR' ? 'Un miroir, pas une étiquette' : 'A mirror, not a label'}
            </h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="v2-serif italic font-light text-[clamp(1.1rem,1.9vw,1.45rem)] leading-snug text-[#3a2f23] max-w-[46ch]">
              {lang === 'FR'
                ? "Dix questions, votre dominance du moment, et le rituel qui l'accompagne. Suivez votre premier réflexe."
                : 'Ten questions, your dominance of the moment, and the ritual that fits it. Trust your first instinct.'}
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

      {/* ─────────── LE QUIZ ─────────── */}
      <section id="quiz" className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(5rem,12vh,9rem)] bg-[#f4efe6] scroll-mt-24 overflow-hidden">
        <GiantWord word="Dosha" />
        <div className="relative z-10">
          <Reveal className="text-center mb-12">
            <Kicker className="mb-5">{lang === 'FR' ? 'À vous de jouer' : 'Your turn'}</Kicker>
            <h2 className="v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2.2rem,5vw,3.8rem)]">
              {lang === 'FR' ? 'Répondez en toute simplicité' : 'Answer, simply'}
            </h2>
            <p className="mt-5 v2-serif italic font-light text-[clamp(1.1rem,1.8vw,1.4rem)] text-[#3a2f23] max-w-[46ch] mx-auto">
              {lang === 'FR'
                ? "Il n'y a pas de mauvaise réponse, seulement la vôtre, ici et maintenant."
                : 'There is no wrong answer, only yours, here and now.'}
            </p>
          </Reveal>
          <Quiz lang={lang} />
        </div>
      </section>

      {/* ─────────── SIGNUP · le moment sombre (back-cover), arêtes nettes ─────────── */}
      <section className="relative overflow-hidden bg-[#34241a] py-[clamp(5rem,12vh,9rem)]">
        <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-[#9c7a44]" />
        <Atmosphere light="70% 12%" />
        <div className="relative z-10 mx-auto w-full max-w-[820px] px-[clamp(1.5rem,5vw,5.5rem)] text-center">
          <Reveal>
            <p className="text-[0.7rem] uppercase tracking-[0.34em] text-[#c8a86a]">
              {lang === 'FR' ? 'Rester sur le fil' : 'Stay on the thread'}
            </p>
            <h2 className="mt-5 v2-serif font-light leading-[1.04] text-[#f4efe6] text-[clamp(2.2rem,5vw,3.8rem)]">
              {lang === 'FR' ? 'Le fil, à votre rythme' : 'The thread, at your pace'}
            </h2>
            <p className="mt-6 v2-serif italic font-light text-[clamp(1.1rem,1.9vw,1.45rem)] leading-relaxed text-[#f4efe6]/75 max-w-[52ch] mx-auto">
              {lang === 'FR'
                ? "Recevez le fil de Krystine : repères saisonniers, rituels selon votre dosha et nouvelles des prochains parcours, sans bruit."
                : "Receive Krystine's thread: seasonal markers, rituals matched to your dosha and word of upcoming journeys, no noise."}
            </p>
          </Reveal>
          <Reveal delay={0.1} className="mt-10">
            <NewsletterSignup
              source="quiz"
              variant="dark"
              ctaLabel={lang === 'FR' ? 'Rejoindre le fil' : 'Join the thread'}
            />
          </Reveal>
        </div>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-[#9c7a44]" />
      </section>

      {/* ─────────── CONTACT ─────────── */}
      <section className="bg-[#f4efe6] py-[clamp(4rem,9vh,6rem)] px-[clamp(1.5rem,5vw,5.5rem)] text-center">
        <a
          href="mailto:teamksl@inspiratanature.com"
          className="v2-serif italic font-light text-[clamp(1.1rem,1.8vw,1.4rem)] text-[#7d6330] hover:text-[#1c1712] transition-colors duration-300 border-b border-[#9c7a44]/40 pb-1"
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
