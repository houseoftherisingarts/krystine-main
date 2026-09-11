import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Portail from '../Portail';

// Le rideau d'entrée des pages d'événements : un voile crème, un filet de
// laiton qui se trace, puis le rideau se lève sur la page en moins d'une
// seconde. Une seule fois par session et par page, pour que l'entrée reste
// une entrée et ne devienne pas une attente.

const EASE = [0.16, 0.8, 0.24, 1] as const;

const RideauEntree: React.FC<{ cle: string; mot?: string }> = ({ cle, mot }) => {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(() => {
    try { return !sessionStorage.getItem(`rideau-${cle}`); } catch { return true; }
  });

  useEffect(() => {
    if (!visible) return;
    try { sessionStorage.setItem(`rideau-${cle}`, '1'); } catch { /* navigation privée */ }
    const t = window.setTimeout(() => setVisible(false), reduce ? 60 : 820);
    return () => window.clearTimeout(t);
  }, [visible, reduce, cle]);

  return (
    <Portail>
      <AnimatePresence>
        {visible && (
          <motion.div
            aria-hidden
            className="fixed inset-0 z-[200] flex items-center justify-center bg-[#EEE7DB]"
            initial={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ duration: reduce ? 0.2 : 0.95, ease: EASE }}
          >
            <div className="flex flex-col items-center gap-5">
              {mot && (
                <motion.p
                  className="font-serif text-[clamp(1.1rem,2vw,1.5rem)] uppercase tracking-[0.3em] text-[#293027]"
                  initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.7, ease: EASE, delay: 0.05 }}
                >
                  {mot}
                </motion.p>
              )}
              <motion.span
                className="block h-px w-[min(38vw,320px)] bg-[#BA7B39]"
                style={{ transformOrigin: 'left center' }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.75, ease: EASE }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portail>
  );
};

export default RideauEntree;
