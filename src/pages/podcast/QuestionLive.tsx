import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { getLiveEvents, addLiveQuestion, type LiveEvent } from '../../firebase/firestore';
import { useAuth } from '../../contexts/AppContext';
import { points } from '../../firebase/points';
import CompteUpsell from '../../components/CompteUpsell';

// /podcast/question — la page que Krystine donne en ondes. Chaque question
// envoyée d'ici se pose en direct à la fin du paquet de cartes de l'admin,
// dans sa teinte bleutée, tandis que les inscriptions faites d'avance gardent
// la teinte rougeâtre.

const EASE = [0.16, 0.8, 0.24, 1] as const;

const PARCHMENT = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

// Canon KSL : ivoire minéral, encre, cuivre patiné, ambre réel. Le verre reste,
// la teinte devient parchemin.
const PARCH = {
  encre: '#293027',
  ivoire: '#EEE7DB',
  cuivre: '#8B4A2F',
  ambre: '#BA7B39',
  border: 'rgba(139,74,47,0.28)',
  soft: 'rgba(186,123,57,0.12)',
  glass: 'linear-gradient(148deg, rgba(252,248,240,0.82) 0%, rgba(240,232,218,0.70) 48%, rgba(228,216,197,0.66) 100%)',
};

// Le direct visé : celui dont l'heure est la plus proche du moment présent.
const choisirDirect = (events: LiveEvent[]): LiveEvent | null => {
  if (!events.length) return null;
  const now = Date.now();
  return [...events].sort((a, b) =>
    Math.abs(a.startsAt.toMillis() - now) - Math.abs(b.startsAt.toMillis() - now))[0];
};

const Champ: React.FC<{
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; maxLength?: number; aire?: boolean; required?: boolean;
}> = ({ label, value, onChange, type = 'text', placeholder, maxLength, aire, required }) => (
  <label className="block">
    <span className="block text-[10px] uppercase tracking-[0.24em] text-[#8B4A2F] mb-2">{label}</span>
    {aire ? (
      <textarea
        value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        maxLength={maxLength} required={required} rows={5}
        className="w-full px-5 py-4 rounded-[18px] bg-white/55 border text-[#293027] placeholder-[#293027]/35 outline-none resize-y transition-colors focus:bg-white/75"
        style={{ borderColor: 'rgba(41,48,39,0.14)', backdropFilter: 'blur(8px)' }}
        onFocus={e => (e.currentTarget.style.borderColor = PARCH.ambre)}
        onBlur={e => (e.currentTarget.style.borderColor = 'rgba(41,48,39,0.14)')}
      />
    ) : (
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        maxLength={maxLength} required={required}
        className="w-full px-5 py-4 rounded-[18px] bg-white/55 border text-[#293027] placeholder-[#293027]/35 outline-none transition-colors focus:bg-white/75"
        style={{ borderColor: 'rgba(41,48,39,0.14)', backdropFilter: 'blur(8px)' }}
        onFocus={e => (e.currentTarget.style.borderColor = PARCH.ambre)}
        onBlur={e => (e.currentTarget.style.borderColor = 'rgba(41,48,39,0.14)')}
      />
    )}
  </label>
);

const QuestionLive: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<LiveEvent[] | null>(null);
  const [nom, setNom] = useState('');
  const [courriel, setCourriel] = useState('');
  const [question, setQuestion] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [fait, setFait] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => { getLiveEvents().then(setEvents).catch(() => setEvents([])); }, []);
  const direct = useMemo(() => (events ? choisirDirect(events) : null), [events]);

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!direct || envoi) return;
    if (!nom.trim() || question.trim().length < 3) { setErreur('Il manque votre prénom ou votre question.'); return; }
    setEnvoi(true); setErreur(null);
    try {
      await addLiveQuestion({ eventTag: direct.tag, name: nom, email: courriel || undefined, question });
      if (user) points.questionPosee(user.uid, direct.tag).catch(() => {});
      setFait(true);
      setQuestion('');
    } catch {
      setErreur('L’envoi n’a pas fonctionné. Reprenez dans un instant.');
    } finally { setEnvoi(false); }
  };

  const reveal = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 28, filter: 'blur(6px)' }, animate: { opacity: 1, y: 0, filter: 'blur(0px)' } };

  const dateDirect = direct
    ? direct.startsAt.toDate().toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' })
    : '';

  return (
    <main className="relative min-h-[100dvh] w-full overflow-hidden px-5 py-14 md:py-20 flex items-center justify-center"
          style={{ backgroundColor: PARCH.ivoire }}>
      <div aria-hidden className="absolute inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(58% 55% at 20% 14%, rgba(186,123,57,0.30) 0%, rgba(238,231,219,0) 68%), radial-gradient(60% 58% at 84% 88%, rgba(120,128,113,0.28) 0%, rgba(238,231,219,0) 70%)' }} />
      <div aria-hidden className="absolute inset-0 pointer-events-none opacity-[0.16]"
           style={{ backgroundImage: PARCHMENT, mixBlendMode: 'multiply' }} />
      <div aria-hidden className="absolute inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(120% 90% at 50% 50%, rgba(238,231,219,0) 55%, rgba(41,48,39,0.10) 100%)' }} />

      <motion.section
        {...reveal}
        transition={{ duration: reduce ? 0.2 : 0.9, ease: EASE }}
        className="relative w-full max-w-[820px] rounded-[30px] border overflow-hidden"
        style={{
          background: PARCH.glass,
          borderColor: PARCH.border,
          boxShadow: '0 40px 110px -55px rgba(41,48,39,0.55), inset 0 1px 0 rgba(255,252,246,0.85)',
          backdropFilter: 'blur(26px) saturate(140%)',
          WebkitBackdropFilter: 'blur(26px) saturate(140%)',
        }}
      >
        <div aria-hidden className="absolute inset-0 pointer-events-none opacity-[0.13]"
             style={{ backgroundImage: PARCHMENT, mixBlendMode: 'multiply' }} />
        {/* Fil lumineux, la signature des blocs du direct */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-px pointer-events-none"
             style={{ background: 'linear-gradient(90deg, transparent, #c8a86a, transparent)' }} />

        <div className="relative p-8 md:p-12">
          <div className="flex items-center gap-3 mb-7">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.18em] sm:tracking-[0.22em] border whitespace-nowrap"
                  style={{ color: PARCH.cuivre, borderColor: 'rgba(186,123,57,0.55)', background: PARCH.soft }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: PARCH.ambre }} />
              Podcast en direct
            </span>
            {dateDirect && <span className="text-[11px] uppercase tracking-[0.18em] text-[#293027]/50">{dateDirect}</span>}
          </div>

          <AnimatePresence mode="wait">
            {fait ? (
              <motion.div key="merci"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.5, ease: EASE }} className="space-y-6">
                <h1 className="font-serif text-[#293027] leading-[0.96]" style={{ fontSize: 'clamp(2.4rem, 5vw, 3.8rem)' }}>
                  Votre question est partie
                </h1>
                <p className="font-sans text-[#293027]/75 text-[0.95rem] leading-[1.85] max-w-[52ch]">
                  Elle vient de se poser sur l’écran de Krystine, à la suite des autres. Restez avec nous, elle y répond en ondes.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button onClick={() => setFait(false)}
                    className="px-7 py-3.5 rounded-full font-sans text-xs font-bold uppercase tracking-[0.2em] transition-colors"
                    style={{ color: PARCH.encre, background: PARCH.ambre }}>
                    En poser une autre
                  </button>
                  {direct?.youtubeUrl && (
                    <a href={direct.youtubeUrl} target="_blank" rel="noopener noreferrer"
                       className="px-7 py-3.5 rounded-full font-sans text-xs font-bold uppercase tracking-[0.2em] border text-[#8B4A2F] hover:bg-[#BA7B39]/10 transition-colors"
                       style={{ borderColor: 'rgba(139,74,47,0.35)' }}>
                      Retourner au direct
                    </a>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div key="formulaire"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.5, ease: EASE }}>
                <h1 className="font-serif text-[#293027] leading-[0.94]" style={{ fontSize: 'clamp(2.5rem, 5.4vw, 4.2rem)' }}>
                  Posez votre question
                </h1>
                <p className="mt-5 font-sans text-[#293027]/75 text-[0.95rem] leading-[1.85] max-w-[54ch]">
                  Krystine lit les questions pendant l’émission et répond en ondes. Écrivez la vôtre, elle apparaît tout de suite sur son écran.
                </p>

                {direct ? (
                  <form onSubmit={envoyer} className="mt-9 space-y-5">
                    <div className="grid gap-5 md:grid-cols-2">
                      <Champ label="Votre prénom" value={nom} onChange={setNom} placeholder="Mireille" maxLength={80} required />
                      <Champ label="Votre courriel (facultatif)" value={courriel} onChange={setCourriel} type="email" placeholder="vous@exemple.com" maxLength={120} />
                    </div>
                    <Champ label="Votre question" value={question} onChange={setQuestion} aire required maxLength={1000}
                           placeholder="Ce que vous aimeriez demander à Krystine…" />
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                      <span className="font-sans text-[11px] uppercase tracking-[0.18em] text-[#293027]/40">
                        {question.length} / 1000
                      </span>
                      <button type="submit" disabled={envoi}
                        className="px-9 py-4 rounded-full font-sans text-xs font-bold uppercase tracking-[0.2em] transition-[transform,background-color] active:scale-[0.98] disabled:opacity-50 hover:brightness-95"
                        style={{ color: PARCH.encre, background: PARCH.ambre, boxShadow: '0 14px 30px -16px rgba(139,74,47,0.8)' }}>
                        {envoi ? 'Envoi…' : 'Envoyer ma question'}
                      </button>
                    </div>
                    {erreur && <p className="font-sans text-sm text-[#8B4A2F]">{erreur}</p>}
                    {!user && <CompteUpsell variant="light" />}
                  </form>
                ) : (
                  <p className="mt-9 font-sans text-[#293027]/65 text-[0.95rem] leading-[1.85]">
                    {events === null ? 'Un instant, la page rejoint le direct…' : 'Le prochain direct sera annoncé sur la page du podcast. Revenez à ce moment-là pour poser votre question.'}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-10 pt-6 border-t" style={{ borderColor: 'rgba(41,48,39,0.12)' }}>
            <a href="/podcast" className="font-sans text-[11px] uppercase tracking-[0.2em] text-[#293027]/45 hover:text-[#8B4A2F] transition-colors">
              ← Le podcast de Krystine
            </a>
          </div>
        </div>
      </motion.section>
    </main>
  );
};

export default QuestionLive;
