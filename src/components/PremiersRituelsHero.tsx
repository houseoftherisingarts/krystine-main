import React from 'react';
import { useApp } from '../contexts/AppContext';
import { ASSETS } from '../content';

// Hero « Les Premiers Rituels » — programme d'entrée à 27 $.
// Visible sur l'accueil (entre la Trilogie et la Correspondance) et sur
// la page Formations.
//
// Layout :
//   ├── Gauche : eyebrow → titre → prix (27 $) → CTA → sous-titre
//   └── Droite : 2×2 cartes numérotées, posées au-dessus d'un mandala
//       parchemin (sépia, faible opacité) → matière ancrée sans picto
//       qui se bat avec le texte.

const CHECKOUT_URL = 'https://www.krystinestlaurent.com/offers/2ksjqcW3/checkout';

// Rameau décoratif repris des deux coins du bloc. Même vocabulaire que
// les sprigs apothicaires du reste du site.
const Laurel: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 80 100" aria-hidden className={className}>
    <path d="M 40 96 C 38 70, 44 44, 38 20 C 34 12, 42 4, 48 2" fill="none" stroke="#8B674A" strokeWidth="0.9" strokeLinecap="round" />
    {[
      { x: 30, y: 80, r: -30 },
      { x: 48, y: 68, r: 25 },
      { x: 28, y: 58, r: -25 },
      { x: 46, y: 46, r: 20 },
      { x: 32, y: 34, r: -20 },
      { x: 44, y: 22, r: 15 },
    ].map((p, i) => (
      <ellipse key={i} cx={p.x} cy={p.y} rx="5" ry="1.5"
        transform={`rotate(${p.r} ${p.x} ${p.y})`}
        fill="#8A8F72" fillOpacity="0.35" stroke="#8B674A" strokeWidth="0.5" />
    ))}
  </svg>
);

interface Props {
  /** Extra class on the outer <section> — typically a margin utility. */
  className?: string;
}

const PremiersRituelsHero: React.FC<Props> = ({ className = '' }) => {
  const { lang } = useApp();

  const items: { count: number; labelFR: string; labelEN: string }[] = [
    { count: 3, labelFR: "Introduction à l'Ayurveda",    labelEN: 'Introduction to Ayurveda' },
    { count: 4, labelFR: 'Auto-massage',                  labelEN: 'Self-massage' },
    { count: 2, labelFR: 'Soins du nez et de la bouche',  labelEN: 'Nose & mouth care' },
    { count: 1, labelFR: 'Soins des mains et des pieds',  labelEN: 'Hands & feet care' },
  ];

  return (
    <section className={`w-full ${className}`}>
      <div
        className="w-full rounded-[28px] overflow-hidden relative grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]"
        style={{
          background: 'linear-gradient(135deg, rgba(122,128,102,0.20) 0%, rgba(232,208,190,0.55) 55%, rgba(184,83,47,0.20) 100%)',
          border: '1px solid rgba(184,83,47,0.30)',
          boxShadow: '0 16px 48px rgba(107,74,47,0.14)',
        }}
      >
        <Laurel className="absolute top-4 left-4 w-12 h-14 md:w-16 md:h-20 opacity-70 pointer-events-none z-10" />
        <div className="absolute bottom-4 right-4 w-12 h-14 md:w-16 md:h-20 opacity-70 pointer-events-none z-10 scale-x-[-1]">
          <Laurel className="w-full h-full" />
        </div>

        {/* Left — eyebrow → title → price (moved up) → CTA → tagline */}
        <div className="relative p-8 md:p-12 lg:p-14 flex flex-col items-start gap-6 bg-[rgba(244,231,221,0.55)]">
          <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] font-bold text-[#6B402F]">
            <i className="fa-solid fa-seedling text-[#7A8066]" />
            {lang === 'FR' ? 'Premier pas · Accessible' : 'First step · Accessible'}
          </span>

          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl leading-[1.1] text-[#3A251E]">
            {lang === 'FR'
              ? (<>Découvrez les<br/><em className="not-italic text-[#B8532F]">premiers rituels</em></>)
              : (<>Discover the<br/><em className="not-italic text-[#B8532F]">first rituals</em></>)}
          </h2>

          {/* Prix — remonté juste sous le titre pour que l'offre se lise
              dans les deux premières secondes. */}
          <div>
            <span className="block text-[10px] uppercase tracking-[0.3em] font-bold text-[#B8532F] mb-1">
              {lang === 'FR' ? 'Accès immédiat' : 'Instant access'}
            </span>
            <span className="font-serif text-5xl md:text-6xl text-[#3A251E] leading-none inline-block">
              27&nbsp;$
            </span>
          </div>

          <a
            href={CHECKOUT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group/buy inline-flex items-center gap-3 px-7 py-3.5 rounded-full text-[12px] uppercase font-semibold transition-[filter] duration-300 hover:[filter:brightness(1.06)]"
            style={{
              backgroundColor: '#6B402F',
              color: '#F4E7DD',
              border: '1px solid rgba(184,83,47,0.55)',
              letterSpacing: '0.28em',
              boxShadow: '0 8px 22px rgba(107,74,47,0.20)',
            }}
          >
            {lang === 'FR' ? 'Commencer le parcours' : 'Start the journey'}
            <i className="fa-solid fa-arrow-right text-[10px] transition-transform duration-300 group-hover/buy:translate-x-1" />
          </a>

          <div className="w-14 h-px bg-[#B8532F]/50 mt-2" />
          <p className="font-serif italic text-[#3A251E]/70 leading-relaxed max-w-md text-[15px] md:text-base">
            {lang === 'FR'
              ? "Un programme parfait pour faire vos premiers pas dans l'immense univers que nous offre l'Ayurveda et ses sagesses ancestrales."
              : 'A program perfect for taking your first steps into the vast world of Ayurveda and its ancestral wisdom.'}
          </p>
        </div>

        {/* Right — 4 bracketed-number cards with a sepia mandala watermark
            behind them. Mandala sits absolutely-positioned, filter-sepia +
            low opacity so its original chakra colours disappear into the
            parchment palette. */}
        <div className="relative p-8 md:p-12 lg:p-14 flex flex-col justify-center">
          {/* Mandala parchemin — repris de ChakraDecorations, centré,
              teinté sépia pour fondre dans la palette. Pointer-events:none
              + z-index 0 sous la grille. */}
          <img
            src={ASSETS.chakras[0]}
            alt=""
            aria-hidden
            className="absolute inset-0 m-auto pointer-events-none"
            style={{
              width: '85%',
              height: '85%',
              maxWidth: '520px',
              maxHeight: '520px',
              objectFit: 'contain',
              opacity: 0.15,
              // Sepia filter chain → neutralise les couleurs originales
              // et tire l'image vers le ton parchemin/brun.
              filter: 'sepia(1) saturate(0.9) hue-rotate(-10deg) brightness(0.95) contrast(0.9)',
              mixBlendMode: 'multiply',
              top: 0, bottom: 0, left: 0, right: 0,
            }}
          />

          <div className="relative z-10">
            <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#B8532F] mb-8 flex items-center gap-3">
              <span className="w-8 h-px bg-[#B8532F]/60" />
              {lang === 'FR' ? 'Ce programme comprend' : 'The program includes'}
              <span className="w-8 h-px bg-[#B8532F]/60" />
            </p>

            <div className="grid grid-cols-2 gap-5 md:gap-6">
              {items.map(({ count, labelFR, labelEN }, i) => (
                <div
                  key={i}
                  className="group/capsule relative flex flex-col items-center text-center gap-2 p-5 md:p-6 rounded-2xl transition-all duration-500 hover:-translate-y-0.5"
                  style={{
                    background: '#F4E7DD',
                    border: '1px solid rgba(184,83,47,0.28)',
                    boxShadow: '0 4px 14px rgba(107,74,47,0.10)',
                  }}
                >
                  {/* Chiffre grand format Cormorant, sans crochet. */}
                  <div className="font-serif leading-none text-[#3A251E] text-5xl md:text-6xl">
                    {count}
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#B8532F]">
                    {count === 1
                      ? (lang === 'FR' ? 'capsule' : 'capsule')
                      : (lang === 'FR' ? 'capsules' : 'capsules')}
                  </span>
                  <div className="w-8 h-px bg-[#B8532F]/40 my-1" />
                  <p className="font-serif text-[#3A251E] text-[14px] md:text-[15px] leading-snug">
                    {lang === 'FR' ? labelFR : labelEN}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-5 border-t border-[#B8532F]/20 text-[11px] uppercase tracking-[0.25em] font-bold text-[#3A251E]/55 flex items-center justify-center gap-3">
              <i className="fa-solid fa-play text-[#B8532F] text-[10px]" />
              {lang === 'FR' ? '10 capsules vidéo · à votre rythme' : '10 video capsules · at your pace'}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PremiersRituelsHero;
