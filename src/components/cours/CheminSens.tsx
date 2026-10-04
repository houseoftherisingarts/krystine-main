import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { SemaineVata } from '../../pages/vata/semaines';
import type { Programme } from '../../pages/cours/programmes';

// Le chemin des huit portes de la perception : chaque semaine devient une grande carte portrait
// avec sa photo, et les cartes montent en cascade quand elles entrent dans
// l'écran. Remplace la liste de semaines en petites capitales et le rail de
// cinquante flammes grises, illisible en desktop et cassé en mobile.

const EASE = [0.16, 0.8, 0.24, 1] as const;

export interface EtatSemaine {
  terminees: number;
  total: number;
  verrouillee: boolean;
  /** La date d'ouverture d'une semaine fermée (« 12 octobre »), si elle est connue. */
  ouvertureLe?: string;
}

interface Props {
  programme: Programme;
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
  const barree = !!etat?.verrouillee;
  const part = total > 0 ? faites / total : 0;

  return (
    <motion.button
      type="button"
      onClick={onOuvrir}
      initial={reduce ? false : { opacity: 0, y: 40, filter: 'blur(5px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.95, ease: EASE, delay: Math.min(index, 5) * 0.09 }}
      whileHover={reduce ? undefined : { y: -6 }}
      className={`group relative block ${s.etiquette ? 'aspect-[16/9] sm:aspect-[16/5]' : 'aspect-[3/4]'} w-full shrink-0 overflow-hidden rounded-[20px] border text-left transition-colors duration-500 ${
        active ? 'border-[#BA7B39]' : 'border-[#EEE7DB]/15 hover:border-[#BA7B39]/70'
      }`}
    >
      {s.image ? (
        <img
          src={s.etiquette ? s.bandeau : s.image}
          alt=""
          loading={index < 3 ? 'eager' : 'lazy'}
          className={`absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.05] ${
            finie ? '' : 'saturate-[0.92]'
          }`}
        />
      ) : (
        <span aria-hidden className="absolute inset-0 transition-transform duration-[1200ms] ease-out group-hover:scale-[1.05]" style={{ background: `linear-gradient(160deg, ${s.couleur.vive} 0%, ${s.couleur.encre} 100%)` }} />
      )}
      <span
        aria-hidden
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(13,17,15,0.96) 2%, rgba(13,17,15,0.88) 30%, rgba(13,17,15,0.42) 58%, rgba(13,17,15,0.06) 86%)' }}
      />

      <span className="absolute left-4 top-4 flex items-center gap-2">
        <span className="flex h-9 items-center justify-center whitespace-nowrap rounded-full border border-[#BA7B39]/50 bg-[#0d110f]/80 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#d9a05b] backdrop-blur-sm">
          {s.etiquette
            ? (lang === 'FR' ? s.etiquette.fr : s.etiquette.en)
            : s.rang === 0
              ? 'Introduction'
              : `${lang === 'FR' ? 'Semaine' : 'Week'} ${s.rang}`}
        </span>
        {finie && (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#BA7B39] text-[#151d19]">
            <i className="fa-solid fa-check text-[13px]" />
          </span>
        )}
        {barree && (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0d110f]/80 text-[#d9a05b] backdrop-blur-sm">
            <i className="fa-solid fa-lock text-[12px]" />
          </span>
        )}
      </span>

      <span className="absolute inset-x-0 bottom-0 block p-4 md:p-5">
        <span className="block font-serif text-[clamp(1.35rem,1.7vw,1.75rem)] leading-[1.1] text-[#EEE7DB]">
          {lang === 'FR' ? s.sens.fr : s.sens.en}
        </span>
        <span className="mt-2 hidden text-[13px] leading-[1.45] text-[#EEE7DB]/80 line-clamp-3 sm:block">
          {lang === 'FR' ? s.promesse.fr : s.promesse.en}
        </span>
        <span className="mt-3.5 block h-[3px] w-full overflow-hidden rounded-full bg-[#EEE7DB]/15">
          <span
            className="block h-full rounded-full bg-[#BA7B39] transition-[width] duration-1000 ease-out"
            style={{ width: `${Math.round(part * 100)}%` }}
          />
        </span>
        <span className="mt-2 block text-[10px] font-bold uppercase tracking-[0.22em] text-[#d9a05b]/80">
          {barree
            ? (etat?.ouvertureLe
                ? (lang === 'FR' ? `S’ouvre le ${etat.ouvertureLe}` : `Opens ${etat.ouvertureLe}`)
                : (lang === 'FR' ? 'S’ouvre bientôt' : 'Opens soon'))
            : total > 0
              ? `${faites}/${total} ${lang === 'FR' ? 'leçons' : 'lessons'}`
              : lang === 'FR' ? 'À venir' : 'Coming'}
        </span>
      </span>
    </motion.button>
  );
};

const CheminSens: React.FC<Props> = ({ programme, etats, courante, lang, onOuvrir }) => (
  <section className="pt-16 pb-4 md:pt-20">
    <div className="mx-auto flex max-w-[1720px] flex-col gap-2 px-5 md:px-10">
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#8B4A2F] dark:text-[#d9a05b]">
        {lang === 'FR' ? programme.chemin.etiquette.fr : programme.chemin.etiquette.en}
      </p>
      <h2 className="max-w-[24ch] font-serif text-[clamp(1.9rem,3.4vw,2.7rem)] leading-[1.08] text-[#293027] dark:text-[#EEE7DB]">
        {lang === 'FR' ? programme.chemin.titre.fr : programme.chemin.titre.en}
      </h2>
    </div>

    {/* Une grille rangée, dans l'ordre : Introduction, puis Semaine 1 à 7,
        quatre par ligne, sans décalage (Krystine, 29 sept. 2026). */}
    <div className="mx-auto mt-8 grid max-w-[1720px] grid-cols-2 gap-4 px-5 md:px-10 lg:grid-cols-4 lg:gap-6">
      {programme.chapitres.map((s, i) => (
        <div key={s.rang} className={s.etiquette ? 'col-span-2 lg:col-span-4' : ''}>
          <Carte
            s={s} etat={etats[s.rang]} active={courante === s.rang}
            lang={lang} index={i} onOuvrir={() => onOuvrir(s.rang)}
          />
        </div>
      ))}
    </div>
  </section>
);

export default CheminSens;
