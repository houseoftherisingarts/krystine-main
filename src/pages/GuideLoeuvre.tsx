import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass, ArrowRight, ArrowLeft, Check, RotateCcw, Headphones, CircleDot, BookOpen } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import {
  GUIDE_QUESTIONS, computeRecommendation,
  type GuideAnswer, type GuideRecommendation,
} from '../lib/guideEngine';
import { goToRoute } from '../lib/staticRoutes';
import { addGuideResponse } from '../firebase/firestore';
import NewsletterSignup from '../components/NewsletterSignup';
import { Atmosphere, Seam } from '../components/motion/loeuvre';

/**
 * Laissez-vous guider — page React au style L'Œuvre (espresso/cream/brass).
 * Garde 100 % de la logique du routeur de recommandation (guideEngine +
 * addGuideResponse) et branche le vrai NewsletterSignup (source="guide").
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

/* ════════════════════════ Données éditoriales (statiques au style L'Œuvre) ════════════════════════ */

// "Ce que vous obtenez" — décrit honnêtement le routeur : 5 questions, un seul
// chemin proposé, et l'éventail réel des destinations tirées de guideEngine.
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

/* ════════════════════════ Carte résultat (style L'Œuvre) ════════════════════════ */

const ResultCard: React.FC<{
  rec: GuideRecommendation;
  lang: 'FR' | 'EN';
  onPrimary: () => void;
  onRestart: () => void;
}> = ({ rec, lang, onPrimary, onRestart }) => {
  const navigate = useNavigate();
  const goSecondary = () => {
    if (!rec.secondaryHref) return;
    goToRoute(navigate, rec.secondaryHref);
  };
  return (
    <Reveal>
      <div className="rounded-[2rem] border border-brass/30 bg-espresso p-8 md:p-12 text-center shadow-[0_30px_80px_rgba(0,0,0,0.3)]">
        <span
          className="grid place-items-center w-16 h-16 rounded-2xl mx-auto mb-6"
          style={{ backgroundColor: `${rec.accent}26`, color: rec.accent }}
        >
          <i className={`fa-solid ${rec.icon || 'fa-compass'} text-xl`} />
        </span>
        <p className="font-sans text-[0.62rem] uppercase tracking-[0.28em] text-brass">
          {lang === 'FR' ? rec.eyebrowFR : rec.eyebrowEN}
        </p>
        <h2 className="mt-4 font-serif font-medium text-ctext leading-[1.05] text-[clamp(2rem,4.2vw,3.2rem)]">
          {lang === 'FR' ? rec.titleFR : rec.titleEN}
        </h2>
        <p className="mt-6 font-serif italic text-[clamp(1.05rem,1.9vw,1.4rem)] leading-relaxed text-ctextSoft max-w-[54ch] mx-auto">
          {lang === 'FR' ? rec.blurbFR : rec.blurbEN}
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={onPrimary}
            className="inline-flex items-center gap-3 rounded-full bg-brass px-9 py-4 font-sans text-[0.7rem] uppercase tracking-[0.16em] text-espressoDeep transition-colors hover:bg-brassBright min-h-[44px]"
          >
            {lang === 'FR' ? rec.ctaFR : rec.ctaEN} <ArrowRight size={16} />
          </button>
          {rec.secondaryHref && (
            <button
              type="button"
              onClick={goSecondary}
              className="inline-flex items-center gap-2 rounded-full border border-ctextSoft/25 px-7 py-3.5 font-sans text-[0.68rem] uppercase tracking-[0.16em] text-ctextSoft transition-colors hover:border-brass hover:text-brass min-h-[44px]"
            >
              {lang === 'FR' ? rec.secondaryCtaFR : rec.secondaryCtaEN}
            </button>
          )}
        </div>
        <div className="mt-10 pt-6 border-t border-ctextSoft/15">
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex items-center gap-2 font-sans text-[0.62rem] uppercase tracking-[0.2em] text-ctextSoft/60 transition-colors hover:text-brass"
          >
            <RotateCcw size={13} /> {lang === 'FR' ? 'Refaire le test' : 'Retake the quiz'}
          </button>
        </div>
      </div>
    </Reveal>
  );
};

/* ════════════════════════ Le routeur (carte question + progression) ════════════════════════ */

const Router: React.FC<{ lang: 'FR' | 'EN' }> = ({ lang }) => {
  const { user, member } = useApp();
  const navigate = useNavigate();

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
        }).catch(() => { /* non-fatal — user still sees their result */ });
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
    <Reveal>
      {/* Progression */}
      <div className="flex items-center justify-between mb-5">
        <span className="font-sans text-[0.62rem] uppercase tracking-[0.2em] text-inkSoft">
          {lang === 'FR' ? 'Question' : 'Question'} {step + 1} / {total}
        </span>
        <button
          type="button"
          onClick={restart}
          className="font-sans text-[0.62rem] uppercase tracking-[0.2em] text-inkSoft transition-colors hover:text-brassInk"
        >
          {lang === 'FR' ? 'Recommencer' : 'Restart'}
        </button>
      </div>
      <div className="relative h-1 rounded-full bg-ink/10 overflow-hidden mb-8">
        <div
          className="absolute inset-y-0 left-0 bg-brass rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${((step + 1) / total) * 100}%` }}
        />
      </div>

      {/* Carte question */}
      {current && (
        <div className="rounded-[2rem] border border-cream3 bg-card p-6 md:p-10 shadow-lg">
          <p className="font-sans text-[0.6rem] uppercase tracking-[0.26em] text-brassInk mb-4">
            {lang === 'FR' ? current.kickerFR : current.kickerEN}
          </p>
          <h3 className="font-serif font-medium text-ink leading-snug text-[clamp(1.4rem,2.6vw,2.1rem)] mb-8 max-w-[28ch]">
            {lang === 'FR' ? current.fr : current.en}
          </h3>
          <div className="space-y-3">
            {current.options.map(opt => {
              const isFlash = flashOption === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handlePick(opt.id)}
                  disabled={!!flashOption}
                  className={`w-full text-left p-4 md:p-5 rounded-2xl border transition-all flex items-start gap-4 min-h-[44px] ${
                    isFlash
                      ? 'border-brass bg-brass/10 shadow-[0_10px_30px_rgba(187,154,94,0.18)]'
                      : 'border-cream3 bg-cream2 hover:border-brass/60 hover:bg-brass/5'
                  }`}
                >
                  <span className={`shrink-0 w-5 h-5 rounded-full border grid place-items-center mt-0.5 transition-colors ${
                    isFlash ? 'border-brass bg-brass text-espressoDeep' : 'border-ink/25'
                  }`}>
                    {isFlash && <Check size={11} />}
                  </span>
                  <span className="flex-1 font-sans text-[0.95rem] leading-relaxed text-inkSoft">
                    {lang === 'FR' ? opt.fr : opt.en}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-7 pt-5 border-t border-cream3 flex items-center justify-between">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0}
              className="inline-flex items-center gap-2 font-sans text-[0.62rem] uppercase tracking-[0.2em] text-inkSoft transition-colors hover:text-brassInk disabled:opacity-30 disabled:hover:text-inkSoft"
            >
              <ArrowLeft size={13} /> {lang === 'FR' ? 'Précédent' : 'Back'}
            </button>
            <span className="font-sans text-[0.58rem] uppercase tracking-[0.18em] text-inkSoft/50">
              {lang === 'FR' ? 'Sans inscription' : 'No sign-up needed'}
            </span>
          </div>
        </div>
      )}
    </Reveal>
  );
};

/* ════════════════════════ Page ════════════════════════ */

const GuideLoeuvre: React.FC = () => {
  const { lang } = useApp();

  return (
    <div className="bg-cream text-ink font-sans antialiased">

      {/* ─────────── HERO (la promesse du guide) ─────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-espressoDeep">
        <Atmosphere light="74% 20%" />
        <div className="relative z-10 mx-auto w-full max-w-[1280px] px-6 md:px-12 py-24 grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-16 items-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease }}>
            <p className="inline-flex items-center gap-2 font-sans text-[0.62rem] md:text-[0.7rem] uppercase tracking-[0.32em] text-brass mb-8">
              <Compass size={14} /> {lang === 'FR' ? 'Laissez-vous guider' : 'Let yourself be guided'}
            </p>
            <h1 className="font-serif font-medium text-ctext leading-[0.98] text-[clamp(2.4rem,5.2vw,4.4rem)] max-w-[15ch]">
              {lang === 'FR' ? 'Par où commencer ?' : 'Where to start?'}
            </h1>
            <p className="mt-7 font-serif italic text-[clamp(1.3rem,2.8vw,2.1rem)] leading-snug text-ctextSoft max-w-[24ch]">
              {lang === 'FR'
                ? <>Cinq questions pour trouver <span className="text-brassBright not-italic">votre seule prochaine porte.</span></>
                : <>Five questions to find <span className="text-brassBright not-italic">your one next door.</span></>}
            </p>
            <div className="mt-12 flex flex-wrap items-center gap-6">
              <a
                href="#guide"
                className="inline-flex items-center gap-3 rounded-full bg-brass px-8 py-3.5 font-sans text-[0.7rem] uppercase tracking-[0.18em] text-espressoDeep transition-colors duration-300 hover:bg-brassBright min-h-[44px]"
              >
                {lang === 'FR' ? 'Commencer le test' : 'Begin the quiz'} <ArrowRight size={16} />
              </a>
              <span className="font-sans text-[0.75rem] text-ctextSoft/70">
                {lang === 'FR' ? 'Gratuit · sans inscription · 2 minutes' : 'Free · no sign-up · 2 minutes'}
              </span>
            </div>
          </motion.div>

          {/* Boussole — disque rotatif éditorial (pas d'image externe requise) */}
          <motion.div
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease, delay: 0.15 }}
            className="relative hidden lg:flex items-center justify-center"
          >
            <div className="relative w-[380px] h-[380px] flex items-center justify-center">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }} className="absolute inset-[-4%] rounded-full border border-dashed border-brass/25" />
              <motion.div animate={{ rotate: -360 }} transition={{ duration: 44, repeat: Infinity, ease: 'linear' }} className="absolute inset-[10%] rounded-full border border-brass/15" />
              <div className="absolute inset-[20%] rounded-full bg-brass/10 blur-2xl" />
              <Compass className="relative z-10 text-brassBright drop-shadow-[0_20px_45px_rgba(0,0,0,0.5)]" size={120} strokeWidth={1} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─────────── CE QUE VOUS OBTENEZ ─────────── */}
      <section className="relative bg-cream py-24 md:py-32 overflow-hidden">
        <Seam from="#16100a" />
        <div className="relative z-10 mx-auto w-full max-w-[1280px] px-6 md:px-12">
          <Reveal className="text-center mb-16">
            <Eyebrow>{lang === 'FR' ? 'Ce qui vous attend' : 'What you get'}</Eyebrow>
            <SectionTitle className="mt-4">
              {lang === 'FR' ? 'Un test qui choisit pour vous' : 'A quiz that chooses for you'}
            </SectionTitle>
            <div className="mt-5 h-px w-24 bg-brass mx-auto" />
            <p className="mt-6 font-serif italic text-[clamp(1.05rem,1.9vw,1.4rem)] text-inkSoft max-w-[48ch] mx-auto">
              {lang === 'FR'
                ? "Pas un menu de plus à décrypter. Cinq questions, et une seule destination juste pour là où vous êtes aujourd'hui."
                : 'Not another menu to decode. Five questions, and a single destination that fits where you are today.'}
            </p>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6">
            {INSIDE.map((it, i) => (
              <Reveal key={it.n} delay={i * 0.08}>
                <div className="h-full rounded-3xl bg-card border-l-[3px] border-l-brass border-y border-r border-cream3 p-8 md:p-9 transition-shadow hover:shadow-xl">
                  <span className="font-serif text-brass text-3xl tabular-nums">{it.n}</span>
                  <h3 className="mt-4 font-serif text-xl md:text-2xl text-ink leading-snug">{it.title}</h3>
                  <p className="mt-3 font-sans text-[0.95rem] leading-[1.8] text-inkSoft">{it.body}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Aperçu des destinations possibles */}
          <Reveal className="mt-14">
            <div className="rounded-3xl border border-cream3 bg-cream2 p-7 md:p-9 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-inkSoft">
              <span className="inline-flex items-center gap-2 font-sans text-[0.8rem]"><Headphones size={15} className="text-brassInk" /> {lang === 'FR' ? 'Podcast gratuit' : 'Free podcast'}</span>
              <span className="inline-flex items-center gap-2 font-sans text-[0.8rem]"><CircleDot size={15} className="text-brassInk" /> {lang === 'FR' ? 'Quiz Dosha' : 'Dosha Quiz'}</span>
              <span className="inline-flex items-center gap-2 font-sans text-[0.8rem]"><BookOpen size={15} className="text-brassInk" /> {lang === 'FR' ? 'Bibliothèque & rituels' : 'Library & rituals'}</span>
              <span className="inline-flex items-center gap-2 font-sans text-[0.8rem]"><Compass size={15} className="text-brassInk" /> {lang === 'FR' ? "L'Expérience Origine" : 'The Origin Experience'}</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─────────── LE TEST (routeur) ─────────── */}
      <section id="guide" className="relative bg-espressoSoft py-24 md:py-32 overflow-hidden">
        <Seam from="#f6f3ee" />
        <div className="relative z-10 mx-auto w-full max-w-[820px] px-6 md:px-12">
          <Reveal className="text-center mb-12">
            <Eyebrow on="dark">{lang === 'FR' ? 'À vous de jouer' : 'Your turn'}</Eyebrow>
            <SectionTitle on="dark" className="mt-4">
              {lang === 'FR' ? 'Répondez en toute simplicité' : 'Answer, simply'}
            </SectionTitle>
            <p className="mt-5 font-serif italic text-[clamp(1.05rem,1.8vw,1.35rem)] text-ctextSoft max-w-[44ch] mx-auto">
              {lang === 'FR'
                ? 'Suivez votre premier réflexe. Il n\'y a pas de mauvaise réponse, seulement la vôtre.'
                : 'Trust your first instinct. There is no wrong answer, only yours.'}
            </p>
          </Reveal>
          <Router lang={lang} />
        </div>
      </section>

      {/* ─────────── SIGNUP / CTA (NewsletterSignup, source="guide") ─────────── */}
      <section className="relative overflow-hidden bg-espressoDeep py-24 md:py-32">
        <Atmosphere strength={0.8} light="50% 8%" />
        <div className="relative mx-auto w-full max-w-[760px] px-6 md:px-12 text-center">
          <Reveal>
            <Eyebrow on="dark">{lang === 'FR' ? 'Rester sur le fil' : 'Stay on the thread'}</Eyebrow>
            <SectionTitle on="dark" className="mt-4">
              {lang === 'FR' ? 'Le fil, à votre rythme' : 'The thread, at your pace'}
            </SectionTitle>
            <p className="mt-6 font-serif italic text-[clamp(1.05rem,1.9vw,1.4rem)] leading-relaxed text-ctextSoft max-w-[52ch] mx-auto">
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

export default GuideLoeuvre;
