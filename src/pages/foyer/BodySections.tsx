import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Atmosphere, Reveal, Parallax } from '../../components/motion/loeuvre';
import {
  SECTION2,
  SECTION3,
  SECTION4,
  SECTION5,
  SECTION6,
  SECTION7,
  SECTION8,
  SECTION9,
  FAQ,
} from './content';

/**
 * Le Foyer d'Origine · sections de CORPS (2 à 9 + FAQ).
 * Hero, préloader et route vivent dans la session principale.
 * Style L'Œuvre (espresso/cream/brass), page sœur d'OrigineExperience.tsx.
 */

const ease = [0.16, 0.8, 0.24, 1] as const;

/* ── Palette d'auras du moodboard Origine (19 août 2026) ──
   « Chaque cercle contient une aura, jamais vide. L'aura donne la vie,
   la profondeur, l'émotion. » Locale au Foyer : les alias globaux
   prune/sauge/bleuMineral restent neutralisés pour les autres pages. */
const AURAS = {
  beige: '217,196,160', // beige lumière · clarté, douceur, ouverture
  ocre: '199,132,44', // ocre chaud · transformation, énergie juste
  prune: '136,86,130', // prune aquarelle · introspection, profondeur
  sauge: '129,143,96', // sauge végétal · apaisement, régénération
  bleu: '62,110,138', // bleu minéral · fluidité, circulation
  terre: '150,104,66', // terre ancrée · stabilité, enracinement
} as const;
type AuraTone = keyof typeof AURAS;
/* version encre des tons : lisible en gros texte sur crème */
const TONE_INK: Record<AuraTone, string> = {
  beige: '#8a713f',
  ocre: '#8a5a1f',
  prune: '#6b4a66',
  sauge: '#5c6647',
  bleu: '#3d5a6e',
  terre: '#6e5138',
};

/* Tache aquarelle : deux couches radiales décalées + flou, respiration lente. */
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

/* ── La porte du mois : GLB 3D (Meshy) sur charnière réelle, niche derrière.
   Survol = la porte s'entrouvre et la niche s'allume; clic = le mois s'ouvre.
   Fallback (chargement / SSR) : l'asset 2D détouré. ── */
const PorteDuMois3D = React.lazy(() => import('./PorteDuMois3D'));

const hasWebgl = () => {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
};

const PorteDuMois: React.FC<{ open: boolean; onToggle: () => void }> = ({ open, onToggle }) => {
  const [hover, setHover] = useState(false);
  const [webgl] = useState(hasWebgl);
  return (
    <div className="mx-auto w-full max-w-[320px]">
      <button
        type="button"
        onClick={onToggle}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        aria-expanded={open}
        aria-label={open ? 'Refermer la porte de septembre' : 'Ouvrir la porte de septembre'}
        className="relative block aspect-[640/984] w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brass"
      >
        {/* la niche, derrière le battant */}
        <span className="absolute inset-x-[12%] top-[7%] bottom-[6%] overflow-hidden rounded-t-[999px]">
          <img src="/foyer/niche-septembre.webp" alt="" aria-hidden loading="lazy" className="h-full w-full object-cover" />
          <motion.span
            aria-hidden
            className="absolute inset-0"
            animate={{ opacity: open ? 0 : hover ? 0.18 : 0.7 }}
            transition={{ duration: 0.6, ease }}
            style={{ background: '#16100a' }}
          />
        </span>
        {/* halo chaud projeté */}
        <motion.span
          aria-hidden
          className="absolute -inset-8 -z-10 rounded-full"
          animate={{ opacity: open ? 1 : hover ? 0.5 : 0 }}
          transition={{ duration: 0.7, ease }}
          style={{ background: 'radial-gradient(50% 50% at 50% 55%, rgba(199,132,44,0.45), transparent 75%)', filter: 'blur(14px)' }}
        />
        {/* le battant 3D */}
        <React.Suspense
          fallback={
            <img
              src="/foyer/porte-septembre.webp"
              alt="Porte de septembre, sceau doré"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-contain drop-shadow-xl"
            />
          }
        >
          <PorteDuMois3D open={open} hover={hover} />
        </React.Suspense>
      </button>
      <p className="mt-5 text-center font-sans text-[0.62rem] uppercase tracking-[0.3em] text-brassInk">
        {open ? 'Le mois est ouvert' : 'Ouvrir le mois'}
      </p>
    </div>
  );
};

/* ── Séparateur doré du moodboard : filet, losange, deux brins végétaux ── */
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
        {/* brins végétaux */}
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

/* ── Eyebrow : filet brass court EMPILÉ au-dessus du label, jamais inline ── */
const Eyebrow: React.FC<{ children: React.ReactNode; on?: 'dark' | 'light' }> = ({ children, on = 'light' }) => (
  <div className="flex flex-col gap-3">
    <span className="block h-px w-10 bg-brass" aria-hidden />
    <p className={`font-sans text-[0.62rem] uppercase tracking-[0.28em] ${on === 'dark' ? 'text-brass' : 'text-brassInk'}`}>
      {children}
    </p>
  </div>
);

const SectionTitle: React.FC<{ children: React.ReactNode; on?: 'dark' | 'light'; className?: string }> = ({
  children,
  on = 'light',
  className = '',
}) => (
  <h2
    className={`font-serif font-medium uppercase leading-[1.08] text-[clamp(1.9rem,3.4vw,2.7rem)] tracking-[0.04em] ${
      on === 'dark' ? 'text-ctext' : 'text-ink'
    } ${className}`}
  >
    {children}
  </h2>
);

const Dot: React.FC<{ on?: 'dark' | 'light' }> = ({ on = 'light' }) => (
  <span className={`mt-2.5 w-1.5 h-1.5 rounded-full shrink-0 ${on === 'dark' ? 'bg-brass' : 'bg-brassInk'}`} />
);

const roman = ['I', 'II', 'III', 'IV'];
/* une aura par ouverture : regarder=bleu, saison=sauge, pièce=prune, découverte=ocre */
const WEEK_TONES: AuraTone[] = ['bleu', 'sauge', 'prune', 'ocre'];
const ROW_TONES: AuraTone[] = ['ocre', 'sauge', 'prune', 'bleu', 'terre'];

const SEMAINE_IMAGES = [
  '/foyer/sem1-regarder.webp',
  '/foyer/sem2-saison.webp',
  '/foyer/sem3-piece.webp',
  '/foyer/sem4-decouverte.webp',
];

/* ── Seam chaud : la jointure sombre-crème reste dans la gamme du feu
   (voile terracotta au milieu) au lieu de passer par un gris sale ── */
const WarmSeam: React.FC<{ from: string; height?: number }> = ({ from, height = 130 }) => (
  <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-0" style={{ height }}>
    <div
      className="absolute inset-0"
      style={{ background: `linear-gradient(180deg, ${from} 0%, transparent 100%)` }}
    />
    <div
      className="absolute inset-0"
      style={{
        background:
          'linear-gradient(180deg, rgba(176,106,63,0) 0%, rgba(176,106,63,0.14) 42%, rgba(199,154,82,0.06) 68%, rgba(176,106,63,0) 100%)',
      }}
    />
  </div>
);

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
          <p className="pb-7 pl-10 pr-10 font-sans text-[0.92rem] leading-[1.85] text-inkSoft max-w-[58ch]">
            {item.a}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

export default function BodySections() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [moisOuvert, setMoisOuvert] = useState(false);
  const semainesRef = useRef<HTMLDivElement>(null);
  const toggleMois = () => {
    setMoisOuvert((v) => {
      if (!v) window.setTimeout(() => semainesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 500);
      return !v;
    });
  };
  const faqMid = Math.ceil(FAQ.length / 2);
  const faqColumns = [FAQ.slice(0, faqMid), FAQ.slice(faqMid)];

  return (
    <>
      <style>{`
        @keyframes auraBreathe{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.06);opacity:1}}
        @media (prefers-reduced-motion: reduce){[style*="auraBreathe"]{animation:none!important}}
      `}</style>
      {/* ═══════════════ SECTION 2 · L'Histoire du feu (Varanasi) ═══════════════ */}
      <section
        className="relative overflow-hidden py-24 md:py-36"
        style={{ background: 'linear-gradient(180deg, #f6f3ee 0%, #f5e8cf 16%, #f1ddb2 58%, #f3e3c2 100%)' }}
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
                <p key={p} className="mt-6 font-sans text-[0.95rem] leading-[1.85] text-inkSoft max-w-[52ch]">
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

      {/* ═══════════════ SECTION 3 · Le feu reste allumé ═══════════════ */}
      <section
        className="relative overflow-hidden py-24 md:py-36"
        style={{ background: 'linear-gradient(180deg, #f3e3c2 0%, #edf0df 22%, #e8ecd7 100%)' }}
      >
        <Aura tone="sauge" size={480} className="-right-28 bottom-6" />
        <Aura tone="beige" size={360} className="-left-24 top-24 opacity-80" />
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
                  key={p}
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

      {/* ═══════════════ SECTION 4 · Chaque semaine, une nouvelle ouverture ═══════════════ */}
      <section className="relative overflow-hidden bg-cream3 py-24 md:py-36">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-28"
          style={{ background: 'linear-gradient(180deg, #e8ecd7 0%, transparent 100%)' }}
        />
        <div className="relative mx-auto w-full max-w-[1360px] px-6 md:px-12">
          <div className="grid items-center gap-x-12 gap-y-12 lg:grid-cols-12">
            <Reveal className="lg:col-span-4 lg:row-span-2">
              <PorteDuMois open={moisOuvert} onToggle={toggleMois} />
            </Reveal>
            <Reveal delay={0.08} className="lg:col-span-7 lg:col-start-6">
              <Eyebrow>{SECTION4.eyebrow}</Eyebrow>
              <SectionTitle className="mt-5">{SECTION4.title}</SectionTitle>
              <p className="mt-7 font-sans text-[0.95rem] leading-[1.85] text-inkSoft max-w-[46ch]">{SECTION4.intro}</p>
            </Reveal>
          </div>

          {/* les 4 semaines du mois, reliées par un rail brass : un déploiement, pas un catalogue */}
          <div ref={semainesRef} className="relative mt-20 scroll-mt-24">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-8 left-[12%] right-[12%] hidden h-px xl:block"
              style={{ background: 'linear-gradient(90deg, rgba(187,154,94,0) 0%, rgba(187,154,94,0.55) 18%, rgba(187,154,94,0.55) 82%, rgba(187,154,94,0) 100%)' }}
            />
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {SECTION4.openings.map((o, i) => (
                <Reveal key={o.title} delay={i * 0.07}>
                  <div className="relative h-full">
                    <span
                      aria-hidden
                      className="absolute -top-[37px] left-1/2 hidden h-2 w-2 -translate-x-1/2 rounded-full ring-4 ring-cream3 xl:block"
                      style={{ background: `rgb(${AURAS[WEEK_TONES[i]]})` }}
                    />
                    <div
                      className="h-full overflow-hidden rounded-[30px] border"
                      style={{
                        borderColor: `rgba(${AURAS[WEEK_TONES[i]]},0.45)`,
                        background: `linear-gradient(180deg, rgba(${AURAS[WEEK_TONES[i]]},0.16) 0%, #faf7f0 62%)`,
                      }}
                    >
                      <div className="relative h-40 overflow-hidden">
                        <img
                          src={SEMAINE_IMAGES[i]}
                          alt=""
                          aria-hidden
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-700 ease-out hover:scale-105"
                        />
                        <span
                          aria-hidden
                          className="absolute inset-0"
                          style={{ background: 'linear-gradient(to top, rgba(250,247,240,0.25) 0%, transparent 40%)' }}
                        />
                      </div>
                      <div className="p-7">
                        {/* cercle-aura du moodboard : jamais vide */}
                        <span className="relative flex h-14 w-14 items-center justify-center">
                          <span
                            aria-hidden
                            className="absolute inset-0 rounded-full"
                            style={{
                              background: `radial-gradient(circle at 42% 38%, rgba(${AURAS[WEEK_TONES[i]]},0.55), rgba(${AURAS[WEEK_TONES[i]]},0.2) 55%, transparent 78%)`,
                              filter: 'blur(4px)',
                            }}
                          />
                          <span className="relative font-serif text-3xl leading-none" style={{ color: TONE_INK[WEEK_TONES[i]] }}>
                            {roman[i]}
                          </span>
                        </span>
                        <h3 className="mt-4 font-serif text-xl text-ink">{o.title}</h3>
                        <p className="mt-3 font-sans text-[0.9rem] leading-[1.85] text-inkSoft">{o.body}</p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          <Reveal className="mt-16">
            <p className="font-serif text-ink text-[clamp(1.2rem,2vw,1.6rem)] leading-snug max-w-[52ch]">
              {SECTION4.closing}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════ SECTION 5 · Ce que Le Foyer rend possible ═══════════════ */}
      <section className="relative overflow-hidden bg-cream py-24 md:py-36">
        <Aura tone="beige" size={520} className="-right-40 -top-24" />
        <div className="relative mx-auto w-full max-w-[1360px] px-6 md:px-12">
          <Ornament className="mb-16" />
          <Reveal className="max-w-[34rem]">
            <Eyebrow>{SECTION5.eyebrow}</Eyebrow>
            <SectionTitle className="mt-5">{SECTION5.title}</SectionTitle>
          </Reveal>
          {/* liste tabulaire éditoriale : titre serif à gauche, corps à droite, une rangée par promesse */}
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

      {/* ═══════════════ SECTION 6 · Le premier samedi du mois (SOMBRE) ═══════════════ */}
      <section className="relative overflow-hidden py-24 md:py-36" style={{ background: '#241726' }}>
        {/* la chandelle du premier samedi, voilée pour la lisibilité */}
        <img
          src="/foyer/meditation.webp"
          alt=""
          aria-hidden
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover opacity-50"
          style={{ objectPosition: '70% center' }}
        />
        <span aria-hidden className="absolute inset-0" style={{ background: 'rgba(36,23,38,0.62)' }} />
        <WarmSeam from="#f6f3ee" />
        <Atmosphere light="70% 25%" strength={0.8} />
        {/* aura prune : introspection, profondeur (moodboard) */}
        <Aura tone="prune" size={640} className="left-[6%] top-[18%]" />
        <Aura tone="bleu" size={380} className="right-[4%] bottom-[8%] opacity-60" />
        <div className="relative mx-auto w-full max-w-[1360px] px-6 md:px-12">
          <Ornament on="dark" motto className="mb-16" />
          <div className="grid lg:grid-cols-12 gap-x-12 gap-y-10">
            <Reveal className="lg:col-span-5">
              <Eyebrow on="dark">{SECTION6.eyebrow}</Eyebrow>
              <SectionTitle on="dark" className="mt-5">
                {SECTION6.title}
              </SectionTitle>
              <p className="mt-6 font-serif text-[clamp(1.2rem,1.9vw,1.55rem)] leading-snug max-w-[30ch]" style={{ color: '#cfa8ca' }}>
                {SECTION6.subtitle}
              </p>
            </Reveal>
            <Reveal delay={0.08} className="lg:col-span-7 lg:pt-3">
              {SECTION6.paragraphs.map((p) => (
                <p key={p} className="font-sans text-[0.95rem] leading-[1.85] text-ctextSoft max-w-[52ch]">
                  {p}
                </p>
              ))}
              <p className="mt-8 font-serif font-medium text-brass text-[clamp(1.3rem,2.2vw,1.7rem)] leading-snug max-w-[40ch]">
                {SECTION6.emphasis}
              </p>
              {SECTION6.closingParagraphs.map((p) => (
                <p key={p} className="mt-6 font-sans text-[0.95rem] leading-[1.85] text-ctextSoft max-w-[52ch]">
                  {p}
                </p>
              ))}
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════════════ SECTION 7 · Ce qui relie les étoiles (Krystine) ═══════════════ */}
      <section className="relative bg-cream2 py-24 md:py-36">
        <WarmSeam from="#241726" />
        <div className="relative mx-auto w-full max-w-[1360px] px-6 md:px-12">
          <div className="grid lg:grid-cols-12 gap-x-14 gap-y-14 items-start">
            <Reveal className="lg:col-span-7">
              <Eyebrow>{SECTION7.eyebrow}</Eyebrow>
              <SectionTitle className="mt-5">{SECTION7.title}</SectionTitle>
              <p className="mt-8 font-sans text-[0.95rem] leading-[1.85] text-inkSoft max-w-[50ch]">{SECTION7.lead}</p>
              <p className="mt-6 font-serif font-medium text-brassInk text-[clamp(1.25rem,2vw,1.6rem)] leading-snug max-w-[46ch]">
                {SECTION7.emphasis}
              </p>
              {SECTION7.paragraphs.map((p) => (
                <p key={p} className="mt-6 font-sans text-[0.95rem] leading-[1.85] text-inkSoft max-w-[52ch]">
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
                    <span className="font-sans text-[0.8rem] leading-snug text-inkSoft max-w-[26ch]">
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              <h3 className="mt-10 font-serif text-xl md:text-2xl text-ink max-w-[36ch]">{SECTION7.subhead}</h3>
              <ul className="mt-6 space-y-4">
                {SECTION7.questions.map((q) => (
                  <li key={q} className="flex items-start gap-3 font-sans text-[0.92rem] leading-[1.85] text-inkSoft">
                    <Dot />
                    {q}
                  </li>
                ))}
              </ul>
              <p className="mt-8 font-sans text-[0.95rem] leading-[1.85] text-inkSoft max-w-[52ch]">{SECTION7.paragraph2}</p>
              <p className="mt-4 font-serif font-medium text-brassInk text-[clamp(1.25rem,2vw,1.6rem)] leading-snug max-w-[42ch]">
                {SECTION7.closing}
              </p>
            </Reveal>

            <Reveal delay={0.1} className="relative lg:col-span-5 lg:sticky lg:top-24">
              {/* terre ancrée : stabilité, enracinement */}
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

      {/* ═══════════════ SECTION 8 · Ce que comprend l'année ═══════════════ */}
      <section
        className="relative overflow-hidden py-24 md:py-36"
        style={{ background: 'linear-gradient(180deg, #f6f3ee 0%, #e9eef1 24%, #e4ebef 100%)' }}
      >
        <Aura tone="bleu" size={520} className="-left-32 bottom-8" />
        <Aura tone="beige" size={380} className="-right-24 top-10 opacity-70" />
        <div className="relative mx-auto w-full max-w-[1360px] px-6 md:px-12">
          <Ornament className="mb-16" />
          <Reveal className="max-w-[34rem]">
            <Eyebrow>{SECTION8.eyebrow}</Eyebrow>
            <SectionTitle className="mt-5">{SECTION8.title}</SectionTitle>
          </Reveal>

          <div className="mt-16 grid lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            <Reveal className="lg:col-span-7">
              <div className="h-full rounded-[30px] border border-brass/20 bg-card p-8 md:p-10">
                <h3 className="font-serif text-xl md:text-2xl text-ink">{SECTION8.season.title}</h3>
                <div className="mt-6 grid sm:grid-cols-2 gap-8">
                  <ul className="space-y-3">
                    {SECTION8.season.openings.map((li) => (
                      <li key={li} className="flex items-start gap-3 font-sans text-[0.9rem] leading-[1.85] text-inkSoft">
                        <Dot />
                        {li}
                      </li>
                    ))}
                  </ul>
                  <div>
                    <p className="font-sans text-[0.68rem] uppercase tracking-[0.22em] mb-3" style={{ color: TONE_INK.bleu }}>
                      {SECTION8.season.spaceTitle}
                    </p>
                    <ul className="space-y-3">
                      {SECTION8.season.space.map((li) => (
                        <li key={li} className="flex items-start gap-3 font-sans text-[0.9rem] leading-[1.85] text-inkSoft">
                          <Dot />
                          {li}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.08} className="lg:col-span-5 flex flex-col gap-6">
              <div className="rounded-[30px] border border-brass/20 bg-card p-8">
                <h3 className="font-serif text-lg md:text-xl text-ink">{SECTION8.summer.title}</h3>
                <p className="mt-4 font-sans text-[0.9rem] leading-[1.85] text-inkSoft">{SECTION8.summer.text}</p>
              </div>
              <div className="rounded-[30px] border border-brass/20 bg-card p-8">
                <h3 className="font-serif text-lg md:text-xl text-ink">{SECTION8.yearRound.title}</h3>
                <p className="mt-4 font-sans text-[0.9rem] leading-[1.85] text-inkSoft">{SECTION8.yearRound.text}</p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════════════ SECTION 9 · Foyer vs Expérience Origine ═══════════════ */}
      <section className="relative overflow-hidden bg-cream3 py-24 md:py-36">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-28"
          style={{ background: 'linear-gradient(180deg, #e4ebef 0%, transparent 100%)' }}
        />
        <div className="relative mx-auto w-full max-w-[1360px] px-6 md:px-12">
          <Ornament className="mb-16" />
          <Reveal className="max-w-[42ch]">
            <Eyebrow>{SECTION9.eyebrow}</Eyebrow>
            <SectionTitle className="mt-5">{SECTION9.title}</SectionTitle>
          </Reveal>

          <div className="mt-14 grid md:grid-cols-2 gap-6">
            <Reveal>
              <div
                className="relative h-full overflow-hidden rounded-[30px] border p-8 md:p-10"
                style={{ borderColor: 'rgba(199,132,44,0.35)', background: 'linear-gradient(160deg, rgba(199,132,44,0.14), #faf7f0 58%)' }}
              >
                <Aura tone="ocre" size={300} className="-right-20 -top-20" />
                <p className="relative font-sans text-[0.62rem] uppercase tracking-[0.28em] text-brassInk mb-4">Le Foyer</p>
                <h3 className="relative font-serif text-2xl text-ink">{SECTION9.foyer.lead}</h3>
                <p className="relative mt-4 font-sans text-[0.92rem] leading-[1.85] text-inkSoft">{SECTION9.foyer.text}</p>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div
                className="relative h-full overflow-hidden rounded-[30px] border p-8 md:p-10"
                style={{ borderColor: 'rgba(129,143,96,0.5)', background: 'linear-gradient(160deg, rgba(129,143,96,0.16), #f6f3ee 58%)' }}
              >
                <Aura tone="sauge" size={300} className="-right-20 -top-20" />
                <p className="relative font-sans text-[0.62rem] uppercase tracking-[0.28em] text-forestDeep mb-4">
                  L'Expérience Origine
                </p>
                <h3 className="relative font-serif text-2xl text-ink">{SECTION9.experience.lead}</h3>
                <p className="relative mt-4 font-sans text-[0.92rem] leading-[1.85] text-inkSoft">{SECTION9.experience.text}</p>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.12} className="mt-10 max-w-[54ch]">
            <p className="font-serif font-medium text-ink text-[clamp(1.15rem,1.8vw,1.4rem)] leading-snug">
              {SECTION9.bridgeLead}
            </p>
            <p className="mt-4 font-sans text-[0.92rem] leading-[1.85] text-inkSoft">{SECTION9.bridgeBody}</p>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════ FAQ ═══════════════ */}
      <section className="bg-cream2 py-24 md:py-36">
        <div className="mx-auto w-full max-w-[1360px] px-6 md:px-12">
          <Reveal className="max-w-[36ch] mb-14">
            <Eyebrow>Avant de dire oui</Eyebrow>
            <SectionTitle className="mt-5">Questions fréquentes</SectionTitle>
          </Reveal>
          <div className="grid lg:grid-cols-2 gap-x-14">
            {faqColumns.map((col, c) => (
              <Reveal key={c} delay={c * 0.08}>
                {col.map((item, j) => {
                  const i = c * faqMid + j;
                  return (
                    <FaqRow key={item.q} item={item} i={i} open={openFaq === i} onClick={() => setOpenFaq(openFaq === i ? null : i)} />
                  );
                })}
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
