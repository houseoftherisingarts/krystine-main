import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import { ASSETS } from '../content';
import LiquidOilBackground from '../components/LiquidOilBackground';
import DropIntro from '../components/DropIntro';
import { goToRoute } from '../lib/staticRoutes';

// Reduced-motion detection: skip the WebGL shaders, render a static gradient.
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const COPY = {
  FR: {
    title: 'Krystine St-Laurent',
    sealed: 'Le corps sait. Il manquait la carte pour le lire.',
    para: 'Au-delà des tendances, lorsque les recettes toutes faites ne suffisent plus, reprendre SA direction.',
    cta: 'Rejoindre Origine',
    ctaSub: 'Douze semaines pour cesser de se deviner',
  },
  EN: {
    title: 'Krystine St-Laurent',
    sealed: 'The body knows. What was missing was the map to read it.',
    para: 'Beyond trends, when ready-made recipes no longer suffice, reclaim YOUR direction.',
    cta: 'Join Origin',
    ctaSub: 'Twelve weeks to stop second-guessing yourself',
  },
} as const;

const SplashScreen: React.FC = () => {
  const { lang, setLang } = useApp();
  const navigate = useNavigate();
  const [introDone, setIntroDone] = useState(false);
  const reduceMotion = useMemo(prefersReducedMotion, []);
  const t = COPY[lang];

  // Any scroll, wheel, or touch swipe dismisses the hero and reveals /accueil.
  // A click anywhere (outside the Origine CTA / lang toggle / logo) does the same.
  useEffect(() => {
    if (!introDone) return;
    let dismissed = false;
    const go = () => {
      if (dismissed) return;
      dismissed = true;
      navigate('/accueil');
    };
    const onWheel = (e: WheelEvent) => { if (Math.abs(e.deltaY) > 5) go(); };
    let touchY = 0;
    const onTouchStart = (e: TouchEvent) => { touchY = e.touches[0].clientY; };
    const onTouchMove = (e: TouchEvent) => { if (Math.abs(touchY - e.touches[0].clientY) > 20) go(); };
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [introDone, navigate]);

  // Background-click → /accueil (button/lang/logo handled by stopPropagation).
  const onBgClick = () => navigate('/accueil');

  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-[#2E1A14] text-white cursor-pointer" onClick={onBgClick}>

      {/* Ayurvedic oil surface (pointer-reactive 3D liquid) or CSS fallback */}
      {!reduceMotion ? (
        <LiquidOilBackground />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#B8532F_0%,#6B402F_25%,#3A251E_70%)] opacity-90" />
      )}

      {/* Overcast pond lighting — even ambient across the whole surface with
          a gentle darkening only at the extreme corners. No centered scrim,
          so the gold water stays evenly lit edge-to-edge. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_90%_at_50%_50%,transparent_55%,rgba(46,30,20,0.35)_88%,rgba(46,30,20,0.65)_100%)] pointer-events-none" />

      {/* Thin horizon wash — a barely-there gradient from top to bottom adds
          dimensional depth without creating a focal dark spot. */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(46,30,20,0.10)_0%,transparent_25%,transparent_75%,rgba(46,30,20,0.18)_100%)] pointer-events-none" />

      {/* Drop intro — lives on its own minimal screen, then hands off to the main content. */}
      <AnimatePresence>
        {!introDone && <DropIntro key="drop-intro" onComplete={() => setIntroDone(true)} />}
      </AnimatePresence>

      {/* Main content — mounted only after the drop completes so the whole page fades in. */}
      {introDone && (<>
      {/* Header — minimal: logo + lang. Stop propagation so header clicks
          don't also trigger the "click anywhere → /accueil" background. */}
      <header
        className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 md:px-10 py-6"
        onClick={e => e.stopPropagation()}
      >
        <motion.img
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1 }}
          src={ASSETS.navLogo}
          alt="Krystine St-Laurent"
          className="h-10 md:h-12 w-auto opacity-90"
          style={{ filter: 'invert(1) brightness(1.5)' }}
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.7 }}
          className="flex items-center gap-1 text-[10px] uppercase tracking-[0.3em] font-bold text-white/70"
        >
          {(['FR', 'EN'] as const).map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-1.5 rounded-full border transition-colors ${lang === l ? 'border-[#B8532F] text-[#B8532F]' : 'border-white/10 hover:border-white/30'}`}
            >{l}</button>
          ))}
        </motion.div>
      </header>

      {/* Main content — centered column, no compass, no side buttons. */}
      <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 text-center">
        {/* Big title — Krystine's name. Layered shadows (tight black halo +
            soft wide glow) keep it legible over any pool of gold beneath. */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0, delay: 0.2, ease: 'easeOut' }}
          className="font-serif text-white uppercase tracking-[0.2em] text-3xl md:text-6xl lg:text-7xl"
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.85), 0 2px 14px rgba(0,0,0,0.7), 0 4px 40px rgba(0,0,0,0.5)' }}
        >
          {t.title}
        </motion.h1>

        {/* Ivoire card holding both quoted lines — a parchment ground
            over the liquid background so the italic copy stays legible
            regardless of where the gold pools beneath. */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0, delay: 0.45, ease: 'easeOut' }}
          className="mt-8 md:mt-10 max-w-3xl w-full rounded-[22px] px-6 md:px-10 py-6 md:py-8 backdrop-blur-[3px]"
          style={{
            background: 'rgba(244,231,221,0.18)',
            border: '1px solid rgba(244,231,221,0.28)',
            boxShadow: '0 14px 40px rgba(0,0,0,0.35)',
          }}
        >
          <p
            className="font-serif italic text-white text-xl md:text-3xl lg:text-4xl leading-snug"
            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.85), 0 2px 16px rgba(0,0,0,0.65), 0 4px 36px rgba(0,0,0,0.45)' }}
          >
            {t.sealed}
          </p>
          <p
            className="mt-5 md:mt-6 font-serif italic text-white/95 text-base md:text-lg max-w-2xl mx-auto leading-[1.8]"
            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 2px 14px rgba(0,0,0,0.6)' }}
          >
            {t.para}
          </p>
        </motion.div>

        {/* Rejoindre Origine — the only CTA. Stop propagation so the click
            goes to /origine and not to the background /accueil handler. */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.95, ease: 'easeOut' }}
          onClick={e => { e.stopPropagation(); goToRoute(navigate, '/origine'); }}
          className="mt-10 md:mt-12 group inline-flex items-center gap-3 bg-[#B8532F] hover:bg-white text-[#3A251E] px-10 py-4 rounded-full font-bold uppercase tracking-[0.25em] text-[11px] md:text-xs shadow-[0_10px_36px_rgba(184,83,47,0.35)] transition-all duration-300 whitespace-nowrap"
        >
          {t.cta}
          <i className="fa-solid fa-arrow-right text-[10px] group-hover:translate-x-1 transition-transform" />
        </motion.button>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 1.15 }}
          className="mt-4 font-serif italic text-[#B8532F] text-sm md:text-base"
        >
          {t.ctaSub}
        </motion.p>
      </main>
      </>)}
    </div>
  );
};

export default SplashScreen;
