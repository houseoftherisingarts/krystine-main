import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Button } from './Button';
import { CONTENT } from '../constants';
import { Language } from '../types';

interface SectionProps {
  children: ReactNode;
  className?: string;
  onNext?: () => void;
  onSubscribe: () => void;
  lang: Language;
  showNext?: boolean;
  maxWidth?: string;
}

export const Section: React.FC<SectionProps> = ({ 
  children, 
  className = '', 
  onNext,
  onSubscribe,
  lang,
  showNext = true,
  maxWidth = 'max-w-5xl'
}) => {
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20, filter: 'blur(8px)' }}
      animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 1.05, y: -20, filter: 'blur(8px)' }}
      transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
      className={`w-full ${maxWidth} mx-auto h-full flex flex-col justify-center px-4 md:px-8 ${className}`}
    >
      <div className="bg-white/10 dark:bg-brand-dark/60 backdrop-blur-xl rounded-[15px] p-6 md:p-10 shadow-2xl border border-white/20 dark:border-brand-accent/20 max-h-[85vh] overflow-y-auto custom-scrollbar flex flex-col relative z-20">
          <div className="flex-grow">
            {children}
          </div>
          
          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-center gap-4 flex-shrink-0">
            <Button 
              onClick={onSubscribe} 
              variant="primary" 
              className="w-full sm:w-auto shadow-brand-accent/30 hover:shadow-brand-accent/50"
            >
              {CONTENT.buttons.subscribe[lang]}
            </Button>
            
            {showNext && onNext && (
              <Button 
                onClick={onNext} 
                variant="outline"
                className="w-full sm:w-auto"
              >
                {CONTENT.buttons.next[lang]}
              </Button>
            )}
          </div>
      </div>
    </motion.div>
  );
};