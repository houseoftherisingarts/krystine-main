
import React from 'react';
import { motion } from 'framer-motion';
import { ContentData } from '../../../types';

// Embedded Symbols for the timeline
const SymbolRoots: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M50 25 L50 45" />
    <path d="M50 45 Q50 65 50 85" />
    <path d="M50 45 Q30 55 25 75" />
    <path d="M50 45 Q70 55 75 75" />
    <path d="M38 60 Q30 65 30 75" />
    <path d="M62 60 Q70 65 70 75" />
    <path d="M20 40 L80 40" strokeWidth="0.5" opacity="0.5" />
  </svg>
);

const SymbolFlame: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M50 85 C65 75 75 60 75 45 C75 25 50 10 50 10 C50 10 25 25 25 45 C25 60 35 75 50 85 Z" />
    <path d="M50 85 C55 75 60 65 60 55 C60 45 50 35 50 35 C50 35 40 45 40 55 C40 65 45 75 50 85 Z" />
  </svg>
);

const SymbolEye: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 50 Q50 15 85 50 Q50 85 15 50 Z" />
    <circle cx="50" cy="50" r="14" />
    <circle cx="50" cy="50" r="4" fill="currentColor" />
    <path d="M50 25 L50 32" opacity="0.5" />
    <path d="M50 68 L50 75" opacity="0.5" />
  </svg>
);

const PillarIcon = ({ index, className }: { index: number; className?: string }) => {
  if (index === 0) return <SymbolEye className={className} />;
  if (index === 1) return <SymbolFlame className={className} />;
  return <SymbolRoots className={className} />;
};

export const CurriculumTimeline: React.FC<{ content: any }> = ({ content }) => {
  return (
    <div className="relative max-w-6xl mx-auto py-24 px-6">
      {/* Header */}
      <div className="text-center mb-24">
        <h2 className="text-5xl md:text-7xl font-serif text-ink-sureau dark:text-paper mb-6 tracking-tight text-balance">
          {content.title}
        </h2>
        <div className="w-24 h-px bg-[#C8943E] mx-auto mb-8"></div>
        <p className="text-2xl md:text-3xl font-serif italic text-[#9E7B5A] dark:text-copper-light max-w-4xl mx-auto leading-tight mb-6">
          {content.subtitle}
        </p>
        <div className="mt-12 mb-8 py-8 px-6 border-y border-[#C8943E]/30 bg-[#C8943E]/5 rounded-3xl max-w-4xl mx-auto relative">
          <p className="text-2xl md:text-3xl font-serif text-[#BF5700] dark:text-copper-light leading-relaxed text-balance">
            « Jamais il n'y a eu autant d'informations, et jamais autant de dispersion. <br className="hidden md:block" />
            <span className="font-bold">L'exigence actuelle est de retrouver des repères intérieurs fiables.</span> »
          </p>
        </div>
        {content.extraSubtitle && (
          <p className="text-xl font-normal text-ink-sureau/80 dark:text-paper/80 max-w-3xl mx-auto leading-relaxed">
            {content.extraSubtitle}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {content.pillars.map((pillar: any, idx: number) => (
          <motion.div 
            key={idx} 
            whileHover={{ 
              scale: 1.03, 
              y: -8,
              boxShadow: "0 25px 50px -12px rgba(200, 148, 62, 0.25)",
              borderColor: "rgba(200, 148, 62, 0.5)"
            }}
            className="relative glass-panel p-8 md:p-10 lg:p-12 pt-16 md:pt-20 rounded-[2.5rem] flex flex-col items-center text-center border border-white/40 dark:border-white/10 transition-all duration-500 md:last:col-span-2 lg:last:col-span-1"
          >
            {/* Icon positioned as a pin */}
            <div className={`
                absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2
                w-20 h-20 rounded-full flex items-center justify-center
                ${idx === 0 ? 'bg-[#5D4B35] text-paper-light' : 
                  idx === 1 ? 'bg-[#9A6B49] text-paper-light' : 
                  'bg-[#4A5D52] text-paper-light'}
                shadow-lg border-4 border-paper dark:border-ink-forest z-10
              `}>
                <PillarIcon index={idx} className="w-10 h-10" />
            </div>

            {/* Pillar Title - Level 1 */}
            <h3 className="text-2xl font-serif text-ink-sureau dark:text-paper mb-1">{pillar.title}</h3>
            
            {/* Pillar Subtitle - Level 2 */}
            {pillar.subtitle && (
              <p className="text-2xl font-serif font-bold text-ink-sureau dark:text-paper mb-3 leading-tight">
                {pillar.subtitle}
              </p>
            )}
            
            {/* Range - Level 3 */}
            <span className="text-[#C4962C] font-bold text-sm uppercase tracking-[0.2em] mb-6 block border-b border-[#C4962C]/20 pb-1">
              {pillar.range}
            </span>

            {/* Description - Level 4 */}
            <p 
              className="text-lg text-ink-sureau/70 dark:text-paper/70 font-light leading-relaxed"
              dangerouslySetInnerHTML={{ 
                __html: pillar.description.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-ink-sureau dark:text-paper">$1</strong>') 
              }}
            />
          </motion.div>
        ))}
      </div>

      <div className="mt-16 text-center">
        <p className="font-script text-[clamp(2rem,4vw,3rem)] text-copper-bruni dark:text-copper-light text-balance whitespace-normal">
          Le corps sait. Il manquait la carte pour le lire.
        </p>
      </div>

      {content.footerText && (
        <div className="mt-20 text-center px-4 w-full overflow-hidden">
          <p className="text-2xl md:text-3xl font-serif italic text-ink-sureau/80 dark:text-paper/80 max-w-4xl mx-auto leading-relaxed break-words whitespace-normal">
            {content.footerText}
          </p>
        </div>
      )}
    </div>
  );
};