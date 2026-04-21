import React from 'react';
import { ContentText } from '../../types';

export const GuaranteeBadge: React.FC<{ content: ContentText['pricing']['guarantee'] }> = ({ content }) => {
  return (
    <div className="flex flex-col items-center text-center max-w-xs mx-auto mt-12 md:mt-0">
      <div className="relative w-32 h-32 mb-4 group cursor-help">
        <svg viewBox="0 0 100 100" className="w-full h-full animate-[spin_30s_linear_infinite]">
          {/* Stamp Border - Rough Edge simulated */}
          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="1" className="text-copper-oxy" strokeDasharray="4 2" />
          <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="2" className="text-copper-oxy" />
          
          {/* Curved Text Path */}
          <path id="curve" d="M 14 50 A 36 36 0 1 1 86 50 A 36 36 0 1 1 14 50" fill="none" />
          <text fontSize="8.5" letterSpacing="2" fill="currentColor" className="text-copper-oxy font-bold uppercase">
            <textPath href="#curve" startOffset="50%" textAnchor="middle">
              {content.badge} • Krystine St-Laurent •
            </textPath>
          </text>
        </svg>
        
        {/* Inner Content */}
        <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-2xl font-serif text-copper-oxy">30</span>
            <span className="text-[10px] uppercase tracking-widest text-copper-oxy">Jours</span>
        </div>
      </div>
      
      <h4 className="text-copper-oxy font-serif text-lg mb-1">{content.title}</h4>
      <p className="text-xs text-ink-sureau/50 dark:text-paper/50 leading-relaxed">
        {content.text}
      </p>
    </div>
  );
};