import React, { useEffect, useRef, useState } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  useReducedMotion,
} from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Atmosphere, KenBurns } from '../components/motion/loeuvre';
import BodySections from './foyer/BodySections';

/**
 * Le Foyer d'Origine · page de vente (work in progress, URL dédiée /foyer).
 * Concept « l'allumage » : la page ouvre dans la nuit (espresso), le sceau
 * se dessine, la braise s'allume, et le premier scroll fait prendre le feu
 * avant que la scène se réchauffe vers la crème éditoriale.
 * Skills: premium-web (orchestrateur) + recettes motionsites-maison
 * B2/B4 (preloader + entrée staggered), D4 Atmosphere, C2 Seam, D1 anti-centré.
 */

const ease = [0.16, 0.8, 0.24, 1] as const;
const CTA_HREF = '/liste-attente?programme=foyer';

/* ── Sceau concentrique (le mark du PDF) · se dessine au chargement ── */
const Seal: React.FC<{ animate?: boolean; className?: string }> = ({
  animate = true,
  className = '',
}) => (
  <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden>
    {[52, 34].map((r, i) => (
      <motion.circle
        key={r}
        cx="60"
        cy="60"
        r={r}
        stroke="#bb9a5e"
        strokeWidth={i === 0 ? 1 : 1.4}
        initial={animate ? { pathLength: 0, opacity: 0 } : false}
        animate={{ pathLength: 1, opacity: i === 0 ? 0.55 : 0.9 }}
        transition={{ duration: 0.9, ease, delay: 0.1 + i * 0.25 }}
      />
    ))}
    <motion.circle
      cx="60"
      cy="60"
      r="7"
      fill="#c79a52"
      initial={animate ? { scale: 0, opacity: 0 } : false}
      animate={{ scale: [0, 1.25, 1], opacity: 1 }}
      transition={{ duration: 0.7, ease, delay: 0.62 }}
      style={{ transformOrigin: '60px 60px' }}
    />
  </svg>
);

/* ── Preloader ~1s : nuit, le sceau se dessine, la braise s’allume ── */
const Preloader: React.FC<{ done: boolean }> = ({ done }) => (
  <AnimatePresence>
    {!done && (
      <motion.div
        className="fixed inset-0 z-[90] flex items-center justify-center bg-espressoDeep"
        exit={{ opacity: 0 }}
        transition={{ duration: 0.7, ease }}
      >
        <div className="relative">
          <Seal className="h-28 w-28" />
          <motion.p
            className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap font-sans text-[0.6rem] uppercase tracking-[0.34em] text-ctextSoft"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.85 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            Le Foyer d’Origine
          </motion.p>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

/* ── CTA brass ── */
const Cta: React.FC<{ label: string; sub?: string; dark?: boolean }> = ({
  label,
  sub,
  dark,
}) => (
  <div className="flex flex-col items-start gap-3">
    <Link
      to={CTA_HREF}
      className="group inline-flex items-center gap-3 rounded-[30px] bg-brass px-9 py-4 font-sans text-[0.78rem] font-semibold uppercase tracking-[0.22em] text-espresso shadow-glow transition-colors duration-300 hover:bg-brassBright"
    >
      {label}
      <ArrowRight
        size={16}
        className="transition-transform duration-300 group-hover:translate-x-1"
      />
    </Link>
    {sub && (
      <span
        className={`font-sans text-[0.7rem] tracking-[0.08em] ${
          dark ? 'text-ctextSoft' : 'text-inkSoft'
        }`}
      >
        {sub}
      </span>
    )}
  </div>
);

/* ── Hero : nuit espresso, type display, braise au repos ── */
const Hero: React.FC<{ ready: boolean }> = ({ ready }) => {
  const reduce = useReducedMotion();
  const stagger = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 26 },
          animate: ready ? { opacity: 1, y: 0 } : {},
          transition: { duration: 1.1, ease, delay: 0.15 + i * 0.16 },
        };
  return (
    <header className="relative flex min-h-screen flex-col justify-end overflow-hidden bg-espressoDeep">
      {/* l'âtre en pleine page : Ken Burns lent, gradient bas pour la lisibilité */}
      <div className="absolute inset-0" aria-hidden>
        <KenBurns src="/foyer/hero-atre.webp" />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, #16100a 6%, rgba(22,16,10,0.78) 38%, rgba(22,16,10,0.35) 66%, rgba(22,16,10,0.6) 100%)',
          }}
        />
      </div>
      <Atmosphere light="74% 18%" strength={0.9} />
      {/* braise ambiante au repos */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(34% 26% at 50% 88%, rgba(176,106,63,0.16), transparent 70%)',
          animation: reduce ? undefined : 'foyerBreathe 5.5s ease-in-out infinite',
        }}
      />
      <Seal
        animate={false}
        className="pointer-events-none absolute right-[6%] top-[12%] h-40 w-40 opacity-[0.22] md:h-56 md:w-56"
      />
      <div className="relative z-10 w-full px-6 pb-16 pt-36 md:px-12 md:pb-20 lg:px-20">
        <motion.div {...stagger(0)}>
          <span className="mb-4 block h-px w-10 bg-brass" aria-hidden />
          <p className="font-sans text-[0.62rem] uppercase tracking-[0.3em] text-brass">
            KSL | Le Foyer d’Origine
          </p>
        </motion.div>
        <motion.h1
          {...stagger(1)}
          className="mt-6 max-w-5xl font-serif text-[2.6rem] font-semibold leading-[1.04] text-ctext md:text-[4.4rem] lg:text-[5.2rem]"
        >
          Nous n’avons jamais eu autant d’information.
          <span className="block text-brassBright">
            Et jamais autant de dispersion.
          </span>
        </motion.h1>
        <motion.p
          {...stagger(2)}
          className="mt-8 max-w-xl font-serif text-xl leading-relaxed text-ctextSoft md:text-2xl"
        >
          Un espace privé en ligne pour découvrir ce que nous n’aurions pas su
          chercher et accéder à des liens impossibles à demander dans une barre
          de recherche.
        </motion.p>
        <motion.div {...stagger(3)} className="mt-10">
          <Cta label="Entrer dans le Foyer" sub="497 $ | 12 mois d’accès" dark />
        </motion.div>
      </div>
      {/* indice de défilement */}
      <motion.div
        className="relative z-10 flex justify-center pb-8"
        initial={{ opacity: 0 }}
        animate={ready ? { opacity: 1 } : {}}
        transition={{ delay: 1.2, duration: 0.8 }}
      >
        <span
          className="font-sans text-[0.6rem] uppercase tracking-[0.3em] text-ctextSoft"
          style={{ animation: reduce ? undefined : 'foyerCue 2.6s ease-in-out infinite' }}
        >
          Défiler
        </span>
      </motion.div>
      <style>{`
        @keyframes foyerBreathe{0%,100%{opacity:.75}50%{opacity:1}}
        @keyframes foyerCue{0%,100%{opacity:.45;transform:translateY(0)}50%{opacity:1;transform:translateY(4px)}}
      `}</style>
    </header>
  );
};

/* ── Allumage : section pinnée, le premier scroll fait prendre le feu,
      puis la scène se réchauffe de l'espresso vers la crème. ── */
const LINES = [
  'Une place autour du feu.',
  'Un rythme simple.',
  'Une autre manière de voir.',
];

const Allumage: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  /* la video (3 Mo) ne se charge qu'a l'approche de la section */
  const [videoNear, setVideoNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVideoNear(true);
          io.disconnect();
        }
      },
      { rootMargin: '900px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  /* Progression maison (pattern /communaute) : useScroll({target}) mesurait
     toute la page ici au lieu de la section, alors on lit le rect nous-mêmes.
     p = distance parcourue dans le pin / hauteur scrollable de la section. */
  const scrollYProgress = useMotionValue(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      if (total <= 0) return;
      scrollYProgress.set(Math.min(1, Math.max(0, -r.top / total)));
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [scrollYProgress]);
  const emberScale = useTransform(scrollYProgress, [0, 0.6], [0.25, 3.1]);
  /* le feu anime s'efface quand la video du matin se revele */
  const emberOpacity = useTransform(scrollYProgress, [0, 0.12, 0.55, 0.7], [0, 0.5, 1, 0]);
  /* la braise macro reelle derriere le feu anime; s'efface avant la video */
  const bgEmber = useTransform(scrollYProgress, [0, 0.15, 0.5, 0.64], [0, 0.4, 0.6, 0]);
  /* le coeur incandescent monte avec la progression : de la braise sombre a l'or */
  const coreHeat = useTransform(scrollYProgress, [0.12, 0.55, 0.7], [0, 1, 0]);
  /* les lignes s'effacent pour laisser la scene au matin */
  const textFade = useTransform(scrollYProgress, [0.14, 0.6, 0.72], [1, 1, 0]);
  /* le climax : la video du foyer au matin, revelee plein cadre */
  const videoOpacity = useTransform(scrollYProgress, [0.58, 0.76, 0.9, 0.99], [0, 1, 1, 0.35]);
  const kickerFade = useTransform(scrollYProgress, [0.74, 0.84], [0, 1]);
  /* la couture creme se pose sur la fin du matin */
  const warm = useTransform(scrollYProgress, [0.88, 1], [0, 1]);
  /* hooks appelés inconditionnellement, dans le même ordre à chaque rendu */
  const lineStyles = [0, 1, 2].map((i) => ({
    opacity: useTransform(
      scrollYProgress,
      [0.14 + i * 0.15, 0.24 + i * 0.15],
      [0, 1],
    ),
    y: useTransform(
      scrollYProgress,
      [0.14 + i * 0.15, 0.24 + i * 0.15],
      [30, 0],
    ),
  }));

  if (reduce) {
    return (
      <section className="relative overflow-hidden bg-espressoSoft px-6 py-32 md:px-12 lg:px-20">
        <Atmosphere light="50% 80%" strength={1} />
        <div className="relative z-10 mx-auto max-w-4xl">
          {LINES.map((l) => (
            <p key={l} className="font-serif text-4xl leading-tight text-ctext md:text-6xl">
              {l}
            </p>
          ))}
          <p className="mt-8 font-sans text-sm uppercase tracking-[0.22em] text-brassBright">
            Rien à terminer. Rien à rattraper.
          </p>
        </div>
      </section>
    );
  }

  return (
    <div ref={ref} className="relative h-[280vh] bg-espressoDeep">
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        {/* la braise réelle qui ancre le feu animé */}
        <motion.img
          src="/foyer/allumage-fond.webp"
          alt=""
          aria-hidden
          loading="lazy"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          style={{ opacity: bgEmber }}
        />
        {/* le feu qui prend : trois couches (ambient, halo, coeur) + flicker lent */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[62%] h-[58vmin] w-[58vmin]"
          style={{
            /* x/y dans framer (pas de classes -translate : scale les écraserait) */
            x: '-50%',
            y: '-50%',
            scale: emberScale,
            opacity: emberOpacity,
          }}
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(187,154,94,0.20) 0%, rgba(176,106,63,0.10) 55%, transparent 76%)',
              filter: 'blur(8px)',
            }}
          />
          <div
            className="absolute inset-[16%] rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(176,106,63,0.45) 0%, rgba(176,106,63,0.14) 58%, transparent 78%)',
              filter: 'blur(10px)',
              animation: 'foyerFlicker 5.4s ease-in-out infinite',
            }}
          />
          <motion.div className="absolute inset-[32%]" style={{ opacity: coreHeat }}>
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  'radial-gradient(circle, rgba(220,184,116,0.85) 0%, rgba(199,154,82,0.5) 40%, rgba(176,106,63,0.16) 66%, transparent 80%)',
                filter: 'blur(4px)',
                animation: 'foyerFlicker 3.8s ease-in-out infinite reverse',
              }}
            />
          </motion.div>
        </motion.div>
        {/* braises ponctuelles qui montent, lentes */}
        <motion.div aria-hidden className="pointer-events-none absolute inset-0" style={{ opacity: coreHeat }}>
          {[
            { l: '46%', d: '0s', s: 5 },
            { l: '53%', d: '2.6s', s: 4 },
            { l: '49%', d: '4.7s', s: 3 },
          ].map((b) => (
            <span
              key={b.l}
              className="absolute rounded-full"
              style={{
                left: b.l,
                bottom: '24%',
                width: b.s,
                height: b.s,
                background: '#dcb874',
                filter: 'blur(1px)',
                animation: `foyerRise 7.5s linear ${b.d} infinite`,
                opacity: 0,
              }}
            />
          ))}
        </motion.div>
        <style>{`
          @keyframes foyerFlicker{0%,100%{opacity:.8;transform:scale(1)}38%{opacity:1;transform:scale(1.045)}64%{opacity:.88;transform:scale(.985)}}
          @keyframes foyerRise{0%{transform:translateY(0);opacity:0}10%{opacity:.65}100%{transform:translateY(-44vh);opacity:0}}
        `}</style>
        {/* le climax : la nuit devient matin autour du vrai feu (50mm, 35mm) */}
        <motion.div aria-hidden className="pointer-events-none absolute inset-0" style={{ opacity: videoOpacity }}>
          {videoNear && (
            <video
              className="absolute inset-0 h-full w-full object-cover"
              src="/foyer/firepit.mp4"
              poster="/foyer/firepit-poster.webp"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
            />
          )}
          <div
            className="absolute inset-x-0 bottom-0 h-44"
            style={{ background: 'linear-gradient(to top, rgba(22,16,10,0.6) 0%, transparent 100%)' }}
          />
        </motion.div>
        <motion.p
          style={{ opacity: kickerFade }}
          className="absolute bottom-14 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap font-sans text-[0.72rem] uppercase tracking-[0.26em] text-brassBright"
        >
          Rien à terminer. Rien à rattraper.
        </motion.p>
        {/* le réchauffement : la nuit devient crème, en gardant l'or du feu
            au centre pour que la transition reste chaude, jamais grise */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: warm,
            background:
              'radial-gradient(62% 52% at 50% 60%, #f7ead2 0%, #f6f1e6 45%, #f6f3ee 75%)',
          }}
        />
        <motion.div className="relative z-10 px-6 text-center md:px-12" style={{ opacity: textFade }}>
          {LINES.map((l, i) => (
            <motion.p
              key={l}
              style={{ opacity: lineStyles[i].opacity, y: lineStyles[i].y }}
              className="font-serif text-[2.2rem] font-semibold leading-[1.15] text-ctext md:text-[3.8rem]"
            >
              {l}
            </motion.p>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

/* ── Offre (section 10 du PDF) ── */
const OFFER_ITEMS = [
  'Dix mois actifs',
  'Quatre ouvertures par mois',
  'Dix méditations guidées en direct et leurs reprises',
  'Deux propositions estivales',
  'Un espace privé protégé du défilement, des publicités et des recommandations automatisées',
  "La liberté d'ouvrir uniquement ce qui nous attire",
];

const Offre: React.FC = () => (
  <section className="relative overflow-hidden bg-espressoSoft px-6 py-28 md:px-12 lg:px-20">
    <Atmosphere light="26% 18%" strength={0.9} />
    <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <span className="mb-4 block h-px w-10 bg-brass" aria-hidden />
        <p className="font-sans text-[0.62rem] uppercase tracking-[0.3em] text-brassBright">
          L’offre
        </p>
        <h2 className="mt-5 font-serif text-5xl font-semibold leading-[1.05] text-ctext md:text-6xl">
          Le Foyer d’Origine
        </h2>
        <p className="mt-4 font-serif text-2xl text-ctextSoft">12 mois d’accès</p>
        <div className="mt-10 hidden lg:block">
          <div className="max-w-[360px] overflow-hidden rounded-[30px] bg-espresso/50 p-2.5 shadow-depth ring-1 ring-brass/40">
            <img
              src="/foyer/invitation.webp"
              alt="Invitation scellée du Foyer d'Origine"
              loading="lazy"
              className="w-full rounded-[22px]"
            />
          </div>
          <p className="mt-4 font-sans text-[0.78rem] tracking-[0.06em] text-ctextSoft">
            L'invitation scellée · sceau brass et sauge séchée
          </p>
        </div>
      </div>
      <div className="lg:col-span-7">
        <div className="rounded-[30px] border border-brass/25 bg-card p-8 shadow-depth md:p-12">
          <ul className="space-y-4">
            {OFFER_ITEMS.map((item) => (
              <li key={item} className="flex items-start gap-4">
                <span className="mt-[0.58rem] h-1.5 w-1.5 shrink-0 rounded-full bg-brass" aria-hidden />
                <span className="font-serif text-lg leading-snug text-ink">{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap items-end justify-between gap-6 border-t border-brass/20 pt-8">
            <div>
              <p className="font-serif text-6xl font-semibold text-brassInk">497 $</p>
              <p className="mt-2 font-sans text-[0.7rem] tracking-[0.08em] text-inkSoft">
                Paiement par carte de crédit.
              </p>
            </div>
            <Cta label="Prendre place autour du feu" />
          </div>
        </div>
      </div>
    </div>
  </section>
);

/* ── Appel final (section 12 du PDF) : retour au feu ── */
const AppelFinal: React.FC = () => {
  const reduce = useReducedMotion();
  return (
    <section className="relative overflow-hidden bg-espressoDeep px-6 py-32 md:px-12 lg:px-20">
      <Atmosphere light="72% 30%" strength={1} />
      {/* les étincelles réelles montent derrière l'appel final */}
      <img
        src="/foyer/final-braises.webp"
        alt=""
        aria-hidden
        loading="lazy"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[72%] w-full object-cover opacity-45"
        style={{
          maskImage: 'linear-gradient(to top, black 50%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to top, black 50%, transparent 100%)',
        }}
      />
      {/* la braise du hero revient : l'arc se referme au même feu */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(38% 30% at 30% 96%, rgba(176,106,63,0.22), transparent 70%)',
          animation: reduce ? undefined : 'foyerBreathe 5.5s ease-in-out infinite',
        }}
      />
      <div className="relative z-10 mx-auto grid w-full max-w-[1360px] items-center gap-y-14 lg:grid-cols-12 lg:gap-x-12">
        <div className="lg:col-span-8">
          <h2 className="font-serif text-[2.6rem] font-semibold leading-[1.06] text-ctext md:text-[4rem]">
            Tout ne mérite pas notre attention.
          </h2>
          <p className="mt-6 max-w-2xl font-serif text-2xl leading-snug text-brassBright">
            Mais certaines choses peuvent changer notre manière de voir.
          </p>
          <p className="mt-3 font-serif text-xl text-ctextSoft">
            Le Foyer d’Origine est une place pour les découvrir.
          </p>
          <div className="mt-10 space-y-1 font-serif text-lg leading-relaxed text-ctextSoft">
            <p>Pour sortir de la répétition.</p>
            <p>Pour rencontrer l’inattendu.</p>
            <p>Pour accéder à des liens impossibles à demander dans une barre de recherche.</p>
          </div>
          <p className="mt-8 max-w-2xl font-serif text-lg leading-relaxed text-ctext">
            Pour retrouver un rythme humain, une place parmi les autres et la
            possibilité d’être bien pendant que le monde bouge.
          </p>
          <p className="mt-14 font-serif text-[clamp(2.2rem,3.6vw,3.6rem)] font-semibold leading-[1.08] text-ctext">
            Prenez place autour du feu.
          </p>
          <div className="mt-9">
            <Cta label="Entrer dans le Foyer" sub="497 $ | 12 mois d’accès" dark />
          </div>
        </div>
        <div className="hidden lg:col-span-4 lg:flex lg:justify-end">
          <Seal animate={false} className="h-64 w-64 opacity-30 xl:h-80 xl:w-80" />
        </div>
      </div>
    </section>
  );
};

/* ── Page ── */
const FoyerPage: React.FC = () => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const prev = document.title;
    document.title = "Le Foyer d'Origine | Krystine St-Laurent";
    const t = window.setTimeout(() => setReady(true), 1150);
    return () => {
      window.clearTimeout(t);
      document.title = prev;
    };
  }, []);
  return (
    <div className="bg-cream">
      <Preloader done={ready} />
      {/* inert tant que le preloader couvre : le clavier ne peut pas
          atteindre le contenu invisible dessous */}
      <div inert={ready ? undefined : true}>
        <Hero ready={ready} />
        <Allumage />
        <BodySections />
        <Offre />
        <AppelFinal />
        <footer className="bg-espressoDeep px-6 py-8 text-center">
          <Link
            to="/"
            className="inline-block p-3 font-sans text-[0.62rem] uppercase tracking-[0.28em] text-ctextSoft transition-colors hover:text-brassBright"
          >
            Krystine St-Laurent
          </Link>
        </footer>
      </div>
    </div>
  );
};

export default FoyerPage;
