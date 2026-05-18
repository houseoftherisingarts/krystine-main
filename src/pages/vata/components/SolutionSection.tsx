
import React from 'react';
import { motion } from 'framer-motion';
import { Wind, Ear, Moon, ArrowDown, Stars, ShieldCheck } from 'lucide-react';
import { Language } from '../types';
import { CONTENT } from '../constants';
import { Button } from './Button';

interface SolutionSectionProps {
  lang: Language;
  isDark: boolean;
  onNext?: () => void;
}

const ICON_MAP: Record<string, any> = { Wind, Ear, Moon };

export const SolutionSection: React.FC<SolutionSectionProps> = ({ lang, isDark, onNext }) => {
  const items = CONTENT.context.items;
  return (
    <div className="flex flex-col min-h-full justify-center py-8">
      <div className="text-center mb-16 shrink-0 relative px-4 mt-12 md:mt-16">
        {/* Reduction 15%: text-6xl -> text-4xl/5xl */}
        <h2 className="text-xl md:text-3xl lg:text-5xl font-messiri mb-8 leading-[1.1] tracking-tight text-brand-dark dark:text-brand-light font-black max-w-5xl mx-auto uppercase mt-4 md:mt-6">
          {CONTENT.context.title[lang]}
        </h2>
        <div className="relative inline-block max-w-4xl mx-auto">
          <div className={`absolute inset-0 bg-brand-accent/25 blur-3xl rounded-full scale-125 ${isDark ? 'opacity-30' : 'opacity-15'}`} />
          <p className="relative px-8 py-4 text-lg md:text-2xl font-serif italic text-brand-vata dark:text-brand-accent/90 text-center leading-relaxed font-medium">
            {CONTENT.context.subtitle[lang]}
          </p>
        </div>
      </div>
      <div className="flex flex-col md:flex-row items-stretch justify-center gap-8 md:gap-10 max-w-7xl mx-auto mb-20 px-4">
        {items.map((item, idx) => {
          const IconComp = ICON_MAP[item.icon] || Wind;
          return (
            <motion.div key={idx} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.15, duration: 0.8 }} className={`group flex flex-col items-center text-center p-10 md:p-12 rounded-[40px] border-2 transition-all duration-700 md:hover:scale-[1.05] md:hover:shadow-[0_40px_100px_rgba(197,160,89,0.25)] flex-1 shadow-2xl relative overflow-hidden ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-brand-vata/15'}`}>
              <div className="absolute -top-10 -right-10 opacity-[0.03] group-hover:opacity-[0.1] transition-opacity duration-700 text-brand-accent"><ShieldCheck size={200} /></div>
              <div className="w-24 h-24 rounded-full flex items-center justify-center bg-brand-accent/10 text-brand-accent mb-8 transition-all duration-700 group-hover:scale-110 group-hover:bg-brand-accent group-hover:text-brand-dark shadow-xl"><IconComp size={48} strokeWidth={1.2} /></div>
              <h3 className={`text-2xl md:text-3xl font-messiri font-black mb-6 tracking-widest leading-tight uppercase ${isDark ? 'text-brand-accent' : 'text-brand-vata'}`}>{item.title[lang]}</h3>
              <p className={`text-lg md:text-xl font-normal leading-relaxed ${isDark ? 'text-gray-100' : 'text-slate-900'} transition-colors duration-500`}>{item.description[lang]}</p>
            </motion.div>
          );
        })}
      </div>
      <div className="flex justify-center shrink-0 pb-12"><Button variant="primary" size="lg" onClick={onNext} className="!bg-brand-accent text-brand-dark shadow-[0_30px_70px_rgba(197,160,89,0.4)] hover:scale-105 transition-all duration-500 font-black uppercase tracking-[0.3em] px-16 py-8 flex items-center gap-6 group relative overflow-hidden"><div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" /><span className="relative z-10 text-lg md:text-xl">{lang === 'fr' ? 'Explorer le parcours des 7 semaines' : 'Explore the 7-week journey'}</span><ArrowDown size={32} className="relative z-10 animate-bounce group-hover:translate-y-2 transition-transform" /></Button></div>
    </div>
  );
};
