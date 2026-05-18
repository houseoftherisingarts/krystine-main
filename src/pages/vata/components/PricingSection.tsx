
import React from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles, ArrowRight } from 'lucide-react';
import { Language } from '../types';
import { CONTENT } from '../constants';
import { Button } from './Button';

interface PricingSectionProps {
  lang: Language;
  isDark: boolean;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ lang, isDark }) => {
  const tiers = CONTENT.pricing.tiers;
  return (
    <div className="flex flex-col min-h-full justify-center py-8 md:py-16">
      <div className="text-center mb-10 shrink-0 flex flex-col items-center px-4 mt-12 md:mt-16">
        {/* Titre avec réduction de 15% pour l'équilibre visuel */}
        <h2 className="text-xl md:text-3xl lg:text-5xl font-messiri mb-4 text-brand-dark dark:text-brand-light tracking-tight font-normal leading-tight mt-4 md:mt-6">
          {CONTENT.pricing.title[lang]}
        </h2>
        {CONTENT.pricing.promoDeadline[lang] && <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-brand-accent/20 border border-brand-accent/30 text-brand-accent text-sm font-bold uppercase tracking-widest mb-6"><Sparkles size={14} /> {CONTENT.pricing.promoDeadline[lang]} <Sparkles size={14} /></div>}
      </div>
      <div className="flex flex-col md:flex-row gap-8 items-stretch justify-center max-w-7xl mx-auto w-full relative z-10 px-4 pb-20">
        {tiers.map((tier, idx) => {
          const isPremium = tier.recommended;
          const eyebrow = idx === 0 ? "OPTION ÉCONOMIQUE" : "OPTION PREMIUM";
          return (
            <motion.div key={idx} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.2, duration: 0.8 }} className={`group relative rounded-[40px] p-8 md:p-12 flex flex-col h-auto w-full md:w-[48%] transition-all duration-700 ease-out border-2 ${isPremium ? 'bg-brand-dark text-white border-brand-accent shadow-[0_40px_100px_rgba(197,160,89,0.25)] ring-1 ring-brand-accent/20' : isDark ? 'bg-brand-dark/40 border-brand-vata/30 text-white' : 'bg-white border-brand-vata/20 text-brand-dark shadow-xl'} md:hover:scale-[1.03] md:hover:shadow-[0_40px_120px_rgba(197,160,89,0.35)]`}>
              {isPremium && <div className="absolute top-0 right-12 -translate-y-1/2 bg-brand-accent text-brand-dark text-[10px] md:text-xs font-black uppercase tracking-[0.2em] py-2 px-6 rounded-full z-20 shadow-xl border border-white/20">{tier.highlight}</div>}
              <div className={`text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase mb-4 origin-left transition-transform duration-500 group-hover:scale-105 ${isPremium ? 'text-brand-accent' : 'text-brand-vata-bright'}`}>{eyebrow}</div>
              <h3 className={`text-2xl md:text-4xl font-messiri font-bold uppercase tracking-widest mb-4 transition-transform duration-500 group-hover:scale-105 origin-left ${isPremium ? 'text-brand-accent' : 'text-brand-vata'}`}>{tier.name[lang]}</h3>
              
              {/* Description mise en blanc pour la lisibilité sur fond sombre */}
              <p className={`text-base md:text-xl font-serif italic mb-8 leading-relaxed transition-opacity duration-500 group-hover:opacity-100 ${isPremium || isDark ? 'text-white/95' : 'text-brand-vata/80'}`}>
                {tier.description[lang]}
              </p>

              <div className="mb-10 transition-transform duration-500 group-hover:scale-105 origin-left"><div className="flex items-baseline gap-4 mb-1">{tier.promoPrice ? (<><span className={`text-4xl md:text-6xl font-messiri font-bold ${isPremium ? 'text-brand-accent' : 'text-brand-vata'}`}>{tier.promoPrice[lang]}</span><span className="text-xl md:text-2xl text-gray-500 line-through opacity-60">{tier.price[lang]}</span></>) : (<span className="text-4xl md:text-6xl font-messiri font-bold">{tier.price[lang]}</span>)}</div>{tier.paymentPlan && <p className="text-sm md:text-lg font-bold uppercase tracking-widest text-brand-accent/90 mt-1">{tier.paymentPlan[lang]}</p>}</div>
              <div className="space-y-4 mb-12 flex-grow transition-transform duration-500 group-hover:translate-x-2">{tier.features.map((feat, fIdx) => (<div key={fIdx} className="flex items-start gap-4"><div className={`mt-1 p-0.5 rounded-full shrink-0 ${isPremium ? 'text-brand-accent' : 'text-brand-vata'}`}><Check size={18} strokeWidth={3} /></div><span className={`text-sm md:text-lg leading-snug font-normal ${isPremium || isDark ? 'text-gray-200' : 'text-slate-800'}`} dangerouslySetInnerHTML={{ __html: feat[lang] }} /></div>))}</div>
              {tier.image && <div className="w-full flex justify-center mb-10 relative overflow-hidden rounded-2xl group-hover:scale-105 transition-transform duration-700"><img src={tier.image} alt={tier.name[lang]} className="w-full h-auto max-h-[220px] md:max-h-[350px] object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]" /></div>}
              <Button variant="primary" fullWidth size="lg" onClick={() => window.open(tier.checkoutUrl, '_blank')} className={`shadow-2xl text-sm md:text-lg uppercase tracking-[0.2em] font-bold py-6 transition-all duration-500 group-hover:translate-y-[-4px] ${isPremium ? '!bg-brand-accent text-brand-dark hover:!bg-brand-accent/90 shadow-brand-accent/20' : '!bg-brand-vata text-white hover:!bg-brand-vata/90 shadow-brand-vata/20'}`}>{tier.buttonText?.[lang]}<ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></Button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
