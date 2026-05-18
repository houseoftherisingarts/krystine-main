
import React from 'react';
import { Language } from '../types';

interface FooterProps {
  lang: Language;
}

export const Footer: React.FC<FooterProps> = ({ lang }) => {
  return (
    <footer className="w-full py-16 px-6 relative z-10">
      <div className="max-w-4xl mx-auto flex flex-col items-center text-center">
        
        {/* Identité Signature */}
        <div className="mb-10 space-y-2">
          <h3 className="text-2xl md:text-5xl font-messiri text-brand-accent tracking-[0.3em] font-medium transition-transform hover:scale-105 duration-700 uppercase">
            Krystine St-Laurent
          </h3>
          <p className="text-[10px] md:text-xs uppercase tracking-[0.5em] text-white/30 font-black">
            {lang === 'fr' ? "Maison Mère D'INSPIRATA AYURVEDA" : "Mother House of INSPIRATA AYURVEDA"}
          </p>
        </div>

        {/* Liens Légaux Raffinés - Uniquement le contact */}
        <nav className="mb-12">
          <ul className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 text-[10px] md:text-[11px] uppercase tracking-[0.25em] font-black text-white/20">
            <li>
              <a href="mailto:teamksl@inspiratanature.com" className="hover:text-brand-accent transition-all duration-300">
                {lang === 'fr' ? "Nous joindre" : "Contact us"}
              </a>
            </li>
          </ul>
        </nav>

        {/* Copyright Sceau */}
        <div className="pt-8 border-t border-white/5 w-full max-w-[400px]">
          <p className="text-[9px] md:text-[10px] tracking-[0.3em] text-white/10 font-serif italic uppercase leading-relaxed">
            © 2026 Krystine St-Laurent.<br />
            {lang === 'fr' ? "Tous droits réservés." : "All rights reserved."}
          </p>
        </div>

      </div>
    </footer>
  );
};
