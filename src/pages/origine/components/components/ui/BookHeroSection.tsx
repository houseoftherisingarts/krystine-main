import React from 'react';
import { motion } from 'framer-motion';
import Signature from './Signature';

interface BookHeroSectionProps {
  imageUrl: string;
  text: string;
}

export const BookHeroSection: React.FC<BookHeroSectionProps> = ({ imageUrl, text }) => {
  return (
    <section className="py-24 lg:py-32 px-6 bg-[#F5F1EA] dark:bg-ink-forest relative overflow-hidden">
      {/* Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.08] pointer-events-none mix-blend-multiply dark:mix-blend-overlay" 
           style={{ 
             backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.5'/%3E%3C/svg%3E")`,
             backgroundSize: '150px'
           }}>
      </div>

      {/* Decorative Blurs */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-copper-honey/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-copper-bruni/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center relative z-10">
        {/* Text Content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-8 text-center lg:text-left"
        >
          <div className="space-y-4">
            <span className="text-base font-bold tracking-[0.3em] text-copper-honey uppercase block">
              L'Œuvre Fondatrice
            </span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif text-ink-sureau dark:text-paper leading-tight">
              La Trilogie d'Origine
            </h2>
            <div className="w-16 h-px bg-copper-honey/60 mx-auto lg:mx-0"></div>
          </div>
          
          <p className="text-xl text-ink-sureau/80 dark:text-paper/80 leading-relaxed font-light max-w-xl mx-auto lg:mx-0">
            {text}
          </p>

          <Signature />
        </motion.div>

        {/* Image Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="relative group"
        >
          {/* Decorative frame/shadow */}
          <div className="absolute -inset-4 bg-white/30 dark:bg-white/5 rounded-[2rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          
          <div className="relative bg-white/40 dark:bg-white/5 backdrop-blur-sm p-4 md:p-8 rounded-[2rem] border border-white/40 dark:border-white/10 shadow-2xl overflow-hidden">
            <img
              src={imageUrl}
              alt="Trilogie Origine"
              loading="lazy"
              decoding="async"
              className="w-full h-auto object-contain object-center max-h-[600px] drop-shadow-xl transform group-hover:scale-[1.02] transition-transform duration-700"
              referrerPolicy="no-referrer"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};