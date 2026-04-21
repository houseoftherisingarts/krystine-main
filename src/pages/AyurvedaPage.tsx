import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { CONTENT } from '../content';
import { addDoshaQuizResult, updateMember } from '../firebase/firestore';

const QUIZ_DATA = [
  { question: "Comment décririez-vous votre digestion ?", qEN: "How would you describe your digestion?", options: [{ text: "Inconstante, votre appétit fluctue.", textEN: "Inconsistent, your appetite fluctuates.", type: 'vata' }, { text: "Forte, vous devenez irritable si vous mangez tard.", textEN: "Strong, you become irritable if you eat late.", type: 'pitta' }, { text: "Stable, vous vous sentez rassasié longtemps.", textEN: "Stable, you feel full for a long time.", type: 'kapha' }] },
  { question: "Comment réagissez-vous au stress ?", qEN: "How do you react to stress?", options: [{ text: "Anxieux et inquiet.", textEN: "Anxious and worried.", type: 'vata' }, { text: "Irritable et impatient.", textEN: "Irritable and impatient.", type: 'pitta' }, { text: "Vous retirez et évitez les conflits.", textEN: "You withdraw and avoid conflict.", type: 'kapha' }] },
  { question: "Comment gérez-vous votre créativité ?", qEN: "How do you manage your creativity?", options: [{ text: "Très créatif, plusieurs projets à la fois.", textEN: "Very creative, multiple projects at once.", type: 'vata' }, { text: "Créatif dans le leadership.", textEN: "Creative in leadership.", type: 'pitta' }, { text: "Méthodique, calme, ancré.", textEN: "Methodical, calm, grounded.", type: 'kapha' }] },
  { question: "Comment décririez-vous votre tempérament ?", qEN: "How would you describe your temperament?", options: [{ text: "Enthousiaste, aime les nouvelles choses.", textEN: "Enthusiastic, loves new things.", type: 'vata' }, { text: "Déterminé, axé sur les objectifs.", textEN: "Determined, goal-oriented.", type: 'pitta' }, { text: "Facile à vivre, suit le courant.", textEN: "Easy-going, goes with the flow.", type: 'kapha' }] },
];

const AyurvedaIkigai: React.FC<{ doshas: any[]; onDoshaClick: (d: any) => void; onQuizClick: () => void }> = ({ doshas, onDoshaClick, onQuizClick }) => (
  <svg viewBox="-200 -200 400 400" className="w-[300px] h-[300px] md:w-[420px] md:h-[420px] overflow-visible drop-shadow-2xl">
    <defs>
      <filter id="glow-ay">
        <feGaussianBlur stdDeviation="5" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    {[
      { cx: -60, cy: -50, fill: '#8F9779', dosha: doshas[0] },
      { cx: 60, cy: -50, fill: '#BC4A3C', dosha: doshas[1] },
      { cx: 0, cy: 70, fill: '#4A7C9D', dosha: doshas[2] },
    ].map(({ cx, cy, fill, dosha }, i) => (
      <g key={i} onClick={() => onDoshaClick(dosha)} className="cursor-pointer group">
        <circle cx={cx} cy={cy} r={90} fill={fill} opacity={0.9} className="transition-all duration-300 hover:opacity-100" />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="16" fontFamily="serif" fontWeight="bold" letterSpacing="2" className="pointer-events-none uppercase">{dosha.name}</text>
      </g>
    ))}
    <g onClick={onQuizClick} className="cursor-pointer group">
      <circle cx={0} cy={10} r={55} fill="rgba(255,255,255,0.88)" stroke="rgba(212,175,55,0.3)" strokeWidth={1} filter="url(#glow-ay)" className="transition-all duration-300 hover:scale-105" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
      <text x={0} y={4} textAnchor="middle" fill="#0B1A36" fontSize="13" fontFamily="serif" fontWeight="bold" className="pointer-events-none uppercase tracking-widest">Faire</text>
      <text x={0} y={20} textAnchor="middle" fill="#0B1A36" fontSize="13" fontFamily="serif" fontWeight="bold" className="pointer-events-none uppercase tracking-widest">Le Quiz</text>
    </g>
  </svg>
);

const AyurvedaPage: React.FC = () => {
  const { lang, addToCart, user, member, setSignInOpen } = useApp();
  const t = CONTENT[lang];
  const ay = t.ayurveda;
  const navigate = useNavigate();

  const [selectedDosha, setSelectedDosha] = useState<any>(null);
  const [quizState, setQuizState] = useState({
    isOpen: false, step: 0,
    scores: { vata: 0, pitta: 0, kapha: 0 },
    formData: { firstName: '', lastName: '', email: '' },
    result: null as any,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleQuizAnswer = (type: string) => {
    const newScores = { ...quizState.scores, [type]: quizState.scores[type as keyof typeof quizState.scores] + 1 };
    setQuizState({ ...quizState, scores: newScores, step: quizState.step + 1 });
  };

  const handleQuizCompute = async () => {
    if (!user) { setSignInOpen(true); return; }

    const { vata, pitta, kapha } = quizState.scores;
    let dominant = ay.doshas[0];
    if (pitta > vata && pitta > kapha) dominant = ay.doshas[1];
    if (kapha > vata && kapha > pitta) dominant = ay.doshas[2];
    const total = vata + pitta + kapha || 1;
    const percentages = { vata: Math.round((vata / total) * 100), pitta: Math.round((pitta / total) * 100), kapha: Math.round((kapha / total) * 100) };

    // Pull identity from the signed-in member profile.
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
      } as any);
      try { await updateMember(user.uid, { dosha: dominant.name }); } catch { /* non-fatal */ }
    } catch {}
    finally { setSubmitting(false); }

    setQuizState(qs => ({ ...qs, result: { dominant, percentages } }));
  };

  // If the user signs in while the quiz is paused at the auth step, auto-continue.
  useEffect(() => {
    if (user && quizState.isOpen && quizState.step >= QUIZ_DATA.length && !quizState.result && !submitting) {
      handleQuizCompute();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, quizState.step, quizState.isOpen]);

  return (
    <div className="min-h-screen bg-[#F5F5F0] dark:bg-[#050C1A] text-[#0B1A36] dark:text-white pt-32 pb-24">
      <div className="max-w-[1800px] mx-auto px-4 md:px-12">

        {/* What is Ayurveda */}
        <div className="text-center mb-16 max-w-6xl mx-auto">
          <h1 className="text-3xl md:text-5xl font-serif text-[#0B1A36] dark:text-white mb-6 tracking-wide">{ay.whatIsTitle}</h1>
          <p className="text-[#0B1A36]/80 dark:text-white/80 font-serif text-lg md:text-2xl leading-relaxed italic max-w-4xl mx-auto">{ay.whatIsText}</p>
          <div className="w-16 h-1 bg-[#D4AF37] mx-auto mt-8" />
        </div>

        {/* Ikigai + Info */}
        <div className="flex flex-col lg:flex-row items-center justify-center w-full gap-12 lg:gap-24 mb-16">
          
          {/* SVG Dosha */}
          <div className="relative flex items-center justify-center lg:w-1/2">
            <AyurvedaIkigai doshas={ay.doshas} onDoshaClick={setSelectedDosha} onQuizClick={() => setQuizState({ ...quizState, isOpen: true, step: 0, scores: { vata: 0, pitta: 0, kapha: 0 }, result: null })} />
            {/* Dosha popup */}
            {selectedDosha && (
              <div className="absolute z-30 inset-0 flex items-center justify-center">
                <div className="bg-white dark:bg-[#0B1A36] p-8 rounded-[30px] shadow-2xl max-w-xs md:max-w-sm text-center relative border border-[#D4AF37]/20">
                  <button onClick={() => setSelectedDosha(null)} className="absolute top-3 right-4 text-[#0B1A36]/40 dark:text-white/40 hover:text-[#0B1A36] text-2xl">×</button>
                  <h3 className="text-3xl font-serif font-bold mb-2 text-[#D4AF37]">{selectedDosha.name}</h3>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#0B1A36]/50 dark:text-white/50 mb-4">{selectedDosha.elements}</p>
                  <div className="w-12 h-px bg-[#D4AF37]/30 mx-auto mb-4" />
                  <p className="text-[#0B1A36]/80 dark:text-white/80 text-sm leading-relaxed mb-4">{selectedDosha.definition}</p>
                  <p className="text-[#D4AF37] font-serif italic">{selectedDosha.action}</p>
                  <div className="mt-6 pt-4 border-t border-[#0B1A36]/10">
                    <button
                      onClick={() => { addToCart({ title: selectedDosha.productRecom, price: '48.00 CAD', type: 'Soin Ayurvédique' }); setSelectedDosha(null); }}
                      className="w-full bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] py-2 rounded-full text-xs font-bold uppercase hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors shadow-md"
                    >
                      {lang === 'FR' ? 'Ajouter' : 'Add'} {selectedDosha.productRecom}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Text side */}
          <div className="lg:w-1/2 text-center lg:text-left max-w-xl">
            <span className="text-[#D4AF37] uppercase tracking-[0.2em] text-xs font-semibold block mb-2">{ay.introTitle}</span>
            <h2 className="text-3xl md:text-5xl font-serif text-[#0B1A36] dark:text-white mb-6">{ay.title}</h2>
            <p className="text-[#0B1A36]/70 dark:text-white/70 font-serif text-lg leading-relaxed mb-6 italic">{ay.introText}</p>
            <div className="bg-white dark:bg-[#0B1A36]/60 border border-[#0B1A36]/5 dark:border-white/5 p-8 rounded-[24px] shadow-lg mb-8">
              <p className="text-[#0B1A36]/80 dark:text-white/80 leading-relaxed mb-4 font-medium">{ay.desc}</p>
              <p className="text-[#0B1A36] dark:text-white font-bold">{ay.quizPrompt}</p>
            </div>
            <button
              onClick={() => setQuizState({ ...quizState, isOpen: true, step: 0, scores: { vata: 0, pitta: 0, kapha: 0 }, result: null })}
              className="bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] px-10 py-4 rounded-full font-bold uppercase tracking-widest text-sm shadow-lg hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors"
            >
              {ay.quizBtn}
            </button>
          </div>
        </div>

        {/* Books preview */}
        <div className="mt-12 max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h3 className="text-2xl font-serif text-[#0B1A36] dark:text-white uppercase tracking-widest">
              {lang === 'FR' ? 'Lire sur l\'Ayurveda' : 'Read about Ayurveda'}
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {t.media.details.book.items.filter((b: any) => b.status === 'available').map((item: any, idx: number) => (
              <div key={idx} onClick={() => navigate('/livres')} className="group cursor-pointer bg-white dark:bg-[#0B1A36]/60 p-6 rounded-[24px] shadow-lg hover:shadow-2xl border border-[#0B1A36]/5 dark:border-white/5 transition-all flex gap-6 items-center">
                <div className="w-24 aspect-[1/1.3] rounded shadow-md bg-cover bg-center shrink-0 group-hover:-translate-y-1 transition-transform duration-500" style={{ backgroundImage: `url(${item.cover})`, backgroundSize: '100% 100%' }} />
                <div>
                  <h4 className="font-serif text-lg text-[#0B1A36] dark:text-white mb-1 group-hover:text-[#D4AF37] transition-colors">{item.fullTitle}</h4>
                  <p className="text-sm text-[#0B1A36]/50 dark:text-white/50 mb-3">{item.subtitle}</p>
                  <span className="text-xs font-bold text-[#D4AF37] border border-[#D4AF37]/30 px-3 py-1 rounded-full uppercase tracking-wider">
                    {lang === 'FR' ? 'Découvrir' : 'Discover'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* QUIZ MODAL */}
      {quizState.isOpen && (
        <div className="fixed inset-0 z-50 bg-[#0B1A36]/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0B1A36] w-full max-w-2xl rounded-[30px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-[#0B1A36]/10 dark:border-white/10 flex justify-between items-center bg-[#F5F5F0] dark:bg-white/5">
              <div>
                <h3 className="font-serif text-2xl text-[#0B1A36] dark:text-white">Dosha Quiz</h3>
                <p className="text-xs text-[#D4AF37] uppercase tracking-widest font-bold mt-1">
                  {quizState.result ? (lang === 'FR' ? 'Résultats' : 'Results') : quizState.step < QUIZ_DATA.length ? `${lang === 'FR' ? 'Question' : 'Question'} ${quizState.step + 1} / ${QUIZ_DATA.length + 1}` : (lang === 'FR' ? 'Finalisation' : 'Finalizing')}
                </p>
              </div>
              <button onClick={() => setQuizState({ ...quizState, isOpen: false, result: null })} className="text-[#0B1A36]/40 hover:text-[#0B1A36] dark:text-white/40 dark:hover:text-white">
                <i className="fa-solid fa-times text-xl" />
              </button>
            </div>
            {/* Progress */}
            {!quizState.result && (
              <div className="w-full h-1 bg-[#0B1A36]/5">
                <div className="h-full bg-[#D4AF37] transition-all duration-500" style={{ width: `${((quizState.step + 1) / (QUIZ_DATA.length + 1)) * 100}%` }} />
              </div>
            )}
            <div className="p-8 overflow-y-auto flex-1">
              {!quizState.result ? (
                quizState.step < QUIZ_DATA.length ? (
                  <div>
                    <h4 className="text-xl md:text-2xl font-serif text-[#0B1A36] dark:text-white mb-8 leading-relaxed">
                      {lang === 'FR' ? QUIZ_DATA[quizState.step].question : QUIZ_DATA[quizState.step].qEN}
                    </h4>
                    <div className="space-y-4">
                      {QUIZ_DATA[quizState.step].options.map((opt, idx) => (
                        <button key={idx} onClick={() => handleQuizAnswer(opt.type)}
                          className="w-full text-left p-4 rounded-xl border border-[#0B1A36]/10 dark:border-white/10 hover:border-[#D4AF37] hover:bg-[#D4AF37]/5 transition-all group shadow-sm bg-white/50 dark:bg-white/5">
                          <div className="flex items-start gap-4">
                            <div className="w-5 h-5 rounded-full border border-[#0B1A36]/20 dark:border-white/20 flex items-center justify-center mt-0.5 group-hover:border-[#D4AF37] flex-shrink-0">
                              <div className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <span className="text-[#0B1A36]/80 dark:text-white/80 text-sm leading-relaxed">
                              {lang === 'FR' ? opt.text : opt.textEN}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center max-w-md mx-auto py-4">
                    <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center mx-auto mb-6">
                      <i className="fa-solid fa-lock text-[#D4AF37] text-xl" />
                    </div>
                    <h4 className="text-2xl font-serif text-[#0B1A36] dark:text-white mb-3">
                      {lang === 'FR' ? 'Votre résultat vous attend' : 'Your result awaits'}
                    </h4>
                    <p className="text-[#0B1A36]/60 dark:text-white/60 mb-8 text-sm leading-relaxed">
                      {user
                        ? (lang === 'FR'
                            ? 'Nous allons calculer votre dosha dominant et l\'enregistrer dans votre espace client.'
                            : 'We\'ll compute your dominant dosha and save it to your client space.')
                        : (lang === 'FR'
                            ? 'Connectez-vous pour voir votre résultat et le retrouver dans votre espace client à tout moment.'
                            : 'Sign in to see your result and keep it in your client space forever.')
                      }
                    </p>
                    {user ? (
                      <button
                        onClick={handleQuizCompute}
                        disabled={submitting}
                        className="w-full bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] py-4 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors shadow-lg flex items-center justify-center gap-2"
                      >
                        {submitting
                          ? <><i className="fa-solid fa-circle-notch fa-spin" /> {lang === 'FR' ? 'Calcul…' : 'Computing…'}</>
                          : <>{lang === 'FR' ? 'Voir mon résultat' : 'Reveal my result'} <i className="fa-solid fa-arrow-right text-[10px]" /></>}
                      </button>
                    ) : (
                      <button
                        onClick={() => setSignInOpen(true)}
                        className="w-full bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] py-4 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors shadow-lg flex items-center justify-center gap-2"
                      >
                        <i className="fa-brands fa-google text-sm" />
                        {lang === 'FR' ? 'Se connecter pour voir le résultat' : 'Sign in to reveal'}
                      </button>
                    )}
                    <p className="mt-4 text-[10px] uppercase tracking-widest text-[#0B1A36]/40 dark:text-white/40">
                      {lang === 'FR'
                        ? 'Vos résultats restent privés et sont stockés en sécurité.'
                        : 'Your results stay private and are stored securely.'}
                    </p>
                  </div>
                )
              ) : (
                <div className="text-center">
                  <p className="font-serif text-xl italic text-[#0B1A36]/60 dark:text-white/60 mb-2">{lang === 'FR' ? `Bonjour ${quizState.formData.firstName}, votre nature dominante est :` : `Hello ${quizState.formData.firstName}, your dominant nature is:`}</p>
                  <h2 className="text-5xl font-serif font-bold mb-6 text-[#D4AF37]">{quizState.result.dominant.name}</h2>
                  <div className="flex justify-center gap-8 mb-8 text-sm text-[#0B1A36]/70 dark:text-white/70">
                    {['vata', 'pitta', 'kapha'].map(d => (
                      <div key={d} className="flex flex-col items-center">
                        <span className="font-bold text-[#D4AF37]">{quizState.result.percentages[d]}%</span>
                        <span className="capitalize">{d}</span>
                      </div>
                    ))}
                  </div>
                  <div className="max-w-md mx-auto mb-8 bg-[#F5F5F0] dark:bg-white/5 p-6 rounded-xl border border-[#0B1A36]/5">
                    <p className="text-[#0B1A36]/80 dark:text-white/80 italic leading-relaxed">{quizState.result.dominant.definition}</p>
                  </div>
                  <button onClick={() => { addToCart({ title: `Rituel ${quizState.result.dominant.name}`, price: '85.00 CAD', type: 'Bundle Dosha' }); setQuizState({ ...quizState, isOpen: false, result: null }); }}
                    className="w-full bg-[#D4AF37] text-[#0B1A36] py-3 rounded-full uppercase tracking-widest text-xs font-bold hover:bg-[#0B1A36] hover:text-white transition-colors shadow-lg mb-4 max-w-sm mx-auto block">
                    {lang === 'FR' ? `Ajouter le Rituel ${quizState.result.dominant.name}` : `Add ${quizState.result.dominant.name} Ritual`}
                  </button>
                  <button onClick={() => setQuizState({ ...quizState, isOpen: false, result: null })} className="text-[#0B1A36]/50 dark:text-white/50 uppercase tracking-widest text-xs font-bold hover:text-[#D4AF37] transition-colors">
                    {lang === 'FR' ? 'Fermer et explorer le site' : 'Close and explore the site'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AyurvedaPage;
