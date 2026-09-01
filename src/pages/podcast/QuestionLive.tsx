import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { getLiveEvents, addLiveQuestion, type LiveEvent } from '../../firebase/firestore';

// /podcast/question — la page que Krystine donne en ondes. Chaque question
// envoyée d'ici se pose en direct à la fin du paquet de cartes de l'admin,
// dans sa teinte bleutée, tandis que les inscriptions faites d'avance gardent
// la teinte rougeâtre.

const EASE = [0.16, 0.8, 0.24, 1] as const;

const PARCHMENT = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const BLEU = {
  accent: '#9CD4F5',
  border: 'rgba(150,208,244,0.48)',
  soft: 'rgba(150,208,244,0.16)',
  glass: 'linear-gradient(148deg, rgba(88,168,222,0.38) 0%, rgba(34,98,150,0.30) 48%, rgba(12,32,50,0.34) 100%)',
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
    <span className="block text-[10px] uppercase tracking-[0.24em] text-[#F4E7DD]/50 mb-2">{label}</span>
    {aire ? (
      <textarea
        value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        maxLength={maxLength} required={required} rows={5}
        className="w-full px-5 py-4 rounded-[18px] bg-white/[0.06] border text-[#F4E7DD] placeholder-[#F4E7DD]/25 outline-none resize-y transition-colors focus:bg-white/[0.09]"
        style={{ borderColor: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(8px)' }}
        onFocus={e => (e.currentTarget.style.borderColor = BLEU.border)}
        onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)')}
      />
    ) : (
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        maxLength={maxLength} required={required}
        className="w-full px-5 py-4 rounded-[18px] bg-white/[0.06] border text-[#F4E7DD] placeholder-[#F4E7DD]/25 outline-none transition-colors focus:bg-white/[0.09]"
        style={{ borderColor: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(8px)' }}
        onFocus={e => (e.currentTarget.style.borderColor = BLEU.border)}
        onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)')}
      />
    )}
  </label>
);

const QuestionLive: React.FC = () => {
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
          style={{ backgroundColor: '#0D0B0A' }}>
      <div aria-hidden className="absolute inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(62% 58% at 22% 18%, rgba(40,124,190,0.34) 0%, rgba(13,11,10,0) 68%), radial-gradient(58% 55% at 82% 84%, rgba(196,64,36,0.22) 0%, rgba(13,11,10,0) 70%)' }} />
      <div aria-hidden className="absolute inset-0 pointer-events-none opacity-[0.06]"
           style={{ backgroundImage: PARCHMENT, mixBlendMode: 'overlay' }} />

      <motion.section
        {...reveal}
        transition={{ duration: reduce ? 0.2 : 0.9, ease: EASE }}
        className="relative w-full max-w-[820px] rounded-[30px] border overflow-hidden"
        style={{
          background: BLEU.glass,
          borderColor: BLEU.border,
          boxShadow: '0 50px 140px -60px rgba(70,126,166,0.85), inset 0 1px 0 rgba(226,242,252,0.30)',
          backdropFilter: 'blur(26px) saturate(140%)',
          WebkitBackdropFilter: 'blur(26px) saturate(140%)',
        }}
      >
        <div aria-hidden className="absolute inset-0 pointer-events-none opacity-[0.10]"
             style={{ backgroundImage: PARCHMENT, mixBlendMode: 'overlay' }} />
        <div aria-hidden className="absolute inset-x-0 top-0 h-40 pointer-events-none"
             style={{ background: 'linear-gradient(180deg, rgba(255,244,232,0.14), rgba(255,244,232,0))' }} />

        <div className="relative p-8 md:p-12">
          <div className="flex items-center gap-3 mb-7">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.18em] sm:tracking-[0.22em] border whitespace-nowrap"
                  style={{ color: BLEU.accent, borderColor: BLEU.border, background: BLEU.soft }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: BLEU.accent }} />
              Podcast en direct
            </span>
            {dateDirect && <span className="text-[11px] uppercase tracking-[0.18em] text-[#F4E7DD]/45">{dateDirect}</span>}
          </div>

          <AnimatePresence mode="wait">
            {fait ? (
              <motion.div key="merci"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.5, ease: EASE }} className="space-y-6">
                <h1 className="font-serif text-[#F4E7DD] leading-[0.96]" style={{ fontSize: 'clamp(2.4rem, 5vw, 3.8rem)' }}>
                  Votre question est partie
                </h1>
                <p className="font-sans text-[#F4E7DD]/70 text-[0.95rem] leading-[1.85] max-w-[52ch]">
                  Elle vient de se poser sur l’écran de Krystine, à la suite des autres. Restez avec nous, elle y répond en ondes.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button onClick={() => setFait(false)}
                    className="px-7 py-3.5 rounded-full font-sans text-xs font-bold uppercase tracking-[0.2em] border transition-colors"
                    style={{ color: BLEU.accent, borderColor: BLEU.border, background: BLEU.soft }}>
                    En poser une autre
                  </button>
                  {direct?.youtubeUrl && (
                    <a href={direct.youtubeUrl} target="_blank" rel="noopener noreferrer"
                       className="px-7 py-3.5 rounded-full font-sans text-xs font-bold uppercase tracking-[0.2em] border border-white/15 text-[#F4E7DD]/70 hover:text-[#F4E7DD] hover:border-white/35 transition-colors">
                      Retourner au direct
                    </a>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div key="formulaire"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.5, ease: EASE }}>
                <h1 className="font-serif text-[#F4E7DD] leading-[0.94]" style={{ fontSize: 'clamp(2.5rem, 5.4vw, 4.2rem)' }}>
                  Posez votre question
                </h1>
                <p className="mt-5 font-sans text-[#F4E7DD]/70 text-[0.95rem] leading-[1.85] max-w-[54ch]">
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
                      <span className="font-sans text-[11px] uppercase tracking-[0.18em] text-[#F4E7DD]/35">
                        {question.length} / 1000
                      </span>
                      <button type="submit" disabled={envoi}
                        className="px-9 py-4 rounded-full font-sans text-xs font-bold uppercase tracking-[0.2em] border transition-[transform,background-color] active:scale-[0.98] disabled:opacity-50"
                        style={{ color: '#0D0B0A', borderColor: BLEU.border, background: BLEU.accent }}>
                        {envoi ? 'Envoi…' : 'Envoyer ma question'}
                      </button>
                    </div>
                    {erreur && <p className="font-sans text-sm text-[#E8B07A]">{erreur}</p>}
                  </form>
                ) : (
                  <p className="mt-9 font-sans text-[#F4E7DD]/60 text-[0.95rem] leading-[1.85]">
                    {events === null ? 'Un instant, la page rejoint le direct…' : 'Le prochain direct sera annoncé sur la page du podcast. Revenez à ce moment-là pour poser votre question.'}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-10 pt-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.10)' }}>
            <a href="/podcast" className="font-sans text-[11px] uppercase tracking-[0.2em] text-[#F4E7DD]/40 hover:text-[#F4E7DD]/80 transition-colors">
              ← Le podcast de Krystine
            </a>
          </div>
        </div>
      </motion.section>
    </main>
  );
};

export default QuestionLive;
