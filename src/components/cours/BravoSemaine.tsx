import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Portail from '../Portail';
import type { SemaineVata } from '../../pages/vata/semaines';
import type { Programme } from '../../pages/cours/programmes';

// Le mot de bravo qui se lève quand une porte vient de s'ouvrir (Alex,
// 10 septembre 2026). La barre de progression avance sous les yeux, de la
// valeur d'avant vers celle d'après, pour que l'effort se voie.

const EASE = [0.16, 0.8, 0.24, 1] as const;

interface Props {
  programme: Programme;
  semaine: SemaineVata;
  /** 0 à 1, la part du parcours avant que cette porte s'ouvre. */
  avant: number;
  /** 0 à 1, la part du parcours maintenant. */
  apres: number;
  semainesAchevees: number;
  lang: 'FR' | 'EN';
  onFermer: () => void;
}

const BravoSemaine: React.FC<Props> = ({ programme, semaine, avant, apres, semainesAchevees, lang, onFermer }) => {
  const nb = programme.chapitres.length;
  const [un, des] = lang === 'FR' ? programme.unite.fr : programme.unite.en;
  void un;
  const reduce = useReducedMotion();
  const [largeur, setLargeur] = useState(avant);
  const fr = lang === 'FR';
  const sens = fr ? semaine.sens.fr : semaine.sens.en;

  // La barre part de l'ancienne valeur, puis glisse vers la nouvelle.
  useEffect(() => {
    const t = setTimeout(() => setLargeur(apres), reduce ? 0 : 420);
    return () => clearTimeout(t);
  }, [apres, reduce]);

  useEffect(() => {
    const echap = (e: KeyboardEvent) => { if (e.key === 'Escape') onFermer(); };
    window.addEventListener('keydown', echap);
    return () => window.removeEventListener('keydown', echap);
  }, [onFermer]);

  return (
    <Portail>
      <motion.div
        className="fixed inset-0 z-[140] flex items-center justify-center overflow-y-auto overscroll-contain bg-[#151d19]/70 p-4 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onFermer}
        role="dialog" aria-modal="true" aria-label={fr ? 'Semaine terminée' : 'Week complete'}
      >
        <motion.div
          onClick={e => e.stopPropagation()}
          initial={reduce ? false : { opacity: 0, y: 26, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="w-full max-w-lg overflow-hidden rounded-[24px] border border-white/60 bg-[#EEE7DB] shadow-[0_40px_90px_-30px_rgba(21,29,25,0.7)] dark:border-white/10 dark:bg-[#1b241f]"
        >
          {/* Le bandeau de la semaine, dans sa teinte */}
          <div className="relative h-40 w-full overflow-hidden md:h-48">
            <img src={semaine.bandeau} alt="" className="h-full w-full object-cover" />
            <span
              aria-hidden
              className="absolute inset-0"
              style={{ background: `linear-gradient(to top, ${semaine.couleur.encre}f2 4%, ${semaine.couleur.encre}70 52%, transparent 100%)` }}
            />
            <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 px-6 pb-4">
              <span className="font-serif text-3xl leading-none text-[#EEE7DB]">{semaine.roman}</span>
              <span className="pb-1 text-[10px] font-bold uppercase tracking-[0.26em] text-[#EEE7DB]/85">
                {fr ? `${programme.unite.fr[0][0].toUpperCase()}${programme.unite.fr[0].slice(1)} ouverte` : `${programme.unite.en[0][0].toUpperCase()}${programme.unite.en[0].slice(1)} opened`}
              </span>
            </div>
          </div>

          <div className="px-6 pb-6 pt-5 md:px-8 md:pb-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: semaine.couleur.encre }}>
              {fr ? 'Bravo' : 'Well done'}
            </p>
            <h2 className="mt-2 font-serif text-[clamp(1.5rem,3.4vw,2rem)] leading-[1.15] text-[#293027] dark:text-[#EEE7DB]">
              {fr ? `${sens} vient de s’ouvrir` : `${sens} has just opened`}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[#38403a]/80 dark:text-white/70">
              {fr
                ? (semainesAchevees === 1
                    ? 'Votre première porte est ouverte. La perception commence à s’éclaircir.'
                    : `${semainesAchevees} ${des} sur ${nb} sont maintenant ouvertes devant vous.`)
                : (semainesAchevees === 1
                    ? 'Your first door is open. Perception is starting to clear.'
                    : `${semainesAchevees} of ${nb} ${des} now stand open before you.`)}
            </p>

            {/* La barre qui avance sous les yeux */}
            <div className="mt-6">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8B4A2F] dark:text-[#d9a05b]">
                  {fr ? 'Votre parcours' : 'Your journey'}
                </span>
                <motion.span
                  className="font-mono text-sm tabular-nums text-[#293027] dark:text-[#EEE7DB]"
                  key={largeur}
                  initial={reduce ? false : { opacity: 0.4 }}
                  animate={{ opacity: 1 }}
                >
                  {Math.round(largeur * 100)} %
                </motion.span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#38403a]/12 dark:bg-white/10">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round(largeur * 100)}%`,
                    background: `linear-gradient(90deg, ${semaine.couleur.vive}, #BA7B39)`,
                    transition: reduce ? 'none' : 'width 1.6s cubic-bezier(.16,.8,.24,1)',
                  }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={onFermer}
              className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#BA7B39] px-7 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#151d19] transition-colors hover:bg-[#d9a05b]"
            >
              {fr ? 'Continuer' : 'Keep going'} <i className="fa-solid fa-arrow-right" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </Portail>
  );
};

export default BravoSemaine;
