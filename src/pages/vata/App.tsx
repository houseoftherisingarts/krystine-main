
// Vata page — migrated 2026-05-06 from the standalone Vite project
// `vata-v3-.-7`. createRoot import + bottom mount block removed so this
// file just exports the App component for the parent router to render
// under /vata. ReactGA was stripped — the main app already tracks
// page_view via Firebase Analytics + Meta Pixel through <AnalyticsPageViews>
// in /App.tsx, so duplicate GA tracking would only add noise + a dep.
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ZapOff, Cloud, Moon, Flame, Mountain, Heart, Waves, Wind, Check, 
  ScrollText, Flower2, Stars, Leaf, Feather, Compass, Sun, 
  ArrowRight, BrainCircuit, Ear, Eye, Hand, Apple, BatteryCharging, 
  Sparkles, Layout, ChevronDown, Quote,
  Plus, Minus, UserPlus, Share2, BadgePercent, Mic, RotateCcw
} from 'lucide-react';
import { Language } from './types';
import { CONTENT, ASSETS } from './constants';
import { Button } from './components/Button';
import { DiagnosisSection } from './components/DiagnosisSection';
import { SolutionSection } from './components/SolutionSection';
import { CurriculumSection } from './components/CurriculumSection';
import { TestimonialsSection } from './components/TestimonialsSection';
import { PricingSection } from './components/PricingSection';
import { GlobalCTA } from './components/GlobalCTA';
import { Footer } from './components/Footer';

const BotanicalBackground = () => (
  <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-30 select-none">
     <motion.div 
       animate={{ rotate: 360 }}
       transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
       className="absolute -top-[10%] -left-[10%] w-[40%] text-brand-vata/20"
     >
       <Flower2 size="100%" strokeWidth={0.5} />
     </motion.div>
     <motion.div 
       animate={{ rotate: -360 }}
       transition={{ duration: 180, repeat: Infinity, ease: "linear" }}
       className="absolute -bottom-[20%] -right-[10%] w-[60%] text-brand-accent/10"
     >
       <Leaf size="100%" strokeWidth={0.3} />
     </motion.div>
  </div>
);

const FloatingParticles = () => (
  <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
    {[...Array(20)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full bg-brand-vata/30 blur-[1px]"
        initial={{
          opacity: 0,
          y: typeof window !== 'undefined' ? window.innerHeight + 50 : 1000,
          x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
          scale: Math.random() * 0.5 + 0.2
        }}
        animate={{
          y: -100,
          opacity: [0, 0.4, 0],
          x: `calc(${Math.random() * 200 - 100}px + ${Math.random() * 100}%)`
        }}
        transition={{
          duration: Math.random() * 20 + 15,
          repeat: Infinity,
          ease: "linear",
          delay: Math.random() * 10
        }}
        style={{ width: Math.random() * 4 + 2 + 'px', height: Math.random() * 4 + 2 + 'px' }}
      />
    ))}
  </div>
);

const ScrollContainer: React.FC<{ children: React.ReactNode, className?: string, isMobile?: boolean }> = ({ children, className = "", isMobile = false }) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [showArrow, setShowArrow] = useState(false);
  const checkScroll = () => {
    if (!scrollRef.current || isMobile) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isScrollable = scrollHeight > clientHeight + 10; 
    const isAtBottom = Math.ceil(scrollTop + clientHeight) >= scrollHeight - 30;
    setShowArrow(isScrollable && !isAtBottom);
  };
  
  useEffect(() => {
    if (isMobile) return;
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [children, isMobile]);

  if (isMobile) {
    return (
      <div className={`w-full h-full overflow-y-auto overflow-x-hidden custom-scrollbar touch-pan-y pb-28 ${className}`}>
        {children}
      </div>
    );
  }

  return (
    <div className="relative flex-1 min-h-0 flex flex-col w-full h-full overflow-hidden">
      <div ref={scrollRef} onScroll={checkScroll} className={`flex-1 overflow-y-auto custom-scrollbar w-full overflow-x-hidden ${className}`}>
        {children}
      </div>
      <AnimatePresence>
        {showArrow && (
           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-30">
              <div className="flex flex-col items-center gap-1 text-[10px] uppercase tracking-[0.2em] font-bold text-brand-vata animate-bounce bg-brand-light/90 dark:bg-brand-dark/90 backdrop-blur-md px-4 py-2 rounded-full border border-brand-vata/20 shadow-xl">
                 <span>Déroulez</span><ChevronDown size={14} />
              </div>
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SlideLayout: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = "" }) => (
  <div className={`w-full h-full px-4 md:px-12 flex flex-col relative z-10 overflow-hidden ${className}`}>
    {children}
  </div>
);

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('fr');
  const [isDark, setIsDark] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [introStep, setIntroStep] = useState(0);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // GA4 tracking removed — main app handles page_view via Firebase Analytics + Meta Pixel.
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const s1 = setTimeout(() => setIntroStep(1), 400); 
    const s2 = setTimeout(() => setIntroStep(2), 2000); 
    const s3 = setTimeout(() => setIntroStep(3), 2300); 
    return () => { clearTimeout(s1); clearTimeout(s2); clearTimeout(s3); };
  }, []);

  useEffect(() => { document.documentElement.classList.toggle('dark', isDark); }, [isDark]);

  const slides = useMemo(() => [
    {
      id: 'hero',
      render: (): React.ReactElement => (
        <div className="w-full h-full relative overflow-hidden bg-black flex flex-col items-center justify-center">
           <div className="hidden md:block absolute inset-0 z-0">
              <img src={ASSETS.images.heroBg} alt="Vata Hero" className="w-full h-full object-cover opacity-60 scale-105 brightness-90" />
              <div className={`absolute inset-0 z-10 transition-opacity duration-1000 ${introStep >= 3 ? 'opacity-100' : 'opacity-0'}`} style={{ backdropFilter: 'blur(60px)', WebkitBackdropFilter: 'blur(60px)', pointerEvents: 'none' }} />
              <div className={`absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent transition-opacity duration-1000 ${introStep >= 3 ? 'opacity-100' : 'opacity-0'}`} />
           </div>
           <div className={`w-full h-full transition-opacity duration-1000 ${introStep >= 3 ? 'opacity-100' : 'opacity-0'}`}>
             <SlideLayout className="!p-0 md:pt-20 md:pb-24 md:px-12 md:justify-center relative z-20">
               <ScrollContainer isMobile={isMobile}>
                 <div className="flex-1 flex flex-col min-h-full">
                   <div className="block md:hidden w-full h-[55vh] shrink-0 relative">
                      <img src={ASSETS.images.heroBg} alt="Vata Hero" className="w-full h-full object-cover brightness-90" />
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90" />
                   </div>
                   <div className="flex-1 flex flex-col justify-center pb-12 pt-6 px-6 md:px-0 bg-black md:bg-transparent min-h-[45vh] md:min-h-0">
                     <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="flex flex-col items-center gap-4 md:gap-6 justify-center">
                        <div className="text-center space-y-4 max-w-full z-20 px-2 flex flex-col items-center">
                           <img src={ASSETS.images.heroLogo} alt="Vata Logo" className="w-24 md:w-32 object-contain mb-2 drop-shadow-xl" />
                           <div className="flex flex-col gap-1 md:gap-3 mb-4 w-full items-center">
                              <h3 className="text-sm md:text-lg font-messiri text-brand-accent tracking-[0.4em] uppercase font-bold drop-shadow-md">{CONTENT.hero.subtitle[lang]}</h3>
                              <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-messiri text-white tracking-tight drop-shadow-2xl uppercase font-black text-shadow-lg leading-[0.95] max-w-4xl mx-auto mt-6 md:mt-8">
                                {CONTENT.hero.title[lang]}
                              </h1>
                           </div>
                           <div className="bg-black/40 backdrop-blur-md px-8 py-6 rounded-2xl border border-white/5 shadow-2xl max-w-3xl mx-auto">
                              <p className="text-base sm:text-lg md:text-xl font-serif italic text-white/95 leading-relaxed">{CONTENT.hero.tagline[lang]}</p>
                           </div>
                           <div className="flex flex-col items-center justify-center gap-3 pt-6 max-w-full px-2">
                               {CONTENT.hero.bullets.map((bullet, idx) => (
                                   <div key={idx} className="flex items-center gap-3 text-white/80 font-medium drop-shadow-md text-sm md:text-lg">
                                       <div className="p-1 rounded-full bg-brand-accent/20 border border-brand-accent/40 text-brand-accent shrink-0 shadow-sm"><Check size={14} strokeWidth={4} /></div>
                                       <span className="leading-tight text-center">{bullet[lang]}</span>
                                   </div>
                               ))}
                           </div>
                           <div className="flex justify-center pt-8 md:pt-12 w-full md:w-auto px-4 md:px-0 pb-12 md:pb-0">
                             <Button variant="primary" size="lg" onClick={() => setCurrentSlide(1)} className="min-w-full md:min-w-[420px] shadow-[0_0_50px_rgba(197,160,89,0.3)] !bg-brand-accent text-brand-dark hover:scale-105 transition-all duration-500 flex items-center justify-center gap-4 py-8 group relative overflow-hidden">
                               <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                               <span className="text-lg md:text-xl font-black uppercase tracking-[0.2em] relative z-10">{CONTENT.hero.buttons.essential[lang]}</span>
                               <ArrowRight size={24} className="relative z-10 animate-pulse" />
                             </Button>
                           </div>
                        </div>
                     </motion.div>
                   </div>
                 </div>
               </ScrollContainer>
             </SlideLayout>
           </div>
        </div>
      )
    },
    { id: 'diagnosis', render: (): React.ReactElement => <SlideLayout><ScrollContainer isMobile={isMobile}><DiagnosisSection lang={lang} isDark={isDark} onNext={() => setCurrentSlide(2)} /></ScrollContainer></SlideLayout> },
    { id: 'solution', render: (): React.ReactElement => <SlideLayout><ScrollContainer isMobile={isMobile}><SolutionSection lang={lang} isDark={isDark} onNext={() => setCurrentSlide(3)} /></ScrollContainer></SlideLayout> },
    { id: 'program', render: (): React.ReactElement => <SlideLayout><ScrollContainer isMobile={isMobile}><CurriculumSection lang={lang} isDark={isDark} onNext={() => setCurrentSlide(4)} /></ScrollContainer></SlideLayout> },
    { id: 'testimonials', render: (): React.ReactElement => <SlideLayout><ScrollContainer isMobile={isMobile}><TestimonialsSection lang={lang} isDark={isDark} /><div className="flex justify-center pb-20"><Button variant="ghost" onClick={() => setCurrentSlide(5)} className="animate-pulse"><ChevronDown size={32} /></Button></div></ScrollContainer></SlideLayout> },
    { id: 'pricing', render: (): React.ReactElement => <SlideLayout><ScrollContainer isMobile={isMobile}><PricingSection lang={lang} isDark={isDark} /><div className="flex justify-center pb-20"><Button variant="ghost" onClick={() => setCurrentSlide(6)} className="animate-pulse"><ChevronDown size={32} /></Button></div></ScrollContainer></SlideLayout> },
    {
      id: 'bio',
      render: (): React.ReactElement => (
        <SlideLayout>
          <ScrollContainer isMobile={isMobile}>
            <div className="flex flex-col min-h-full py-8">
                <div 
                  className="flex flex-col lg:flex-row gap-8 items-center flex-grow mb-2 px-2"
                >
                   <div className="flex-1 w-full flex items-center justify-center">
                     <div className="relative z-20">
                       <div className="absolute inset-0 rounded-full bg-brand-accent/20 blur-xl scale-110" />
                       <div className="w-48 h-48 md:w-72 md:h-72 rounded-full border-2 border-brand-accent overflow-hidden relative z-10 shadow-2xl">
                          <img src={ASSETS.images.krystineBio} alt="Krystine" className="w-full h-full object-cover" />
                       </div>
                     </div>
                   </div>
                   <div className="flex-1 flex flex-col justify-center text-center lg:text-left space-y-6">
                      <div className="space-y-3">
                         <span className="text-brand-vata uppercase tracking-[0.4em] text-xs font-bold block mb-2">Votre Guide</span>
                         <h2 className="text-3xl md:text-5xl font-messiri text-brand-dark dark:text-brand-light mb-2 mt-8 md:mt-12 tracking-wider font-black uppercase">{CONTENT.bio.title[lang]}</h2>
                      </div>
                      
                      {/* Citation / Highlight avec El Messiri */}
                      <div className="relative py-8 bg-brand-accent/5 rounded-3xl px-8 border-l-4 border-brand-accent shadow-sm">
                         <span className="absolute -top-6 -left-2 text-7xl text-brand-accent/30 font-serif">"</span>
                         <p className={`text-2xl md:text-4xl font-messiri italic font-bold leading-relaxed ${isDark ? 'text-brand-accent' : 'text-brand-vata'}`}>
                           {CONTENT.bio.highlight[lang]}
                         </p>
                      </div>

                      {/* Bio Body Text - REMOVED ANIMATION */}
                      <div className="space-y-4">
                        {CONTENT.bio.description.map((para, idx) => (
                           <div key={idx} className="relative group mb-6">
                            <p className={`text-xl md:text-3xl lg:text-4xl font-messiri leading-relaxed transition-colors duration-500 font-medium ${isDark ? 'text-white/95' : 'text-brand-dark'}`}>
                              {para[lang]}
                            </p>
                            {idx === 0 && (
                              <div className="absolute -bottom-2 -right-4 pointer-events-none text-brand-accent z-20 opacity-20">
                                <Feather size={32} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                   </div>
                </div>
                <GlobalCTA lang={lang} className="!py-0 z-[60]" />
            </div>
          </ScrollContainer>
        </SlideLayout>
      )
    },
    {
      id: 'faq',
      render: (): React.ReactElement => (
        <SlideLayout>
          <ScrollContainer isMobile={isMobile}>
            <div className="flex flex-col min-h-full py-8">
              <div className="text-center mb-6 shrink-0 mt-20 md:mt-28">
                <h2 className="text-xl md:text-3xl lg:text-4xl font-messiri mb-6 text-brand-dark dark:text-brand-light tracking-tight font-normal">{CONTENT.faq.title[lang]}</h2>
              </div>
              <div className="flex flex-col md:flex-row gap-6 md:gap-12 w-full px-2">
                <div className="flex-1 pb-4">
                  <div className="space-y-4">
                    {CONTENT.faq.items.map((item, idx) => (
                      <div key={idx} className={`rounded-2xl border transition-all duration-300 overflow-hidden shadow-sm ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-brand-vata/20'}`}>
                        <button onClick={() => setOpenFAQ(openFAQ === idx ? null : idx)} className="w-full flex items-center justify-between p-6 md:p-8 text-left focus:outline-none"><span className={`text-2xl md:text-3xl font-bold font-messiri ${isDark ? 'text-brand-light' : 'text-brand-dark'}`}>{item.question[lang]}</span><div className={`shrink-0 ml-4 p-2 rounded-full ${isDark ? 'bg-white/10' : 'bg-brand-vata/10'} ${openFAQ === idx ? 'text-brand-accent' : (isDark ? 'text-gray-400' : 'text-brand-vata')}`}>{openFAQ === idx ? <Minus size={24} /> : <Plus size={24} />}</div></button>
                        <AnimatePresence>{openFAQ === idx && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: "easeInOut" }} className="overflow-hidden"><div className={`px-6 md:px-8 pb-8 text-xl md:text-2xl font-normal leading-relaxed border-t ${isDark ? 'text-gray-100 border-white/5' : 'text-slate-800 border-brand-vata/10'}`}>{item.answer[lang]}</div></motion.div>}</AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="md:w-[350px] lg:w-[450px] shrink-0"><div className={`group p-8 md:p-12 rounded-3xl border flex flex-col items-center text-center gap-6 justify-center sticky top-4 shadow-lg transition-all duration-500 ${isDark ? 'bg-gradient-to-b from-brand-dark/80 to-[#1e1c1a] border-brand-accent/30' : 'bg-brand-light border-brand-vata/30'}`}><h3 className={`text-3xl md:text-4xl font-messiri italic font-bold ${isDark ? 'text-brand-accent' : 'text-brand-vata'}`}>{CONTENT.faq.banner.title[lang]}</h3><div className="w-12 h-1 bg-brand-accent/50 rounded-full"></div><div className="flex flex-col gap-4 w-full"><Button variant="primary" size="lg" onClick={() => window.open(CONTENT.pricing.tiers[0].checkoutUrl, '_blank')} className="!bg-brand-vata text-white shadow-lg w-full text-lg md:text-xl py-6">{CONTENT.faq.banner.buttons.essential[lang]}</Button><Button variant="primary" size="lg" onClick={() => window.open(CONTENT.pricing.tiers[1].checkoutUrl, '_blank')} className="!bg-brand-accent text-brand-dark shadow-lg w-full text-lg md:text-xl py-6">{CONTENT.faq.banner.buttons.premium[lang]}</Button></div></div></div>
              </div>
            </div>
          </ScrollContainer>
        </SlideLayout>
      )
    },
    {
      id: 'discover',
      render: (): React.ReactElement => (
        <SlideLayout className="!bg-[#0D0B0A]">
          <ScrollContainer isMobile={isMobile}>
            <div className="flex flex-col min-h-full items-center pt-24">
              <div className="flex flex-col items-center text-center gap-12 max-w-4xl mx-auto mb-24 px-6 relative">
                <div className="flex items-center gap-2 h-16 w-48 justify-center mb-8">{[...Array(10)].map((_, i) => <motion.div key={i} className="w-2 bg-brand-accent/40 rounded-full" animate={{ height: ["30%", "100%", "30%"] }} transition={{ duration: 0.6 + Math.random(), repeat: Infinity, delay: i * 0.08 }} />)}</div>
                <div className="space-y-8">
                  <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-brand-accent uppercase tracking-[0.6em] text-xs font-black">{CONTENT.discoverMore.title[lang]}</motion.h2>
                  <div className="space-y-4">
                    <h3 className="text-2xl md:text-4xl lg:text-5xl font-messiri text-white tracking-tight leading-none drop-shadow-2xl mt-8 md:mt-12">
                      {CONTENT.discoverMore.items[0].title[lang]}
                    </h3>
                  </div>
                  <div className="pt-4"><p className="text-[#9A9A95] font-serif text-lg tracking-wide">par Krystine St-Laurent</p></div>
                </div>
                <div className="mt-8"><Button variant="outline" size="lg" onClick={() => window.open(CONTENT.discoverMore.items[0].url, '_blank')} className="!rounded-full border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059] hover:text-[#0D0B0A] px-14 py-7 transition-all duration-700 font-bold tracking-[0.25em] group shadow-[0_0_60px_rgba(197,160,89,0.15)] bg-transparent"><Mic size={24} className="group-hover:scale-110 transition-transform" /><span className="uppercase text-lg">{CONTENT.discoverMore.items[0].buttonText[lang]}</span><ArrowRight size={24} className="group-hover:translate-x-2 transition-transform" /></Button></div>
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none -z-10"><Mic size={400} /></div>
              </div>
              <div className="w-full mt-auto"><Footer lang={lang} /></div>
            </div>
          </ScrollContainer>
        </SlideLayout>
      )
    }
  ], [lang, isDark, introStep, openFAQ, isMobile]);

  return (
    <div className={`bundle-page h-[100dvh] w-full overflow-hidden bg-brand-light dark:bg-brand-dark transition-colors duration-700 font-sans selection:bg-brand-accent/30 ${isDark ? 'dark' : ''}`}>
      <BotanicalBackground /><FloatingParticles />
      <div className={`fixed inset-0 z-[60] bg-black transition-opacity duration-[1000ms] pointer-events-none ${introStep >= 2 ? 'opacity-0' : 'opacity-100'}`} />
      <img src={ASSETS.images.signature} alt="Intro Logo" className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 md:w-64 z-[70] transition-opacity duration-1000 pointer-events-none object-contain invert ${introStep === 1 ? 'opacity-100' : 'opacity-0'}`} />
      <nav className={`fixed top-0 w-full h-24 px-6 md:px-12 flex justify-between items-center z-50 transition-opacity duration-1000 ${introStep >= 3 ? 'opacity-100' : 'opacity-0'}`}>
        <a href="/" title="Retour à l'accueil Krystine St-Laurent" className="cursor-pointer block"><img src={ASSETS.images.signature} alt="Signature" className="h-16 w-auto object-contain transition-all hover:scale-105" style={{ filter: isDark ? 'brightness(0) invert(1)' : 'none' }} /></a>
        <div className={`flex gap-4 items-center px-6 py-3 rounded-full border shadow-lg ${isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white/90 border-slate-200 text-slate-900'}`}>
            <button onClick={() => setLang(l => l === 'fr' ? 'en' : 'fr')} className="text-sm font-bold tracking-widest hover:text-brand-vata">{lang}</button>
            <div className="w-px h-4 bg-current opacity-20" /><button onClick={() => setIsDark(!isDark)} className="hover:text-brand-vata transition-transform hover:scale-110">{isDark ? <Sun size={20} /> : <Moon size={20} />}</button>
        </div>
      </nav>
      <main className="h-full w-full"><AnimatePresence mode="wait"><motion.div key={currentSlide} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="h-full w-full">{slides[currentSlide].render()}</motion.div></AnimatePresence></main>
      <div className={`fixed bottom-0 w-full h-20 px-6 md:px-12 flex justify-between items-center z-[65] pointer-events-none transition-opacity duration-1000 ${introStep >= 3 ? 'opacity-100' : 'opacity-0'}`}>
        <div className={`flex gap-3 pointer-events-auto backdrop-blur-md px-4 py-2 rounded-full border ${isDark ? 'bg-black/20 border-white/5' : 'bg-white/50 border-slate-200'}`}>{slides.map((_, idx) => <button key={idx} onClick={() => setCurrentSlide(idx)} className={`h-2 transition-all duration-500 rounded-full ${currentSlide === idx ? 'w-8 bg-brand-accent' : 'w-2 bg-gray-400/50 hover:bg-brand-accent/70'}`} />)}</div>
        <div className="flex gap-4 pointer-events-auto"><button disabled={currentSlide === 0} onClick={() => setCurrentSlide(c => c - 1)} className={`w-12 h-12 rounded-full border flex items-center justify-center hover:bg-white/10 disabled:opacity-0 transition-all ${isDark ? 'border-white/10 text-white' : 'border-brand-dark/10 text-brand-dark bg-white'}`}><ArrowRight className="rotate-180" size={20} /></button>{currentSlide < slides.length - 1 ? <button onClick={() => setCurrentSlide(c => c + 1)} className="w-12 h-12 rounded-full bg-brand-accent text-brand-dark flex items-center justify-center hover:scale-105 transition-transform shadow-lg"><ArrowRight size={20} /></button> : <button onClick={() => setCurrentSlide(0)} className="w-12 h-12 rounded-full bg-brand-vata text-white flex items-center justify-center hover:bg-brand-vata/80 shadow-lg transition-transform hover:scale-105"><RotateCcw size={20} /></button>}</div>
      </div>
    </div>
  );
};
export default App;
