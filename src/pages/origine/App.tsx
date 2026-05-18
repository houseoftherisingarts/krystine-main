import React, { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Leaf, Volume2, VolumeX } from 'lucide-react';

import { Controls } from './components/layout/Controls';
import { BotanicalLeaf } from './components/components/ui/Botanicals';
import { BookHeroSection } from './components/components/ui/BookHeroSection';
import { FAQSection } from './components/components/ui/FAQSection';
import { LoadingScreen } from './components/components/ui/LoadingScreen';
import { HeroSection } from './components/components/ui/HeroSection';
import { ParallaxStrip } from './components/components/ui/ParallaxStrip';
import { CONTENT } from './constants';
import { Language, Theme } from './types';
import { LogoO } from './components/components/ui/LogoO';
import { LeadMagnetMusic } from './components/components/ui/LeadMagnetMusic';

const CurriculumTimeline = React.lazy(() => import('./components/components/ui/CurriculumTimeline').then(m => ({ default: m.CurriculumTimeline })));
const HowItWorks = React.lazy(() => import('./components/components/ui/HowItWorks').then(m => ({ default: m.HowItWorks })));
const PricingSection = React.lazy(() => import('./components/components/ui/PricingSection').then(m => ({ default: m.PricingSection })));
const GrimoireShowcase = React.lazy(() => import('./components/components/ui/GrimoireShowcase').then(m => ({ default: m.GrimoireShowcase })));
const ProgramSchedule = React.lazy(() => import('./components/components/ui/ProgramSchedule').then(m => ({ default: m.ProgramSchedule })));

const FullExperience: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [lang, setLang] = useState<Language>('fr');
  const [theme, setTheme] = useState<Theme>('light');
  const [scrolled, setScrolled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [isSamplePlaying, setIsSamplePlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const t = CONTENT[lang];

  useEffect(() => {
    const checkDevice = () => setIsMobile(window.innerWidth < 1024);
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  const handleLoadingFinish = () => setIsLoading(false);

  useEffect(() => {
    const audio = document.getElementById('bg-audio') as HTMLAudioElement;
    if (audio) {
      audio.volume = isMuted ? 0 : volume;
      if (isSamplePlaying) {
        audio.pause();
      } else {
        audio.play().catch(() => {});
      }
    }
  }, [isMuted, volume, isSamplePlaying]);

  const toggleMute = () => setIsMuted(!isMuted);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (newVolume > 0 && isMuted) setIsMuted(false);
    if (newVolume === 0 && !isMuted) setIsMuted(true);
  };

  const handleAudioSamplePlay = (isPlaying: boolean) => setIsSamplePlaying(isPlaying);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 50);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const baseStyle = { fontSize: 'clamp(14px, 0.7rem + 0.5vw, 18px)' } as React.CSSProperties;

  const seoData = {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": "Expérience Origine par Krystine St-Laurent",
    "description": "Expérience Origine : Sagesse ancestrale, Ayurveda et Réalité Contemporaine. Retrouvez votre boussole intérieure avec Krystine St-Laurent.",
    "provider": {
      "@type": "Person",
      "name": "Krystine St-Laurent",
      "jobTitle": "Experte en Ayurveda et Herboristerie",
      "award": "Auteure de la trilogie Ayurveda aux Éditions de l'Homme",
      "hasCredential": "35 ans d'expérience en santé"
    },
    "keywords": "cheval de feu 2026, transformation énergétique 2026, autorité intérieure, ayurveda Québec, Krystine St-Laurent, écouter son corps, fatiguée d'être fatiguée, Francois Lemay, Tony Robbins, Kaizen, Défi 22 jours, Performance, Coaching de vie, Mindset, santé holistique, transformation",
    "mentions": [
      { "@type": "Person", "name": "Francois Lemay" },
      { "@type": "Person", "name": "Tony Robbins" }
    ]
  };

  const desktopView = (
    <div className="min-h-screen relative font-sans selection:bg-copper-bruni selection:text-white max-w-full" style={baseStyle}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(seoData) }} />
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05] bg-noise z-50 mix-blend-overlay"></div>
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-copper-glow/15 dark:bg-copper-bruni/10 rounded-full blur-[120px] animate-breathe"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-copper-honey/10 dark:bg-copper-glow/5 rounded-full blur-[120px] animate-breathe" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-b from-transparent via-copper-glow/5 to-transparent opacity-30"></div>
      </div>
      <div className="fixed top-0 left-0 right-0 z-40 p-4 flex justify-center pointer-events-none">
        <div className={`pointer-events-auto flex items-center justify-between gap-6 sm:gap-12 px-6 py-3 rounded-pill transition-all duration-500 ease-out ${scrolled ? 'bg-white/80 dark:bg-black/60 shadow-xl backdrop-blur-xl border border-white/20' : 'bg-transparent translate-y-2'}`}>
          <div className={`font-serif font-semibold tracking-widest text-ink-sureau dark:text-paper transition-all flex items-center ${scrolled ? 'text-lg' : 'text-xl'}`}>
            <span className="uppercase mr-2">Expérience</span><LogoO className="mr-[2px] text-copper-bruni" />rigine
          </div>
          <div className="flex items-center gap-2">
            <Controls theme={theme} setTheme={setTheme} />
            <div className="w-px h-3 bg-copper-honey/20"></div>
            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-copper-honey/10 text-ink-sureau dark:text-paper transition-all pointer-events-auto" aria-label="Toggle Audio">
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <input type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume} onChange={handleVolumeChange} className="w-20 h-1 bg-copper-honey/20 dark:bg-paper/20 rounded-lg appearance-none cursor-pointer accent-copper-honey hidden sm:block pointer-events-auto" aria-label="Volume" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="w-full relative snap-start">
        <HeroSection lang={lang} t={t} handleAudioSamplePlay={handleAudioSamplePlay} isMobile={isMobile} />
      </div>
      
      <section className="bg-paper dark:bg-ink-forest relative z-10 py-16 lg:py-20 overflow-hidden shadow-[0_-50px_100px_rgba(0,0,0,0.1)] w-full px-6 md:px-12">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#4A5D52]/15 rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <BotanicalLeaf className="absolute top-20 right-10 w-48 h-48 rotate-[-20deg] opacity-50 text-[#4A5D52]" />
        <Suspense fallback={<div className="h-96 w-full animate-pulse bg-black/5 dark:bg-white/5" />}>
          <CurriculumTimeline content={t.timeline} />
        </Suspense>
        <div className="relative w-full max-w-2xl mx-auto mt-16 px-6">
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-copper-bruni rounded-full flex items-center justify-center shadow-lg border-4 border-paper dark:border-ink-forest z-20 pointer-events-none">
            <Leaf className="text-white" size={20} />
          </div>
          <motion.button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} whileHover={{ y: -4 }} className="w-full bg-white/60 dark:bg-black/30 pt-12 pb-8 px-8 rounded-[2rem] border border-copper-bruni/20 backdrop-blur-md shadow-xl relative z-10 transition-all hover:bg-white/80 dark:hover:bg-black/40 hover:shadow-2xl duration-300 group flex flex-col items-center justify-center gap-3">
            <span className="font-serif text-2xl md:text-3xl text-ink-sureau dark:text-paper group-hover:text-copper-bruni transition-colors tracking-wide font-medium text-center">
              Rejoindre l'EXPÉRIENCE ORIGINE
            </span>
            <div className="w-16 h-px bg-copper-honey/40"></div>
            <span className="text-lg uppercase tracking-[0.2em] text-copper-bruni dark:text-copper-light flex items-center gap-2 font-bold">
              M'INSCRIRE <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </span>
          </motion.button>
        </div>
      </section>

      <div className="snap-start">
        <BookHeroSection
          imageUrl="https://wsrv.nl/?url=https%3A%2F%2Fstorage.googleapis.com%2Forigine1%2FA%25CC%2580%2520venir%2520biento%25CC%2582t!.png&w=1200&output=webp"
          text={<>Trois livres. 8 ans. 1200 pages inspirées de l'Ayurveda... <strong className="text-copper-bruni dark:text-copper-light font-medium">et une partie de son contenu inédit nourrit Expérience Origine avant même sa publication.</strong></>}
        />
      </div>

      <div className="snap-start">
        <Suspense fallback={<div className="h-32" />}>
          <HowItWorks />
        </Suspense>
      </div>

      <section id="grimoire-showcase" className="lg:sticky lg:top-0 lg:h-screen w-full flex flex-col justify-center bg-paper dark:bg-ink-forest z-20 overflow-hidden snap-start">
        <div className="w-full h-full flex flex-col justify-center">
          <Suspense fallback={<div className="h-32" />}>
            <GrimoireShowcase content={t.grimoire} />
          </Suspense>
        </div>
      </section>

      {/* CALENDRIER 2026 REMOVED FROM HERE */}

      <section id="about" className="lg:sticky lg:top-0 lg:h-screen w-full flex flex-col justify-center bg-paper dark:bg-ink-forest z-20 overflow-hidden snap-start">
        <div className="w-full h-full flex flex-col justify-center">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-y-12 gap-x-8 lg:gap-16 items-center">
            <div className="relative order-last lg:order-first z-20">
              <div className="absolute inset-0 bg-[#9E7B5A]/10 rounded-[40px] rotate-3 scale-105"></div>
              <div className="relative rounded-[40px] shadow-2xl w-full overflow-hidden aspect-[4/5] md:aspect-square lg:aspect-[4/5]">
                <img src="https://wsrv.nl/?url=storage.googleapis.com/origine1/krystine%20red%20NG.webp&w=1000&output=webp" alt="Krystine St-Laurent" loading="lazy" decoding="async" className="w-full h-full object-cover object-center grayscale-[20%] hover:grayscale-0 transition-all duration-700 hover:scale-[1.02]" />
              </div>
            </div>
            <div className="space-y-6">
              <h2 className="text-[clamp(2.5rem,6vw,3.5rem)] font-serif text-ink-sureau dark:text-paper">{t.about.title}</h2>
              <div className="space-y-6 text-lg text-ink-sureau/80 dark:text-paper/80 leading-relaxed font-light">
                <p>35 ans en première ligne — soins intensifs, recherche clinique, les coulisses du système — avant de choisir l'herboristerie, l'Ayurveda et l'aromathérapie. Auteure de trois livres aux Éditions de l'Homme. Créatrice de la série télé Santé la vie et du podcast Au-delà des tendances. Elle a vu ce que l'approche moderne fait bien. Et elle a vu là où elle laisse les gens seuls. Les rituels qu'elle enseigne, elle les pratique chaque matin.</p>
                <div className="space-y-5 border-l-2 border-[#9E7B5A] pl-6 py-2">
                  <p className="font-medium text-[#9E7B5A] text-base lg:text-lg"><span className="italic">« Personne ne parle de ces choses-là comme Krystine. Quand elle explique, tout devient clair. »</span> <span className="not-italic opacity-80 text-sm block mt-1">— Annie</span></p>
                  <p className="font-medium text-[#9E7B5A] text-base lg:text-lg"><span className="italic">« Je me suis rarement écoutée tout au long de ma vie. C'est la première fois que quelqu'un me donne les outils pour le faire. »</span> <span className="not-italic opacity-80 text-sm block mt-1">— Françoise</span></p>
                  <p className="font-medium text-[#9E7B5A] text-base lg:text-lg"><span className="italic">« Ce que j'ai lu dans cent livres sans comprendre, Krystine l'a rendu évident. »</span> <span className="not-italic opacity-80 text-sm block mt-1">— Marie</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <div id="pricing" className="relative z-40 bg-[#FDFBF5] dark:bg-ink-sureau w-full snap-start">
        <Suspense fallback={<div className="h-32" />}>
          <PricingSection />
        </Suspense>

        <div className="w-full relative z-0 border-y border-copper-bruni/20">
          <ParallaxStrip imageUrl="https://storage.googleapis.com/origine1/origine%20programme.png" altText="Parcours Expérience Origine" />
        </div>

        <FAQSection />

      {/* CALENDRIER 2026 */}
      <section id="schedule" className="lg:sticky lg:top-0 lg:h-screen w-full flex flex-col justify-center bg-paper dark:bg-ink-forest z-20 overflow-hidden snap-start">
        <div className="w-full h-full flex flex-col justify-center">
          <Suspense fallback={<div className="h-32" />}>
            <ProgramSchedule />
          </Suspense>
        </div>
      </section>
        
        <LeadMagnetMusic />
        
        <section id="contact" className="py-16 lg:py-20 px-6 md:px-12 relative overflow-hidden w-full">
          <div className="max-w-5xl mx-auto text-center">
            <a href="mailto:teamksl@inspiratanature.com" className="inline-block font-serif italic text-[#9E7B5A] hover:text-[#C8943E] transition-colors text-lg md:text-xl border-b border-[#9E7B5A]/30 pb-1">Une question? Écrivez à teamksl@inspiratanature.com</a>
          </div>
        </section>
        
        <footer className="py-16 lg:py-20 bg-ink-forest text-paper/60 text-center md:text-left w-full relative">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
            <div className="col-span-1 md:col-span-2 text-center md:text-left">
              <div className="font-serif text-[6vw] sm:text-2xl md:text-3xl text-paper mb-4 flex items-center justify-center md:justify-start uppercase tracking-[0.08em] md:tracking-[0.15em] whitespace-nowrap">EXPÉRIENCE <LogoO className="mx-1.5 md:mx-2 w-[0.85em] h-[0.85em] text-copper-light flex-shrink-0" />RIGINE</div>
              <p className="max-w-sm text-sm mx-auto md:mx-0 text-paper/50">Un retour aux sources de l'être. Une exploration de la santé par la sagesse de l'Ayurveda.</p>
            </div>
            <div className="space-y-4">
              <h4 className="text-paper font-serif text-lg">Contact</h4>
              <p className="text-sm">teamksl@inspiratanature.com</p>
            </div>
            <div className="space-y-4">
              <h4 className="text-paper font-serif text-lg">Social</h4>
              <div className="flex justify-center md:justify-start gap-4">
                <a href="https://www.instagram.com/krystinesaintlaurent/" target="_blank" rel="noopener noreferrer" className="hover:text-copper-light">Instagram</a>
                <a href="https://www.facebook.com/Krystinestlaurent" target="_blank" rel="noopener noreferrer" className="hover:text-copper-light">Facebook</a>
                <a href="https://www.youtube.com/channel/UCjFhOsr-qy8tERbRW2XUScA" target="_blank" rel="noopener noreferrer" className="hover:text-copper-light">YouTube</a>
              </div>
            </div>
          </div>
          <div className="mt-20 text-center text-xs opacity-30"><p>© {new Date().getFullYear()} Krystine St-Laurent. Plateforme développée par le salon des inconnus.</p></div>
        </footer>
      </div>
    </div>
  );

  const mobileView = (
    <div className="min-h-[100dvh] pb-16 flex flex-col gap-y-16 overflow-x-hidden bg-paper dark:bg-ink-dark-blue" style={baseStyle}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(seoData) }} />
      
      <HeroSection lang={lang} t={t} handleAudioSamplePlay={handleAudioSamplePlay} isMobile={isMobile} />
      
      <section className="bg-paper dark:bg-ink-forest relative z-10 py-16 overflow-hidden shadow-[0_-50px_100px_rgba(0,0,0,0.1)] w-full px-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#4A5D52]/15 rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <BotanicalLeaf className="absolute top-20 right-10 w-48 h-48 rotate-[-20deg] opacity-50 text-[#4A5D52]" />
        <Suspense fallback={<div className="h-96 w-full animate-pulse bg-black/5 dark:bg-white/5" />}>
          <CurriculumTimeline content={t.timeline} />
        </Suspense>
        <div className="relative w-full max-w-2xl mx-auto mt-16 px-6">
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-copper-bruni rounded-full flex items-center justify-center shadow-lg border-4 border-paper dark:border-ink-forest z-20 pointer-events-none">
            <Leaf className="text-white" size={20} />
          </div>
          <motion.button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} whileHover={{ y: -4 }} className="w-full bg-white/60 dark:bg-black/30 pt-12 pb-8 px-8 rounded-[2rem] border border-copper-bruni/20 backdrop-blur-md shadow-xl relative z-10 transition-all hover:bg-white/80 dark:hover:bg-black/40 hover:shadow-2xl duration-300 group flex flex-col items-center justify-center gap-3">
            <span className="font-serif text-2xl md:text-3xl text-ink-sureau dark:text-paper group-hover:text-copper-bruni transition-colors tracking-wide font-medium text-center">
              Rejoindre l'EXPÉRIENCE ORIGINE
            </span>
            <div className="w-16 h-px bg-copper-honey/40"></div>
            <span className="text-lg uppercase tracking-[0.2em] text-copper-bruni dark:text-copper-light flex items-center gap-2 font-bold">
              M'INSCRIRE <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </span>
          </motion.button>
        </div>
      </section>

      <BookHeroSection
        imageUrl="https://wsrv.nl/?url=https%3A%2F%2Fstorage.googleapis.com%2Forigine1%2FA%25CC%2580%2520venir%2520biento%25CC%2582t!.png&w=1200&output=webp"
        text={<>Trois livres. 8 ans. 1200 pages inspirées de l'Ayurveda... <strong className="text-copper-bruni dark:text-copper-light font-medium">et une partie de son contenu inédit nourrit Expérience Origine avant même sa publication.</strong></>}
      />
      
      <Suspense fallback={<div className="h-32" />}>
        <HowItWorks />
      </Suspense>
      
      <Suspense fallback={<div className="h-32" />}>
        <GrimoireShowcase content={t.grimoire} />
      </Suspense>

      {/* CALENDRIER 2026 REMOVED FROM HERE */}

      <div className="w-full px-6 max-w-7xl mx-auto grid grid-cols-1 gap-y-12 items-center">
        <div className="relative order-last z-20">
          <div className="absolute inset-0 bg-[#9E7B5A]/10 rounded-[40px] rotate-3 scale-105"></div>
          <div className="relative rounded-[40px] shadow-2xl w-full overflow-hidden aspect-[4/5]">
            <img src="https://wsrv.nl/?url=storage.googleapis.com/origine1/krystine%20red%20NG.webp&w=1000&output=webp" alt="Krystine St-Laurent" loading="lazy" decoding="async" className="w-full h-full object-cover object-center grayscale-[20%] hover:grayscale-0 transition-all duration-700 hover:scale-[1.02]" />
          </div>
        </div>
        <div className="space-y-6">
          <h2 className="text-4xl font-serif text-ink-sureau dark:text-paper">{t.about.title}</h2>
          <div className="space-y-6 text-lg text-ink-sureau/80 dark:text-paper/80 leading-relaxed font-light">
            <p>35 ans en première ligne — soins intensifs, recherche clinique, les coulisses du système — avant de choisir l'herboristerie, l'Ayurveda et l'aromathérapie. Auteure de trois livres aux Éditions de l'Homme. Créatrice de la série télé Santé la vie et du podcast Au-delà des tendances. Elle a vu ce que l'approche moderne fait bien. Et elle a vu là où elle laisse les gens seuls. Les rituels qu'elle enseigne, elle les pratique chaque matin.</p>
            <div className="space-y-5 border-l-2 border-[#9E7B5A] pl-6 py-2">
              <p className="font-medium text-[#9E7B5A] text-base"><span className="italic">« Personne ne parle de ces choses-là comme Krystine. Quand elle explique, tout devient clair. »</span> <span className="not-italic opacity-80 text-sm block mt-1">— Annie</span></p>
              <p className="font-medium text-[#9E7B5A] text-base"><span className="italic">« Je me suis rarement écoutée tout au long de ma vie. C'est la première fois que quelqu'un me donne les outils pour le faire. »</span> <span className="not-italic opacity-80 text-sm block mt-1">— Françoise</span></p>
              <p className="font-medium text-[#9E7B5A] text-base"><span className="italic">« Ce que j'ai lu dans cent livres sans comprendre, Krystine l'a rendu évident. »</span> <span className="not-italic opacity-80 text-sm block mt-1">— Marie</span></p>
            </div>
          </div>
        </div>
      </div>
      
      <div id="pricing">
        <Suspense fallback={<div className="h-32" />}>
          <PricingSection />
        </Suspense>
      </div>

      <div className="w-full relative z-0 border-y border-copper-bruni/20">
        <ParallaxStrip imageUrl="https://storage.googleapis.com/origine1/origine%20programme.png" altText="Parcours Expérience Origine" />
      </div>

      <FAQSection />

      {/* CALENDRIER 2026 */}
      <section id="schedule" className="lg:sticky lg:top-0 lg:h-screen w-full flex flex-col justify-center bg-paper dark:bg-ink-forest z-20 overflow-hidden snap-start">
        <Suspense fallback={<div className="h-32" />}>
          <ProgramSchedule />
        </Suspense>
      </section>
      
      <LeadMagnetMusic />
      
      <section id="contact" className="py-16 px-6 relative overflow-hidden w-full">
        <div className="max-w-5xl mx-auto text-center">
          <a href="mailto:teamksl@inspiratanature.com" className="inline-block font-serif italic text-[#9E7B5A] hover:text-[#C8943E] transition-colors text-lg border-b border-[#9E7B5A]/30 pb-1">Une question? Écrivez à teamksl@inspiratanature.com</a>
        </div>
      </section>
      
      <footer className="py-16 px-6 bg-ink-forest text-paper/60 text-center w-full relative">
        <div className="max-w-7xl mx-auto grid grid-cols-1 gap-8">
          <div className="text-center">
            <div className="font-serif text-[6vw] sm:text-2xl md:text-3xl text-paper mb-4 flex items-center justify-center uppercase tracking-[0.08em] md:tracking-[0.15em] whitespace-nowrap">EXPÉRIENCE <LogoO className="mx-1.5 md:mx-2 w-[0.85em] h-[0.85em] text-copper-light flex-shrink-0" />RIGINE</div>
            <p className="max-w-sm text-sm mx-auto text-paper/50">Un retour aux sources de l'être. Une exploration de la santé par la sagesse de l'Ayurveda.</p>
          </div>
          <div className="space-y-4">
            <h4 className="text-paper font-serif text-lg">Contact</h4>
            <p className="text-sm">teamksl@inspiratanature.com</p>
          </div>
          <div className="space-y-4">
            <h4 className="text-paper font-serif text-lg">Social</h4>
            <div className="flex justify-center gap-4">
              <a href="https://www.instagram.com/krystinesaintlaurent/" target="_blank" rel="noopener noreferrer" className="hover:text-copper-light">Instagram</a>
              <a href="https://www.facebook.com/Krystinestlaurent" target="_blank" rel="noopener noreferrer" className="hover:text-copper-light">Facebook</a>
              <a href="https://www.youtube.com/channel/UCjFhOsr-qy8tERbRW2XUScA" target="_blank" rel="noopener noreferrer" className="hover:text-copper-light">YouTube</a>
            </div>
          </div>
        </div>
        <div className="mt-20 text-center text-xs opacity-30"><p>© {new Date().getFullYear()} Krystine St-Laurent. Plateforme développée par le salon des inconnus.</p></div>
      </footer>
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {isLoading && <LoadingScreen onFinished={handleLoadingFinish} />}
      </AnimatePresence>
      <div className="w-full max-w-[100vw] relative bg-paper dark:bg-ink-dark-blue overflow-visible" style={{
        '--color-rigine-main': '#C8943E',
        '--color-rigine-light': '#E6C585',
      } as React.CSSProperties}>
        {isMobile ? mobileView : desktopView}
      </div>
    </>
  );
};

// Migrated 2026-05-06 from `ici-alex-nouvelle-carte-24-marsremix_-origne-remis-à-888 (1)`.
// The bundle's `src/main.tsx` is intentionally NOT imported — the parent
// React app handles mounting. This default export is the route component.
// The `.origine-page` wrapper scopes the bundle's body-level CSS (paper
// palette, scrollbar, etc.) so it doesn't leak onto other routes; see
// `./index.css`.
import './index.css';

export default function App() {
  return (
    <div className="bundle-page origine-page">
      <FullExperience />
    </div>
  );
}