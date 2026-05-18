import React from 'react';
import { motion } from 'framer-motion';
import { Feather } from 'lucide-react';

const Signature: React.FC = () => {
  const text = 'Une trilogie signée: Krystine St-Laurent';
  const characters = text.split('');
  const durationPerChar = 0.08;
  const totalDuration = characters.length * durationPerChar;
  const startDelay = 0.8;

  return (
    <div className="pt-6 text-right relative w-full flex justify-end">
      <div className="relative inline-block">
        {/* The Text */}
        <div className="font-handwriting text-3xl md:text-4xl text-copper-bruni dark:text-copper-light flex items-center h-[1.5em] tracking-wide">
          {characters.map((char, i) => (
            <motion.span
              key={`${char}-${i}`}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ 
                duration: 0.1, 
                delay: startDelay + i * durationPerChar 
              }}
              className={char === ' ' ? 'w-[0.25em]' : ''}
            >
              {char}
            </motion.span>
          ))}
        </div>

        {/* The Quill (Feather) */}
        <motion.div
          className="absolute top-0 pointer-events-none z-20"
          initial={{ left: 0, opacity: 0, x: '-50%', y: '0%' }}
          whileInView={{ 
            opacity: [0, 1, 1, 0],
            left: ['0%', '100%'],
            // Organic writing jitter
            y: [0, -2, 1, -1, 2, 0, -1, 1, 0],
            rotate: [-45, -40, -50, -42, -48, -45]
          }}
          viewport={{ once: true }}
          transition={{
            left: { duration: totalDuration, delay: startDelay, ease: 'linear' },
            opacity: { duration: totalDuration + 0.5, delay: startDelay - 0.1, times: [0, 0.1, 0.9, 1] },
            y: { duration: 0.4, repeat: Math.ceil(totalDuration / 0.4), ease: "easeInOut" },
            rotate: { duration: 0.3, repeat: Math.ceil(totalDuration / 0.3), ease: "easeInOut" }
          }}
          style={{ height: '100%', width: 'auto' }}
        >
          <div className="relative h-full aspect-square flex items-center justify-center">
             <Feather 
               className="h-10 w-10 text-copper-bruni dark:text-copper-light drop-shadow-sm" 
               style={{ transform: 'translate(10px, -10px)' }}
             />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Signature;