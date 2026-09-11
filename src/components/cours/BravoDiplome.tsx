import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import Portail from '../Portail';
import Diplome, { type DiplomeInfos } from './Diplome';
import { telechargerDiplome } from '../../lib/diplomePdf';

// Le parchemin qui se déroule quand la dernière leçon se ferme (Alex, 10
// septembre 2026). Il montre le vrai diplôme, propose de le prendre en PDF,
// et mène à « Mes diplômes » dans l'espace client, où il reste pour toujours.

const EASE = [0.16, 0.8, 0.24, 1] as const;

const BravoDiplome: React.FC<{ infos: DiplomeInfos; lang: 'FR' | 'EN'; onFermer: () => void }> = ({ infos, lang, onFermer }) => {
  const reduce = useReducedMotion();
  const fr = lang === 'FR';
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    const echap = (e: KeyboardEvent) => { if (e.key === 'Escape') onFermer(); };
    window.addEventListener('keydown', echap);
    return () => window.removeEventListener('keydown', echap);
  }, [onFermer]);

  const prendre = async () => {
    setEnvoi(true);
    try { await telechargerDiplome(infos, lang); } finally { setEnvoi(false); }
  };

  return (
    <Portail>
      <motion.div
        className="fixed inset-0 z-[150] flex items-center justify-center overflow-y-auto overscroll-contain bg-[#151d19]/80 p-4 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onFermer}
        role="dialog" aria-modal="true" aria-label={fr ? 'Programme terminé' : 'Program complete'}
      >
        <motion.div
          onClick={e => e.stopPropagation()}
          initial={reduce ? false : { opacity: 0, y: 34, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, ease: EASE }}
          className="w-full max-w-3xl"
        >
          <div className="mb-5 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#d9a05b]">
              {fr ? 'Le programme est terminé' : 'The program is complete'}
            </p>
            <h2 className="mt-2 font-serif text-[clamp(1.7rem,4vw,2.6rem)] leading-[1.12] text-[#EEE7DB]">
              {fr ? 'Votre diplôme vous attend' : 'Your certificate is ready'}
            </h2>
          </div>

          {/* Le vrai parchemin, à la taille où il se lit */}
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, ease: EASE, delay: 0.25 }}
            className="overflow-hidden rounded-[10px] shadow-[0_40px_90px_-28px_rgba(0,0,0,0.7)]"
          >
            <Diplome infos={infos} lang={lang} />
          </motion.div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={prendre}
              disabled={envoi}
              className="inline-flex items-center gap-2 rounded-full bg-[#BA7B39] px-7 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#151d19] transition-colors hover:bg-[#d9a05b] disabled:opacity-60"
            >
              <i className="fa-solid fa-file-arrow-down" />
              {envoi ? (fr ? 'Préparation…' : 'Preparing…') : (fr ? 'Prendre le PDF' : 'Download the PDF')}
            </button>
            <Link
              to="/compte?onglet=diplomes"
              onClick={onFermer}
              className="inline-flex items-center gap-2 rounded-full border border-[#EEE7DB]/30 px-7 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#EEE7DB] transition-colors hover:border-[#d9a05b] hover:text-[#d9a05b]"
            >
              {fr ? 'Voir mes diplômes' : 'See my certificates'}
            </Link>
          </div>

          <button
            type="button"
            onClick={onFermer}
            className="mx-auto mt-4 block text-[11px] uppercase tracking-[0.18em] text-[#EEE7DB]/45 transition-colors hover:text-[#EEE7DB]/75"
          >
            {fr ? 'Fermer' : 'Close'}
          </button>
        </motion.div>
      </motion.div>
    </Portail>
  );
};

export default BravoDiplome;
