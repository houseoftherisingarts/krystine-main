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
import PremiersRituelsHero from '../components/PremiersRituelsHero';
import DropIntro from '../components/DropIntro';
import LiveEventsSection from '../components/LiveEvents';
import CompassOfYou from '../components/CompassOfYou';
import ScrollDecorations from '../components/ScrollDecorations';
import RevealSection from '../components/RevealSection';
import EditorialSectionHeader from '../components/EditorialSectionHeader';
import Sprig from '../components/Sprig';
import OrigineHomeSection from '../components/OrigineHomeSection';
import TodayConferenceBanner from '../components/TodayConferenceBanner';
import { motion, useReducedMotion } from 'framer-motion';
import { getUpcomingEvents } from '../lib/liveEvents';
import { useSiteFlags } from '../contexts/SiteFlagsContext';

// ParchmentBackdrop previously composited an SVG palm-frond + fibre
// noise + vignettes on top of an ivoire body. Since `krystine-bg.jpg`
// (set on <body> in index.html) already carries the real parchment
// texture + the palm-frond shadow, the synthetic layer is retired —
// leaving only the photo as the furthest layer of every page.
// Kept as a no-op component so existing imports / consumers don't
// break; returns null.
const ParchmentBackdrop: React.FC = () => null;

const InspiratHome: React.FC = () => {
  const { lang, isAdmin, user, member, setSignInOpen } = useApp();
  const { editMode, saveImage } = useEditMode();
  const { showTedx } = useSiteFlags();
  const t = CONTENT[lang];
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  // One-shot reset for the "Votre Accompagnatrice" banner. Visiting
  // /accueil?reset-founder-image=1 as admin overwrites the Firestore
  // override with the shipped default (/krystine-banner.png) and then
  // cleans the URL. This exists because the in-app edit picker is
  // sometimes the wrong tool (e.g. when the override was set to a
  // now-broken URL that can no longer be found via the normal UI).
  useEffect(() => {
    if (!isAdmin) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset-founder-image') !== '1') return;
    (async () => {
      try {
        // Field key was bumped to `-v2` after a stale Firestore override
        // from before the parchment redesign couldn't be cleared without
        // real Firebase admin credentials. The reset writes to the new
        // key so admins editing now stay in sync with what visitors see.
        await saveImage('home.cards.founder.banner-img-v2', {
          url: '/krystine-banner.png',
          focalX: 0.5,
          focalY: 0.5,
        });
        // Strip the flag so a refresh doesn't re-trigger.
        params.delete('reset-founder-image');
        const clean = window.location.pathname + (params.toString() ? `?${params}` : '') + window.location.hash;
        window.history.replaceState(null, '', clean);
        // Minimal confirmation — not worth the weight of a toast system here.
        alert('Bannière Krystine restaurée.');
      } catch (err) {
        console.error('[reset-founder-image] failed', err);
        alert('La restauration a échoué. Voir la console.');
      }
    })();
  }, [isAdmin, saveImage]);

  const [introComplete, setIntroComplete] = useState(false);
  // Opens the Salut Bonjour clip in a full-viewport modal with audio + the
  // native YouTube controls. The hero-card preview stays a muted loop so
  // autoplay is allowed; the modal is where sound lives.
  const [videoOpen, setVideoOpen] = useState(false);

  // YouTube refuses embeds on production HTTPS when it can't verify the
  // host; without an explicit `origin` param + a Referrer-Policy that
  // leaks the origin, we get the grey "Video unavailable" screen even
  // though the video plays fine on localhost. Compute the current origin
  // here and thread it through both iframe URLs. (firebase.json also sets
  // Referrer-Policy: strict-origin-when-cross-origin for the same reason.)
  const ytOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const ytPreviewSrc = `https://www.youtube.com/embed/fxzVTt5RfBw?autoplay=1&mute=1&loop=1&playlist=fxzVTt5RfBw&controls=0&rel=0&modestbranding=1&playsinline=1&disablekb=1&origin=${encodeURIComponent(ytOrigin)}`;
  const ytModalSrc   = `https://www.youtube.com/embed/fxzVTt5RfBw?autoplay=1&rel=0&modestbranding=1&playsinline=1&origin=${encodeURIComponent(ytOrigin)}`;

  const containerRef = useRef<HTMLDivElement>(null);

  // Hide the up-front content so the shared <DropIntro> can play cleanly.
  // Only the home-content wrapper and the .hero-card tiles are touched
  // here — every subsequent section uses <RevealSection> (framer-motion
  // whileInView) instead, so they reveal as the user scrolls into them
  // rather than all-at-once at intro end.
  useLayoutEffect(() => {
    gsap.set(['.home-content', '.hero-card'], { opacity: 0 });
  }, []);

  // Reveal the page once DropIntro calls back. Main content fades; the
  // three .hero-card tiles stagger in. Sections below the fold animate
  // themselves on scroll via RevealSection.
  useEffect(() => {
    if (!introComplete) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      tl.to('.home-content', { opacity: 1, duration: 0.7 })
        .to('.hero-card', { y: 0, opacity: 1, duration: 0.9, stagger: 0.08, ease: 'power3.out' }, '-=0.4');
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
  // `pictoIcon` is an Origine signature picto (Font-Awesome glyph) that
  // floats above the title on each tile, matching the moodboard.
  const mainTiles = [
    {
      key: 'home.cards.blog',
      image: ASSETS.blogBg,
      title: t.cards.blog.title,
      subtitle: t.cards.blog.subtitle,
      banner: (t.cards.blog as any).banner,
      cta: (t.cards.blog as any).cta,
      href: (t.cards.blog as any).link,
      pictoIcon: 'fa-microphone-lines',
    },
    {
      key: 'home.cards.formations',
      image: ASSETS.formationsBg,
      title: t.cards.formations.title,
      subtitle: t.cards.formations.subtitle,
      banner: (t.cards.formations as any).banner,
      cta: (t.cards.formations as any).cta,
      href: (t.cards.formations as any).link,
      pictoIcon: 'fa-book-open',
    },
    {
      key: 'home.cards.shop',
      image: ASSETS.shopBg,
      title: t.cards.shop.title,
      subtitle: t.cards.shop.subtitle,
      banner: (t.cards.shop as any).banner,
      bannerSub: (t.cards.shop as any).bannerSub,
      cta: (t.cards.shop as any).cta,
      href: (t.cards.shop as any).link,
      pictoIcon: 'fa-basket-shopping',
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
  // Origine cohort has its own dedicated section above the events grid, so
  // we filter it out here to avoid duplicating it in the "Événements"
  // grille. Past, TEDx, and open-ended items are already excluded by the
  // base query; this just removes the cohort tile.
  const closestEvents = React.useMemo(
    () => getUpcomingEvents({ includeOpenEnded: false, hideTedx: !showTedx })
      .filter(ev => ev.id !== 'origine-cohorte-fondatrice')
      .slice(0, 4),
    [eventsTick, showTedx]
  );

  // Trilogie — book 3 is kept secret until release: we don't reveal the
  // title; the cover is a playful gold "?" instead.
  const trilogy = [
    { title: 'Nature & Ayurveda',   year: '2018',                                                cover: 'https://storage.googleapis.com/inspirata/Livres/nature%20ayurveda%20front.jpg', mystery: false },
    { title: 'Féminité & Ayurveda', year: '2021',                                                cover: 'https://storage.googleapis.com/inspirata/Livres/feminite%20ayurveda%20front.jpg', mystery: false },
    { title: '', /* third title kept secret until release — see mystery flag */
      year: lang === 'FR' ? '4 novembre 2026' : 'Nov. 4, 2026',                                  cover: null as string | null, mystery: true },
  ];

  return (
    <div
      ref={containerRef}
      className="relative font-sans text-[#3A251E] dark:text-[#E0E0E0] min-h-screen transition-colors duration-300"
    >
      <ParchmentBackdrop />
      <ScrollDecorations />

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
              className="inline-flex items-center gap-2 pl-2 pr-4 py-1.5 rounded-full bg-white/80 dark:bg-[#3A251E]/80 backdrop-blur-md border border-[#B8532F]/30 shadow-md hover:border-[#B8532F] hover:shadow-[0_0_18px_rgba(184,83,47,0.25)] transition-all"
            >
              {(member?.photoURL || user.photoURL) ? (
                <img src={member?.photoURL || user.photoURL!} alt="" className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#B8532F]/20 flex items-center justify-center text-[11px] font-bold text-[#B8532F]">
                  {(user.email?.[0] || '?').toUpperCase()}
                </div>
              )}
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#3A251E] dark:text-white hidden sm:inline">
                {member?.dosha || (lang === 'FR' ? 'Mon espace' : 'My space')}
              </span>
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                title={lang === 'FR' ? 'Tableau de bord admin' : 'Admin dashboard'}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#B8532F] text-[#3A251E] shadow-md hover:bg-white transition-colors"
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
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/80 dark:bg-[#3A251E]/80 backdrop-blur-md border border-[#B8532F]/30 shadow-md hover:border-[#B8532F] hover:shadow-[0_0_18px_rgba(184,83,47,0.25)] transition-all"
          >
            <i className="fa-solid fa-user text-[11px] text-[#B8532F]" />
            <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-[#3A251E] dark:text-white">
              {lang === 'FR' ? 'Connexion' : 'Sign in'}
            </span>
          </button>
        )}
      </div>

      {/* MAIN CONTENT */}
      <main className="home-content pt-6 md:pt-10 pb-10 px-4 md:px-8 w-full max-w-[1800px] mx-auto flex flex-col items-center min-h-screen opacity-0 relative z-10 justify-between">
        
        {/* Section 2 · Hero — name + the two sealed phrases borrowed back from
            the splash while the splash itself is hidden. Remove these two
            <p> blocks once the proper splash screen ships. */}
        {/* Hero — editorial split. The name anchors the left column; the
            CTA card sits as a proper "invitation" on the right instead of
            floating beneath. A thin gold filet between them ties the two
            halves into one composition. Collapses to a single stacked
            column below md for mobile. */}
        {/* Hero — Compass of You. Rotating constellation of twelve
            botanical allies on a parchment canvas. The compass itself
            is the primary CTA; a labelled pill sits below the poem for
            visitors who prefer a button. The "Votre Accompagnatrice"
            banner with Krystine's portrait lives immediately below. */}
        <div className="relative z-20 w-full max-w-[1400px] mx-auto mb-2 md:mb-4">
          <CompassOfYou />
        </div>

        {/* Section 3 · Votre Accompagnatrice · Krystine — wide featured tile. Text at
            the top-left, video at the bottom-left (within frame), Krystine
            photo visible on the right via the underlying banner image.
            Motion: the ivoire-chaud wash sweeps left-to-right on scroll-in
            like a slow uncover, revealing Krystine. Corner sprigs fade in
            to echo the moodboard's botanical margin vocabulary. */}
        <motion.div
          className="w-full mb-6 lg:mb-8"
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <div className="relative">
            {/* Corner sprigs — laurel + eucalyptus flanking the banner.
                Absolutely-positioned, pointer-events:none so the tile stays
                a single click target. */}
            <motion.div
              aria-hidden
              className="absolute -top-5 -left-1 md:-top-7 md:-left-3 w-10 h-14 md:w-14 md:h-20 z-20 pointer-events-none"
              initial={reduceMotion ? { opacity: 0.75, scale: 1 } : { opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 0.75, scale: 1 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 1, delay: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <Sprig variant="laurel" fill="#8A8F72" />
            </motion.div>
            <motion.div
              aria-hidden
              className="absolute -bottom-4 -right-1 md:-bottom-6 md:-right-3 w-10 h-14 md:w-14 md:h-20 z-20 pointer-events-none"
              initial={reduceMotion ? { opacity: 0.75, scale: 1 } : { opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 0.75, scale: 1 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 1, delay: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <Sprig variant="eucalyptus" flip fill="#8A8F72" />
            </motion.div>

            <div
              onClick={() => { if (!editMode) followHref(founderCard.href); }}
              className={`hero-card opacity-0 relative group rounded-[32px] overflow-hidden shadow-2xl transition-all duration-500 w-full h-[340px] md:h-[460px] lg:h-[520px] border border-[#B8532F]/25 ${editMode ? '' : 'cursor-pointer hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(184,83,47,0.28)] hover:border-[#B8532F]/60'}`}
            >
              <EditableImage
                fieldKey={`${founderCard.key}.banner-img-v2`}
                defaultSrc={founderCard.image}
                className="absolute inset-0 rounded-[32px] transition-transform duration-[1400ms] ease-out group-hover:scale-[1.04]"
                alt={founderCard.title}
              >
                {/* Ivoire-chaud wash, left side — lifts dark-brun copy on
                    the mandala without dulling the image. This is the
                    final resting state. */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#F4E7DD]/65 via-[#F4E7DD]/18 to-transparent pointer-events-none" />
                {/* Uncover-sweep overlay — a heavier ivoire cover that
                    retracts left-to-right on scroll-in. Fades to 0 so it
                    blends back into the permanent wash above. */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-[#F4E7DD] via-[#F4E7DD]/95 to-[#F4E7DD]/85 pointer-events-none"
                  initial={reduceMotion ? { opacity: 0, x: 0 } : { opacity: 1, x: 0 }}
                  whileInView={{ opacity: 0, x: '20%' }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ duration: 1.6, ease: [0.2, 0.8, 0.2, 1], delay: 0.1 }}
                />
              </EditableImage>
              <div className="absolute inset-0 flex flex-col items-start justify-start pt-10 md:pt-14 text-left pl-8 md:pl-14 pr-8 md:pr-16 max-w-2xl pointer-events-none">
                <span className="text-[#6B402F] uppercase tracking-[0.35em] text-[10px] md:text-xs font-bold mb-3">
                  <EditableText fieldKey={`${founderCard.key}.banner`} defaultValue={founderCard.banner} as="span" />
                </span>
                <h2 className="text-[#3A251E] text-3xl md:text-5xl font-serif mb-4 pointer-events-auto" onClick={e => editMode && e.stopPropagation()}>
                  <EditableText fieldKey={`${founderCard.key}.title`} defaultValue={founderCard.title} as="span" />
                </h2>
                <p className="text-[#3A251E]/85 text-base md:text-lg font-serif italic leading-relaxed mb-5 pointer-events-auto" onClick={e => editMode && e.stopPropagation()}>
                  <EditableText fieldKey={`${founderCard.key}.subtitle`} defaultValue={founderCard.subtitle} as="span" />
                </p>
                <span className="inline-flex items-center gap-2 px-5 py-2 border border-[#3A251E] rounded-full text-[#3A251E] text-[11px] bg-white/60 backdrop-blur-md uppercase tracking-[0.25em] font-bold group-hover:bg-[#3A251E] group-hover:text-[#B8532F] group-hover:shadow-[0_8px_22px_rgba(58,37,30,0.25)] transition-all duration-500 pointer-events-auto" onClick={e => editMode && e.stopPropagation()}>
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
              className="hero-card opacity-0 hidden md:block absolute bottom-6 left-6 lg:bottom-8 lg:left-9 w-64 lg:w-[22rem] aspect-video rounded-xl overflow-hidden shadow-[0_16px_36px_rgba(0,0,0,0.45)] border border-[#B8532F]/35 bg-black z-10"
            >
              <span className="absolute top-2 left-2 z-20 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-[#B8532F] text-[9px] uppercase tracking-[0.25em] font-bold pointer-events-none">
                <span className="w-1.5 h-1.5 rounded-full bg-[#B8532F] animate-pulse" />
                Salut Bonjour
              </span>
              {/* Muted ambient iframe — pointer-events-none so the invisible
                  overlay below captures clicks (iframes would otherwise eat
                  them). */}
              <iframe
                title="Salut Bonjour — extrait"
                src={ytPreviewSrc}
                allow="autoplay; encrypted-media; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
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
        </motion.div>

        {/* Today-only · Conférence Expo Manger Santé. Self-hides ~90 min
            after the start time (see TodayConferenceBanner.tsx). Remove
            the import + component once the date is past. */}
        <TodayConferenceBanner />

        {/* Section 5 · Les trois portes — Podcast · Origine · Boutique.
            Enveloppées dans une bande beige légèrement plus soutenue que
            l'ivoire body → crée un contrexte éditorial derrière les trois
            tuiles pour qu'elles se détachent nettement au lieu de se
            dissoudre dans le fond (beige sur beige). */}
        <div
          className="w-full rounded-[28px] px-4 md:px-8 py-10 md:py-14 mb-12"
          style={{
            background: 'linear-gradient(180deg, rgba(122,128,102,0.10) 0%, rgba(184,83,47,0.08) 100%)',
            border: '1px solid rgba(184,83,47,0.14)',
          }}
        >
        <EditorialSectionHeader
          kicker={lang === 'FR' ? 'Section 01 · Les trois portes' : 'Section 01 · Three doors'}
          title={lang === 'FR' ? 'Par où entrer.' : 'Where to enter.'}
          lede={lang === 'FR'
            ? 'Trois seuils — choisissez celui qui vous appelle.'
            : 'Three thresholds — pick the one that calls you.'}
          sprigs={['olive', 'eucalyptus']}
          divider="compass"
          className="mb-8 md:mb-10"
        />
        {/* Three doors — one-shot staggered reveal. Each tile rises from
            y:40 with a spring; stagger 90ms so the row settles as a
            cascade without depending on scroll position. */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 items-stretch">
          {mainTiles.map((card, idx) => (
            <motion.div
              key={idx}
              onClick={() => { if (!editMode) followHref(card.href); }}
              initial={reduceMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 40, scale: 0.97 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{
                duration: 0.9,
                delay: reduceMotion ? 0 : idx * 0.09,
                ease: [0.2, 0.8, 0.2, 1],
              }}
              style={{
                border: '1px solid rgba(184,83,47,0.35)',
                boxShadow: '0 14px 32px rgba(0,0,0, 0.22), 0 2px 6px rgba(107,74,47,0.08)',
              }}
              className={`block w-full aspect-square relative group rounded-[28px] overflow-hidden transition-[box-shadow,transform] duration-500 ${editMode ? '' : 'cursor-pointer hover:-translate-y-2'}`}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = '0 22px 44px rgba(0,0,0,0.30), 0 4px 10px rgba(107,74,47,0.12)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = '0 14px 32px rgba(0,0,0, 0.22), 0 2px 6px rgba(107,74,47,0.08)';
              }}
            >
              <EditableImage
                fieldKey={card.key}
                defaultSrc={card.image}
                className="absolute inset-0 rounded-[28px] origine-image-soft transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
                alt={card.title}
              >
                <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(58,37,30,0.45)_0%,rgba(58,37,30,0.22)_35%,rgba(58,37,30,0.08)_60%,transparent_85%)] pointer-events-none" />
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_40%,rgba(244,231,221,0.22)_50%,transparent_60%)] -translate-x-full group-hover:translate-x-full transition-transform duration-[1400ms] ease-out" />
                </div>
              </EditableImage>

              {/* Label éditorial — copper assombri, texte ivoire, tracking
                  typographique ouvert. Pas de halo "badge UI". */}
              {card.banner && (
                <div className="absolute top-5 left-1/2 -translate-x-1/2 pointer-events-none transition-transform duration-500 group-hover:-translate-y-0.5 flex flex-col items-center gap-1">
                  <span
                    className="inline-flex items-center px-5 py-1.5 rounded-[14px] text-[10px] md:text-[11px] uppercase font-semibold"
                    style={{
                      backgroundColor: '#A04E2A',
                      color: '#F4E7DD',
                      letterSpacing: '0.42em',
                      paddingRight: 'calc(1.25rem - 0.42em)',
                    }}
                  >
                    <EditableText fieldKey={`${card.key}.banner`} defaultValue={card.banner} as="span" />
                  </span>
                  {(card as any).bannerSub && (
                    <span
                      className="font-serif italic text-[10px] md:text-[11px] text-[#F4E7DD]/85"
                      style={{ textShadow: '0 1px 6px rgba(58,37,30,0.55)' }}
                    >
                      <EditableText fieldKey={`${card.key}.bannerSub`} defaultValue={(card as any).bannerSub} as="span" />
                    </span>
                  )}
                </div>
              )}

              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center w-full px-6 flex flex-col items-center gap-4 pointer-events-none">
                {/* Picto éditorial — ivoire plein, bordure cuivre fine,
                    glyphe brun terre 100% opacité. Pas de médaillon
                    "app icon" avec ombre interne. */}
                {card.pictoIcon && (
                  <div
                    className="w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-transform duration-500 group-hover:-translate-y-0.5"
                    style={{
                      backgroundColor: '#F4E7DD',
                      border: '1px solid rgba(184,83,47,0.4)',
                      boxShadow: '0 4px 14px rgba(107,74,47,0.10)',
                    }}
                    aria-hidden
                  >
                    <i
                      className={`fa-solid ${card.pictoIcon} text-xl md:text-[1.35rem]`}
                      style={{ color: '#6B402F', opacity: 1 }}
                    />
                  </div>
                )}
                {/* Titre en ivoire chaud — jamais blanc pur. Tracking
                    légèrement ouvert pour rester éditorial. */}
                <h2
                  className="text-2xl lg:text-3xl font-serif pointer-events-auto"
                  style={{ color: '#F4E7DD', letterSpacing: '0.02em', textShadow: '0 1px 10px rgba(58,37,30,0.35)' }}
                  onClick={e => editMode && e.stopPropagation()}
                >
                  <EditableText fieldKey={`${card.key}.title`} defaultValue={card.title} as="span" />
                </h2>
                <p
                  className="text-sm md:text-base font-serif italic leading-relaxed max-w-[22rem] pointer-events-auto"
                  style={{ color: 'rgba(244,231,221,0.82)' }}
                  onClick={e => editMode && e.stopPropagation()}
                >
                  <EditableText fieldKey={`${card.key}.subtitle`} defaultValue={card.subtitle} as="span" />
                </p>
                {/* Bouton éditorial — brun terre plein, texte ivoire,
                    bordure cuivre fine. Hover = légère brillance, rien
                    de flashy. */}
                <span
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-[11px] uppercase font-semibold pointer-events-auto transition-[filter] duration-300 group-hover:[filter:brightness(1.05)]"
                  style={{
                    backgroundColor: '#6B402F',
                    color: '#F4E7DD',
                    border: '1px solid rgba(184,83,47,0.5)',
                    letterSpacing: '0.28em',
                    paddingRight: 'calc(1.25rem - 0.28em)',
                  }}
                  onClick={e => editMode && e.stopPropagation()}
                >
                  <EditableText fieldKey={`${card.key}.cta`} defaultValue={card.cta} as="span" />
                  <i className="fa-solid fa-arrow-right text-[9px] transition-transform duration-500 group-hover:translate-x-1" />
                </span>
              </div>
            </motion.div>
          ))}
        </div>
        </div>


        {/* ── Section · Saison en cours — Expérience PITTA (été) ────────────
            Mise en avant saisonnière pointant vers la sales page Kajabi de
            l'expérience estivale. Lien externe → ouvre dans un nouvel onglet
            via followHref. À mettre à jour (ou retirer) au changement de
            saison. */}
        <RevealSection className="w-full mb-12">
          <div
            onClick={() => followHref('https://krystinestlaurent.mykajabi.com/experience-ayurveda-saison-estivale')}
            className="group relative w-full cursor-pointer rounded-[28px] overflow-hidden border border-[#B8532F]/20 shadow-[0_8px_32px_rgba(0,0,0,0.10)] hover:shadow-[0_0_40px_rgba(184,83,47,0.22)] transition-all"
          >
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1.05fr] bg-[#3A251E]">
              {/* Visuel saison Pitta — champ doré ensoleillé (chaleur Pitta) */}
              <div className="relative h-56 md:h-auto min-h-[320px] overflow-hidden">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
                  style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1600&auto=format&fit=crop&q=80)' }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(58,37,30,0.25),transparent_60%)] md:bg-[linear-gradient(to_right,transparent,rgba(58,37,30,0.92))]" />
              </div>
              {/* Texte + CTA */}
              <div className="relative p-8 md:p-12 lg:p-14 text-[#F4E7DD] flex flex-col justify-center">
                <span className="uppercase tracking-[0.3em] text-[10px] md:text-[11px] font-bold text-[#E8A07A] mb-4">
                  {lang === 'FR' ? 'Saison en cours · Pitta' : 'Current season · Pitta'}
                </span>
                <h3 className="text-3xl md:text-4xl lg:text-5xl font-serif mb-3 leading-tight">
                  {lang === 'FR' ? "L'Expérience Ayurveda — Été" : 'The Ayurveda Experience — Summer'}
                </h3>
                <p className="text-lg md:text-xl font-serif italic text-[#F4E7DD]/85 mb-5">
                  {lang === 'FR' ? 'Rafraîchir · Apaiser · Adoucir' : 'Cool · Soothe · Soften'}
                </p>
                <p className="text-[#F4E7DD]/75 leading-relaxed mb-8 max-w-xl">
                  {lang === 'FR'
                    ? "Quand la chaleur monte, le feu intérieur s'emballe. Un parcours de 7 semaines pour traverser la saison Pitta avec clarté — sans se brûler."
                    : 'When the heat rises, the inner fire flares. A 7-week journey to move through the Pitta season with clarity — without burning out.'}
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <span className="inline-flex items-center gap-3 bg-[#B8532F] text-[#3A251E] px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs shadow-lg group-hover:scale-105 transition-transform">
                    {lang === 'FR' ? "Découvrir l'expérience" : 'Discover the experience'}
                    <i className="fa-solid fa-arrow-right text-[10px] transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.3em] text-[#F4E7DD]/55 font-bold">
                    <i className="fa-regular fa-clock mr-2" />{lang === 'FR' ? '7 semaines · Disponible' : '7 weeks · Available'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </RevealSection>


        {/* ── Section Origine — Le parcours signature ──────────────────────
            Full-width editorial band with hero image + programme +
            status/CTA. See src/components/OrigineHomeSection.tsx for the
            asymmetric layout, parallax, and scroll-linked motion. */}
        <OrigineHomeSection />

        {/* Section 6 · Événements & Conférences — closest 3 upcoming. Dates
            are curated in src/lib/liveEvents.ts; past events drop off via
            the hourly tick. Countdown chip appears within 14 days. */}
        {closestEvents.length > 0 && (
          <RevealSection className="w-full mb-12">
            <div className="relative w-full rounded-[28px] bg-[rgba(232,208,190,0.45)] dark:bg-white/5 border border-[#B8532F]/12 dark:border-white/10 px-6 md:px-12 py-10 md:py-14 shadow-[0_8px_32px_rgba(0,0,0,0.07)] overflow-hidden">
              {/* Corner sprigs framing the events card */}
              <div className="pointer-events-none absolute top-4 left-4 md:top-6 md:left-6 w-8 h-11 md:w-10 md:h-14 opacity-55" aria-hidden>
                <Sprig variant="wheat" fill="#B07A3C" />
              </div>
              <div className="pointer-events-none absolute bottom-4 right-4 md:bottom-6 md:right-6 w-8 h-11 md:w-10 md:h-14 opacity-55" aria-hidden>
                <Sprig variant="wheat" flip fill="#B07A3C" />
              </div>

              <EditorialSectionHeader
                kicker={lang === 'FR' ? 'Section 02 · Où on se rejoint · Live' : 'Section 02 · Where we meet · Live'}
                title={lang === 'FR' ? 'Événements & Conférences' : 'Events & Conferences'}
                lede={lang === 'FR' ? 'Les quatre prochains rendez-vous.' : 'The next four gatherings.'}
                sprigs={['dandelion', 'wheat']}
                divider="laurel"
                className="mb-10"
              />

              <LiveEventsSection
                events={closestEvents}
              />

              <div className="mt-10 text-center">
                <Link
                  to="/formations#events"
                  className="group/all inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase font-bold text-[#B8532F] hover:text-[#6B402F] transition-colors"
                >
                  {lang === 'FR' ? 'Voir tous les rendez-vous' : 'See all gatherings'}
                  <i className="fa-solid fa-arrow-right text-[9px] transition-transform duration-300 group-hover/all:translate-x-1" />
                </Link>
              </div>
            </div>
          </RevealSection>
        )}


        {/* Section 7 · La Trilogie — full-width showcase with book covers.
            Books fall onto the shelf in a spring-stagger: each lifts from
            y:-60, rotate:-8 to rest, spaced 140 ms apart. */}
        <RevealSection className="w-full mb-12">
          <div className="relative w-full rounded-[28px] bg-[rgba(244,231,221,0.75)] dark:bg-white/5 border border-[#B8532F]/15 dark:border-white/10 px-6 md:px-12 py-10 md:py-14 overflow-hidden">
            {/* Flanking dried-leaf sprigs — moodboard vocabulary */}
            <div className="pointer-events-none absolute top-6 left-6 w-7 h-12 md:w-9 md:h-16 opacity-55" aria-hidden>
              <Sprig variant="driedLeaf" fill="#8B674A" />
            </div>
            <div className="pointer-events-none absolute bottom-6 right-6 w-7 h-12 md:w-9 md:h-16 opacity-55" aria-hidden>
              <Sprig variant="driedLeaf" flip fill="#8B674A" />
            </div>

            <EditorialSectionHeader
              kicker={lang === 'FR' ? "L'œuvre fondatrice" : 'The founding work'}
              title={lang === 'FR' ? "La Trilogie d'Origine" : 'The Origin Trilogy'}
              lede={lang === 'FR'
                ? "Trois livres. 8 ans. 1200 pages inspirées de l'Ayurveda — et une partie de leur contenu inédit nourrit Expérience Origine avant même sa publication."
                : "Three books. 8 years. 1200 pages drawn from Ayurveda — and some of their unreleased material feeds the Origin Experience before publication."}
              sprigs={['olive', 'laurel']}
              divider="bloom"
              className="mb-8"
            />

            {/* Phrase-pont — sits above the row of book covers, framing the
                relationship between the trilogy and Origine. */}
            <p className="font-serif italic text-center text-[#3A251E]/80 dark:text-white/70 text-base md:text-lg lg:text-xl mb-10 md:mb-12 max-w-3xl mx-auto">
              {lang === 'FR'
                ? <>La trilogie donne <span className="text-[#B8532F]">les mots</span>… ORIGINE donne <span className="text-[#B8532F]">l'EXPÉRIENCE</span>…</>
                : <>The trilogy gives <span className="text-[#B8532F]">the words</span>… ORIGINE gives <span className="text-[#B8532F]">the EXPERIENCE</span>…</>}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 md:gap-14 max-w-5xl mx-auto">
              {trilogy.map((b, i) => (
                <motion.div
                  key={i}
                  initial={reduceMotion ? { opacity: 1, y: 0, rotate: 0 } : { opacity: 0, y: -60, rotate: -6 + i * 3 }}
                  whileInView={{ opacity: 1, y: 0, rotate: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{
                    type: 'spring',
                    stiffness: 110,
                    damping: 14,
                    delay: reduceMotion ? 0 : i * 0.14,
                  }}
                  className="flex flex-col items-center text-center"
                >
                <Link
                  to="/medias#livres"
                  className="group flex flex-col items-center text-center w-full"
                  aria-label={b.mystery ? (lang === 'FR' ? 'Tome 3 — À révéler' : 'Volume 3 — To be revealed') : b.title}
                >
                  {/* Book cover — real image when available; for the unreleased
                      third title we keep it mysterious: a big gold "?" with a
                      sparkle, no title. */}
                  <div className="w-full max-w-[220px] aspect-[1/1.3] rounded-r-[12px] rounded-l-[3px] overflow-hidden relative shadow-[0_18px_40px_rgba(0,0,0,0.18)] border-l-4 border-[#3A251E]/10 mb-5 transition-all duration-500 group-hover:-translate-y-3 group-hover:rotate-1 group-hover:shadow-[0_28px_52px_rgba(0,0,0,0.28)]">
                    {b.cover ? (
                      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${b.cover})`, backgroundSize: '100% 100%' }} />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#3A251E] via-[#4A3228] to-[#6B402F] text-[#F4E7DD] overflow-hidden">
                        {/* Soft glow halo behind the ? — warm brun, not plum. */}
                        <div className="absolute w-40 h-40 rounded-full bg-[#6B402F]/30 blur-3xl" />
                        {/* Sparkle decorations for the "cute mysterious" feel */}
                        <i className="fa-solid fa-sparkles absolute top-6 right-7 text-[#B8532F]/70 text-sm" />
                        <i className="fa-solid fa-sparkles absolute bottom-10 left-6 text-[#B8532F]/50 text-[10px]" />
                        <i className="fa-regular fa-star absolute top-14 left-8 text-[#B8532F]/40 text-[9px]" />
                        {/* The ? itself */}
                        <span
                          className="relative font-serif italic text-[#B8532F] text-[7rem] md:text-[8rem] leading-none"
                          style={{ textShadow: '0 0 30px rgba(184,83,47,0.4), 0 0 60px rgba(107,74,47,0.3)' }}
                        >
                          ?
                        </span>
                      </div>
                    )}
                    {/* Shine on hover */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    {/* Launch date banner — only on the mystery (third) book. */}
                    {b.mystery && (
                      <span className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#B8532F] text-[#3A251E] text-[9px] uppercase tracking-[0.25em] font-bold shadow-md whitespace-nowrap">
                        {lang === 'FR' ? 'Lancement le 4 novembre' : 'Launch Nov. 4'}
                      </span>
                    )}
                  </div>

                  <p className="font-serif italic text-lg md:text-xl text-[#3A251E] dark:text-white group-hover:text-[#B8532F] transition-colors">
                    {b.mystery ? (lang === 'FR' ? 'À Révéler' : 'To Be Revealed') : b.title}
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-[#3A251E]/50 dark:text-white/50 mt-1">{b.year}</p>
                </Link>
                {/* Tome 3 — dedicated capture CTA. Lands on the Médias page
                    where the email-capture for the parution lives. */}
                {b.mystery && (
                  <Link
                    to="/medias#livres"
                    className="mt-4 inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#3A251E] text-[#F4E7DD] hover:bg-[#B8532F] hover:text-[#3A251E] hover:shadow-[0_10px_22px_rgba(184,83,47,0.35)] text-[10px] tracking-[0.25em] uppercase font-bold transition-all"
                  >
                    {lang === 'FR' ? 'Me prévenir du dévoilement' : 'Notify me of the unveiling'}
                    <i className="fa-solid fa-arrow-right text-[8px]" />
                  </Link>
                )}
                </motion.div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Link
                to="/medias#livres"
                className="group/tril inline-flex items-center gap-2 px-6 py-2.5 border border-[#B8532F] rounded-full text-[#B8532F] hover:bg-[#B8532F] hover:text-[#3A251E] hover:shadow-[0_8px_22px_rgba(184,83,47,0.35)] text-[11px] tracking-[0.25em] uppercase font-bold transition-all duration-300"
              >
                {lang === 'FR' ? 'Découvrir la trilogie' : 'Discover the trilogy'}
                <i className="fa-solid fa-arrow-right text-[9px] transition-transform duration-300 group-hover/tril:translate-x-1" />
              </Link>
            </div>
          </div>
        </RevealSection>

        <RevealSection className="w-full mb-12">
          {/* Voir src/components/PremiersRituelsHero.tsx — programme $27, */}
          {/* hero partagé avec FormationsPage. */}
          <PremiersRituelsHero />
        </RevealSection>

        {/* Section 7 · Quiz Dosha — Ikigai + new "votre signature" tagline.
            Sits between the Trilogie and Pulsation per Krystine's April 25
            rebuild. Replaces the older 5-elements explanatory paragraph
            with a tighter, signature-led pitch. */}
        <RevealSection className="w-full mb-12">
          <EditorialSectionHeader
            kicker={lang === 'FR' ? 'Section 04 · Votre signature' : 'Section 04 · Your signature'}
            title={t.ayurveda.title}
            sprigs={['olive', 'wheat']}
            divider="laurel"
            className="mb-4"
          />
          <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-16 xl:gap-24 px-4 md:px-6 py-8 md:py-12">
            <div className="relative flex items-center justify-center flex-shrink-0 lg:w-auto xl:w-1/2">
              <AyurvedaIkigai
                doshas={t.ayurveda.doshas}
                onDoshaClick={() => navigate('/quiz')}
                onQuizClick={() => navigate('/quiz')}
                lang={lang}
                filterId="home"
              />
            </div>

            <div className="flex-1 min-w-0 text-center lg:text-left max-w-xl">
              <span className="text-[#B8532F] uppercase tracking-[0.2em] text-xs font-semibold block mb-2">{t.ayurveda.introTitle}</span>
              <div className="bg-white dark:bg-[#3A251E]/60 border border-[#3A251E]/5 dark:border-white/5 p-8 rounded-[24px] shadow-lg mb-8 space-y-3">
                <p className="font-serif italic text-[#3A251E] dark:text-white text-lg md:text-xl leading-snug">
                  {lang === 'FR'
                    ? 'Vous êtes uniques, absolument comme tout le monde !'
                    : "You are unique — exactly like everyone else!"}
                </p>
                <p className="text-[#3A251E]/80 dark:text-white/80 leading-relaxed">
                  {lang === 'FR'
                    ? "Nous avons notre signature. La comprendre, c'est retrouver ses propres repères et arrêter de suivre des modes."
                    : "We each carry a signature. Understanding it is how you reclaim your own bearings and stop chasing trends."}
                </p>
                <p className="text-[#3A251E] dark:text-white font-bold">
                  {lang === 'FR' ? 'Dix questions · quelques minutes.' : 'Ten questions · a few minutes.'}
                </p>
              </div>
              <Link
                to="/quiz"
                className="group/quiz inline-flex items-center gap-2 bg-[#3A251E] dark:bg-[#B8532F] text-white dark:text-[#3A251E] px-10 py-4 rounded-full font-bold uppercase tracking-widest text-sm shadow-lg hover:bg-[#B8532F] hover:text-[#3A251E] hover:shadow-[0_14px_32px_rgba(184,83,47,0.45)] hover:-translate-y-0.5 transition-all duration-300"
              >
                {t.ayurveda.quizBtn}
                <i className="fa-solid fa-arrow-right text-[10px] transition-transform duration-300 group-hover/quiz:translate-x-1" />
              </Link>
            </div>
          </div>
        </RevealSection>

        {/* Section 8 · La Pulsation — newsletter capture, full width, last block
            before the footer. Form stays centered inside the wide container. */}
        <RevealSection className="w-full mb-4">
          <div
            className="relative w-full rounded-[28px] dark:bg-[#3A251E]/50 px-6 md:px-12 py-10 md:py-14 text-center overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(232,208,190,0.55) 0%, rgba(244,231,221,0.75) 100%)',
              border: '1px solid rgba(184,83,47,0.22)',
              boxShadow: '0 8px 28px rgba(107,74,47,0.08)',
            }}
          >
            <div className="pointer-events-none absolute top-5 left-5 w-7 h-11 md:w-9 md:h-14 opacity-55" aria-hidden>
              <Sprig variant="olive" fill="#8A8F72" />
            </div>
            <div className="pointer-events-none absolute bottom-5 right-5 w-7 h-11 md:w-9 md:h-14 opacity-55" aria-hidden>
              <Sprig variant="olive" flip fill="#8A8F72" />
            </div>

            <EditorialSectionHeader
              kicker={lang === 'FR' ? 'Section 05 · La Pulsation' : 'Section 05 · The Pulse'}
              title={lang === 'FR' ? 'Une correspondance' : 'A correspondence'}
              lede={lang === 'FR'
                ? 'Un fil de sagesse. Quelques mots, lorsque cela compte.'
                : 'A thread of wisdom. A few words, when it matters.'}
              sprigs={['dandelion', 'eucalyptus']}
              divider="compass"
              className="mb-6"
            />

            {/* "Au fil des saisons" framing — sits above the form so visitors
                know Pulsation is the channel for future doors (retreats,
                tour, parution) before they hand over their email. */}
            <p className="font-serif italic text-[#3A251E]/85 dark:text-white/80 text-base md:text-lg leading-relaxed max-w-2xl mx-auto mb-8">
              {lang === 'FR'
                ? "L'Ayurveda comme boussole se déploie dans le temps. D'autres portes ouvriront au fil des saisons. Pour être informée lorsqu'elles paraîtront, Pulsation."
                : 'Ayurveda as a compass unfolds over time. Other doors will open with the seasons. To be told when they appear — Pulsation.'}
            </p>

            {formState === 'success' ? (
              <p className="font-serif italic text-[#B8532F] py-4 text-base md:text-lg">
                {lang === 'FR' ? 'Merci. Vous recevrez bientôt votre première correspondance.' : 'Thank you. You will soon receive your first correspondence.'}
              </p>
            ) : (
              <form onSubmit={submitPulsation} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto group/pulsation">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={lang === 'FR' ? 'Votre adresse courriel' : 'Your email address'}
                  aria-label={lang === 'FR' ? 'Votre adresse courriel' : 'Your email address'}
                  className="pulsation-input flex-1 min-w-0 px-5 py-3 rounded-full border border-[#3A251E]/15 dark:border-white/15 bg-white dark:bg-white/5 text-sm text-[#3A251E] dark:text-white placeholder:text-[#3A251E]/40 dark:placeholder:text-white/40 focus:outline-none focus:border-[#B8532F] focus:shadow-[0_0_0_4px_rgba(184,83,47,0.12)] transition-shadow duration-300"
                />
                <button
                  type="submit"
                  disabled={formState === 'submitting'}
                  className="px-7 py-3 rounded-full bg-[#3A251E] dark:bg-[#B8532F] text-white dark:text-[#3A251E] hover:bg-[#B8532F] hover:text-[#3A251E] hover:shadow-[0_10px_26px_rgba(184,83,47,0.45)] hover:-translate-y-0.5 font-bold uppercase tracking-[0.25em] text-[11px] transition-all duration-300 shadow-md disabled:opacity-60 disabled:translate-y-0 disabled:shadow-md"
                >
                  {formState === 'submitting' ? <i className="fa-solid fa-circle-notch fa-spin" /> : (lang === 'FR' ? 'Rejoindre' : 'Join')}
                </button>
              </form>
            )}

            {formState === 'error' && (
              <p className="mt-4 text-sm text-red-700 dark:text-red-400">
                {lang === 'FR' ? 'Une erreur est survenue. Veuillez réessayer ou nous écrire à teamksl@inspiratanature.com.' : 'An error occurred. Please try again or write to us at teamksl@inspiratanature.com.'}
              </p>
            )}

            <p className="mt-6 text-sm text-[#3A251E]/60 dark:text-white/60">
              {lang === 'FR' ? "Désabonnement en un clic. Votre adresse n'est jamais revendue." : 'Unsubscribe in one click. Your address is never resold.'}
            </p>
          </div>
        </RevealSection>


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
              src={ytModalSrc}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              referrerPolicy="strict-origin-when-cross-origin"
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
