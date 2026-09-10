import React, { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { SEMAINES_VATA, type SemaineVata } from '../../pages/vata/semaines';

// Le chemin des huit sens : chaque semaine devient une grande carte portrait
// avec sa photo. En desktop le rail glisse horizontalement pendant que la page
// descend, en mobile les cartes s'empilent. Remplace la liste de semaines en
// petites capitales et le rail de cinquante flammes grises.

const EASE = [0.16, 0.8, 0.24, 1] as const;

export interface EtatSemaine {
  terminees: number;
  total: number;
  verrouillee: boolean;
}

interface Props {
  etats: Record<number, EtatSemaine>;
  courante: number;          // le rang de la semaine ouverte, -1 sinon
  lang: 'FR' | 'EN';
  onOuvrir: (rang: number) => void;
}

const Carte: React.FC<{
  s: SemaineVata;
  etat?: EtatSemaine;
  active: boolean;
  lang: 'FR' | 'EN';
  onOuvrir: () => void;
  index: number;
}> = ({ s, etat, active, lang, onOuvrir, index }) => {
  const reduce = useReducedMotion();
  const total = etat?.total ?? 0;
  const faites = etat?.terminees ?? 0;
  const finie = total > 0 && faites >= total;
  const part = total > 0 ? faites / total : 0;

  return (
    <motion.button
      type="button"
      onClick={onOuvrir}
      layoutId={`semaine-vata-${s.rang}`}
      initial={reduce ? false : { opacity: 0, y: 40, filter: 'blur(5px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.95, ease: EASE, delay: Math.min(index, 5) * 0.09 }}
      whileHover={reduce ? undefined : { y: -6 }}
      className={`group relative block aspect-[3/4] w-full shrink-0 overflow-hidden rounded-[20px] border text-left transition-colors duration-500 ${
        active ? 'border-[#BA7B39]' : 'border-[#EEE7DB]/15 hover:border-[#BA7B39]/70'
      }`}
    >
      <img
        src={s.image}
        alt=""
        loading={index < 3 ? 'eager' : 'lazy'}
        className={`absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.05] ${
          finie ? '' : 'saturate-[0.92]'
        }`}
      />
      <span
        aria-hidden
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(15,20,17,0.93) 4%, rgba(15,20,17,0.55) 38%, rgba(15,20,17,0.08) 72%)' }}
      />

      <span className="absolute left-4 top-4 flex items-center gap-2">
        <span className="flex h-9 min-w-[2.25rem] items-center justify-center rounded-full border border-[#BA7B39]/45 bg-[#151d19]/60 px-2 font-serif text-sm text-[#d9a05b] backdrop-blur-sm">
          {s.roman}
        </span>
        {finie && (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#BA7B39] text-[#151d19]">
            <i className="fa-solid fa-check text-[13px]" />
          </span>
        )}
      </span>

      <span className="absolute inset-x-0 bottom-0 block p-4 md:p-5">
        <span className="block font-serif text-[clamp(1.35rem,1.7vw,1.75rem)] leading-[1.1] text-[#EEE7DB]">
          {lang === 'FR' ? s.sens.fr : s.sens.en}
        </span>
        <span className="mt-2 block text-[12.5px] leading-snug text-[#EEE7DB]/62 line-clamp-3">
          {lang === 'FR' ? s.promesse.fr : s.promesse.en}
        </span>
        <span className="mt-3.5 block h-[3px] w-full overflow-hidden rounded-full bg-[#EEE7DB]/15">
          <span
            className="block h-full rounded-full bg-[#BA7B39] transition-[width] duration-1000 ease-out"
            style={{ width: `${Math.round(part * 100)}%` }}
          />
        </span>
        <span className="mt-2 block text-[10px] font-bold uppercase tracking-[0.22em] text-[#d9a05b]/80">
          {total > 0
            ? `${faites}/${total} ${lang === 'FR' ? 'leçons' : 'lessons'}`
            : lang === 'FR' ? 'À venir' : 'Coming'}
        </span>
      </span>
    </motion.button>
  );
};

const CheminSens: React.FC<Props> = ({ etats, courante, lang, onOuvrir }) => {
  const reduce = useReducedMotion();
  const piste = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: piste, offset: ['start start', 'end end'] });
  // Huit cartes de 26rem : le rail glisse d'un peu plus de la moitié.
  const x = useTransform(scrollYProgress, [0, 1], ['0%', '-62%']);

  const titre = (
    <div className="mx-auto flex max-w-[1720px] flex-col gap-2 px-5 md:px-10">
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#8B4A2F] dark:text-[#d9a05b]">
        {lang === 'FR' ? 'Le chemin des sens' : 'The path of the senses'}
      </p>
      <h2 className="max-w-[24ch] font-serif text-[clamp(1.9rem,3.4vw,2.7rem)] leading-[1.08] text-[#293027] dark:text-[#EEE7DB]">
        {lang === 'FR' ? 'Une porte se referme à la fois' : 'One door closes at a time'}
      </h2>
    </div>
  );

  return (
    <>
      {/* Desktop : le rail qui glisse pendant que la page descend. */}
      <section ref={piste} className="relative hidden h-[280vh] lg:block">
        <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden pt-24">
          {titre}
          <motion.div
            className="mt-8 flex gap-6 px-10"
            style={reduce ? undefined : { x }}
          >
            {SEMAINES_VATA.map((s, i) => (
              <div key={s.rang} className="w-[26rem] shrink-0">
                <Carte
                  s={s} etat={etats[s.rang]} active={courante === s.rang}
                  lang={lang} index={i} onOuvrir={() => onOuvrir(s.rang)}
                />
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Mobile et tablette : les cartes s'empilent, deux par rangée si la place y est. */}
      <section className="pt-14 lg:hidden">
        {titre}
        <div className="mx-auto mt-6 grid max-w-[1720px] grid-cols-1 gap-5 px-5 sm:grid-cols-2 md:px-10">
          {SEMAINES_VATA.map((s, i) => (
            <Carte
              key={s.rang} s={s} etat={etats[s.rang]} active={courante === s.rang}
              lang={lang} index={i} onOuvrir={() => onOuvrir(s.rang)}
            />
          ))}
        </div>
      </section>
    </>
  );
};

export default CheminSens;
