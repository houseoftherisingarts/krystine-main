
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Circle, CheckCircle2, BrainCircuit, Moon, ZapOff, 
  Layout, Wind, Ear, Info, ArrowDown, Snowflake, Stars, Cloud
} from 'lucide-react';
import { Language } from '../types';
import { CONTENT } from '../constants';
import { Button } from './Button';

const ICON_MAP: Record<string, any> = {
  BrainCircuit, Moon, ZapOff, Layout, Wind, Ear, Snowflake, Stars, Cloud
};

interface DiagnosisSectionProps {
  lang: Language;
  isDark: boolean;
  onNext?: () => void;
}

export const DiagnosisSection: React.FC<DiagnosisSectionProps> = ({ lang, isDark, onNext }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const items = CONTENT.diagnosis.items;

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) { newSelected.delete(id); } else { newSelected.add(id); }
    setSelectedIds(newSelected);
  };

  const hasInteracted = selectedIds.size > 0;
  const showWarning = selectedIds.size > 3;

  return (
    <div className="flex flex-col min-h-full justify-center py-8 pb-24">
      {/* Header Section - Titre augmenté de 20% avec marge de sécurité */}
      <div className="text-center shrink-0 mb-12 px-4 mt-20 md:mt-28">
        <h2 className="text-2xl md:text-4xl lg:text-5xl font-messiri transition-colors text-brand-dark dark:text-brand-light tracking-tight mb-6 font-normal leading-tight">
          {CONTENT.diagnosis.title[lang]}
        </h2>
        <div className="max-w-4xl mx-auto">
            <p className="text-brand-vata dark:text-brand-accent/90 italic mt-2 text-lg md:text-xl font-serif leading-relaxed px-4">
              {CONTENT.diagnosis.subtitle[lang]}
            </p>
        </div>
      </div>

      {/* Grid - Strictement inchangé */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-7xl mx-auto w-full mb-16 px-4">
        {items.map((item, idx) => {
          const IconComp = ICON_MAP[item.icon] || Info;
          const isSelected = selectedIds.has(item.id);
          return (
            <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} onClick={() => toggleSelection(item.id)} whileHover={{ y: -5 }} whileTap={{ scale: 0.98 }} className={`group relative cursor-pointer p-8 rounded-[40px] border-2 transition-all duration-500 flex flex-col items-center text-center gap-6 ${isSelected ? 'border-brand-accent bg-brand-accent/15 shadow-[0_0_50px_rgba(197,160,89,0.4)] scale-[1.03]' : isDark ? 'border-white/5 bg-white/5 hover:border-brand-accent/40' : 'border-brand-dark/5 bg-brand-dark/5 hover:border-brand-accent/40'}`}>
              <div className="absolute top-6 right-6 transition-all duration-500">{isSelected ? <CheckCircle2 size={32} className="text-brand-accent fill-brand-accent/20 drop-shadow-[0_0_12px_rgba(197,160,89,0.6)]" /> : <Circle size={32} className="opacity-15 group-hover:opacity-40 transition-opacity text-brand-accent" />}</div>
              <div className={`p-6 rounded-full transition-all duration-500 shadow-inner ${isSelected ? 'bg-brand-accent/25 text-brand-accent scale-110' : 'bg-brand-vata/10 text-brand-vata'}`}><IconComp size={40} strokeWidth={1.5} /></div>
              <div className="space-y-4">
                <h3 className={`text-xl md:text-2xl font-black font-messiri transition-colors duration-300 uppercase tracking-wide ${isSelected ? 'text-brand-accent' : (isDark ? 'text-brand-light' : 'text-brand-dark')}`}>{item.title[lang]}</h3>
                <p className={`text-base md:text-lg leading-relaxed transition-opacity duration-300 ${isSelected ? 'opacity-100 font-medium' : 'opacity-70'} ${isDark ? 'text-gray-100' : 'text-slate-800'}`}>{item.description[lang]}</p>
              </div>
              {isSelected && <motion.div layoutId="selected-glow" className="absolute inset-0 rounded-[40px] pointer-events-none ring-4 ring-brand-accent/30 animate-pulse" />}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-8 flex flex-col items-center justify-center space-y-12 min-h-[180px]">
        <AnimatePresence>{hasInteracted && <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="text-center px-6 max-w-4xl"><p className={`text-2xl md:text-3xl font-serif italic font-bold leading-relaxed transition-colors duration-500 ${showWarning ? 'text-brand-accent scale-105' : 'text-brand-vata dark:text-brand-accent/80'}`}>{CONTENT.diagnosis.closing[lang]}</p></motion.div>}</AnimatePresence>
        <Button variant="primary" size="lg" onClick={onNext} className="!bg-brand-accent text-brand-dark shadow-[0_30px_70px_rgba(197,160,89,0.4)] hover:scale-105 transition-all duration-500 font-black uppercase tracking-[0.2em] px-14 py-8 flex items-center gap-6 group relative overflow-hidden"><div className="absolute inset-0 bg-white/30 translate-y-full group-hover:translate-y-0 transition-transform duration-500" /><span className="relative z-10 text-lg md:text-xl">{lang === 'fr' ? 'Je veux refermer mes portes et sécuriser mon énergie' : 'I want to close my doors and secure my energy'}</span><ArrowDown size={32} className="relative z-10 animate-bounce group-hover:scale-110 transition-transform" /></Button>
      </div>
    </div>
  );
};
