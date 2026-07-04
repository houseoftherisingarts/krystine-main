import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  motion, AnimatePresence, useReducedMotion, useScroll, useTransform,
} from 'framer-motion';
import {
  Compass, ArrowRight, ArrowLeft, ArrowDown, Check, ArrowCounterClockwise,
  Headphones, Target, BookOpen,
} from '@phosphor-icons/react';
import { useApp } from '../contexts/AppContext';
import {
  GUIDE_QUESTIONS, computeRecommendation,
  type GuideAnswer, type GuideRecommendation,
} from '../lib/guideEngine';
import { goToRoute } from '../lib/staticRoutes';
import { addGuideResponse } from '../firebase/firestore';
import NewsletterSignup from '../components/NewsletterSignup';
import { Atmosphere } from '../components/motion/loeuvre';

/**
 * Laissez-vous guider, langage V2 « magazine crème » (Fraunces + Inter,
 * crème #f4efe6, filets laiton, carte vedette accentuée pour la porte).
 * Garde 100 % de la logique du routeur de recommandation (guideEngine +
 * addGuideResponse) et branche le vrai NewsletterSignup (source="guide").
 * Motion : questions en slide+fade (AnimatePresence), filet de progression
 * qui se trace (scaleX), résultat révélé en rideau (clip-path), médaillon
 * qui éclot (spring), mot Fraunces en profondeur (parallax).
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

/* Révélation en rideau (clip-path de haut en bas) pour la carte résultat */
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

/* Mot Fraunces géant qui glisse en profondeur derrière la carte du test */
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

/* ════════════════════════ Données éditoriales (statiques) ════════════════════════ */

// "Ce que vous obtenez" : décrit honnêtement le routeur (5 questions, un seul
// chemin proposé, et l'éventail réel des destinations tirées de guideEngine).
const INSIDE = [
  {
    n: '01',
    title: 'Cinq questions, pas une de plus',
    body: "Votre intention, votre lien avec Krystine, le temps que vous pouvez vraiment offrir, votre saison intérieure et le format qui vous appelle. Cinq lectures du corps et de l'instant, rien de plus.",
  },
  {
    n: '02',
    title: 'Un seul chemin, le vôtre',
    body: "Pas de catalogue à éplucher. À la fin, une seule porte s'ouvre : celle qui correspond à là où vous êtes maintenant. Si le signal est doux, on vous propose un premier pas doux.",
  },
  {
    n: '03',
    title: 'Du podcast gratuit au parcours signature',
    body: "Le podcast, le Quiz Dosha, les Premiers Rituels, la collection Sérénité, la Bibliothèque, les programmes saisonniers, l'Expérience Origine ou les événements en personne. La destination juste, jamais la plus chère par défaut.",
  },
];

/* ════════════════════════ Carte résultat · vedette pleine largeur ════════════════════════ */

const ResultCard: React.FC<{
  rec: GuideRecommendation;
  lang: 'FR' | 'EN';
  onPrimary: () => void;
  onRestart: () => void;
}> = ({ rec, lang, onPrimary, onRestart }) => {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const goSecondary = () => {
    if (!rec.secondaryHref) return;
    goToRoute(navigate, rec.secondaryHref);
  };
  return (
    <Curtain>
      <div
        className="relative border overflow-hidden"
        style={{
          borderColor: `${rec.accent}66`,
          background: `linear-gradient(0deg, ${rec.accent}14, ${rec.accent}14), #faf6ee`,
        }}
      >
        <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: rec.accent }} />
        <div className="grid lg:grid-cols-[0.4fr_0.6fr]">
          {/* La porte : médaillon qui éclot + eyebrow */}
          <div className="flex flex-col items-center justify-center text-center p-[clamp(2rem,4.5vw,3.75rem)] lg:border-r" style={{ borderColor: `${rec.accent}2e` }}>
            <motion.span
              className="grid place-items-center w-20 h-20 rounded-full text-[#faf6ee] will-change-transform"
              style={{ background: rec.accent }}
              initial={reduce ? false : { scale: 0, rotate: -12 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ ...SPRING, delay: 0.3 }}
            >
              <i className={`fa-solid ${rec.icon || 'fa-compass'} text-2xl`} aria-hidden />
            </motion.span>
            <p className="mt-7 text-[0.68rem] uppercase tracking-[0.32em] text-[#7d6330]">
              {lang === 'FR' ? 'Votre porte' : 'Your door'}
            </p>
            <p className="mt-3 v2-serif italic font-light text-[clamp(1.05rem,1.7vw,1.3rem)] text-[#3a2f23] max-w-[26ch]">
              {lang === 'FR' ? rec.eyebrowFR : rec.eyebrowEN}
            </p>
          </div>

          {/* La recommandation */}
          <div className="p-[clamp(2rem,4.5vw,3.75rem)] flex flex-col justify-center">
            <h2 className="v2-serif font-light text-[#1c1712] leading-[1.0] text-[clamp(2.2rem,4.6vw,3.6rem)]">
              {lang === 'FR' ? rec.titleFR : rec.titleEN}
            </h2>
            <DrawRule className="mt-6 w-16" color={rec.accent} delay={0.4} />
            <p className="mt-6 v2-serif italic font-light text-[clamp(1.1rem,1.9vw,1.45rem)] leading-relaxed text-[#3a2f23] max-w-[54ch]">
              {lang === 'FR' ? rec.blurbFR : rec.blurbEN}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
              <button
                type="button"
                onClick={onPrimary}
                className="inline-flex items-center gap-3 bg-[#1c1712] px-8 py-4 text-[0.7rem] uppercase tracking-[0.18em] text-[#f4efe6] transition-colors duration-300 hover:bg-[#9c7a44] min-h-[44px]"
              >
                {lang === 'FR' ? rec.ctaFR : rec.ctaEN} <ArrowRight size={15} weight="regular" />
              </button>
              {rec.secondaryHref && (
                <button
                  type="button"
                  onClick={goSecondary}
                  className="group inline-flex items-center gap-2.5 text-[0.7rem] uppercase tracking-[0.2em] text-[#1c1712] border-b border-[#1c1712] pb-1.5 transition-colors duration-300 hover:text-[#7d6330] hover:border-[#9c7a44] min-h-[44px]"
                >
                  {lang === 'FR' ? rec.secondaryCtaFR : rec.secondaryCtaEN}
                  <ArrowRight size={14} weight="regular" className="transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              )}
            </div>
            <div className="mt-8 pt-6 border-t border-[#1c1712]/10">
              <button
                type="button"
                onClick={onRestart}
                className="inline-flex items-center gap-2 text-[0.62rem] uppercase tracking-[0.2em] text-[#1c1712]/55 transition-colors hover:text-[#7d6330] min-h-[44px]"
              >
                <ArrowCounterClockwise size={13} weight="light" /> {lang === 'FR' ? 'Refaire le test' : 'Retake the quiz'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Curtain>
  );
};

/* ════════════════════════ Le routeur (carte question + progression) ════════════════════════ */

const Router: React.FC<{ lang: 'FR' | 'EN' }> = ({ lang }) => {
  const { user, member } = useApp();
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<GuideAnswer[]>([]);
  const [flashOption, setFlashOption] = useState<string | null>(null);
  const [result, setResult] = useState<GuideRecommendation | null>(null);

  const total = GUIDE_QUESTIONS.length;
  const current = step < total ? GUIDE_QUESTIONS[step] : null;

  const handlePick = (optionId: string) => {
    if (flashOption || !current) return;
    setFlashOption(optionId);
    setTimeout(() => {
      const nextAnswers: GuideAnswer[] = [...answers, { qid: current.id, optionId }];
      setAnswers(nextAnswers);
      setFlashOption(null);
      const nextStep = step + 1;
      if (nextStep >= total) {
        const rec = computeRecommendation(nextAnswers);
        setResult(rec);
        // Persist to the CRM. When signed in we stamp uid + email so the
        // response appears on the client portal and in the admin overlay.
        // Anonymous submissions still land in `guideResponses` for aggregate
        // analysis. Logic preserved verbatim from the original page.
        const fullName = (member?.displayName || user?.displayName || '').trim();
        const [firstName, ...rest] = fullName ? fullName.split(/\s+/) : [''];
        const lastName = rest.join(' ');
        const denormalized = nextAnswers.map(a => {
          const q = GUIDE_QUESTIONS.find(qq => qq.id === a.qid);
          const opt = q?.options.find(o => o.id === a.optionId);
          return { qid: a.qid, optionId: a.optionId, questionLabel: q?.fr, optionLabel: opt?.fr };
        });
        addGuideResponse({
          uid: user?.uid,
          email: user?.email || undefined,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          answers: denormalized,
          recommendationId: rec.id,
          recommendationLabel: rec.titleFR,
          tags: ['guide', `rec-${rec.id}`],
        }).catch(() => { /* non-fatal, user still sees their result */ });
      } else {
        setStep(nextStep);
      }
    }, 280);
  };

  const goBack = () => {
    if (step === 0) return;
    setAnswers(prev => prev.slice(0, -1));
    setStep(step - 1);
    setResult(null);
    setFlashOption(null);
  };

  const restart = () => {
    setStep(0);
    setAnswers([]);
    setResult(null);
    setFlashOption(null);
  };

  const goToResult = (rec: GuideRecommendation) => goToRoute(navigate, rec.href);

  if (result) {
    return <ResultCard rec={result} lang={lang} onPrimary={() => goToResult(result)} onRestart={restart} />;
  }

  return (
    <Reveal className="max-w-[860px] mx-auto">
      {/* Progression : le filet laiton se trace au fil des réponses */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[0.62rem] uppercase tracking-[0.22em] text-[#1c1712]/60">
          {lang === 'FR' ? 'Question' : 'Question'} {step + 1} / {total}
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
          animate={{ scaleX: (step + 1) / total }}
          transition={{ duration: 0.6, ease }}
        />
      </div>

      {/* Carte question : crème encadrée filet laiton, slide+fade entre questions */}
      {current && (
        <div className="relative border border-[#9c7a44]/35 bg-[#faf6ee] overflow-hidden">
          <span
            aria-hidden
            className="absolute -top-px -left-px bg-[#1c1712] text-[#f4efe6] px-3 py-1.5 text-[0.56rem] uppercase tracking-[0.24em] z-10"
          >
            {lang === 'FR' ? current.kickerFR : current.kickerEN}
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
              <h3 className="v2-serif font-light text-[#1c1712] leading-[1.08] text-[clamp(1.6rem,3vw,2.4rem)] max-w-[28ch]">
                {lang === 'FR' ? current.fr : current.en}
              </h3>

              {/* Choix en rangées éditoriales indexées 01/02/03 */}
              <div className="mt-9">
                {current.options.map((opt, idx) => {
                  const isFlash = flashOption === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handlePick(opt.id)}
                      disabled={!!flashOption}
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
                  {lang === 'FR' ? 'Sans inscription' : 'No sign-up needed'}
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

const GuideLoeuvre: React.FC = () => {
  const { lang } = useApp();
  const reduce = useReducedMotion();

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
          <span>N&deg; 06 &middot; Laissez-vous guider</span>
          <span className="hidden sm:inline">Québec &middot; MMXXVI</span>
        </motion.div>

        <div className="flex-1 grid items-center gap-x-[clamp(2rem,5vw,5rem)] gap-y-10 lg:grid-cols-[1.1fr_0.9fr] mt-[clamp(2rem,5vh,4rem)]">
          {/* Masthead + promesse */}
          <div>
            <motion.div {...heroFade(0.1)}>
              <Kicker className="mb-7">{lang === 'FR' ? 'Laissez-vous guider' : 'Let yourself be guided'}</Kicker>
            </motion.div>
            <h1 className="v2-serif font-light leading-[0.94] text-[#1c1712] text-[clamp(3rem,8.5vw,7.5rem)]">
              <span className="block overflow-hidden">
                <motion.span
                  className="block will-change-transform"
                  initial={reduce ? false : { y: '112%' }}
                  animate={{ y: '0%' }}
                  transition={{ duration: 1.2, ease, delay: 0.15 }}
                >
                  {lang === 'FR' ? 'Par où' : 'Where'}
                </motion.span>
              </span>
              <span className="block overflow-hidden">
                <motion.span
                  className="block italic will-change-transform"
                  initial={reduce ? false : { y: '112%' }}
                  animate={{ y: '0%' }}
                  transition={{ duration: 1.2, ease, delay: 0.28 }}
                >
                  {lang === 'FR' ? 'commencer ?' : 'to start?'}
                </motion.span>
              </span>
            </h1>
            <motion.p
              {...heroFade(0.45)}
              className="mt-7 v2-serif italic font-light text-[clamp(1.35rem,2.6vw,2rem)] leading-[1.3] text-[#3a2f23] max-w-[26ch]"
            >
              {lang === 'FR'
                ? <>Cinq questions pour trouver <span className="not-italic text-[#1c1712]">votre seule prochaine porte.</span></>
                : <>Five questions to find <span className="not-italic text-[#1c1712]">your one next door.</span></>}
            </motion.p>
            <motion.div {...heroFade(0.6)} className="mt-11 flex flex-wrap items-center gap-x-9 gap-y-4">
              <a
                href="#guide"
                className="group inline-flex items-center gap-2.5 text-[0.72rem] uppercase tracking-[0.2em] text-[#1c1712] border-b border-[#1c1712] pb-1.5 transition-colors duration-300 hover:text-[#7d6330] hover:border-[#9c7a44] min-h-[44px]"
              >
                {lang === 'FR' ? 'Commencer le test' : 'Begin the quiz'}
                <ArrowDown size={15} weight="regular" className="transition-transform duration-300 group-hover:translate-y-0.5" />
              </a>
              <span className="text-[0.62rem] uppercase tracking-[0.2em] text-[#1c1712]/55">
                {lang === 'FR' ? 'Gratuit · sans inscription · 2 minutes' : 'Free · no sign-up · 2 minutes'}
              </span>
            </motion.div>
          </div>

          {/* Panneau encadré : sommaire des cinq questions */}
          <motion.div {...heroFade(0.35)} className="relative hidden lg:block self-center">
            <span className="pointer-events-none absolute -inset-2 border border-[#9c7a44]/35" aria-hidden />
            <div className="relative bg-[#faf6ee] px-9 py-3">
              {GUIDE_QUESTIONS.map((q, i) => (
                <div key={q.id} className={`flex items-baseline gap-5 py-4.5 ${i > 0 ? 'border-t border-[#1c1712]/10' : ''}`} style={{ paddingTop: '1.1rem', paddingBottom: '1.1rem' }}>
                  <span className="v2-serif text-[1.05rem] tabular-nums text-[#7d6330]">0{i + 1}</span>
                  <span className="v2-serif font-light text-[1.2rem] text-[#1c1712]">
                    {lang === 'FR' ? q.kickerFR : q.kickerEN}
                  </span>
                </div>
              ))}
            </div>
            <span className="absolute -top-2 -left-2 bg-[#1c1712] text-[#f4efe6] px-3 py-1.5 text-[0.58rem] uppercase tracking-[0.24em]">
              {lang === 'FR' ? 'Sommaire' : 'Contents'}
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
          <span className="hidden sm:inline">{lang === 'FR' ? 'Une seule porte à la fois' : 'One door at a time'}</span>
        </motion.div>
      </section>

      {/* ─────────── CE QUE VOUS OBTENEZ · cascade indexée + destinations ─────────── */}
      <section className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(5rem,12vh,9rem)] bg-[#efe6d7]">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-x-[clamp(2.5rem,6vw,6rem)] gap-y-8 items-end mb-14">
          <Reveal>
            <Kicker className="mb-5">{lang === 'FR' ? 'Ce qui vous attend' : 'What you get'}</Kicker>
            <h2 className="v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2.2rem,5vw,4rem)]">
              {lang === 'FR' ? 'Un test qui choisit pour vous' : 'A quiz that chooses for you'}
            </h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="v2-serif italic font-light text-[clamp(1.1rem,1.9vw,1.45rem)] leading-snug text-[#3a2f23] max-w-[46ch]">
              {lang === 'FR'
                ? "Pas un menu de plus à décrypter. Cinq questions, et une seule destination juste pour là où vous êtes aujourd'hui."
                : 'Not another menu to decode. Five questions, and a single destination that fits where you are today.'}
            </p>
          </Reveal>
        </div>
        <div className="grid md:grid-cols-3 gap-x-[clamp(1.5rem,3.5vw,3.5rem)] gap-y-10">
          {INSIDE.map((it, i) => (
            <Reveal key={it.n} delay={i * 0.12}>
              <DrawRule className="w-full" delay={0.1 + i * 0.12} />
              <span className="mt-6 block v2-serif font-light text-[2.4rem] leading-none text-[#7d6330] tabular-nums">{it.n}</span>
              <h3 className="mt-4 v2-serif font-light text-[1.45rem] leading-[1.15] text-[#1c1712]">{it.title}</h3>
              <p className="mt-3.5 text-[0.95rem] leading-[1.8] text-[#3a2f23]">{it.body}</p>
            </Reveal>
          ))}
        </div>

        {/* Aperçu des destinations possibles · bandeau filets pleine largeur */}
        <Reveal className="mt-16">
          <div className="border-y border-[#9c7a44]/35 py-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            <span className="inline-flex items-center gap-2.5 text-[0.66rem] uppercase tracking-[0.2em] text-[#3a2f23]">
              <Headphones size={15} weight="light" className="text-[#7d6330]" /> {lang === 'FR' ? 'Podcast gratuit' : 'Free podcast'}
            </span>
            <span className="inline-flex items-center gap-2.5 text-[0.66rem] uppercase tracking-[0.2em] text-[#3a2f23]">
              <Target size={15} weight="light" className="text-[#7d6330]" /> {lang === 'FR' ? 'Quiz Dosha' : 'Dosha Quiz'}
            </span>
            <span className="inline-flex items-center gap-2.5 text-[0.66rem] uppercase tracking-[0.2em] text-[#3a2f23]">
              <BookOpen size={15} weight="light" className="text-[#7d6330]" /> {lang === 'FR' ? 'Bibliothèque & rituels' : 'Library & rituals'}
            </span>
            <span className="inline-flex items-center gap-2.5 text-[0.66rem] uppercase tracking-[0.2em] text-[#3a2f23]">
              <Compass size={15} weight="light" className="text-[#7d6330]" /> {lang === 'FR' ? "L'Expérience Origine" : 'The Origin Experience'}
            </span>
          </div>
        </Reveal>
      </section>

      {/* ─────────── LE TEST (routeur) ─────────── */}
      <section id="guide" className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(5rem,12vh,9rem)] bg-[#f4efe6] scroll-mt-24 overflow-hidden">
        <GiantWord word="Guider" />
        <div className="relative z-10">
          <Reveal className="text-center mb-12">
            <Kicker className="mb-5">{lang === 'FR' ? 'À vous de jouer' : 'Your turn'}</Kicker>
            <h2 className="v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2.2rem,5vw,3.8rem)]">
              {lang === 'FR' ? 'Répondez en toute simplicité' : 'Answer, simply'}
            </h2>
            <p className="mt-5 v2-serif italic font-light text-[clamp(1.1rem,1.8vw,1.4rem)] text-[#3a2f23] max-w-[44ch] mx-auto">
              {lang === 'FR'
                ? 'Suivez votre premier réflexe. Il n\'y a pas de mauvaise réponse, seulement la vôtre.'
                : 'Trust your first instinct. There is no wrong answer, only yours.'}
            </p>
          </Reveal>
          <Router lang={lang} />
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
                ? "Pas encore prête à choisir ? Recevez le fil de Krystine : repères saisonniers, rituels et nouvelles des prochains parcours, sans bruit."
                : "Not ready to choose yet? Receive Krystine's thread: seasonal markers, rituals and word of upcoming journeys, no noise."}
            </p>
          </Reveal>
          <Reveal delay={0.1} className="mt-10">
            <NewsletterSignup
              source="guide"
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

export default GuideLoeuvre;
