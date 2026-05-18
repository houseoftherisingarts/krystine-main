import React from 'react';
import { motion } from 'framer-motion';
import { Feather } from 'lucide-react';
import { Language, ContentData } from '../../../types';
import { SacredGeometry, BotanicalLeaf } from './Botanicals';
import { Compass } from './Compass';
import { LogoO } from './LogoO';
import { CalligraphySequence } from './CalligraphySequence';
import { AudioSample } from './AudioSample';
import { ParallaxStrip } from './ParallaxStrip';

interface HeroSectionProps {
  lang: Language;
  t: ContentData;
  handleAudioSamplePlay: (isPlaying: boolean) => void;
  isMobile: boolean;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ lang, t, handleAudioSamplePlay, isMobile }) => {
  if (isMobile) {
    return (
      <main className="relative z-0 flex flex-col justify-start pt-32 pb-12 overflow-x-hidden bg-[#FDFBF5] dark:bg-ink-sureau w-full min-h-[90vh]">
        <audio id="bg-audio" src="https://storage.googleapis.com/inspirata/Base%20site/Origine%20OST" loop />
        
        <div className="w-full relative px-6 md:px-12 flex flex-col-reverse items-center justify-center max-md:gap-12 md:grid md:grid-cols-2 md:items-center md:gap-8">
          
          {/* Title Section */}
          <div className="relative z-20 w-full md:col-span-1 max-md:text-center">
            <h1 className="font-serif text-ink-sureau dark:text-paper leading-none">
              <span className="sr-only">Expérience Origine — Revenir à ce que le corps sait déjà</span>
              <span className="block uppercase text-sm tracking-[0.4em] mb-4 ml-1 font-light text-ink-sureau/60 dark:text-paper/60" aria-hidden="true">
                Expérience
              </span>
              <span className="flex items-center justify-center md:justify-start tracking-tighter -ml-2 text-[15vw] md:text-[9vw]" aria-hidden="true">
                <span className="inline-flex items-center justify-center w-[0.9em] h-[0.9em] mr-[0.02em]">
                  <LogoO className="w-full h-full text-copper-bruni" />
                </span>
                <span className="text-copper-bruni dark:text-copper-light">rigine</span>
              </span>
            </h1>
            <div className="mt-6 ml-1 max-md:ml-0">
              <motion.span 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="inline-block font-serif text-sm text-copper-bruni/80 tracking-widest uppercase"
              >
                Par Krystine St-Laurent
              </motion.span>
            </div>
          </div>

          {/* Compass/Geometry Section */}
          <div className="relative z-10 aspect-square opacity-90 w-[60vw] md:w-[42vw] md:justify-self-center">
            <motion.div
              className="absolute top-1/2 left-1/2 w-[140%] h-[140%] text-copper-bruni"
              style={{ x: "-50%", y: "-50%" }}
              animate={{ rotate: [0, 360], scale: [0.9, 1.1, 0.9], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
            >
              <SacredGeometry className="w-full h-full !opacity-100" />
            </motion.div>
            <Compass />
          </div>

        </div>

        <div className="w-full max-w-4xl mx-auto mt-16 px-4 relative z-20">
          <AudioSample content={t.audio} onPlayStateChange={handleAudioSamplePlay} />
          <p className="font-script text-[clamp(2rem,4vw,3rem)] text-copper-bruni dark:text-copper-light text-center text-balance whitespace-normal mt-8 opacity-90">
            Le corps ne ment jamais.<br />Mais il chuchote longtemps avant de crier.
          </p>
        </div>

        {/* C'est ICI la bonne place pour le premier Parallax (Entre l'audio et les citations) */}
        <div className="w-full relative z-0 my-10 border-y border-copper-bruni/20">
           <ParallaxStrip 
             imageUrl="https://storage.googleapis.com/origine1/banner%20origine%20enveloppe.jpg" 
             altText="parcours ayurveda en ligne Expérience Origine boussole" 
             alignment="bg-[85%_center] md:bg-[92%_center]"
           />
        </div>

        <div className="w-full relative z-10 bg-[#FDFBF5] dark:bg-ink-sureau pt-16 pb-12 rounded-t-[3rem] shadow-[0_-10px_50px_rgba(0,0,0,0.05)]">
          <div className="relative w-full max-w-6xl mx-auto flex flex-col items-center space-y-12">
            <div className="w-full">
              <div className="relative flex flex-col items-center text-center mb-20 space-y-6 px-4">
                <BotanicalLeaf className="absolute -top-12 -left-4 w-24 h-24 text-copper-bruni/10 dark:text-copper-light/10 rotate-[-45deg]" />
                <BotanicalLeaf className="absolute -bottom-12 -right-4 w-24 h-24 text-copper-bruni/10 dark:text-copper-light/10 rotate-[135deg]" />
                
                <div className="space-y-2 relative z-10">
                  <p className="font-serif uppercase tracking-[0.05em] font-bold text-sm text-copper-bruni/80 dark:text-copper-light/80">
                    Jamais il n'y a eu autant d'informations,
                  </p>
                  <p className="font-serif uppercase tracking-[0.05em] font-bold text-sm text-copper-bruni/80 dark:text-copper-light/80">
                    et jamais autant de dispersion.
                  </p>
                </div>
                
                <div className="w-12 h-px bg-copper-bruni/30 dark:bg-copper-light/30 relative z-10"></div>
                
                <div className="space-y-2 relative z-10">
                  <p className="font-serif uppercase tracking-[0.05em] font-bold text-lg text-copper-bruni dark:text-copper-light">
                    Nous avons besoin de revenir à
                  </p>
                  <h2 className="font-serif uppercase tracking-[0.1em] font-bold text-2xl text-copper-bruni dark:text-copper-light">
                    NOS REPÈRES INTÉRIEURS
                  </h2>
                </div>
              </div>
              <div className="flex flex-col gap-1 w-full">
                {[{
                  text: "« Je fais tout bien et je suis épuisée quand même. »",
                  author: "Isabelle"
                }, {
                  text: "« Je ne sais plus ce qui est vraiment moi. »",
                  author: "Nathalie"
                }, {
                  text: "« Je suis fatiguée de tenir et de faire comme si tout allait bien. »",
                  author: "Sophie"
                }, {
                  text: "« Mon corps chuchote depuis trop longtemps et j'en fais fi. »",
                  author: "Catherine"
                }, {
                  text: "« J'ai fait 2 carrières en 13 ans et je n'ai plus de jus. »",
                  author: "Diane"
                }].map((quote, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-10%" }}
                    transition={{ delay: 0.1, duration: 0.6 }}
                    className={`relative p-6 md:p-8 shadow-sm cursor-default bg-[#4A5D52] text-[#FDFBF5] w-full border-b border-[#FDFBF5]/10 last:border-0`}>
                    <div className="flex flex-col gap-2 max-w-lg mx-auto">
                      {/* CORRECTION : Texte des citations ajusté pour le mobile */}
                      <p className="font-serif text-[1.35rem] leading-snug italic opacity-95 text-center">
                        {quote.text}
                      </p>
                      <p className="font-sans text-xs tracking-widest uppercase opacity-70 mt-2 text-center">
                        — {quote.author}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            
            <div className="text-center w-full mt-16 px-2">
              <div className="font-serif text-xl text-copper-bruni dark:text-copper-light leading-snug drop-shadow-sm flex flex-col gap-2 items-center">
                <CalligraphySequence
                  isMobile={isMobile}
                  delay={0.2}
                  lines={[{
                    text: "Vous n'avez pas besoin de plus d'information.",
                    className: "font-serif uppercase tracking-[0.05em] font-bold text-lg text-balance whitespace-normal"
                  }, {
                    text: "Vous avez besoin de revenir à",
                    className: "font-serif uppercase tracking-[0.05em] font-bold mt-2 text-lg text-balance whitespace-normal"
                  }, {
                    text: "Votre point d'origine.",
                    className: "font-script text-[clamp(2rem,4vw,3rem)] text-copper-bruni dark:text-copper-light text-center text-balance whitespace-normal mt-4"
                  }]}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Version BUREAU (Desktop)
  return (
    <>
      <main className="relative z-0 min-h-screen flex flex-col justify-center pt-24 lg:pt-32 pb-12 lg:pb-20 overflow-x-hidden bg-[#FDFBF5] dark:bg-ink-sureau w-full">
        <audio id="bg-audio" src="https://storage.googleapis.com/inspirata/Base%20site/Origine%20OST" loop />
        
        <div className="max-w-[90rem] mx-auto w-full flex flex-col gap-12 lg:gap-24 px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-y-12 gap-x-8 items-center">
            <div className="col-span-1 md:col-span-7 relative z-10 text-center md:text-left">
              <div className="inline-block">
                <h1 className="font-serif text-ink-sureau dark:text-paper text-left leading-none">
                  <span className="sr-only">Expérience Origine — Revenir à ce que le corps sait déjà</span>
                  <span className="block uppercase text-[clamp(1.5rem,4vw,2.5rem)] tracking-[0.4em] mb-4 lg:mb-8 ml-1 font-light text-ink-sureau/80 dark:text-paper/80" aria-hidden="true">
                    Expérience
                  </span>
                  <span className="flex items-center justify-center md:justify-start text-5xl lg:text-[11rem] tracking-tighter" aria-hidden="true">
                    <span className="inline-flex items-center justify-center w-[0.9em] h-[0.9em] mr-[0.02em]">
                       <LogoO className="w-full h-full text-copper-bruni" />
                    </span>
                    <span className="text-copper-bruni dark:text-copper-light">rigine</span>
                  </span>
                </h1>
                <div className="text-right mt-4 mr-2">
                  <motion.span whileHover={{ x: 5 }} className="inline-block font-serif text-base md:text-xl text-copper-bruni/90 tracking-wide cursor-default transition-colors hover:text-copper-bruni">
                    Par Krystine St-Laurent
                  </motion.span>
                </div>
              </div>
            </div>

            <div className="col-span-1 md:col-span-5 relative flex justify-center items-center pointer-events-none">
              <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-[90%] lg:max-w-[110%] aspect-square mx-auto lg:mx-0 lg:-ml-[5%]">
                 <motion.div
                   className="absolute top-1/2 left-1/2 w-[160%] h-[160%] text-copper-bruni"
                   style={{ x: "-50%", y: "-50%" }}
                   animate={{ rotate: [0, 360], scale: [0.6, 1.4, 0.6], opacity: [0.3, 0.6, 0.3] }}
                   transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                 >
                    <SacredGeometry className="w-full h-full !opacity-100" />
                 </motion.div>
                 <Compass />
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-4xl mx-auto mt-12 lg:mt-20 px-6 sticky top-24 z-0 mb-12">
          <AudioSample content={t.audio} onPlayStateChange={handleAudioSamplePlay} />
          <p className="font-script text-[clamp(2rem,4vw,3rem)] text-copper-bruni dark:text-copper-light text-center text-balance whitespace-normal mt-10 opacity-90">
            Le corps ne ment jamais.<br />Mais il chuchote longtemps avant de crier.
          </p>
        </div>

        {/* Premier Parallax - Version Bureau */}
        <div className="w-full relative z-0 border-y border-copper-bruni/20">
           <ParallaxStrip 
             imageUrl="https://storage.googleapis.com/origine1/banner%20origine%20enveloppe.jpg" 
             altText="parcours ayurveda en ligne Expérience Origine boussole" 
             alignment="bg-[85%_center]"
           />
        </div>

        <div className="w-full relative z-10 mt-12 bg-[#FDFBF5] dark:bg-ink-sureau pt-24 pb-12 rounded-t-[3rem] shadow-[0_-10px_50px_rgba(0,0,0,0.05)]">
           <div className="relative w-full max-w-6xl mx-auto flex flex-col items-center space-y-12">
              <div className="w-full px-4 md:px-0">
                <div className="relative flex flex-col items-center text-center mb-24 space-y-8 px-6">
                  <BotanicalLeaf className="absolute -top-16 -left-12 w-32 h-32 text-copper-bruni/10 dark:text-copper-light/10 rotate-[-45deg]" />
                  <BotanicalLeaf className="absolute -bottom-16 -right-12 w-32 h-32 text-copper-bruni/10 dark:text-copper-light/10 rotate-[135deg]" />
                  
                  <div className="space-y-3 relative z-10">
                    <p className="font-serif uppercase tracking-[0.1em] font-bold text-xl text-copper-bruni/80 dark:text-copper-light/80">
                      Jamais il n'y a eu autant d'informations,
                    </p>
                    <p className="font-serif uppercase tracking-[0.1em] font-bold text-xl text-copper-bruni/80 dark:text-copper-light/80">
                      et jamais autant de dispersion.
                    </p>
                  </div>
                  
                  <div className="w-24 h-px bg-copper-bruni/30 dark:bg-copper-light/30 relative z-10"></div>
                  
                  <div className="space-y-4 relative z-10">
                    <p className="font-serif uppercase tracking-[0.1em] font-bold text-2xl text-copper-bruni dark:text-copper-light">
                      Nous avons besoin de revenir à
                    </p>
                    <h2 className="font-serif uppercase tracking-[0.15em] font-bold text-4xl text-copper-bruni dark:text-copper-light">
                      NOS REPÈRES INTÉRIEURS
                    </h2>
                  </div>
                </div>
                <div className="flex flex-col w-full">
                   {[
                     { text: "« Je fais tout bien et je suis épuisée quand même. »", author: "Isabelle" },
                     { text: "« Je ne sais plus ce qui est vraiment moi. »", author: "Nathalie" },
                     { text: "« Je suis fatiguée de tenir et de faire comme si tout allait bien. »", author: "Sophie" },
                     { text: "« Mon corps chuchote depuis trop longtemps et j'en fais fi. »", author: "Catherine" },
                     { text: "« J'ai fait 2 carrières en 13 ans et je n'ai plus de jus. »", author: "Diane" }
                   ].map((quote, idx) => (
                     <motion.div 
                       key={idx}
                       initial={{ opacity: 0, x: idx % 2 === 0 ? -50 : 50 }}
                       whileInView={{ opacity: 1, x: 0 }}
                       viewport={{ once: true, margin: "-10%" }}
                       transition={{ delay: 0.1, duration: 0.6, ease: "easeOut" }}
                       whileHover={{ backgroundColor: "#3E4F45" }}
                       className={`relative p-8 md:p-12 cursor-default group bg-[#4A5D52] text-[#FDFBF5] w-full border-b border-[#FDFBF5]/10 last:border-0 transition-colors duration-300`}
                     >
                       <div className={`flex items-center gap-8 max-w-5xl mx-auto ${idx % 2 === 0 ? 'flex-row' : 'flex-row-reverse text-right'}`}>
                         <div className="hidden md:flex items-center justify-center w-16 h-16 rounded-full bg-[#FDFBF5]/10 shrink-0 group-hover:scale-110 transition-transform duration-300">
                            <LogoO className="w-8 h-8 text-white" />
                         </div>
                         <div className="flex-1">
                           <p className="font-serif text-3xl md:text-4xl leading-relaxed italic opacity-95">
                             {quote.text}
                           </p>
                           <p className="mt-4 font-sans text-base tracking-widest uppercase opacity-70">
                             — {quote.author}
                           </p>
                         </div>
                       </div>
                     </motion.div>
                   ))}
                </div>
              </div>

              <div className="cursor-default text-center w-full min-h-[120px] mt-20">
                <div className="font-serif text-2xl md:text-3xl lg:text-4xl text-copper-bruni dark:text-copper-light leading-snug drop-shadow-sm flex flex-col gap-2 items-center">
                   <CalligraphySequence 
                     delay={0.5}
                     lines={[
                       { text: "Vous n'avez pas besoin de plus d'information.", className: "font-serif uppercase tracking-[0.1em] font-bold text-xl md:text-3xl text-balance whitespace-normal" },
                       { text: "Vous avez besoin de revenir à", className: "font-serif uppercase tracking-[0.1em] font-bold mt-2 text-xl md:text-3xl text-balance whitespace-normal" },
                       { text: "Votre point d'origine.", className: "font-script text-[clamp(2rem,4vw,3rem)] text-copper-bruni dark:text-copper-light text-center text-balance whitespace-normal mt-4" }
                     ]}
                   />
                </div>
              </div>
            </div>
        </div>
      </main>
    </>
  );
};