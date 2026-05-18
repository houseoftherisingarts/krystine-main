
import React from 'react';
import { Button } from './Button';
import { CONTENT } from '../constants';
import { Language } from '../types';

interface GlobalCTAProps {
  lang: Language;
  className?: string;
}

export const GlobalCTA: React.FC<GlobalCTAProps> = ({ lang, className = "" }) => {
    return (
        <div className={`w-full max-w-4xl mx-auto flex flex-col md:flex-row gap-4 justify-center items-center shrink-0 z-40 relative py-8 ${className}`}>
            <Button 
                variant="primary" 
                size="md" 
                className="!bg-brand-vata text-white shadow-lg w-full md:w-auto shadow-brand-vata/20"
                onClick={() => window.open(CONTENT.pricing.tiers[0].checkoutUrl, '_blank')}
            >
                {CONTENT.pricing.tiers[0].buttonText?.[lang] || (lang === 'fr' ? 'S\'inscrire' : 'Register')}
            </Button>
            <Button 
                variant="primary" 
                size="md" 
                className="!bg-brand-accent text-brand-dark shadow-lg w-full md:w-auto shadow-brand-accent/20"
                onClick={() => window.open(CONTENT.pricing.tiers[1].checkoutUrl, '_blank')}
            >
                {CONTENT.pricing.tiers[1].buttonText?.[lang] || (lang === 'fr' ? 'S\'inscrire' : 'Register')}
            </Button>
        </div>
    );
};
