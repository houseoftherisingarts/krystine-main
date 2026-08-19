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
import { Atmosphere } from '../components/motion/loeuvre';
import BodySections from './foyer/BodySections';

/**
 * Le Foyer d'Origine · page de vente (URL dédiée /foyer).
 * Canon : BRANDING L'ŒUVRE (CLAUDE.md du repo + 30_library/loeuvre-design-system.md).
 * Une seule scène de feu : LA vidéo du foyer extérieur au matin roule dès
 * l'entrée, hero et allumage partagent le même plan continu (zéro couture),
 * puis le voile crème pose le corps éditorial.
 */

const ease = [0.16, 0.8, 0.24, 1] as const;
const CTA_HREF = '/liste-attente?programme=foyer';

/* ── Sceau concentrique (mark du PDF) · préloader et appel final seulement ── */
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

/* ── CTA laiton (fond brass + texte espresso, canon contraste) ── */
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

/* ── La scène du feu : hero + allumage sur le MÊME plan vidéo continu ──
   Le feu roule dès l'entrée. Le titre s'efface au premier scroll, les
   trois lignes passent sur la même vidéo, la crème se pose à la fin.
   Progression maison (rAF + rect) : useScroll({target}) mesurait la page. */
/* Deux strophes (PDF 19 août) : le constat, puis le besoin. */
const STANZA1 = [
  'Le plus difficile n’est plus de trouver.',
  'C’est de démêler le vrai du faux.',
  'Ce qui mérite notre attention de ce qui cherche seulement à la capter.',
];
const STANZA2 = ['Nous n’avons pas besoin de plus.', 'Nous avons besoin d’authentique.'];

const FoyerScene: React.FC<{ ready: boolean }> = ({ ready }) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
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

  /* chorégraphie : hero → strophe 1 (constat) → strophe 2 (besoin) → kicker → crème */
  const heroFade = useTransform(scrollYProgress, [0, 0.12], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.12], [0, -36]);
  /* le voile du hero s'allège : le feu prend toute la lumière */
  const veilHero = useTransform(scrollYProgress, [0, 0.14, 0.28], [1, 1, 0.35]);
  /* voile radial partagé des deux strophes : jamais d'écran sans texte */
  const linesVeil = useTransform(
    scrollYProgress,
    [0.12, 0.2, 0.46, 0.53, 0.56, 0.63, 0.78, 0.85],
    [0, 1, 1, 0, 0, 1, 1, 0],
  );
  const stanza1Styles = [0, 1, 2].map((i) => ({
    opacity: useTransform(
      scrollYProgress,
      [0.14 + i * 0.07, 0.22 + i * 0.07, 0.46, 0.53],
      [0, 1, 1, 0],
    ),
    y: useTransform(scrollYProgress, [0.14 + i * 0.07, 0.22 + i * 0.07], [26, 0]),
  }));
  const stanza2Styles = [0, 1].map((i) => ({
    opacity: useTransform(
      scrollYProgress,
      [0.56 + i * 0.08, 0.64 + i * 0.08, 0.78, 0.85],
      [0, 1, 1, 0],
    ),
    y: useTransform(scrollYProgress, [0.56 + i * 0.08, 0.64 + i * 0.08], [26, 0]),
  }));
  const kickerFade = useTransform(scrollYProgress, [0.85, 0.91], [0, 1]);
  const emberDust = useTransform(scrollYProgress, [0.1, 0.25], [0, 1]);
  const warm = useTransform(scrollYProgress, [0.9, 1], [0, 1]);

  if (reduce) {
    return (
      <>
        <header className="relative flex min-h-screen flex-col justify-end overflow-hidden bg-espressoDeep">
          <img
            src="/foyer/firepit-poster.webp"
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to top, rgba(22,16,10,0.9) 0%, rgba(22,16,10,0.5) 45%, rgba(22,16,10,0.25) 100%)',
            }}
          />
          <div className="relative z-10 w-full px-6 pb-16 pt-36 md:px-12 lg:px-20">
            <span className="mb-4 block h-px w-10 bg-brass" aria-hidden />
            <p className="font-sans text-[0.62rem] uppercase tracking-[0.3em] text-brass">
              KSL | Le Foyer d’Origine
            </p>
            <h1 className="mt-5 font-serif font-medium leading-[0.9] text-ctext text-[clamp(3.4rem,9vw,8rem)]">
              Le Foyer d’Origine
            </h1>
            <p className="mt-6 max-w-2xl font-serif font-medium text-[clamp(1.35rem,2.2vw,1.9rem)] leading-snug text-ctext">
              Nous n’avons jamais eu autant d’information.
              <span className="block text-brassBright">Et jamais autant de dispersion.</span>
            </p>
            <p className="mt-5 max-w-xl font-sans text-[0.95rem] leading-[1.85] text-ctextSoft">
              Un espace privé en ligne pour découvrir ce que nous n’aurions pas
              su chercher et accéder à des liens impossibles à demander dans une
              barre de recherche.
            </p>
            <div className="mt-9">
              <Cta label="Entrer dans le Foyer" sub="497 $ | 12 mois d’accès" dark />
            </div>
          </div>
        </header>
        <section className="relative overflow-hidden bg-espressoSoft px-6 py-32 md:px-12 lg:px-20">
          <Atmosphere light="50% 80%" strength={1} />
          <div className="relative z-10 mx-auto max-w-4xl">
            {LINES.map((l) => (
              <p key={l} className="font-serif text-4xl leading-tight text-ctext md:text-5xl">
                {l}
              </p>
            ))}
            <p className="mt-8 font-sans text-[0.72rem] uppercase tracking-[0.26em] text-brassBright">
              Rien à terminer. Rien à rattraper.
            </p>
          </div>
        </section>
      </>
    );
  }

  return (
    <div ref={ref} className="relative h-[380vh] bg-espressoDeep">
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* LE feu : la vidéo roule dès l'entrée, seule représentation du feu */}
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src="/foyer/firepit.mp4"
          poster="/foyer/firepit-poster.webp"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
        {/* voile hero : lisibilité du titre, s'allège quand le feu prend la scène */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: veilHero,
            background:
              'linear-gradient(to top, rgba(22,16,10,0.92) 0%, rgba(22,16,10,0.62) 34%, rgba(22,16,10,0.22) 62%, rgba(22,16,10,0.4) 100%)',
          }}
        />
        {/* socle sombre permanent en bas (kicker + transition) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
          style={{ background: 'linear-gradient(to top, rgba(22,16,10,0.55) 0%, transparent 100%)' }}
        />
        {/* poussière chaude : braises fines qui montent (canon L'Œuvre) */}
        <motion.div aria-hidden className="pointer-events-none absolute inset-0" style={{ opacity: emberDust }}>
          {[
            { l: '44%', d: '0s', s: 5 },
            { l: '55%', d: '3.1s', s: 4 },
            { l: '49%', d: '5.6s', s: 3 },
          ].map((b) => (
            <span
              key={b.l}
              className="absolute rounded-full"
              style={{
                left: b.l,
                bottom: '22%',
                width: b.s,
                height: b.s,
                background: '#dcb874',
                filter: 'blur(1px)',
                animation: `foyerRise 8s linear ${b.d} infinite`,
                opacity: 0,
              }}
            />
          ))}
        </motion.div>
        <style>{`
          @keyframes foyerRise{0%{transform:translateY(0);opacity:0}10%{opacity:.6}100%{transform:translateY(-46vh);opacity:0}}
          @keyframes foyerCue{0%,100%{opacity:.45;transform:translateY(0)}50%{opacity:1;transform:translateY(4px)}}
        `}</style>

        {/* HERO : titre display court (canon, 2 lignes max), la phrase en énoncé */}
        <motion.div
          className="absolute inset-0 z-10 flex flex-col justify-end"
          style={{ opacity: heroFade, y: heroY }}
        >
          <div className="w-full px-6 pb-14 md:px-12 lg:px-20">
            <motion.div
              initial={reduce ? {} : { opacity: 0, y: 26 }}
              animate={ready ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1.1, ease, delay: 0.15 }}
            >
              <span className="mb-4 block h-px w-10 bg-brass" aria-hidden />
              <p className="font-sans text-[0.62rem] uppercase tracking-[0.3em] text-brass">
                KSL | Le Foyer d’Origine
              </p>
            </motion.div>
            <motion.h1
              initial={reduce ? {} : { opacity: 0, y: 26 }}
              animate={ready ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1.1, ease, delay: 0.31 }}
              className="mt-4 font-serif font-medium leading-[0.9] text-ctext text-[clamp(3.4rem,9vw,8rem)]"
            >
              Le Foyer d’Origine
            </motion.h1>
            <motion.p
              initial={reduce ? {} : { opacity: 0, y: 24 }}
              animate={ready ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1.1, ease, delay: 0.47 }}
              className="mt-6 max-w-2xl font-serif font-medium text-[clamp(1.35rem,2.2vw,1.9rem)] leading-snug text-ctext"
            >
              Nous n’avons jamais eu autant d’information.
              <span className="block text-brassBright">Et jamais autant de dispersion.</span>
            </motion.p>
            <motion.div
              initial={reduce ? {} : { opacity: 0, y: 22 }}
              animate={ready ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1.1, ease, delay: 0.63 }}
              className="mt-8 flex flex-wrap items-end justify-between gap-6"
            >
              <Cta label="Entrer dans le Foyer" sub="497 $ | 12 mois d’accès" dark />
              <span
                className="hidden font-sans text-[0.6rem] uppercase tracking-[0.3em] text-ctextSoft md:block"
                style={{ animation: 'foyerCue 2.6s ease-in-out infinite' }}
              >
                Défiler
              </span>
            </motion.div>
          </div>
        </motion.div>

        {/* STROPHES : sur la même vidéo, voile radial doux pour la lisibilité */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: linesVeil,
            background:
              'radial-gradient(56% 46% at 50% 46%, rgba(22,16,10,0.6), transparent 78%)',
          }}
        />
        <div className="absolute inset-0 z-10 flex items-center justify-center px-6 text-center md:px-12">
          <div className="max-w-5xl">
            {STANZA1.map((l, i) => (
              <motion.p
                key={l}
                style={{ opacity: stanza1Styles[i].opacity, y: stanza1Styles[i].y }}
                className={`font-serif font-medium leading-[1.25] text-ctext ${
                  i === 2 ? 'text-[1.4rem] md:text-[2.1rem] text-ctextSoft' : 'text-[1.9rem] md:text-[3rem]'
                }`}
              >
                {l}
              </motion.p>
            ))}
          </div>
        </div>
        <div className="absolute inset-0 z-10 flex items-center justify-center px-6 text-center md:px-12">
          <div>
            {STANZA2.map((l, i) => (
              <motion.p
                key={l}
                style={{ opacity: stanza2Styles[i].opacity, y: stanza2Styles[i].y }}
                className={`font-serif font-medium leading-[1.25] ${
                  i === 1 ? 'text-brassBright' : 'text-ctext'
                } text-[2rem] md:text-[3.2rem]`}
              >
                {l}
              </motion.p>
            ))}
          </div>
        </div>
        <motion.p
          style={{ opacity: kickerFade }}
          className="absolute bottom-12 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap font-sans text-[0.72rem] uppercase tracking-[0.26em] text-brassBright"
        >
          Rien à terminer. Rien à rattraper.
        </motion.p>

        {/* la crème se pose sur le matin : couture invisible vers le corps */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20"
          style={{
            opacity: warm,
            background:
              'radial-gradient(62% 52% at 50% 60%, #f7ead2 0%, #f6f1e6 45%, #f6f3ee 75%)',
          }}
        />
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
        <h2 className="mt-5 font-serif font-medium uppercase leading-[1.08] tracking-[0.04em] text-ctext text-[clamp(1.9rem,3.4vw,2.7rem)]">
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
            L’invitation scellée · sceau brass et sauge séchée
          </p>
        </div>
      </div>
      <div className="lg:col-span-7">
        <div className="rounded-[30px] border border-brass/25 bg-card p-8 shadow-depth md:p-12">
          <ul className="space-y-4">
            {OFFER_ITEMS.map((item) => (
              <li key={item} className="flex items-start gap-4">
                <span className="mt-[0.5rem] h-1.5 w-1.5 shrink-0 rounded-full bg-brass" aria-hidden />
                <span className="font-sans text-[0.95rem] leading-[1.85] text-ink">{item}</span>
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

/* ── Appel final (section 12 du PDF) : le sceau revient, la braise aussi ── */
const AppelFinal: React.FC = () => {
  const reduce = useReducedMotion();
  return (
    <section className="relative overflow-hidden bg-espressoDeep px-6 py-32 md:px-12 lg:px-20">
      <Atmosphere light="72% 30%" strength={1} />
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
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(38% 30% at 30% 96%, rgba(176,106,63,0.22), transparent 70%)',
          animation: reduce ? undefined : 'foyerBreathe 5.5s ease-in-out infinite',
        }}
      />
      <style>{`@keyframes foyerBreathe{0%,100%{opacity:.75}50%{opacity:1}}`}</style>
      <div className="relative z-10 mx-auto grid w-full max-w-[1360px] items-center gap-y-14 lg:grid-cols-12 lg:gap-x-12">
        <div className="lg:col-span-8">
          <h2 className="font-serif font-medium leading-[1.08] text-ctext text-[clamp(2.2rem,3.6vw,3.4rem)]">
            Tout ne mérite pas notre attention.
          </h2>
          <p className="mt-6 max-w-2xl font-serif text-2xl leading-snug text-brassBright">
            Mais certaines choses peuvent changer notre manière de voir.
          </p>
          <p className="mt-3 font-serif text-xl text-ctextSoft">
            Le Foyer d’Origine est une place pour les découvrir.
          </p>
          <div className="mt-10 space-y-1 font-sans text-[0.95rem] leading-[1.85] text-ctextSoft">
            <p>Pour sortir de la répétition.</p>
            <p>Pour rencontrer l’inattendu.</p>
            <p>Pour accéder à des liens impossibles à demander dans une barre de recherche.</p>
          </div>
          <p className="mt-8 max-w-2xl font-sans text-[0.95rem] leading-[1.85] text-ctext">
            Pour retrouver un rythme humain, une place parmi les autres et la
            possibilité d’être bien pendant que le monde bouge.
          </p>
          <p className="mt-14 font-serif font-semibold leading-[1.08] text-ctext text-[clamp(2.2rem,3.6vw,3.6rem)]">
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
    /* la page repart toujours en haut : sinon le navigateur restaure un
       scroll au milieu de la scène pinnée et le titre semble absent */
    const prevRestore = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    const t = window.setTimeout(() => setReady(true), 1150);
    return () => {
      window.clearTimeout(t);
      document.title = prev;
      window.history.scrollRestoration = prevRestore;
    };
  }, []);
  return (
    <div className="bg-cream">
      <Preloader done={ready} />
      {/* inert tant que le preloader couvre : le clavier ne peut pas
          atteindre le contenu invisible dessous */}
      <div inert={ready ? undefined : true}>
        <FoyerScene ready={ready} />
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
