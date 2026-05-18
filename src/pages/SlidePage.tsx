// SlidePage — animated keynote deck served at /slide for Krystine's
// Expo Manger Santé talk on 2026-04-25 ("Au-delà des tendances ·
// L'équilibre n'est pas one-size").
//
// Visual metaphor: each slide is a parchment "page" wrapped in a
// PageCard frame — copper border, deep drop shadow, sprigs in the
// corners, faded section number sitting behind the content. Cross-
// slide transitions mimic a book opening: the leaving page rotates
// off on its right hinge while the new page rotates in from the left.
// AnimatePresence with mode="wait" keeps the timing clean.
//
// Cover slide (slide 1) deliberately mirrors the home page's
// CompassOfYou hero — left column carries the typographic name +
// letter reveal + parchment quote card, right column carries the
// fully-opaque rotating wheel. Same proportions (5/7 grid), same
// rAF-driven rotation, same italic role line below the name.
//
// Persistent corner wheel sits bottom-right on every slide so the
// brand mark is always present even as pages swap.

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, type Variants } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import Sprig from '../components/Sprig';

// ─── Slide content (extend by appending) ────────────────────────────────
type SlideTitleLayout = {
  layout: 'title';
  eyebrow: string;
  /** Each line is rendered as its own row. Letter reveal applies. */
  titleLines: string[];
  quote: string;
  author: string;
  role: string;
  /** Footer block — each entry renders on its own line so the date /
   *  venue lockup fits cleanly on exactly two lines. */
  meta?: string[];
};
// Hero photo · large editorial portrait + short description, used as
// the second slide to establish the speaker's face before the intro
// video plays.
type SlideHeroPhotoLayout = {
  layout: 'hero-photo';
  eyebrow: string;
  imageSrc: string;
  imageAlt: string;
  title: string;
  description: string[];
  sectionNumber?: string;
};
// Video · autoplay (muted) full-bleed video the audience watches as
// soon as the slide enters the stage. Used as the third slide for the
// "Univers KSL" intro.
type SlideVideoLayout = {
  layout: 'video';
  eyebrow?: string;
  videoSrc: string;
  caption?: string;
  sectionNumber?: string;
};
type SlideCalloutLayout = {
  layout: 'callout';
  eyebrow: string;
  /** Each line lifts in sequence inside a centred parchment ribbon. */
  lines: string[];
  /** Optional decorative section number ("01", "02"…) that sits as a
   *  faded display glyph behind the page content. */
  sectionNumber?: string;
};
type SlideTwoPartLayout = {
  layout: 'two-part';
  eyebrow: string;
  /** Two stanzas — rendered as two parchment ribbons side by side
   *  on desktop, stacked on mobile, with a copper arrow joining them. */
  parts: { lines: string[]; tone: 'reject' | 'accept' }[];
  sectionNumber?: string;
};
type SlideClaimLayout = {
  layout: 'claim';
  eyebrow: string;
  quote: string;
  /** Items rendered as a wrapping list of pills with a strike-through
   *  animation so the punchline lands as "none of these holds". */
  items: string[];
  /** Big number callout (e.g. "47") + summary one-liner. */
  bigNumber: string;
  numberSuffix: string;
  summary: string;
  sectionNumber?: string;
};
type SlideCtaLayout = {
  layout: 'cta';
  eyebrow: string;
  title: string;
  cards: Array<{
    icon: string;
    eyebrow: string;
    title: string;
    body: string;
    cta: string;
    accent: 'copper' | 'gold';
  }>;
  url: string;
  /** Full URL the QR encodes — kept separate so the displayed text
   *  (`krystinestlaurent.ca`) stays clean while the encoded value
   *  carries the protocol scheme phone cameras expect. */
  qrTarget: string;
  closing: string;
};
// Progression — N stanzas separated by `· · ·` dot-dividers, each in
// its own parchment ribbon. Last stanza can be tone-flagged 'gold' so
// the punchline lands with a warmer surface.
type SlideProgressionLayout = {
  layout: 'progression';
  eyebrow: string;
  stanzas: { lines: string[]; tone?: 'parchment' | 'reject' | 'gold' }[];
  sectionNumber?: string;
};
// Alternating · the talk swings between "Ce que nous croyons" (belief)
// and "Ce qui est vrai" (truth). Same shell, different tonal palette
// and content shape, branched on `tone`.
type SlideAlternatingLayout = {
  layout: 'alternating';
  tone: 'belief' | 'truth';
  eyebrow: string;
  /** Belief slides lead with a quote between « ». */
  quote?: string;
  /** Truth slides lead with one or two anchored statements. */
  main?: string[];
  /** Optional middle line — used on truth slides to render a
   *  horizontal verb chain (ALLÉGER · RÉCHAUFFER · …). */
  middle?: string;
  /** Optional follow-up lines below the main beat. */
  followUp?: string[];
  sectionNumber?: string;
};
// Démonstration · the most layout-heavy slide. Big verb display, body
// hook, symptoms, seasonal context, three rituals, closing principle.
type SlideDemoLayout = {
  layout: 'demo';
  eyebrow: string;
  bigWord: string;
  bodyHook: string;
  symptoms: string;
  context: string;
  gesturesIntro: string;
  gestures: { time: string; action: string }[];
  principleHeader: string;
  principleBody: string;
  sectionNumber?: string;
};
// Promo · three editorial cards (book / podcast / boutique) plus the
// site URL at the foot. Doesn't carry a QR — that lives on the closing
// CTA slide. Used for slide 11 "Pour aller plus loin".
type SlidePromoLayout = {
  layout: 'promo';
  eyebrow: string;
  blocks: Array<{
    icon: string;
    eyebrow: string;
    title: string;
    body: string;
    meta?: string;
  }>;
  url: string;
  sectionNumber?: string;
};

type Slide =
  | SlideTitleLayout
  | SlideHeroPhotoLayout
  | SlideVideoLayout
  | SlideCalloutLayout
  | SlideTwoPartLayout
  | SlideClaimLayout
  | SlideProgressionLayout
  | SlideAlternatingLayout
  | SlideDemoLayout
  | SlidePromoLayout
  | SlideCtaLayout;

const SLIDES: Slide[] = [
  {
    layout: 'title',
    eyebrow: 'Au-delà des tendances',
    titleLines: ["L'équilibre", "n'est pas « one-size »"],
    quote: '« Vous êtes uniques, absolument comme tout le monde. »',
    author: 'Krystine St-Laurent',
    role: "Autrice · Trilogie Ayurveda · Éditions de l'Homme",
    meta: [
      'Conférence Expo Manger Santé · 25 avril 2026 · 16 h 30',
      'Scène Vivre · Centre des congrès de Québec',
    ],
  },
  // ── Slide 2 · Hero photo · sets the speaker's face before the intro
  //    video plays. Portrait orientation so the face leads the slide.
  {
    layout: 'hero-photo',
    eyebrow: 'Votre conférencière',
    imageSrc: '/krystine-portrait.jpg',
    imageAlt: 'Krystine St-Laurent · portrait de la conférencière',
    title: 'Krystine St-Laurent',
    description: [
      "37 ans à reconnecter avec les rythmes de la nature — soins intensifs, recherche clinique, herboristerie, Ayurveda.",
      "Autrice best-seller, conférencière, fondatrice d'Inspirata Ayurveda.",
    ],
  },
  // ── Slide 3 · Univers KSL · autoplay video intro.
  {
    layout: 'video',
    eyebrow: 'Univers KSL',
    videoSrc: '/intro-univers-ksl.mp4',
    caption: "L'univers Krystine St-Laurent — un regard sur l'œuvre.",
  },
  {
    layout: 'callout',
    eyebrow: 'La promesse',
    sectionNumber: '01',
    lines: [
      'À la fin de ces 30 minutes,',
      'vous comprendrez pourquoi',
      'les tendances ne tiennent pas.',
    ],
  },
  // ── Slide 3 · Le point d'origine ─ progression of three stanzas;
  //    the last one warms to gold so the resolve reads as the answer.
  {
    layout: 'progression',
    eyebrow: "Le point d'origine",
    sectionNumber: '02',
    stanzas: [
      { lines: ["Il n'y a jamais eu autant d'informations.", 'Et autant de dispersion.'], tone: 'parchment' },
      { lines: ["Vous n'avez pas besoin",                    "d'une nouvelle tendance."], tone: 'reject' },
      { lines: ['Vous avez besoin',                          "d'apprendre à vous lire."], tone: 'gold' },
    ],
  },
  // ── Slides 4–9 · Alternating belief ↔ truth ─────────────────────────
  {
    layout: 'alternating', tone: 'belief', sectionNumber: '03',
    eyebrow: 'Ce que nous croyons',
    quote: '« Si je trouve la bonne tendance, cela va enfin fonctionner. »',
    followUp: ['Sans cesse, une nouvelle promesse.', 'Sans cesse, un nouveau protocole.'],
  },
  {
    layout: 'alternating', tone: 'truth', sectionNumber: '04',
    eyebrow: 'Ce qui est vrai',
    main: ["Aucune approche n'est universelle.", "L'Ayurveda l'a toujours su."],
    followUp: ['Une sagesse de 5 000 ans', "qui regarde le corps en face d'elle."],
  },
  {
    layout: 'alternating', tone: 'belief', sectionNumber: '05',
    eyebrow: 'Ce que nous croyons',
    quote: "« L'équilibre existe quelque part. Je dois juste le découvrir. »",
    followUp: ['Chaque mois, une nouvelle quête.', 'Essayer. Comparer. Recommencer.'],
  },
  {
    layout: 'alternating', tone: 'truth', sectionNumber: '06',
    eyebrow: 'Ce qui est vrai',
    main: ["L'équilibre n'est pas one-size."],
    followUp: [
      "Votre corps n'est pas le corps de votre voisine.",
      "Votre rythme n'est pas son rythme.",
      "Votre carburant n'est pas son carburant.",
    ],
  },
  {
    layout: 'alternating', tone: 'belief', sectionNumber: '07',
    eyebrow: 'Ce que nous croyons',
    quote: "« Lire son corps, c'est compliqué. Cela prend des années. »",
  },
  {
    layout: 'alternating', tone: 'truth', sectionNumber: '08',
    eyebrow: 'Ce qui est vrai',
    main: ['Le corps a un alphabet.', 'Cinq qualités suffisent pour commencer.'],
    middle: 'ALLÉGER · RÉCHAUFFER · APAISER · CLARIFIER · ANCRER',
    followUp: ['Cinq verbes. Cinq directions.', 'Que vous lisez chaque matin dans votre corps.'],
  },
  // ── Slide 10 · Démonstration · the practice-led page ─────────────────
  {
    layout: 'demo', eyebrow: 'Démonstration', sectionNumber: '09',
    bigWord: 'ALLÉGER',
    bodyHook: 'Quand le corps dit · trop lourd.',
    symptoms: 'Lourdeur. Lenteur. Langue blanche.',
    context: "Le printemps, en Ayurveda, demande l'allègement.",
    gesturesIntro: 'Trois gestes pour cette semaine',
    gestures: [
      { time: 'Au lever', action: 'une eau chaude au gingembre frais.' },
      { time: 'À table',  action: "plus d'amer, moins de sucré." },
      { time: 'Le soir',  action: 'réduire les quantités.' },
    ],
    principleHeader: "Le principe · l'opposé soigne.",
    principleBody: 'Lourd se soigne par léger. Froid par chaud. Agité par calme.',
  },
  // ── Slide 11 · Pour aller plus loin · trilogy / podcast / boutique ──
  {
    layout: 'promo', eyebrow: 'Pour aller plus loin', sectionNumber: '10',
    blocks: [
      {
        icon: 'fa-book',
        eyebrow: 'Trilogie · Tome 3',
        title: '? & Ayurveda',
        body: 'Troisième tome de la trilogie. Le titre se révèle à la parution.',
        meta: "14 octobre 2026 · Éditions de l'Homme",
      },
      {
        icon: 'fa-microphone-lines',
        eyebrow: 'Podcast',
        title: 'Au-delà des tendances',
        body: 'Conversations profondes, loin du bruit ambiant.',
        meta: 'Spotify · Apple Podcasts',
      },
      {
        icon: 'fa-droplet',
        eyebrow: 'Boutique',
        title: 'Inspirata Ayurveda',
        body: 'Les huiles qui rééquilibrent.',
        meta: 'inspiratanature.com',
      },
    ],
    url: 'krystinestlaurent.ca',
  },
  // ── Closing CTA · always last. Splice future content slides BEFORE it.
  {
    layout: 'cta',
    eyebrow: 'Avant de partir',
    title: 'Deux portes encore ouvertes',
    cards: [
      {
        icon: 'fa-magnifying-glass',
        eyebrow: 'Concours · Cadeau',
        title: 'Trouvez la coquille',
        body: "Une faute de français cachée sur le site. Le premier œil exercé repart avec un exemplaire signé de la trilogie.",
        cta: 'Lancer la chasse',
        accent: 'copper',
      },
      {
        icon: 'fa-compass',
        eyebrow: 'Dernière chance',
        title: "L'Expérience Origine",
        body: "Cohorte fondatrice · inscriptions jusqu'au 27 avril minuit. Douze dimanches pour retrouver votre boussole.",
        cta: 'Rejoindre la cohorte',
        accent: 'gold',
      },
    ],
    url: 'krystinestlaurent.ca',
    qrTarget: 'https://krystinestlaurent.ca',
    closing: "Merci d'avoir écouté.",
  },
];

const TOTAL_PLANNED = 12;

// ─── Slide-transition pool ───────────────────────────────────────────────
// A handful of light, classy variants. The deck picks one at random on
// every navigation so the cadence doesn't feel mechanical. Rotations
// and big translations are deliberately avoided — every move is sub-
// 40 px so the eye reads the change as a wash of light, not a "slide
// transition". Each variant is paired with an optional golden-beam
// sweep angled differently so the visual signature varies too.
type BeamConfig = { angle: number; durationMs: number; from: 'left' | 'right' | 'top' | 'bottom' };
type TransitionConfig = {
  name: string;
  variants: Variants;
  duration: number;
  ease?: [number, number, number, number];
  beam?: BeamConfig;
};
const TRANSITIONS: TransitionConfig[] = [
  // 1 · Soft drift up · diagonal copper beam left → right
  {
    name: 'drift-up',
    duration: 0.85,
    ease: [0.2, 0.8, 0.2, 1],
    variants: {
      enter:  { opacity: 0, y: 26, scale: 0.985, filter: 'blur(6px)' },
      center: { opacity: 1, y: 0,  scale: 1,     filter: 'blur(0px)' },
      exit:   { opacity: 0, y: -16, scale: 0.99, filter: 'blur(4px)' },
    },
    beam: { angle: 14, durationMs: 1200, from: 'left' },
  },
  // 2 · Iris breath · gentle scale, soft beam from the right
  {
    name: 'iris-breath',
    duration: 0.85,
    ease: [0.2, 0.8, 0.2, 1],
    variants: {
      enter:  { opacity: 0, scale: 1.035, filter: 'blur(8px)' },
      center: { opacity: 1, scale: 1,     filter: 'blur(0px)' },
      exit:   { opacity: 0, scale: 0.985, filter: 'blur(6px)' },
    },
    beam: { angle: -12, durationMs: 1100, from: 'right' },
  },
  // 3 · Lateral whisper · tiny x-shift, vertical golden beam top → bottom
  {
    name: 'lateral-whisper',
    duration: 0.8,
    ease: [0.2, 0.8, 0.2, 1],
    variants: {
      enter:  { opacity: 0, x: 28, scale: 0.99,  filter: 'blur(5px)' },
      center: { opacity: 1, x: 0,  scale: 1,     filter: 'blur(0px)' },
      exit:   { opacity: 0, x: -20, scale: 0.99, filter: 'blur(4px)' },
    },
    beam: { angle: 78, durationMs: 1000, from: 'top' },
  },
  // 4 · Plain dissolve · pure crossfade, no beam — keeps the rhythm honest
  {
    name: 'dissolve',
    duration: 0.7,
    ease: [0.2, 0.8, 0.2, 1],
    variants: {
      enter:  { opacity: 0, scale: 0.992 },
      center: { opacity: 1, scale: 1 },
      exit:   { opacity: 0, scale: 1.008 },
    },
  },
  // 5 · Soft descent · drift down with a counter beam from the bottom
  {
    name: 'soft-descent',
    duration: 0.85,
    ease: [0.2, 0.8, 0.2, 1],
    variants: {
      enter:  { opacity: 0, y: -20, scale: 0.99,  filter: 'blur(4px)' },
      center: { opacity: 1, y: 0,   scale: 1,     filter: 'blur(0px)' },
      exit:   { opacity: 0, y: 18,  scale: 0.992, filter: 'blur(3px)' },
    },
    beam: { angle: -68, durationMs: 1100, from: 'bottom' },
  },
];

// ─── Page ───────────────────────────────────────────────────────────────
const SlidePage: React.FC = () => {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [, setDirection] = useState<1 | -1>(1);
  const [tConfig, setTConfig] = useState<TransitionConfig>(TRANSITIONS[0]);

  // Pick a random transition that's different from the current one,
  // so consecutive slides feel distinct.
  const pickNextTransition = () => {
    const others = TRANSITIONS.filter(t => t.name !== tConfig.name);
    return others[Math.floor(Math.random() * others.length)];
  };

  const next = () => {
    if (index >= SLIDES.length - 1) return;
    setTConfig(pickNextTransition());
    setDirection(1);
    setIndex(i => Math.min(i + 1, SLIDES.length - 1));
  };
  const prev = () => {
    if (index <= 0) return;
    setTConfig(pickNextTransition());
    setDirection(-1);
    setIndex(i => Math.max(i - 1, 0));
  };

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault(); next();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault(); prev();
      } else if (e.key === 'Home') {
        e.preventDefault(); setDirection(-1); setIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault(); setDirection(1); setIndex(SLIDES.length - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index]);

  // Touch swipe
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null || touchStartY.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) next(); else prev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const slide = SLIDES[index];
  const isFirst = index === 0;
  const isLast = index === SLIDES.length - 1;

  // Reduced-motion users get a flat 200 ms opacity fade regardless of
  // which transition was picked.
  const slideVariants: Variants = reduce
    ? {
        enter:  { opacity: 0 },
        center: { opacity: 1 },
        exit:   { opacity: 0 },
      }
    : tConfig.variants;

  return (
    <div
      className="fixed inset-0 w-screen h-screen text-[#3A251E] overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Stage backdrop · darker brun-fonce wash so the page card
          stands clearly off the body and the audience reads the slide
          even from the back of a 100-person room. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(80% 70% at 50% 50%, rgba(58,37,30,0.32) 0%, rgba(58,37,30,0.18) 45%, rgba(46,26,20,0.45) 100%)',
        }}
      />
      {/* Vignette · deeper dark band at top + bottom so the parchment
          card pops against a richer surround. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(46,26,20,0.32) 0%, rgba(46,26,20,0) 18%, rgba(46,26,20,0) 82%, rgba(46,26,20,0.42) 100%)',
        }}
      />

      {/* Persistent corner QR — every slide except (a) the cover,
          which is the brand-introduction shot and shouldn't be
          undercut with a tiny mark, (b) the closing CTA slide which
          already carries the big centred QR, and (c) the autoplaying
          video slide where the corner mark would obstruct the picture. */}
      {slide.layout !== 'title' && slide.layout !== 'cta' && slide.layout !== 'video' && <CornerQR />}


      {/* Golden beam overlay — fires on every navigation, angle and
          direction picked from the randomized transition config. Sits
          above the slide content with a screen-blend so it reads as
          a sweep of light rather than an opaque streak. */}
      {!reduce && tConfig.beam && (
        <BeamSweep key={`beam-${index}`} cfg={tConfig.beam} />
      )}

      {/* Stage — viewport-locked, no scroll. Bottom padding leaves
          room for the fixed navigation pill. */}
      <main
        className="relative z-10 w-full h-full px-4 md:px-8 pt-6 md:pt-10 pb-24 md:pb-28 flex items-center justify-center"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={index}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={reduce
              ? { duration: 0.25 }
              : { duration: tConfig.duration, ease: tConfig.ease ?? [0.2, 0.8, 0.2, 1] }
            }
            className="relative w-full max-w-[1500px] h-full"
          >
            <PageCard slideNumber={index + 1} totalSlides={SLIDES.length}>
              {slide.layout === 'title'       && <TitleSlide        s={slide} />}
              {slide.layout === 'hero-photo'  && <HeroPhotoSlide    s={slide} />}
              {slide.layout === 'video'       && <VideoSlide        s={slide} onEnded={next} />}
              {slide.layout === 'callout'     && <CalloutSlide      s={slide} />}
              {slide.layout === 'two-part'    && <TwoPartSlide      s={slide} />}
              {slide.layout === 'claim'       && <ClaimSlide        s={slide} />}
              {slide.layout === 'progression' && <ProgressionSlide  s={slide} />}
              {slide.layout === 'alternating' && <AlternatingSlide  s={slide} />}
              {slide.layout === 'demo'        && <DemoSlide         s={slide} />}
              {slide.layout === 'promo'       && <PromoSlide        s={slide} />}
              {slide.layout === 'cta'         && <CtaSlide          s={slide} />}
            </PageCard>
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 md:gap-6 select-none">
        <NavArrow direction="prev" onClick={prev} disabled={isFirst} />
        <SlideCounter index={index} total={SLIDES.length} planned={TOTAL_PLANNED} />
        <NavArrow direction="next" onClick={next} disabled={isLast} />
      </nav>
    </div>
  );
};

// ─── Page card · the parchment "page" that wraps every slide ────────────

const PageCard: React.FC<{ children: React.ReactNode; slideNumber: number; totalSlides: number }> = ({ children, slideNumber, totalSlides }) => {
  const reduce = useReducedMotion();
  return (
    <div
      className="relative w-full h-full rounded-[26px] overflow-hidden flex flex-col"
      style={{
        // Solid (not translucent) parchment with a stronger gold-tint
        // bottom corner. Removing the alpha makes the card sit fully
        // against the dark stage so projector contrast is maximum.
        background:
          'linear-gradient(160deg, #F4E7DD 0%, #E5C9A8 55%, #C99C5C 100%)',
        border: '2px solid rgba(107,64,47,0.45)',
        boxShadow:
          '0 36px 80px rgba(20,9,5,0.55), 0 12px 22px rgba(20,9,5,0.30), inset 0 1px 0 rgba(255,255,255,0.60)',
      }}
    >
      {/* Corner sprigs — laurel + dandelion frame the page like the
          editorial bands on /accueil. Rotate-in on mount. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute top-5 left-5 md:top-7 md:left-7 w-12 h-16 md:w-14 md:h-20 z-[1]"
        initial={reduce ? { opacity: 0.7, rotate: 0 } : { opacity: 0, rotate: -16, scale: 0.85 }}
        animate={{ opacity: 0.7, rotate: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 130, damping: 14, delay: 0.25 }}
      >
        <Sprig variant="laurel" fill="#8A8F72" />
      </motion.div>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-5 right-5 md:bottom-7 md:right-7 w-12 h-16 md:w-14 md:h-20 z-[1]"
        initial={reduce ? { opacity: 0.7, rotate: 0 } : { opacity: 0, rotate: 16, scale: 0.85 }}
        animate={{ opacity: 0.7, rotate: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 130, damping: 14, delay: 0.35 }}
      >
        <Sprig variant="dandelion" flip fill="#8A8F72" />
      </motion.div>

      {/* Slide tag — top-right, faint */}
      <div
        className="absolute top-5 right-6 md:top-7 md:right-9 z-[2] font-bold uppercase"
        style={{
          fontSize: 'clamp(0.7rem, 0.85vw, 0.85rem)',
          letterSpacing: '0.42em',
          color: 'rgba(107,64,47,0.55)',
        }}
      >
        {slideNumber.toString().padStart(2, '0')} <span className="opacity-50">/</span> {totalSlides.toString().padStart(2, '0')}
      </div>

      {/* Content body — fills the card; flex centring keeps the slide
          composition vertically balanced regardless of how much content
          a particular layout brings. Padding tightened so dense slides
          (Démonstration, Promo) have more room before they get clipped. */}
      <div className="relative z-10 flex-1 min-h-0 px-5 md:px-9 lg:px-12 py-6 md:py-8 lg:py-10 flex items-center justify-center overflow-hidden">
        <div className="w-full max-h-full">
          {children}
        </div>
      </div>
    </div>
  );
};

// ─── Slide layouts ──────────────────────────────────────────────────────

const TitleSlide: React.FC<{ s: SlideTitleLayout }> = ({ s }) => {
  const reduce = useReducedMotion();
  const lettersWrap: Variants = {
    hidden: { opacity: 1 },
    show:   { opacity: 1, transition: { staggerChildren: reduce ? 0 : 0.05, delayChildren: 0.35 } },
  };
  const letter: Variants = {
    hidden: reduce ? { opacity: 1, y: 0, filter: 'blur(0px)' } : { opacity: 0, y: 22, filter: 'blur(10px)' },
    show:   { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.85, ease: [0.2, 0.8, 0.2, 1] } },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[5fr_6fr] gap-8 lg:gap-12 items-center h-full overflow-hidden">
      {/* LEFT — author lockup on top, then title, then quote. The
          column is height-constrained (`max-h-full overflow-hidden`)
          and self-centred so the meta footer never spills past the
          page-card edge. */}
      <div className="text-center lg:text-left flex flex-col items-center lg:items-start justify-center max-h-full overflow-hidden">
        <motion.p
          initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
          className="font-bold uppercase mb-4 md:mb-5"
          style={{
            fontSize: 'clamp(1.1rem, 1.4vw, 1.4rem)',
            letterSpacing: '0.45em',
            backgroundImage: 'linear-gradient(95deg, #B07A3C 0%, #D7A858 35%, #8C5A28 75%, #B07A3C 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          · {s.eyebrow.toUpperCase()} ·
        </motion.p>

        {/* Author lockup — bumped up in size, sits above the title. */}
        <motion.div
          initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: reduce ? 0 : 0.18, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <p
            className="font-bold uppercase text-[#3A251E] leading-tight whitespace-nowrap"
            style={{
              fontSize: 'clamp(1.2rem, 2.15vw, 2rem)',
              letterSpacing: '0.14em',
            }}
          >
            {s.author}
          </p>
          <p
            className="font-serif italic text-[#6B402F] mt-1"
            style={{ fontSize: 'clamp(1.15rem, 1.5vw, 1.45rem)' }}
          >
            {s.role}
          </p>
        </motion.div>

        {/* Copper rule between byline and title */}
        <motion.span
          aria-hidden
          initial={reduce ? { scaleX: 1 } : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.0, delay: reduce ? 0 : 0.55, ease: [0.2, 0.8, 0.2, 1] }}
          className="block h-[2px] my-5 md:my-6 origin-left"
          style={{
            width: 'min(320px, 55%)',
            background:
              'linear-gradient(to right, rgba(184,83,47,0.9) 0%, rgba(176,122,60,0.7) 60%, rgba(184,83,47,0) 100%)',
          }}
        />

        {/* Title — two lines, smaller than before, letter reveal */}
        <motion.h1
          variants={lettersWrap}
          initial="hidden"
          animate="show"
          className="font-serif text-[#0A0604] leading-[0.98]"
          style={{
            fontSize: 'clamp(1.9rem, 4.4vw, 3.8rem)',
            letterSpacing: '0.005em',
          }}
        >
          {s.titleLines.map((line, li) => (
            <motion.span
              key={li}
              className="block whitespace-nowrap"
              variants={lettersWrap}
            >
              {Array.from(line).map((ch, ci) => (
                <motion.span
                  key={ci}
                  variants={letter}
                  aria-hidden
                  className="inline-block"
                  style={{ willChange: 'transform, opacity, filter' }}
                >
                  {ch === ' ' ? ' ' : ch}
                </motion.span>
              ))}
            </motion.span>
          ))}
        </motion.h1>

        {/* Parchment quote card */}
        <motion.div
          initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: reduce ? 0 : 1.55, ease: [0.2, 0.8, 0.2, 1] }}
          className="mt-6 md:mt-7 max-w-xl rounded-[18px] px-6 md:px-7 py-5 md:py-6"
          style={{
            background: 'rgba(244,231,221,0.85)',
            border: '1px solid rgba(184,83,47,0.28)',
            boxShadow: '0 10px 24px rgba(107,74,47,0.10), inset 0 1px 0 rgba(255,255,255,0.55)',
          }}
        >
          <i className="fa-solid fa-quote-left text-[#B8532F]/40 text-2xl mb-2 block" />
          <p
            className="font-serif italic text-[#3A251E] leading-snug"
            style={{ fontSize: 'clamp(1.3rem, 1.75vw, 1.6rem)' }}
          >
            {s.quote}
          </p>
        </motion.div>

        {s.meta && (
          <motion.div
            initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: reduce ? 0 : 1.95, ease: [0.2, 0.8, 0.2, 1] }}
            className="mt-4 md:mt-5 max-w-2xl text-[#6B402F]/80 font-bold uppercase"
            style={{
              fontSize: 'clamp(0.7rem, 0.78vw, 0.82rem)',
              letterSpacing: '0.18em',
              lineHeight: 1.7,
            }}
          >
            {s.meta.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </motion.div>
        )}
      </div>

      {/* RIGHT — fully-opaque rotating wheel */}
      <div className="flex items-center justify-center" style={{ perspective: '1400px' }}>
        <CoverWheel />
      </div>
    </div>
  );
};

const CalloutSlide: React.FC<{ s: SlideCalloutLayout }> = ({ s }) => {
  const reduce = useReducedMotion();
  return (
    <div className="relative max-w-5xl mx-auto h-full flex flex-col">
      {s.sectionNumber && <SectionNumber>{s.sectionNumber}</SectionNumber>}

      <header className="relative z-10 text-center flex-shrink-0">
        <Eyebrow>{s.eyebrow}</Eyebrow>
        <DotsDivider />
      </header>

      <div className="relative z-10 flex-1 min-h-0 flex items-center justify-center text-center w-full">
        {/* Centred parchment ribbon holding the lines */}
        <motion.div
          initial={reduce ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: reduce ? 0 : 0.45, ease: [0.2, 0.8, 0.2, 1] }}
          className="relative mx-auto rounded-[22px] px-7 md:px-10 py-6 md:py-8 max-w-3xl w-full"
          style={{
            background: 'rgba(244,231,221,0.78)',
            border: '1px solid rgba(184,83,47,0.28)',
            boxShadow: '0 14px 40px rgba(107,74,47,0.14), inset 0 1px 0 rgba(255,255,255,0.6)',
          }}
        >
          {/* Top + bottom ornamental rules */}
          <RuleOrnament />

          <div
            className="font-serif text-[#0A0604] leading-[1.16] my-3 md:my-5 space-y-1.5 md:space-y-2"
            style={{ fontSize: 'clamp(1.4rem, 3.2vw, 2.6rem)' }}
          >
            {s.lines.map((line, i) => (
              <motion.p
                key={i}
                initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 22, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{
                  duration: 0.85,
                  delay: reduce ? 0 : 0.7 + i * 0.18,
                  ease: [0.2, 0.8, 0.2, 1],
                }}
              >
                {line}
              </motion.p>
            ))}
          </div>

          <RuleOrnament flip />
        </motion.div>
      </div>
    </div>
  );
};

const TwoPartSlide: React.FC<{ s: SlideTwoPartLayout }> = ({ s }) => {
  const reduce = useReducedMotion();
  return (
    <div className="relative max-w-6xl mx-auto">
      {s.sectionNumber && <SectionNumber>{s.sectionNumber}</SectionNumber>}

      <div className="relative z-10">
        <div className="text-center">
          <Eyebrow>{s.eyebrow}</Eyebrow>
        </div>

        <div className="mt-10 md:mt-14 grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-8 lg:gap-6 items-stretch">
          {s.parts.map((part, pi) => (
            <React.Fragment key={pi}>
              {pi === 1 && <ConnectorArrow />}
              <motion.div
                initial={reduce ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 140,
                  damping: 18,
                  delay: reduce ? 0 : 0.4 + pi * 0.25,
                }}
                className="relative rounded-[22px] px-7 md:px-9 py-9 md:py-12 flex flex-col justify-center"
                style={{
                  background: part.tone === 'reject'
                    ? 'rgba(244,231,221,0.78)'
                    : 'linear-gradient(160deg, rgba(244,231,221,0.92) 0%, rgba(215,168,88,0.18) 100%)',
                  border: part.tone === 'reject'
                    ? '1px solid rgba(184,83,47,0.30)'
                    : '1px solid rgba(215,168,88,0.55)',
                  boxShadow: '0 14px 32px rgba(58,37,30,0.16), inset 0 1px 0 rgba(255,255,255,0.55)',
                }}
              >
                <PartTag tone={part.tone} />
                <div
                  className="font-serif text-[#0A0604] mt-4 space-y-2"
                  style={{ fontSize: 'clamp(1.4rem, 2.8vw, 2.4rem)', lineHeight: 1.2 }}
                >
                  {part.lines.map((line, li) => (
                    <motion.p
                      key={li}
                      initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.7,
                        delay: reduce ? 0 : 0.7 + pi * 0.25 + li * 0.12,
                        ease: [0.2, 0.8, 0.2, 1],
                      }}
                    >
                      {line}
                    </motion.p>
                  ))}
                </div>
              </motion.div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

const ClaimSlide: React.FC<{ s: SlideClaimLayout }> = ({ s }) => {
  const reduce = useReducedMotion();
  return (
    <div className="relative max-w-6xl mx-auto">
      {s.sectionNumber && <SectionNumber>{s.sectionNumber}</SectionNumber>}

      <div className="relative z-10 text-center">
        <Eyebrow>{s.eyebrow}</Eyebrow>

        {/* Two-column editorial: quote on the left, evidence on the right. */}
        <div className="mt-8 md:mt-12 grid grid-cols-1 lg:grid-cols-[5fr_7fr] gap-8 lg:gap-12 items-stretch text-left">
          {/* Quote column */}
          <motion.div
            initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
            className="relative rounded-[22px] px-7 md:px-9 py-9 md:py-11 flex flex-col justify-center"
            style={{
              background: 'rgba(244,231,221,0.78)',
              border: '1px solid rgba(184,83,47,0.28)',
              boxShadow: '0 14px 32px rgba(58,37,30,0.14), inset 0 1px 0 rgba(255,255,255,0.55)',
            }}
          >
            <i className="fa-solid fa-quote-left text-[#B8532F]/45 text-3xl md:text-4xl mb-4" />
            <p
              className="font-serif italic text-[#0A0604] leading-snug"
              style={{ fontSize: 'clamp(1.3rem, 2.4vw, 2rem)' }}
            >
              {s.quote}
            </p>
            <i className="fa-solid fa-quote-right text-[#B8532F]/35 text-2xl mt-4 self-end" />
          </motion.div>

          {/* Evidence column */}
          <motion.div
            initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
            className="relative rounded-[22px] px-7 md:px-9 py-9 md:py-11"
            style={{
              background: 'linear-gradient(160deg, rgba(244,231,221,0.92) 0%, rgba(232,208,190,0.85) 100%)',
              border: '1px solid rgba(184,83,47,0.30)',
              boxShadow: '0 14px 32px rgba(58,37,30,0.14), inset 0 1px 0 rgba(255,255,255,0.55)',
            }}
          >
            <p
              className="font-bold uppercase tracking-[0.32em] mb-6"
              style={{
                fontSize: 'clamp(0.7rem, 0.85vw, 0.85rem)',
                color: '#6B402F',
              }}
            >
              · La preuve dit ·
            </p>

            {/* Pills + strike-through */}
            <motion.ul
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : 0.10, delayChildren: 0.85 } } }}
              className="flex flex-wrap gap-2.5 md:gap-3 mb-7 md:mb-9"
            >
              {s.items.map((it, i) => (
                <motion.li
                  key={i}
                  variants={{
                    hidden: reduce ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.85, y: 14 },
                    show:   { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 220, damping: 18 } },
                  }}
                  className="relative inline-flex items-center px-4 py-2 rounded-full font-serif"
                  style={{
                    fontSize: 'clamp(0.95rem, 1.3vw, 1.1rem)',
                    background: 'rgba(244,231,221,0.85)',
                    border: '1px solid rgba(184,83,47,0.40)',
                    color: '#3A251E',
                  }}
                >
                  <span className="relative">
                    {it}
                    <motion.span
                      aria-hidden
                      initial={reduce ? { scaleX: 1, opacity: 0.7 } : { scaleX: 0, opacity: 0 }}
                      animate={{ scaleX: 1, opacity: 0.7 }}
                      transition={{
                        duration: reduce ? 0.2 : 0.65,
                        delay: reduce ? 0 : 1.5 + i * 0.10,
                        ease: [0.2, 0.8, 0.2, 1],
                      }}
                      className="absolute left-0 right-0 top-1/2 h-[2px] origin-left"
                      style={{
                        background: 'linear-gradient(to right, rgba(184,83,47,0.85), rgba(176,122,60,0.7))',
                        transform: 'translateY(-1px)',
                      }}
                    />
                  </span>
                </motion.li>
              ))}
            </motion.ul>

            {/* Big number callout */}
            <motion.div
              initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: reduce ? 0 : 2.4, ease: [0.2, 0.8, 0.2, 1] }}
              className="flex items-baseline gap-3 md:gap-4 mb-2"
            >
              <span
                className="font-serif"
                style={{
                  fontSize: 'clamp(3rem, 6.5vw, 5.5rem)',
                  lineHeight: 0.9,
                  backgroundImage: 'linear-gradient(95deg, #B07A3C 0%, #D7A858 35%, #8C5A28 75%, #B07A3C 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                {s.bigNumber}
              </span>
              <span
                className="font-serif italic text-[#3A251E]/80"
                style={{ fontSize: 'clamp(1rem, 1.4vw, 1.3rem)' }}
              >
                {s.numberSuffix}
              </span>
            </motion.div>

            <motion.p
              initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: reduce ? 0 : 2.6, ease: [0.2, 0.8, 0.2, 1] }}
              className="font-serif italic text-[#3A251E]"
              style={{ fontSize: 'clamp(1rem, 1.4vw, 1.25rem)', lineHeight: 1.4 }}
            >
              {s.summary}
            </motion.p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const CtaSlide: React.FC<{ s: SlideCtaLayout }> = ({ s }) => {
  const reduce = useReducedMotion();

  return (
    <div className="text-center max-w-6xl mx-auto h-full flex flex-col">
      {/* Header anchored top */}
      <header className="flex-shrink-0">
        <Eyebrow>{s.eyebrow}</Eyebrow>

        <motion.h2
          initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 18, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.85, delay: reduce ? 0 : 0.25, ease: [0.2, 0.8, 0.2, 1] }}
          className="font-serif text-[#0A0604] leading-[1.1] mb-3 md:mb-4"
          style={{ fontSize: 'clamp(1.6rem, 3.4vw, 2.6rem)' }}
        >
          {s.title}
        </motion.h2>
      </header>

      {/* Body claims the rest of the card. Three-column composition
          on desktop · two info cards flanking the QR. QR is the
          dominant element; cards explain why scanning is worth it. */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 lg:gap-6 items-center min-h-0">
        {/* Card 1 */}
        <CtaCard card={s.cards[0]} delay={0.55} />

        {/* QR · centred, parchment-framed, copper border, sprig accents.
            Sized for projector visibility (clamp to ~38vh / 380 px on
            laptops, scales bigger on conference displays). */}
        <motion.div
          initial={reduce ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.85, rotateY: -12 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          transition={{ type: 'spring', stiffness: 110, damping: 18, delay: reduce ? 0 : 0.35 }}
          className="relative mx-auto"
        >
          {/* Soft glow halo behind the QR */}
          <div
            aria-hidden
            className="absolute inset-0 rounded-[36px] -m-6 pointer-events-none"
            style={{
              background:
                'radial-gradient(closest-side, rgba(215,168,88,0.30), rgba(215,168,88,0) 70%)',
            }}
          />

          {/* Parchment frame */}
          <div
            className="relative rounded-[28px] p-4 md:p-5 inline-block"
            style={{
              background: '#F4E7DD',
              border: '2px solid rgba(184,83,47,0.5)',
              boxShadow:
                '0 24px 60px rgba(58,37,30,0.30), 0 6px 14px rgba(58,37,30,0.14), inset 0 1px 0 rgba(255,255,255,0.7)',
            }}
          >
            {/* Corner sprigs on the frame for editorial polish */}
            <span aria-hidden className="absolute -top-3 -left-3 w-8 h-10 opacity-80">
              <Sprig variant="laurel" fill="#B07A3C" />
            </span>
            <span aria-hidden className="absolute -bottom-3 -right-3 w-8 h-10 opacity-80">
              <Sprig variant="dandelion" flip fill="#B07A3C" />
            </span>

            <QRCodeSVG
              value={s.qrTarget}
              level="H"
              bgColor="#F4E7DD"
              fgColor="#3A251E"
              size={400}
              marginSize={2}
              style={{
                display: 'block',
                width: 'clamp(180px, 30vh, 320px)',
                height: 'clamp(180px, 30vh, 320px)',
              }}
            />
          </div>

          {/* URL caption */}
          <p
            className="font-serif italic text-[#3A251E] mt-2 md:mt-3"
            style={{ fontSize: 'clamp(0.9rem, 1.1vw, 1.1rem)', letterSpacing: '0.02em' }}
          >
            {s.url}
          </p>
          <p
            className="uppercase font-bold mt-0.5"
            style={{
              fontSize: 'clamp(0.65rem, 0.8vw, 0.78rem)',
              letterSpacing: '0.32em',
              color: '#6B402F',
            }}
          >
            · Pointez votre téléphone ·
          </p>
        </motion.div>

        {/* Card 2 */}
        <CtaCard card={s.cards[1]} delay={0.75} />
      </div>

      {/* Closing line anchored to the bottom of the card so it never
          gets clipped no matter how the QR row resizes. */}
      <motion.p
        initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: reduce ? 0 : 1.6, ease: [0.2, 0.8, 0.2, 1] }}
        className="font-serif italic text-[#6B402F] flex-shrink-0 mt-2 md:mt-3"
        style={{ fontSize: 'clamp(1rem, 1.35vw, 1.2rem)' }}
      >
        {s.closing}
      </motion.p>
    </div>
  );
};

// Compact CTA card — used twice on the closing slide, flanking the QR.
// Smaller than the previous full-width cards so the QR keeps centre
// stage on a projector. Same shine-sweep on hover, same copper / gold
// accent palette, same icon + eyebrow + title + body + pill structure.
const CtaCard: React.FC<{ card: SlideCtaLayout['cards'][number]; delay: number }> = ({ card: c, delay }) => {
  const reduce = useReducedMotion();
  const isGold = c.accent === 'gold';
  return (
    <motion.div
      initial={reduce ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 150, damping: 18, delay: reduce ? 0 : delay }}
      whileHover={reduce ? undefined : { y: -4, scale: 1.012 }}
      className="group relative overflow-hidden rounded-[20px] p-4 md:p-5 text-left max-h-full"
      style={{
        background: 'rgba(244,231,221,0.92)',
        border: `1px solid ${isGold ? 'rgba(215,168,88,0.6)' : 'rgba(184,83,47,0.4)'}`,
        boxShadow: '0 12px 26px rgba(58,37,30,0.16), inset 0 1px 0 rgba(255,255,255,0.55)',
      }}
    >
      <span
        aria-hidden
        className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[1100ms] ease-out pointer-events-none"
        style={{
          background: isGold
            ? 'linear-gradient(115deg, transparent 40%, rgba(215,168,88,0.22) 50%, transparent 60%)'
            : 'linear-gradient(115deg, transparent 40%, rgba(184,83,47,0.18) 50%, transparent 60%)',
        }}
      />

      <div className="flex items-start gap-3 mb-2">
        <span
          className="flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full"
          style={{
            background: isGold ? 'rgba(215,168,88,0.14)' : 'rgba(184,83,47,0.12)',
            border: `1px solid ${isGold ? 'rgba(215,168,88,0.45)' : 'rgba(184,83,47,0.35)'}`,
          }}
        >
          <i className={`fa-solid ${c.icon}`} style={{ color: isGold ? '#8C5A28' : '#B8532F', fontSize: '0.85rem' }} />
        </span>
        <div className="min-w-0">
          <p
            className="font-bold uppercase mb-0.5"
            style={{
              fontSize: 'clamp(0.7rem, 0.82vw, 0.78rem)',
              letterSpacing: '0.3em',
              backgroundImage: isGold
                ? 'linear-gradient(95deg, #B07A3C 0%, #D7A858 35%, #8C5A28 75%, #B07A3C 100%)'
                : 'linear-gradient(95deg, #6B402F 0%, #B8532F 50%, #6B402F 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            · {c.eyebrow.toUpperCase()} ·
          </p>
          <h3 className="font-serif text-[#0A0604] leading-tight" style={{ fontSize: 'clamp(1rem, 1.4vw, 1.22rem)' }}>
            {c.title}
          </h3>
        </div>
      </div>
      <p className="text-[#3A251E]/85 leading-snug" style={{ fontSize: 'clamp(0.8rem, 0.98vw, 0.92rem)', lineHeight: 1.45 }}>
        {c.body}
      </p>
    </motion.div>
  );
};

// ─── HeroPhotoSlide · slide 2 (speaker portrait + short bio) ────────────

const HeroPhotoSlide: React.FC<{ s: SlideHeroPhotoLayout }> = ({ s }) => {
  const reduce = useReducedMotion();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[5fr_6fr] gap-8 lg:gap-12 items-center h-full">
      {/* LEFT — portrait-oriented parchment-framed photo */}
      <motion.div
        initial={reduce ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1], delay: 0.15 }}
        className="relative w-full mx-auto overflow-hidden rounded-[20px]"
        style={{
          aspectRatio: '4 / 5',
          maxHeight: '78vh',
          maxWidth: 'min(420px, 100%)',
          border: '1px solid rgba(107,64,47,0.45)',
          boxShadow: '0 22px 50px rgba(20,9,5,0.32), inset 0 1px 0 rgba(255,255,255,0.55)',
          background: '#3A251E',
        }}
      >
        <img
          src={s.imageSrc}
          alt={s.imageAlt}
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Soft edge wash so type laid right of the image isn't fighting
            with a hard photo edge. */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, rgba(244,231,221,0) 70%, rgba(244,231,221,0.2) 100%)',
          }}
        />
      </motion.div>

      {/* RIGHT — eyebrow + name + 2-line description */}
      <div className="text-center lg:text-left">
        <motion.p
          initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
          className="font-bold uppercase mb-4 md:mb-5"
          style={{
            fontSize: 'clamp(1.05rem, 1.35vw, 1.35rem)',
            letterSpacing: '0.42em',
            backgroundImage: 'linear-gradient(95deg, #B07A3C 0%, #D7A858 35%, #8C5A28 75%, #B07A3C 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          · {s.eyebrow.toUpperCase()} ·
        </motion.p>

        <motion.h2
          initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: reduce ? 0 : 0.18, ease: [0.2, 0.8, 0.2, 1] }}
          className="font-bold uppercase text-[#0A0604] leading-tight mb-5 whitespace-nowrap"
          style={{
            fontSize: 'clamp(1.7rem, 3.2vw, 2.7rem)',
            letterSpacing: '0.18em',
          }}
        >
          {s.title}
        </motion.h2>

        <motion.span
          aria-hidden
          initial={reduce ? { scaleX: 1 } : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.0, delay: reduce ? 0 : 0.55, ease: [0.2, 0.8, 0.2, 1] }}
          className="block h-[2px] mb-6 origin-left mx-auto lg:mx-0"
          style={{
            width: 'min(280px, 60%)',
            background:
              'linear-gradient(to right, rgba(184,83,47,0.9) 0%, rgba(176,122,60,0.7) 60%, rgba(184,83,47,0) 100%)',
          }}
        />

        <motion.div
          initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: reduce ? 0 : 0.7, ease: [0.2, 0.8, 0.2, 1] }}
          className="font-serif text-[#0A0604] leading-relaxed space-y-3"
          style={{ fontSize: 'clamp(1.15rem, 1.55vw, 1.45rem)' }}
        >
          {s.description.map((line, i) => (
            <p key={i} className={i === s.description.length - 1 ? 'italic text-[#3A251E]/85' : ''}>
              {line}
            </p>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

// ─── VideoSlide · slide 3 (autoplay intro video, fills the card) ─────────

const VideoSlide: React.FC<{ s: SlideVideoLayout; onEnded?: () => void }> = ({ s, onEnded }) => {
  const reduce = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Try to enter browser fullscreen the moment the video starts. Browsers
  // require a user gesture for `requestFullscreen()`; navigating to this
  // slide (click / key press / swipe) is the gesture, so the request
  // usually clears. Safari can refuse — we swallow the rejection so the
  // page never throws.
  const handlePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      // Some browsers expose a webkit-prefixed API (older Safari).
      const req = (v as any).requestFullscreen
        || (v as any).webkitRequestFullscreen
        || (v as any).webkitEnterFullscreen;
      if (req) Promise.resolve(req.call(v)).catch(() => { /* user-gesture refused */ });
    } catch { /* analytics-style no-op — playback must never break */ }
  };

  // When the video ends · exit fullscreen, advance to the next slide.
  const handleEnded = () => {
    try {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else if ((document as any).webkitFullscreenElement) (document as any).webkitExitFullscreen?.();
    } catch { /* noop */ }
    onEnded?.();
  };

  return (
    <div className="relative w-full h-full flex flex-col">
      {s.eyebrow && (
        <motion.p
          initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
          className="font-bold uppercase mb-3 text-center flex-shrink-0"
          style={{
            fontSize: 'clamp(1.05rem, 1.35vw, 1.35rem)',
            letterSpacing: '0.42em',
            backgroundImage: 'linear-gradient(95deg, #B07A3C 0%, #D7A858 35%, #8C5A28 75%, #B07A3C 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          · {s.eyebrow.toUpperCase()} ·
        </motion.p>
      )}

      {/* Video frame · claims all remaining card height. `object-contain`
          on a flex-1 wrapper guarantees the full frame is visible (no
          crop at the bottom) regardless of the video's aspect ratio.
          Dark fill behind the video letter-boxes any aspect mismatch
          on the parchment surround. */}
      <motion.div
        initial={reduce ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
        className="relative flex-1 min-h-0 w-full overflow-hidden rounded-[20px]"
        style={{
          border: '1px solid rgba(107,64,47,0.45)',
          boxShadow: '0 22px 50px rgba(20,9,5,0.45), inset 0 1px 0 rgba(255,255,255,0.20)',
          background: '#1A0E08',
        }}
      >
        <video
          key={s.videoSrc}
          ref={videoRef}
          src={s.videoSrc}
          autoPlay
          controls
          playsInline
          preload="auto"
          onPlay={handlePlay}
          onEnded={handleEnded}
          className="absolute inset-0 w-full h-full object-contain"
        />
      </motion.div>

      {s.caption && (
        <motion.p
          initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: reduce ? 0 : 1.0, ease: [0.2, 0.8, 0.2, 1] }}
          className="mt-3 md:mt-4 font-serif italic text-[#3A251E]/85 text-center flex-shrink-0"
          style={{ fontSize: 'clamp(1rem, 1.3vw, 1.2rem)', maxWidth: 'min(720px, 90%)', alignSelf: 'center' }}
        >
          {s.caption}
        </motion.p>
      )}
    </div>
  );
};

// ─── New layouts (per Conference_Slides_Texte 2026-04-25) ───────────────

const ProgressionSlide: React.FC<{ s: SlideProgressionLayout }> = ({ s }) => {
  const reduce = useReducedMotion();
  return (
    <div className="relative max-w-5xl mx-auto h-full flex flex-col">
      {s.sectionNumber && <SectionNumber>{s.sectionNumber}</SectionNumber>}

      {/* Header — anchored top of card. */}
      <header className="relative z-10 text-center flex-shrink-0">
        <Eyebrow>{s.eyebrow}</Eyebrow>
      </header>

      {/* Body — claims remaining card height; the three stanzas
          distribute themselves with `justify-evenly` so the
          composition fills the card whether it's 600 or 800 px tall.
          No fixed `space-y` here — vertical rhythm comes from the
          flex distribution itself. */}
      <div className="relative z-10 flex-1 min-h-0 flex flex-col justify-evenly text-center py-2">
        {s.stanzas.map((stanza, i) => {
          const isGold = stanza.tone === 'gold';
          const isReject = stanza.tone === 'reject';
          return (
            <React.Fragment key={i}>
              <motion.div
                initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 22, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{
                  duration: 0.85,
                  delay: reduce ? 0 : 0.4 + i * 0.25,
                  ease: [0.2, 0.8, 0.2, 1],
                }}
                className="relative mx-auto rounded-[18px] px-6 md:px-8 py-4 md:py-5 max-w-3xl w-full"
                style={{
                  background: isGold
                    ? 'linear-gradient(160deg, rgba(244,231,221,0.94) 0%, rgba(215,168,88,0.26) 100%)'
                    : 'rgba(244,231,221,0.85)',
                  border: `1px solid ${isGold ? 'rgba(215,168,88,0.6)' : isReject ? 'rgba(184,83,47,0.32)' : 'rgba(184,83,47,0.25)'}`,
                  boxShadow: '0 12px 28px rgba(58,37,30,0.14), inset 0 1px 0 rgba(255,255,255,0.55)',
                }}
              >
                <div
                  className="font-serif text-[#0A0604] leading-[1.18] space-y-1"
                  style={{ fontSize: 'clamp(1.3rem, 2.6vw, 2.1rem)' }}
                >
                  {stanza.lines.map((line, li) => (
                    <p key={li} className={isGold ? 'font-medium' : isReject ? 'italic text-[#3A251E]/85' : ''}>
                      {line}
                    </p>
                  ))}
                </div>
              </motion.div>
              {i < s.stanzas.length - 1 && (
                <div className="flex items-center justify-center">
                  <DotsDivider />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

const AlternatingSlide: React.FC<{ s: SlideAlternatingLayout }> = ({ s }) => {
  const reduce = useReducedMotion();
  const isBelief = s.tone === 'belief';

  return (
    <div className="relative max-w-5xl mx-auto h-full flex flex-col">
      {s.sectionNumber && <SectionNumber>{s.sectionNumber}</SectionNumber>}

      {/* Header — fixed at the top. */}
      <header className="relative z-10 text-center flex-shrink-0">
        <Eyebrow>{s.eyebrow}</Eyebrow>
        <DotsDivider />
      </header>

      {/* Body — claims the rest of the card and centres its content
          inside that space, so a 1-line truth ("L'équilibre n'est
          pas one-size.") visually anchors instead of floating at the
          top of an empty card. */}
      <div className="relative z-10 flex-1 min-h-0 flex flex-col justify-center text-center">

        {/* Belief slides lead with the italic quote in a parchment card. */}
        {isBelief && s.quote && (
          <motion.blockquote
            initial={reduce ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 22, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: reduce ? 0 : 0.5, ease: [0.2, 0.8, 0.2, 1] }}
            className="relative mx-auto rounded-[20px] px-7 md:px-10 py-6 md:py-8 max-w-3xl mt-3"
            style={{
              background: 'rgba(244,231,221,0.82)',
              border: '1px solid rgba(184,83,47,0.30)',
              boxShadow: '0 14px 32px rgba(58,37,30,0.14), inset 0 1px 0 rgba(255,255,255,0.55)',
            }}
          >
            <i className="fa-solid fa-quote-left text-[#B8532F]/50 text-2xl md:text-3xl mb-2 block" />
            <p
              className="font-serif italic text-[#0A0604] leading-[1.28]"
              style={{ fontSize: 'clamp(1.5rem, 3.2vw, 2.55rem)' }}
            >
              {s.quote}
            </p>
            <i className="fa-solid fa-quote-right text-[#B8532F]/35 text-xl md:text-2xl mt-2 block text-right" />
          </motion.blockquote>
        )}

        {/* Truth slides lead with the anchored statement(s). */}
        {!isBelief && s.main && (
          <motion.div
            initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 22, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.85, delay: reduce ? 0 : 0.5, ease: [0.2, 0.8, 0.2, 1] }}
            className="font-serif text-[#0A0604] leading-[1.14] space-y-1.5 mt-3"
            style={{ fontSize: 'clamp(1.7rem, 3.8vw, 3rem)' }}
          >
            {s.main.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </motion.div>
        )}

        {/* Optional middle · horizontal verb chain (truth only). */}
        {s.middle && (
          <motion.div
            initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: reduce ? 0 : 1.0, ease: [0.2, 0.8, 0.2, 1] }}
            className="my-5 md:my-7 inline-block"
          >
            {/* Verb chain · keeps the gold gradient on the type but
                sits inside a deep brun-fonce container so the gold
                pops off the parchment surround instead of dissolving
                into it. The dark backing is what makes gold readable. */}
            <div
              className="inline-block px-6 md:px-9 py-3 md:py-4 rounded-[14px]"
              style={{
                background: 'linear-gradient(135deg, #3A251E 0%, #6B402F 100%)',
                border: '1px solid rgba(215,168,88,0.55)',
                boxShadow: '0 12px 28px rgba(20,9,5,0.32), inset 0 1px 0 rgba(255,255,255,0.08)',
              }}
            >
              <p
                className="font-serif tracking-[0.18em] uppercase font-bold"
                style={{
                  fontSize: 'clamp(1.1rem, 1.75vw, 1.5rem)',
                  backgroundImage: 'linear-gradient(95deg, #B07A3C 0%, #D7A858 35%, #FFE3A8 50%, #D7A858 65%, #B07A3C 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                  filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.45))',
                }}
              >
                {s.middle}
              </p>
            </div>
          </motion.div>
        )}

        {/* Follow-up lines · belief tone fades them, truth tone keeps them
            in the parchment register. */}
        {s.followUp && (
          <motion.div
            initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: reduce ? 0 : 1.2, ease: [0.2, 0.8, 0.2, 1] }}
            className={`mt-4 md:mt-6 max-w-3xl mx-auto space-y-0.5 ${isBelief ? 'text-[#3A251E]/65 italic' : 'text-[#3A251E]/85'}`}
            style={{ fontSize: 'clamp(1.2rem, 1.7vw, 1.55rem)', lineHeight: 1.5 }}
          >
            {s.followUp.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

const DemoSlide: React.FC<{ s: SlideDemoLayout }> = ({ s }) => {
  const reduce = useReducedMotion();
  return (
    <div className="relative max-w-6xl mx-auto h-full flex flex-col">
      {s.sectionNumber && <SectionNumber>{s.sectionNumber}</SectionNumber>}

      {/* Header — anchored top, same flex-shrink-0 pattern as the
          other slides so the body claim the rest of the card. */}
      <header className="relative z-10 text-center flex-shrink-0 mb-3 md:mb-4">
        <Eyebrow>{s.eyebrow}</Eyebrow>
      </header>

      {/* Body grid — the two columns stretch to fill remaining card
          height (`flex-1 min-h-0`), so the verb hero on the left and
          the rituals on the right always read as a single composition
          regardless of how tall the card is. */}
      <div className="relative z-10 flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[5fr_7fr] gap-4 lg:gap-7 items-stretch">
          {/* LEFT · the verb hero + body hook */}
          <motion.div
            initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
            className="relative rounded-[20px] px-6 md:px-8 py-6 md:py-8 flex flex-col justify-center text-center lg:text-left"
            style={{
              background: 'linear-gradient(160deg, rgba(244,231,221,0.92) 0%, rgba(215,168,88,0.22) 100%)',
              border: '1px solid rgba(215,168,88,0.55)',
              boxShadow: '0 14px 32px rgba(58,37,30,0.16), inset 0 1px 0 rgba(255,255,255,0.55)',
            }}
          >
            <h2
              className="font-serif font-bold uppercase mb-2"
              style={{
                fontSize: 'clamp(2.4rem, 4.9vw, 4.2rem)',
                letterSpacing: '0.08em',
                lineHeight: 0.95,
                backgroundImage: 'linear-gradient(95deg, #B07A3C 0%, #D7A858 35%, #8C5A28 75%, #B07A3C 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              {s.bigWord}
            </h2>
            <p
              className="font-serif italic text-[#3A251E] mb-1.5"
              style={{ fontSize: 'clamp(1.2rem, 1.65vw, 1.45rem)' }}
            >
              {s.bodyHook}
            </p>
            <p
              className="text-[#6B402F] uppercase font-bold tracking-[0.2em]"
              style={{ fontSize: 'clamp(0.78rem, 0.95vw, 0.95rem)' }}
            >
              {s.symptoms}
            </p>
            <div
              aria-hidden
              className="my-3 h-px w-full"
              style={{ background: 'linear-gradient(to right, rgba(184,83,47,0.55), rgba(184,83,47,0))' }}
            />
            <p
              className="font-serif italic text-[#3A251E]/80"
              style={{ fontSize: 'clamp(1.1rem, 1.4vw, 1.3rem)', lineHeight: 1.45 }}
            >
              {s.context}
            </p>
          </motion.div>

          {/* RIGHT · three rituals + closing principle */}
          <motion.div
            initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
            className="relative rounded-[20px] px-6 md:px-8 py-5 md:py-7"
            style={{
              background: 'rgba(244,231,221,0.85)',
              border: '1px solid rgba(184,83,47,0.30)',
              boxShadow: '0 14px 32px rgba(58,37,30,0.14), inset 0 1px 0 rgba(255,255,255,0.55)',
            }}
          >
            <p
              className="font-bold uppercase tracking-[0.32em] mb-3"
              style={{
                fontSize: 'clamp(0.95rem, 1.1vw, 1.1rem)',
                color: '#6B402F',
              }}
            >
              · {s.gesturesIntro.toUpperCase()} ·
            </p>

            <ol className="space-y-3 md:space-y-4 mb-4">
              {s.gestures.map((g, i) => (
                <motion.li
                  key={i}
                  initial={reduce ? { opacity: 1, x: 0 } : { opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.7, delay: reduce ? 0 : 0.85 + i * 0.18, ease: [0.2, 0.8, 0.2, 1] }}
                  className="flex items-baseline gap-3"
                >
                  <span
                    className="font-bold uppercase tracking-[0.2em] text-[#B8532F] whitespace-nowrap flex-shrink-0"
                    style={{ fontSize: 'clamp(0.95rem, 1.1vw, 1.1rem)' }}
                  >
                    {g.time}
                  </span>
                  <span className="text-[#B8532F]/45">·</span>
                  <span
                    className="font-serif italic text-[#3A251E]"
                    style={{ fontSize: 'clamp(1.2rem, 1.6vw, 1.45rem)', lineHeight: 1.35 }}
                  >
                    {g.action}
                  </span>
                </motion.li>
              ))}
            </ol>

            <div
              aria-hidden
              className="h-px w-full mb-3"
              style={{ background: 'linear-gradient(to right, rgba(184,83,47,0), rgba(184,83,47,0.45), rgba(184,83,47,0))' }}
            />

            <motion.div
              initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: reduce ? 0 : 1.55, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <p
                className="font-serif text-[#0A0604] mb-1"
                style={{ fontSize: 'clamp(1.2rem, 1.65vw, 1.5rem)', fontWeight: 500 }}
              >
                {s.principleHeader}
              </p>
              <p
                className="font-serif italic text-[#3A251E]/85"
                style={{ fontSize: 'clamp(1.1rem, 1.45vw, 1.32rem)', lineHeight: 1.45 }}
              >
                {s.principleBody}
              </p>
            </motion.div>
          </motion.div>
      </div>
    </div>
  );
};

const PromoSlide: React.FC<{ s: SlidePromoLayout }> = ({ s }) => {
  const reduce = useReducedMotion();
  return (
    <div className="relative max-w-6xl mx-auto h-full flex flex-col">
      {s.sectionNumber && <SectionNumber>{s.sectionNumber}</SectionNumber>}

      <header className="relative z-10 text-center flex-shrink-0">
        <Eyebrow>{s.eyebrow}</Eyebrow>
      </header>

      <div className="relative z-10 flex-1 min-h-0 flex flex-col justify-center text-center">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : 0.15, delayChildren: 0.45 } } }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 mb-5 md:mb-7"
        >
          {s.blocks.map((b, i) => (
            <motion.article
              key={i}
              variants={{
                hidden: reduce ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 28, scale: 0.96 },
                show:   { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 150, damping: 18 } },
              }}
              whileHover={reduce ? undefined : { y: -4, scale: 1.014 }}
              className="group relative overflow-hidden rounded-[20px] p-5 md:p-6 text-left flex flex-col"
              style={{
                background: 'rgba(244,231,221,0.92)',
                border: '1px solid rgba(184,83,47,0.36)',
                boxShadow: '0 14px 30px rgba(58,37,30,0.18), inset 0 1px 0 rgba(255,255,255,0.55)',
              }}
            >
              <span
                aria-hidden
                className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[1100ms] ease-out pointer-events-none"
                style={{
                  background: 'linear-gradient(115deg, transparent 40%, rgba(184,83,47,0.18) 50%, transparent 60%)',
                }}
              />

              <span
                className="inline-flex items-center justify-center w-10 h-10 rounded-full mb-3"
                style={{
                  background: 'rgba(184,83,47,0.12)',
                  border: '1px solid rgba(184,83,47,0.35)',
                }}
              >
                <i className={`fa-solid ${b.icon} text-[#B8532F]`} style={{ fontSize: '0.95rem' }} />
              </span>

              <p
                className="font-bold uppercase mb-1"
                style={{
                  fontSize: 'clamp(0.9rem, 1.05vw, 1.05rem)',
                  letterSpacing: '0.3em',
                  backgroundImage: 'linear-gradient(95deg, #6B402F 0%, #B8532F 50%, #6B402F 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                · {b.eyebrow.toUpperCase()} ·
              </p>
              <h3
                className="font-serif text-[#0A0604] leading-tight mb-1.5"
                style={{ fontSize: 'clamp(1.3rem, 1.9vw, 1.75rem)' }}
              >
                {b.title}
              </h3>
              <p
                className="text-[#3A251E]/85 leading-relaxed flex-1"
                style={{ fontSize: 'clamp(1.05rem, 1.35vw, 1.25rem)' }}
              >
                {b.body}
              </p>
              {b.meta && (
                <p
                  className="mt-2 pt-2 border-t font-serif italic text-[#6B402F]/85"
                  style={{
                    fontSize: 'clamp(0.78rem, 1vw, 0.95rem)',
                    borderColor: 'rgba(184,83,47,0.20)',
                  }}
                >
                  {b.meta}
                </p>
              )}
            </motion.article>
          ))}
        </motion.div>

        <DotsDivider />

        {/* Site URL · same treatment as the verb chain — gold gradient
            type wrapped in a dark brun-fonce container so it visibly
            pops as the slide's call-to-action rather than blending
            into the parchment surround. */}
        <motion.div
          initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: reduce ? 0 : 1.4, ease: [0.2, 0.8, 0.2, 1] }}
          className="inline-block px-7 md:px-10 py-3.5 md:py-4 rounded-[16px]"
          style={{
            background: 'linear-gradient(135deg, #3A251E 0%, #6B402F 100%)',
            border: '1px solid rgba(215,168,88,0.55)',
            boxShadow: '0 14px 32px rgba(20,9,5,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          <p
            className="font-serif"
            style={{
              fontSize: 'clamp(1.4rem, 2.6vw, 2.2rem)',
              letterSpacing: '0.04em',
              backgroundImage: 'linear-gradient(95deg, #B07A3C 0%, #D7A858 35%, #FFE3A8 50%, #D7A858 65%, #B07A3C 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.45))',
            }}
          >
            {s.url}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

// ─── Reusable bits ──────────────────────────────────────────────────────

const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const reduce = useReducedMotion();
  return (
    <motion.p
      initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
      className="font-bold uppercase mb-6 md:mb-8"
      style={{
        fontSize: 'clamp(1.1rem, 1.4vw, 1.4rem)',
        letterSpacing: '0.42em',
        backgroundImage: 'linear-gradient(95deg, #B07A3C 0%, #D7A858 35%, #8C5A28 75%, #B07A3C 100%)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
      }}
    >
      · {String(children).toUpperCase()} ·
    </motion.p>
  );
};

const DotsDivider: React.FC = () => {
  const reduce = useReducedMotion();
  const dot: Variants = {
    hidden: reduce ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.4 },
    show:   { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 240, damping: 18 } },
  };
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : 0.12, delayChildren: 0.45 } } }}
      className="flex items-center justify-center gap-3 my-3"
      aria-hidden
    >
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          variants={dot}
          className="block w-1.5 h-1.5 rounded-full"
          style={{ background: '#B8532F', opacity: 0.7 }}
        />
      ))}
    </motion.div>
  );
};

// Decorative top + bottom rule with copper gradient. Used inside callout
// ribbons so the type sits between two clean lines.
const RuleOrnament: React.FC<{ flip?: boolean }> = ({ flip }) => (
  <div className="flex items-center gap-3 justify-center" aria-hidden style={{ transform: flip ? 'rotate(180deg)' : undefined }}>
    <span className="block h-px flex-1" style={{
      background: 'linear-gradient(to right, transparent, rgba(184,83,47,0.55), rgba(184,83,47,0))',
    }} />
    <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(184,83,47,0.6)' }} />
    <span className="block h-px flex-1" style={{
      background: 'linear-gradient(to left, transparent, rgba(184,83,47,0.55), rgba(184,83,47,0))',
    }} />
  </div>
);

// Faded display number sitting behind the slide content.
const SectionNumber: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const reduce = useReducedMotion();
  return (
    <motion.span
      aria-hidden
      initial={reduce ? { opacity: 0.08, scale: 1 } : { opacity: 0, scale: 1.05 }}
      animate={{ opacity: 0.18, scale: 1 }}
      transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1] }}
      className="absolute -top-2 md:-top-4 left-2 md:left-6 font-serif select-none pointer-events-none z-0"
      style={{
        fontSize: 'clamp(5rem, 14vw, 11rem)',
        lineHeight: 0.85,
        color: '#1E140F',
        letterSpacing: '-0.04em',
      }}
    >
      {children}
    </motion.span>
  );
};

// Small tag badge above each TwoPart card so the contrast (reject vs.
// accept) reads at a glance.
const PartTag: React.FC<{ tone: 'reject' | 'accept' }> = ({ tone }) => {
  const isReject = tone === 'reject';
  return (
    <span
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full self-start"
      style={{
        background: isReject ? 'rgba(184,83,47,0.10)' : 'rgba(215,168,88,0.16)',
        border: `1px solid ${isReject ? 'rgba(184,83,47,0.35)' : 'rgba(215,168,88,0.55)'}`,
      }}
    >
      <i
        className={`fa-solid ${isReject ? 'fa-xmark' : 'fa-check'}`}
        style={{ color: isReject ? '#B8532F' : '#8C5A28', fontSize: '0.85rem' }}
      />
      <span
        className="font-bold uppercase"
        style={{
          fontSize: 'clamp(0.7rem, 0.85vw, 0.8rem)',
          letterSpacing: '0.28em',
          color: isReject ? '#B8532F' : '#8C5A28',
        }}
      >
        {isReject ? 'L\'illusion' : 'Le réel'}
      </span>
    </span>
  );
};

// Connector arrow between the two TwoPart cards. Animates: a copper
// line drawing in horizontally on desktop (vertically on mobile),
// followed by an arrowhead pulse.
const ConnectorArrow: React.FC = () => {
  const reduce = useReducedMotion();
  return (
    <div className="flex items-center justify-center" aria-hidden>
      <div className="hidden lg:flex items-center gap-2">
        <motion.span
          initial={reduce ? { scaleX: 1 } : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.85, delay: reduce ? 0 : 0.85, ease: [0.2, 0.8, 0.2, 1] }}
          className="block h-[2px] w-12 lg:w-20 origin-left"
          style={{ background: 'linear-gradient(to right, rgba(184,83,47,0.85), rgba(176,122,60,0.7))' }}
        />
        <motion.i
          initial={reduce ? { opacity: 1, x: 0 } : { opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: reduce ? 0 : 1.55, ease: [0.2, 0.8, 0.2, 1] }}
          className="fa-solid fa-arrow-right"
          style={{ color: '#B8532F', fontSize: '1.1rem' }}
        />
      </div>
      {/* Mobile vertical connector */}
      <div className="lg:hidden flex flex-col items-center gap-2 my-2">
        <motion.span
          initial={reduce ? { scaleY: 1 } : { scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.85, delay: reduce ? 0 : 0.85, ease: [0.2, 0.8, 0.2, 1] }}
          className="block w-[2px] h-12 origin-top"
          style={{ background: 'linear-gradient(to bottom, rgba(184,83,47,0.85), rgba(176,122,60,0.7))' }}
        />
        <i className="fa-solid fa-arrow-down" style={{ color: '#B8532F', fontSize: '1.1rem' }} />
      </div>
    </div>
  );
};

// ─── Golden beam overlay ────────────────────────────────────────────────
// Sweeps a soft, blurred copper-gold streak across the screen on each
// navigation. `screen` blend mode lets the colour add light without
// covering the slide. Angle / origin come from the active transition's
// beam config so each sweep feels distinct.
const BeamSweep: React.FC<{ cfg: BeamConfig }> = ({ cfg }) => {
  const fromLeftOrTop = cfg.from === 'left' || cfg.from === 'top';
  const horizontal = cfg.from === 'left' || cfg.from === 'right';

  // Travel distance — across the long axis of the viewport.
  const travel = horizontal ? '180vw' : '180vh';
  const startOffset = fromLeftOrTop ? `-${travel}` : travel;
  const endOffset   = fromLeftOrTop ?  travel    : `-${travel}`;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[35] overflow-hidden"
    >
      <motion.div
        initial={{
          opacity: 0,
          [horizontal ? 'x' : 'y']: startOffset,
        } as any}
        animate={{
          opacity: [0, 0.55, 0.7, 0],
          [horizontal ? 'x' : 'y']: endOffset,
        } as any}
        transition={{
          duration: cfg.durationMs / 1000,
          ease: [0.25, 0.85, 0.3, 1],
          opacity: { duration: cfg.durationMs / 1000, times: [0, 0.25, 0.55, 1] },
        }}
        style={{
          position: 'absolute',
          top: '-30%',
          left: '-30%',
          width: horizontal ? '38%' : '160%',
          height: horizontal ? '160%' : '38%',
          transform: `rotate(${cfg.angle}deg)`,
          transformOrigin: 'center',
          background:
            'linear-gradient(' + (horizontal ? '90deg' : '180deg') + ', ' +
            'transparent 0%, ' +
            'rgba(176,122,60,0.18) 30%, ' +
            'rgba(215,168,88,0.65) 50%, ' +
            'rgba(176,122,60,0.18) 70%, ' +
            'transparent 100%)',
          filter: 'blur(28px)',
          mixBlendMode: 'screen',
        }}
      />
    </motion.div>
  );
};

// ─── Wheels ─────────────────────────────────────────────────────────────

function useWheelRotation(opts: { baseDegPerSec?: number; hoverMultiplier?: number; isHovering?: () => boolean }) {
  const { baseDegPerSec = 4, hoverMultiplier = 3, isHovering } = opts;
  const reduce = useReducedMotion();
  const rotation = useMotionValue(0);
  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    let last = performance.now();
    let speed = 1;
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const target = isHovering?.() ? hoverMultiplier : 1;
      speed += (target - speed) * Math.min(1, dt * 6);
      rotation.set(rotation.get() + baseDegPerSec * speed * dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [baseDegPerSec, hoverMultiplier, isHovering, reduce, rotation]);
  return rotation;
}

// CoverWheel — slide-1 only, fully opaque, large, centred in the right
// column of the title slide. Mirrors the home page CompassOfYou wheel.
const CoverWheel: React.FC = () => {
  const reduce = useReducedMotion();
  const rotation = useWheelRotation({ baseDegPerSec: 5 });
  return (
    <motion.div
      initial={reduce ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.85, rotateX: -8 }}
      animate={{ opacity: 1, scale: 1, rotateX: 0 }}
      transition={{ type: 'spring', stiffness: 80, damping: 16, mass: 1, delay: 0.3 }}
      className="relative wheel-breathe"
      style={{ width: 'min(60vmin, 540px)', maxWidth: '100%' }}
    >
      <motion.img
        src="/wheel-no-text.png"
        alt=""
        aria-hidden
        draggable={false}
        className="block w-full h-auto select-none"
        style={{
          rotate: rotation,
          transformOrigin: '50% 50%',
          willChange: 'transform',
          filter: 'drop-shadow(0 0 80px rgba(184,83,47,0.30))',
        }}
      />
      <style>{`
        @keyframes wheel-breathe-cover {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.012); }
        }
        .wheel-breathe { animation: wheel-breathe-cover 7s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .wheel-breathe { animation: none; } }
      `}</style>
    </motion.div>
  );
};

// CornerQR — bottom-right parchment-framed QR, persistent on every
// slide. Sits where the wheel used to live (the wheel mark is dropped
// from the deck — the QR is the more useful brand-anchor in a live
// room). Bigger than before so attendees seated 30 ft from a projector
// can still scan it. Caption underneath in gold gradient.
const CornerQR: React.FC = () => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="fixed bottom-5 right-5 md:bottom-8 md:right-8 z-30 pointer-events-none flex flex-col items-center"
      initial={reduce ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 160, damping: 18, delay: 0.3 }}
      aria-hidden
    >
      <div
        className="rounded-[16px] p-2.5 md:p-3"
        style={{
          background: '#F4E7DD',
          border: '2px solid rgba(184,83,47,0.55)',
          boxShadow: '0 12px 28px rgba(58,37,30,0.40)',
          width: 'clamp(120px, 13vw, 180px)',
        }}
      >
        <QRCodeSVG
          value="https://krystinestlaurent.ca"
          level="H"
          bgColor="#F4E7DD"
          fgColor="#3A251E"
          size={400}
          marginSize={1}
          style={{ display: 'block', width: '100%', height: 'auto' }}
        />
      </div>
      <p
        className="mt-2 font-bold uppercase text-center whitespace-nowrap"
        style={{
          fontSize: 'clamp(0.85rem, 0.95vw, 1rem)',
          letterSpacing: '0.18em',
          backgroundImage: 'linear-gradient(95deg, #B07A3C 0%, #D7A858 35%, #FFE3A8 50%, #D7A858 65%, #B07A3C 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          textShadow: '0 1px 8px rgba(215,168,88,0.45)',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.55))',
        }}
      >
        www.krystinestlaurent.ca
      </p>
    </motion.div>
  );
};

// CornerWheel — persistent on every slide, bottom-right.
const CornerWheel: React.FC = () => {
  const reduce = useReducedMotion();
  const hoverRef = useRef(false);
  const rotation = useWheelRotation({ baseDegPerSec: 7, hoverMultiplier: 3.4, isHovering: () => hoverRef.current });
  return (
    <div
      className="fixed bottom-5 right-5 md:bottom-8 md:right-8 z-30 pointer-events-auto"
      onMouseEnter={() => { hoverRef.current = true; }}
      onMouseLeave={() => { hoverRef.current = false; }}
    >
      <motion.div
        initial={reduce ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 160, damping: 18, delay: 0.25 }}
        className="relative"
        style={{ width: 'clamp(56px, 7vw, 84px)' }}
      >
        <motion.img
          src="/wheel-no-text.png"
          alt=""
          aria-hidden
          className="block w-full h-auto select-none"
          style={{
            rotate: rotation,
            transformOrigin: '50% 50%',
            willChange: 'transform',
            filter: 'drop-shadow(0 6px 18px rgba(58,37,30,0.30))',
          }}
        />
      </motion.div>
    </div>
  );
};

// ─── Navigation arrows + counter ────────────────────────────────────────

const NavArrow: React.FC<{ direction: 'prev' | 'next'; onClick: () => void; disabled: boolean }> = ({
  direction, onClick, disabled,
}) => (
  <motion.button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={direction === 'prev' ? 'Précédent' : 'Suivant'}
    whileHover={disabled ? undefined : { scale: 1.06 }}
    whileTap={disabled ? undefined : { scale: 0.94 }}
    className="group inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full transition-all"
    style={{
      background: 'rgba(244,231,221,0.85)',
      border: '1px solid rgba(184,83,47,0.45)',
      color: '#3A251E',
      boxShadow: '0 8px 22px rgba(58,37,30,0.18)',
      opacity: disabled ? 0.35 : 1,
      cursor: disabled ? 'default' : 'pointer',
      backdropFilter: 'blur(6px)',
    }}
  >
    <i
      className={`fa-solid ${direction === 'prev' ? 'fa-arrow-left' : 'fa-arrow-right'}`}
      style={{ color: '#6B402F', fontSize: '1rem' }}
    />
  </motion.button>
);

const SlideCounter: React.FC<{ index: number; total: number; planned: number }> = ({ index, total, planned }) => {
  const cur = (index + 1).toString().padStart(2, '0');
  const tot = (total < planned ? `${total} / ${planned.toString().padStart(2, '0')}` : total.toString().padStart(2, '0'));
  return (
    <div
      className="font-serif italic px-4 md:px-5 py-2 rounded-full"
      style={{
        background: 'rgba(244,231,221,0.7)',
        border: '1px solid rgba(184,83,47,0.25)',
        color: '#3A251E',
        fontSize: 'clamp(0.85rem, 1.1vw, 1rem)',
        backdropFilter: 'blur(6px)',
      }}
    >
      {cur} <span className="text-[#6B402F]/60 mx-1">·</span> {tot}
    </div>
  );
};

export default SlidePage;
