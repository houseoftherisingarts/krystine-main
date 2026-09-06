import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Portail from '../Portail';
import { AvecSignature } from './Signature';

// L'aperçu plein écran d'une bannière ou d'un fond d'écran, avant même de
// l'acheter : un clic sur l'image de la boutique l'ouvre. Plusieurs vues
// (la bannière, son fond d'écran) se passent d'un bouton (Alex, 6 sept. 2026).
export interface VueApercu { cle: string; image: string; libelle: string; ratio: string }

const ApercuImage: React.FC<{ ouvert: boolean; onFermer: () => void; vues: VueApercu[]; titre: string; signe: boolean; lang: string }> = ({ ouvert, onFermer, vues, titre, signe, lang }) => {
  const fr = lang === 'FR';
  const [vue, setVue] = useState(0);
  useEffect(() => { if (ouvert) setVue(0); }, [ouvert]);
  useEffect(() => {
    if (!ouvert) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onFermer(); };
    window.addEventListener('keydown', k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev; };
  }, [ouvert, onFermer]);
  const v = vues[Math.min(vue, vues.length - 1)];
  return (
    <AnimatePresence>
      {ouvert && v && (
        <Portail>
          <motion.div
            className="fixed inset-0 z-[140] flex flex-col bg-[#0b0d0b]/95 backdrop-blur-md"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
            onClick={onFermer} role="dialog" aria-modal="true" aria-label={titre}
          >
            <div className="flex items-center justify-between gap-4 px-5 py-4 md:px-8" onClick={(e) => e.stopPropagation()}>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d9a05b]">{fr ? 'Aperçu' : 'Preview'}</p>
                <h3 className="truncate font-serif text-xl text-white md:text-2xl">{titre}</h3>
              </div>
              <div className="flex items-center gap-3">
                {vues.length > 1 && (
                  <div className="inline-flex rounded-full border border-white/20 p-0.5">
                    {vues.map((x, i) => (
                      <button key={x.cle} type="button" onClick={() => setVue(i)} className={`rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${i === vue ? 'bg-[#BA7B39] text-[#293027]' : 'text-white/70 hover:text-white'}`}>{x.libelle}</button>
                    ))}
                  </div>
                )}
                <button type="button" onClick={onFermer} aria-label={fr ? 'Fermer' : 'Close'} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/70 hover:bg-white/10 hover:text-white"><i className="fa-solid fa-times text-lg" /></button>
              </div>
            </div>
            <div className="flex flex-1 items-center justify-center overflow-hidden p-4 md:p-8">
              <motion.div
                key={v.cle}
                initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="w-full overflow-hidden rounded-[18px] shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)]"
                style={{ aspectRatio: v.ratio, maxHeight: 'calc(100vh - 8rem)', maxWidth: `calc((100vh - 8rem) * (${v.ratio}))` }}
              >
                <AvecSignature signe={signe} className="h-full w-full">
                  <img src={v.image} alt={titre} className="h-full w-full object-cover" />
                </AvecSignature>
              </motion.div>
            </div>
            <p className="px-5 pb-5 text-center text-xs text-white/50 md:px-8">
              {signe
                ? (fr ? 'La signature de Krystine se retire contre cinq niskas, une fois la bannière à vous.' : 'Krystine’s signature comes off for five niskas once the banner is yours.')
                : (fr ? 'Version sans signature.' : 'Signature-free version.')}
            </p>
          </motion.div>
        </Portail>
      )}
    </AnimatePresence>
  );
};

export default ApercuImage;
