import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles, ArrowRight, ArrowLeft, Check, RotateCcw,
  Lock, Clock, Wind, Flame, Leaf,
} from 'lucide-react';
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
import { Seam } from '../components/motion/loeuvre';

/**
 * Quiz Dosha — page React au style L'Œuvre (espresso/cream/brass).
 * Garde 100 % de la logique d'origine : QUIZ_DATA, le calcul des scores et des
 * pourcentages, l'auto-avance, le retour/recommencer, l'écriture CRM
 * (addDoshaQuizResult + updateMember + points.quizCompleted) et l'ajout au
 * panier de l'huile dosha (findOilForDosha). Branche aussi le vrai
 * NewsletterSignup (source="quiz").
 * Skills : premium-web (orchestrateur) + ui-ux-pro-max (tokens/contraste AA) + impeccable (craft).
 */

const ease = [0.16, 0.8, 0.24, 1] as const;

const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({
  children, delay = 0, className,
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 28, filter: 'blur(6px)' }}
    whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
    viewport={{ once: true, amount: 0.15 }}
    transition={{ duration: 1.0, ease, delay }}
  >
    {children}
  </motion.div>
);

const Eyebrow: React.FC<{ children: React.ReactNode; on?: 'dark' | 'light' }> = ({ children, on = 'light' }) => (
  <p className={`font-sans text-[0.62rem] uppercase tracking-[0.28em] ${on === 'dark' ? 'text-brass' : 'text-brassInk'}`}>
    {children}
  </p>
);

const SectionTitle: React.FC<{ children: React.ReactNode; on?: 'dark' | 'light'; className?: string }> = ({ children, on = 'light', className = '' }) => (
  <h2 className={`font-serif font-medium leading-[1.05] text-[clamp(2rem,4.2vw,3.2rem)] ${on === 'dark' ? 'text-ctext' : 'text-ink'} ${className}`}>
    {children}
  </h2>
);

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
        en: 'Jagged — energy spikes followed by sharp drops.', type: 'vata' },
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

// Icône éditoriale par dosha — purement décorative, n'altère pas la logique.
const DOSHA_ICON: Record<DoshaType, React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>> = {
  vata: Wind,
  pitta: Flame,
  kapha: Leaf,
};

// One answer per question — the dosha the user picked. Total score equals the
// number of answered questions; percentages are computed from that total.
const scoresFromPicks = (picks: (DoshaType | null)[]) => {
  const s = { vata: 0, pitta: 0, kapha: 0 };
  for (const p of picks) if (p) s[p] += 1;
  return s;
};

/* ════════════════════════ Le quiz (carte question + progression + résultat) ════════════════════════ */

const Quiz: React.FC<{ lang: 'FR' | 'EN' }> = ({ lang }) => {
  const { addToCart, user, member, setSignInOpen } = useApp();
  const navigate = useNavigate();
  const t = CONTENT[lang];
  const ay = t.ayurveda;

  // Shopify catalog — fetched so the quiz recommendation lands a genuine
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

  // Single-click answer — records the pick and auto-advances after a brief
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
      // Loyalty — 5 pts for completing the quiz. Idempotent on quiz:{uid},
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

  /* ── Écran résultat complet (dosha + rituel + CTA huile) ── */
  if (result) {
    const ritual = RITUALS[result.dominant.name as 'Vata' | 'Pitta' | 'Kapha'];
    return (
      <Reveal>
        <div className="rounded-[2rem] border border-brass/30 bg-espresso p-8 md:p-12 text-center shadow-[0_30px_80px_rgba(0,0,0,0.3)]">
          <p className="font-sans text-[0.62rem] uppercase tracking-[0.28em] text-brass">
            {lang === 'FR' ? 'Votre nature dominante est' : 'Your dominant nature is'}
          </p>
          <h2 className="mt-4 font-serif font-medium text-ctext leading-[1.0] text-[clamp(2.6rem,6vw,4.2rem)]">
            {result.dominant.name}
          </h2>
          {result.dominant.elements && (
            <p className="mt-3 font-sans text-[0.62rem] uppercase tracking-[0.26em] text-ctextSoft/70">
              {result.dominant.elements}
            </p>
          )}

          {/* Répartition des trois doshas */}
          <div className="mt-9 flex justify-center gap-10 md:gap-14">
            {ALL_DOSHAS.map(d => {
              const Icon = DOSHA_ICON[d];
              return (
                <div key={d} className="flex flex-col items-center gap-2">
                  <Icon size={18} className="text-brass" strokeWidth={1.6} />
                  <span className="font-serif text-2xl md:text-3xl text-brassBright tabular-nums">{result.percentages[d]}%</span>
                  <span className="font-sans text-[0.58rem] uppercase tracking-[0.22em] text-ctextSoft">{d}</span>
                </div>
              );
            })}
          </div>

          <p className="mt-9 font-serif italic text-[clamp(1.05rem,1.9vw,1.4rem)] leading-relaxed text-ctextSoft max-w-[52ch] mx-auto">
            {result.dominant.definition}
          </p>

          {/* Rituel associé — transcrit de "Guide Rituels — Partie 1". */}
          {ritual && (
            <div
              className="mt-10 max-w-[34rem] mx-auto rounded-[1.6rem] border p-7 md:p-8 text-left"
              style={{
                borderColor: `${ritual.accent}55`,
                background: `linear-gradient(135deg, ${ritual.accent}1f 0%, ${ritual.accent}0a 100%)`,
              }}
            >
              <p className="font-sans text-[0.6rem] uppercase tracking-[0.28em] font-semibold mb-2" style={{ color: ritual.accent }}>
                {lang === 'FR' ? 'Votre rituel' : 'Your ritual'}
              </p>
              <h3 className="font-serif text-xl md:text-2xl text-ctext leading-snug">
                {lang === 'FR' ? ritual.titleFR : ritual.titleEN}
              </h3>
              <p className="mt-1 font-serif italic text-ctextSoft text-sm md:text-base">
                {lang === 'FR' ? ritual.subtitleFR : ritual.subtitleEN}
              </p>
              <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-espressoDeep/60 px-3.5 py-1.5 font-sans text-[0.58rem] uppercase tracking-[0.2em] text-ctextSoft">
                <Clock size={12} /> {lang === 'FR' ? ritual.momentFR : ritual.momentEN}
              </p>
              <ol className="mt-6 space-y-4">
                {(lang === 'FR' ? ritual.stepsFR : ritual.stepsEN).map((stepTxt, i) => (
                  <li key={i} className="flex gap-4">
                    <span
                      className="shrink-0 w-7 h-7 rounded-full grid place-items-center font-serif text-[0.8rem]"
                      style={{ backgroundColor: `${ritual.accent}2e`, color: ritual.accent }}
                    >
                      {i + 1}
                    </span>
                    <span className="flex-1 font-sans text-[0.92rem] leading-[1.75] text-ctextSoft">{stepTxt}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => addDoshaOil(result.dominant.name)}
              className="inline-flex items-center gap-3 rounded-full bg-brass px-9 py-4 font-sans text-[0.7rem] uppercase tracking-[0.16em] text-espressoDeep transition-colors hover:bg-brassBright min-h-[44px]"
            >
              {lang === 'FR' ? `Ajouter l'huile ${result.dominant.name}` : `Add ${result.dominant.name} oil`} <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/boutique/huiles-corporelles')}
              className="inline-flex items-center gap-2 rounded-full border border-ctextSoft/25 px-7 py-3.5 font-sans text-[0.68rem] uppercase tracking-[0.16em] text-ctextSoft transition-colors hover:border-brass hover:text-brass min-h-[44px]"
            >
              {lang === 'FR' ? 'Explorer la collection' : 'Explore the collection'}
            </button>
          </div>

          <div className="mt-10 pt-6 border-t border-ctextSoft/15">
            <button
              type="button"
              onClick={restart}
              className="inline-flex items-center gap-2 font-sans text-[0.62rem] uppercase tracking-[0.2em] text-ctextSoft/60 transition-colors hover:text-brass"
            >
              <RotateCcw size={13} /> {lang === 'FR' ? 'Refaire le quiz' : 'Retake the quiz'}
            </button>
          </div>
        </div>
      </Reveal>
    );
  }

  /* ── Écran teaser (toutes les questions répondues, pas encore sauvegardé) ── */
  if (!current && teaser) {
    return (
      <Reveal>
        <div className="rounded-[2rem] border border-brass/30 bg-espresso p-8 md:p-12 text-center shadow-[0_30px_80px_rgba(0,0,0,0.3)]">
          <p className="font-sans text-[0.62rem] uppercase tracking-[0.28em] text-brass">
            {lang === 'FR' ? 'Votre nature dominante' : 'Your dominant nature'}
          </p>
          <h2 className="mt-4 font-serif font-medium text-ctext leading-[1.0] text-[clamp(2.6rem,6vw,4.2rem)]">
            {teaser.dominant.name}
          </h2>

          <div className="mt-9 flex justify-center gap-10 md:gap-14">
            {ALL_DOSHAS.map(d => {
              const Icon = DOSHA_ICON[d];
              return (
                <div key={d} className="flex flex-col items-center gap-2">
                  <Icon size={18} className="text-brass" strokeWidth={1.6} />
                  <span className="font-serif text-2xl md:text-3xl text-brassBright tabular-nums">{teaser.percentages[d]}%</span>
                  <span className="font-sans text-[0.58rem] uppercase tracking-[0.22em] text-ctextSoft">{d}</span>
                </div>
              );
            })}
          </div>

          {teaser.dominant.elements && (
            <p className="mt-7 font-sans text-[0.62rem] uppercase tracking-[0.26em] text-ctextSoft/70">
              {teaser.dominant.elements}
            </p>
          )}

          <div className="mt-10 pt-8 border-t border-ctextSoft/15 max-w-[40rem] mx-auto">
            <p className="inline-flex items-center gap-2.5 font-sans text-[0.62rem] uppercase tracking-[0.24em] text-ctextSoft">
              <Lock size={13} className="text-brass" /> {lang === 'FR' ? 'Profil complet' : 'Full profile'}
            </p>
            <p className="mt-5 font-serif italic text-[clamp(1.05rem,1.9vw,1.35rem)] leading-relaxed text-ctextSoft max-w-[48ch] mx-auto">
              {user
                ? (lang === 'FR' ? 'Enregistrez votre résultat dans votre espace pour accéder à vos rituels et recommandations personnalisés.' : 'Save your result to your space to unlock your personalized rituals and recommendations.')
                : (lang === 'FR' ? 'Connectez-vous pour enregistrer votre profil et débloquer vos rituels personnalisés.' : 'Sign in to save your profile and unlock your personalized rituals.')}
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              {user ? (
                <button
                  type="button"
                  onClick={handleQuizCompute}
                  disabled={submitting}
                  className="inline-flex items-center gap-3 rounded-full bg-brass px-9 py-4 font-sans text-[0.7rem] uppercase tracking-[0.16em] text-espressoDeep transition-colors hover:bg-brassBright disabled:opacity-60 min-h-[44px]"
                >
                  {submitting
                    ? (lang === 'FR' ? 'Enregistrement…' : 'Saving…')
                    : <>{lang === 'FR' ? 'Enregistrer + voir le profil' : 'Save + reveal profile'} <ArrowRight size={16} /></>}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSignInOpen(true)}
                  className="inline-flex items-center gap-3 rounded-full bg-brass px-9 py-4 font-sans text-[0.7rem] uppercase tracking-[0.16em] text-espressoDeep transition-colors hover:bg-brassBright min-h-[44px]"
                >
                  {lang === 'FR' ? 'Se connecter pour sauvegarder' : 'Sign in to save'} <ArrowRight size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={restart}
                className="inline-flex items-center gap-2 rounded-full border border-ctextSoft/25 px-7 py-3.5 font-sans text-[0.68rem] uppercase tracking-[0.16em] text-ctextSoft transition-colors hover:border-brass hover:text-brass min-h-[44px]"
              >
                <RotateCcw size={13} /> {lang === 'FR' ? 'Recommencer' : 'Restart'}
              </button>
            </div>

            <p className="mt-6 font-sans text-[0.58rem] uppercase tracking-[0.18em] text-ctextSoft/50">
              {lang === 'FR' ? 'Vos résultats restent privés et sécurisés.' : 'Your results stay private and secure.'}
            </p>
          </div>
        </div>
      </Reveal>
    );
  }

  /* ── Écran question (par défaut) ── */
  return (
    <Reveal>
      {/* Progression */}
      <div className="flex items-center justify-between mb-5">
        <span className="font-sans text-[0.62rem] uppercase tracking-[0.2em] text-ctextSoft">
          {lang === 'FR' ? 'Question' : 'Question'} {Math.min(step + 1, QUIZ_DATA.length)} / {QUIZ_DATA.length}
        </span>
        <button
          type="button"
          onClick={restart}
          className="font-sans text-[0.62rem] uppercase tracking-[0.2em] text-ctextSoft transition-colors hover:text-brass"
        >
          {lang === 'FR' ? 'Recommencer' : 'Restart'}
        </button>
      </div>
      <div className="relative h-1 rounded-full bg-ctext/10 overflow-hidden mb-8">
        <div
          className="absolute inset-y-0 left-0 bg-brass rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${((step + (current ? 0 : 1)) / QUIZ_DATA.length) * 100}%` }}
        />
      </div>

      {current && (
        <div className="rounded-[2rem] border border-brass/20 bg-espresso p-6 md:p-10 shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
          <p className="font-sans text-[0.6rem] uppercase tracking-[0.26em] text-brass mb-4">
            {lang === 'FR' ? current.categoryFR : current.categoryEN}
          </p>
          <h3 className="font-serif font-medium text-ctext leading-snug text-[clamp(1.4rem,2.6vw,2.1rem)] mb-8 max-w-[32ch]">
            {lang === 'FR' ? current.questionFR : current.questionEN}
          </h3>
          <div className="space-y-3">
            {current.options.map((opt, idx) => {
              const isFlash = flashPick === opt.type;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePick(opt.type)}
                  disabled={!!flashPick}
                  className={`w-full text-left p-4 md:p-5 rounded-2xl border transition-all flex items-start gap-4 min-h-[44px] ${
                    isFlash
                      ? 'border-brass bg-brass/15 shadow-[0_10px_30px_rgba(187,154,94,0.22)]'
                      : 'border-ctextSoft/15 bg-espressoDeep/40 hover:border-brass/60 hover:bg-brass/10'
                  }`}
                >
                  <span className={`shrink-0 w-5 h-5 rounded-full border grid place-items-center mt-0.5 transition-colors ${
                    isFlash ? 'border-brass bg-brass text-espressoDeep' : 'border-ctextSoft/30'
                  }`}>
                    {isFlash && <Check size={11} />}
                  </span>
                  <span className="flex-1 font-sans text-[0.95rem] leading-relaxed text-ctextSoft">
                    {lang === 'FR' ? opt.fr : opt.en}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-7 pt-5 border-t border-ctextSoft/15 flex items-center justify-between">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0}
              className="inline-flex items-center gap-2 font-sans text-[0.62rem] uppercase tracking-[0.2em] text-ctextSoft transition-colors hover:text-brass disabled:opacity-30 disabled:hover:text-ctextSoft"
            >
              <ArrowLeft size={13} /> {lang === 'FR' ? 'Précédent' : 'Back'}
            </button>
            <span className="font-sans text-[0.58rem] uppercase tracking-[0.18em] text-ctextSoft/50">
              {lang === 'FR' ? 'Suivez votre premier réflexe' : 'Trust your first instinct'}
            </span>
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
  const t = CONTENT[lang];
  const ay = t.ayurveda;

  return (
    <div className="bg-cream text-ink font-sans antialiased">

      {/* ─────────── HERO (la promesse du quiz) ─────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-espressoDeep">
        <div className="pointer-events-none absolute -top-1/4 -left-1/4 h-[70%] w-[70%] rounded-full bg-forest/20 blur-[140px]" />
        <div className="pointer-events-none absolute -bottom-1/4 -right-1/5 h-[60%] w-[60%] rounded-full bg-brass/10 blur-[150px]" />
        <div className="relative z-10 mx-auto w-full max-w-[1280px] px-6 md:px-12 py-24 grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-16 items-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease }}>
            <p className="inline-flex items-center gap-2 font-sans text-[0.62rem] md:text-[0.7rem] uppercase tracking-[0.32em] text-brass mb-8">
              <Sparkles size={14} /> {lang === 'FR' ? 'Connaître votre nature' : 'Know your nature'}
            </p>
            <h1 className="font-serif font-medium text-ctext leading-[0.98] text-[clamp(2.4rem,5.2vw,4.4rem)] max-w-[14ch]">
              {lang === 'FR' ? 'Quiz Dosha' : 'Dosha Quiz'}
            </h1>
            <p className="mt-7 font-serif italic text-[clamp(1.3rem,2.8vw,2.1rem)] leading-snug text-ctextSoft max-w-[26ch]">
              {lang === 'FR'
                ? <>Dix questions pour révéler <span className="text-brassBright not-italic">votre dominance du moment.</span></>
                : <>Ten questions to reveal <span className="text-brassBright not-italic">your dominance of the moment.</span></>}
            </p>
            <div className="mt-12 flex flex-wrap items-center gap-6">
              <a
                href="#quiz"
                className="inline-flex items-center gap-3 rounded-full bg-brass px-8 py-3.5 font-sans text-[0.7rem] uppercase tracking-[0.18em] text-espressoDeep transition-colors duration-300 hover:bg-brassBright min-h-[44px]"
              >
                {lang === 'FR' ? 'Commencer le quiz' : 'Begin the quiz'} <ArrowRight size={16} />
              </a>
              <span className="font-sans text-[0.75rem] text-ctextSoft/70">
                {lang === 'FR' ? 'Gratuit · 3 minutes · Vata · Pitta · Kapha' : 'Free · 3 minutes · Vata · Pitta · Kapha'}
              </span>
            </div>
          </motion.div>

          {/* Disque éditorial — trois doshas en orbite (pas d'image externe) */}
          <motion.div
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease, delay: 0.15 }}
            className="relative hidden lg:flex items-center justify-center"
          >
            <div className="relative w-[380px] h-[380px] flex items-center justify-center">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 34, repeat: Infinity, ease: 'linear' }} className="absolute inset-[-4%] rounded-full border border-dashed border-brass/25" />
              <motion.div animate={{ rotate: -360 }} transition={{ duration: 48, repeat: Infinity, ease: 'linear' }} className="absolute inset-[12%] rounded-full border border-brass/15" />
              <div className="absolute inset-[22%] rounded-full bg-brass/10 blur-2xl" />
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: 'linear' }} className="absolute inset-0">
                <Wind className="absolute left-1/2 top-0 -translate-x-1/2 text-brassBright/80" size={30} strokeWidth={1.4} />
                <Flame className="absolute bottom-[8%] left-[16%] text-brassBright/80" size={30} strokeWidth={1.4} />
                <Leaf className="absolute bottom-[8%] right-[16%] text-brassBright/80" size={30} strokeWidth={1.4} />
              </motion.div>
              <Sparkles className="relative z-10 text-brassBright drop-shadow-[0_20px_45px_rgba(0,0,0,0.5)]" size={92} strokeWidth={1} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─────────── QU'EST-CE QUE L'AYURVEDA ─────────── */}
      <section className="relative bg-cream py-24 md:py-32 overflow-hidden">
        <Seam from="#16100a" />
        <div className="relative z-10 mx-auto w-full max-w-[900px] px-6 md:px-12 text-center">
          <Reveal>
            <Eyebrow>{lang === 'FR' ? 'La sagesse derrière le quiz' : 'The wisdom behind the quiz'}</Eyebrow>
            <SectionTitle className="mt-4">{ay.whatIsTitle}</SectionTitle>
            <div className="mt-5 h-px w-24 bg-brass mx-auto" />
            <p className="mt-7 font-serif italic text-[clamp(1.1rem,2vw,1.5rem)] leading-relaxed text-inkSoft max-w-[58ch] mx-auto">
              {ay.whatIsText}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ─────────── CE QUE VOUS OBTENEZ ─────────── */}
      <section className="bg-cream2 py-24 md:py-32">
        <div className="mx-auto w-full max-w-[1280px] px-6 md:px-12">
          <Reveal className="text-center mb-16">
            <Eyebrow>{lang === 'FR' ? 'Ce qui vous attend' : 'What you get'}</Eyebrow>
            <SectionTitle className="mt-4">
              {lang === 'FR' ? 'Un miroir, pas une étiquette' : 'A mirror, not a label'}
            </SectionTitle>
            <div className="mt-5 h-px w-24 bg-brass mx-auto" />
            <p className="mt-6 font-serif italic text-[clamp(1.05rem,1.9vw,1.4rem)] text-inkSoft max-w-[50ch] mx-auto">
              {lang === 'FR'
                ? "Dix questions, votre dominance du moment, et le rituel qui l'accompagne. Suivez votre premier réflexe."
                : 'Ten questions, your dominance of the moment, and the ritual that fits it. Trust your first instinct.'}
            </p>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6">
            {INSIDE.map((it, i) => (
              <Reveal key={it.n} delay={i * 0.08}>
                <div className="h-full rounded-3xl bg-card border-l-[3px] border-l-brass border-y border-r border-cream3 p-8 md:p-9 transition-shadow hover:shadow-xl">
                  <span className="font-serif text-brass text-3xl tabular-nums">{it.n}</span>
                  <h3 className="mt-4 font-serif text-xl md:text-2xl text-ink leading-snug">{lang === 'FR' ? it.titleFR : it.titleEN}</h3>
                  <p className="mt-3 font-sans text-[0.95rem] leading-[1.8] text-inkSoft">{lang === 'FR' ? it.bodyFR : it.bodyEN}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── LE QUIZ ─────────── */}
      <section id="quiz" className="relative bg-espressoSoft py-24 md:py-32 overflow-hidden">
        <Seam from="#ede5d7" />
        <div className="relative z-10 mx-auto w-full max-w-[820px] px-6 md:px-12">
          <Reveal className="text-center mb-12">
            <Eyebrow on="dark">{lang === 'FR' ? 'À vous de jouer' : 'Your turn'}</Eyebrow>
            <SectionTitle on="dark" className="mt-4">
              {lang === 'FR' ? 'Répondez en toute simplicité' : 'Answer, simply'}
            </SectionTitle>
            <p className="mt-5 font-serif italic text-[clamp(1.05rem,1.8vw,1.35rem)] text-ctextSoft max-w-[46ch] mx-auto">
              {lang === 'FR'
                ? "Il n'y a pas de mauvaise réponse, seulement la vôtre, ici et maintenant."
                : 'There is no wrong answer, only yours, here and now.'}
            </p>
          </Reveal>
          <Quiz lang={lang} />
        </div>
      </section>

      {/* ─────────── SIGNUP / CTA (NewsletterSignup, source="quiz") ─────────── */}
      <section className="bg-espressoDeep py-24 md:py-32">
        <div className="mx-auto w-full max-w-[760px] px-6 md:px-12 text-center">
          <Reveal>
            <Eyebrow on="dark">{lang === 'FR' ? 'Rester sur le fil' : 'Stay on the thread'}</Eyebrow>
            <SectionTitle on="dark" className="mt-4">
              {lang === 'FR' ? 'Le fil, à votre rythme' : 'The thread, at your pace'}
            </SectionTitle>
            <p className="mt-6 font-serif italic text-[clamp(1.05rem,1.9vw,1.4rem)] leading-relaxed text-ctextSoft max-w-[52ch] mx-auto">
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
      </section>

      {/* ─────────── CONTACT ─────────── */}
      <section className="bg-cream py-16 md:py-20 text-center">
        <a
          href="mailto:teamksl@inspiratanature.com"
          className="font-serif italic text-brassInk hover:text-brassBright transition-colors text-lg md:text-xl border-b border-brass/30 pb-1"
        >
          {lang === 'FR' ? 'Une question ? Écrivez à teamksl@inspiratanature.com' : 'A question? Write to teamksl@inspiratanature.com'}
        </a>
      </section>

    </div>
  );
};

export default QuizLoeuvre;
