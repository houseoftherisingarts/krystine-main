import React from 'react';
import { motion } from 'framer-motion';
import { Feather } from 'lucide-react';

export const CalligraphySequence: React.FC<{
  isMobile: boolean;
  lines: Array<{ text: string; className?: string }>;
  delay: number;
}> = React.memo(({ lines, delay, isMobile }) => {
  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {lines.map((line, idx) => (
        <div key={idx} className={`relative inline-flex items-baseline justify-center ${line.className || ""}`}>
          <motion.div
            initial={isMobile ? { opacity: 0, y: 20 } : { y: 20, opacity: 0 }}
            whileInView={isMobile ? { opacity: 1, y: 0 } : { y: 0, opacity: 1 }}
            transition={{ duration: 1, delay: idx * 0.2 }}
            className={isMobile ? "whitespace-normal break-words text-balance" : "whitespace-normal break-words w-full text-center px-6"}
          >
            {line.text}
          </motion.div>
          {idx === lines.length - 1 && (
             <motion.div
               initial={{ opacity: 0, x: -50, y: 10 }}
               whileInView={{ opacity: [0, 1, 1, 0], x: ["0%", "100%"], y: [0, -5, 0, -5] }}
               viewport={{ once: true }}
               transition={{ duration: 1.5, delay: delay + (idx * 0.8), times: [0, 0.1, 0.9, 1], ease: "easeInOut" }}
               className="absolute top-0 left-0 h-full w-full pointer-events-none"
             >
                <div className="absolute right-0 bottom-0 translate-x-1/2 translate-y-1/2">
                  <Feather className="text-copper-bruni w-8 h-8 md:w-12 md:h-12 drop-shadow-md -rotate-12" />
                </div>
             </motion.div>
          )}
        </div>
      ))}
    </div>
  );
});