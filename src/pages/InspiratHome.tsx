import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import gsap from 'gsap';
import { useApp } from '../contexts/AppContext';
import { useEditMode } from '../contexts/EditModeContext';
import EditableText from '../components/edit/EditableText';
import EditableImage from '../components/edit/EditableImage';
import { CONTENT, ASSETS } from '../content';
import { askInternalAgent, type AgentReply } from '../lib/internalAgent';
import { goToRoute } from '../lib/staticRoutes';

// Chakra decorations — kept subtle, they're the cultural undertone.
const ChakraDecorations = () => (
  <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
    <img src={ASSETS.chakras[0]} className="absolute -right-[250px] -top-[150px] w-[800px] opacity-[0.04] dark:opacity-[0.08] dark:invert" alt="" />
    <img src={ASSETS.chakras[1]} className="absolute -left-[150px] bottom-[5%] w-[500px] opacity-[0.03] dark:opacity-[0.06] rotate-45 dark:invert" alt="" />
    <img src={ASSETS.chakras[4]} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] opacity-[0.02] dark:opacity-[0.04] dark:invert" alt="" />
  </div>
);

// Luminous "ray of light" atmosphere — drives the eye from the title down to the cards.
// Layers: (1) warm top radial halo, (2) an oblique sun-ray streak, (3) a soft core glow
// behind the title, (4) a warm base wash to lift the grid.
const RaysOfLight = () => (
  <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
    {/* Top radial halo — the apparent "light source" */}
    <div className="absolute -top-[30vh] left-1/2 -translate-x-1/2 w-[120vw] h-[110vh] bg-[radial-gradient(ellipse_at_center,rgba(250,240,210,0.55)_0%,rgba(250,240,210,0.20)_30%,transparent_65%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.14)_0%,rgba(212,175,55,0.05)_35%,transparent_70%)]" />
    {/* Central soft core glow, pooling around the title */}
    <div className="absolute top-[20vh] left-1/2 -translate-x-1/2 w-[70vw] h-[70vh] bg-[radial-gradient(ellipse_at_center,rgba(244,214,121,0.28)_0%,transparent_60%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(244,214,121,0.09)_0%,transparent_65%)] blur-3xl" />
    {/* Oblique ray streak — slanted from upper-left, dissolving toward lower-right */}
    <div
      className="absolute -top-[10vh] -left-[10vw] w-[140vw] h-[80vh] opacity-60 dark:opacity-40 mix-blend-screen"
      style={{
        background: 'linear-gradient(115deg, transparent 35%, rgba(244,214,121,0.16) 48%, rgba(255,248,220,0.22) 52%, rgba(244,214,121,0.12) 56%, transparent 70%)',
      }}
    />
    {/* Warm base wash — lifts the card area without greying the copy */}
    <div className="absolute inset-x-0 bottom-0 h-[45vh] bg-[linear-gradient(to_top,rgba(252,245,228,0.5)_0%,transparent_100%)] dark:bg-[linear-gradient(to_top,rgba(11,26,54,0.35)_0%,transparent_100%)]" />
  </div>
);

const QUIZ_DATA = [
  { question: "Comment décririez-vous votre digestion ?", options: [{ text: "Inconstante, votre appétit fluctue.", type: 'vata' }, { text: "Forte, vous devenez irritable si vous mangez tard.", type: 'pitta' }, { text: "Stable, vous vous sentez rassasié longtemps après les repas.", type: 'kapha' }] },
  { question: "Comment réagissez-vous au stress ?", options: [{ text: "Tendance à devenir anxieux et inquiet.", type: 'vata' }, { text: "Tendance à devenir irritable et impatient.", type: 'pitta' }, { text: "Vous retirez et évitez les conflits.", type: 'kapha' }] },
  { question: "Comment gérez-vous votre créativité ?", options: [{ text: "Très créatif, commence plusieurs projets à la fois.", type: 'vata' }, { text: "Créatif dans le leadership, ouvre de nouvelles voies.", type: 'pitta' }, { text: "Méthodique, calme, ancré.", type: 'kapha' }] },
  { question: "Comment décririez-vous votre tempérament ?", options: [{ text: "Enthousiaste, aime essayer de nouvelles choses.", type: 'vata' }, { text: "Déterminé, axé sur les objectifs.", type: 'pitta' }, { text: "Facile à vivre, préfère suivre le courant.", type: 'kapha' }] },
];

const InspiratHome: React.FC = () => {
  const { lang, addToCart, isAdmin, user, member, setSignInOpen } = useApp();
  const { editMode } = useEditMode();
  const t = CONTENT[lang];
  const navigate = useNavigate();

  const [gemQuery, setGemQuery] = useState('');
  const [gemResult, setGemResult] = useState<AgentReply | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Intro animation — a small gold drop falls and splashes, then the overlay
  // dissolves and the page content reveals. The splash screen already shows
  // the full brand drop, so here we keep it short and don't re-show the logo.
  useLayoutEffect(() => {
    if (introComplete) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: () => setIntroComplete(true) });
      gsap.set(['.home-content', '.hero-card', '.gem-bar', '.guide-btn'], { opacity: 0 });
      gsap.set(dropRef.current, { y: '-45vh', scale: 0.5, opacity: 1 });

      tl.to(dropRef.current, { y: 0, duration: 1.2, ease: 'power4.in' })
        .to(dropRef.current, { scaleX: 1.6, scaleY: 0.05, opacity: 0, duration: 0.5, ease: 'power2.out' })
        .to(introRef.current, { opacity: 0, pointerEvents: 'none', duration: 0.7 }, '-=0.15')
        .to('.home-content', { opacity: 1, duration: 0.7 }, '<')
        .to('.hero-card', { y: 0, opacity: 1, duration: 0.9, stagger: 0.08, ease: 'power3.out' }, '-=0.3')
        .to('.gem-bar', { y: 0, opacity: 1, duration: 0.8 }, '-=0.6')
        .to('.guide-btn', { opacity: 1, duration: 0.8 }, '-=0.4');
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const handleGemSearch = () => {
    if (!gemQuery.trim()) return;
    setIsThinking(true);
    setGemResult(null);
    // Internal agent — runs locally, no external API call, no data leaves the browser.
    setTimeout(() => {
      setGemResult(askInternalAgent(gemQuery, lang));
      setIsThinking(false);
    }, 350);
  };

  // Krystine is displayed separately as a featured header tile — visually
  // distinct from the 3 main doorways (Découvrir / Apprendre / Prendre soin).
  const founderCard = {
    key: 'home.cards.founder',
    image: ASSETS.founder,
    hoverImage: ASSETS.founderHover,
    title: t.cards.founder.title,
    subtitle: t.cards.founder.subtitle,
    href: '/krystine',
  };

  // Main 3 tiles, each with a banner label (eyebrow) that states the intent.
  const mainTiles = [
    {
      key: 'home.cards.blog',
      image: ASSETS.blogBg,
      title: t.cards.blog.title,
      subtitle: t.cards.blog.subtitle,
      banner: (t.cards.blog as any).banner,
      href: '/medias',
    },
    {
      key: 'home.cards.formations',
      image: ASSETS.formationsBg,
      title: t.cards.formations.title,
      subtitle: t.cards.formations.subtitle,
      banner: (t.cards.formations as any).banner,
      href: '/formations',
    },
    {
      key: 'home.cards.shop',
      image: ASSETS.shopBg,
      title: t.cards.shop.title,
      subtitle: t.cards.shop.subtitle,
      banner: (t.cards.shop as any).banner,
      href: '/boutique',
      secondaryCta: { label: t.cards.shop.locations, href: '/points-de-vente' },
    },
  ];

  return (
    <div
      ref={containerRef}
      className="relative font-sans text-[#0B1A36] dark:text-[#E0E0E0] min-h-screen transition-colors duration-300 bg-[linear-gradient(180deg,#FEFBF4_0%,#FDF8EC_40%,#FAF3DF_100%)] dark:bg-[linear-gradient(180deg,#050C1A_0%,#0B1A36_55%,#050C1A_100%)]"
    >
      <RaysOfLight />
      <ChakraDecorations />

      {/* INTRO ANIMATION — small gold drop falls + splashes, then dissolves. */}
      <div ref={introRef} className="fixed inset-0 z-50 flex items-center justify-center bg-white pointer-events-none overflow-hidden">
        <div ref={dropRef} className="w-2.5 h-2.5 bg-gradient-to-br from-[#D4AF37] to-[#B8960C] rounded-full shadow-[0_4px_15px_rgba(212,175,55,0.6)] z-20" />
      </div>

      {/* Floating auth chips (top-right) — replace the hidden NavBar on /accueil.
          Admins get TWO chips: "Mon espace" (client view) and a separate
          "Admin" shortcut, so the label always matches its destination. */}
      <div className="fixed top-5 right-5 md:top-6 md:right-8 z-40 flex items-center gap-2">
        {user ? (
          <>
            <Link
              to="/compte"
              title={member?.displayName || user.displayName || user.email || ''}
              className="inline-flex items-center gap-2 pl-2 pr-4 py-1.5 rounded-full bg-white/80 dark:bg-[#0B1A36]/80 backdrop-blur-md border border-[#D4AF37]/30 shadow-md hover:border-[#D4AF37] hover:shadow-[0_0_18px_rgba(212,175,55,0.25)] transition-all"
            >
              {(member?.photoURL || user.photoURL) ? (
                <img src={member?.photoURL || user.photoURL!} alt="" className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[11px] font-bold text-[#D4AF37]">
                  {(user.email?.[0] || '?').toUpperCase()}
                </div>
              )}
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#0B1A36] dark:text-white hidden sm:inline">
                {member?.dosha || (lang === 'FR' ? 'Mon espace' : 'My space')}
              </span>
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                title={lang === 'FR' ? 'Tableau de bord admin' : 'Admin dashboard'}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4AF37] text-[#0B1A36] shadow-md hover:bg-white transition-colors"
              >
                <i className="fa-solid fa-shield-halved text-[11px]" />
                <span className="text-[10px] uppercase tracking-[0.25em] font-bold hidden sm:inline">
                  Admin
                </span>
              </Link>
            )}
          </>
        ) : (
          <button
            onClick={() => setSignInOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/80 dark:bg-[#0B1A36]/80 backdrop-blur-md border border-[#D4AF37]/30 shadow-md hover:border-[#D4AF37] hover:shadow-[0_0_18px_rgba(212,175,55,0.25)] transition-all"
          >
            <i className="fa-solid fa-user text-[11px] text-[#D4AF37]" />
            <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-[#0B1A36] dark:text-white">
              {lang === 'FR' ? 'Connexion' : 'Sign in'}
            </span>
          </button>
        )}
      </div>

      {/* MAIN CONTENT */}
      <main className="home-content pt-44 pb-10 px-4 md:px-8 w-full max-w-[1800px] mx-auto flex flex-col items-center min-h-screen opacity-0 relative z-10 justify-between">
        
        {/* Title — the focal point the eye lands on first. Gold halo + fine divider guide downward. */}
        <div className="text-center mb-10 relative z-20">
          {/* Halo behind the title — the "source" of the rays */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[220%] bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.22)_0%,rgba(244,214,121,0.08)_40%,transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(244,214,121,0.16)_0%,transparent_65%)] blur-2xl" />
          <span className="relative text-[#D4AF37] uppercase tracking-[0.35em] text-[10px] md:text-xs font-bold block mb-4">
            {lang === 'FR' ? 'Art de vivre conscient' : 'Conscious Living'}
          </span>
          <h1
            className="relative text-4xl md:text-6xl font-serif text-[#0B1A36] dark:text-white tracking-[0.2em] uppercase leading-tight"
            style={{ textShadow: '0 1px 24px rgba(212,175,55,0.20)' }}
          >
            Krystine St-Laurent
          </h1>
          {/* Animated glow divider — draws the eye downward to the cards */}
          <div className="relative w-24 h-px mx-auto mt-5 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
          <div className="relative w-2 h-2 mx-auto mt-2 rounded-full bg-[#D4AF37]/80 shadow-[0_0_12px_rgba(212,175,55,0.7)]" />
        </div>

        {/* Founder — standalone featured tile, wider and shorter, clearly
            separate from the 3 "doorways" below. */}
        <div className="w-full mb-6 lg:mb-8 flex justify-center">
          <div
            onClick={() => { if (!editMode) goToRoute(navigate, founderCard.href); }}
            className={`hero-card opacity-0 relative group rounded-[32px] overflow-hidden shadow-2xl transition-all duration-500 w-full max-w-[1200px] h-[280px] lg:h-[340px] border border-[#D4AF37]/25 ${editMode ? '' : 'cursor-pointer hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(212,175,55,0.28)] hover:border-[#D4AF37]/60'}`}
          >
            <EditableImage
              fieldKey={founderCard.key}
              defaultSrc={founderCard.image}
              className="absolute inset-0 rounded-[32px]"
              alt={founderCard.title}
            >
              {founderCard.hoverImage && !editMode && (
                <div className="absolute inset-0 bg-cover bg-center opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" style={{ backgroundImage: `url(${founderCard.hoverImage})` }} />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-[#0B1A36]/75 via-[#0B1A36]/35 to-transparent group-hover:from-[#0B1A36]/65 transition-colors pointer-events-none" />
            </EditableImage>
            <div className="absolute inset-0 flex flex-col items-start justify-center text-left pl-8 md:pl-14 pr-8 pointer-events-none">
              <span className="text-[#D4AF37] uppercase tracking-[0.35em] text-[10px] md:text-xs font-bold mb-3">
                {lang === 'FR' ? 'Votre guide' : 'Your guide'}
              </span>
              <h2 className="text-white text-3xl md:text-5xl font-serif mb-3 drop-shadow-md pointer-events-auto" onClick={e => editMode && e.stopPropagation()}>
                <EditableText fieldKey={`${founderCard.key}.title`} defaultValue={founderCard.title} as="span" />
              </h2>
              <span className="inline-flex items-center gap-2 px-5 py-2 border border-white/40 rounded-full text-white text-xs bg-white/10 backdrop-blur-md uppercase tracking-widest hover:bg-white/20 transition-colors pointer-events-auto" onClick={e => editMode && e.stopPropagation()}>
                <EditableText fieldKey={`${founderCard.key}.subtitle`} defaultValue={founderCard.subtitle} as="span" />
              </span>
            </div>
          </div>
        </div>

        {/* Three main "doorways" — each with an eyebrow banner naming its intent */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 mb-10 flex-grow items-stretch">
          {mainTiles.map((card, idx) => (
            <div
              key={idx}
              onClick={() => { if (!editMode) goToRoute(navigate, card.href); }}
              className={`hero-card opacity-0 block w-full h-[380px] lg:h-[58vh] relative group rounded-[28px] overflow-hidden shadow-2xl transition-all duration-500 ${editMode ? '' : 'cursor-pointer hover:-translate-y-2 hover:shadow-[0_22px_50px_rgba(212,175,55,0.28)]'}`}
            >
              <EditableImage
                fieldKey={card.key}
                defaultSrc={card.image}
                className="absolute inset-0 rounded-[28px]"
                alt={card.title}
              >
                <div className="absolute inset-0 bg-black/25 group-hover:bg-black/15 transition-colors pointer-events-none" />
              </EditableImage>

              {/* Banner eyebrow — top-center gold pill */}
              {card.banner && (
                <div className="absolute top-5 left-1/2 -translate-x-1/2 pointer-events-none">
                  <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#D4AF37] text-[#0B1A36] text-[10px] md:text-[11px] uppercase tracking-[0.35em] font-bold shadow-[0_4px_18px_rgba(212,175,55,0.45)]">
                    <EditableText fieldKey={`${card.key}.banner`} defaultValue={card.banner} as="span" />
                  </span>
                </div>
              )}

              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center w-full px-4 flex flex-col items-center gap-3 pointer-events-none">
                <h2 className="text-white text-2xl lg:text-3xl font-serif mb-2 drop-shadow-md pointer-events-auto" onClick={e => editMode && e.stopPropagation()}>
                  <EditableText fieldKey={`${card.key}.title`} defaultValue={card.title} as="span" />
                </h2>
                <span className="inline-flex items-center gap-2 px-5 py-2 border border-white/40 rounded-full text-white text-xs bg-white/10 backdrop-blur-md uppercase tracking-widest hover:bg-white/20 transition-colors pointer-events-auto" onClick={e => editMode && e.stopPropagation()}>
                  <EditableText fieldKey={`${card.key}.subtitle`} defaultValue={card.subtitle} as="span" />
                </span>
                {card.secondaryCta && (
                  <button
                    onClick={(e) => { e.stopPropagation(); if (!editMode) goToRoute(navigate, card.secondaryCta!.href); }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 border border-white/30 rounded-full text-white text-[10px] bg-white/5 backdrop-blur-md uppercase tracking-widest hover:bg-white/20 transition-colors pointer-events-auto"
                  >
                    <EditableText fieldKey={`${card.key}.secondaryCta`} defaultValue={card.secondaryCta.label} as="span" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Gemini AI Search Bar — secondary focal point; warmer halo guides the eye here next. */}
        <div className="gem-bar w-full max-w-xl px-4 relative z-10 flex flex-col items-center mb-6 opacity-0">
          <div className="relative group w-full">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#D4AF37]/40 via-[#F4D679]/30 to-[#D4AF37]/40 rounded-full blur-md opacity-60 group-hover:opacity-90 transition-opacity" />
            <div className="relative flex items-center rounded-full shadow-[0_6px_30px_rgba(212,175,55,0.18)] p-2 bg-white/85 dark:bg-[#0B1A36]/80 backdrop-blur-md border border-[#D4AF37]/30">
              <div className="pl-4 pr-3 text-[#D4AF37] text-lg shrink-0">
                <i className="fa-solid fa-sparkles" />
              </div>
              <input
                type="text"
                value={gemQuery}
                onChange={e => setGemQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGemSearch()}
                placeholder={t.gem.placeholder}
                className="flex-1 min-w-0 bg-transparent border-none outline-none text-[#0B1A36] dark:text-white placeholder:text-[#0B1A36]/40 dark:placeholder:text-white/40 font-medium py-3 text-sm pr-2"
              />
              <button
                onClick={handleGemSearch}
                disabled={isThinking}
                className="bg-[#0B1A36] dark:bg-white text-white dark:text-[#0B1A36] px-6 py-2.5 rounded-full hover:bg-[#D4AF37] transition-colors font-medium text-sm shadow-md shrink-0"
              >
                {isThinking ? <i className="fa-solid fa-circle-notch fa-spin" /> : t.gem.button}
              </button>
            </div>
          </div>
        </div>

        {/* Gem Result Modal */}
        {gemResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1A36]/20 backdrop-blur-md" onClick={() => setGemResult(null)}>
            <div className="relative bg-white dark:bg-[#0B1A36] max-w-lg w-full rounded-[30px] p-10 shadow-2xl border border-[#D4AF37]/20" onClick={e => e.stopPropagation()}>
              <button onClick={() => setGemResult(null)} className="absolute top-6 right-6 text-[#0B1A36]/30 hover:text-[#0B1A36] dark:text-white/30 dark:hover:text-white">
                <i className="fa-solid fa-times text-xl" />
              </button>
              <div className="flex flex-col items-center mb-6">
                <img src={ASSETS.logo} alt="Krystine St-Laurent" className="h-10 w-auto mb-4 opacity-80 dark:invert dark:brightness-[1.5]" />
                <h3 className="font-serif text-3xl text-[#0B1A36] dark:text-white italic">{t.gem.modalTitle}</h3>
              </div>
              <p className="text-center font-medium font-serif text-lg text-[#0B1A36]/80 dark:text-white/80">{gemResult.text}</p>
              {gemResult.href && gemResult.ctaLabel && (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={() => { const href = gemResult.href!; setGemResult(null); goToRoute(navigate, href); }}
                    className="inline-flex items-center gap-2 bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] px-8 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors shadow-md"
                  >
                    {gemResult.ctaLabel}
                    <i className="fa-solid fa-arrow-right" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Guide Button */}
        <div className="guide-btn mt-6 pb-8 opacity-0">
          <button
            onClick={() => navigate('/medias')}
            className="bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] px-10 py-3 rounded-[30px] hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors uppercase tracking-widest text-xs font-semibold shadow-lg transform hover:-translate-y-0.5"
          >
            {t.guideBtn}
          </button>
        </div>

        {/* Developer Signature */}
        <a href="https://www.lesalondesinconnus.com" target="_blank" rel="noopener noreferrer"
          className="w-full py-8 flex flex-col items-center opacity-40 hover:opacity-80 transition-opacity">
          <p className="text-[10px] uppercase tracking-widest mb-1">Plateforme conceptualisée par</p>
          <span className="text-xs font-serif italic">Le Salon des Inconnus</span>
        </a>
      </main>
    </div>
  );
};

export default InspiratHome;
