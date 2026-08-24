import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronDown, X } from 'lucide-react';
import { Atmosphere, Reveal, Parallax } from '../../components/motion/loeuvre';
import {
  SECTION2,
  BIENVENUE,
  PORTES_INTRO,
  SECTION5,
  SECTION7,
  CONTENU,
  FAQ,
} from './content';
import { Cta } from './Cta';

/**
 * Le Foyer d'Origine · sections de CORPS (copie du doc « PAGE DE VENTE FINALE »).
 * Hero, préloader, offre et appel final vivent dans FoyerPage.
 * Style L'Œuvre (espresso/cream/brass) + auras du moodboard Origine.
 */

const ease = [0.16, 0.8, 0.24, 1] as const;

/* ── Palette d'auras du moodboard Origine ── */
const AURAS = {
  beige: '217,196,160',
  ocre: '199,132,44',
  prune: '136,86,130',
  sauge: '129,143,96',
  bleu: '62,110,138',
  terre: '150,104,66',
} as const;
type AuraTone = keyof typeof AURAS;
const TONE_INK: Record<AuraTone, string> = {
  beige: '#8a713f',
  ocre: '#8a5a1f',
  prune: '#6b4a66',
  sauge: '#5c6647',
  bleu: '#3d5a6e',
  terre: '#6e5138',
};
const ROW_TONES: AuraTone[] = ['ocre', 'sauge', 'prune', 'bleu', 'terre'];

const Aura: React.FC<{ tone: AuraTone; size?: number; className?: string }> = ({
  tone,
  size = 340,
  className = '',
}) => (
  <span
    aria-hidden
    className={`pointer-events-none absolute ${className}`}
    style={{ width: size, height: size, animation: 'auraBreathe 9s ease-in-out infinite' }}
  >
    <span
      className="absolute inset-0 rounded-full"
      style={{
        background: `radial-gradient(circle at 42% 40%, rgba(${AURAS[tone]},0.8), rgba(${AURAS[tone]},0.32) 46%, transparent 72%)`,
        filter: 'blur(18px)',
      }}
    />
    <span
      className="absolute inset-[12%] rounded-full"
      style={{
        background: `radial-gradient(circle at 62% 64%, rgba(${AURAS[tone]},0.55), transparent 64%)`,
        filter: 'blur(10px)',
      }}
    />
  </span>
);

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
          className={`font-sans text-[0.62rem] uppercase tracking-[0.3em] ${
            on === 'dark' ? 'text-brass' : 'text-brassInk'
          }`}
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
    <span className="block h-px w-10 bg-brass" aria-hidden />
    <p className={`font-sans text-[0.62rem] uppercase tracking-[0.28em] ${on === 'dark' ? 'text-brass' : 'text-brassInk'}`}>
      {children}
    </p>
  </div>
);

const SectionTitle: React.FC<{ children: React.ReactNode; on?: 'dark' | 'light'; long?: boolean; className?: string }> = ({
  children,
  on = 'light',
  long = false,
  className = '',
}) => (
  <h2
    className={`font-serif font-medium ${
      long
        ? 'leading-[1.2] text-[clamp(1.55rem,2.7vw,2.15rem)]'
        : 'uppercase leading-[1.08] text-[clamp(1.9rem,3.4vw,2.7rem)] tracking-[0.04em]'
    } ${on === 'dark' ? 'text-ctext' : 'text-ink'} ${className}`}
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
    className="absolute z-50 w-[min(560px,86%)]"
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
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-espresso/70 transition-colors hover:bg-espresso/10 hover:text-espresso"
      >
        <X size={17} />
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
        className="block w-full"
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
      <span className="absolute bottom-4 left-1/2 -translate-x-1/2 font-sans text-[0.62rem] uppercase tracking-[0.3em] text-brassInk">
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
            <p className="font-sans text-[0.62rem] uppercase tracking-[0.3em] text-brassInk">
              {ouverte.mois} · {ouverte.mouvement}
            </p>
            <h3 className="mt-4 font-serif font-medium leading-[1.15] text-espresso text-[clamp(1.4rem,2.6vw,2.1rem)]">
              {ouverte.theme}
            </h3>
            <p className="mt-4 font-sans text-[0.92rem] leading-[1.8] text-ink">{ouverte.question}</p>
            <a
              href="/liste-attente?programme=foyer"
              className="mt-6 inline-block border-b border-brassInk/60 pb-1 font-sans text-[0.7rem] uppercase tracking-[0.22em] text-brassInk transition-colors hover:text-espresso"
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
            <p className="font-sans text-[0.62rem] uppercase tracking-[0.3em] text-brassInk">Une année à découvrir</p>
            <h3 className="mt-4 font-serif font-medium leading-[1.15] text-espresso text-[clamp(1.3rem,2.2vw,1.8rem)]">
              Douze portes, un même feu
            </h3>
            <p className="mt-4 font-sans text-[0.92rem] leading-[1.8] text-ink">
              Chaque porte porte un mois de l’année. Ouvrez celle qui vous appelle : elle révèle le
              mouvement de la saison, le thème du mois et la question qui l’ouvre.
            </p>
          </Halo>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ═══════════ Deux battants qui s'ouvrent sur le cœur du Foyer ═══════════
   Scroll-TRIGGERED (canon L'Œuvre) : un seuil arme l'ouverture, la
   transition CSS possède le timing. Aucune propriété de layout animée. */
const PortesSurLeCoeur: React.FC<{ label: string }> = ({ label }) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [ouvert, setOuvert] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      setOuvert(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setOuvert(true);
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduce]);
  return (
    <div ref={ref} className="relative mx-auto w-full max-w-[520px]">
      <div className="relative aspect-[246/261] w-full">
        {/* le cœur : le feu qui reste allumé derrière les battants */}
        <div
          className="absolute inset-0 overflow-hidden rounded-[22px] ring-1 ring-brass/35"
          style={{
            boxShadow: ouvert
              ? '0 0 80px 14px rgba(199,154,82,0.3), 0 26px 60px rgba(22,16,10,0.38)'
              : '0 16px 38px rgba(22,16,10,0.26)',
            transition: 'box-shadow 1.6s cubic-bezier(0.16,0.8,0.24,1) 0.6s',
          }}
        >
          <img
            src="/foyer/coeur-foyer.webp"
            alt="Le cœur du Foyer : le feu qui reste allumé"
            loading="lazy"
            className="h-full w-full object-cover"
          />
          <span
            aria-hidden
            className="absolute inset-0"
            style={{ background: 'radial-gradient(58% 44% at 50% 56%, rgba(199,154,82,0.18), transparent 74%)' }}
          />
          <p
            className="absolute inset-x-0 top-8 text-center font-sans text-[0.62rem] uppercase tracking-[0.34em] text-brassBright"
            style={{
              opacity: ouvert ? 1 : 0,
              transform: ouvert ? 'translateY(0)' : 'translateY(10px)',
              transition:
                'opacity 1.1s cubic-bezier(0.16,0.8,0.24,1) 1.15s, transform 1.1s cubic-bezier(0.16,0.8,0.24,1) 1.15s',
            }}
          >
            {label}
          </p>
        </div>

        {/* les deux battants : une même porte fendue en son milieu */}
        {(['left', 'right'] as const).map((side) => (
          <div
            key={side}
            aria-hidden
            className="absolute inset-y-0 w-1/2"
            style={{
              [side]: 0,
              backgroundImage: 'url(/foyer/porte-sept-cutout.webp)',
              backgroundSize: '200% 100%',
              backgroundPosition: `${side} center`,
              transformOrigin: `${side} center`,
              transform: `perspective(1500px) rotateY(${ouvert ? (side === 'left' ? -84 : 84) : 0}deg)`,
              transition: 'transform 2.2s cubic-bezier(0.16,0.8,0.24,1)',
              boxShadow: '0 16px 30px rgba(22,16,10,0.28)',
            }}
          />
        ))}
      </div>
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
        loading="lazy"
        className="block w-full"
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

/* ═══════════ FAQ ═══════════ */
const FaqRow: React.FC<{ item: (typeof FAQ)[number]; i: number; open: boolean; onClick: () => void }> = ({
  item,
  i,
  open,
  onClick,
}) => (
  <div
    className="border-b border-brass/20 rounded-2xl px-5 -mx-5 transition-colors duration-300"
    style={open ? { background: 'rgba(199,132,44,0.08)' } : undefined}
  >
    <button
      onClick={onClick}
      aria-expanded={open}
      aria-controls={`faq-panel-${i}`}
      className="w-full text-left py-6 flex items-start justify-between gap-6 min-h-[44px] group"
    >
      <h3 className={`font-serif text-xl md:text-2xl leading-snug pr-4 transition-colors ${open ? 'text-brassInk' : 'text-ink group-hover:text-brassInk'}`}>
        <span className="tabular-nums text-inkSoft mr-3">{String(i + 1).padStart(2, '0')}</span>
        {item.q}
      </h3>
      <ChevronDown
        className={`w-5 h-5 shrink-0 mt-1 text-brassInk transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
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
          <div className="pb-7 pl-10 pr-10 max-w-[62ch] space-y-4">
            {item.a.map((p) => (
              <p key={p.slice(0, 32)} className="font-sans text-[0.92rem] leading-[1.85] text-inkSoft">
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
  const reduceAll = useReducedMotion();
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

  return (
    <>
      <style>{`
        @keyframes auraBreathe{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.06);opacity:1}}
        @media (prefers-reduced-motion: reduce){[style*="auraBreathe"]{animation:none!important}}
      `}</style>

      {/* ═══════ SECTION 4 · Les douze portes : la feuille monte SUR le feu (feuilles
          empilées du canon), le calendrier arrive bord à bord, zéro vide crème ═══════ */}
      <section
        className={`overflow-hidden bg-cream3 pb-24 md:pb-36 ${
          overlap ? 'z-10 -mt-[100vh] rounded-t-[18px] shadow-[0_-26px_60px_rgba(22,16,10,0.5)]' : 'relative'
        }`}
        style={pin} data-pin-sheet
      >
        {/* SECTION 2 · le hook, puis l'entrée dans Le Foyer, juste avant le mur des douze portes */}
        <div className="px-6 py-28 md:px-12 md:py-36 lg:px-20">
          <div className="grid w-full gap-x-14 gap-y-12 lg:grid-cols-12 lg:items-center">
            <Reveal className="lg:col-span-6">
              <span className="mb-6 block h-px w-10 bg-brass" aria-hidden />
              <h2 className="font-serif font-medium leading-[1.02] text-espresso text-[clamp(2.2rem,4.6vw,4rem)] max-w-[16ch]">
                {BIENVENUE.title}
              </h2>
            </Reveal>
            <Reveal delay={0.12} className="lg:col-span-6 lg:pt-4">
              {BIENVENUE.paragraphs.map((p, i) => (
                <p
                  key={p.slice(0, 22)}
                  className={`font-sans text-[0.98rem] leading-[1.9] text-inkSoft max-w-[52ch] ${i ? 'mt-5' : ''}`}
                >
                  {p}
                </p>
              ))}
              <p className="mt-10 font-serif font-medium leading-snug text-brassInk text-[clamp(1.5rem,3vw,2.4rem)] max-w-[20ch]">
                {BIENVENUE.kicker}
              </p>
            </Reveal>
          </div>

          {/* le retournement : ce que Le Foyer fait à la place */}
          <div className="mt-24 border-t border-brass/30 pt-16 md:mt-32 md:pt-20">
            <div className="grid gap-x-14 gap-y-12 lg:grid-cols-12 lg:items-end">
              <Reveal className="lg:col-span-7">
                <p className="font-sans text-[0.62rem] uppercase tracking-[0.3em] text-brassInk">
                  {BIENVENUE.eyebrow}
                </p>
                <p className="mt-7 font-serif font-medium leading-[1.22] text-espresso text-[clamp(1.5rem,2.9vw,2.4rem)] max-w-[32ch]">
                  {BIENVENUE.promise}
                </p>
              </Reveal>
              <Reveal delay={0.12} className="lg:col-span-5 lg:pb-2">
                <p className="font-sans text-[0.95rem] leading-[1.9] text-inkSoft max-w-[46ch]">{BIENVENUE.body}</p>
              </Reveal>
            </div>

            <div className="mt-16 grid gap-y-6 border-t border-brass/25 pt-10 sm:grid-cols-3">
              {BIENVENUE.marks.map((m, i) => (
                <Reveal key={m} delay={i * 0.08}>
                  <p className="font-serif text-brassInk text-[clamp(1.1rem,1.9vw,1.45rem)] leading-snug">{m}</p>
                </Reveal>
              ))}
            </div>

            <Reveal className="mt-14">
              <Cta label={BIENVENUE.cta} />
            </Reveal>
          </div>
        </div>

        <Reveal className="mb-16 px-6 md:px-12 lg:px-20">
          <p className="font-serif font-medium leading-snug text-espresso text-[clamp(1.5rem,3vw,2.3rem)] max-w-[22ch]">
            {PORTES_INTRO.title}
          </p>
        </Reveal>

        <CalendrierAnnee />

        {/* la pierre du calendrier se fond dans la page : bande de liaison + ornement */}
        <div
          aria-hidden
          className="h-20 w-full md:h-28"
          style={{ background: 'linear-gradient(180deg, #d7c9bc 0%, #ede5d7 100%)' }}
        />
        <Ornament motto className="-mt-4 mb-2" />

      </section>

      {/* ═══════ SECTION 4 · L'histoire du feu : le chapitre sombre de la page,
          la flamme de Varanasi pleine hauteur, la seule rupture du parcours crème ═══════ */}
      <section
        className={`relative overflow-hidden bg-espressoDeep ${overlap ? 'z-20' : ''} ${cover}`}
        style={pin}
        data-pin-sheet
      >
        <div className="grid lg:min-h-[86vh] lg:grid-cols-2">
          {/* la flamme, bord à bord */}
          <div className="relative h-[58vh] overflow-hidden lg:h-auto">
            <img
              src="/foyer/niche-flamme.webp"
              alt="La flamme de Varanasi : une lampe de cuivre allumée dans une niche de céramique"
              loading="lazy"
              className="foyer-braise absolute inset-0 h-full w-full object-cover"
            />
            <span
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(58% 46% at 50% 52%, rgba(220,184,116,0.22), transparent 72%)',
              }}
            />
            {/* la flamme se fond dans le noir du texte, jamais de bord net */}
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-32 lg:hidden"
              style={{ background: 'linear-gradient(180deg, transparent 0%, #16100a 100%)' }}
            />
            <span
              aria-hidden
              className="absolute inset-y-0 right-0 hidden w-24 lg:block"
              style={{ background: 'linear-gradient(90deg, transparent 0%, #16100a 100%)' }}
            />
          </div>

          {/* le récit */}
          <div className="flex items-center px-6 py-20 md:px-12 md:py-28 lg:px-16 xl:px-24">
            <div className="max-w-[46ch]">
              <Reveal>
                <Eyebrow on="dark">{SECTION2.eyebrow}</Eyebrow>
                <SectionTitle on="dark" className="mt-6">
                  {SECTION2.title}
                </SectionTitle>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="mt-9 font-serif font-medium text-ctext text-[clamp(1.45rem,2.6vw,2.05rem)] leading-[1.28]">
                  {SECTION2.lead}
                </p>
              </Reveal>
              {SECTION2.paragraphs.map((p, i) => (
                <Reveal key={p.slice(0, 24)} delay={0.18 + i * 0.08}>
                  <p className="mt-7 font-sans text-[0.98rem] leading-[1.9] text-ctextSoft">{p}</p>
                </Reveal>
              ))}
              <Reveal delay={0.34}>
                <span className="mt-12 block h-px w-16 bg-brass" aria-hidden />
                <p className="mt-7 font-serif font-medium text-brassBright text-[clamp(1.2rem,2vw,1.6rem)] leading-snug">
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

      {/* ═══════ SECTION 5 · Une année nourrie par l'Ayurveda, les saisons,
          les plantes, les œuvres et les savoirs ═══════ */}
      <section className={`relative overflow-hidden py-24 md:py-36 ${overlap ? 'z-40' : ''} ${cover}`}>
        <div aria-hidden className="absolute inset-0">
          <img src="/foyer/texture-pierre.webp" alt="" className="h-full w-full object-cover" loading="lazy" />
          <span
            className="absolute inset-0"
            style={{ background: 'linear-gradient(180deg, rgba(232,236,215,0.85) 0%, rgba(246,243,238,0.8) 100%)' }}
          />
        </div>

        <div className="relative mx-auto w-full max-w-[1360px] px-6 md:px-12">
          <Ornament className="mb-16" />
          <div className="grid items-end gap-x-14 gap-y-8 lg:grid-cols-12">
            <Reveal className="lg:col-span-8">
              <Eyebrow>{SECTION5.eyebrow}</Eyebrow>
              <h2 className="mt-6 font-serif font-medium leading-[1.08] text-ink text-[clamp(1.7rem,3.2vw,2.9rem)]">
                {SECTION5.title}
              </h2>
            </Reveal>
            <Reveal delay={0.1} className="lg:col-span-4 lg:pb-2">
              <p className="font-sans text-[0.95rem] leading-[1.85] text-inkSoft max-w-[36ch]">{SECTION5.intro}</p>
            </Reveal>
          </div>
        </div>

        {/* la fleur : l'Ayurveda en racines, huit pétales qui s'illuminent, pleine largeur */}
        <Reveal className="mt-16">
          <FleurDuFoyer />
        </Reveal>

        <div className="relative mx-auto w-full max-w-[1360px] px-6 md:px-12">
          {/* trois manières dont les matières se répondent */}
          <div className="mt-16 border-t border-brass/25">
            {SECTION5.items.map((it, i) => (
              <Reveal key={it.slice(0, 24)} delay={i * 0.08}>
                <div className="flex items-baseline gap-6 border-b border-brass/25 py-7">
                  <span
                    className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: `rgba(${AURAS[ROW_TONES[i % ROW_TONES.length]]},0.75)` }}
                    aria-hidden
                  />
                  <p className="font-serif text-ink text-[clamp(1.1rem,1.9vw,1.5rem)] leading-snug max-w-[46ch]">
                    {it}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* le rythme de la semaine, puis les dix rendez-vous */}
          <div className="mt-16 grid gap-x-14 gap-y-10 lg:grid-cols-12">
            <Reveal className="lg:col-span-6">
              <p className="font-serif font-medium text-brassInk text-[clamp(1.3rem,2.2vw,1.75rem)] leading-snug max-w-[30ch]">
                <strong className="font-semibold">{SECTION5.rhythmLead}</strong>
                {SECTION5.rhythm}
              </p>
            </Reveal>
            <Reveal delay={0.12} className="lg:col-span-5 lg:col-start-8">
              <p className="font-sans text-[0.95rem] leading-[1.85] text-inkSoft max-w-[44ch]">
                {SECTION5.meditations}
              </p>
              <p className="mt-4 font-sans text-[0.95rem] leading-[1.85] text-inkSoft max-w-[44ch]">{SECTION5.keep}</p>
            </Reveal>
          </div>

          <Reveal className="mt-20 border-t border-brass/25 pt-14">
            <p className="font-serif font-medium text-ink text-[clamp(1.35rem,2.4vw,1.95rem)] leading-[1.35] max-w-[52ch]">
              {SECTION5.receiveTitle}
            </p>
            <p className="mt-5 font-serif text-brassInk text-[clamp(1.15rem,2vw,1.55rem)] leading-snug">
              {SECTION5.receive}
            </p>
            <p className="mt-8 font-sans text-[0.95rem] leading-[1.85] text-inkSoft">{SECTION5.release}</p>
            <p
              className="mt-10 font-serif font-medium text-[clamp(1.6rem,3.2vw,2.6rem)] leading-snug"
              style={{ color: TONE_INK.sauge }}
            >
              {SECTION5.closing}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ═══════ SECTION 7 · Ce que l'année contient : la base du feu vit
          derrière les chiffres, comme dans la planche du Foyer ═══════ */}
      <section className={`relative overflow-hidden bg-espressoDeep py-28 md:py-40 ${overlap ? 'z-50' : ''}`}>
        <div aria-hidden className="absolute inset-0">
          <Parallax speed={0.5} className="h-full" innerClassName="h-full">
            {reduceAll ? (
              <img src="/foyer/antre-foyer.webp" alt="" loading="lazy" className="h-full w-full scale-125 object-cover" />
            ) : (
              <video
                src="/foyer/antre-foyer.mp4"
                poster="/foyer/antre-foyer.webp"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                className="h-full w-full scale-125 object-cover"
              />
            )}
          </Parallax>
          <span className="absolute inset-0" style={{ background: 'rgba(22,16,10,0.74)' }} />
          <span
            className="absolute inset-0"
            style={{ background: 'radial-gradient(58% 46% at 50% 42%, rgba(199,132,44,0.16), transparent 72%)' }}
          />
        </div>

        <div className="relative mx-auto w-full max-w-[1360px] px-6 md:px-12">
          <Reveal>
            <p className="text-center font-sans text-[0.62rem] uppercase tracking-[0.34em] text-brass">
              {CONTENU.eyebrow}
            </p>
          </Reveal>

          {/* les quatre chiffres de l'année */}
          <div className="mt-14 grid gap-y-10 border-y border-brass/25 py-12 sm:grid-cols-2 lg:grid-cols-4">
            {CONTENU.stats.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.08}>
                <div className="px-2 text-center lg:border-r lg:border-brass/20 lg:last:border-r-0">
                  <p className="font-serif leading-none text-ctext text-[clamp(2.8rem,5vw,4.2rem)]">{s.n}</p>
                  <p className="mx-auto mt-4 max-w-[16ch] font-sans text-[0.66rem] uppercase tracking-[0.24em] text-brass leading-[1.7]">
                    {s.label}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* la porte du mois, puis les quatre ouvertures de la semaine */}
          <div className="mt-16 grid gap-x-14 gap-y-10 lg:grid-cols-12">
            <Reveal className="lg:col-span-5">
              <h2 className="font-serif font-medium leading-[1.12] text-brassBright text-[clamp(1.5rem,2.7vw,2.2rem)] max-w-[24ch]">
                {CONTENU.title}
              </h2>
            </Reveal>
            <Reveal delay={0.12} className="lg:col-span-7">
              {CONTENU.intro.map((p, i) => (
                <p
                  key={p.slice(0, 22)}
                  className={`font-sans text-[0.95rem] leading-[1.9] text-ctextSoft max-w-[58ch] ${i ? 'mt-5' : ''}`}
                >
                  {p}
                </p>
              ))}
            </Reveal>
          </div>

          <Reveal className="mt-14 text-center">
            <p className="font-serif font-medium text-brassBright text-[clamp(1.2rem,2.2vw,1.7rem)] leading-snug">
              {CONTENU.equation}
            </p>
            <p className="mt-3 font-sans text-[0.92rem] leading-[1.8] text-ctextSoft">{CONTENU.equationSub}</p>
          </Reveal>

          {/* ce que l'année dépose, ligne à ligne */}
          <div className="mt-20 grid gap-x-14 gap-y-0 border-t border-brass/25 md:grid-cols-2">
            {CONTENU.items.map((it, i) => (
              <Reveal key={it.title} delay={(i % 2) * 0.08}>
                <div className="flex items-start gap-6 border-b border-brass/20 py-7">
                  <span className="mt-1 font-sans text-[0.72rem] tabular-nums tracking-[0.14em] text-brassBright">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="font-serif text-ctext text-[clamp(1.05rem,1.7vw,1.35rem)] leading-snug">{it.title}</p>
                    <p className="mt-3 font-sans text-[0.9rem] leading-[1.8] text-ctextSoft max-w-[46ch]">{it.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* les bonis, posés comme deux braises */}
          <Reveal className="mt-20">
            <p className="text-center font-sans text-[0.62rem] uppercase tracking-[0.34em] text-brass">
              {CONTENU.bonisTitle}
            </p>
          </Reveal>
          <div className="mt-10 grid gap-8 md:grid-cols-2">
            {CONTENU.bonis.map((b, i) => (
              <Reveal key={b.title} delay={i * 0.1}>
                <div
                  className="h-full rounded-[15px] border border-brass/35 px-8 py-9 backdrop-blur-md"
                  style={{ background: 'rgba(12,8,5,0.42)' }}
                >
                  <p className="font-serif text-brassBright text-[clamp(1.05rem,1.7vw,1.3rem)] leading-snug">{b.title}</p>
                  <p className="mt-4 font-sans text-[0.9rem] leading-[1.8] text-ctextSoft">{b.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ SECTION KSL · le regard qui compose Le Foyer :
          le feu crépite derrière, la photo de Krystine posée dessus ═══════ */}
      <section className={`overflow-hidden bg-espressoDeep py-24 md:py-36 ${overlap ? 'z-[51]' : 'relative'}`} style={pin} data-pin-sheet>
        <div aria-hidden className="absolute inset-0">
          {reduceAll ? (
            <img src="/foyer/firepit-poster.webp" alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <video
              src="/foyer/atre-feu.mp4"
              poster="/foyer/firepit-poster.webp"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
            />
          )}
          <span className="absolute inset-0" style={{ background: 'rgba(22,16,10,0.78)' }} />
        </div>

        <div className="relative mx-auto w-full max-w-[1360px] px-6 md:px-12">
          <div className="grid items-start gap-x-14 gap-y-14 lg:grid-cols-12">
            <Reveal className="lg:col-span-7">
              <Eyebrow on="dark">{SECTION7.eyebrow}</Eyebrow>
              <h2 className="mt-6 font-serif font-medium leading-[1.06] text-ctext text-[clamp(1.6rem,2.9vw,2.5rem)] max-w-[30ch]">
                {SECTION7.title}
              </h2>
              {SECTION7.paragraphs.map((p) => (
                <p key={p.slice(0, 24)} className="mt-7 font-sans text-[0.95rem] leading-[1.9] text-ctextSoft max-w-[52ch]">
                  {p}
                </p>
              ))}
            </Reveal>

            {/* la photo : Krystine sur scène, détourée, posée sur le feu */}
            <Reveal delay={0.12} className="lg:col-span-5">
              <div className="relative">
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full"
                  style={{ background: 'radial-gradient(52% 46% at 52% 44%, rgba(199,132,44,0.34), transparent 72%)' }}
                />
                <Parallax speed={0.12}>
                  <img
                    src="/foyer/krystine-scene.webp"
                    alt="Krystine St-Laurent sur scène"
                    loading="lazy"
                    className="relative w-full"
                    style={{ filter: 'drop-shadow(0 26px 46px rgba(12,8,5,0.6))' }}
                  />
                </Parallax>
              </div>
              <p className="mt-4 font-sans text-[0.8rem] tracking-[0.06em] text-ctextSoft">{SECTION7.photoCaption}</p>
            </Reveal>
          </div>

          {/* le fil : trois piliers autour du même feu */}
          <div className="mt-20 border-t border-brass/30 pt-14">
            <Reveal>
              <p className="font-sans text-[0.95rem] leading-[1.85] text-ctextSoft max-w-[54ch]">
                {SECTION7.pillarsLead}
              </p>
            </Reveal>
            <div className="mt-10 grid gap-y-8 sm:grid-cols-3">
              {SECTION7.pillars.map((p, i) => (
                <Reveal key={p} delay={i * 0.1}>
                  <p className="font-serif font-medium text-brassBright text-[clamp(1.25rem,2.2vw,1.7rem)] leading-snug">
                    {p}
                  </p>
                </Reveal>
              ))}
            </div>
            <Reveal delay={0.3}>
              <p className="mt-10 font-serif text-ctext text-[clamp(1.15rem,1.9vw,1.5rem)] leading-snug max-w-[40ch]">
                {SECTION7.pillarsClosing}
              </p>
            </Reveal>
          </div>

          <Reveal className="mt-16">
            <p className="font-sans text-[0.95rem] leading-[1.9] text-ctextSoft max-w-[60ch]">{SECTION7.bridge}</p>
          </Reveal>

          <Reveal className="mt-20">
            <span className="block h-px w-16 bg-brass" aria-hidden />
            <p className="mt-8 font-serif font-medium text-ctext text-[clamp(1.35rem,2.5vw,2rem)] leading-snug max-w-[34ch]">
              {SECTION7.emphasis}
            </p>
            <p className="mt-5 font-serif font-medium text-brassBright text-[clamp(1.35rem,2.5vw,2rem)] leading-snug max-w-[38ch]">
              {SECTION7.closing}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ═══════ SECTION 10 · FAQ ═══════ */}
      <section className={`overflow-hidden bg-cream2 py-24 md:py-36 ${overlap ? 'z-[53]' : 'relative'} ${cover}`} style={pin} data-pin-sheet>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-24"
          style={{ background: 'linear-gradient(180deg, #f3efe6 0%, transparent 100%)' }}
        />
        <div className="relative mx-auto w-full max-w-[1360px] px-6 md:px-12">
          <Reveal className="max-w-[36ch] mb-14">
            <Eyebrow>Avant de dire oui</Eyebrow>
            <SectionTitle className="mt-5">Questions fréquentes</SectionTitle>
          </Reveal>
          {/* pleine largeur, deux colonnes (canon : jamais de colonne étroite centrée) */}
          <div className="grid items-start gap-x-14 lg:grid-cols-2">
            {[FAQ.slice(0, Math.ceil(FAQ.length / 2)), FAQ.slice(Math.ceil(FAQ.length / 2))].map((col, c) => (
              <div key={c}>
                {col.map((item, j) => {
                  const i = c * Math.ceil(FAQ.length / 2) + j;
                  return (
                    <Reveal key={item.q}>
                      <FaqRow item={item} i={i} open={openFaq === i} onClick={() => setOpenFaq(openFaq === i ? null : i)} />
                    </Reveal>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
