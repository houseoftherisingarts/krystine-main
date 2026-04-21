import React from 'react';
import { ContentText } from '../../types';
import { Download, BookOpen } from 'lucide-react';

export const GrimoireShowcase: React.FC<{ content: ContentText['grimoire'] }> = ({ content }) => {
  return (
    <div className="py-24 px-4 bg-paper-dark/5 dark:bg-black/20 overflow-hidden relative">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-16">
        
        {/* The Text */}
        <div className="lg:w-1/2 space-y-8 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-copper-bruni/30 text-copper-bruni text-xs uppercase tracking-widest">
            <BookOpen size={12} />
            Workbook
          </div>
          <h2 className="text-4xl md:text-5xl font-serif text-ink-sureau dark:text-paper">
            {content.title}
          </h2>
          <p className="text-xl text-ink-sureau/70 dark:text-paper/70 font-light italic">
            {content.subtitle}
          </p>
          
          <ul className="space-y-4 pt-4">
            {content.features.map((feature, i) => (
              <li key={i} className="flex items-center gap-3 text-ink-sureau/80 dark:text-paper/80">
                <div className="w-1.5 h-1.5 rounded-full bg-copper-bruni"></div>
                {feature}
              </li>
            ))}
          </ul>

          <div className="pt-6">
             <div className="inline-flex items-center gap-3 text-copper-bruni font-medium text-sm">
               <Download size={16} />
               {content.downloadText}
             </div>
          </div>
        </div>

        {/* The Artifact (Visual) */}
        <div className="lg:w-1/2 relative perspective-1000">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-copper-bruni/10 blur-[60px] rounded-full scale-75"></div>
          
          <div className="relative w-full aspect-[3/4] max-w-md mx-auto bg-[#F7F5F0] dark:bg-[#1e1e1e] rounded-l-md rounded-r-2xl shadow-2xl border-l-8 border-copper-bruni transform rotate-y-12 rotate-3 hover:rotate-0 transition-all duration-700 flex flex-col overflow-hidden">
             {/* Book Texture Overlay */}
             <div className="absolute inset-0 bg-noise opacity-[0.05] pointer-events-none"></div>
             
             {/* Cover Design */}
             <div className="flex-1 p-8 md:p-12 flex flex-col justify-between border-r border-black/5">
                <div className="border border-copper-bruni/20 h-full p-6 flex flex-col items-center justify-center text-center relative">
                   <div className="absolute inset-0 border border-copper-bruni/10 m-1"></div>
                   <span className="text-copper-bruni text-xs tracking-[0.3em] uppercase mb-4">Inspirata</span>
                   <h3 className="font-serif text-4xl text-ink-sureau dark:text-copper-light mb-2">Grimoire</h3>
                   <span className="font-serif italic text-ink-sureau/50 dark:text-paper/50">de l'Apothicaire</span>
                   
                   <div className="my-8 w-16 h-16 border rounded-full border-copper-bruni/30 flex items-center justify-center text-copper-bruni opacity-50">
                     <BookOpen size={20} strokeWidth={1} />
                   </div>
                </div>
             </div>
          </div>
          
          {/* Stack effect */}
          <div className="absolute bottom-[-10px] right-[-10px] w-full h-full bg-white dark:bg-[#252525] rounded-l-md rounded-r-2xl shadow-xl -z-10 border border-black/5 transform rotate-y-12 rotate-6 scale-[0.98]"></div>
        </div>

      </div>
    </div>
  );
};