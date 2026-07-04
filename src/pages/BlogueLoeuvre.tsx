import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ArrowDown, Feather, BookOpen } from '@phosphor-icons/react';
import { useApp } from '../contexts/AppContext';
import { getBlogPosts, type BlogPost } from '../firebase/firestore';
import NewsletterSignup from '../components/NewsletterSignup';
import { Atmosphere } from '../components/motion/loeuvre';

/**
 * Le Blogue · Le Journal, en V2 « magazine crème » (UNE de revue littéraire).
 * Back-end préservé : les articles sont chargés depuis Firestore via
 * getBlogPosts() (tri createdAt desc), le lecteur rend le HTML de chaque
 * article, et l'infolettre garde NewsletterSignup source="blogue".
 * Effets de scroll : portrait en parallax doux, numéros d'édition fantômes
 * en profondeur, filets DrawRule qui se tracent entre les rangées, cascade.
 * Transform/opacity uniquement (protocole Poids-plume), reduced-motion statique.
 */

const EASE = [0.22, 1, 0.36, 1] as const;
const PX = 'px-[clamp(1.5rem,5vw,5.5rem)]';

/* ════════════════════════ Style self-contained (Fraunces + Inter + grain) ════════════════════════ */

const V2Style: React.FC = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..600&family=Inter:wght@300;400;500&display=swap');
    .v2-serif { font-family: "Fraunces", Georgia, serif; }
    .v2-article h2, .v2-article h3, .v2-article blockquote { font-family: "Fraunces", Georgia, serif; font-weight: 300; }
    .v2-grain {
      position: absolute; inset: 0; z-index: 30; pointer-events: none;
      opacity: 0.045; mix-blend-mode: multiply;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    }
    @keyframes v2cue { 0%,100% { transform: translateY(0); opacity:.45 } 50% { transform: translateY(8px); opacity:1 } }
    .v2-cue { animation: v2cue 2.4s cubic-bezier(0.22,1,0.36,1) infinite; }
    @media (prefers-reduced-motion: reduce) { .v2-cue { animation: none; } }
  `}</style>
);

/* ════════════════════════ Primitives motion locales ════════════════════════ */

const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string; y?: number }> = ({
  children, delay = 0, className, y = 30,
}) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 1.0, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
};

/* Filet laiton qui se trace au scroll (scaleX depuis la gauche). */
const DrawRule: React.FC<{ className?: string; delay?: number }> = ({ className = '', delay = 0.1 }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      className={`h-px bg-[#9c7a44]/45 ${className}`}
      style={{ transformOrigin: 'left center' }}
      initial={reduce ? false : { scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 1.25, ease: EASE, delay }}
    />
  );
};

const Kicker: React.FC<{ children: React.ReactNode; className?: string; on?: 'dark' | 'light' }> = ({
  children, className = '', on = 'light',
}) => (
  <p className={`text-[0.7rem] uppercase tracking-[0.34em] ${on === 'dark' ? 'text-[#c8a86a]' : 'text-[#7d6330]'} ${className}`}>
    {children}
  </p>
);

/* Numéro d'édition fantôme, glisse légèrement en profondeur au scroll. */
const GhostIndex: React.FC<{ n: number }> = ({ n }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const yGhost = useTransform(scrollYProgress, [0, 1], [26, -26]);
  return (
    <span ref={ref} className="relative block select-none" aria-hidden>
      <motion.span
        style={reduce ? undefined : { y: yGhost }}
        className="block v2-serif font-light leading-[0.85] text-[clamp(4rem,9vw,7.5rem)] text-[#1c1712]/[0.08] will-change-transform"
      >
        {String(n).padStart(2, '0')}
      </motion.span>
    </span>
  );
};

/* ════════════════════════ Page ════════════════════════ */

const BlogueLoeuvre: React.FC = () => {
  const { lang } = useApp();
  const reduce = useReducedMotion();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<BlogPost | null>(null);

  useEffect(() => {
    // TEMP MOCK VISUEL - a retirer
    setPosts([
      { id: 'a', title: 'Ce que l’automne demande au corps', subtitle: 'Vent, sécheresse, dispersion : lire les signaux de la saison Vata et y répondre avec des gestes simples.', date: '12 septembre 2026', coverImage: '/sante-la-vie.jpg', content: '' } as unknown as BlogPost,
      { id: 'b', title: 'La Dinacharya, matin après matin', subtitle: 'L’art ancestral de s’accorder aux rythmes du jour, sans en faire une performance.', date: '28 août 2026', coverImage: '/origine-square.jpg', content: '' } as unknown as BlogPost,
      { id: 'c', title: 'Écouter avant d’agir', subtitle: 'Le premier geste de l’Ayurveda n’est pas une recette. C’est une écoute.', date: '14 août 2026', coverImage: '/krystine-bg.jpg', content: '' } as unknown as BlogPost,
      { id: 'd', title: 'Les saisons comme boussole', subtitle: 'Quand le calendrier extérieur et le calendrier intérieur se répondent.', date: '2 août 2026', content: '' } as unknown as BlogPost,
    ]);
    setLoading(false);
  }, []);

  /* Parallax doux du portrait hero (transform seulement) */
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const portraitY = useTransform(scrollYProgress, [0, 1], ['0%', '6%']);

  useEffect(() => {
    if (selected) window.scrollTo({ top: 0, behavior: 'auto' });
  }, [selected]);

  const openPost = (post: BlogPost) => setSelected(post);
  const keyOpen = (e: React.KeyboardEvent, post: BlogPost) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(post); }
  };

  const BackButton = () => (
    <button
      onClick={() => setSelected(null)}
      className="group inline-flex items-center gap-2.5 text-[0.66rem] uppercase tracking-[0.24em] text-[#7d6330] hover:text-[#1c1712] transition-colors duration-300 min-h-[44px]"
    >
      <ArrowLeft size={15} weight="regular" className="transition-transform duration-300 group-hover:-translate-x-1" />
      {lang === 'FR' ? 'Retour au journal' : 'Back to the journal'}
    </button>
  );

  /* ─────────── Vue lecteur d'article ─────────── */
  if (selected) {
    return (
      <article
        className="relative bg-[#f4efe6] text-[#1c1712] antialiased min-h-screen overflow-x-hidden"
        style={{ fontFamily: '"Inter", system-ui, sans-serif' }}
      >
        <V2Style />
        <div className="v2-grain" aria-hidden />

        <div className={`w-full ${PX} pt-[clamp(6.5rem,12vh,9rem)]`}>
          <div className="flex items-center justify-between border-t border-[#1c1712]/15 pt-3.5 text-[0.6rem] uppercase tracking-[0.28em] text-[#1c1712]/55">
            <span>{lang === 'FR' ? 'Le Journal · Lecture' : 'The Journal · Reading'}</span>
            <span className="hidden sm:inline">Québec &middot; MMXXVI</span>
          </div>
        </div>

        <div className={`mx-auto w-full max-w-[860px] ${PX} lg:px-0 pt-10 pb-[clamp(5rem,12vh,8rem)]`}>
          <Reveal><BackButton /></Reveal>

          <Reveal delay={0.05} className="mt-10">
            {selected.date && <Kicker>{selected.date}</Kicker>}
            <h1 className="mt-5 v2-serif font-light text-[#1c1712] leading-[1.02] text-[clamp(2.4rem,5.5vw,4.2rem)]">
              {selected.title}
            </h1>
            {selected.subtitle && (
              <p className="mt-6 v2-serif italic text-[#7d6330] text-[clamp(1.2rem,2.2vw,1.65rem)] leading-snug max-w-[44ch]">
                {selected.subtitle}
              </p>
            )}
            <DrawRule className="mt-10" />
          </Reveal>

          {selected.coverImage && (
            <Reveal delay={0.1} className="mt-12">
              <div className="relative">
                <span className="pointer-events-none absolute -inset-2 border border-[#9c7a44]/35" aria-hidden />
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img
                    src={selected.coverImage}
                    alt={selected.title}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </Reveal>
          )}

          <Reveal delay={0.12}>
            <div
              className="v2-article mt-14 text-[1.03rem] leading-[1.9] text-[#3a2f23] [&_h2]:text-[#1c1712] [&_h2]:leading-[1.1] [&_h2]:text-[clamp(1.6rem,2.8vw,2.2rem)] [&_h2]:mt-12 [&_h2]:mb-4 [&_h3]:text-[#1c1712] [&_h3]:text-xl [&_h3]:mt-9 [&_h3]:mb-3 [&_p]:mb-6 [&_a]:text-[#7d6330] [&_a]:underline [&_a]:decoration-[#9c7a44]/40 [&_a:hover]:text-[#1c1712] [&_strong]:text-[#1c1712] [&_strong]:font-semibold [&_em]:italic [&_blockquote]:border-t [&_blockquote]:border-b [&_blockquote]:border-[#9c7a44]/40 [&_blockquote]:py-6 [&_blockquote]:italic [&_blockquote]:text-[#7d6330] [&_blockquote]:text-[1.25rem] [&_blockquote]:leading-[1.5] [&_blockquote]:my-10 [&_ul]:my-6 [&_ul]:pl-5 [&_ul]:list-disc [&_li]:mb-2 [&_img]:my-8"
              dangerouslySetInnerHTML={{ __html: selected.content }}
            />
          </Reveal>

          <Reveal className="mt-16">
            <DrawRule className="mb-8" delay={0} />
            <BackButton />
          </Reveal>
        </div>
      </article>
    );
  }

  const featured = posts[0];
  const rest = posts.slice(1);

  /* ─────────── Vue liste (sommaire de revue) ─────────── */
  return (
    <div
      className="relative bg-[#f4efe6] text-[#1c1712] antialiased overflow-x-hidden"
      style={{ fontFamily: '"Inter", system-ui, sans-serif' }}
    >
      <V2Style />
      <div className="v2-grain" aria-hidden />

      {/* ─────────── HERO · UNE de magazine littéraire ─────────── */}
      <section
        ref={heroRef}
        className={`relative w-full ${PX} pt-[clamp(6.75rem,12vh,9rem)] pb-[clamp(2rem,5vh,3.5rem)] min-h-[92vh] flex flex-col`}
      >
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, ease: EASE }}
          className="flex items-center justify-between border-t border-[#1c1712]/15 pt-3.5 text-[0.6rem] uppercase tracking-[0.28em] text-[#1c1712]/55"
        >
          <span>N&deg; 04 &middot; {lang === 'FR' ? 'Le Journal' : 'The Journal'}</span>
          <span className="hidden sm:inline">Québec &middot; MMXXVI</span>
        </motion.div>

        <div className="flex-1 grid items-stretch gap-x-[clamp(2rem,5vw,5rem)] gap-y-10 lg:grid-cols-[1.08fr_0.92fr] mt-[clamp(2rem,5vh,3.5rem)]">
          {/* Masthead */}
          <div className="order-1 self-start">
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
              className="inline-flex items-center gap-2.5 text-[0.7rem] uppercase tracking-[0.34em] text-[#7d6330] mb-7"
            >
              <Feather size={15} weight="light" className="text-[#9c7a44]" />
              {lang === 'FR' ? 'Le Journal · Carnets' : 'The Journal · Notebooks'}
            </motion.p>
            <h1 className="v2-serif font-light leading-[0.9] text-[#1c1712] text-[clamp(3.4rem,10.5vw,9rem)]">
              <span className="block overflow-hidden">
                <motion.span
                  className="block"
                  initial={reduce ? false : { y: '115%' }}
                  animate={{ y: '0%' }}
                  transition={{ duration: 1.2, ease: EASE, delay: 0.2 }}
                >
                  {lang === 'FR' ? 'Le Blogue' : 'The Blog'}
                </motion.span>
              </span>
            </h1>
          </div>

          {/* Portrait encadré filet laiton · parallax doux */}
          <div className="order-2 lg:row-span-2 self-stretch relative flex">
            <motion.div
              className="relative w-full self-center"
              initial={reduce ? false : { opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.1, ease: EASE, delay: 0.35 }}
            >
              <span className="pointer-events-none absolute -inset-2 border border-[#9c7a44]/35" aria-hidden />
              <div className="relative w-full aspect-[5/6] overflow-hidden">
                <motion.img
                  src="/krystine-portrait.jpg"
                  alt="Krystine St-Laurent"
                  className="h-[112%] w-full object-cover object-[center_20%] will-change-transform"
                  style={reduce ? undefined : { y: portraitY }}
                />
                <div
                  className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
                  style={{ background: 'linear-gradient(to top, rgba(28,23,18,0.5), transparent)' }}
                  aria-hidden
                />
                <p className="absolute bottom-4 left-4 right-4 v2-serif italic text-[#f4efe6] text-sm tracking-wide">
                  {lang === 'FR'
                    ? '« Écouter avant d’agir. Écrire pour se souvenir. »'
                    : '“Listen before acting. Write to remember.”'}
                </p>
              </div>
              <span className="absolute -top-2 -left-2 bg-[#1c1712] text-[#f4efe6] px-3 py-1.5 text-[0.58rem] uppercase tracking-[0.24em]">
                {lang === 'FR' ? 'Carnets' : 'Notebooks'}
              </span>
            </motion.div>
          </div>

          {/* Bas-gauche · sous-titre italique + CTA */}
          <motion.div
            className="order-3 self-end"
            initial={reduce ? false : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE, delay: 0.55 }}
          >
            <ul className="flex flex-wrap gap-x-7 gap-y-2 mb-7">
              {(lang === 'FR'
                ? ['Le corps', 'Les saisons', 'La sagesse']
                : ['The body', 'The seasons', 'The wisdom']
              ).map((c) => (
                <li key={c} className="flex items-center gap-2.5 text-[0.68rem] uppercase tracking-[0.2em] text-[#1c1712]/70">
                  <span className="h-1 w-1 rounded-full bg-[#9c7a44]" />
                  {c}
                </li>
              ))}
            </ul>

            <p className="v2-serif italic font-light text-[clamp(1.35rem,2.5vw,2rem)] leading-[1.3] text-[#3a2f23] max-w-[34ch]">
              {lang === 'FR'
                ? 'Des notes sur le corps, les saisons et la sagesse qui se dépose au fil du temps.'
                : 'Notes on the body, the seasons, and the wisdom that settles over time.'}
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-x-9 gap-y-4">
              <a
                href="#sommaire"
                className="group inline-flex items-center gap-2.5 min-h-[44px] text-[0.72rem] uppercase tracking-[0.2em] text-[#1c1712] border-b border-[#1c1712] pb-1.5 transition-colors duration-300 hover:text-[#7d6330] hover:border-[#9c7a44]"
              >
                {lang === 'FR' ? 'Lire le sommaire' : 'Read the contents'}
                <ArrowDown size={15} weight="regular" className="transition-transform duration-300 group-hover:translate-y-0.5" />
              </a>
              <a
                href="#infolettre"
                className="v2-serif italic text-lg text-[#1c1712]/70 hover:text-[#7d6330] transition-colors duration-300 min-h-[44px] inline-flex items-center"
              >
                {lang === 'FR' ? 'Recevoir chaque page' : 'Receive every page'}
              </a>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.8 }}
          className="flex items-end justify-between border-b border-[#1c1712]/15 pb-3.5 mt-[clamp(1.5rem,4vh,3rem)] text-[0.6rem] uppercase tracking-[0.28em] text-[#1c1712]/55"
        >
          <span className="flex items-center gap-2 v2-cue">
            <ArrowDown size={13} weight="regular" />
            {lang === 'FR' ? 'Faire défiler' : 'Scroll'}
          </span>
          <span className="hidden sm:inline">{lang === 'FR' ? 'Au fil de la plume' : 'Along the pen'}</span>
        </motion.div>
      </section>

      {/* ─────────── SOMMAIRE · articles en rangées éditoriales ─────────── */}
      <section id="sommaire" className={`relative w-full ${PX} py-[clamp(5rem,12vh,9rem)] scroll-mt-24`}>
        <Reveal className="max-w-[760px]">
          <Kicker className="mb-5">{lang === 'FR' ? 'Sommaire · Les écrits' : 'Contents · The writings'}</Kicker>
          <h2 className="v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2.2rem,5vw,4rem)]">
            {lang === 'FR' ? 'Au fil de la plume' : 'Along the pen'}
          </h2>
        </Reveal>
        <DrawRule className="mt-10 mb-14" />

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-10 h-10 border-2 border-t-transparent border-[#9c7a44] rounded-full animate-spin" aria-label="Chargement" />
          </div>
        ) : posts.length === 0 ? (
          /* État vide soigné */
          <Reveal>
            <div className="grid lg:grid-cols-[0.9fr_1.1fr] bg-[#faf6ee] border border-[#9c7a44]/25">
              <div className="relative min-h-[220px] grid place-items-center bg-[#efe6d7]">
                <span className="grid place-items-center w-16 h-16 rounded-full bg-[#9c7a44] text-[#faf6ee]">
                  <BookOpen size={26} weight="light" />
                </span>
              </div>
              <div className="p-[clamp(1.75rem,4vw,3.5rem)]">
                <Kicker>{lang === 'FR' ? 'À paraître' : 'Coming soon'}</Kicker>
                <h3 className="mt-4 v2-serif font-light text-[#1c1712] text-[clamp(1.7rem,3.2vw,2.5rem)] leading-[1.08]">
                  {lang === 'FR' ? 'Les premières pages s’écrivent.' : 'The first pages are being written.'}
                </h3>
                <p className="mt-5 text-[0.98rem] leading-[1.8] text-[#3a2f23] max-w-[48ch]">
                  {lang === 'FR'
                    ? 'Le journal arrive bientôt. Laissez votre adresse plus bas pour être prévenue dès la première publication.'
                    : 'The journal is on its way. Leave your address below to be notified of the very first entry.'}
                </p>
              </div>
            </div>
          </Reveal>
        ) : (
          <>
            {/* Article vedette · pleine largeur éditoriale */}
            {featured && (
              <Reveal>
                <article
                  onClick={() => openPost(featured)}
                  onKeyDown={(e) => keyOpen(e, featured)}
                  role="button"
                  tabIndex={0}
                  aria-label={featured.title}
                  className="group grid lg:grid-cols-[1.05fr_0.95fr] bg-[#faf6ee] border border-[#9c7a44]/25 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9c7a44] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f4efe6]"
                >
                  <div className="relative overflow-hidden min-h-[280px] aspect-[16/10] lg:aspect-auto">
                    {featured.coverImage ? (
                      <img
                        src={featured.coverImage}
                        alt={featured.title}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 will-change-transform group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center bg-[#efe6d7]">
                        <Feather size={34} weight="light" className="text-[#9c7a44]" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-center p-[clamp(1.75rem,4vw,3.5rem)]">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-6">
                      <span className="bg-[#1c1712] text-[#f4efe6] px-3 py-1.5 text-[0.58rem] uppercase tracking-[0.24em]">
                        {lang === 'FR' ? 'En couverture' : 'Cover story'}
                      </span>
                      {featured.date && (
                        <span className="text-[0.62rem] uppercase tracking-[0.24em] text-[#7d6330]">{featured.date}</span>
                      )}
                    </div>
                    <h3 className="v2-serif font-light leading-[1.05] text-[#1c1712] text-[clamp(2rem,4vw,3.2rem)] transition-colors duration-300 group-hover:text-[#7d6330]">
                      {featured.title}
                    </h3>
                    {featured.subtitle && (
                      <p className="mt-5 v2-serif italic text-[#3a2f23] text-[clamp(1.1rem,1.8vw,1.4rem)] leading-snug max-w-[46ch]">
                        {featured.subtitle}
                      </p>
                    )}
                    <span className="mt-9 inline-flex items-center gap-2.5 text-[0.72rem] uppercase tracking-[0.2em] text-[#1c1712] border-b border-[#1c1712] pb-1.5 self-start transition-colors duration-300 group-hover:text-[#7d6330] group-hover:border-[#9c7a44]">
                      {lang === 'FR' ? 'Lire l’article' : 'Read the article'}
                      <ArrowRight size={15} weight="regular" className="transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </div>
                </article>
              </Reveal>
            )}

            {/* Rangées éditoriales · numéros fantômes + filets tracés */}
            {rest.length > 0 && (
              <div className="mt-[clamp(3rem,7vh,5rem)]">
                <DrawRule />
                {rest.map((post, i) => (
                  <React.Fragment key={post.id}>
                    <Reveal delay={Math.min(i, 3) * 0.08} y={34}>
                      <article
                        onClick={() => openPost(post)}
                        onKeyDown={(e) => keyOpen(e, post)}
                        role="button"
                        tabIndex={0}
                        aria-label={post.title}
                        className="group grid items-center gap-x-[clamp(1.5rem,3.5vw,3.5rem)] gap-y-6 md:grid-cols-[minmax(90px,140px)_1fr] lg:grid-cols-[minmax(100px,150px)_1fr_minmax(200px,260px)] py-[clamp(2.25rem,5vh,3.75rem)] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9c7a44] focus-visible:ring-offset-4 focus-visible:ring-offset-[#f4efe6]"
                      >
                        <div className="hidden md:block self-start">
                          <GhostIndex n={i + 1} />
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                            <span className="md:hidden v2-serif font-light text-[#9c7a44]/60 text-2xl leading-none" aria-hidden>
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            {post.date && (
                              <span className="text-[0.62rem] uppercase tracking-[0.24em] text-[#7d6330]">{post.date}</span>
                            )}
                          </div>
                          <h3 className="mt-3 v2-serif font-light leading-[1.08] text-[#1c1712] text-[clamp(1.6rem,3vw,2.5rem)] transition-colors duration-300 group-hover:text-[#7d6330]">
                            {post.title}
                          </h3>
                          {post.subtitle && (
                            <p className="mt-3 text-[0.95rem] leading-[1.75] text-[#3a2f23] max-w-[62ch] line-clamp-2">
                              {post.subtitle}
                            </p>
                          )}
                          <span className="mt-6 inline-flex items-center gap-2.5 text-[0.66rem] uppercase tracking-[0.2em] text-[#1c1712] border-b border-[#1c1712]/60 pb-1 transition-colors duration-300 group-hover:text-[#7d6330] group-hover:border-[#9c7a44]">
                            {lang === 'FR' ? 'Lire l’article' : 'Read the article'}
                            <ArrowRight size={14} weight="regular" className="transition-transform duration-300 group-hover:translate-x-1" />
                          </span>
                        </div>

                        <div className="hidden lg:block relative">
                          <span className="pointer-events-none absolute -inset-1.5 border border-[#9c7a44]/30" aria-hidden />
                          <div className="relative aspect-[4/3] overflow-hidden">
                            {post.coverImage ? (
                              <img
                                src={post.coverImage}
                                alt={post.title}
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                className="h-full w-full object-cover transition-transform duration-700 will-change-transform group-hover:scale-[1.05]"
                              />
                            ) : (
                              <div className="h-full w-full grid place-items-center bg-[#efe6d7]">
                                <Feather size={26} weight="light" className="text-[#9c7a44]" />
                              </div>
                            )}
                          </div>
                        </div>
                      </article>
                    </Reveal>
                    <DrawRule delay={0.05} />
                  </React.Fragment>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* ─────────── BACK-COVER · citation + infolettre (arêtes nettes) ─────────── */}
      <section id="infolettre" className="relative w-full bg-[#34241a] text-[#f4efe6] overflow-hidden scroll-mt-24">
        <span className="absolute top-0 inset-x-0 h-px bg-[#9c7a44]/70 z-10" aria-hidden />
        <Atmosphere light="72% 10%" strength={0.85} />

        <div className={`relative z-10 w-full ${PX} py-[clamp(5.5rem,13vh,9.5rem)] grid items-center gap-x-[clamp(3rem,7vw,7rem)] gap-y-14 lg:grid-cols-[1.05fr_0.95fr]`}>
          <Reveal>
            <Kicker on="dark" className="mb-7">
              {lang === 'FR' ? 'Quatrième de couverture' : 'Back cover'}
            </Kicker>
            <blockquote className="v2-serif italic font-light text-[#f4efe6] text-[clamp(1.7rem,3.6vw,2.8rem)] leading-[1.24]">
              {lang === 'FR'
                ? '« La sagesse se dépose au fil du temps. Ces pages la recueillent, saison après saison. »'
                : '“Wisdom settles over time. These pages gather it, season after season.”'}
            </blockquote>
            <a
              href="#sommaire"
              className="group mt-10 inline-flex items-center gap-2.5 min-h-[44px] text-[0.72rem] uppercase tracking-[0.2em] text-[#f4efe6] border-b border-[#f4efe6]/70 pb-1.5 transition-colors duration-300 hover:text-[#c8a86a] hover:border-[#c8a86a]"
            >
              {lang === 'FR' ? 'Relire le sommaire' : 'Back to the contents'}
              <ArrowRight size={15} weight="regular" className="transition-transform duration-300 group-hover:translate-x-1" />
            </a>
          </Reveal>

          <Reveal delay={0.12}>
            <Kicker on="dark" className="mb-5">{lang === 'FR' ? 'Rester au fil' : 'Stay in the thread'}</Kicker>
            <h2 className="v2-serif font-light leading-[1.05] text-[#f4efe6] text-[clamp(1.9rem,3.6vw,2.9rem)]">
              {lang === 'FR' ? 'Recevez chaque nouvelle page' : 'Receive every new page'}
            </h2>
            <p className="mt-5 v2-serif italic text-[clamp(1.05rem,1.8vw,1.35rem)] text-[#f4efe6]/75 max-w-[40ch] leading-snug">
              {lang === 'FR'
                ? 'Les écrits, les saisons et les rituels, déposés directement dans votre boîte.'
                : 'The writings, the seasons and the rituals, delivered straight to your inbox.'}
            </p>
            <div className="mt-8">
              <NewsletterSignup source="blogue" variant="dark" className="max-w-[520px]" />
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
};

export default BlogueLoeuvre;
