import React, { useEffect, useRef, useState } from 'react';
import { animate, motion, AnimatePresence, useInView, useReducedMotion, useTransform, useMotionTemplate, useMotionValue } from 'framer-motion';
import { ChevronDown, X } from 'lucide-react';
import { Reveal, Parallax } from '../../components/motion/loeuvre';
import {
  SECTION2,
  BIENVENUE,
  PORTES_INTRO,
  SECTION5,
  SECTION7,
  CONTENU,
  FAQ,
} from './content';
import AllumetteDuFoyer from './AllumetteDuFoyer';
import { Cta } from './Cta';

/**
 * Le Foyer d'Origine · sections de CORPS (copie du doc « PAGE DE VENTE FINALE »).
 * Hero, préloader, offre et appel final vivent dans FoyerPage.
 * Refonte du 25 août 2026 : page chaude et claire, une seule scène sombre
 * (Varanasi) entre le hero et l'offre, échelle typographique fyLabel → fyNum
 * (index.html), colonnes de 60 à 75 caractères, une matière réelle par section.
 */

const ease = [0.16, 0.8, 0.24, 1] as const;

/* ── Séparateur doré : le filet se trace, le losange se pose, les brins
   poussent (même langage que le préloader) ── */
const Ornament: React.FC<{ on?: 'dark' | 'light'; motto?: boolean; className?: string }> = ({
  on = 'light',
  motto = false,
  className = '',
}) => {
  const stroke = on === 'dark' ? '#bb9a5e' : '#7d6330';
  const reduce = useReducedMotion();
  const anim = !reduce;
  return (
    <motion.div
      className={`flex flex-col items-center gap-4 ${className}`}
      aria-hidden
      initial={anim ? 'hide' : undefined}
      whileInView={anim ? 'show' : undefined}
      viewport={{ once: true, margin: '-60px' }}
    >
      <svg width="220" height="18" viewBox="0 0 220 18" fill="none">
        <motion.line
          x1="0" y1="9" x2="88" y2="9" stroke={stroke} strokeWidth="1"
          variants={{ hide: { pathLength: 0, opacity: 0 }, show: { pathLength: 1, opacity: 0.55, transition: { duration: 0.9, ease } } }}
        />
        <motion.line
          x1="220" y1="9" x2="132" y2="9" stroke={stroke} strokeWidth="1"
          variants={{ hide: { pathLength: 0, opacity: 0 }, show: { pathLength: 1, opacity: 0.55, transition: { duration: 0.9, ease } } }}
        />
        <motion.rect
          x="105.5" y="4.5" width="9" height="9" transform="rotate(45 110 9)" stroke={stroke} strokeWidth="1.1"
          style={{ transformOrigin: '110px 9px' }}
          variants={{ hide: { opacity: 0, scale: 0 }, show: { opacity: 1, scale: 1, transition: { duration: 0.6, ease, delay: 0.55 } } }}
        />
        <motion.path
          d="M96 9c-3-4-7-5-10-4 2 3 6 5 10 4Z" fill={stroke}
          variants={{ hide: { opacity: 0 }, show: { opacity: 0.7, transition: { duration: 0.5, ease, delay: 0.75 } } }}
        />
        <motion.path
          d="M124 9c3-4 7-5 10-4-2 3-6 5-10 4Z" fill={stroke}
          variants={{ hide: { opacity: 0 }, show: { opacity: 0.7, transition: { duration: 0.5, ease, delay: 0.75 } } }}
        />
      </svg>
      {motto && (
        <motion.p
          className={`font-sans text-fyLabel uppercase ${on === 'dark' ? 'text-brass' : 'text-brassInk'}`}
          variants={{ hide: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease, delay: 0.7 } } }}
        >
          Observer · Ressentir · Accueillir
        </motion.p>
      )}
    </motion.div>
  );
};

const Eyebrow: React.FC<{ children: React.ReactNode; on?: 'dark' | 'light' }> = ({ children, on = 'light' }) => (
  <div className="flex flex-col gap-3">
    <span className="block h-px w-12 bg-brass" aria-hidden />
    <p className={`font-sans text-fyLabel uppercase ${on === 'dark' ? 'text-brass' : 'text-brassInk'}`}>{children}</p>
  </div>
);

/* Titre de section : deux lignes au plus, équilibrées par text-wrap */
const SectionTitle: React.FC<{ children: React.ReactNode; on?: 'dark' | 'light'; className?: string }> = ({
  children,
  on = 'light',
  className = '',
}) => (
  <h2
    className={`fy-h font-serif font-medium uppercase tracking-[0.03em] text-fyH2 ${
      on === 'dark' ? 'text-ctext' : 'text-ink'
    } ${className}`}
  >
    {children}
  </h2>
);

/* ═══════════ Le calendrier des douze portes ═══════════ */
const IMG_W = 1672;
const IMG_H = 941;
const HEARTH = { left: 643 / IMG_W, top: 235 / IMG_H, width: 385 / IMG_W, height: 498 / IMG_H };

interface Porte {
  n: string;
  mois: string;
  b: [number, number, number, number];
  src: string;
  mouvement: string;
  theme: string;
  question: string;
}
const PORTES: Porte[] = [
  { n: 'septembre', mois: 'Septembre', b: [88, 143, 334, 404], src: 'porte-sept-cutout', mouvement: 'Le rythme change', theme: 'Revenir à son propre rythme', question: 'Et si le premier signe que nous allons trop vite n’était pas celui que nous croyons?' },
  { n: 'octobre', mois: 'Octobre', b: [333, 128, 577, 404], src: 'porte-octobre-cutout', mouvement: 'La nature se dépouille', theme: 'Élaguer pour voir', question: 'Certaines choses prennent de la place longtemps après avoir cessé de nous nourrir.' },
  { n: 'novembre', mois: 'Novembre', b: [88, 406, 334, 662], src: 'porte-novembre-cutout', mouvement: 'La lumière diminue', theme: 'Nourrir ce qui compte', question: 'Tout ce qui nous réchauffe ne nous nourrit pas forcément de la même façon.' },
  { n: 'decembre', mois: 'Décembre', b: [333, 406, 577, 662], src: 'porte-decembre-cutout', mouvement: 'Fin de cycle', theme: 'Choisir ce que l’on emporte', question: 'Tout ne mérite pas de nous suivre dans l’année qui vient.' },
  { n: 'janvier', mois: 'Janvier', b: [88, 641, 334, 907], src: 'porte-janvier-cutout', mouvement: 'Après le trop-plein', theme: 'Recommencer sans se trahir', question: 'Et si recommencer ne demandait pas de devenir quelqu’un d’autre?' },
  { n: 'fevrier', mois: 'Février', b: [333, 638, 577, 907], src: 'porte-fevrier-cutout', mouvement: 'L’hiver est encore là', theme: 'Habiter ce qui est déjà là', question: 'Ce qui nous soutient le plus devient parfois invisible simplement parce qu’il est familier.' },
  { n: 'mars', mois: 'Mars', b: [1086, 128, 1330, 404], src: 'porte-mars-cutout', mouvement: 'La saison recommence à bouger', theme: 'Réveiller sans brusquer', question: 'Le retour de l’élan n’est pas toujours une invitation à accélérer.' },
  { n: 'avril', mois: 'Avril', b: [1328, 143, 1572, 404], src: 'porte-avril-cutout', mouvement: 'La poussée reprend', theme: 'Choisir ce qui mérite de grandir', question: 'Tout ce qui peut grandir ne mérite pas forcément que nous le nourrissions.' },
  { n: 'mai', mois: 'Mai', b: [1086, 408, 1330, 662], src: 'porte-mai-cutout', mouvement: 'Tout s’ouvre autour de nous', theme: 'Ouvrir sans se disperser', question: 'Quand tout nous attire en même temps, comment reconnaître ce qui mérite réellement notre attention?' },
  { n: 'juin', mois: 'Juin', b: [1328, 406, 1572, 662], src: 'porte-juin-cutout', mouvement: 'La lumière s’étire', theme: 'Recevoir ce qui est là', question: 'Et si, parfois, ce qui est là n’avait besoin de rien de plus?' },
  { n: 'juillet', mois: 'Juillet', b: [1086, 641, 1330, 907], src: 'porte-juillet-cutout', mouvement: 'La saison est abondante', theme: 'Habiter la pleine saison', question: 'Pourquoi avons-nous parfois tant de mal à simplement profiter de ce qui est là?' },
  { n: 'aout', mois: 'Août', b: [1328, 638, 1572, 907], src: 'porte-aout-cutout', mouvement: 'La lumière change déjà', theme: 'Savoir ce que l’on laisse', question: 'Et si avancer demandait parfois moins de décider où aller que de reconnaître ce qui est terminé?' },
];
const MENU_BOX: [number, number, number, number] = [1520, 42, 1620, 130];
const zone = (b: [number, number, number, number]) => ({
  left: `${(b[0] / IMG_W) * 100}%`,
  top: `${(b[1] / IMG_H) * 100}%`,
  width: `${((b[2] - b[0]) / IMG_W) * 100}%`,
  height: `${((b[3] - b[1]) / IMG_H) * 100}%`,
});

/* Halo de lumière : carte dorée qui naît d'un point de l'image */
const Halo: React.FC<{
  originPct: [number, number];
  onClose: () => void;
  label: string;
  children: React.ReactNode;
}> = ({ originPct, onClose, label, children }) => (
  <motion.div
    role="dialog"
    aria-label={label}
    className="absolute z-50 w-[min(600px,86%)]"
    initial={{ left: `${originPct[0]}%`, top: `${originPct[1]}%`, scale: 0.22, opacity: 0 }}
    animate={{ left: '50%', top: '50%', scale: 1, opacity: 1 }}
    exit={{ left: `${originPct[0]}%`, top: `${originPct[1]}%`, scale: 0.22, opacity: 0 }}
    transition={{ duration: 0.85, ease }}
    style={{ x: '-50%', y: '-50%' }}
  >
    <div
      className="relative rounded-[30px] px-8 py-10 text-center md:px-12"
      style={{
        background: 'radial-gradient(circle at 50% 24%, #fffdf7 0%, #fbf2dd 58%, #f4e3b8 100%)',
        boxShadow:
          '0 0 60px 22px rgba(220,184,116,0.5), 0 0 140px 60px rgba(220,184,116,0.28), 0 18px 50px rgba(22,16,10,0.25)',
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Refermer"
        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full text-espresso/70 transition-colors hover:bg-espresso/10 hover:text-espresso focus:outline-none focus-visible:ring-2 focus-visible:ring-brassInk"
      >
        <X size={18} />
      </button>
      {children}
    </div>
  </motion.div>
);

const CalendrierAnnee: React.FC = () => {
  const [hoverDoor, setHoverDoor] = useState<string | null>(null);
  const [openDoor, setOpenDoor] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const ouverte = PORTES.find((d) => d.n === openDoor) ?? null;
  useEffect(() => {
    if (!openDoor && !helpOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenDoor(null);
        setHelpOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openDoor, helpOpen]);

  return (
    <div className="relative w-full">
      <img
        src="/foyer/calendrier-annee.webp"
        alt="Le calendrier des douze portes du Foyer d'Origine, l'âtre allumé au centre"
        width={IMG_W}
        height={IMG_H}
        loading="lazy"
        className="block h-auto w-full"
      />
      <video
        src="/foyer/atre-feu.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden
        className="pointer-events-none absolute object-cover"
        style={{
          left: `${HEARTH.left * 100}%`,
          top: `${HEARTH.top * 100}%`,
          width: `${HEARTH.width * 100}%`,
          height: `${HEARTH.height * 100}%`,
          maskImage: 'radial-gradient(ellipse 43% 45% at 50% 46%, black 88%, transparent 99%)',
          WebkitMaskImage: 'radial-gradient(ellipse 43% 45% at 50% 46%, black 88%, transparent 99%)',
        }}
      />
      {PORTES.map((d) => {
        const isOpen = openDoor === d.n;
        const isHover = hoverDoor === d.n && !isOpen;
        return (
          <React.Fragment key={d.n}>
            <motion.span
              aria-hidden
              className="absolute z-10 rounded-t-[46%] rounded-b-xl"
              style={{
                ...zone(d.b),
                transform: 'scale(0.84)',
                background:
                  'radial-gradient(60% 55% at 50% 58%, rgba(199,132,44,0.55), rgba(42,26,16,0.96) 78%)',
              }}
              animate={{ opacity: isOpen ? 1 : 0 }}
              transition={{ duration: 0.8, ease }}
            />
            <motion.span
              aria-hidden
              className="pointer-events-none absolute z-20"
              style={{
                ...zone(d.b),
                background:
                  'radial-gradient(50% 50% at 50% 50%, rgba(220,184,116,0.65), rgba(199,132,44,0.25) 55%, transparent 78%)',
                filter: 'blur(16px)',
                transform: 'scale(1.3)',
              }}
              animate={{ opacity: isHover ? 1 : 0 }}
              transition={{ duration: 0.45, ease }}
            />
            <motion.img
              src={`/foyer/${d.src}.webp`}
              alt=""
              aria-hidden
              loading="lazy"
              className="pointer-events-none absolute z-30"
              style={{ ...zone(d.b), transformOrigin: 'left center', transformPerspective: 700 }}
              animate={
                isOpen
                  ? { rotateY: -64, scale: 1, filter: 'brightness(0.94) drop-shadow(18px 10px 28px rgba(22,16,10,0.55))' }
                  : isHover
                    ? { rotateY: 0, scale: 1.06, filter: 'brightness(1.1) drop-shadow(0 8px 28px rgba(199,132,44,0.8))' }
                    : { rotateY: 0, scale: 1, filter: 'brightness(1) drop-shadow(0 0px 0px rgba(22,16,10,0))' }
              }
              transition={{ duration: isOpen ? 1.5 : 0.5, ease }}
            />
            <button
              type="button"
              onClick={() => {
                setHelpOpen(false);
                setOpenDoor(isOpen ? null : d.n);
              }}
              onMouseEnter={() => setHoverDoor(d.n)}
              onMouseLeave={() => setHoverDoor(null)}
              aria-expanded={isOpen}
              aria-label={isOpen ? `Refermer la porte de ${d.mois}` : `Ouvrir la porte de ${d.mois}`}
              className="absolute z-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brass"
              style={zone(d.b)}
            />
          </React.Fragment>
        );
      })}
      {/* l'icône menu de l'image : un mot sur la façon d'explorer */}
      <button
        type="button"
        onClick={() => {
          setOpenDoor(null);
          setHelpOpen((v) => !v);
        }}
        aria-expanded={helpOpen}
        aria-label="Comment explorer le calendrier"
        className="absolute z-40 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brass"
        style={zone(MENU_BOX)}
      />
      <span className="absolute bottom-4 left-1/2 -translate-x-1/2 font-sans text-fyLabel uppercase text-brassInk">
        {ouverte ? ouverte.mois : 'Ouvrir une porte'}
      </span>

      <AnimatePresence>
        {ouverte && (
          <Halo
            key={ouverte.n}
            originPct={[((ouverte.b[0] + ouverte.b[2]) / 2 / IMG_W) * 100, ((ouverte.b[1] + ouverte.b[3]) / 2 / IMG_H) * 100]}
            onClose={() => setOpenDoor(null)}
            label={`${ouverte.mois} : ${ouverte.theme}`}
          >
            <p className="font-sans text-fyLabel uppercase text-brassInk">
              {ouverte.mois} · {ouverte.mouvement}
            </p>
            <h3 className="fy-h mt-4 font-serif font-medium text-fyH3 text-espresso">{ouverte.theme}</h3>
            <p className="mt-4 font-sans text-fyBody text-ink">{ouverte.question}</p>
            <a
              href="/liste-attente?programme=foyer"
              className="mt-6 inline-block border-b border-brassInk/60 pb-1 font-sans text-fyLabel uppercase text-brassInk transition-colors hover:text-espresso focus:outline-none focus-visible:ring-2 focus-visible:ring-brassInk"
            >
              {PORTES_INTRO.cta}
            </a>
          </Halo>
        )}
        {helpOpen && (
          <Halo
            key="aide"
            originPct={[((MENU_BOX[0] + MENU_BOX[2]) / 2 / IMG_W) * 100, ((MENU_BOX[1] + MENU_BOX[3]) / 2 / IMG_H) * 100]}
            onClose={() => setHelpOpen(false)}
            label="Comment explorer le calendrier"
          >
            <p className="font-sans text-fyLabel uppercase text-brassInk">Une année à découvrir</p>
            <h3 className="fy-h mt-4 font-serif font-medium text-fyH3 text-espresso">Douze portes, un même feu</h3>
            <p className="mt-4 font-sans text-fyBody text-ink">
              Chaque porte porte un mois de l’année. Ouvrez celle qui vous appelle : elle révèle le
              mouvement de la saison, le thème du mois et la question qui l’ouvre.
            </p>
          </Halo>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ═══════════ La fleur du Foyer : racines Ayurveda, huit pétales ═══════════ */
const FLEUR_W = 1536;
const FLEUR_H = 1024;
interface Petale {
  n: string;
  b: [number, number, number, number];
}
const PETALES: Petale[] = [
  { n: 'Plantes médicinales', b: [608, 30, 900, 330] },
  { n: 'Aromathérapie', b: [860, 100, 1160, 380] },
  { n: 'Ingrédients', b: [900, 330, 1270, 550] },
  { n: 'Respiration', b: [880, 470, 1170, 740] },
  { n: 'Méditation', b: [740, 560, 990, 860] },
  { n: 'Histoires', b: [440, 480, 750, 800] },
  { n: 'Œuvres', b: [290, 350, 650, 580] },
  { n: 'Sages', b: [380, 130, 690, 400] },
  { n: 'Le thème du mois', b: [615, 315, 920, 595] },
];
const pzone = (b: [number, number, number, number]) => ({
  left: `${(b[0] / FLEUR_W) * 100}%`,
  top: `${(b[1] / FLEUR_H) * 100}%`,
  width: `${((b[2] - b[0]) / FLEUR_W) * 100}%`,
  height: `${((b[3] - b[1]) / FLEUR_H) * 100}%`,
});

const FleurDuFoyer: React.FC = () => {
  const [hover, setHover] = useState<string | null>(null);
  return (
    <div className="relative w-full">
      <img
        src="/foyer/fleur-foyer.webp"
        alt="La fleur du Foyer : l'Ayurveda en racines, huit pétales autour du thème du mois"
        width={FLEUR_W}
        height={FLEUR_H}
        loading="lazy"
        className="block h-auto w-full"
      />
      {PETALES.map((p) => (
        <div
          key={p.n}
          aria-hidden
          className="absolute z-10"
          style={pzone(p.b)}
          onMouseEnter={() => setHover(p.n)}
          onMouseLeave={() => setHover(null)}
        >
          <motion.span
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(50% 50% at 50% 50%, rgba(220,184,116,0.6), rgba(199,132,44,0.22) 55%, transparent 78%)',
              filter: 'blur(14px)',
              transform: 'scale(1.25)',
            }}
            animate={{ opacity: hover === p.n ? 1 : 0 }}
            transition={{ duration: 0.45, ease }}
          />
        </div>
      ))}
    </div>
  );
};

/* ═══════════ Progression maison : la position d'un bloc dans l'écran, de 0
   (son haut entre par le bas) à 1 (son centre atteint la hauteur voulue).
   useScroll({ target }) mesure mal dans cette page, on lit le rect nous-mêmes. ═══════════ */
const useProgression = (ref: React.RefObject<HTMLElement | null>, fin = 0.45) => {
  const p = useMotionValue(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      const r = el.getBoundingClientRect();
      const h = window.innerHeight;
      const depart = h * 0.96;
      const arrivee = h * fin - r.height / 2;
      const v = (depart - r.top) / Math.max(1, depart - arrivee);
      p.set(Math.min(1, Math.max(0, v)));
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [ref, fin, p]);
  return p;
};

/* ═══════════ Le kicker qui se met au point : « Plus on nous montre, moins
   on voit. » arrive flou et se précise au fil du défilement, une seule fois,
   lié au scroll (jamais sur minuterie). ═══════════ */
const KickerFocus: React.FC<{ text: string }> = ({ text }) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const scrollYProgress = useProgression(ref, 0.45);
  const blur = useTransform(scrollYProgress, [0, 1], [18, 0]);
  const filter = useTransform(blur, (b) => `blur(${b}px)`);
  const opacity = useTransform(scrollYProgress, [0, 1], [0.12, 1]);
  const scale = useTransform(scrollYProgress, [0, 1], [1.06, 1]);
  return (
    <div ref={ref} className="px-6 py-28 md:px-12 md:py-40 lg:px-20">
      <motion.p
        className="fy-h mx-auto max-w-[18ch] text-center font-serif font-medium leading-[1] text-[clamp(2.4rem,1.6rem+4vw,5.8rem)] text-espresso"
        style={reduce ? undefined : { filter, opacity, scale }}
      >
        {text}
      </motion.p>
    </div>
  );
};

/* ═══════════ Le rythme des saisons : quatre cercles, puis le feu ═══════════ */
const SAISONS: { label: string; src: string; alt: string; video?: string }[] = [
  { label: 'Hiver', src: '/foyer/saison-hiver.webp', alt: 'Une branche nue givrée sous une lumière d’hiver' },
  { label: 'Printemps', src: '/foyer/saison-printemps.webp', alt: 'Une jeune pousse verte qui sort de la terre' },
  { label: 'Été', src: '/foyer/saison-ete.webp', alt: 'Des feuilles vertes traversées par le soleil d’été' },
  { label: 'Automne', src: '/foyer/saison-automne.webp', alt: 'Des feuilles de chêne rousses sur une branche' },
  { label: 'Et toujours le feu', src: '/foyer/firepit-poster.webp', alt: 'Le feu du Foyer', video: '/foyer/atre-feu.mp4' },
];

/* ═══════════ Les quatre ouvertures de la semaine : bande de photos en
   parallaxe, chaque image à sa vitesse, comme une pellicule qui défile ═══════════ */
const SEMAINE = [
  { src: 'sem1-regarder', alt: 'Une tasse fumante posée sur un carnet ouvert, la lumière du matin par la fenêtre', speed: 0.1, top: 'lg:mt-24' },
  { src: 'sem2-saison', alt: 'Des bols de curcuma, de cardamome et d’épices sur une table sombre', speed: 0.26, top: 'lg:mt-0' },
  { src: 'sem3-ecrire', alt: 'Des mains qui écrivent à la plume dans un carnet de lin, une tasse posée à côté', speed: 0.16, top: 'lg:mt-36' },
  { src: 'sem4-graines', alt: 'Des têtes de graines séchées devant la lumière chaude de fin d’automne', speed: 0.32, top: 'lg:mt-10' },
] as const;

const BandeDesQuatre: React.FC = () => (
  <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4 lg:gap-8">
    {SEMAINE.map((s, i) => (
      <Reveal key={s.src} delay={i * 0.1} className={s.top}>
        <Parallax speed={s.speed} className="overflow-hidden rounded-[15px] shadow-[0_24px_60px_rgba(58,49,38,0.18)]">
          <img
            src={`/foyer/${s.src}.webp`}
            alt={s.alt}
            width={497}
            height={640}
            loading="lazy"
            className="block h-auto w-full scale-110"
          />
        </Parallax>
        <p className="mt-4 font-serif text-fyLead leading-none text-brassInk/80">{String(i + 1).padStart(2, '0')}</p>
      </Reveal>
    ))}
  </div>
);

/* ═══════════ La tache de pigment qui fleurit derrière une phrase ═══════════ */
const PIGMENTS = ['pigment-terre', 'pigment-prune', 'pigment-bleu'] as const;
const Tache: React.FC<{ n: number; className?: string }> = ({ n, className = '' }) => {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLImageElement>(null);
  /* la progression : la tache commence à naître quand elle entre par le bas,
     elle est pleine quand elle atteint le milieu de l'écran */
  const scrollYProgress = useProgression(ref, 0.42);
  const scale = useTransform(scrollYProgress, [0, 1], [0.42, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 1], [0, 0.55, 0.85]);
  /* le bord de l'eau : le rayon plein grandit, le pinceau se dissout vers l'extérieur */
  const bord = useTransform(scrollYProgress, [0, 1], [8, 55]);
  const masque = useMotionTemplate`radial-gradient(closest-side, black ${bord}%, transparent 100%)`;
  return (
    <motion.img
      ref={ref}
      aria-hidden
      src={`/foyer/${PIGMENTS[n % PIGMENTS.length]}.webp`}
      alt=""
      width={800}
      height={800}
      loading="lazy"
      className={`pointer-events-none absolute h-auto select-none ${className}`}
      style={
        reduce
          ? { mixBlendMode: 'multiply', opacity: 0.85, maskImage: 'radial-gradient(closest-side, black 55%, transparent 100%)', WebkitMaskImage: 'radial-gradient(closest-side, black 55%, transparent 100%)' }
          : { mixBlendMode: 'multiply', scale, opacity, maskImage: masque, WebkitMaskImage: masque }
      }
    />
  );
};

/* ═══════════ Le compteur : le chiffre monte jusqu'à sa valeur quand il entre ═══════════ */
const Compteur: React.FC<{ value: string }> = ({ value }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const target = Number(value);
  const [n, setN] = useState(reduce ? target : 0);
  useEffect(() => {
    if (!inView || reduce) return;
    const c = animate(0, target, { duration: 1.6, ease, onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [inView, reduce, target]);
  return (
    <span ref={ref} className="tabular-nums">
      {n}
    </span>
  );
};

/* ═══════════ FAQ ═══════════ */
const FaqRow: React.FC<{ item: (typeof FAQ)[number]; i: number; open: boolean; onClick: () => void }> = ({
  item,
  i,
  open,
  onClick,
}) => (
  <div className="border-b border-brass/25">
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-controls={`faq-panel-${i}`}
      className="group flex w-full items-start justify-between gap-6 py-7 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brassInk md:py-8"
    >
      <h3
        className={`fy-h font-serif font-medium leading-[1.2] text-[clamp(1.35rem,1.1rem+0.9vw,1.85rem)] transition-colors ${
          open ? 'text-brassInk' : 'text-ink group-hover:text-brassInk'
        }`}
      >
        <span className="mr-4 font-sans text-fyLabel tabular-nums text-brassInk/70">{String(i + 1).padStart(2, '0')}</span>
        {item.q}
      </h3>
      <ChevronDown
        aria-hidden
        className={`mt-2 h-6 w-6 shrink-0 text-brassInk transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
      />
    </button>
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          id={`faq-panel-${i}`}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.5, ease }}
          className="overflow-hidden"
        >
          <div className="max-w-[68ch] space-y-5 pb-9 md:pl-12">
            {item.a.map((p) => (
              <p key={p.slice(0, 32)} className="font-sans text-fyBody text-ink">
                {p}
              </p>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

export default function BodySections({ overlap = false }: { overlap?: boolean }) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  /* Feuilles empilées généralisées : chaque section fige (sticky, le bas
     aligné au bas de l'écran quand elle est plus haute que lui) et la
     suivante monte par-dessus, coins arrondis + ombre, comme le feu. */
  const pin = overlap ? ({ position: 'sticky' } as React.CSSProperties) : undefined;
  const cover = overlap ? 'rounded-t-[18px] shadow-[0_-26px_60px_rgba(22,16,10,0.45)]' : '';
  useEffect(() => {
    if (!overlap) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-pin-sheet]'));
    const set = () => {
      els.forEach((el) => {
        el.style.top = `${Math.min(0, window.innerHeight - el.offsetHeight)}px`;
      });
    };
    set();
    const ro = new ResizeObserver(set);
    els.forEach((el) => ro.observe(el));
    window.addEventListener('resize', set);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', set);
    };
  }, [overlap]);

  /* le titre de l'Ayurveda, sans changer un mot : le début en display,
     la suite en lead, pour que la ligne display tienne en deux lignes */
  const [titreAyurveda, suiteAyurveda] = (() => {
    const i = SECTION5.title.indexOf(' par ');
    return i > 0 ? [SECTION5.title.slice(0, i), SECTION5.title.slice(i + 1)] : [SECTION5.title, ''];
  })();

  return (
    <>
      <style>{`
        .fy-h{text-wrap:balance}
        .fy-plaster{background-color:#f3ede2;background-image:url(/foyer/texture-pierre.webp);background-size:cover;background-position:center}
      `}</style>

      {/* ═══════ SECTION 1 · Le livre : une année à découvrir, la promesse à gauche,
          le livre aux fleurs pressées à droite, la feuille monte SUR le feu ═══════ */}
      <section
        className={`overflow-hidden bg-cream ${
          overlap ? 'relative z-[9] -mt-[100vh] rounded-t-[18px] shadow-[0_-26px_60px_rgba(15,22,19,0.5)]' : 'relative'
        }`}
      >
        <div className="mx-auto w-full max-w-[1360px] px-6 py-24 md:px-12 md:py-32">
          <div className="grid gap-x-16 gap-y-12 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-6">
              <Reveal>
                <Eyebrow>{BIENVENUE.eyebrow}</Eyebrow>
                <h2 className="fy-h mt-6 max-w-[14ch] font-serif font-medium leading-[1.02] text-fyH2 text-espresso">
                  Une année à découvrir
                </h2>
                <p className="fy-h mt-8 max-w-[44ch] font-serif font-medium leading-[1.3] text-[clamp(1.2rem,1rem+0.7vw,1.45rem)] text-brassInk">
                  {BIENVENUE.promise}
                </p>
              </Reveal>
              <Reveal delay={0.12}>
                <p className="mt-8 max-w-[52ch] font-sans text-fyBody text-ink">{BIENVENUE.body}</p>
              </Reveal>
            </div>
            <Reveal delay={0.1} className="lg:col-span-6">
              <Parallax speed={0.1} className="overflow-hidden rounded-[15px] shadow-[0_34px_90px_rgba(58,49,38,0.24)]">
                <img
                  src="/foyer/livre-fleurs.webp"
                  alt="Un vieux livre ouvert, des roses séchées pressées sur ses pages, dans la lumière d'une fenêtre"
                  width={1600}
                  height={893}
                  loading="lazy"
                  className="block h-auto w-full scale-105"
                />
              </Parallax>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════ SECTION 4 · L'histoire du feu : le seul chapitre sombre de la page,
          la flamme de Varanasi pleine hauteur (scène validée, tailles ajustées) ═══════ */}
      <section
        className={`relative overflow-hidden bg-encre ${overlap ? 'z-10' : ''} ${cover}`}
      >
        <div className="grid lg:min-h-[88vh] lg:grid-cols-12">
          {/* la flamme, bord à bord */}
          <div className="relative h-[58vh] overflow-hidden lg:col-span-5 lg:h-auto">
            <img
              src="/foyer/niche-flamme.webp"
              alt="La flamme de Varanasi : une lampe de cuivre allumée dans une niche de céramique"
              width={1000}
              height={1241}
              loading="lazy"
              className="foyer-braise absolute inset-0 h-full w-full object-cover"
            />
            <span
              aria-hidden
              className="absolute inset-0"
              style={{ background: 'radial-gradient(58% 46% at 50% 52%, rgba(220,184,116,0.22), transparent 72%)' }}
            />
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-32 lg:hidden"
              style={{ background: 'linear-gradient(180deg, transparent 0%, #0f1613 100%)' }}
            />
            <span
              aria-hidden
              className="absolute inset-y-0 right-0 hidden w-24 lg:block"
              style={{ background: 'linear-gradient(90deg, transparent 0%, #0f1613 100%)' }}
            />
          </div>

          {/* le récit : une colonne de 62 caractères, jamais moins */}
          <div className="flex items-center px-6 py-20 md:px-12 md:py-28 lg:col-span-7 lg:px-20 xl:px-28">
            <div className="max-w-[62ch]">
              <Reveal>
                <Eyebrow on="dark">{SECTION2.eyebrow}</Eyebrow>
                <SectionTitle on="dark" className="mt-6">
                  {SECTION2.title}
                </SectionTitle>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="fy-h mt-10 font-serif font-medium text-fyLead text-ctext">{SECTION2.lead}</p>
              </Reveal>
              {SECTION2.paragraphs.map((p, i) => (
                <Reveal key={p.slice(0, 24)} delay={0.18 + i * 0.08}>
                  <p className="mt-7 font-sans text-fyBody text-ctextSoft">{p}</p>
                </Reveal>
              ))}
              <Reveal delay={0.34}>
                <span className="mt-12 block h-px w-16 bg-brass" aria-hidden />
                <p className="mt-7 font-serif font-medium leading-[1.32] text-[clamp(1.25rem,1.1rem+0.55vw,1.5rem)] text-brassBright">
                  <strong className="font-semibold">{SECTION2.closingLead}</strong>
                  {SECTION2.closingMid}
                  <strong className="font-semibold">{SECTION2.closingEnd}</strong>
                </p>
              </Reveal>
            </div>
          </div>
        </div>
        <style>{`
          @keyframes foyerBraise { 0%,100% { transform: scale(1); } 50% { transform: scale(1.035); } }
          .foyer-braise { animation: foyerBraise 11s ease-in-out infinite; transform-origin: 50% 55%; }
          @media (prefers-reduced-motion: reduce) { .foyer-braise { animation: none; } }
        `}</style>
      </section>

      {/* ═══════ SECTION 2 · le hook : la scène du téléphone devant le feu, puis
          les trois constats en plein jour et le kicker qui se met au point ═══════ */}
      <section className={`${overlap ? 'relative z-[11] rounded-t-[18px] shadow-[0_-26px_60px_rgba(15,22,19,0.5)]' : 'relative'}`}>
        {/* la scène, bord à bord (la photo est la seule surface sombre ici) */}
        <div className="relative h-[62vh] overflow-hidden rounded-t-[18px] bg-encre md:h-[80vh]">
          <Parallax speed={0.16} className="h-full" innerClassName="h-full">
            <img
              src="/foyer/feu-et-ecran.webp"
              alt="Une femme assise devant un feu de camp, le regard pris par l'écran de son téléphone"
              width={1920}
              height={1072}
              className="h-full w-full scale-105 object-cover"
              loading="lazy"
            />
          </Parallax>
          <span
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(90deg, rgba(15,22,19,0.9) 0%, rgba(15,22,19,0.5) 38%, rgba(15,22,19,0.06) 68%, rgba(15,22,19,0.3) 100%)',
            }}
          />
          <div className="absolute inset-0 flex items-center px-6 md:px-14 lg:px-20">
            <Reveal>
              <span className="mb-8 block h-px w-16 bg-brass" aria-hidden />
              <h2 className="fy-h max-w-[20ch] font-serif font-medium leading-[1] text-[clamp(2.4rem,1.6rem+4vw,5.8rem)] text-ctext">{BIENVENUE.title}</h2>
            </Reveal>
          </div>
        </div>

        {/* les trois constats, en plein jour : une colonne de lecture large,
            un chiffre de laiton en marge, la lumière dorée qui entre par la gauche */}
        <div className="relative overflow-hidden bg-cream">
          <span
            aria-hidden
            className="pointer-events-none absolute -left-40 top-0 h-[70vh] w-[70vw] max-w-[900px]"
            style={{ background: 'radial-gradient(closest-side, rgba(220,184,116,0.42), transparent 72%)' }}
          />
          <div className="relative mx-auto w-full max-w-[1360px] px-6 pt-24 md:px-12 md:pt-32">
            <div className="grid gap-x-16 gap-y-12 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <Reveal>
                  <Eyebrow>{BIENVENUE.eyebrow}</Eyebrow>
                </Reveal>
              </div>
              <div className="lg:col-span-8">
                {BIENVENUE.paragraphs.map((par, i) => (
                  <Reveal key={par.slice(0, 22)} delay={i * 0.1}>
                    <div className="flex items-start gap-6 border-t border-brass/30 py-8 md:gap-10 md:py-10">
                      <span className="mt-1 shrink-0 font-serif text-fyLead leading-none text-brassInk/70">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <p className={`fy-h max-w-[62ch] font-serif font-medium text-ink ${i === 0 ? 'text-fyH3' : 'leading-[1.4] text-[clamp(1.3rem,1.1rem+0.7vw,1.5rem)]'}`}>
                        {par}
                      </p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
          <KickerFocus text={BIENVENUE.kicker} />
        </div>
      </section>

      {/* ═══════ SECTION 3 · Le retournement : l'allumette qu'on frotte (scène validée) ═══════ */}
      <AllumetteDuFoyer />

      {/* ═══════ SECTION 4 · Le mur des douze portes, puis le rythme de la semaine ═══════ */}
      <section
        className={`overflow-hidden bg-cream3 pb-28 md:pb-40 ${
          overlap ? 'z-[13] rounded-t-[18px] shadow-[0_-26px_60px_rgba(15,22,19,0.5)]' : 'relative'
        }`}
        style={pin}
        data-pin-sheet
      >
        <CalendrierAnnee />

        {/* la pierre du calendrier se fond dans la page : bande de liaison + ornement */}
        <div
          aria-hidden
          className="h-20 w-full md:h-28"
          style={{ background: 'linear-gradient(180deg, #d7c9bc 0%, #ede5d7 100%)' }}
        />
        <Ornament motto className="-mt-4 mb-2" />

        {/* le rythme des saisons : quatre cercles de nature, et le feu qui ne s'éteint pas */}
        <div className="mx-auto w-full max-w-[1360px] px-6 pt-16 md:px-12 md:pt-24">
          <Reveal>
            <Eyebrow>Le rythme des saisons</Eyebrow>
          </Reveal>
          <div className="relative mt-12 grid grid-cols-2 gap-y-12 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-6">
            {/* le fil de laiton qui relie les cercles, sur grand écran */}
            <span aria-hidden className="pointer-events-none absolute left-[10%] right-[10%] top-[88px] hidden border-t border-dotted border-brass/60 lg:block" />
            {SAISONS.map((sn, i) => (
              <Reveal key={sn.label} delay={i * 0.1} className="relative flex flex-col items-center text-center">
                <div className="relative h-[150px] w-[150px] overflow-hidden rounded-full ring-1 ring-brass/50 shadow-[0_22px_50px_rgba(58,49,38,0.2)] md:h-[176px] md:w-[176px]">
                  {sn.video ? (
                    <video src={sn.video} poster={sn.src} autoPlay muted loop playsInline preload="metadata" aria-hidden className="h-full w-full object-cover" />
                  ) : (
                    <img src={sn.src} alt={sn.alt} width={800} height={800} loading="lazy" className="h-full w-full object-cover" />
                  )}
                </div>
                <span aria-hidden className="mt-6 block h-2 w-2 rounded-full bg-brass" />
                <p className="mt-5 font-sans text-fyLabel uppercase tracking-[0.22em] text-brassInk">{sn.label}</p>
              </Reveal>
            ))}
          </div>
        </div>


        {/* le rythme de la semaine : la parole à gauche, la pellicule des quatre
            ouvertures à droite, chaque photo à sa propre vitesse */}
        <div className="mx-auto w-full max-w-[1360px] px-6 pt-20 md:px-12 md:pt-28">
          <Reveal>
            <p className="font-serif font-medium text-brassInk">
              <strong className="fy-h block font-semibold text-fyDisplay text-espresso">{SECTION5.rhythmLead}</strong>
              <span className="fy-h mt-4 block max-w-[40ch] text-fyLead">{SECTION5.rhythm}</span>
            </p>
          </Reveal>
          <div className="mt-12 grid gap-x-16 gap-y-6 md:grid-cols-2">
            <Reveal delay={0.12}>
              <p className="max-w-[56ch] font-sans text-fyBody text-ink">{SECTION5.meditations}</p>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="max-w-[56ch] font-sans text-fyBody text-ink">{SECTION5.keep}</p>
            </Reveal>
          </div>
          <div className="mt-20 md:mt-28">
            <BandeDesQuatre />
          </div>
        </div>
      </section>

      {/* ═══════ SECTION 5 · Une année nourrie par l'Ayurveda : le plâtre chaud,
          la fleur (validée), puis trois phrases sur trois taches de pigment ═══════ */}
      <section className={`fy-plaster relative overflow-hidden py-24 md:py-36 ${overlap ? 'z-40' : ''} ${cover}`}>
        <div className="relative mx-auto w-full max-w-[1360px] px-6 md:px-12">
          <Ornament className="mb-16" />
          <div className="grid items-end gap-x-16 gap-y-10 lg:grid-cols-12">
            <Reveal className="lg:col-span-7">
              <Eyebrow>{SECTION5.eyebrow}</Eyebrow>
              <h2 className="mt-6 font-serif font-medium text-ink">
                <span className="fy-h block text-fyDisplay">{titreAyurveda}</span>
                {suiteAyurveda && <span className="fy-h mt-4 block max-w-[34ch] text-fyLead text-brassInk">{suiteAyurveda}</span>}
              </h2>
            </Reveal>
            <Reveal delay={0.1} className="lg:col-span-5 lg:pb-3">
              <p className="max-w-[48ch] font-serif font-medium leading-[1.4] text-[clamp(1.15rem,1rem+0.55vw,1.5rem)] text-ink">{SECTION5.intro}</p>
            </Reveal>
          </div>
        </div>

        {/* la fleur : l'Ayurveda en racines, huit pétales qui s'illuminent, pleine largeur */}
        <Reveal className="mt-16">
          <FleurDuFoyer />
        </Reveal>

        <div className="relative mx-auto w-full max-w-[1360px] px-6 md:px-12">
          {/* trois manières dont les matières se répondent : chaque phrase pousse
              sur sa propre tache de pigment, en quinconce */}
          <div className="mt-24 space-y-14 md:space-y-20">
            {SECTION5.items.map((it, i) => (
              <Reveal key={it.slice(0, 24)} delay={0.05}>
                <div className={`relative grid lg:grid-cols-12 ${i % 2 ? 'lg:justify-items-end' : ''}`}>
                  <div className={`relative lg:col-span-8 ${i % 2 ? 'lg:col-start-5' : ''}`}>
                    <Tache
                      n={i}
                      className={`-top-16 w-[260px] md:-top-24 md:w-[380px] ${i % 2 ? '-right-12 md:-right-24' : '-left-12 md:-left-24'}`}
                    />
                    <p className="fy-h relative max-w-[46ch] font-serif font-medium leading-[1.2] text-[clamp(1.4rem,1.1rem+1.4vw,2.3rem)] text-espresso">{it}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-28 border-t border-brass/30 pt-16 md:mt-36">
            {/* recevoir à sa manière : un seul axe, centré, une seule famille de titres */}
            <div className="mx-auto max-w-[70ch] text-center">
              <p className="font-sans text-fyLabel uppercase tracking-[0.24em] text-brassInk">{SECTION5.receiveTitle}</p>
              <p className="fy-h mt-8 font-serif font-medium leading-[1.2] text-[clamp(1.6rem,1.1rem+2vw,2.9rem)] text-espresso">
                {SECTION5.receive.split(' ').filter(Boolean).map((verbe, i, arr) => (
                  <React.Fragment key={verbe}>
                    {verbe.replace('.', '')}
                    {i < arr.length - 1 && <span className="mx-4 text-brass" aria-hidden>·</span>}
                  </React.Fragment>
                ))}
              </p>
              <span className="mx-auto mt-10 block h-px w-16 bg-brass" aria-hidden />
              <p className="mt-10 font-sans text-fyBody text-ink">{SECTION5.release}</p>
              <p className="fy-h mt-6 font-serif font-medium text-fyH3 text-brassInk">{SECTION5.closing}</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════ SECTION 7 · Ce que l'année contient : les chiffres montent,
          l'étagère à cinq niches tient la page, tout en plein jour ═══════ */}
      <section className={`relative overflow-hidden bg-cream2 py-24 md:py-36 ${overlap ? 'z-50' : ''} ${cover}`}>
        <span
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 h-[80vh] w-[60vw] max-w-[900px]"
          style={{ background: 'radial-gradient(closest-side, rgba(220,184,116,0.38), transparent 72%)' }}
        />
        <div className="relative mx-auto w-full max-w-[1360px] px-6 md:px-12">
          <Reveal>
            <Eyebrow>{CONTENU.eyebrow}</Eyebrow>
          </Reveal>

          {/* les quatre chiffres de l'année, en bande, séparés par des filets */}
          <div className="mt-12 grid border-y border-brass/30 sm:grid-cols-2 lg:grid-cols-4">
            {CONTENU.stats.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.08}>
                <div className={`py-10 pr-6 ${i ? 'sm:border-l sm:border-brass/25 sm:pl-8' : ''} ${i === 2 ? 'sm:border-l-0 lg:border-l' : ''}`}>
                  <p className="font-serif text-fyNum text-espresso">
                    <Compteur value={s.n} />
                  </p>
                  <p className="mt-4 max-w-[16ch] font-sans text-fyLabel uppercase text-brassInk">{s.label}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* la porte du mois et les quatre ouvertures : la parole à gauche,
              l'étagère des rituels à droite, en parallaxe lente */}
          <div className="mt-20 grid gap-x-16 gap-y-14 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7">
              <Reveal>
                <h2 className="fy-h max-w-[22ch] font-serif font-medium text-fyH2 text-espresso">{CONTENU.title}</h2>
              </Reveal>
              <Reveal delay={0.12}>
                {CONTENU.intro.map((p, i) => (
                  <p key={p.slice(0, 22)} className={`max-w-[64ch] font-sans text-fyBody text-ink ${i ? 'mt-6' : 'mt-10'}`}>
                    {p}
                  </p>
                ))}
              </Reveal>
              <Reveal delay={0.2}>
                <div className="mt-12 border-l-0 border-t border-brass/30 pt-8">
                  <p className="fy-h font-serif font-medium text-fyH3 text-brassInk">{CONTENU.equation}</p>
                  <p className="mt-3 max-w-[50ch] font-serif text-fyLead text-ink">{CONTENU.equationSub}</p>
                </div>
              </Reveal>
            </div>
            <Reveal delay={0.15} className="lg:col-span-5">
              <Parallax speed={0.14} className="overflow-hidden rounded-[15px] shadow-[0_30px_80px_rgba(58,49,38,0.22)]">
                <img
                  src="/foyer/etagere-rituels.webp"
                  alt="Une étagère de céramique à cinq niches : une tasse fumante, un carnet de cuir, un flacon d'huile, un bouquet de lavande et une chandelle"
                  width={1000}
                  height={1241}
                  loading="lazy"
                  className="block h-auto w-full scale-110"
                />
              </Parallax>
            </Reveal>
          </div>

          {/* ce que l'année dépose, ligne à ligne, deux colonnes larges */}
          <div className="mt-24 grid gap-x-16 gap-y-0 border-t border-brass/30 md:grid-cols-2">
            {CONTENU.items.map((it, i) => (
              <Reveal key={it.title} delay={(i % 2) * 0.08}>
                <div className="flex items-start gap-6 border-b border-brass/25 py-8 md:gap-8">
                  <span className="mt-2 font-sans text-fyLabel tabular-nums text-brassInk/70">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <p className="fy-h font-serif font-medium text-fyH3 text-espresso">{it.title}</p>
                    <p className="mt-3 max-w-[52ch] font-sans text-fyBody text-ink">{it.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* les bonis : deux lignes de laiton, jamais deux cartes */}
          <div className="mt-20">
            <Reveal>
              <Eyebrow>{CONTENU.bonisTitle}</Eyebrow>
            </Reveal>
            <div className="mt-8 grid gap-6 md:grid-cols-2 md:gap-8">
              {CONTENU.bonis.map((b, i) => (
                <Reveal key={b.title} delay={i * 0.1} className="h-full">
                  <div className="flex h-full flex-col rounded-[15px] border border-brass/40 bg-cream2 p-8 shadow-[0_22px_50px_rgba(58,49,38,0.12)] md:p-10">
                    <span className="font-serif text-fyLead leading-none text-brassInk/70">{String(i + 1).padStart(2, '0')}</span>
                    <p className="fy-h mt-6 font-serif font-medium text-fyH3 text-espresso">{b.title}</p>
                    <p className="mt-4 font-sans text-fyBody text-ink">{b.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ SECTION 6 · Le regard qui compose Le Foyer : Krystine détourée
          sur une tache de terre, en profondeur (deux vitesses), plein jour ═══════ */}
      <section className={`overflow-hidden bg-cream ${overlap ? 'z-[51]' : 'relative'} ${cover}`} style={pin} data-pin-sheet>
        <div className="mx-auto w-full max-w-[1360px] px-6 pt-24 md:px-12 md:pt-32">
          <div className="grid gap-x-16 gap-y-14 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7">
              <Reveal>
                <Eyebrow>{SECTION7.eyebrow}</Eyebrow>
                <h2 className="fy-h mt-8 max-w-[30ch] font-serif font-medium leading-[1.06] text-[clamp(1.7rem,1.1rem+2.8vw,3.2rem)] text-espresso">{SECTION7.title}</h2>
              </Reveal>
              <div className="mt-12 space-y-7">
                {SECTION7.paragraphs.map((par) => (
                  <Reveal key={par.slice(0, 24)}>
                    <p className="max-w-[64ch] font-sans text-fyBody text-ink">{par}</p>
                  </Reveal>
                ))}
              </div>
            </div>

            {/* la planche : la tache de terre derrière, Krystine devant, à deux vitesses */}
            <div className="relative mx-auto w-full max-w-[520px] lg:col-span-5">
              <Parallax speed={0.22} className="absolute inset-x-[-12%] top-[-6%]">
                <img
                  aria-hidden
                  src="/foyer/pigment-terre.webp"
                  alt=""
                  width={800}
                  height={800}
                  loading="lazy"
                  className="block h-auto w-full"
                  style={{
                    mixBlendMode: 'multiply',
                    opacity: 0.9,
                    maskImage: 'radial-gradient(closest-side, black 55%, transparent 100%)',
                    WebkitMaskImage: 'radial-gradient(closest-side, black 55%, transparent 100%)',
                  }}
                />
              </Parallax>
              <Parallax speed={0.08} className="relative">
                <img
                  src="/foyer/krystine-scene.webp"
                  alt="Krystine St-Laurent en conférence, les mains ouvertes, un châle tissé sur les épaules"
                  width={670}
                  height={954}
                  loading="lazy"
                  className="block h-auto w-full"
                />
              </Parallax>
              <p className="mt-4 text-right font-sans text-fyLabel uppercase text-brassInk">{SECTION7.photoCaption}</p>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[1360px] px-6 pb-28 pt-24 md:px-12 md:pb-36 md:pt-32">
          {/* le fil : trois piliers, trois colonnes */}
          <Reveal>
            <p className="max-w-[60ch] font-sans text-fyBody text-ink">{SECTION7.pillarsLead}</p>
          </Reveal>
          <div className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-3">
            {SECTION7.pillars.map((par, i) => (
              <Reveal key={par} delay={i * 0.1}>
                <span className="block h-px w-full bg-brass/50" aria-hidden />
                <p className="mt-6 font-serif text-fyLead leading-none text-brassInk/70">{String(i + 1).padStart(2, '0')}</p>
                <p className="fy-h mt-5 font-serif font-medium text-fyH3 text-brassInk">{par}</p>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.3}>
            <p className="fy-h mt-16 max-w-[28ch] font-serif font-medium leading-[1.06] text-[clamp(1.7rem,1.1rem+2.8vw,3.2rem)] text-espresso">{SECTION7.pillarsClosing}</p>
          </Reveal>

          {/* le pont, puis la chute : une seule colonne, un seul point de regard */}
          <div className="mt-24 border-y border-brass/30 py-16 md:py-20">
            <Reveal className="mx-auto max-w-[62ch] text-center">
              <p className="font-sans text-fyBody text-ink">{SECTION7.bridge}</p>
              <span className="mx-auto mt-10 block h-px w-16 bg-brass" aria-hidden />
              <p className="fy-h mt-10 font-serif font-medium text-fyH3 text-espresso">{SECTION7.emphasis}</p>
              <p className="fy-h mt-4 font-serif font-medium text-fyH3 text-brassInk">{SECTION7.closing}</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════ SECTION 10 · FAQ : l'invitation scellée reste à gauche pendant
          que les questions défilent à droite, en une seule colonne large ═══════ */}
      <section className={`relative bg-cream3 py-24 md:py-36 ${overlap ? 'z-[53]' : ''} ${cover}`}>
        <div className="relative mx-auto w-full max-w-[1360px] px-6 md:px-12">
          <Reveal className="mb-14">
            <Eyebrow>Avant de dire oui</Eyebrow>
            <SectionTitle className="mt-5">Questions fréquentes</SectionTitle>
          </Reveal>
          <div className="grid gap-x-16 gap-y-14 lg:grid-cols-12 lg:items-start">
            <div className="lg:sticky lg:top-24 lg:col-span-5">
              <Reveal delay={0.15} className="hidden lg:block">
                <Parallax speed={0.1} className="overflow-hidden rounded-[15px] shadow-[0_30px_80px_rgba(58,49,38,0.22)]">
                  <img
                    src="/foyer/lettre-lin.webp"
                    alt="Une lettre manuscrite pliée sur un drap de lin, un brin de lavande séchée et un stylo de laiton"
                    width={800}
                    height={993}
                    loading="lazy"
                    className="block h-auto w-full scale-110"
                  />
                </Parallax>
              </Reveal>
            </div>
            <div className="border-t border-brass/30 lg:col-span-7">
              {FAQ.map((item, i) => (
                <FaqRow key={item.q} item={item} i={i} open={openFaq === i} onClick={() => setOpenFaq(openFaq === i ? null : i)} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
