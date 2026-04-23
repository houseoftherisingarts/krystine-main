import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import gsap from 'gsap';
import { useApp, useBoutique } from '../contexts/AppContext';
import { useEditMode } from '../contexts/EditModeContext';
import EditableText from '../components/edit/EditableText';
import EditableImage from '../components/edit/EditableImage';
import { CONTENT, ASSETS } from '../content';
import { goToRoute, isStaticRoute } from '../lib/staticRoutes';
import { addNewsletterSubscriber } from '../firebase/firestore';
import { points } from '../firebase/points';
import AyurvedaIkigai from '../components/AyurvedaIkigai';
import DropIntro from '../components/DropIntro';
import LiveEventsSection from '../components/LiveEvents';
import { getUpcomingEvents } from '../lib/liveEvents';

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

const InspiratHome: React.FC = () => {
  const { lang, isAdmin, user, member, setSignInOpen } = useApp();
  const { editMode } = useEditMode();
  const t = CONTENT[lang];
  const navigate = useNavigate();

  const [introComplete, setIntroComplete] = useState(false);
  // Opens the Salut Bonjour clip in a full-viewport modal with audio + the
  // native YouTube controls. The hero-card preview stays a muted loop so
  // autoplay is allowed; the modal is where sound lives.
  const [videoOpen, setVideoOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Hide the content up-front so the shared <DropIntro> can play cleanly;
  // the gsap reveal below fires only once the drop+logo sequence finishes.
  useLayoutEffect(() => {
    gsap.set(['.home-content', '.hero-card', '.home-section'], { opacity: 0 });
  }, []);

  // Reveal the page once DropIntro calls back. Same cascade as before —
  // main content fades, hero cards stagger in, then the long sections.
  useEffect(() => {
    if (!introComplete) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      tl.to('.home-content', { opacity: 1, duration: 0.7 })
        .to('.hero-card', { y: 0, opacity: 1, duration: 0.9, stagger: 0.08, ease: 'power3.out' }, '-=0.4')
        .to('.home-section', { y: 0, opacity: 1, duration: 0.8, stagger: 0.1 }, '-=0.5');
    }, containerRef);
    return () => ctx.revert();
  }, [introComplete]);

  const { resolveHref } = useBoutique();

  // Close the video modal on Escape.
  useEffect(() => {
    if (!videoOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setVideoOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [videoOpen]);

  // Follow a tile href — in-app routes via navigate, static bundles via full
  // page nav, external http(s) URLs open in a new tab. The boutique
  // redirect switch is applied up-front so any /boutique tile respects it.
  const followHref = (rawHref: string) => {
    const { href, external } = rawHref.startsWith('/boutique') ? resolveHref(rawHref) : { href: rawHref, external: false };
    if (external) { window.location.href = href; return; }
    if (/^https?:\/\//i.test(href)) { window.open(href, '_blank', 'noopener,noreferrer'); return; }
    if (isStaticRoute(href)) { window.location.href = href; return; }
    navigate(href);
  };

  // Krystine's "Votre Accompagnatrice" tile — sits between the hero and La Pulsation.
  // Uses the custom beige/mandala banner with Krystine composed on the right.
  const founderCard = {
    key: 'home.cards.founder',
    image: '/krystine-banner.png',
    title: t.cards.founder.title,
    subtitle: t.cards.founder.subtitle,
    banner: (t.cards.founder as any).banner,
    cta: (t.cards.founder as any).cta,
    href: (t.cards.founder as any).link,
  };

  // Les trois portes — Podcast · Origine (centre, vedette) · Boutique.
  // Labels + subtitles come from sealed copy in content.ts.
  const mainTiles = [
    {
      key: 'home.cards.blog',
      image: ASSETS.blogBg,
      title: t.cards.blog.title,
      subtitle: t.cards.blog.subtitle,
      banner: (t.cards.blog as any).banner,
      cta: (t.cards.blog as any).cta,
      href: (t.cards.blog as any).link,
    },
    {
      key: 'home.cards.formations',
      image: ASSETS.formationsBg,
      title: t.cards.formations.title,
      subtitle: t.cards.formations.subtitle,
      banner: (t.cards.formations as any).banner,
      cta: (t.cards.formations as any).cta,
      href: (t.cards.formations as any).link,
    },
    {
      key: 'home.cards.shop',
      image: ASSETS.shopBg,
      title: t.cards.shop.title,
      subtitle: t.cards.shop.subtitle,
      banner: (t.cards.shop as any).banner,
      cta: (t.cards.shop as any).cta,
      href: (t.cards.shop as any).link,
    },
  ];

  // ── Pulsation form (newsletter capture) ──
  const [email, setEmail] = useState('');
  const [formState, setFormState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const submitPulsation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setFormState('submitting');
    try {
      await addNewsletterSubscriber({ email: email.trim(), status: 'active', source: 'accueil-pulsation', tags: ['accueil-pulsation'] } as any);
      // Loyalty — award only for signed-in visitors (the Pulsation form
      // also accepts anonymous emails; those earn nothing until sign-in).
      if (user?.uid) {
        try { await points.newsletterSigned(user.uid, 'accueil-pulsation'); } catch { /* non-fatal */ }
      }
      setFormState('success');
      setEmail('');
    } catch {
      setFormState('error');
    }
  };

  // ── Événements à venir — curated list from src/lib/liveEvents.ts. The
  // hourly tick re-runs the upcoming filter so events that fall into the
  // past while the tab is open drop off without a reload; dated-only
  // (includeOpenEnded:false) so the open-ended TEDx / tour tiles don't
  // steal the top three slots. The per-card 60-second countdown lives in
  // LiveEventCard.
  const [eventsTick, setEventsTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setEventsTick(t => t + 1), 60 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);
  const closestEvents = React.useMemo(
    () => getUpcomingEvents({ includeOpenEnded: false }).slice(0, 4),
    [eventsTick]
  );

  // Trilogie — book 3 is kept secret until release: we don't reveal the
  // title; the cover is a playful gold "?" instead.
  const trilogy = [
    { title: 'Nature & Ayurveda',   year: '2018',                                                cover: 'https://storage.googleapis.com/inspirata/Livres/nature%20ayurveda%20front.jpg', mystery: false },
    { title: 'Féminité & Ayurveda', year: '2021',                                                cover: 'https://storage.googleapis.com/inspirata/Livres/feminite%20ayurveda%20front.jpg', mystery: false },
    { title: 'Énergie & Ayurveda', /* hidden — see mystery flag */
      year: lang === 'FR' ? '14 octobre 2026' : 'Oct. 14, 2026',                                  cover: null as string | null, mystery: true },
  ];

  return (
    <div
      ref={containerRef}
      className="relative font-sans text-[#0B1A36] dark:text-[#E0E0E0] min-h-screen transition-colors duration-300 bg-[linear-gradient(180deg,#FEFBF4_0%,#FDF8EC_40%,#FAF3DF_100%)] dark:bg-[linear-gradient(180deg,#050C1A_0%,#0B1A36_55%,#050C1A_100%)]"
    >
      <RaysOfLight />
      <ChakraDecorations />

      {/* INTRO ANIMATION — shared drop (bead falls + splash + Inspirata logo
          pops + overlay fades). Same sequence as the root splash so the
          brand impression carries into /accueil. */}
      {!introComplete && <DropIntro onComplete={() => setIntroComplete(true)} />}

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
        
        {/* Section 2 · Hero — name + the two sealed phrases borrowed back from
            the splash while the splash itself is hidden. Remove these two
            <p> blocks once the proper splash screen ships. */}
        <div className="text-center mb-10 relative z-20">
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[220%] bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.22)_0%,rgba(244,214,121,0.08)_40%,transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(244,214,121,0.16)_0%,transparent_65%)] blur-2xl" />
          <h1
            className="relative text-4xl md:text-6xl font-serif text-[#0B1A36] dark:text-white tracking-[0.2em] uppercase leading-tight"
            style={{ textShadow: '0 1px 24px rgba(212,175,55,0.20)' }}
          >
            Krystine St-Laurent
          </h1>
          <p className="relative mt-6 md:mt-8 font-serif italic text-[#0B1A36]/90 dark:text-white/90 text-lg md:text-2xl lg:text-3xl max-w-3xl mx-auto leading-snug">
            {lang === 'FR'
              ? 'Le corps sait. Il manquait la carte pour le lire.'
              : 'The body knows. What was missing was the map to read it.'}
          </p>
          <p className="relative mt-4 md:mt-5 font-serif italic text-[#0B1A36]/60 dark:text-white/60 text-sm md:text-base max-w-xl mx-auto leading-[1.8]">
            {lang === 'FR'
              ? "Au-delà des tendances, lorsque les recettes toutes faites ne suffisent plus, reprendre SA direction."
              : 'Beyond trends, when ready-made recipes no longer suffice, reclaim YOUR direction.'}
          </p>
          <div className="relative w-24 h-px mx-auto mt-8 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
          <div className="relative w-2 h-2 mx-auto mt-2 rounded-full bg-[#D4AF37]/80 shadow-[0_0_12px_rgba(212,175,55,0.7)]" />

          {/* Soft CTA into the recommendation quiz — sits under the title
              block so visitors who don't yet know which doorway to pick
              get an alternative narrow path. Pre-title answers "what is
              this for?" at a glance; the sub-line sets the expectation
              (only five questions) so clicking feels low-cost. */}
          <p className="relative mt-8 font-serif italic text-[#0B1A36]/85 dark:text-white/85 text-xl md:text-2xl">
            {lang === 'FR' ? 'Par où commencer ?' : 'Where to start?'}
          </p>
          <Link
            to="/guide"
            className="relative inline-flex items-center gap-2.5 mt-3 px-7 py-3.5 rounded-full bg-white/80 dark:bg-white/10 border border-[#D4AF37]/50 hover:bg-[#D4AF37] hover:text-[#0B1A36] hover:shadow-[0_10px_28px_rgba(212,175,55,0.35)] text-[#0B1A36]/85 dark:text-white/90 text-xs md:text-sm uppercase tracking-[0.3em] font-bold backdrop-blur-sm transition-all duration-300"
          >
            <i className="fa-solid fa-compass text-[#D4AF37] text-sm" />
            {t.guideBtn}
            <i className="fa-solid fa-arrow-right text-[11px]" />
          </Link>
          <p className="relative mt-3 font-serif italic text-[#0B1A36]/55 dark:text-white/55 text-xs md:text-sm max-w-md mx-auto">
            {lang === 'FR'
              ? '5 questions à choix pour vous aiguiller selon votre situation.'
              : '5 multiple-choice questions to point you in the right direction based on your situation.'}
          </p>
        </div>

        {/* Section 3 · Votre Accompagnatrice · Krystine — wide featured tile. Text at
            the top-left, video at the bottom-left (within frame), Krystine
            photo visible on the right via the underlying banner image. */}
        <div className="w-full mb-6 lg:mb-8">
          <div className="relative">
            <div
              onClick={() => { if (!editMode) followHref(founderCard.href); }}
              className={`hero-card opacity-0 relative group rounded-[32px] overflow-hidden shadow-2xl transition-all duration-500 w-full h-[340px] md:h-[460px] lg:h-[520px] border border-[#D4AF37]/25 ${editMode ? '' : 'cursor-pointer hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(212,175,55,0.28)] hover:border-[#D4AF37]/60'}`}
            >
              <EditableImage
                fieldKey={`${founderCard.key}.banner-img`}
                defaultSrc={founderCard.image}
                className="absolute inset-0 rounded-[32px] transition-transform duration-[1400ms] ease-out group-hover:scale-[1.04]"
                alt={founderCard.title}
              >
                {/* Subtle left-side wash — lifts legibility of the dark text on
                    the beige mandala area without dimming the image itself. */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/60 via-white/15 to-transparent pointer-events-none" />
              </EditableImage>
              <div className="absolute inset-0 flex flex-col items-start justify-start pt-10 md:pt-14 text-left pl-8 md:pl-14 pr-8 md:pr-16 max-w-2xl pointer-events-none">
                <span className="text-[#8B6F47] uppercase tracking-[0.35em] text-[10px] md:text-xs font-bold mb-3">
                  <EditableText fieldKey={`${founderCard.key}.banner`} defaultValue={founderCard.banner} as="span" />
                </span>
                <h2 className="text-[#0B1A36] text-3xl md:text-5xl font-serif mb-4 pointer-events-auto" onClick={e => editMode && e.stopPropagation()}>
                  <EditableText fieldKey={`${founderCard.key}.title`} defaultValue={founderCard.title} as="span" />
                </h2>
                <p className="text-[#0B1A36]/85 text-sm md:text-base font-serif italic leading-relaxed mb-5 pointer-events-auto" onClick={e => editMode && e.stopPropagation()}>
                  <EditableText fieldKey={`${founderCard.key}.subtitle`} defaultValue={founderCard.subtitle} as="span" />
                </p>
                <span className="inline-flex items-center gap-2 px-5 py-2 border border-[#0B1A36] rounded-full text-[#0B1A36] text-[11px] bg-white/60 backdrop-blur-md uppercase tracking-[0.25em] font-bold group-hover:bg-[#0B1A36] group-hover:text-[#D4AF37] group-hover:shadow-[0_8px_22px_rgba(11,26,54,0.25)] transition-all duration-500 pointer-events-auto" onClick={e => editMode && e.stopPropagation()}>
                  <EditableText fieldKey={`${founderCard.key}.cta`} defaultValue={founderCard.cta} as="span" />
                  <i className="fa-solid fa-arrow-right text-[9px] transition-transform duration-500 group-hover:translate-x-1" />
                </span>
              </div>
            </div>

            {/* Floating Salut Bonjour preview — muted autoplay loop. Shares
                the `hero-card` fade-in so it reveals alongside the banner.
                Hidden on small screens so the copy stays uncluttered.
                Clicking the tile opens a fullscreen modal with audio + the
                native YouTube controls (volume slider, fullscreen, captions). */}
            <div
              onClick={e => e.stopPropagation()}
              className="hero-card opacity-0 hidden md:block absolute bottom-6 left-6 lg:bottom-8 lg:left-9 w-64 lg:w-[22rem] aspect-video rounded-xl overflow-hidden shadow-[0_16px_36px_rgba(0,0,0,0.45)] border border-[#D4AF37]/35 bg-black z-10"
            >
              <span className="absolute top-2 left-2 z-20 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-[#D4AF37] text-[9px] uppercase tracking-[0.25em] font-bold pointer-events-none">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
                Salut Bonjour
              </span>
              {/* Muted ambient iframe — pointer-events-none so the invisible
                  overlay below captures clicks (iframes would otherwise eat
                  them). */}
              <iframe
                title="Salut Bonjour — extrait"
                src="https://www.youtube-nocookie.com/embed/fxzVTt5RfBw?autoplay=1&mute=1&loop=1&playlist=fxzVTt5RfBw&controls=0&rel=0&modestbranding=1&playsinline=1&disablekb=1"
                allow="autoplay; encrypted-media; picture-in-picture"
                frameBorder={0}
                className="w-full h-full pointer-events-none"
              />
              {/* Clickable overlay with a hover cue. */}
              <button
                type="button"
                aria-label={lang === 'FR' ? 'Lire avec le son' : 'Play with sound'}
                onClick={() => {
                  setVideoOpen(true);
                  if (user?.uid) {
                    import('../firebase/points').then(({ points }) => {
                      points.videoWatched(user.uid, 'fxzVTt5RfBw').catch(() => { /* non-fatal */ });
                    });
                  }
                }}
                className="absolute inset-0 z-10 flex items-center justify-center bg-black/0 hover:bg-black/25 transition-colors group"
              >
                <span className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-md border border-white/40 flex items-center justify-center opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all shadow-[0_8px_28px_rgba(0,0,0,0.35)]">
                  <i className="fa-solid fa-volume-high text-white text-base" />
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 5 · Les trois portes — Podcast · Origine · Boutique. */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 mb-12 items-stretch">
          {mainTiles.map((card, idx) => (
            <div
              key={idx}
              onClick={() => { if (!editMode) followHref(card.href); }}
              className={`hero-card opacity-0 block w-full aspect-square relative group rounded-[28px] overflow-hidden shadow-2xl transition-all duration-500 ${editMode ? '' : 'cursor-pointer hover:-translate-y-2 hover:shadow-[0_22px_50px_rgba(212,175,55,0.28)]'} ${card.accent ? 'ring-2 ring-[#D4AF37]/60 hover:ring-[#D4AF37] shadow-[0_14px_44px_rgba(212,175,55,0.28)]' : ''}`}
            >
              {/* Image zooms gently on hover; the underlying <EditableImage>
                  uses background-size:cover so scaling its box effectively
                  zooms the picture inside it. */}
              <EditableImage
                fieldKey={card.key}
                defaultSrc={card.image}
                className="absolute inset-0 rounded-[28px] transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06]"
                alt={card.title}
              >
                <div className={`absolute inset-0 transition-colors duration-500 pointer-events-none ${card.accent ? 'bg-gradient-to-t from-[#0B1A36]/90 via-[#0B1A36]/55 to-[#0B1A36]/25 group-hover:from-[#0B1A36]/80' : 'bg-black/35 group-hover:bg-black/20'}`} />
                {/* Soft gold sheen sweeping across on hover */}
                <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_40%,rgba(244,214,121,0.22)_50%,transparent_60%)] -translate-x-full group-hover:translate-x-full transition-transform duration-[1400ms] ease-out pointer-events-none" />
              </EditableImage>

              {/* Banner eyebrow — top-center gold pill (ÉCOUTER · ENTRER · INFUSER) */}
              {card.banner && (
                <div className="absolute top-5 left-1/2 -translate-x-1/2 pointer-events-none transition-transform duration-500 group-hover:-translate-y-1">
                  <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#D4AF37] text-[#0B1A36] text-[10px] md:text-[11px] uppercase tracking-[0.35em] font-bold shadow-[0_4px_18px_rgba(212,175,55,0.45)] group-hover:shadow-[0_8px_26px_rgba(212,175,55,0.65)] transition-shadow duration-500">
                    <EditableText fieldKey={`${card.key}.banner`} defaultValue={card.banner} as="span" />
                  </span>
                </div>
              )}

              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center w-full px-6 flex flex-col items-center gap-4 pointer-events-none">
                <h2 className="text-white text-2xl lg:text-3xl font-serif drop-shadow-md pointer-events-auto" onClick={e => editMode && e.stopPropagation()}>
                  <EditableText fieldKey={`${card.key}.title`} defaultValue={card.title} as="span" />
                </h2>
                <p className="text-white/85 text-sm md:text-base font-serif italic leading-relaxed max-w-[22rem] pointer-events-auto" onClick={e => editMode && e.stopPropagation()}>
                  <EditableText fieldKey={`${card.key}.subtitle`} defaultValue={card.subtitle} as="span" />
                </p>
                <span className="inline-flex items-center gap-2 px-5 py-2 border border-white/50 rounded-full text-white text-[11px] bg-white/10 backdrop-blur-md uppercase tracking-[0.25em] font-bold group-hover:bg-[#D4AF37] group-hover:text-[#0B1A36] group-hover:border-[#D4AF37] transition-colors duration-500 pointer-events-auto" onClick={e => editMode && e.stopPropagation()}>
                  <EditableText fieldKey={`${card.key}.cta`} defaultValue={card.cta} as="span" />
                  <i className="fa-solid fa-arrow-right text-[9px] transition-transform duration-500 group-hover:translate-x-1" />
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Section 6 · Événements & Conférences — closest 3 upcoming. Dates
            are curated in src/lib/liveEvents.ts; past events drop off via
            the hourly tick. Countdown chip appears within 14 days. */}
        {closestEvents.length > 0 && (
          <section className="home-section w-full mb-12 opacity-0">
            <div className="w-full rounded-[28px] bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-[#0B1A36]/5 dark:border-white/10 px-6 md:px-12 py-10 md:py-14 shadow-[0_8px_32px_rgba(11,26,54,0.06)]">
              <LiveEventsSection
                events={closestEvents}
                kickerFR="Où on se rejoint · Live"
                kickerEN="Where we meet · Live"
                titleFR="Événements & Conférences"
                titleEN="Events & Conferences"
                leadFR="Les quatre prochains rendez-vous."
                leadEN="The next four gatherings."
              />

              <div className="mt-10 text-center">
                <Link
                  to="/formations#events"
                  className="group/all inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase font-bold text-[#D4AF37] hover:text-[#8B6F47] transition-colors"
                >
                  {lang === 'FR' ? 'Voir tous les rendez-vous' : 'See all gatherings'}
                  <i className="fa-solid fa-arrow-right text-[9px] transition-transform duration-300 group-hover/all:translate-x-1" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Section 7 · La Trilogie — full-width showcase with book covers. */}
        <section className="home-section w-full mb-12 opacity-0">
          <div className="w-full rounded-[28px] bg-[rgba(201,183,156,0.14)] dark:bg-white/5 border border-[#0B1A36]/5 dark:border-white/10 px-6 md:px-12 py-10 md:py-14">
            <p className="text-center text-[#D4AF37] uppercase tracking-[0.3em] text-[10px] md:text-[11px] font-bold mb-10">
              {lang === 'FR' ? "L'œuvre · Trilogie aux Éditions de l'Homme" : "The work · Trilogy at Éditions de l'Homme"}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 md:gap-14 max-w-5xl mx-auto">
              {trilogy.map((b, i) => (
                <Link
                  key={i}
                  to="/medias#livres"
                  className="group flex flex-col items-center text-center"
                >
                  {/* Book cover — real image when available; for the unreleased
                      third title we keep it mysterious: a big gold "?" with a
                      sparkle, no title. */}
                  <div className="w-full max-w-[220px] aspect-[1/1.3] rounded-r-[12px] rounded-l-[3px] overflow-hidden relative shadow-[0_18px_40px_rgba(0,0,0,0.18)] border-l-4 border-[#0B1A36]/10 mb-5 transition-all duration-500 group-hover:-translate-y-3 group-hover:rotate-1 group-hover:shadow-[0_28px_52px_rgba(0,0,0,0.28)]">
                    {b.cover ? (
                      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${b.cover})`, backgroundSize: '100% 100%' }} />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#0B1A36] via-[#1A2642] to-[#2E1F3D] text-white overflow-hidden">
                        {/* Soft glow halo behind the ? */}
                        <div className="absolute w-40 h-40 rounded-full bg-[#D4AF37]/20 blur-3xl" />
                        {/* Sparkle decorations for the "cute mysterious" feel */}
                        <i className="fa-solid fa-sparkles absolute top-6 right-7 text-[#D4AF37]/70 text-sm" />
                        <i className="fa-solid fa-sparkles absolute bottom-10 left-6 text-[#D4AF37]/50 text-[10px]" />
                        <i className="fa-regular fa-star absolute top-14 left-8 text-[#D4AF37]/40 text-[9px]" />
                        {/* The ? itself */}
                        <span
                          className="relative font-serif italic text-[#D4AF37] text-[7rem] md:text-[8rem] leading-none"
                          style={{ textShadow: '0 0 30px rgba(212,175,55,0.5), 0 0 60px rgba(212,175,55,0.3)' }}
                        >
                          ?
                        </span>
                      </div>
                    )}
                    {/* Shine on hover */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  </div>

                  <p className="font-serif italic text-lg md:text-xl text-[#0B1A36] dark:text-white group-hover:text-[#D4AF37] transition-colors">
                    {b.mystery ? (lang === 'FR' ? 'À Révéler' : 'To Be Revealed') : b.title}
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-[#0B1A36]/50 dark:text-white/50 mt-1">{b.year}</p>
                </Link>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Link
                to="/medias#livres"
                className="group/tril inline-flex items-center gap-2 px-6 py-2.5 border border-[#D4AF37] rounded-full text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#0B1A36] hover:shadow-[0_8px_22px_rgba(212,175,55,0.35)] text-[11px] tracking-[0.25em] uppercase font-bold transition-all duration-300"
              >
                {lang === 'FR' ? 'Découvrir la trilogie' : 'Discover the trilogy'}
                <i className="fa-solid fa-arrow-right text-[9px] transition-transform duration-300 group-hover/tril:translate-x-1" />
              </Link>
            </div>
          </div>
        </section>

        {/* Section 8 · La Pulsation — newsletter capture, full width, last block
            before the footer. Form stays centered inside the wide container. */}
        <section className="home-section w-full mb-4 opacity-0">
          <div className="w-full rounded-[28px] bg-white/70 dark:bg-[#0B1A36]/50 backdrop-blur-sm border border-[#D4AF37]/25 px-6 md:px-12 py-10 md:py-14 shadow-[0_8px_32px_rgba(11,26,54,0.08)] text-center">
            <p className="font-serif italic text-xl md:text-2xl text-[#0B1A36] dark:text-white mb-2">
              {lang === 'FR' ? 'Une correspondance' : 'A correspondence'}
            </p>
            <p className="text-xs md:text-sm text-[#0B1A36]/60 dark:text-white/60 mb-8 font-serif italic">
              {lang === 'FR' ? 'Un fil de sagesse. Quelques mots, lorsque cela compte.' : 'A thread of wisdom. A few words, when it matters.'}
            </p>

            {formState === 'success' ? (
              <p className="font-serif italic text-[#D4AF37] py-4 text-base md:text-lg">
                {lang === 'FR' ? 'Merci. Vous recevrez bientôt votre première correspondance.' : 'Thank you. You will soon receive your first correspondence.'}
              </p>
            ) : (
              <form onSubmit={submitPulsation} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={lang === 'FR' ? 'Votre adresse courriel' : 'Your email address'}
                  aria-label={lang === 'FR' ? 'Votre adresse courriel' : 'Your email address'}
                  className="flex-1 min-w-0 px-5 py-3 rounded-full border border-[#0B1A36]/15 dark:border-white/15 bg-white dark:bg-white/5 text-sm text-[#0B1A36] dark:text-white placeholder:text-[#0B1A36]/40 dark:placeholder:text-white/40 focus:outline-none focus:border-[#D4AF37]"
                />
                <button
                  type="submit"
                  disabled={formState === 'submitting'}
                  className="px-7 py-3 rounded-full bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] hover:bg-[#D4AF37] hover:text-[#0B1A36] hover:shadow-[0_10px_26px_rgba(212,175,55,0.45)] hover:-translate-y-0.5 font-bold uppercase tracking-[0.25em] text-[11px] transition-all duration-300 shadow-md disabled:opacity-60 disabled:translate-y-0 disabled:shadow-md"
                >
                  {formState === 'submitting' ? <i className="fa-solid fa-circle-notch fa-spin" /> : (lang === 'FR' ? 'Rejoindre' : 'Join')}
                </button>
              </form>
            )}

            {formState === 'error' && (
              <p className="mt-4 text-[11px] text-red-700 dark:text-red-400">
                {lang === 'FR' ? 'Une erreur est survenue. Veuillez réessayer ou nous écrire à equipe@inspiratanature.com.' : 'An error occurred. Please try again or write to us at equipe@inspiratanature.com.'}
              </p>
            )}

            <p className="mt-6 text-[10px] text-[#0B1A36]/50 dark:text-white/50">
              {lang === 'FR' ? "Désabonnement en un clic. Votre adresse n'est jamais revendue." : 'Unsubscribe in one click. Your address is never resold.'}
            </p>
          </div>
        </section>

        {/* Section 9 · Quiz Dosha — Ikigai + intro block mirroring /quiz.
            Every interactive element (circles, CTA) navigates to /quiz. */}
        <section className="home-section w-full mb-4 opacity-0">
          <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-24 px-2 md:px-6 py-8 md:py-12">
            {/* Ikigai — clicks navigate to /quiz */}
            <div className="relative flex items-center justify-center lg:w-1/2">
              <AyurvedaIkigai
                doshas={t.ayurveda.doshas}
                onDoshaClick={() => navigate('/quiz')}
                onQuizClick={() => navigate('/quiz')}
                lang={lang}
                filterId="home"
              />
            </div>

            {/* Intro text + CTA */}
            <div className="lg:w-1/2 text-center lg:text-left max-w-xl">
              <span className="text-[#D4AF37] uppercase tracking-[0.2em] text-xs font-semibold block mb-2">{t.ayurveda.introTitle}</span>
              <h3 className="text-3xl md:text-5xl font-serif text-[#0B1A36] dark:text-white mb-6">{t.ayurveda.title}</h3>
              <p className="text-[#0B1A36]/70 dark:text-white/70 font-serif text-lg leading-relaxed mb-6 italic">{t.ayurveda.introText}</p>
              <div className="bg-white dark:bg-[#0B1A36]/60 border border-[#0B1A36]/5 dark:border-white/5 p-8 rounded-[24px] shadow-lg mb-8">
                <p className="text-[#0B1A36]/80 dark:text-white/80 leading-relaxed mb-4 font-medium">{t.ayurveda.desc}</p>
                <p className="text-[#0B1A36] dark:text-white font-bold">{t.ayurveda.quizPrompt}</p>
              </div>
              <Link
                to="/quiz"
                className="group/quiz inline-flex items-center gap-2 bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] px-10 py-4 rounded-full font-bold uppercase tracking-widest text-sm shadow-lg hover:bg-[#D4AF37] hover:text-[#0B1A36] hover:shadow-[0_14px_32px_rgba(212,175,55,0.45)] hover:-translate-y-0.5 transition-all duration-300"
              >
                {t.ayurveda.quizBtn}
                <i className="fa-solid fa-arrow-right text-[10px] transition-transform duration-300 group-hover/quiz:translate-x-1" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Full-screen video modal ── */}
      {/* Opens from the Salut Bonjour preview tile. Unmuted autoplay, native
          YouTube controls (volume, quality, captions, fullscreen button),
          closes on backdrop click or Escape. */}
      {videoOpen && (
        <div
          className="fixed inset-0 z-[95] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setVideoOpen(false)}
        >
          <button
            type="button"
            onClick={() => setVideoOpen(false)}
            aria-label={lang === 'FR' ? 'Fermer' : 'Close'}
            className="absolute top-5 right-5 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur flex items-center justify-center text-white transition-colors"
          >
            <i className="fa-solid fa-times text-lg" />
          </button>
          <div
            className="relative w-full max-w-5xl aspect-video rounded-[20px] overflow-hidden shadow-2xl bg-black"
            onClick={e => e.stopPropagation()}
          >
            <iframe
              title="Salut Bonjour"
              src="https://www.youtube-nocookie.com/embed/fxzVTt5RfBw?autoplay=1&rel=0&modestbranding=1&playsinline=1"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              frameBorder={0}
              className="w-full h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default InspiratHome;
