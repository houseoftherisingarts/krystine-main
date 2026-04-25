import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { CONTENT } from '../content';
import { addDoshaQuizResult, updateMember } from '../firebase/firestore';
import { points } from '../firebase/points';
import { getProducts, formatMoney, isShopifyConfigured, type ShopifyProduct } from '../shopify';
import { findOilForDosha } from '../lib/shopifyOil';
import { RITUALS } from '../lib/doshaRituals';
import AyurvedaIkigai from '../components/AyurvedaIkigai';

// ─── Quiz data ────────────────────────────────────────────────────────────────
// 10 dimensions from "Expérience Origine — Semaine préparatoire". For each
// dimension the user picks the Vata/Pitta/Kapha statement that represents them
// the most (+5) and the one that represents them the least (+1) — the third
// option picks up +3 automatically. Each question therefore contributes 9
// points, 10 questions total = 90 points. Percentages are stored to Firestore.

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
  // Order is always [Vata, Pitta, Kapha] — keeps rendering predictable.
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

// One answer per question — the dosha the user picked, or null if they
// haven't answered yet. Total score equals the number of answered questions;
// percentages are computed from that total.
const scoresFromPicks = (picks: (DoshaType | null)[]) => {
  const s = { vata: 0, pitta: 0, kapha: 0 };
  for (const p of picks) if (p) s[p] += 1;
  return s;
};

// ─── Component ───────────────────────────────────────────────────────────────
const QuizPage: React.FC = () => {
  const { lang, addToCart, user, member, setSignInOpen } = useApp();
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
  const [selectedDosha, setSelectedDosha] = useState<any>(null);
  const [quizState, setQuizState] = useState({
    isOpen: false,
    step: 0,
    // One answer per question — the selected dosha, or null if unanswered.
    picks: Array<DoshaType | null>(QUIZ_DATA.length).fill(null),
    // Tracks the just-tapped option so we can briefly highlight before
    // advancing to the next question.
    flashPick: null as DoshaType | null,
    teaser: null as null | { dominant: any; percentages: { vata: number; pitta: number; kapha: number } },
    result: null as any,
  });
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
    if (quizState.flashPick) return; // ignore double-clicks during the reveal
    setQuizState(qs => ({ ...qs, flashPick: type }));
    setTimeout(() => {
      setQuizState(qs => {
        const nextPicks = [...qs.picks];
        nextPicks[qs.step] = type;
        const nextStep = qs.step + 1;
        const done = nextStep >= QUIZ_DATA.length;
        const teaser = done ? computeTeaser(scoresFromPicks(nextPicks)) : qs.teaser;
        return {
          ...qs,
          picks: nextPicks,
          step: nextStep,
          flashPick: null,
          teaser,
        };
      });
    }, 260);
  };

  const goBack = () => {
    setQuizState(qs => {
      if (qs.step === 0) return qs;
      const prevStep = qs.step - 1;
      const nextPicks = [...qs.picks];
      nextPicks[prevStep] = null;
      return {
        ...qs,
        step: prevStep,
        picks: nextPicks,
        flashPick: null,
        teaser: null,
      };
    });
  };

  const restart = () => setQuizState(qs => ({
    ...qs,
    step: 0,
    picks: Array<DoshaType | null>(QUIZ_DATA.length).fill(null),
    flashPick: null,
    teaser: null,
    result: null,
  }));

  const handleQuizCompute = async () => {
    if (!user) { setSignInOpen(true); return; }
    const { dominant, percentages } = quizState.teaser ?? computeTeaser(scoresFromPicks(quizState.picks));
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
    setQuizState(qs => ({ ...qs, result: { dominant, percentages } }));
  };

  // Auto-resume the save step if the user signs in while the quiz is paused.
  useEffect(() => {
    if (user && quizState.isOpen && quizState.step >= QUIZ_DATA.length && !quizState.result && !submitting) {
      handleQuizCompute();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, quizState.step, quizState.isOpen]);

  const openQuiz = () => setQuizState({
    isOpen: true,
    step: 0,
    picks: Array<DoshaType | null>(QUIZ_DATA.length).fill(null),
    flashPick: null,
    teaser: null,
    result: null,
  });

  return (
    <div className="min-h-screen dark:bg-[#2E1A14] text-[#3A251E] dark:text-white pt-36 pb-24">
      <div className="max-w-[1800px] mx-auto px-4 md:px-12">

        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-[#B8532F] uppercase tracking-[0.3em] text-xs font-bold block mb-4">
            {lang === 'FR' ? 'Connaître votre nature' : 'Know your nature'}
          </span>
          <h1 className="text-5xl md:text-7xl font-serif uppercase tracking-widest leading-none">
            {lang === 'FR' ? 'Quiz Dosha' : 'Dosha Quiz'}
          </h1>
          <div className="w-24 h-1 bg-[#B8532F] mt-6 mx-auto" />
        </div>

        {/* What is Ayurveda — intro block */}
        <div className="text-center mb-16 max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-serif mb-6 tracking-wide">{ay.whatIsTitle}</h2>
          <p className="text-[#3A251E]/80 dark:text-white/80 font-serif text-lg md:text-2xl leading-relaxed italic max-w-4xl mx-auto">{ay.whatIsText}</p>
          <div className="w-16 h-1 bg-[#B8532F] mx-auto mt-8" />
        </div>

        {/* Ikigai + info */}
        <div className="flex flex-col lg:flex-row items-center justify-center w-full gap-10 lg:gap-16 xl:gap-24 mb-16 px-4">
          <div className="relative flex items-center justify-center flex-shrink-0 lg:w-auto xl:w-1/2">
            <AyurvedaIkigai doshas={ay.doshas} onDoshaClick={setSelectedDosha} onQuizClick={openQuiz} lang={lang} filterId="page" />
            {selectedDosha && (
              <div className="absolute z-30 inset-0 flex items-center justify-center">
                <div className="bg-white dark:bg-[#3A251E] p-8 rounded-[30px] shadow-2xl max-w-xs md:max-w-sm text-center relative border border-[#B8532F]/20">
                  <button onClick={() => setSelectedDosha(null)} className="absolute top-3 right-4 text-[#3A251E]/40 dark:text-white/40 hover:text-[#3A251E] text-2xl">×</button>
                  <h3 className="text-3xl font-serif font-bold mb-2 text-[#B8532F]">{selectedDosha.name}</h3>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#3A251E]/50 dark:text-white/50 mb-4">{selectedDosha.elements}</p>
                  <div className="w-12 h-px bg-[#B8532F]/30 mx-auto mb-4" />
                  <p className="text-[#3A251E]/80 dark:text-white/80 text-sm leading-relaxed mb-4">{selectedDosha.definition}</p>
                  <p className="text-[#B8532F] font-serif italic">{selectedDosha.action}</p>
                  <div className="mt-6 pt-4 border-t border-[#3A251E]/10">
                    <button
                      onClick={() => { addDoshaOil(selectedDosha.name); setSelectedDosha(null); }}
                      className="w-full bg-[#3A251E] dark:bg-[#B8532F] text-white dark:text-[#3A251E] py-2 rounded-full text-xs font-bold uppercase hover:bg-[#B8532F] hover:text-[#3A251E] transition-colors shadow-md"
                    >
                      {lang === 'FR' ? 'Ajouter' : 'Add'} {selectedDosha.productRecom}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:w-1/2 text-center lg:text-left max-w-xl">
            <span className="text-[#B8532F] uppercase tracking-[0.2em] text-xs font-semibold block mb-2">{ay.introTitle}</span>
            <h3 className="text-3xl md:text-5xl font-serif mb-6">{ay.title}</h3>
            <p className="text-[#3A251E]/70 dark:text-white/70 font-serif text-lg leading-relaxed mb-6 italic">{ay.introText}</p>
            <div className="bg-white dark:bg-[#3A251E]/60 border border-[#3A251E]/5 dark:border-white/5 p-8 rounded-[24px] shadow-lg mb-8">
              <p className="text-[#3A251E]/80 dark:text-white/80 leading-relaxed mb-4 font-medium">{ay.desc}</p>
              <p className="text-[#3A251E] dark:text-white font-bold">{ay.quizPrompt}</p>
            </div>
            <button
              onClick={openQuiz}
              className="inline-block bg-[#3A251E] dark:bg-[#B8532F] text-white dark:text-[#3A251E] px-10 py-4 rounded-full font-bold uppercase tracking-widest text-sm shadow-lg hover:bg-[#B8532F] hover:text-[#3A251E] transition-colors"
            >
              {ay.quizBtn}
            </button>
          </div>
        </div>
      </div>

      {/* ── Quiz Modal ── */}
      {quizState.isOpen && (() => {
        const q = quizState.step < QUIZ_DATA.length ? QUIZ_DATA[quizState.step] : null;
        return (
        <div className="fixed inset-0 z-50 bg-[#3A251E]/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#3A251E] w-full max-w-2xl rounded-[30px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-[#3A251E]/10 dark:border-white/10 flex justify-between items-center bg-[#F4E7DD] dark:bg-white/5">
              <div>
                <h3 className="font-serif text-2xl">Dosha Quiz</h3>
                <p className="text-xs text-[#B8532F] uppercase tracking-widest font-bold mt-1">
                  {quizState.result
                    ? (lang === 'FR' ? 'Résultats' : 'Results')
                    : q
                      ? `${lang === 'FR' ? 'Question' : 'Question'} ${quizState.step + 1} / ${QUIZ_DATA.length}`
                      : (lang === 'FR' ? 'Finalisation' : 'Finalizing')}
                </p>
              </div>
              <button onClick={() => setQuizState({ ...quizState, isOpen: false, result: null })} className="text-[#3A251E]/40 hover:text-[#3A251E] dark:text-white/40 dark:hover:text-white">
                <i className="fa-solid fa-times text-xl" />
              </button>
            </div>
            {!quizState.result && (
              <div className="w-full h-1 bg-[#3A251E]/5">
                <div className="h-full bg-[#B8532F] transition-all duration-500" style={{ width: `${((quizState.step + (q ? 0 : 1)) / QUIZ_DATA.length) * 100}%` }} />
              </div>
            )}
            <div className="p-6 md:p-8 overflow-y-auto flex-1">
              {!quizState.result ? (
                q ? (
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#B8532F] mb-3">
                      {lang === 'FR' ? q.categoryFR : q.categoryEN}
                    </p>
                    <h4 className="text-xl md:text-2xl font-serif mb-6 leading-snug">
                      {lang === 'FR' ? q.questionFR : q.questionEN}
                    </h4>

                    <div className="space-y-3">
                      {q.options.map((opt, idx) => {
                        const isFlash = quizState.flashPick === opt.type;
                        const stateClass = isFlash
                          ? 'border-[#B8532F] bg-[#B8532F]/10 shadow-[0_4px_18px_rgba(184,83,47,0.25)]'
                          : 'border-[#3A251E]/10 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:border-[#B8532F] hover:bg-[#B8532F]/5';
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handlePick(opt.type)}
                            className={`w-full text-left p-4 rounded-xl border transition-all shadow-sm flex items-start gap-4 ${stateClass}`}
                          >
                            <div className={`shrink-0 w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 transition-colors ${
                              isFlash ? 'border-[#B8532F] bg-[#B8532F]' : 'border-[#3A251E]/20 dark:border-white/20'
                            }`}>
                              {isFlash && <i className="fa-solid fa-check text-[#3A251E] text-[9px]" />}
                            </div>
                            <span className="block text-[#3A251E]/85 dark:text-white/85 text-sm leading-relaxed flex-1">
                              {lang === 'FR' ? opt.fr : opt.en}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Nav — small Back / Restart controls for a 10-question flow. */}
                    <div className="mt-6 flex items-center justify-between text-[10px] uppercase tracking-widest font-bold">
                      <button
                        type="button"
                        onClick={goBack}
                        disabled={quizState.step === 0}
                        className="text-[#3A251E]/50 dark:text-white/50 hover:text-[#B8532F] disabled:opacity-30 disabled:hover:text-inherit transition-colors"
                      >
                        <i className="fa-solid fa-arrow-left mr-1" /> {lang === 'FR' ? 'Précédent' : 'Back'}
                      </button>
                      <button
                        type="button"
                        onClick={restart}
                        className="text-[#3A251E]/40 dark:text-white/40 hover:text-[#B8532F] transition-colors"
                      >
                        {lang === 'FR' ? 'Recommencer' : 'Restart'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center max-w-md mx-auto py-4">
                    <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#B8532F] mb-3">
                      {lang === 'FR' ? 'Votre nature dominante' : 'Your dominant nature'}
                    </p>
                    <h2 className="text-5xl font-serif font-bold text-[#B8532F] mb-4">{quizState.teaser?.dominant.name}</h2>
                    {quizState.teaser && (
                      <div className="flex justify-center gap-8 mb-6 text-sm text-[#3A251E]/70 dark:text-white/70">
                        {ALL_DOSHAS.map(d => (
                          <div key={d} className="flex flex-col items-center">
                            <span className="font-bold text-[#B8532F] text-lg">{quizState.teaser!.percentages[d]}%</span>
                            <span className="capitalize text-xs uppercase tracking-widest">{d}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {quizState.teaser?.dominant.elements && (
                      <p className="text-xs uppercase tracking-[0.2em] font-bold text-[#3A251E]/50 dark:text-white/50 mb-6">{quizState.teaser.dominant.elements}</p>
                    )}
                    <div className="border-t border-[#3A251E]/10 dark:border-white/10 pt-6 mt-6">
                      <div className="flex items-center gap-3 mb-4 justify-center">
                        <i className="fa-solid fa-lock text-[#B8532F] text-sm" />
                        <span className="text-xs uppercase tracking-[0.25em] font-bold text-[#3A251E]/70 dark:text-white/70">{lang === 'FR' ? 'Profil complet' : 'Full profile'}</span>
                      </div>
                      <p className="text-[#3A251E]/60 dark:text-white/60 mb-6 text-sm leading-relaxed">
                        {user
                          ? (lang === 'FR' ? 'Enregistrez votre résultat dans votre espace client pour accéder aux rituels et recommandations personnalisés.' : 'Save your result to your client space to unlock personalized rituals and recommendations.')
                          : (lang === 'FR' ? 'Connectez-vous pour enregistrer votre profil et débloquer vos rituels personnalisés.' : 'Sign in to save your profile and unlock your personalized rituals.')}
                      </p>
                      {user ? (
                        <button onClick={handleQuizCompute} disabled={submitting}
                          className="w-full bg-[#3A251E] dark:bg-[#B8532F] text-white dark:text-[#3A251E] py-4 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-[#B8532F] hover:text-[#3A251E] transition-colors shadow-lg flex items-center justify-center gap-2">
                          {submitting
                            ? <><i className="fa-solid fa-circle-notch fa-spin" /> {lang === 'FR' ? 'Enregistrement…' : 'Saving…'}</>
                            : <>{lang === 'FR' ? 'Enregistrer + voir le profil complet' : 'Save + reveal full profile'} <i className="fa-solid fa-arrow-right text-[10px]" /></>}
                        </button>
                      ) : (
                        <button onClick={() => setSignInOpen(true)}
                          className="w-full bg-[#3A251E] dark:bg-[#B8532F] text-white dark:text-[#3A251E] py-4 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-[#B8532F] hover:text-[#3A251E] transition-colors shadow-lg flex items-center justify-center gap-2">
                          <i className="fa-solid fa-user text-sm" />
                          {lang === 'FR' ? 'Se connecter pour sauvegarder et avoir des rituels associés' : 'Sign in to save and unlock associated rituals'}
                        </button>
                      )}
                      <p className="mt-4 text-[10px] uppercase tracking-widest text-[#3A251E]/40 dark:text-white/40">
                        {lang === 'FR' ? 'Vos résultats restent privés et sécurisés.' : 'Your results stay private and secure.'}
                      </p>
                    </div>
                  </div>
                )
              ) : (
                <div className="text-center">
                  <p className="font-serif text-xl italic text-[#3A251E]/60 dark:text-white/60 mb-2">{lang === 'FR' ? `Votre nature dominante est :` : `Your dominant nature is:`}</p>
                  <h2 className="text-5xl font-serif font-bold mb-6 text-[#B8532F]">{quizState.result.dominant.name}</h2>
                  <div className="flex justify-center gap-8 mb-8 text-sm text-[#3A251E]/70 dark:text-white/70">
                    {ALL_DOSHAS.map(d => (
                      <div key={d} className="flex flex-col items-center">
                        <span className="font-bold text-[#B8532F]">{quizState.result.percentages[d]}%</span>
                        <span className="capitalize">{d}</span>
                      </div>
                    ))}
                  </div>
                  <div className="max-w-md mx-auto mb-8 bg-[#F4E7DD] dark:bg-white/5 p-6 rounded-xl border border-[#3A251E]/5">
                    <p className="text-[#3A251E]/80 dark:text-white/80 italic leading-relaxed">{quizState.result.dominant.definition}</p>
                  </div>

                  {/* Ritual matched to the dominant dosha. Transcribed from
                      Krystine's "Guide Rituels — Partie 1". Accent color
                      borrowed from the dosha palette so the card reads as
                      thematic guidance, not a generic product slab. */}
                  {(() => {
                    const ritual = RITUALS[quizState.result.dominant.name as 'Vata' | 'Pitta' | 'Kapha'];
                    if (!ritual) return null;
                    return (
                      <div
                        className="max-w-md mx-auto mb-8 rounded-[20px] p-6 md:p-7 border text-left"
                        style={{
                          borderColor: `${ritual.accent}55`,
                          background: `linear-gradient(135deg, ${ritual.accent}18 0%, ${ritual.accent}08 100%)`,
                        }}
                      >
                        <p className="text-[10px] uppercase tracking-[0.3em] font-bold mb-2" style={{ color: ritual.accent }}>
                          {lang === 'FR' ? 'Votre rituel' : 'Your ritual'}
                        </p>
                        <h3 className="font-serif text-xl md:text-2xl text-[#3A251E] dark:text-white mb-1">
                          {lang === 'FR' ? ritual.titleFR : ritual.titleEN}
                        </h3>
                        <p className="font-serif italic text-[#3A251E]/75 dark:text-white/75 text-sm md:text-base mb-3">
                          {lang === 'FR' ? ritual.subtitleFR : ritual.subtitleEN}
                        </p>
                        <p className="inline-block text-[10px] uppercase tracking-[0.25em] font-bold px-3 py-1 rounded-full bg-white/60 dark:bg-white/10 text-[#3A251E]/70 dark:text-white/70 mb-5">
                          <i className="fa-regular fa-clock mr-1.5" />
                          {lang === 'FR' ? ritual.momentFR : ritual.momentEN}
                        </p>
                        <ol className="space-y-3 text-sm text-[#3A251E]/85 dark:text-white/85 leading-relaxed">
                          {(lang === 'FR' ? ritual.stepsFR : ritual.stepsEN).map((step, i) => (
                            <li key={i} className="flex gap-3">
                              <span
                                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold font-serif"
                                style={{ backgroundColor: `${ritual.accent}22`, color: ritual.accent }}
                              >
                                {i + 1}
                              </span>
                              <span className="flex-1">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    );
                  })()}

                  <button onClick={() => { addDoshaOil(quizState.result.dominant.name); setQuizState({ ...quizState, isOpen: false, result: null }); }}
                    className="w-full bg-[#B8532F] text-[#3A251E] py-3 rounded-full uppercase tracking-widest text-xs font-bold hover:bg-[#3A251E] hover:text-white transition-colors shadow-lg mb-4 max-w-sm mx-auto block">
                    {lang === 'FR' ? `Ajouter l'huile ${quizState.result.dominant.name}` : `Add ${quizState.result.dominant.name} oil`}
                  </button>
                  <button onClick={() => setQuizState({ ...quizState, isOpen: false, result: null })} className="text-[#3A251E]/50 dark:text-white/50 uppercase tracking-widest text-xs font-bold hover:text-[#B8532F] transition-colors">
                    {lang === 'FR' ? 'Fermer et explorer le site' : 'Close and explore the site'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
};

export default QuizPage;
