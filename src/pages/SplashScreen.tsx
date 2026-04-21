import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { PulsingBorder } from '@paper-design/shaders-react';
import { useApp } from '../contexts/AppContext';
import { ASSETS } from '../content';
import { getSplashSettings, DEFAULT_SPLASH, type SplashSettings } from '../firebase/firestore';
import LiquidOilBackground from '../components/LiquidOilBackground';
import DropIntro from '../components/DropIntro';

const STORAGE_KEY = 'inspirata.splash.seenAt';
const REVISIT_DAYS = 7;

// Reduced-motion detection: skip the WebGL shaders, render a static gradient.
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Exact compass from the origine page (copper octagram + rotating needle),
// with amplified multi-layer glow so it pops against the oil surface.
const Compass: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.85, y: 0 }}
    animate={{ opacity: 1, scale: 1, y: [0, -12, 0] }}
    transition={{
      opacity: { duration: 1.2, ease: 'easeOut', delay: 0.1 },
      scale:   { duration: 1.2, ease: 'easeOut', delay: 0.1 },
      y:       { duration: 8,   ease: 'easeInOut', repeat: Infinity, delay: 0.1 },
    }}
    className="relative mx-auto flex items-center justify-center"
    style={{ width: 'clamp(18rem, 30vw, 28rem)', height: 'clamp(18rem, 30vw, 28rem)' }}
  >
    {/* Layered glow halos — make it pop against dark oil */}
    <div className="absolute inset-0 rounded-full bg-[#D4AF37]/20 blur-[80px] scale-75" />
    <div className="absolute inset-0 rounded-full bg-[#E6A374]/15 blur-[120px]" />
    <div className="absolute inset-0 rounded-full bg-[#9A6B49]/25 blur-[60px] scale-90" />

    <svg viewBox="0 0 200 200" className="w-full h-full relative z-10 drop-shadow-[0_0_24px_rgba(212,175,55,0.5)]">
      <defs>
        {/* Polished copper plate — off-center radial gives the "angled light" look */}
        <radialGradient id="copperPlate" cx="35%" cy="32%" r="78%">
          <stop offset="0%"  stopColor="#F1CBA0" />
          <stop offset="22%" stopColor="#D89764" />
          <stop offset="55%" stopColor="#9A5E36" />
          <stop offset="85%" stopColor="#5C3620" />
          <stop offset="100%" stopColor="#2E1B12" />
        </radialGradient>
        {/* Darker copper for the rim */}
        <linearGradient id="copperRim" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%"  stopColor="#F5D4A9" />
          <stop offset="50%" stopColor="#8A5432" />
          <stop offset="100%" stopColor="#2A1611" />
        </linearGradient>
        {/* Needle gradient — polished gold */}
        <linearGradient id="needleGold" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%"  stopColor="#FBE7A1" />
          <stop offset="45%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#6B4D0C" />
        </linearGradient>
        {/* Specular highlight clip — upper-left arc of gloss */}
        <radialGradient id="copperShine" cx="30%" cy="22%" r="45%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
          <stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Main copper plate */}
      <circle cx="100" cy="100" r="92" fill="url(#copperPlate)" />

      {/* Polished shine highlight */}
      <circle cx="100" cy="100" r="92" fill="url(#copperShine)" />

      {/* Dark rim + inner groove */}
      <circle cx="100" cy="100" r="92" fill="none" stroke="url(#copperRim)" strokeWidth="3" />
      <circle cx="100" cy="100" r="85" fill="none" stroke="#2E1B12" strokeWidth="1.4" />
      <circle cx="100" cy="100" r="83" fill="none" stroke="#F1CBA0" strokeOpacity="0.35" strokeWidth="0.6" />

      {/* Degree markings (engraved into the copper) */}
      {Array.from({ length: 12 }).map((_, i) => (
        <line
          key={i}
          x1="100" y1="18"
          x2="100" y2="26"
          transform={`rotate(${i * 30} 100 100)`}
          stroke="#2E1B12"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      ))}

      {/* Inner star / sacred geometry — etched in darker copper */}
      <path
        d="M100 30 L110 90 L170 100 L110 110 L100 170 L90 110 L30 100 L90 90 Z"
        fill="none" stroke="#2E1B12" strokeWidth="0.9" strokeOpacity="0.55"
      />

      {/* Antique gold needle — rotates slowly */}
      <g className="origin-center animate-[spin_80s_linear_infinite_reverse]" style={{ filter: 'drop-shadow(0 0 4px rgba(212,175,55,0.6))' }}>
        <path d="M 100, 22 L 109, 100 L 100, 178 L 91, 100 Z" fill="url(#needleGold)" stroke="#6B4D0C" strokeWidth="0.4" />
        <path d="M 100, 22 L 100, 178" stroke="rgba(255,240,190,0.7)" strokeWidth="0.7" />
        {/* Pivot cabochon — dark copper rim with gold center */}
        <circle cx="100" cy="100" r="6" fill="#2E1B12" />
        <circle cx="100" cy="100" r="4" fill="url(#needleGold)" />
        <circle cx="98.5" cy="98.5" r="1.2" fill="#FBE7A1" opacity="0.9" />
      </g>
    </svg>
  </motion.div>
);

const SplashScreen: React.FC = () => {
  const { lang, setLang } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [settings, setSettings] = useState<SplashSettings>(DEFAULT_SPLASH);
  const [ready, setReady] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const reduceMotion = useMemo(prefersReducedMotion, []);

  // Force-show via ?splash=1 (admin preview); otherwise honor the seen flag.
  useEffect(() => {
    const force = new URLSearchParams(location.search).get('splash') === '1';
    if (!force) {
      try {
        const seen = parseInt(window.localStorage.getItem(STORAGE_KEY) || '0', 10);
        if (seen && Date.now() - seen < REVISIT_DAYS * 86400 * 1000) {
          navigate('/accueil', { replace: true });
          return;
        }
      } catch { /* ignore */ }
    }
    getSplashSettings()
      .then(s => {
        if (!s.enabled && !force) {
          navigate('/accueil', { replace: true });
          return;
        }
        setSettings(s);
        setReady(true);
      })
      .catch(() => { setSettings(DEFAULT_SPLASH); setReady(true); });
  }, [location.search, navigate]);

  const dismiss = (href?: string) => {
    try { window.localStorage.setItem(STORAGE_KEY, Date.now().toString()); } catch { /* noop */ }
    navigate(href || '/accueil');
  };

  const tagline    = lang === 'EN' ? (settings.taglineEN || settings.tagline) : settings.tagline;
  const headline   = lang === 'EN' ? (settings.headlineEN || settings.headline) : settings.headline;
  const subtitle   = lang === 'EN' ? (settings.subtitleEN || settings.subtitle) : settings.subtitle;
  const primaryLbl = lang === 'EN' ? (settings.primaryCtaLabelEN || settings.primaryCtaLabel) : settings.primaryCtaLabel;
  const skipLbl    = lang === 'EN' ? (settings.skipCtaLabelEN || settings.skipCtaLabel) : settings.skipCtaLabel;

  if (!ready) {
    return (
      <div className="fixed inset-0 bg-[#0B1A36] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-t-transparent border-[#D4AF37] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-[#050C1A] text-white">
      {/* SVG filters: liquid-glass refraction for the headline pill */}
      <svg className="absolute inset-0 w-0 h-0">
        <defs>
          <filter id="oil-glass" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence baseFrequency="0.006" numOctaves="1" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.4" />
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0.04
                      0 1 0 0 0.03
                      0 0 1 0 0.06
                      0 0 0 0.92 0"
            />
          </filter>
        </defs>
      </svg>

      {/* Background — animated shader, or static fallback */}
      {/* Ayurvedic oil surface (pointer-reactive 3D liquid) or CSS fallback */}
      {!reduceMotion ? (
        <LiquidOilBackground />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#D4AF37_0%,#9A6B49_25%,#0B1A36_70%)] opacity-90" />
      )}

      {/* Vignette — deepens edges, pools attention at the center */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_25%,rgba(5,12,26,0.6)_70%,#050C1A_100%)] pointer-events-none" />

      {/* Drop intro — lives on its own minimal screen, then hands off to the main content. */}
      <AnimatePresence>
        {!introDone && <DropIntro key="drop-intro" onComplete={() => setIntroDone(true)} />}
      </AnimatePresence>

      {/* Main content — mounted only after the drop completes so the whole page fades in. */}
      {introDone && (<>
      {/* Header — minimal: logo + lang */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 md:px-10 py-6">
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
              className={`px-3 py-1.5 rounded-full border transition-colors ${lang === l ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-white/10 hover:border-white/30'}`}
            >{l}</button>
          ))}
        </motion.div>
      </header>

      {/* Main content */}
      <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 text-center">
        {/* Tagline pill */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.3 }}
          className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 mb-8 relative"
          style={{ filter: 'url(#oil-glass)' }}
        >
          <span className="text-[10px] md:text-xs uppercase tracking-[0.4em] font-bold text-[#D4AF37]">{tagline}</span>
        </motion.div>

        {/* Compass flanked by identical CTAs — grid so asymmetric button widths
            don't push the compass off the horizontal centerline of the page. */}
        <div className="w-full grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-8 md:gap-10 lg:gap-14">
          {/* Left CTA */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.9, ease: 'easeOut' }}
            onClick={() => dismiss(settings.primaryCtaHref)}
            className="order-2 md:order-1 md:justify-self-end group inline-flex items-center gap-3 border border-[#D4AF37] bg-[#0B1A36] hover:bg-[#D4AF37] text-[#D4AF37] hover:text-[#0B1A36] px-8 py-4 rounded-full font-bold uppercase tracking-[0.25em] text-[11px] shadow-[0_6px_20px_rgba(5,12,26,0.55)] hover:shadow-[0_0_50px_rgba(212,175,55,0.55)] transition-all duration-300 whitespace-nowrap"
          >
            <i className="fa-solid fa-arrow-left text-[10px] group-hover:-translate-x-1 transition-transform" />
            {primaryLbl}
          </motion.button>

          {/* Compass (always middle column → centered on page) */}
          <div className="order-1 md:order-2 justify-self-center">
            <Compass />
          </div>

          {/* Right CTA */}
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.9, ease: 'easeOut' }}
            onClick={() => dismiss('/accueil')}
            className="order-3 md:justify-self-start group inline-flex items-center gap-3 border border-[#D4AF37] bg-[#0B1A36] hover:bg-[#D4AF37] text-[#D4AF37] hover:text-[#0B1A36] px-8 py-4 rounded-full font-bold uppercase tracking-[0.25em] text-[11px] shadow-[0_6px_20px_rgba(5,12,26,0.55)] hover:shadow-[0_0_50px_rgba(212,175,55,0.55)] transition-all duration-300 whitespace-nowrap"
          >
            {skipLbl}
            <i className="fa-solid fa-arrow-right text-[10px] group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0, delay: 0.5, ease: 'easeOut' }}
          className="mt-12 text-4xl md:text-6xl font-serif italic leading-[1.05] max-w-3xl text-white"
          style={{ textShadow: '0 2px 30px rgba(0,0,0,0.5)' }}
        >
          {headline}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.9 }}
          className="mt-5 text-sm md:text-base font-serif italic text-white/70 max-w-xl tracking-wide"
        >
          {subtitle}
        </motion.p>
      </main>

      {/* Bottom-right: pulsing badge */}
      <div className="absolute bottom-6 right-6 z-20">
        <div className="relative w-20 h-20 flex items-center justify-center">
          {!reduceMotion && (
            <PulsingBorder
              colors={['#D4AF37', '#F4D679', '#B8860B', '#0B1A36']}
              colorBack="#00000000"
              speed={1.2}
              roundness={1}
              thickness={0.08}
              softness={0.2}
              intensity={4}
              spotsPerColor={4}
              spotSize={0.1}
              pulse={0.1}
              smoke={0.4}
              smokeSize={3}
              scale={0.7}
              rotation={0}
              style={{ width: '64px', height: '64px', borderRadius: '50%' }}
            />
          )}
          {reduceMotion && (
            <div className="w-16 h-16 rounded-full border-2 border-[#D4AF37]/60 animate-pulse" />
          )}
          <motion.svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100"
            animate={{ rotate: 360 }}
            transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
            style={{ transform: 'scale(1.7)' }}
          >
            <defs>
              <path id="splashCircle" d="M 50, 50 m -38, 0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0" />
            </defs>
            <text className="fill-white/80" style={{ fontSize: 7, letterSpacing: '0.15em', fontFamily: 'serif', fontStyle: 'italic' }}>
              <textPath href="#splashCircle" startOffset="0%">
                Inspirata · Ayurveda · Krystine St-Laurent · Inspirata · Ayurveda · Krystine St-Laurent ·
              </textPath>
            </text>
          </motion.svg>
        </div>
      </div>

      {/* Bottom-left: signature */}
      <div className="absolute bottom-8 left-8 z-20 text-[10px] uppercase tracking-[0.3em] text-white/40 hidden md:block">
        <p>Plateforme conceptualisée par</p>
        <p className="font-serif italic text-white/60 mt-1 normal-case tracking-wide">Le Salon des Inconnus</p>
      </div>
      </>)}
    </div>
  );
};

export default SplashScreen;
