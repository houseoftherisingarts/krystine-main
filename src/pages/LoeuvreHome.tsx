import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import {
  ArrowRight, ArrowUpRight, Sparkles, Compass, Repeat, Leaf,
  Waves, DoorOpen, MousePointerClick, BookOpen, Mic, Headphones,
  Users, Tent, FlaskConical,
} from 'lucide-react';

/**
 * LoeuvreHome : la page d'accueil portée dans l'app React, au style L'Œuvre.
 * Reprend la narration du bundle statique public/accueil/index.html
 * (hero « L'Œuvre », trilogie, fil central, les portes, comment tout se relie,
 * offres, clôture / infolettre), traduit dans la palette canonique
 * espresso / cream / brass de DESIGN.md.
 *
 * Aucun NavBar / Footer ici : le chrome est monté globalement par App.tsx.
 * La page commence à la section hero et se termine avant le footer partagé.
 */

const ease = [0.22, 1, 0.36, 1] as const;

/* ════════════════════════ Primitives ════════════════════════ */

const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({
  children, delay = 0, className,
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 28 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-12%' }}
    transition={{ duration: 0.7, ease, delay }}
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
  <h2 className={`font-serif font-medium leading-[1.04] text-[clamp(2rem,4.4vw,3.4rem)] ${on === 'dark' ? 'text-ctext' : 'text-ink'} ${className}`}>
    {children}
  </h2>
);

/* ════════════════════════ Données ════════════════════════ */

const FIL_PILIERS = [
  { icon: <Compass size={22} />, label: 'Corps' },
  { icon: <Repeat size={22} />, label: 'Cycles' },
  { icon: <Leaf size={22} />, label: 'Nature' },
  { icon: <Waves size={22} />, label: 'Rythme' },
  { icon: <DoorOpen size={22} />, label: 'Passages' },
  { icon: <MousePointerClick size={22} />, label: 'Choix quotidiens' },
];

type Porte = {
  num: string;
  title: string;
  desc: string;
  cta: string;
  img: string;
  to?: string;
  href?: string;
  icon: React.ReactNode;
};

const PORTES: Porte[] = [
  {
    num: '01', title: 'Expérience Origine',
    desc: "Un parcours pour revenir à un repère intérieur plus stable et transformer sa relation à soi, au corps et à la vie.",
    cta: 'Découvrir', to: '/origine', img: '/accueil/assets/portes/origine.png',
    icon: <Compass size={18} />,
  },
  {
    num: '02', title: 'Le Podcast',
    desc: "Des épisodes pour ouvrir la réflexion, questionner, comprendre et revenir à l'essentiel.",
    cta: 'Écouter', to: '/podcast', img: '/accueil/assets/portes/podcast.png',
    icon: <Mic size={18} />,
  },
  {
    num: '03', title: 'Les Livres',
    desc: "Les fondations écrites de l'œuvre : sagesse du corps, cycles, plantes, alimentation, saisons et transformation.",
    cta: 'Découvrir', to: '/medias', img: '/accueil/assets/portes/livres.png',
    icon: <BookOpen size={18} />,
  },
  {
    num: '04', title: 'Les Retraites',
    desc: "Des espaces en nature pour déposer le bruit, revenir au corps et s'ouvrir à la transformation.",
    cta: 'Découvrir', to: '/liste-attente?programme=retraite', img: '/accueil/assets/portes/retraites.png',
    icon: <Tent size={18} />,
  },
  {
    num: '05', title: 'Les Conférences',
    desc: 'Conférences et soirées de parole pour partager la vision et inspirer le changement.',
    cta: 'Inviter', to: '/krystine', img: '/accueil/assets/portes/conferences.png',
    icon: <Users size={18} />,
  },
  {
    num: '06', title: 'Inspirata Ayurveda',
    desc: "Les huiles, les plantes et les rituels de soin pour incarner l'œuvre au quotidien.",
    cta: 'Découvrir', href: 'https://inspiratanature.com', img: '/accueil/assets/portes/inspirata.png',
    icon: <FlaskConical size={18} />,
  },
];

type Node = { label: string; icon: React.ReactNode; to?: string; href?: string };
const RELIE_NODES: Node[] = [
  { label: 'Les Livres', icon: <BookOpen size={18} />, to: '/medias' },
  { label: 'Le Podcast', icon: <Headphones size={18} />, to: '/podcast' },
  { label: 'Inspirata Ayurveda', icon: <FlaskConical size={18} />, href: 'https://inspiratanature.com' },
  { label: 'Expérience Origine', icon: <Compass size={18} />, to: '/origine' },
  { label: 'Les Conférences', icon: <Users size={18} />, to: '/krystine' },
  { label: 'Les Retraites', icon: <Tent size={18} />, to: '/liste-attente?programme=retraite' },
];

/* ════════════════════════ Porte (carte) ════════════════════════ */

const PorteCard: React.FC<{ porte: Porte; index: number }> = ({ porte, index }) => {
  const inner = (
    <motion.article
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3, ease }}
      className="group relative h-full overflow-hidden rounded-[1.4rem] border border-cream3 bg-espressoDeep shadow-[0_18px_42px_rgba(40,28,16,0.18)]"
    >
      <div className="relative aspect-[3/3.6] overflow-hidden">
        <img
          src={porte.img}
          alt={porte.title}
          loading="lazy"
          className="h-full w-full object-cover brightness-[0.94] saturate-[0.95] transition-transform duration-700 group-hover:scale-[1.06]"
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(22,16,10,0.30) 0%, transparent 28%, transparent 52%, rgba(22,16,10,0.86) 100%)' }}
        />
        <span className="absolute left-5 top-4 font-serif italic text-[1.05rem] text-ctext/85">{porte.num}</span>
      </div>
      <div className="absolute inset-x-0 bottom-0 p-6 md:p-7">
        <span className="mb-3 inline-grid h-10 w-10 place-items-center rounded-full border border-brass/40 bg-espressoDeep/60 text-brass backdrop-blur">
          {porte.icon}
        </span>
        <h3 className="font-serif text-[1.5rem] leading-[1.1] text-ctext">{porte.title}</h3>
        <p className="mt-2 max-w-[40ch] font-sans text-[0.86rem] leading-[1.65] text-ctextSoft">{porte.desc}</p>
        <span className="mt-4 inline-flex items-center gap-2 font-sans text-[0.62rem] uppercase tracking-[0.2em] text-brassBright">
          {porte.cta}
          <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </div>
    </motion.article>
  );

  return (
    <Reveal delay={(index % 3) * 0.08} className="h-full">
      {porte.to ? (
        <Link to={porte.to} className="block h-full">{inner}</Link>
      ) : (
        <a href={porte.href} target="_blank" rel="noopener noreferrer" className="block h-full">{inner}</a>
      )}
    </Reveal>
  );
};

/* ════════════════════════ Page ════════════════════════ */

const LoeuvreHome: React.FC = () => {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const heroParallax = useTransform(scrollYProgress, [0, 0.18], ['0%', '14%']);

  return (
    <div className="scroll-smooth bg-cream text-ink font-sans antialiased">

      {/* ─────────── Header d'origine de la home ───────────
          Header propre à la page d'accueil (logo + ancres internes), distinct
          du NavBar du site. Posé en absolu au-dessus du hero, il défile avec la
          page ; le NavBar (fonctions du site) prend le relais à la Trilogie. */}
      <header className="absolute inset-x-0 top-0 z-30">
        <nav className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-6 px-6 py-6 md:px-12">
          <a
            href="#oeuvre"
            className="font-serif text-[1.2rem] leading-[1.05] tracking-[0.01em] text-ctext transition-colors hover:text-brassBright"
          >
            Krystine<br />St-Laurent
          </a>
          <ul className="hidden items-center gap-7 md:flex lg:gap-9">
            {([
              ["L'Œuvre", '#oeuvre'],
              ['Origine', '#origine'],
              ['Les Portes', '#portes'],
              ['Tout se relie', '#relie'],
              ['Contact', '#contact'],
            ] as const).map(([label, href]) => (
              <li key={href}>
                <a
                  href={href}
                  className="font-sans text-[0.62rem] uppercase tracking-[0.22em] text-ctextSoft transition-colors hover:text-brassBright"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {/* ─────────── HERO · L'Œuvre ─────────── */}
      <section id="oeuvre" className="relative flex min-h-screen items-center overflow-hidden bg-espressoDeep">
        {/* cinémagraphe (réutilise l'asset du home statique) */}
        <motion.div
          className="absolute inset-0 z-0"
          style={reduce ? undefined : { y: heroParallax }}
          aria-hidden
        >
          <video
            className="absolute right-0 top-1/2 h-full w-auto min-w-full -translate-y-1/2 object-cover md:left-auto md:w-[84%]"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="/accueil/assets/hero-ml-poster.jpg"
          >
            <source src="/accueil/assets/hero-motionleap.mp4" type="video/mp4" />
          </video>
        </motion.div>
        {/* voile lisible, du sombre vers la transparence */}
        <div
          className="absolute inset-0 z-[1]"
          style={{ background: 'linear-gradient(90deg, rgba(22,16,10,0.95) 0%, rgba(22,16,10,0.86) 20%, rgba(22,16,10,0.6) 40%, rgba(22,16,10,0.28) 60%, rgba(22,16,10,0.1) 76%, rgba(22,16,10,0) 92%)' }}
          aria-hidden
        />

        <motion.div
          className="relative z-[2] mx-auto w-full max-w-[1280px] px-6 md:px-12 py-28"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09 } } }}
        >
          {(() => {
            const item = {
              hidden: { opacity: 0, y: 24 },
              show: { opacity: 1, y: 0, transition: { duration: 0.9, ease } },
            };
            return (
              <div className="max-w-[34rem]">
                <motion.h1
                  variants={item}
                  className="font-serif font-medium text-ctext leading-[0.84] tracking-[0.015em] text-[clamp(4.5rem,10vw,8.6rem)]"
                >
                  L'Œuvre
                </motion.h1>
                <motion.p
                  variants={item}
                  className="mt-6 font-serif font-medium uppercase tracking-[0.05em] leading-[1.28] text-ctext text-[clamp(1.2rem,2.2vw,1.7rem)]"
                >
                  Le corps porte le même langage<br />
                  que celui de la nature.<br />
                  Il ne demande qu'à être écouté.
                </motion.p>
                <motion.p
                  variants={item}
                  className="mt-6 max-w-[42ch] font-sans text-[0.95rem] leading-[1.85] text-ctextSoft"
                >
                  Depuis plus de 37 ans, Krystine St-Laurent relie les savoirs ancestraux,
                  la sagesse du corps et l'expérience de la nature pour accompagner les
                  passages de transformation intérieure.
                </motion.p>
                <motion.div variants={item} className="mt-9">
                  <Link
                    to="/origine"
                    className="inline-flex items-center gap-3 rounded-full bg-brass px-9 py-4 font-sans text-[0.69rem] font-medium uppercase tracking-[0.22em] text-espressoDeep transition-colors duration-300 hover:bg-brassBright min-h-[44px]"
                  >
                    Découvrir l'œuvre
                    <ArrowRight size={16} />
                  </Link>
                </motion.div>
              </div>
            );
          })()}
        </motion.div>
      </section>

      {/* ─────────── TRILOGIE D'ORIGINE ─────────── */}
      <section id="origine" className="bg-cream py-24 md:py-32">
        <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 items-center gap-12 px-6 md:px-12 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <Eyebrow>L'œuvre fondatrice</Eyebrow>
            <SectionTitle className="mt-4 uppercase tracking-[0.01em]">La Trilogie<br />d'Origine</SectionTitle>
            <div className="mt-5 h-px w-16 bg-brass" />
            <p className="mt-7 max-w-[46ch] font-sans text-[1.05rem] leading-[1.85] text-inkSoft">
              Trois livres. 8 ans. 1200 pages inspirées de l'Ayurveda,{' '}
              <span className="font-medium text-brassInk">et une partie de leur contenu inédit nourrit Expérience Origine avant même sa publication.</span>
            </p>
            <p className="mt-6 font-serif text-[1.25rem] italic leading-snug text-terracotta">
              La trilogie donne <span className="text-brassInk">les mots</span>. Origine donne <span className="text-brassInk">l'expérience</span>.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/medias"
                className="inline-flex items-center gap-2 rounded-full bg-brass px-7 py-3.5 font-sans text-[0.63rem] uppercase tracking-[0.2em] text-espressoDeep transition-colors hover:bg-brassBright min-h-[44px]"
              >
                Découvrir la trilogie
              </Link>
              <Link
                to="/origine"
                className="inline-flex items-center gap-2 rounded-full border border-brass px-7 py-3.5 font-sans text-[0.63rem] uppercase tracking-[0.2em] text-ink transition-colors hover:bg-brass hover:text-espressoDeep min-h-[44px]"
              >
                Être informée de la sortie
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="relative overflow-hidden rounded-[2rem] border border-cream3 bg-card p-5 shadow-xl md:p-8">
              <img
                src="/accueil/assets/trilogy-books.png"
                alt="La Trilogie d'Origine, trois livres de Krystine St-Laurent"
                loading="lazy"
                className="mx-auto h-auto max-h-[520px] w-full object-contain"
              />
            </div>
            <p className="mt-6 text-center font-serif text-[1.05rem] italic leading-snug text-inkSoft">
              La trilogie pose les fondations écrites. Le retour au point d'origine devient l'axe de l'œuvre.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ─────────── LE FIL CENTRAL ─────────── */}
      <section className="relative overflow-hidden bg-espresso py-24 md:py-32">
        <div className="pointer-events-none absolute -top-1/4 -right-1/4 h-[60%] w-[55%] rounded-full bg-brass/10 blur-[150px]" aria-hidden />
        <div className="pointer-events-none absolute -bottom-1/4 -left-1/4 h-[55%] w-[50%] rounded-full bg-forest/12 blur-[150px]" aria-hidden />
        <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 items-center gap-12 px-6 md:px-12 lg:grid-cols-[0.92fr_1fr] lg:gap-16">
          {/* La roue aquarelle, flottement + rotation continue lente */}
          <Reveal className="flex justify-center">
            <div className="relative flex aspect-square w-full max-w-[440px] items-center justify-center">
              <motion.img
                src="/accueil/assets/wheel-watercolor.png"
                alt="Roue du retour au point d'origine"
                draggable={false}
                className="w-full"
                style={{ WebkitMaskImage: 'radial-gradient(closest-side, black 64%, transparent 82%)', maskImage: 'radial-gradient(closest-side, black 64%, transparent 82%)' }}
                animate={reduce ? undefined : { rotate: 360 }}
                transition={reduce ? undefined : { duration: 160, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="absolute grid aspect-square w-[34%] place-items-center rounded-full text-center font-serif text-[clamp(0.7rem,1.1vw,0.95rem)] uppercase leading-[1.3] tracking-[0.12em] text-espressoDeep"
                style={{ background: 'radial-gradient(circle at 50% 38%, #dcb874, #c79a52 70%, #a3823f)', boxShadow: '0 12px 30px rgba(120,90,40,0.32), inset 0 1px 6px rgba(244,236,224,0.4)' }}
                animate={reduce ? undefined : { y: [-6, 6, -6] }}
                transition={reduce ? undefined : { duration: 7, repeat: Infinity, ease: 'easeInOut' }}
              >
                Retour au point d'origine
              </motion.div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="font-serif font-medium uppercase tracking-[0.08em] text-brass text-[clamp(1.5rem,2.6vw,2.1rem)]">Le fil central :</p>
            <SectionTitle on="dark" className="mt-1 uppercase tracking-[0.01em]">Le retour au point d'origine</SectionTitle>
            <p className="mt-6 max-w-[48ch] font-sans text-[0.98rem] leading-[1.9] text-ctextSoft">
              Revenir à l'axe qui relie l'ensemble de l'œuvre. Il invite à revenir à un repère
              intérieur plus stable, à travers le corps, les rythmes, les saisons, la matière
              et les passages de vie.
            </p>
            <div className="mt-9 flex flex-wrap gap-x-9 gap-y-7">
              {FIL_PILIERS.map((p) => (
                <div key={p.label} className="flex w-[64px] flex-col items-center gap-2.5 text-center">
                  <span className="text-brass">{p.icon}</span>
                  <span className="font-sans text-[0.55rem] uppercase leading-[1.25] tracking-[0.13em] text-ctextSoft">{p.label}</span>
                </div>
              ))}
            </div>
            <p className="mt-9 font-serif text-[1.2rem] italic text-brassBright">Tout part de là. Tout s'y relie.</p>
          </Reveal>
        </div>
      </section>

      {/* ─────────── LES PORTES D'ENTRÉE ─────────── */}
      <section id="portes" className="bg-cream py-24 md:py-32">
        <div className="mx-auto w-full max-w-[1280px] px-6 md:px-12">
          <Reveal className="text-center">
            <Eyebrow>Six chemins, un même centre</Eyebrow>
            <SectionTitle className="mt-4 uppercase tracking-[0.04em]">Les portes d'entrée</SectionTitle>
            <div className="mx-auto mt-5 h-px w-16 bg-brass" />
          </Reveal>
          <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {PORTES.map((porte, i) => (
              <PorteCard key={porte.num} porte={porte} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── COMMENT TOUT SE RELIE ─────────── */}
      <section id="relie" className="bg-cream2 py-24 md:py-32">
        <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 items-center gap-12 px-6 md:px-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <Reveal>
            <Eyebrow>L'architecture de l'œuvre</Eyebrow>
            <SectionTitle className="mt-4 uppercase tracking-[0.01em]">Comment tout<br />se relie</SectionTitle>
            <div className="mt-5 h-px w-16 bg-brass" />
            <p className="mt-7 max-w-[42ch] font-sans text-[1rem] leading-[1.85] text-inkSoft">
              Chaque porte mène au même centre : revenir au corps, au rythme, à la nature
              et à ce qui organise la vie de l'intérieur.
            </p>
            <Link
              to="/origine"
              className="mt-8 inline-flex items-center gap-2 border-b border-transparent pb-1 font-sans text-[0.66rem] uppercase tracking-[0.2em] text-terracotta transition-colors hover:border-terracotta min-h-[44px]"
            >
              Voir l'ensemble de l'œuvre
              <ArrowRight size={14} />
            </Link>
          </Reveal>

          {/* Le moyeu : le centre + les six accès qui convergent */}
          <Reveal delay={0.1}>
            <div className="rounded-[2rem] border border-cream3 bg-card p-7 md:p-10 shadow-[0_18px_44px_rgba(40,28,16,0.1)]">
              <div className="mb-8 flex flex-col items-center gap-3 text-center">
                <motion.span
                  className="grid h-24 w-24 place-items-center rounded-full text-center font-serif text-[0.72rem] uppercase leading-[1.2] tracking-[0.08em] text-espressoDeep"
                  style={{ background: 'radial-gradient(circle at 50% 38%, #dcb874, #c79a52 72%, #a3823f)', boxShadow: '0 12px 34px rgba(120,90,40,0.3), inset 0 1px 6px rgba(244,236,224,0.45)', padding: '0.7rem' }}
                  animate={reduce ? undefined : { scale: [1, 1.03, 1] }}
                  transition={reduce ? undefined : { duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                >
                  Retour au point d'origine
                </motion.span>
                <span className="font-sans text-[0.58rem] uppercase tracking-[0.2em] text-inkSoft">le centre</span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {RELIE_NODES.map((node, i) => {
                  const body = (
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.3, ease }}
                      className="group flex h-full flex-col items-center gap-2.5 rounded-2xl border border-brass/25 bg-cream2 px-3 py-5 text-center transition-colors hover:border-brass"
                    >
                      <span className="grid h-11 w-11 place-items-center rounded-full border border-brass/40 bg-card text-brassInk transition-transform duration-300 group-hover:scale-110">
                        {node.icon}
                      </span>
                      <span className="font-sans text-[0.58rem] font-semibold uppercase leading-[1.3] tracking-[0.13em] text-ink">{node.label}</span>
                    </motion.div>
                  );
                  return (
                    <Reveal key={node.label} delay={(i % 3) * 0.06} className="h-full">
                      {node.to
                        ? <Link to={node.to} className="block h-full">{body}</Link>
                        : <a href={node.href} target="_blank" rel="noopener noreferrer" className="block h-full">{body}</a>}
                    </Reveal>
                  );
                })}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─────────── OFFRES · saison + premiers rituels ─────────── */}
      <section className="bg-cream py-24 md:py-32">
        <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 items-stretch gap-6 px-6 md:px-12 lg:grid-cols-[1.25fr_0.85fr]">
          {/* Saison Pitta · Été (carte sombre, chaleur dorée) */}
          <Reveal className="h-full">
            <a
              href="https://krystinestlaurent.mykajabi.com/experience-ayurveda-saison-estivale"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex h-full overflow-hidden rounded-[1.6rem] border border-brass/25 shadow-[0_20px_50px_rgba(40,28,16,0.26)] transition-transform duration-500 hover:-translate-y-1"
              style={{ background: 'linear-gradient(150deg, #16100a, #2a2015)' }}
            >
              <span
                className="pointer-events-none absolute inset-0"
                style={{ background: 'radial-gradient(80% 70% at 88% 18%, rgba(220,184,116,0.4), rgba(199,154,82,0.12) 38%, transparent 66%)' }}
                aria-hidden
              />
              <div className="relative z-[1] flex flex-col items-start justify-center p-9 md:p-12">
                <span className="font-serif text-[0.78rem] uppercase tracking-[0.24em] text-brassBright">Saison en cours · Pitta</span>
                <h3 className="mt-4 font-serif font-medium uppercase tracking-[0.01em] leading-[1.05] text-ctext text-[clamp(1.9rem,3.2vw,2.7rem)]">
                  L'Expérience Ayurveda · Été
                </h3>
                <p className="mt-3 font-serif text-[1.15rem] italic text-terracotta">Rafraîchir · Apaiser · Adoucir</p>
                <p className="mt-5 max-w-[44ch] font-sans text-[0.9rem] leading-[1.8] text-ctextSoft">
                  Quand la chaleur monte, le feu intérieur s'emballe. Un parcours de 7 semaines
                  pour traverser la saison Pitta avec clarté, sans se brûler.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-6">
                  <span className="inline-flex items-center gap-2 font-sans text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-brassBright">
                    Découvrir l'expérience
                    <ArrowUpRight size={16} className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </span>
                  <span className="font-sans text-[0.6rem] uppercase tracking-[0.2em] text-ctextSoft">7 semaines · Disponible</span>
                </div>
              </div>
            </a>
          </Reveal>

          {/* Premiers rituels (carte crème, lecture en 2 secondes) */}
          <Reveal delay={0.1} className="h-full">
            <a
              href="https://www.krystinestlaurent.com/offers/2ksjqcW3/checkout"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex h-full flex-col justify-center overflow-hidden rounded-[1.6rem] border border-brass/30 bg-card p-9 shadow-[0_16px_40px_rgba(40,28,16,0.12)] transition-transform duration-500 hover:-translate-y-1"
            >
              <Sparkles size={26} className="absolute right-6 top-6 text-brass/40" aria-hidden />
              <span className="font-serif text-[0.78rem] uppercase tracking-[0.24em] text-brassInk">Premier pas · Accessible</span>
              <h3 className="mt-4 font-serif font-medium leading-[1.08] text-ink text-[clamp(1.8rem,3vw,2.5rem)]">
                Découvrez les<br /><span className="text-terracotta">premiers rituels</span>
              </h3>
              <div className="mt-7">
                <span className="block font-sans text-[0.62rem] font-semibold uppercase tracking-[0.26em] text-brassInk">Accès immédiat</span>
                <span className="mt-1 block font-serif leading-none text-ink text-[clamp(2.8rem,6vw,3.6rem)]">27 $</span>
              </div>
              <span className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-brass px-7 py-3.5 font-sans text-[0.66rem] uppercase tracking-[0.2em] text-espressoDeep transition-colors group-hover:bg-brassBright min-h-[44px]">
                Commencer le parcours
                <ArrowRight size={15} />
              </span>
            </a>
          </Reveal>
        </div>
      </section>

      {/* ─────────── CLÔTURE · rester relié à L'Œuvre ─────────── */}
      <section id="contact" className="bg-espresso py-24 md:py-32">
        <div className="mx-auto w-full max-w-[820px] px-6 md:px-12 text-center">
          <Reveal>
            <p className="font-serif italic leading-[1.42] text-ctext text-[clamp(1.6rem,3.4vw,2.4rem)]">
              « Le retour à soi est le plus grand acte de transformation. »
            </p>
            <p
              className="mt-5 text-[2rem] text-brass"
              style={{ fontFamily: '"Pinyon Script", cursive' }}
            >
              Krystine
            </p>
            <div className="mx-auto mt-9 h-px w-16 bg-brass/40" />
            <p className="mt-8 max-w-[44ch] mx-auto font-sans text-[0.95rem] leading-[1.85] text-ctextSoft">
              Recevez les prochaines transmissions, inspirations et invitations de Krystine St-Laurent,
              et restez reliée à l'ensemble de l'œuvre.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-5">
              <Link
                to="/origine"
                className="inline-flex items-center gap-3 rounded-full bg-brass px-9 py-4 font-sans text-[0.69rem] uppercase tracking-[0.22em] text-espressoDeep transition-colors hover:bg-brassBright min-h-[44px]"
              >
                Entrer dans l'œuvre
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/krystine"
                className="inline-flex items-center gap-2 border-b border-brass/30 pb-1 font-serif text-lg italic text-brassBright transition-colors hover:text-brass"
              >
                Rencontrer Krystine
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

    </div>
  );
};

export default LoeuvreHome;
