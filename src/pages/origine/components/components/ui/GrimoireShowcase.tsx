import React from 'react';
import { ContentData } from '../../../types';
import { Download, BookOpen } from 'lucide-react';

export const GrimoireShowcase: React.FC<{ content: ContentData['grimoire'] }> = ({ content }) => {
  return (
    <div className="py-24 px-4 bg-paper-dark/5 dark:bg-black/20 overflow-hidden relative">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-16">
        
        {/* The Text */}
        <div className="lg:w-1/2 space-y-8 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-copper-bruni/30 text-copper-bruni text-xs uppercase tracking-widest">
            <BookOpen size={12} />
            JOURNAL D'OBSERVATION
          </div>
          <h2 className="text-4xl md:text-5xl font-serif text-ink-sureau dark:text-paper">
            L'accompagnement pour réfléchir, noter, observer, intégrer.
          </h2>
          <p className="text-xl text-ink-sureau/70 dark:text-paper/70 font-light italic">
            
          </p>
          
          <ul className="space-y-4 pt-4">
            <li className="flex items-center gap-3 text-ink-sureau/80 dark:text-paper/80">
              <div className="w-1.5 h-1.5 rounded-full bg-copper-bruni"></div>
              L'observation des repères saisonniers pour s'ajuster au fil des semaines.
            </li>
            <li className="flex items-center gap-3 text-ink-sureau/80 dark:text-paper/80">
              <div className="w-1.5 h-1.5 rounded-full bg-copper-bruni"></div>
              L'intégration de rituels ancrés dans la sagesse ayurvédique.
            </li>
            <li className="flex items-center gap-3 text-ink-sureau/80 dark:text-paper/80">
              <div className="w-1.5 h-1.5 rounded-full bg-copper-bruni"></div>
              L'espace d'écriture pour suivre ce qui se dépose en vous.
            </li>
          </ul>

          <div className="pt-6">
             <div className="inline-flex items-center gap-3 text-copper-bruni font-medium text-sm">
               <Download size={16} />
               Inclus dans Expérience Origine
             </div>
          </div>
        </div>

        {/* The Artifact (Visual) */}
        <div className="lg:w-1/2 relative perspective-1000">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-copper-bruni/10 blur-[60px] rounded-full scale-75"></div>
          
          <div className="relative w-full aspect-[3/4] max-w-md mx-auto bg-[#F7F5F0] dark:bg-[#1e1e1e] rounded-l-md rounded-r-2xl shadow-2xl border-l-8 border-copper-bruni transform rotate-y-12 rotate-3 hover:rotate-0 transition-all duration-700 flex flex-col overflow-hidden">
             {/* Book Texture Overlay */}
             {/* Apothecary plant stem image */}

             
             {/* Cover Design */}
             <div className="flex-1">
                <img 
                  src="https://storage.googleapis.com/origine1/Livre%20cover%20origine.jpeg" 
                  alt="Journal d'observation et de rituels" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
          </div>
          
          {/* Stack effect */}
          <div className="absolute bottom-[-10px] right-[-10px] w-full h-full bg-white dark:bg-[#252525] rounded-l-md rounded-r-2xl shadow-xl -z-10 border border-black/5 transform rotate-y-12 rotate-6 scale-[0.98]"></div>
        </div>

      </div>
    </div>
  );
};
