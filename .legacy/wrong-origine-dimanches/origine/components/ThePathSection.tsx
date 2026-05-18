import { motion } from 'framer-motion';

const FootprintIcon = ({ className, isRight }: { className?: string, isRight?: boolean }) => (
  <svg viewBox="0 0 120 200" fill="currentColor" className={className} style={{ transform: isRight ? 'scaleX(-1) rotate(180deg)' : 'rotate(180deg)' }}>
    <ellipse cx="45" cy="25" rx="14" ry="20" transform="rotate(-10 45 25)" />
    <ellipse cx="72" cy="25" rx="10" ry="14" transform="rotate(-5 72 25)" />
    <ellipse cx="92" cy="32" rx="8" ry="12" transform="rotate(5 92 32)" />
    <ellipse cx="106" cy="45" rx="6" ry="10" transform="rotate(15 106 45)" />
    <ellipse cx="114" cy="62" rx="5" ry="8" transform="rotate(25 114 62)" />
    <path d="M 40,65 C 55,50 90,55 105,75 C 110,95 105,135 95,165 C 85,195 55,195 50,165 C 45,135 75,115 40,65 Z" />
  </svg>
);

const steps = [
  {
    id: 1,
    subtitle: "Ce que le corps sait avant vous au changement de saison",
    title: "Repérer",
    description: "Le corps a déjà changé de saison. Observer ce qui s'accumule, reconnaître les quatre façons dont le corps signale que quelque chose demande à circuler autrement.",
    align: "left",
    stoneClass: "w-20 h-20 md:w-24 md:h-24 bg-[var(--color-eucalyptus)] rounded-[40%_60%_70%_30%/40%_50%_60%_50%] shadow-lg opacity-80",
  },
  {
    id: 2,
    subtitle: "Ce n'est pas un manque de volonté",
    title: "Nommer",
    description: "Les règles empruntées, les automatismes qui ne nous appartiennent plus. Mettre un nom sur ce qui agit derrière.",
    align: "right",
    stoneClass: "w-24 h-24 md:w-32 md:h-32 bg-[var(--color-copper)] rounded-[60%_40%_30%_70%/60%_30%_70%_40%] shadow-lg opacity-90",
  },
  {
    id: 3,
    subtitle: "Pourquoi même les meilleurs gestes pour le corps ne tiennent pas",
    title: "Ouvrir",
    description: "Ce qui manque entre voir et tenir. Retrouver un rythme qui tient, sans recommencer à zéro chaque lundi.",
    align: "left",
    stoneClass: "w-32 h-32 md:w-40 md:h-40 bg-[var(--color-eucalyptus-dark)] rounded-[50%_50%_60%_40%/40%_60%_40%_60%] shadow-xl opacity-100",
  },
];

export default function ThePathSection() {
  return (
    <section className="relative pt-16 pb-32 md:pt-24 md:pb-48 px-6 overflow-hidden">
      <div className="w-full max-w-[1100px] mx-auto relative">
        
        {/* Section Header */}
        <div className="text-center mb-32 md:mb-48 px-2 w-full overflow-hidden">
          <h2 className="text-[clamp(1.1rem,4vw,4rem)] font-sans font-light text-[var(--color-eucalyptus-dark)] uppercase tracking-[0.2em] whitespace-nowrap mb-6">
            LES DIMANCHES <span className="typo-origine font-serif italic tracking-normal text-[1.1em]">D'ORIGINE</span>
          </h2>
          <span className="text-[var(--color-copper)] text-xl md:text-3xl font-medium block">
            Trois Pierres Fondatrices
          </span>
        </div>

        {/* The Stepping Stones Container */}
        <div className="relative flex flex-col space-y-16 md:space-y-24">
          {steps.map((step, index) => (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1, ease: "easeOut" }}
              key={step.id}
              className={`relative flex flex-col items-center ${
                step.align === 'left' ? 'md:flex-row' : 'md:flex-row-reverse'
              }`}
            >
              {/* Mobile Stone (appears above text on small screens) */}
              <div className="md:hidden mb-8 flex justify-center w-full">
                <div className={`${step.stoneClass} transition-transform duration-700`} />
              </div>

              {/* Text Content */}
              <div className={`w-full md:w-1/2 flex justify-center ${step.align === 'left' ? 'md:justify-end md:pr-24 lg:pr-32' : 'md:justify-start md:pl-24 lg:pl-32'}`}>
                <div className="w-full max-w-[400px] bg-white rounded-[15px] p-8 md:p-10 shadow-[0_15px_50px_-12px_rgba(90,107,93,0.12)] border border-[var(--color-eucalyptus)]/10 relative z-10">
                  <div className="mb-6">
                    <span className="text-[var(--color-copper)] font-sans uppercase tracking-widest text-xl md:text-2xl font-bold block mb-4">
                      Dimanche {step.id}
                    </span>
                    <span className="text-[var(--color-eucalyptus-dark)] font-sans uppercase tracking-wider text-sm md:text-base font-semibold block leading-snug">
                      {step.subtitle}
                    </span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-serif text-[var(--color-eucalyptus-dark)] mb-4 leading-snug">
                    {step.title}
                  </h3>
                  <p className="text-[var(--color-eucalyptus)] font-sans font-light leading-relaxed text-lg">
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Central Anchor Stone (Desktop) */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex justify-center items-center z-10">
                <div className={`${step.stoneClass} transition-transform duration-700 hover:scale-105 relative z-10`} />
                
                {/* Footprints Trail to next stone */}
                {index < steps.length - 1 && (
                  <div className="absolute top-[65%] left-1/2 -translate-x-1/2 w-32 h-[320px] lg:h-[420px] flex flex-col items-center justify-evenly py-8 z-0">
                    {(index === 0 ? [
                      { isRight: false, className: "w-5 text-gray-400 opacity-50 -translate-x-6 rotate-[15deg]" },
                      { isRight: true, className: "w-5 text-gray-400 opacity-50 translate-x-2 -rotate-[5deg]" },
                      { isRight: false, className: "w-5 text-gray-400 opacity-50 -translate-x-2 rotate-[5deg]" },
                      { isRight: true, className: "w-5 text-gray-400 opacity-50 translate-x-6 -rotate-[15deg]" },
                      { isRight: false, className: "w-5 text-gray-400 opacity-50 -translate-x-4 rotate-[10deg]" },
                    ] : [
                      { isRight: false, className: "w-5 text-gray-400 opacity-50 -translate-x-2 rotate-[5deg]" },
                      { isRight: true, className: "w-5 text-gray-400 opacity-50 translate-x-6 -rotate-[15deg]" },
                      { isRight: false, className: "w-5 text-gray-400 opacity-50 -translate-x-6 rotate-[15deg]" },
                      { isRight: true, className: "w-5 text-gray-400 opacity-50 translate-x-2 -rotate-[5deg]" },
                      { isRight: false, className: "w-5 text-gray-400 opacity-50 -translate-x-4 rotate-[10deg]" },
                    ]).map((fp, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.5, y: -10 }}
                        whileInView={{ opacity: 1, scale: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.4, delay: 0.6 + i * 0.2, ease: "easeOut" }}
                      >
                        <FootprintIcon isRight={fp.isRight} className={fp.className} />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Empty half for spacing (Desktop) */}
              <div className="hidden md:block w-1/2" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
