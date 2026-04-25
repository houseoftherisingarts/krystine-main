import React from 'react';
import { ContentText } from '../../types';

// Embedded Symbols for the timeline
const SymbolRoots: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M50 25 L50 45" />
    <path d="M50 45 Q50 65 50 85" />
    <path d="M50 45 Q30 55 25 75" />
    <path d="M50 45 Q70 55 75 75" />
    <path d="M38 60 Q30 65 30 75" />
    <path d="M62 60 Q70 65 70 75" />
    {/* Horizon line for rooting */}
    <path d="M20 40 L80 40" strokeWidth="0.5" opacity="0.5" />
  </svg>
);

// Alchemical Symbol for Copper (Venus)
const SymbolAlchemy: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {/* Circle */}
    <circle cx="50" cy="38" r="18" />
    {/* Cross */}
    <path d="M50 56 L50 82" />
    <path d="M36 72 L64 72" />
  </svg>
);

const SymbolEye: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 50 Q50 15 85 50 Q50 85 15 50 Z" />
    <circle cx="50" cy="50" r="14" />
    <circle cx="50" cy="50" r="4" fill="currentColor" />
    {/* Vertical pupil/alignment line */}
    <path d="M50 25 L50 32" opacity="0.5" />
    <path d="M50 68 L50 75" opacity="0.5" />
  </svg>
);

export const CurriculumTimeline: React.FC<{ content: ContentText['timeline'] }> = ({ content }) => {
  return (
    <div className="relative max-w-5xl mx-auto py-20 px-4">
      {/* Header */}
      <div className="text-center mb-24">
        <h2 className="text-4xl md:text-5xl font-serif text-ink-sureau dark:text-paper mb-6">
          {content.title}
        </h2>
        <p className="text-lg text-ink-sureau/60 dark:text-paper/60 max-w-2xl mx-auto leading-relaxed">
          {content.intro}
        </p>
      </div>

      {/* The Timeline Wire - Central on Desktop, Left on Mobile */}
      <div className="absolute left-8 md:left-1/2 top-48 bottom-20 w-px bg-gradient-to-b from-transparent via-copper-bruni/50 to-transparent -translate-x-1/2"></div>

      <div className="space-y-16">
        {content.steps.map((step, idx) => {
          const isEven = idx % 2 === 0;
          
          // Specific colors for each module (Earth/Brown, Fire/Copper, Ether/Sage)
          let circleColorClass = "";
          if (idx === 0) circleColorClass = "bg-[#5D4B35] border-[#5D4B35] text-white shadow-lg shadow-[#5D4B35]/20";
          else if (idx === 1) circleColorClass = "bg-[#B86A2F] border-[#B86A2F] text-white shadow-lg shadow-[#B86A2F]/20";
          else circleColorClass = "bg-[#7A8D7C] border-[#7A8D7C] text-white shadow-lg shadow-[#7A8D7C]/20";

          return (
            <div 
              key={idx} 
              className={`relative flex flex-col md:flex-row items-center ${isEven ? 'md:flex-row-reverse' : ''} group transition-transform duration-500 hover:-translate-y-1`}
            >
              
              {/* Content Side */}
              {/* Mobile: pl-16 (64px) -> Circle is width 16 (64px), centered at 8 (32px). Circle ends at 64px. Box touches circle. */}
              {/* Desktop: Inner padding 8 (32px) -> Circle radius 32px. Box touches circle. */}
              <div className={`
                w-full md:w-1/2 
                pl-16 md:pl-0 
                ${isEven ? 'md:pl-8 md:pr-12' : 'md:pr-8 md:pl-12'}
              `}>
                <div className={`
                  p-8 rounded-[2rem] bg-white/40 dark:bg-black/20 border border-white/40 dark:border-white/5 
                  group-hover:border-copper-bruni/30 transition-colors duration-500
                  backdrop-blur-sm shadow-sm group-hover:shadow-xl
                  ${isEven ? 'md:text-left' : 'md:text-right'}
                `}>
                  <div className={`
                    text-xs font-bold tracking-widest text-copper-bruni uppercase mb-2
                    flex items-center gap-2
                    ${isEven ? 'md:justify-start' : 'md:justify-end'}
                  `}>
                    {step.duration}
                  </div>
                  <h3 className="text-3xl font-serif text-ink-sureau dark:text-paper mb-3">
                    {step.title}
                  </h3>
                  <p className="font-medium text-lg text-ink-sureau/80 dark:text-paper/80 mb-4 italic">
                    {step.desc}
                  </p>
                  <p className="text-sm leading-relaxed text-ink-sureau/60 dark:text-paper/60">
                    {step.details}
                  </p>
                </div>
              </div>

              {/* Center Node */}
              {/* Vertically centered relative to the group */}
              <div className={`
                absolute left-8 md:left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                w-16 h-16 rounded-full border-2 flex items-center justify-center z-20 
                transition-transform duration-500 group-hover:scale-110
                ${circleColorClass}
              `}>
                 <div className="w-8 h-8">
                   {idx === 0 && <SymbolRoots className="w-full h-full" />}
                   {idx === 1 && <SymbolAlchemy className="w-full h-full" />}
                   {idx === 2 && <SymbolEye className="w-full h-full" />}
                 </div>
              </div>
              
              {/* Empty Side for spacing on desktop */}
              <div className="md:w-1/2 hidden md:block"></div>

            </div>
          );
        })}
      </div>
    </div>
  );
};