import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronDown, X } from 'lucide-react';
import { Atmosphere, Reveal, Parallax } from '../../components/motion/loeuvre';
import {
  SECTION2,
  SECTION3,
  SECTION4,
  SECTION5,
  SECTION6,
  SECTION7,
  SECTION8,
  FAQ,
} from './content';

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

/* ── Séparateur doré : filet, losange, brins végétaux ── */
const Ornament: React.FC<{ on?: 'dark' | 'light'; motto?: boolean; className?: string }> = ({
  on = 'light',
  motto = false,
  className = '',
}) => {
  const stroke = on === 'dark' ? '#bb9a5e' : '#7d6330';
  return (
    <div className={`flex flex-col items-center gap-4 ${className}`} aria-hidden>
      <svg width="220" height="18" viewBox="0 0 220 18" fill="none">
        <line x1="0" y1="9" x2="88" y2="9" stroke={stroke} strokeWidth="1" opacity="0.55" />
        <line x1="132" y1="9" x2="220" y2="9" stroke={stroke} strokeWidth="1" opacity="0.55" />
        <rect x="105.5" y="4.5" width="9" height="9" transform="rotate(45 110 9)" stroke={stroke} strokeWidth="1.1" />
        <path d="M96 9c-3-4-7-5-10-4 2 3 6 5 10 4Z" fill={stroke} opacity="0.7" />
        <path d="M124 9c3-4 7-5 10-4-2 3-6 5-10 4Z" fill={stroke} opacity="0.7" />
      </svg>
      {motto && (
        <p
          className={`font-sans text-[0.62rem] uppercase tracking-[0.3em] ${
            on === 'dark' ? 'text-brass' : 'text-brassInk'
          }`}
        >
          Observer · Ressentir · Accueillir
        </p>
      )}
    </div>
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
  apercu: string;
}
const PORTES: Porte[] = [
  { n: 'janvier', mois: 'Janvier', b: [88, 143, 334, 404], src: 'porte-janvier-cutout', mouvement: 'Après l’abondance', theme: 'Retrouver une mesure qui nous ressemble', apercu: 'Une histoire de mesure, un geste de table et un regard sur ce qui suffit.' },
  { n: 'fevrier', mois: 'Février', b: [333, 128, 577, 404], src: 'porte-fevrier-cutout', mouvement: 'Plein hiver', theme: 'Protéger ses réserves sans se retirer du monde', apercu: 'Une huile, une histoire et une rencontre autour de ce qui nous soutient.' },
  { n: 'mars', mois: 'Mars', b: [88, 406, 334, 662], src: 'porte-mars-cutout', mouvement: 'Premier dégel', theme: 'Remettre en circulation ce qui stagnait', apercu: 'Une plante, une rivière et une histoire de remise en mouvement.' },
  { n: 'avril', mois: 'Avril', b: [333, 406, 577, 662], src: 'porte-avril-cutout', mouvement: 'Accumulation du printemps', theme: 'Alléger sans entrer dans la punition', apercu: 'Une recette, une plante et une règle de détox à regarder autrement.' },
  { n: 'mai', mois: 'Mai', b: [88, 641, 334, 907], src: 'porte-mai-cutout', mouvement: 'Retour des odeurs et des couleurs', theme: 'Réapprendre à recevoir par les sens', apercu: 'Une fleur, un son et une rencontre sensorielle.' },
  { n: 'juin', mois: 'Juin', b: [333, 638, 577, 907], src: 'porte-juin-cutout', mouvement: 'Expansion et longues journées', theme: 'Recevoir davantage sans se disperser', apercu: 'Une histoire de lumière, une boisson et un regard sur l’ambition.' },
  { n: 'juillet', mois: 'Juillet', b: [1086, 128, 1330, 404], src: 'porte-juillet-cutout', mouvement: 'Chaleur installée', theme: 'Habiter l’intensité sans se brûler', apercu: 'L’eau, le feu, les aliments et les nuits d’été.' },
  { n: 'aout', mois: 'Août', b: [1328, 143, 1572, 404], src: 'porte-aout-cutout', mouvement: 'Récolte et prochaine transition', theme: 'Reconnaître ce qui mérite d’être conservé', apercu: 'Des semences, des conserves et des gestes qui se transmettent.' },
  { n: 'septembre', mois: 'Septembre', b: [1085, 408, 1332, 662], src: 'porte-sept-cutout', mouvement: 'Changement de rythme', theme: 'Changer de cadence sans se perdre', apercu: 'Thoreau, le sommeil et une histoire de changement de rythme.' },
  { n: 'octobre', mois: 'Octobre', b: [1328, 406, 1572, 662], src: 'porte-octobre-cutout', mouvement: 'Refroidissement et dessèchement', theme: 'Se préparer avant d’être épuisée', apercu: 'Des racines, des épices, une huile et les gestes qui précèdent le froid.' },
  { n: 'novembre', mois: 'Novembre', b: [1086, 641, 1330, 907], src: 'porte-novembre-cutout', mouvement: 'Baisse de lumière', theme: 'Nourrir le feu lorsque l’élan diminue', apercu: 'Une histoire, une cuisson et une rencontre autour du feu.' },
  { n: 'decembre', mois: 'Décembre', b: [1328, 638, 1572, 907], src: 'porte-decembre-cutout', mouvement: 'Rassemblement et transmission', theme: 'Ce que nous choisissons de garder et de transmettre', apercu: 'Des récits familiaux, de la musique et des gestes transmis autour du feu.' },
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
            <p className="mt-4 font-sans text-[0.92rem] leading-[1.8] text-ink">{ouverte.apercu}</p>
            <a
              href="/liste-attente?programme=foyer"
              className="mt-6 inline-block border-b border-brassInk/60 pb-1 font-sans text-[0.7rem] uppercase tracking-[0.22em] text-brassInk transition-colors hover:text-espresso"
            >
              Entrer dans le Foyer
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
              mouvement de la saison, le thème du mois et un aperçu de ce qui vous y attend.
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

export default function BodySections() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <>
      <style>{`
        @keyframes auraBreathe{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.06);opacity:1}}
        @media (prefers-reduced-motion: reduce){[style*="auraBreathe"]{animation:none!important}}
      `}</style>

      {/* ═══════ SECTION 4 · Les douze portes : le feu enchaîne direct sur les portes ═══════ */}
      <section className="relative overflow-hidden bg-cream3 pb-24 md:pb-36">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-16"
          style={{ background: 'linear-gradient(180deg, #f6f3ee 0%, transparent 100%)' }}
        />
        <Reveal>
          <CalendrierAnnee />
        </Reveal>

        <div className="relative mx-auto w-full max-w-[1360px] px-6 md:px-12">
          <div className="mt-16 grid items-start gap-x-12 gap-y-8 lg:grid-cols-12">
            <Reveal className="lg:col-span-6">
              <Eyebrow>{SECTION4.eyebrow}</Eyebrow>
              <SectionTitle className="mt-5">{SECTION4.title}</SectionTitle>
            </Reveal>
            <Reveal delay={0.08} className="lg:col-span-5 lg:col-start-8">
              <p className="font-sans text-[0.95rem] leading-[1.85] text-inkSoft max-w-[44ch]">
                {SECTION4.paragraphs[0]}
              </p>
            </Reveal>
          </div>
          <div className="mt-12 grid gap-x-12 gap-y-6 lg:grid-cols-2">
            {SECTION4.paragraphs.slice(1).map((p) => (
              <Reveal key={p.slice(0, 24)}>
                <p className="font-sans text-[0.95rem] leading-[1.85] text-inkSoft max-w-[54ch]">{p}</p>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-14">
            <p className="font-serif font-medium text-brassInk text-[clamp(1.25rem,2.1vw,1.65rem)] leading-snug">
              {SECTION4.closing}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ═══════ SECTION 2 · L'Histoire du feu (salle d'ambre) ═══════ */}
      <section
        className="relative overflow-hidden py-24 md:py-36"
        style={{ background: 'linear-gradient(180deg, #ede5d7 0%, #f5e8cf 16%, #f1ddb2 58%, #f3e3c2 100%)' }}
      >
        <Aura tone="ocre" size={560} className="-left-36 top-4" />
        <Aura tone="terre" size={420} className="-right-28 bottom-2 opacity-90" />
        <div className="relative mx-auto w-full max-w-[1360px] px-6 md:px-12">
          <div className="grid lg:grid-cols-12 gap-x-12 gap-y-10">
            <Reveal className="lg:col-span-5">
              <Eyebrow>{SECTION2.eyebrow}</Eyebrow>
              <SectionTitle className="mt-5">{SECTION2.title}</SectionTitle>
            </Reveal>
            <Reveal delay={0.08} className="lg:col-span-7 lg:pt-3">
              <p
                className="font-serif font-medium text-[clamp(1.3rem,2.2vw,1.7rem)] leading-snug max-w-[38ch]"
                style={{ color: TONE_INK.terre }}
              >
                {SECTION2.lead}
              </p>
              {SECTION2.paragraphs.map((p) => (
                <p key={p.slice(0, 24)} className="mt-6 font-sans text-[0.95rem] leading-[1.85] text-inkSoft max-w-[52ch]">
                  {p}
                </p>
              ))}
              <p className="mt-10 font-serif font-medium text-brassInk text-[clamp(1.2rem,1.9vw,1.55rem)] leading-snug max-w-[46ch]">
                {SECTION2.closingLead} {SECTION2.closing}
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════ SECTION 3 · Le rythme (salle sauge) ═══════ */}
      <section
        className="relative overflow-hidden py-24 md:py-36"
        style={{ background: 'linear-gradient(180deg, #f3e3c2 0%, #edf0df 22%, #e8ecd7 100%)' }}
      >
        <Aura tone="sauge" size={480} className="hidden md:block -right-28 bottom-6" />
        <Aura tone="beige" size={360} className="hidden md:block -left-24 top-24 opacity-80" />
        <div className="relative mx-auto w-full max-w-[1360px] px-6 md:px-12">
          <Ornament className="mb-16" />
          <div className="grid lg:grid-cols-12 gap-x-12 gap-y-10">
            <Reveal className="lg:col-span-5">
              <Eyebrow>{SECTION3.eyebrow}</Eyebrow>
              <SectionTitle className="mt-5">{SECTION3.title}</SectionTitle>
              <p className="mt-6 font-serif text-brassInk text-[clamp(1.2rem,1.9vw,1.55rem)] leading-snug max-w-[30ch]">
                {SECTION3.subtitle}
              </p>
            </Reveal>
            <Reveal delay={0.08} className="lg:col-span-7 lg:pt-3">
              {SECTION3.paragraphs.map((p, i) => (
                <p
                  key={p.slice(0, 24)}
                  className={`font-sans text-[0.95rem] leading-[1.85] text-inkSoft max-w-[54ch] ${i > 0 ? 'mt-6' : ''}`}
                >
                  {p}
                </p>
              ))}
              <p
                className="mt-9 font-serif font-medium text-[clamp(1.3rem,2.2vw,1.7rem)] leading-snug"
                style={{ color: TONE_INK.sauge }}
              >
                {SECTION3.closing}
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════ SECTION 5 · Une place où les connaissances se rencontrent ═══════ */}
      <section className="relative overflow-hidden bg-cream py-24 md:py-36">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-24"
          style={{ background: 'linear-gradient(180deg, #e8ecd7 0%, transparent 100%)' }}
        />
        <Aura tone="beige" size={520} className="-right-40 -top-24" />
        <div className="relative mx-auto w-full max-w-[1360px] px-6 md:px-12">
          <Ornament className="mb-16" />
          <div className="grid lg:grid-cols-12 gap-x-12 gap-y-10">
            <Reveal className="lg:col-span-5">
              <Eyebrow>{SECTION5.eyebrow}</Eyebrow>
              <SectionTitle long className="mt-5">
                {SECTION5.title}
              </SectionTitle>
            </Reveal>
            <Reveal delay={0.08} className="lg:col-span-7 lg:pt-3">
              {SECTION5.intro.map((p, i) => (
                <p
                  key={p.slice(0, 24)}
                  className={`font-sans text-[0.95rem] leading-[1.85] text-inkSoft max-w-[54ch] ${i > 0 ? 'mt-6' : ''}`}
                >
                  {p}
                </p>
              ))}
            </Reveal>
          </div>

        </div>

        {/* la fleur : l'Ayurveda en racines, huit pétales qui s'illuminent, pleine largeur */}
        <Reveal className="mt-16">
          <FleurDuFoyer />
        </Reveal>

        <div className="relative mx-auto w-full max-w-[1360px] px-6 md:px-12">
          <div className="mt-16 border-t border-brass/25">
            {SECTION5.items.map((it, i) => (
              <Reveal key={it.title}>
                <div className="grid items-baseline gap-x-12 gap-y-2 border-b border-brass/25 py-7 lg:grid-cols-12">
                  <div className="flex items-baseline gap-5 lg:col-span-5">
                    <span
                      className="relative flex h-8 w-8 shrink-0 -translate-y-1 items-center justify-center self-center rounded-full font-sans text-[0.68rem] tracking-[0.08em] tabular-nums"
                      style={{
                        background: `radial-gradient(circle at 40% 36%, rgba(${AURAS[ROW_TONES[i % ROW_TONES.length]]},0.5), rgba(${AURAS[ROW_TONES[i % ROW_TONES.length]]},0.14) 70%, transparent 100%)`,
                        color: TONE_INK[ROW_TONES[i % ROW_TONES.length]],
                      }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h3 className="font-serif text-xl md:text-2xl text-ink">{it.title}</h3>
                  </div>
                  <p className="lg:col-span-7 font-sans text-[0.92rem] leading-[1.85] text-inkSoft max-w-[58ch] pl-10 lg:pl-0">
                    {it.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ SECTION 6 · Les méditations (photo pleine, parallaxe) ═══════ */}
      <section className="relative overflow-hidden bg-espressoDeep py-28 md:py-44">
        <div aria-hidden className="absolute inset-0">
          <Parallax speed={0.16} className="h-full" innerClassName="h-full">
            <img
              src="/foyer/meditation.webp"
              alt=""
              loading="lazy"
              className="h-full w-full scale-125 object-cover"
              style={{ objectPosition: '68% center' }}
            />
          </Parallax>
          <span className="absolute inset-0" style={{ background: 'rgba(22,16,10,0.58)' }} />
        </div>
        <div className="relative mx-auto w-full max-w-[1360px] px-6 md:px-12">
          <Ornament on="dark" motto className="mb-16" />
          <div className="grid lg:grid-cols-12 gap-x-12 gap-y-10">
            <Reveal className="lg:col-span-5">
              <Eyebrow on="dark">{SECTION6.eyebrow}</Eyebrow>
              <SectionTitle on="dark" long className="mt-5">
                {SECTION6.title}
              </SectionTitle>
            </Reveal>
            <Reveal delay={0.08} className="lg:col-span-7 lg:pt-3">
              {SECTION6.paragraphs.map((p, i) => (
                <p
                  key={p.slice(0, 24)}
                  className={`font-sans text-[0.95rem] leading-[1.85] text-ctextSoft max-w-[52ch] ${i > 0 ? 'mt-6' : ''}`}
                >
                  {p}
                </p>
              ))}
              <p className="mt-8 font-serif font-medium text-brass text-[clamp(1.3rem,2.2vw,1.7rem)] leading-snug max-w-[40ch]">
                {SECTION6.emphasis}
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════ SECTION 7 · La signature du Foyer ═══════ */}
      <section className="relative bg-cream2 py-24 md:py-36">
        <div className="relative mx-auto w-full max-w-[1360px] px-6 md:px-12">
          <div className="grid lg:grid-cols-12 gap-x-14 gap-y-14 items-start">
            <Reveal className="lg:col-span-7">
              <Eyebrow>{SECTION7.eyebrow}</Eyebrow>
              <SectionTitle long className="mt-5 max-w-[30ch]">
                {SECTION7.title}
              </SectionTitle>
              {SECTION7.paragraphs.map((p) => (
                <p key={p.slice(0, 24)} className="mt-6 font-sans text-[0.95rem] leading-[1.85] text-inkSoft max-w-[52ch]">
                  {p}
                </p>
              ))}

              <div className="mt-12 flex flex-wrap gap-x-16 gap-y-8 border-y border-ink/[0.12] py-9 max-w-[52ch]">
                {SECTION7.stats.map((s) => (
                  <div key={s.value} className="flex flex-col gap-2">
                    <span
                      className="font-serif text-[3rem] md:text-[4rem] font-medium leading-none tracking-[-0.01em]"
                      style={{ color: TONE_INK.terre }}
                    >
                      {s.value}
                    </span>
                    <span className="font-sans text-[0.8rem] leading-snug text-inkSoft max-w-[26ch]">{s.label}</span>
                  </div>
                ))}
              </div>

              <p className="mt-10 font-serif font-medium text-ink text-[clamp(1.25rem,2vw,1.6rem)] leading-snug">
                {SECTION7.emphasis}
              </p>
              <p className="mt-3 font-serif font-medium text-brassInk text-[clamp(1.25rem,2vw,1.6rem)] leading-snug max-w-[42ch]">
                {SECTION7.closing}
              </p>
            </Reveal>

            <Reveal delay={0.1} className="relative lg:col-span-5 lg:sticky lg:top-24">
              <Aura tone="terre" size={420} className="-right-24 top-6 opacity-85" />
              <span className="block h-px w-10 bg-brass mb-5" aria-hidden />
              <div className="relative ring-1 ring-brass/40 rounded-[30px] shadow-depth overflow-hidden bg-card p-2.5">
                <div className="relative overflow-hidden rounded-[22px] aspect-[4/5]">
                  <Parallax speed={0.1} className="h-full" innerClassName="h-full">
                    <img
                      src="/krystine-portrait.jpg"
                      alt="Krystine St-Laurent"
                      loading="lazy"
                      className="w-full h-full object-cover scale-110"
                      referrerPolicy="no-referrer"
                    />
                  </Parallax>
                </div>
              </div>
              <p className="mt-4 font-sans text-[0.8rem] tracking-[0.06em] text-inkSoft">{SECTION7.photoCaption}</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════ SECTION 8 · Votre attention (s'anime au défilement) ═══════ */}
      <section
        className="relative overflow-hidden py-24 md:py-36"
        style={{ background: 'linear-gradient(180deg, #f1ebe0 0%, #e9eef1 26%, #e4ebef 100%)' }}
      >
        <Aura tone="bleu" size={520} className="hidden md:block -right-32 bottom-8" />
        <Aura tone="prune" size={380} className="hidden md:block -right-24 top-16 opacity-70" />
        <div className="relative mx-auto w-full max-w-[1360px] px-6 md:px-12">
          <Ornament className="mb-16" />
          <Reveal className="max-w-[44rem]">
            <Eyebrow>{SECTION8.eyebrow}</Eyebrow>
            <SectionTitle long className="mt-5 max-w-[34ch]">
              {SECTION8.title}
            </SectionTitle>
            <p className="mt-6 font-serif text-brassInk text-[clamp(1.2rem,1.9vw,1.55rem)] leading-snug">
              {SECTION8.subtitle}
            </p>
          </Reveal>

          {/* les trois situations apparaissent l'une après l'autre */}
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {SECTION8.situations.map((sit, i) => {
              const tone: AuraTone = (['terre', 'bleu', 'prune'] as AuraTone[])[i];
              return (
                <Reveal key={sit.slice(0, 20)} delay={i * 0.18}>
                  <div
                    className="relative h-full overflow-hidden rounded-[30px] border p-8"
                    style={{
                      borderColor: `rgba(${AURAS[tone]},0.4)`,
                      background: `linear-gradient(165deg, rgba(${AURAS[tone]},0.14), #faf7f0 62%)`,
                    }}
                  >
                    <span
                      className="font-sans text-[0.68rem] tracking-[0.2em] tabular-nums"
                      style={{ color: TONE_INK[tone] }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <p className="mt-4 font-sans text-[0.92rem] leading-[1.85] text-ink">{sit}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>

          <Reveal delay={0.2} className="mt-14 max-w-[54ch]">
            <p className="font-sans text-[0.68rem] uppercase tracking-[0.22em] text-brassInk">
              {SECTION8.consequenceTitle}
            </p>
            {SECTION8.consequence.map((p) => (
              <p key={p.slice(0, 24)} className="mt-5 font-sans text-[0.95rem] leading-[1.85] text-inkSoft">
                {p}
              </p>
            ))}
          </Reveal>

          <Reveal className="mt-16 max-w-[54ch]">
            <h3 className="font-serif font-medium text-ink text-[clamp(1.4rem,2.4vw,1.9rem)] leading-snug">
              {SECTION8.protectionTitle}
            </h3>
            {SECTION8.protection.map((p) => (
              <p key={p.slice(0, 24)} className="mt-5 font-sans text-[0.95rem] leading-[1.85] text-inkSoft">
                {p}
              </p>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ═══════ SECTION 10 · FAQ ═══════ */}
      <section className="relative overflow-hidden bg-cream2 py-24 md:py-36">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-24"
          style={{ background: 'linear-gradient(180deg, #e4ebef 0%, transparent 100%)' }}
        />
        <div className="relative mx-auto w-full max-w-[1360px] px-6 md:px-12">
          <Reveal className="max-w-[36ch] mb-14">
            <Eyebrow>Avant de dire oui</Eyebrow>
            <SectionTitle className="mt-5">Questions fréquentes</SectionTitle>
          </Reveal>
          <div className="mx-auto max-w-4xl">
            {FAQ.map((item, i) => (
              <Reveal key={item.q}>
                <FaqRow item={item} i={i} open={openFaq === i} onClick={() => setOpenFaq(openFaq === i ? null : i)} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
