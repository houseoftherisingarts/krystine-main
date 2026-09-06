import React, { useEffect, useRef, useState } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useScroll,
  useTransform,
  useMotionTemplate,
  useReducedMotion,
} from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { Atmosphere } from '../components/motion/loeuvre';
import BodySections from './foyer/BodySections';
import MusiqueOrigine from './foyer/MusiqueOrigine';
import { Cta } from './foyer/Cta';
import { OFFRE, FINAL } from './foyer/content';
import { useAuth } from '../contexts/AppContext';
import { getFormation, aAchete, acheterFormation, type Formation } from '../firebase/formations';

/**
 * Le Foyer d'Origine · page de vente (URL dédiée /foyer).
 * Canon : BRANDING L'ŒUVRE (CLAUDE.md du repo + 30_library/loeuvre-design-system.md).
 * Une seule scène de feu : LA vidéo du foyer extérieur au matin roule dès
 * l'entrée, hero et allumage partagent le même plan continu (zéro couture),
 * puis le voile crème pose le corps éditorial.
 */

const ease = [0.16, 0.8, 0.24, 1] as const;

/* ── Preloader ~1s : nuit, le filet doré se trace, la braise s’allume ── */
const Preloader: React.FC<{ done: boolean }> = ({ done }) => (
  <AnimatePresence>
    {!done && (
      <motion.div
        className="fixed inset-0 z-[90] flex items-center justify-center bg-encre"
        exit={{ opacity: 0 }}
        transition={{ duration: 0.7, ease }}
      >
        <div className="relative flex flex-col items-center gap-6">
          <svg width="220" height="18" viewBox="0 0 220 18" fill="none" aria-hidden>
            <motion.line
              x1="0" y1="9" x2="88" y2="9" stroke="#bb9a5e" strokeWidth="1"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.6 }}
              transition={{ duration: 0.7, ease, delay: 0.1 }}
            />
            <motion.line
              x1="220" y1="9" x2="132" y2="9" stroke="#bb9a5e" strokeWidth="1"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.6 }}
              transition={{ duration: 0.7, ease, delay: 0.1 }}
            />
            <motion.rect
              x="105.5" y="4.5" width="9" height="9"
              transform="rotate(45 110 9)" stroke="#c79a52" strokeWidth="1.2"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: [0, 1.25, 1] }}
              transition={{ duration: 0.6, ease, delay: 0.55 }}
              style={{ transformOrigin: '110px 9px' }}
            />
          </svg>
          <motion.p
            className="whitespace-nowrap font-sans text-fyLabel uppercase text-ctextSoft"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.85 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            Le Foyer d’Origine
          </motion.p>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

/* ── Son du feu : vrai enregistrement de feu qui craque (Freesound 414767,
   samarobryn), 40 s en boucle, fondu aux coutures. Coupé par défaut
   (autoplay audio bloqué). ── */
const useFireSound = () => {
  const [on, setOn] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(
    () => () => {
      audioRef.current?.pause();
    },
    [],
  );
  const toggle = () => {
    if (on) {
      audioRef.current?.pause();
      setOn(false);
      return;
    }
    if (!audioRef.current) {
      const a = new Audio('/foyer/feu-craquant.m4a');
      a.loop = true;
      a.volume = 0.55;
      audioRef.current = a;
    }
    void audioRef.current.play();
    setOn(true);
  };
  return { on, toggle };
};

/* ── Le prix : le tarif régulier barré, le tarif de lancement en dessous ── */
const PrixLancement: React.FC<{
  regular: string;
  price: string;
  note: string;
  className?: string;
}> = ({ regular, price, note, className = '' }) => (
  <div className={className}>
    <span className="relative inline-block font-serif text-ctextSoft text-[clamp(1.15rem,2vw,1.75rem)] leading-none">
      {regular}
      <span
        aria-hidden
        className="pointer-events-none absolute left-[-6%] top-1/2 h-[2px] w-[112%] origin-center"
        style={{ background: '#c2412a', transform: 'translateY(-50%) rotate(-9deg)' }}
      />
      <span className="sr-only"> (tarif régulier)</span>
    </span>
    <p className="mt-3 font-serif font-semibold leading-none text-brassBright">{price}</p>
    <p className="mt-3 font-sans text-fyLabel uppercase text-brass">{note}</p>
  </div>
);

/* ── La scène du feu : hero + allumage sur le MÊME plan vidéo continu ──
   Le feu roule dès l'entrée. Le titre s'efface au premier scroll, les
   trois lignes passent sur la même vidéo, la crème se pose à la fin.
   Progression maison (rAF + rect) : useScroll({target}) mesurait la page. */
/* Trois groupes au défilement (doc « PAGE DE VENTE FINALE ») */
const STANZAS: string[][] = [
  ['Le plus difficile n’est plus de trouver.', 'C’est de démêler le vrai du faux.'],
  ['Nous n’avons pas besoin de plus.', 'Nous avons besoin d’authentique.'],
];
const STANZA_WINDOWS: Array<[number, number, number, number]> = [
  [0.16, 0.25, 0.4, 0.47],
  [0.5, 0.59, 0.74, 0.81],
];

const FoyerScene: React.FC<{ ready: boolean }> = ({ ready }) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const fire = useFireSound();
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
  /* voile radial partagé des trois groupes : jamais d'écran sans texte */
  const linesVeil = useTransform(
    scrollYProgress,
    [0.14, 0.22, 0.4, 0.47, 0.49, 0.57, 0.74, 0.81],
    [0, 1, 1, 0, 0, 1, 1, 0],
  );
  const stanzaStyles = STANZAS.map((lines, g) =>
    lines.map((_, i) => ({
      opacity: useTransform(
        scrollYProgress,
        [STANZA_WINDOWS[g][0] + i * 0.05, STANZA_WINDOWS[g][1] + i * 0.05, STANZA_WINDOWS[g][2], STANZA_WINDOWS[g][3]],
        [0, 1, 1, 0],
      ),
      y: useTransform(
        scrollYProgress,
        [STANZA_WINDOWS[g][0] + i * 0.05, STANZA_WINDOWS[g][1] + i * 0.05],
        [26, 0],
      ),
    })),
  );
  const kickerFade = useTransform(scrollYProgress, [0.72, 0.8], [0, 1]);
  const emberDust = useTransform(scrollYProgress, [0.1, 0.25], [0, 1]);

  if (reduce) {
    return (
      <>
        <header className="relative flex min-h-screen flex-col justify-end overflow-hidden bg-encre">
          <img
            src="/foyer/firepit-poster.webp"
            alt=""
            aria-hidden
            width={1920}
            height={1080}
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to top, rgba(15,22,19,0.9) 0%, rgba(15,22,19,0.5) 45%, rgba(15,22,19,0.25) 100%)',
            }}
          />
          <div className="relative z-10 w-full px-6 pb-16 pt-36 md:px-12 lg:px-20">
            <span className="mb-4 block h-px w-10 bg-brass" aria-hidden />
            <p className="font-sans text-fyLabel uppercase text-brass">
              KSL | Le Foyer d’Origine
            </p>
            <h1 className="mt-5 font-serif font-medium leading-[0.9] text-ctext text-[clamp(3.4rem,9vw,8rem)]">
              Le Foyer d’Origine
            </h1>
            <p className="mt-6 max-w-[56ch] font-serif font-medium text-[clamp(1.35rem,0.9rem+2.2vw,2.7rem)] leading-[1.2] text-ctext">
              Nous n’avons jamais eu accès à autant d’informations.
              <span className="block text-brassBright">Et jamais autant de dispersion.</span>
            </p>
            <p className="mt-5 max-w-[60ch] font-sans text-fyBody text-ctextSoft">
              Un espace privé en ligne pour découvrir ce que nous n’aurions pas
              su chercher et accéder à des liens impossibles à demander dans une
              barre de recherche.
            </p>
            <div className="mt-9">
              <Cta label="Prendre place autour du feu" dark />
            </div>
          </div>
        </header>
        <section className="relative overflow-hidden bg-espressoSoft px-6 py-32 md:px-12 lg:px-20">
          <Atmosphere light="50% 80%" strength={1} />
          <div className="relative z-10 mx-auto max-w-4xl">
            {STANZAS.flat().map((l) => (
              <p key={l} className="font-serif text-3xl leading-tight text-ctext md:text-4xl">
                {l}
              </p>
            ))}
            <p className="mt-8 font-sans text-fyLabel uppercase text-brassBright">
              Rien à terminer. Rien à rattraper.
            </p>
          </div>
        </section>
      </>
    );
  }

  return (
    <div ref={ref} className="relative z-0 h-[380vh] bg-encre">
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
              'linear-gradient(to top, rgba(15,22,19,0.92) 0%, rgba(15,22,19,0.62) 34%, rgba(15,22,19,0.22) 62%, rgba(15,22,19,0.4) 100%)',
          }}
        />
        {/* socle sombre permanent en bas (kicker + transition) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
          style={{ background: 'linear-gradient(to top, rgba(15,22,19,0.55) 0%, transparent 100%)' }}
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

        {/* HERO : centré verticalement (le bas était écrasé), phrases clés en relief */}
        <motion.div
          className="absolute inset-0 z-10 flex flex-col justify-center"
          style={{ opacity: heroFade, y: heroY }}
        >
          <div className="w-full px-6 pb-6 md:px-12 lg:px-20">
            <motion.div
              initial={reduce ? {} : { opacity: 0, y: 26 }}
              animate={ready ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1.1, ease, delay: 0.15 }}
            >
              <span className="mb-4 block h-px w-10 bg-brass" aria-hidden />
              <p className="font-sans text-fyLabel uppercase text-brass">
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
              className="mt-7 max-w-[56ch] font-serif font-medium text-[clamp(1.35rem,0.9rem+2.2vw,2.7rem)] leading-[1.2] text-ctext"
            >
              Nous n’avons jamais eu accès à autant d’informations.
              <span className="block text-brassBright">Et jamais autant de dispersion.</span>
            </motion.p>
            <motion.div
              initial={reduce ? {} : { opacity: 0, y: 22 }}
              animate={ready ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1.1, ease, delay: 0.63 }}
              className="mt-10 flex flex-wrap items-end justify-between gap-6"
            >
              <Cta label="Prendre place autour du feu" dark />
              <span
                className="hidden font-sans text-fyLabel uppercase text-ctextSoft md:block"
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
              'radial-gradient(56% 46% at 50% 46%, rgba(15,22,19,0.6), transparent 78%)',
          }}
        />
        {STANZAS.map((lines, g) => (
          <div key={g} className="absolute inset-0 z-10 flex items-center justify-center px-6 text-center md:px-12">
            <div className="max-w-5xl">
              {lines.map((l, i) => (
                <motion.p
                  key={l}
                  style={{ opacity: stanzaStyles[g][i].opacity, y: stanzaStyles[g][i].y }}
                  className={`font-serif font-medium leading-[1.25] ${
                    g === 1 && i === 1 ? 'text-brassBright' : 'text-ctext'
                  } text-[1.9rem] md:text-[3rem]`}
                >
                  {l}
                </motion.p>
              ))}
            </div>
          </div>
        ))}
        <motion.p
          style={{ opacity: kickerFade }}
          className="absolute bottom-12 left-1/2 z-10 -translate-x-1/2 w-max max-w-[calc(100vw-3rem)] text-center font-sans text-fyLabel uppercase text-brassBright"
        >
          Rien à terminer. Rien à rattraper.
        </motion.p>

        {/* son du feu : bouton discret, coupé par défaut */}
        <button
          type="button"
          onClick={fire.toggle}
          aria-pressed={fire.on}
          aria-label={fire.on ? 'Couper le son du feu' : 'Écouter le feu'}
          className="absolute bottom-6 right-6 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-brass/40 bg-encre/50 text-brass backdrop-blur-sm transition-colors duration-300 hover:border-brass hover:text-brassBright"
        >
          {fire.on ? <Volume2 size={17} /> : <VolumeX size={17} />}
        </button>
      </div>
    </div>
  );
};

/* ── Offre : HERO cinématique façon Apple : l'antre VIT (vidéo), la scène
   s'allume au scroll, deux temps : le titre XXL, puis le prix et le geste. ── */
const OffreScene: React.FC<{ reduce: boolean }> = ({ reduce }) => {
  const ref = useRef<HTMLDivElement>(null);
  /* progression maison (rAF + rect) : useScroll({target}) mesure mal dans cette
     page (mêmes symptômes que la scène du feu), on lit le rect nous-mêmes */
  const scrollYProgress = useMotionValue(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      const r = el.getBoundingClientRect();
      const totalH = r.height - window.innerHeight;
      if (totalH <= 0) return;
      scrollYProgress.set(Math.min(1, Math.max(0, -r.top / totalH)));
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
  /* l'antre ne boucle plus : la vidéo est lue au rythme du défilement */
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (reduce) return;
    const v = videoRef.current;
    if (!v) return;
    let raf = 0;
    let joue = 0;
    const boucle = () => {
      const d = v.duration;
      if (d && Number.isFinite(d)) {
        const cible = scrollYProgress.get() * (d - 0.04);
        joue += (cible - joue) * (Math.abs(cible - joue) > 0.8 ? 1 : 0.22);
        if (Math.abs(joue - v.currentTime) > 0.012) v.currentTime = joue;
      }
      raf = requestAnimationFrame(boucle);
    };
    const demarrer = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(boucle);
    };
    if (v.readyState >= 1) demarrer();
    else v.addEventListener('loadedmetadata', demarrer, { once: true });
    return () => cancelAnimationFrame(raf);
  }, [scrollYProgress, reduce]);

  /* allumage : la scène s'éclaire et s'approche pendant qu'on défile */
  const bright = useTransform(scrollYProgress, [0, 0.4], [0.48, 1.02]);
  const sat = useTransform(scrollYProgress, [0, 0.4], [0.68, 1.05]);
  const sceneFilter = useMotionTemplate`brightness(${bright}) saturate(${sat})`;
  const sceneScale = useTransform(scrollYProgress, [0, 1], [1.14, 1]);
  /* temps 1 : le titre, énorme, se resserre puis cède la place */
  const titleScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.88]);
  const titleY = useTransform(scrollYProgress, [0, 0.55], [0, -64]);
  const titleOpacity = useTransform(scrollYProgress, [0.42, 0.58], [1, 0]);
  /* temps 2 : le prix et le geste, sur le feu allumé */
  const offerOpacity = useTransform(scrollYProgress, [0.6, 0.74], [0, 1]);
  const offerY = useTransform(scrollYProgress, [0.6, 0.8], [46, 0]);
  const offerScale = useTransform(scrollYProgress, [0.6, 0.85], [0.96, 1]);

  if (reduce) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-24 text-center">
        <img src="/foyer/antre-foyer.webp" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-80" />
        <div aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(70% 55% at 50% 45%, rgba(15,22,19,0.2), rgba(15,22,19,0.7) 100%)' }} />
        <div className="relative">
          <p className="font-sans text-fyLabel uppercase text-brassBright">{OFFRE.eyebrow}</p>
          <h2 className="mt-5 font-serif font-medium leading-[0.9] text-ctext text-[clamp(2.2rem,9vw,8rem)]">{OFFRE.title}</h2>
          <p className="mt-6 font-serif text-[clamp(1.15rem,2vw,1.7rem)] text-ctextSoft">{OFFRE.subtitle}</p>
          <PrixLancement
            regular={OFFRE.priceRegular}
            price={OFFRE.price}
            note={OFFRE.priceNote}
            className="mt-10 [&>p:first-of-type]:text-6xl"
          />
          <div className="mt-8 flex justify-center"><Cta label={OFFRE.cta} dark /></div>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative h-[260vh]">
      <div className="sticky top-0 h-screen overflow-hidden rounded-t-[18px]">
        {/* l'antre VIT : la vidéo respire, s'allume et s'approche au scroll */}
        <motion.div aria-hidden className="absolute inset-0" style={{ scale: sceneScale, filter: sceneFilter }}>
          <video
            ref={videoRef}
            src="/foyer/antre-foyer-scrub.mp4"
            poster="/foyer/antre-foyer.webp"
            muted
            playsInline
            preload="auto"
            className="h-full w-full object-cover"
          />
        </motion.div>
        {/* voile de lisibilité */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(70% 55% at 50% 46%, rgba(15,22,19,0.08), rgba(15,22,19,0.6) 100%)' }}
        />
        {/* braises fines */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {[
            { l: '46%', d: '0s', s: 5 },
            { l: '52%', d: '2.4s', s: 4 },
            { l: '49%', d: '4.9s', s: 3 },
            { l: '55%', d: '6.8s', s: 4 },
          ].map((b) => (
            <span
              key={b.l + b.d}
              className="absolute rounded-full"
              style={{
                left: b.l,
                bottom: '12%',
                width: b.s,
                height: b.s,
                background: '#dcb874',
                filter: 'blur(1px)',
                animation: `foyerRise 9s linear ${b.d} infinite`,
                opacity: 0,
              }}
            />
          ))}
        </div>
        {/* temps 1 : le titre EST le hero */}
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center"
          style={{ opacity: titleOpacity, y: titleY, scale: titleScale }}
        >
          <p className="font-sans text-fyLabel uppercase text-brassBright">{OFFRE.eyebrow}</p>
          <h2 className="mt-5 whitespace-nowrap font-serif font-medium leading-[0.9] text-ctext text-[clamp(2.2rem,9.6vw,8.8rem)]">
            {OFFRE.title}
          </h2>
          <p className="mt-6 font-serif text-[clamp(1.15rem,2vw,1.7rem)] text-ctextSoft">{OFFRE.subtitle}</p>
        </motion.div>
        {/* temps 2 : le prix et le geste, posés sur le feu allumé */}
        <motion.div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center"
          style={{ opacity: offerOpacity, y: offerY, scale: offerScale }}
        >
          <p className="font-sans text-fyLabel uppercase text-brassBright">Une année entière</p>
          <PrixLancement
            regular={OFFRE.priceRegular}
            price={OFFRE.price}
            note={OFFRE.priceNote}
            className="mt-6 [&>p:first-of-type]:text-[clamp(3.4rem,8vw,7rem)]"
          />
          <div className="mt-5 space-y-1">
            {OFFRE.paymentLines.map((l) => (
              <p key={l.slice(0, 20)} className="font-sans text-[0.95rem] tracking-[0.04em] text-ctextSoft">
                {l}
              </p>
            ))}
          </div>
          <div className="mt-9">
            <Cta label={OFFRE.cta} dark />
          </div>
        </motion.div>
        <style>{`@keyframes foyerRise{0%{transform:translateY(0);opacity:0}10%{opacity:.6}100%{transform:translateY(-46vh);opacity:0}}`}</style>
        {/* couture vers le contenu */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-28"
          style={{ background: 'linear-gradient(to top, #0f1613 8%, transparent 100%)' }}
        />
      </div>
    </div>
  );
};

/* ── Offre (section 9 du doc final) ── */
const Offre: React.FC = () => {
  const reduce = useReducedMotion();
  /* pas d'overflow-hidden sur la section : il en ferait le conteneur du sticky
     et la scène ne collerait jamais (leçon FoyerScene) */
  return (
    <section className="relative z-[55] rounded-t-[18px] bg-encre shadow-[0_-26px_60px_rgba(15,22,19,0.5)]">
      <OffreScene reduce={!!reduce} />
      {/* la récapitulation : la liste à gauche sur une colonne large, le prix
          et le geste qui restent en regard à droite, les bonis en lignes de laiton */}
      <div className="relative mx-auto w-full max-w-[1360px] px-6 pb-28 pt-24 md:px-12 md:pb-40 md:pt-32">
        <div className="grid gap-x-20 gap-y-16 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-7">
            <p className="font-sans text-fyLabel uppercase text-brass">{OFFRE.eyebrow}</p>
            <h2 className="mt-6 font-serif font-medium text-fyH2 text-ctext" style={{ textWrap: 'balance' }}>
              {OFFRE.title}
            </h2>
            <p className="mt-4 font-serif text-fyLead text-brassBright">{OFFRE.subtitle}</p>
            <ul className="mt-12 border-t border-brass/30">
              {OFFRE.items.map((it, i) => (
                <li key={it} className="flex items-baseline gap-6 border-b border-brass/20 py-5 md:gap-8">
                  <span className="font-sans text-fyLabel tabular-nums text-brassBright/80">{String(i + 1).padStart(2, '0')}</span>
                  <span className="max-w-[56ch] font-serif font-medium text-fyLead text-ctext">{it}</span>
                </li>
              ))}
            </ul>
            <div className="mt-14">
              {OFFRE.bonis.map((b, i) => (
                <div key={b.title} className={`py-7 ${i ? 'border-t border-brass/20' : ''}`}>
                  <p className="font-sans text-fyLabel uppercase text-brassBright">{b.title}</p>
                  <p className="mt-3 max-w-[56ch] font-sans text-fyBody text-ctextSoft">{b.body}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:sticky lg:top-28 lg:col-span-5 lg:pl-8">
            <PrixLancement
              regular={OFFRE.priceRegular}
              price={OFFRE.price}
              note={OFFRE.priceNote}
              className="[&>p:first-of-type]:text-[clamp(3.2rem,2.2rem+4vw,6rem)]"
            />
            <div className="mt-8 space-y-2">
              {OFFRE.paymentLines.map((l) => (
                <p key={l.slice(0, 20)} className="font-sans text-fyBody text-ctextSoft">
                  {l}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ── Appel final (section 11 du doc final) ── */
const AppelFinal: React.FC = () => {
  const reduce = useReducedMotion();
  return (
    <section className="relative z-[55] overflow-hidden bg-encre px-6 pt-32 pb-44 md:px-12 md:pb-60 lg:px-20">
      <Atmosphere light="72% 30%" strength={1} />
      <video
        src="/foyer/final-braises.mp4"
        poster="/foyer/final-braises.webp"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[72%] w-full object-cover opacity-60"
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
      <div className="relative z-10 mx-auto w-full max-w-[1360px]">
        <div className="max-w-[900px]">
          <motion.h2
            className="font-serif font-medium leading-[1.08] text-ctext text-[clamp(2.2rem,3.6vw,3.4rem)]"
            initial={reduce ? undefined : { opacity: 0, y: 30, filter: 'blur(6px)' }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1.2, ease }}
          >
            {FINAL.title}
          </motion.h2>
          <motion.div
            initial={reduce ? undefined : { opacity: 0, y: 26 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1.1, ease, delay: 0.18 }}
          >
            <p className="mt-6 max-w-[40ch] font-serif font-medium leading-[1.2] text-[clamp(1.4rem,1.1rem+1.4vw,2.3rem)] text-brassBright">
              {FINAL.emphasis}
            </p>
          </motion.div>
          <div className="mt-10 max-w-[64ch] space-y-2 font-sans text-fyBody text-ctextSoft">
            {FINAL.lines.map((l, i) => (
              <motion.p
                key={l.slice(0, 20)}
                initial={reduce ? undefined : { opacity: 0, x: -18 }}
                whileInView={reduce ? undefined : { opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.8, ease, delay: 0.1 + i * 0.12 }}
              >
                {l}
              </motion.p>
            ))}
          </div>
          <motion.p
            className="mt-8 max-w-[64ch] font-serif font-medium text-fyLead text-ctext"
            initial={reduce ? undefined : { opacity: 0, y: 18 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.9, ease, delay: 0.2 }}
          >
            {FINAL.closing}
          </motion.p>
          <motion.p
            className="mt-14 font-serif font-semibold leading-[1.08] text-ctext text-[clamp(2.2rem,3.6vw,3.6rem)]"
            initial={reduce ? undefined : { opacity: 0, y: 34, filter: 'blur(8px)' }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 1.3, ease }}
          >
            {FINAL.callout}
          </motion.p>
          <motion.div
            className="mt-8"
            initial={reduce ? undefined : { opacity: 0, y: 22, filter: 'blur(6px)' }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 1.1, ease, delay: 0.2 }}
          >
            <PrixLancement
              regular={FINAL.priceRegular}
              price={FINAL.price}
              note={FINAL.priceNote}
              className="[&>p:first-of-type]:text-4xl"
            />
            <div className="mt-2 space-y-0.5">
              {FINAL.priceLines.map((l) => (
                <p key={l} className="font-sans text-[0.95rem] tracking-[0.04em] text-ctextSoft">
                  {l}
                </p>
              ))}
            </div>
          </motion.div>
          <motion.div
            className="mt-9"
            initial={reduce ? undefined : { opacity: 0, y: 18 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.9, ease, delay: 0.35 }}
          >
            <Cta label={FINAL.cta} dark />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

/* ── Page ── */
const FoyerPage: React.FC = () => {
  const [ready, setReady] = useState(false);
  const reduce = useReducedMotion();
  useEffect(() => {
    const prev = document.title;
    document.title = "Le Foyer d'Origine | Krystine St-Laurent";
    /* la page repart toujours en haut : sinon le navigateur restaure un
       scroll au milieu de la scène pinnée et le titre semble absent */
    /* le fond du body est l'espresso du site : sur cette page, il transparaît
       en brun quand une feuille épinglée n'est pas encore peinte. On le passe
       en crème le temps de la visite. */
    const prevBg = document.body.style.background;
    document.body.style.background = '#f6f3ee';
    const prevRestore = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    const t = window.setTimeout(() => setReady(true), 1150);
    return () => {
      window.clearTimeout(t);
      document.title = prev;
      document.body.style.background = prevBg;
      window.history.scrollRestoration = prevRestore;
    };
  }, []);
  return (
    <div className="bg-cream overflow-x-clip">
      <Preloader done={ready} />
      {/* inert tant que le preloader couvre : le clavier ne peut pas
          atteindre le contenu invisible dessous */}
      <div inert={ready ? undefined : true}>
        <FoyerScene ready={ready} />
        {/* la feuille des portes monte SUR le feu : aucune coupure crème */}
        <BodySections overlap={!reduce} />
        <Offre />
        {/* la musique d'Origine offerte, juste avant les braises */}
        <MusiqueOrigine />
        {/* le feu des braises est le point le plus bas de la page : rien après */}
        <AppelFinal />
      </div>
      <AchatFoyer />
    </div>
  );
};

// La pilule d'achat flottante : rejoindre le Foyer par Stripe. Une fois la
// formation achetée, elle devient la porte vers le lecteur.
const AchatFoyer: React.FC = () => {
  const { user, setSignInOpen } = useAuth();
  const [formation, setFormation] = useState<Formation | null>(null);
  const [possede, setPossede] = useState(false);
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => { getFormation('foyer').then(setFormation).catch(() => {}); }, []);
  useEffect(() => {
    if (user) aAchete(user.uid, 'foyer').then(setPossede).catch(() => {});
    else setPossede(false);
  }, [user]);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!formation || formation.statut !== 'publie' || !visible) return null;

  const rejoindre = async () => {
    if (possede) { window.location.href = '/cours/foyer'; return; }
    if (!user) { setSignInOpen(true); return; }
    setBusy(true);
    try { window.location.href = await acheterFormation('foyer'); } catch { setBusy(false); }
  };

  return (
    <button
      type="button"
      onClick={rejoindre}
      disabled={busy}
      className="fixed bottom-[5.5rem] right-5 z-[90] inline-flex items-center gap-2 rounded-full bg-[#bb9a5e] px-5 py-3 sm:bottom-6 sm:right-6 sm:px-6 sm:py-3.5 text-xs font-bold uppercase tracking-widest text-[#2a2015] shadow-[0_12px_35px_-10px_rgba(163,130,63,0.9)] backdrop-blur transition-transform hover:scale-[1.03] disabled:opacity-60"
    >
      <i className={`fa-solid ${possede ? 'fa-door-open' : 'fa-fire'}`} />
      {busy ? 'Redirection…' : possede ? 'Ouvrir ma formation' : (
        <>
          Rejoindre<span className="hidden sm:inline"> le Foyer</span>
          {formation.paywall && formation.prix ? ` · ${formation.prix} $` : ''}
        </>
      )}
    </button>
  );
};

export default FoyerPage;
