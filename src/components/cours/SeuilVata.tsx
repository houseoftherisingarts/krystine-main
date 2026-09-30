import React, { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { KenBurns, Atmosphere } from '../motion/loeuvre';
import type { Programme } from '../../pages/cours/programmes';
import type { FormatCours } from './StickerFormat';

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
  programme: Programme;
  format: FormatCours;
  image: string;
  video?: string;
  /** Une image posée à droite sur le fond vert du sceau, à la place de la photo pleine. */
  decor?: string;
  /** Fond vert uni du sceau, sans photo ni vidéo (Krystine, 30 sept. 2026 : « la simplicité »). */
  uni?: boolean;
  /** 0 à 1 : la part du parcours accomplie. Réchauffe la scène. */
  chaleur: number;
  terminees: number;
  total: number;
  semainesAchevees: number;
  lang: 'FR' | 'EN';
  reprise?: Reprise;
}

const SeuilVata: React.FC<Props> = ({ programme, format, image, video, decor, uni, chaleur, terminees, total, semainesAchevees, lang, reprise }) => {
  const fr = lang === 'FR';
  const nb = programme.chapitres.length;
  const [un, des] = fr ? programme.unite.fr : programme.unite.en;
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
    // Une bannière posée dans la page, coins arrondis, à peu près la moitié de
    // l'écran (Krystine, 29 sept. 2026 : « trop grosse »). Le contenu suit le
    // flux normal : en mobile le titre, la progression et la reprise
    // s'empilent sans jamais se couvrir. `video` prendra la place de l'image
    // quand la vidéo d'automne de Krystine sera prête.
    <div className="mx-auto w-full max-w-[1720px] px-5 pt-[8.5rem] md:px-10 md:pt-40">
    <section ref={cadre} className="relative flex min-h-[440px] flex-col justify-between gap-6 overflow-hidden rounded-[18px] bg-[#151d19] p-5 shadow-[0_28px_70px_-34px_rgba(41,48,39,0.6)] md:min-h-[clamp(440px,52vh,560px)] md:p-10">
      <motion.div className="absolute inset-0" style={reduce ? undefined : { scale: echelle, y: monte }}>
        {video && !reduce ? (
          <video src={video} poster={image} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" />
        ) : uni ? (
          <div className="absolute inset-0 bg-[#3d4033]" />
        ) : decor ? (
          // Fond vert du sceau, et l'image du programme qui s'y fond à droite
          // (Krystine, 30 sept. 2026 : ni glace, ni épis, ni frise).
          <div className="absolute inset-0 bg-[#28352F]">
            <img
              src={decor} alt=""
              className="absolute inset-y-0 right-0 h-full w-full object-cover object-right opacity-80 md:w-[68%]"
              style={{ maskImage: 'linear-gradient(to right, transparent 0%, black 45%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 45%)' }}
            />
          </div>
        ) : (
          <KenBurns src={image} className="object-[28%_50%] md:object-center" />
        )}
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

      {/* La signature du programme, reprise des couvertures des documents
          (Krystine, 30 sept. 2026) : titre fin, blanc, en capitales espacées,
          et le sceau vert rond. Deux lignes de titre, jamais plus. */}
      <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(100deg, rgba(10,18,20,0.82) 0%, rgba(10,18,20,0.5) 45%, rgba(10,18,20,0.18) 80%)' }} />
      <motion.div
        className="relative flex items-start justify-between gap-6"
        initial={reduce ? false : { opacity: 0, y: 18, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 1.2, ease: EASE, delay: 0.05 }}
      >
        <div>
          <p className="text-[10px] font-light uppercase tracking-[0.42em] text-[#EEE7DB]/85 md:text-[12px]">
            {fr ? 'L’Expérience Ayurveda' : 'The Ayurveda Experience'}
          </p>
          <h1 className="mt-3 font-sans text-[clamp(2.2rem,5vw,4.4rem)] font-extralight uppercase leading-[1] tracking-[0.14em] text-[#F7F3EA]">
            {fr ? 'Saison Vata' : 'Vata Season'}
          </h1>
          <span className="mt-4 block h-px w-[min(18rem,60%)] bg-[#EEE7DB]/60" aria-hidden />
        </div>
        {/* Le sceau vert des couvertures */}
        <div aria-hidden className="hidden shrink-0 flex-col items-center justify-center rounded-full bg-[#74775f] text-center text-[#F7F3EA] shadow-[0_18px_40px_-18px_rgba(0,0,0,0.7)] sm:flex sm:h-[150px] sm:w-[150px] md:h-[172px] md:w-[172px]">
          <span className="text-[8px] font-light uppercase tracking-[0.18em] md:text-[9px]">L’Expérience</span>
          <span className="mt-0.5 text-[13px] font-medium uppercase tracking-[0.12em] md:text-[15px]">Ayurveda</span>
          <span className="text-[9px] font-light uppercase tracking-[0.16em] md:text-[10px]">Saison Vata</span>
          <img src="/compte/signature-krystine-or.webp" alt="" className="mt-2 h-5 w-auto opacity-90 md:h-6" />
        </div>
      </motion.div>

      <div className="relative flex flex-col gap-3 md:gap-6 lg:flex-row lg:items-end lg:justify-between">
          {/* Le disque de laiton : les portes ouvertes, pas 50 flammes grises. */}
          <motion.div
            className="flex items-center gap-4 rounded-[18px] border border-[#BA7B39]/30 bg-[#151d19]/70 px-4 py-3.5 backdrop-blur-md sm:gap-5 md:px-5 md:py-4"
            initial={reduce ? false : { opacity: 0, y: 26, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1.1, ease: EASE, delay: 0.15 }}
          >
            <div className="relative h-[64px] w-[64px] shrink-0 md:h-[88px] md:w-[88px]">
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
                {fr ? programme.surtitre.fr : programme.surtitre.en}
              </p>
              <p className="mt-1.5 max-w-[16ch] font-serif text-[clamp(1.3rem,2.4vw,2rem)] leading-[1.1] text-[#EEE7DB]">
                {fr
                  ? (semainesAchevees === 0
                      ? `${nb} ${des} vous attendent`
                      : `${semainesAchevees} ${semainesAchevees > 1 ? des : un} ${semainesAchevees > 1 ? 'ouvertes' : 'ouverte'} sur ${nb}`)
                  : (semainesAchevees === 0 ? `${nb} ${des} are waiting` : `${semainesAchevees} of ${nb} ${des} opened`)}
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
    </section>
    </div>
  );
};

export default SeuilVata;
