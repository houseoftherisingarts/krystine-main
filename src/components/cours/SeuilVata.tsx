import React, { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { KenBurns, Atmosphere } from '../motion/loeuvre';

// Le seuil de l'Expérience Vata : la couverture prend tout l'écran au lieu de
// tenir dans une carte, et le premier défilement allume la scène. Plus le
// parcours avance, plus la lumière se réchauffe (docs/vata-plan-visuel.md).

const EASE = [0.16, 0.8, 0.24, 1] as const;

interface Reprise {
  titre: string;
  vignette?: string;
  duree?: string;
  soustitre?: string;
  onOuvrir: () => void;
}

interface Props {
  image: string;
  /** 0 à 1 : la part du parcours accomplie. Réchauffe la scène. */
  chaleur: number;
  terminees: number;
  total: number;
  semainesAchevees: number;
  lang: 'FR' | 'EN';
  reprise?: Reprise;
}

const SeuilVata: React.FC<Props> = ({ image, chaleur, terminees, total, semainesAchevees, lang, reprise }) => {
  const reduce = useReducedMotion();
  const cadre = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: cadre, offset: ['start start', 'end start'] });
  // L'allumage : au premier défilement l'image recule et le voile se ferme.
  const echelle = useTransform(scrollYProgress, [0, 1], [1, 0.92]);
  const voile = useTransform(scrollYProgress, [0, 0.8], [0.42, 0.88]);
  const monte = useTransform(scrollYProgress, [0, 1], [0, -60]);

  const rayon = 46;
  const perimetre = 2 * Math.PI * rayon;
  const pct = total > 0 ? Math.round((terminees / total) * 100) : 0;

  return (
    <section ref={cadre} className="relative h-[74vh] min-h-[460px] w-full overflow-hidden bg-[#151d19] md:h-[92vh] md:min-h-[560px]">
      <motion.div className="absolute inset-0" style={reduce ? undefined : { scale: echelle, y: monte }}>
        <KenBurns src={image} className="object-[28%_50%] md:object-center" />
      </motion.div>

      {/* Le voile : froid en haut, chaud en bas quand le parcours avance. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: reduce ? 0.6 : voile,
          background: `linear-gradient(to top, rgba(18,25,21,0.72) 0%, rgba(18,25,21,${0.28 + 0.1 * chaleur}) 22%, transparent 48%)`,
        }}
      />
      <Atmosphere light={`${Math.round(24 + 52 * chaleur)}% 18%`} strength={0.3 + 0.4 * chaleur} vignette={false} />

      {/* Le titre, en Cormorant Garamond comme sur le diplôme, dans le calme
          de la droite de la couverture. Deux lignes, jamais plus. */}
      <motion.div
        className="absolute inset-x-0 top-[22%] px-5 md:top-[18%] md:px-10"
        initial={reduce ? false : { opacity: 0, y: 18, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 1.2, ease: EASE, delay: 0.05 }}
      >
        <div className="mx-auto flex max-w-[1720px] justify-end">
          {/* En mobile le titre tombe sur les herbes : un verre crème le porte. */}
          <div className="rounded-[16px] bg-[#F7F3EA]/75 px-4 py-3 text-right backdrop-blur-sm md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
            <p className="text-[10px] font-bold uppercase tracking-[0.34em] text-[#8B4A2F] md:text-[11px]">
              {lang === 'FR' ? 'Expérience Ayurveda' : 'Ayurveda Experience'}
            </p>
            <h1 className="mt-3 font-serif text-[clamp(3.2rem,8.5vw,7.4rem)] leading-[0.9] text-[#293027]" style={{ letterSpacing: '-0.01em' }}>
              {lang === 'FR' ? <>Saison<br />Vata</> : <>Vata<br />Season</>}
            </h1>
          </div>
        </div>
      </motion.div>

      <div className="absolute inset-x-0 bottom-0 px-5 pb-8 md:px-10 md:pb-12">
        <div className="mx-auto flex max-w-[1720px] flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">

          {/* Le disque de laiton : les portes ouvertes, pas 50 flammes grises. */}
          <motion.div
            className="flex items-center gap-4 rounded-[18px] border border-[#BA7B39]/30 bg-[#151d19]/70 px-4 py-3.5 backdrop-blur-md sm:gap-5 md:px-5 md:py-4"
            initial={reduce ? false : { opacity: 0, y: 26, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1.1, ease: EASE, delay: 0.15 }}
          >
            <div className="relative h-[76px] w-[76px] shrink-0 md:h-[104px] md:w-[104px]">
              <svg viewBox="0 0 110 110" className="h-full w-full -rotate-90">
                <circle cx="55" cy="55" r={rayon} fill="rgba(21,29,25,0.45)" stroke="rgba(238,231,219,0.18)" strokeWidth="3" />
                <circle
                  cx="55" cy="55" r={rayon} fill="none" stroke="#BA7B39" strokeWidth="3.5" strokeLinecap="round"
                  strokeDasharray={perimetre}
                  strokeDashoffset={perimetre * (1 - (total ? terminees / total : 0))}
                  style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.16,.8,.24,1)' }}
                />
              </svg>
              <span className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-serif text-xl leading-none text-[#EEE7DB] md:text-2xl">{pct}</span>
                <span className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-[#d9a05b]">%</span>
              </span>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#d9a05b]">
                {lang === 'FR' ? 'Expérience Ayurveda' : 'Ayurveda Experience'}
              </p>
              <p className="mt-2 max-w-[16ch] font-serif text-[clamp(1.45rem,3vw,2.4rem)] leading-[1.1] text-[#EEE7DB]">
                {lang === 'FR'
                  ? (semainesAchevees === 0
                      ? 'Huit portes vous attendent'
                      : `${semainesAchevees} porte${semainesAchevees > 1 ? 's' : ''} ouverte${semainesAchevees > 1 ? 's' : ''} sur huit`)
                  : (semainesAchevees === 0 ? 'Eight doors are waiting' : `${semainesAchevees} of eight doors opened`)}
              </p>
              <p className="mt-1.5 text-[13px] text-[#EEE7DB]/60">
                {lang === 'FR' ? `${terminees} leçons sur ${total}` : `${terminees} of ${total} lessons`}
              </p>
            </div>
          </motion.div>

          {/* La carte de reprise, avec la vraie pochette de la prochaine capsule. */}
          {reprise && (
            <motion.button
              type="button"
              onClick={reprise.onOuvrir}
              initial={reduce ? false : { opacity: 0, y: 26, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 1.1, ease: EASE, delay: 0.32 }}
              whileHover={reduce ? undefined : { y: -3 }}
              className="group flex w-full items-center gap-4 rounded-[18px] border border-[#BA7B39]/30 bg-[#151d19]/70 p-3 text-left backdrop-blur-md transition-colors hover:border-[#BA7B39]/60 lg:w-[min(30rem,42vw)]"
            >
              {reprise.vignette && (
                <img src={reprise.vignette} alt="" className="h-16 w-16 shrink-0 rounded-[12px] border border-[#BA7B39]/25 object-cover" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-[#d9a05b]">
                  {reprise.soustitre || (lang === 'FR' ? 'Reprendre' : 'Resume')}
                </span>
                <span className="mt-1 block truncate font-serif text-lg text-[#EEE7DB]">{reprise.titre}</span>
                {reprise.duree && <span className="mt-0.5 block text-[12px] text-[#EEE7DB]/50">{reprise.duree}</span>}
              </span>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#BA7B39] text-[#151d19] transition-colors group-hover:bg-[#d9a05b]">
                <i className="fa-solid fa-play ml-0.5" />
              </span>
            </motion.button>
          )}
        </div>
      </div>
    </section>
  );
};

export default SeuilVata;
