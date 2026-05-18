
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote, Feather } from 'lucide-react';
import { Language } from '../types';
import { CONTENT } from '../constants';

interface TestimonialsSectionProps {
  lang: Language;
  isDark: boolean;
}

const TypewriterWithFeather: React.FC<{ text: string; isHovered: boolean; isDark: boolean }> = ({ text, isHovered, isDark }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!isHovered) {
      setDisplayedText("");
      setCurrentIndex(0);
      return;
    }

    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, 15); // Vitesse d'écriture
      return () => clearTimeout(timeout);
    }
  }, [isHovered, currentIndex, text]);

  // Calcul d'une position approximative pour la plume (très simplifié)
  // Comme le texte est fluide, on va juste faire osciller la plume en bas à droite du texte affiché
  return (
    <div className="relative min-h-[120px] md:min-h-[160px]">
      <p className={`
        text-lg md:text-xl font-messiri leading-relaxed flex-grow mb-10 font-medium transition-colors duration-500
        ${isDark ? 'text-gray-100' : 'text-slate-800'}
      `}>
        {isHovered ? `"${displayedText}"` : `"${text}"`}
      </p>
      
      <AnimatePresence>
        {isHovered && currentIndex < text.length && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute pointer-events-none text-brand-accent z-20"
            style={{
              // On place la plume de manière dynamique ou fixe à la fin du bloc pour l'effet visuel
              bottom: "0px",
              right: "0px"
            }}
          >
            <motion.div
              animate={{ 
                rotate: [20, 40, 20],
                x: [0, 5, 0],
                y: [0, -3, 0]
              }}
              transition={{ 
                duration: 0.4, 
                repeat: Infinity,
                ease: "easeInOut" 
              }}
            >
              <Feather size={32} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const TestimonialsSection: React.FC<TestimonialsSectionProps> = ({ lang, isDark }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const testimonials = CONTENT.testimonials.items;

  return (
    <div className="flex flex-col min-h-full py-8 md:py-16">
      {/* Header - Titre augmenté de 20% */}
      <div className="text-center mb-12 md:mb-24 shrink-0 px-4 mt-12 md:mt-20">
        <h2 className="text-3xl md:text-5xl lg:text-6xl font-messiri mb-8 text-brand-dark dark:text-brand-light tracking-tight font-black uppercase">
          {CONTENT.testimonials.title[lang]}
        </h2>
        <p className="text-xl md:text-3xl text-brand-vata dark:text-brand-accent max-w-4xl mx-auto font-serif italic">
          {CONTENT.testimonials.subtitle[lang]}
        </p>
      </div>

      {/* Testimonials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 max-w-[90rem] mx-auto items-stretch px-6">
        {testimonials.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.15, duration: 0.8, ease: "easeOut" }}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
            className={`
              group relative p-10 md:p-12 rounded-[40px] border flex flex-col transition-all duration-700
              md:hover:scale-[1.03] md:hover:shadow-[0_30px_100px_rgba(197,160,89,0.2)]
              ${isDark ? 'bg-white/5 border-white/10 shadow-2xl' : 'bg-white border-brand-vata/10 shadow-xl'}
            `}
          >
            {/* Elegant Quote Icon */}
            <div className="mb-8 text-brand-accent/30 group-hover:text-brand-accent/60 transition-all duration-500">
              <Quote size={64} strokeWidth={1} className="transform -scale-x-100" />
            </div>

            {/* Testimonial Text with Typewriter Effect on Hover */}
            <TypewriterWithFeather 
              text={item.quote[lang]} 
              isHovered={hoveredIdx === idx} 
              isDark={isDark} 
            />

            {/* Footer / Author Info */}
            <div className="mt-auto pt-8 border-t border-brand-accent/15">
              <h4 className={`text-2xl font-bold font-messiri tracking-wide mb-2 ${isDark ? 'text-brand-accent' : 'text-brand-vata'}`}>
                {item.author}
              </h4>
              <p className={`text-sm md:text-base uppercase tracking-[0.25em] font-bold opacity-60 leading-tight ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
                {item.role[lang]}
              </p>
            </div>

            {/* Subtle decorative element */}
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-brand-accent/5 blur-[80px] rounded-full -mr-24 -mb-24 pointer-events-none group-hover:bg-brand-accent/15 transition-colors duration-1000" />
          </motion.div>
        ))}
      </div>
    </div>
  );
};
