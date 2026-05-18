
import React from 'react';
import { motion } from 'framer-motion';
import { Stars, Wind, Ear, Eye, Flower2, Apple, Hand, Waves, ArrowDown } from 'lucide-react';
import { Language } from '../types';
import { CONTENT } from '../constants';
import { Button } from './Button';

const ICON_MAP: Record<string, any> = { Stars, Wind, Ear, Eye, Flower2, Apple, Hand, Waves };

interface CurriculumSectionProps {
  lang: Language;
  isDark: boolean;
  onNext?: () => void;
}

export const CurriculumSection: React.FC<CurriculumSectionProps> = ({ lang, isDark, onNext }) => {
  const phases = CONTENT.program.phases;
  return (
    <div className="flex flex-col min-h-full py-12 md:py-24">
      <div className="text-center mb-20 md:mb-32 shrink-0 px-4 relative mt-12 md:mt-16">
        {/* Reduction 15%: xl:text-8xl -> xl:text-7xl */}
        <h2 className="text-2xl md:text-4xl lg:text-6xl xl:text-7xl font-messiri text-brand-dark dark:text-brand-light tracking-tight mb-10 font-black uppercase leading-none mt-4 md:mt-6">
          {CONTENT.program.title[lang]}
        </h2>
        <div className="max-w-5xl mx-auto relative">
          <div className="absolute inset-0 bg-brand-accent/20 blur-[120px] rounded-full scale-150 -z-10 opacity-60" />
          <p className="text-xl md:text-3xl font-serif italic text-brand-vata dark:text-brand-accent/90 leading-relaxed font-medium">{CONTENT.program.subtitle[lang]}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-14 px-4 mb-32 max-w-[100rem] mx-auto w-full">
        {phases.map((phase, idx) => {
          const IconComp = ICON_MAP[phase.icon] || Stars;
          return (
            <motion.div key={idx} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1, duration: 1, ease: [0.22, 1, 0.36, 1] }} className={`group relative flex flex-col p-12 md:p-16 rounded-[60px] border-2 transition-all duration-1000 md:hover:scale-[1.03] md:hover:shadow-[0_60px_150px_rgba(197,160,89,0.25)] ${isDark ? 'bg-brand-dark/40 border-white/5 backdrop-blur-2xl' : 'bg-white border-brand-vata/10 shadow-[0_30px_90px_rgba(100,105,75,0.08)]'}`}>
              <div className="absolute top-12 right-14 opacity-[0.03] group-hover:opacity-[0.1] transition-all duration-1000 pointer-events-none select-none"><span className="text-[14rem] font-serif font-black italic tracking-tighter text-brand-accent">{idx}</span></div>
              <div className="flex flex-col h-full relative z-10">
                <div className="flex items-center justify-between mb-12">
                  <div className={`relative p-7 rounded-[30px] transition-all duration-1000 shadow-2xl ${isDark ? 'bg-white/5 border border-white/10' : 'bg-brand-accent/5 border border-brand-accent/10'} text-brand-accent group-hover:bg-brand-accent group-hover:text-brand-dark group-hover:scale-110`}><IconComp size={48} strokeWidth={1} /><div className="absolute inset-0 bg-brand-accent/30 blur-[40px] rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" /></div>
                  <div className="flex flex-col items-end"><span className="text-xs md:text-sm font-black uppercase tracking-[0.4em] text-brand-accent/60 mb-1">{lang === 'fr' ? 'Étape' : 'Step'}</span><span className="text-4xl md:text-5xl font-serif italic font-black text-brand-accent opacity-20 group-hover:opacity-100 transition-opacity duration-700 leading-none">0{idx}</span></div>
                </div>
                <h3 className={`text-2xl md:text-3xl font-messiri font-black mb-8 leading-tight tracking-wide uppercase ${isDark ? 'text-brand-light' : 'text-brand-dark'} transition-colors duration-700 group-hover:text-brand-accent`}>{phase.title[lang]}</h3>
                <p className={`text-xl md:text-2xl font-normal leading-relaxed transition-all duration-700 ${isDark ? 'text-white/80' : 'text-slate-800'} group-hover:text-opacity-100`}>{phase.description[lang]}</p>
                <div className="mt-auto pt-14"><div className="h-1 bg-brand-accent/10 rounded-full overflow-hidden"><motion.div initial={{ x: "-100%" }} whileInView={{ x: "0%" }} transition={{ duration: 1.5, delay: idx * 0.1 }} className="w-full h-full bg-brand-accent group-hover:opacity-100 opacity-40 transition-opacity duration-700" /></div></div>
              </div>
            </motion.div>
          );
        })}
      </div>
      <div className="flex justify-center shrink-0 mb-20 px-4"><Button variant="primary" size="lg" onClick={onNext} className="!bg-brand-accent text-brand-dark shadow-[0_40px_100px_rgba(197,160,89,0.4)] hover:scale-105 transition-all duration-700 font-black uppercase tracking-[0.4em] px-20 py-10 flex items-center gap-10 group relative overflow-hidden rounded-full"><div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-700" /><span className="relative z-10 text-xl md:text-2xl">{lang === 'fr' ? "Explorer les formules d'accompagnement" : "Discover accompanying options"}</span><ArrowDown size={40} className="relative z-10 animate-bounce group-hover:translate-y-2 transition-transform" /></Button></div>
    </div>
  );
};
