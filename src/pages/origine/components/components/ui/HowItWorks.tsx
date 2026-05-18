import React from 'react';
import { motion } from 'framer-motion';

const blocks = [
  {
    title: "Les modules audios",
    description: <><strong>La lecture qui manquait.</strong> Chaque semaine, <strong>le corps devient plus lisible</strong>. Les signaux qui semblaient confus <strong>deviennent des réponses</strong>. À écouter en marchant, en cuisinant, à votre rythme.</>
  },
  {
    title: "Les méditations guidées",
    description: <>Ce qui a été reçu a <strong>besoin de se déposer</strong>. <strong>Un ancrage court</strong>, entre les rendez-vous, pour que la compréhension <strong>descende de la tête vers le corps</strong>.</>
  },
  {
    title: "Vos questions",
    description: <><strong>Le privilège fondatrice.</strong> Vos questions sont soumises trois jours avant. Krystine et son équipe les lisent, préparent, et le rendez-vous <strong>s'ajuste à ce que vous vivez réellement</strong>. Pas un parcours générique. <strong>Votre réalité.</strong></>
  },
  {
    title: "Notre rendez-vous",
    description: <><strong>Deux heures chaque semaine, en direct.</strong> Krystine enseigne, écoute, ajuste. Chaque rendez-vous se termine par une méditation de groupe. <strong>24 heures de présence directe</strong> sur 12 semaines. Celles qui ont essayé seules savent <strong>pourquoi cela change tout</strong>.</>
  },
  {
    title: "Les gestes comme guidance",
    description: <><strong>Un geste juste</strong>, posé au bon moment, change tout. <strong>La Dinacharya</strong>, l'art ancestral de s'accorder aux rythmes du jour. <strong>Une routine devient un repère</strong> par la simple intention que l'on y dépose. Des <strong>gestes adaptés à votre réalité unique</strong>.</>
  },
  {
    title: "L'espace",
    description: <>Pour celles qui <strong>ne veulent pas traverser seules</strong>. <strong>Un endroit calme</strong> entre les rendez-vous. <strong>Sans notifications, sans obligation</strong> de publier.</>
  }
];

export const HowItWorks: React.FC = () => {
  return (
    <section className="py-24 md:py-32 px-6 bg-paper dark:bg-ink-forest relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.08] pointer-events-none mix-blend-multiply dark:mix-blend-overlay" 
           style={{ 
             backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.5'/%3E%3C/svg%3E")`,
             backgroundSize: '150px'
           }}>
      </div>

      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-copper-honey/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-copper-bruni/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16 md:mb-20">
          <h2 className="text-3xl md:text-5xl font-serif text-ink-sureau dark:text-paper tracking-tight mb-6 px-4">
            Ce qui travaille pour vous chaque semaine
          </h2>
          <div className="w-24 h-px bg-copper-honey/60 mx-auto"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
          {blocks.map((block, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className="w-full bg-[#FDFBF7] dark:bg-ink-noir/40 p-8 md:p-10 rounded-3xl shadow-sm border-l-[3px] border-l-[#C8943E] border-t border-r border-b border-transparent hover:shadow-2xl hover:-translate-y-4 transition-all duration-300 group cursor-default flex flex-col relative overflow-hidden"
            >
              {/* Animated Glow on Hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-copper-glow/0 via-copper-glow/60 to-copper-glow/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 scale-175 blur-3xl"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-5 mb-4">
                  <div className="w-3 h-3 rounded-full bg-[#C8943E] flex-shrink-0 mt-1"></div>
                  <h3 className="text-xl md:text-2xl font-serif font-bold text-ink-sureau dark:text-paper tracking-wide">
                    {block.title}
                  </h3>
                </div>
                <div className="text-ink-sureau/80 dark:text-paper/80 leading-relaxed font-light text-base md:text-lg md:pl-8 [&_strong]:font-bold [&_strong]:text-ink-sureau dark:[&_strong]:text-white">
                  {block.description}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        {/* Animated Cursive Footer */}
        <div className="text-center mt-20 px-4 w-full overflow-hidden">
          <p className="font-handwriting text-2xl md:text-4xl text-copper-bruni dark:text-copper-light max-w-4xl mx-auto leading-relaxed flex flex-col items-center">
            <span className="w-full whitespace-normal text-balance mb-2">
              {'12 semaines pour comprendre les messages du corps'.split('').map((char, i) => (
                <motion.span key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.1, delay: i * 0.03 }}>
                  {char}
                </motion.span>
              ))}
            </span>
            <span className="w-full whitespace-normal text-balance mb-2">
              {'retrouver ce qui nous appartient et revenir'.split('').map((char, i) => (
                <motion.span key={i + 38} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.1, delay: (i + 38) * 0.03 }}>
                  {char}
                </motion.span>
              ))}
            </span>
            <span className="w-full whitespace-normal text-balance text-3xl md:text-5xl mt-2 font-serif uppercase tracking-[0.2em]">
              {'au point d\'ORIGINE'.split('').map((char, i) => (
                <motion.span key={i + 78} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.1, delay: (i + 78) * 0.03 }}>
                  {char}
                </motion.span>
              ))}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
};
