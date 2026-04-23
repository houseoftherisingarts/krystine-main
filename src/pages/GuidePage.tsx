import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import {
  GUIDE_QUESTIONS, computeRecommendation,
  type GuideAnswer, type GuideRecommendation,
} from '../lib/guideEngine';
import { goToRoute } from '../lib/staticRoutes';
import { addGuideResponse } from '../firebase/firestore';
import EditableText from '../components/edit/EditableText';

// "Laissez-vous guider" — a 5-question router that lands the visitor on the
// single Inspirata offering that fits them best right now. Visually
// structured like the Dosha quiz (one question at a time, progress bar,
// auto-advance on click) so the two feel like a pair.

const GuidePage: React.FC = () => {
  const { lang, user, member } = useApp();
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
        // Persist to the CRM. When the visitor is signed in we stamp their
        // uid + email so the response appears on their client portal and in
        // the admin client-view overlay. Anonymous submissions still land
        // in the `guideResponses` collection for aggregate analysis.
        const fullName = (member?.displayName || user?.displayName || '').trim();
        const [firstName, ...rest] = fullName ? fullName.split(/\s+/) : [''];
        const lastName = rest.join(' ');
        const denormalized = nextAnswers.map(a => {
          const q = GUIDE_QUESTIONS.find(qq => qq.id === a.qid);
          const opt = q?.options.find(o => o.id === a.optionId);
          return {
            qid: a.qid,
            optionId: a.optionId,
            questionLabel: q?.fr,
            optionLabel: opt?.fr,
          };
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

  const goToResult = (rec: GuideRecommendation) => {
    goToRoute(navigate, rec.href);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] dark:bg-[#050C1A] text-[#0B1A36] dark:text-white pt-36 pb-24">
      <div className="max-w-3xl mx-auto px-6 md:px-12">

        {/* Hero */}
        <div className="text-center mb-10">
          <span className="text-[#D4AF37] uppercase tracking-[0.3em] text-xs font-bold block mb-4">
            <EditableText
              fieldKey="guide.hero.kicker"
              defaultValue={lang === 'FR' ? 'Laissez-vous guider' : 'Let yourself be guided'}
            />
          </span>
          <h1 className="text-4xl md:text-6xl font-serif leading-tight">
            <EditableText
              fieldKey="guide.hero.title"
              defaultValue={lang === 'FR' ? 'Par où commencer ?' : 'Where to start?'}
            />
          </h1>
          <p className="mt-5 font-serif italic text-[#0B1A36]/60 dark:text-white/60 max-w-xl mx-auto">
            <EditableText
              fieldKey="guide.hero.lead"
              defaultValue={lang === 'FR'
                ? '5 questions à choix pour vous aiguiller selon votre situation.'
                : '5 multiple-choice questions to point you in the right direction based on your situation.'}
              multiline
            />
          </p>
          <div className="w-24 h-1 bg-[#D4AF37] mx-auto mt-8" />
        </div>

        {/* ── Result screen ── */}
        {result ? (
          <div className="mt-6">
            <ResultCard rec={result} lang={lang} onPrimary={() => goToResult(result)} onRestart={restart} />
          </div>
        ) : (
          <>
            {/* Progress */}
            <div className="flex items-center justify-between mb-6 text-[10px] uppercase tracking-widest font-bold text-[#0B1A36]/50 dark:text-white/50">
              <span>{lang === 'FR' ? 'Question' : 'Question'} {step + 1} / {total}</span>
              <button
                type="button"
                onClick={restart}
                className="hover:text-[#D4AF37] transition-colors"
              >
                {lang === 'FR' ? 'Recommencer' : 'Restart'}
              </button>
            </div>
            <div className="relative h-1 rounded-full bg-[#0B1A36]/5 dark:bg-white/10 overflow-hidden mb-8">
              <div
                className="absolute inset-y-0 left-0 bg-[#D4AF37] rounded-full transition-[width] duration-500 ease-out"
                style={{ width: `${((step + 1) / total) * 100}%` }}
              />
            </div>

            {/* Question card */}
            {current && (
              <div className="bg-white dark:bg-[#0B1A36] rounded-[24px] shadow-lg border border-[#0B1A36]/5 dark:border-white/5 p-6 md:p-10">
                <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#D4AF37] mb-3">
                  {lang === 'FR' ? current.kickerFR : current.kickerEN}
                </p>
                <h2 className="text-xl md:text-2xl font-serif leading-snug mb-8">
                  {lang === 'FR' ? current.fr : current.en}
                </h2>
                <div className="space-y-3">
                  {current.options.map(opt => {
                    const isFlash = flashOption === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handlePick(opt.id)}
                        disabled={!!flashOption}
                        className={`w-full text-left p-4 rounded-xl border transition-all shadow-sm flex items-start gap-4 ${
                          isFlash
                            ? 'border-[#D4AF37] bg-[#D4AF37]/10 shadow-[0_4px_18px_rgba(212,175,55,0.25)]'
                            : 'border-[#0B1A36]/10 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:border-[#D4AF37] hover:bg-[#D4AF37]/5'
                        }`}
                      >
                        <div className={`shrink-0 w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 transition-colors ${
                          isFlash ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-[#0B1A36]/20 dark:border-white/20'
                        }`}>
                          {isFlash && <i className="fa-solid fa-check text-[#0B1A36] text-[9px]" />}
                        </div>
                        <span className="block text-[#0B1A36]/85 dark:text-white/85 text-sm leading-relaxed flex-1">
                          {lang === 'FR' ? opt.fr : opt.en}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 pt-4 border-t border-[#0B1A36]/10 dark:border-white/10 flex items-center justify-between text-[10px] uppercase tracking-widest font-bold text-[#0B1A36]/50 dark:text-white/50">
                  <button
                    type="button"
                    onClick={goBack}
                    disabled={step === 0}
                    className="hover:text-[#D4AF37] disabled:opacity-30 disabled:hover:text-inherit transition-colors"
                  >
                    <i className="fa-solid fa-arrow-left mr-1" /> {lang === 'FR' ? 'Précédent' : 'Back'}
                  </button>
                  <span className="text-[#0B1A36]/30 dark:text-white/30">
                    {lang === 'FR' ? 'Bientôt : recommandations Claude en direct' : 'Coming: live Claude recommendations'}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Result card — uses the outcome's own accent color + icon so the router
// feels thematic rather than generic. Kept inline since it's only used here.
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
    <div
      className="rounded-[28px] p-8 md:p-12 border text-center"
      style={{
        borderColor: `${rec.accent}55`,
        background: `linear-gradient(135deg, ${rec.accent}22 0%, ${rec.accent}08 100%)`,
      }}
    >
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl"
        style={{ backgroundColor: `${rec.accent}22`, color: rec.accent }}
      >
        <i className={`fa-solid ${rec.icon || 'fa-compass'}`} />
      </div>
      <p className="text-[10px] uppercase tracking-[0.3em] font-bold mb-3" style={{ color: rec.accent }}>
        {lang === 'FR' ? rec.eyebrowFR : rec.eyebrowEN}
      </p>
      <h2 className="text-3xl md:text-5xl font-serif text-[#0B1A36] dark:text-white mb-6 leading-tight">
        {lang === 'FR' ? rec.titleFR : rec.titleEN}
      </h2>
      <p className="text-[#0B1A36]/75 dark:text-white/75 font-serif italic text-lg leading-relaxed max-w-xl mx-auto mb-10">
        {lang === 'FR' ? rec.blurbFR : rec.blurbEN}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onPrimary}
          className="inline-flex items-center gap-2 bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] px-8 py-3.5 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors shadow-md"
        >
          {lang === 'FR' ? rec.ctaFR : rec.ctaEN}
          <i className="fa-solid fa-arrow-right text-[10px]" />
        </button>
        {rec.secondaryHref && (
          <button
            type="button"
            onClick={goSecondary}
            className="inline-flex items-center gap-2 border border-[#0B1A36]/15 dark:border-white/15 text-[#0B1A36]/70 dark:text-white/70 px-6 py-3 rounded-full font-bold uppercase tracking-widest text-[11px] hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors"
          >
            {lang === 'FR' ? rec.secondaryCtaFR : rec.secondaryCtaEN}
          </button>
        )}
      </div>
      <div className="mt-10 pt-6 border-t border-[#0B1A36]/10 dark:border-white/10">
        <button
          type="button"
          onClick={onRestart}
          className="text-[10px] uppercase tracking-widest font-bold text-[#0B1A36]/40 dark:text-white/40 hover:text-[#D4AF37] transition-colors"
        >
          <i className="fa-solid fa-rotate mr-1.5" />
          {lang === 'FR' ? 'Refaire le test' : 'Retake the quiz'}
        </button>
      </div>
    </div>
  );
};

export default GuidePage;
