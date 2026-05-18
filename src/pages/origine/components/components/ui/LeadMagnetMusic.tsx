import React from 'react';
import { motion } from 'framer-motion';
import { DownloadCloud, Sparkles, Headphones, Activity } from 'lucide-react';

const ANIMATIONS = {
  container: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.2 } },
  },
  item: {
    hidden: { opacity: 0, y: 20, filter: 'blur(10px)' },
    visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 100, damping: 20 } },
  },
  image: {
    initial: { opacity: 0, scale: 0.8, filter: 'blur(15px)', rotate: -15 },
    animate: { opacity: 1, scale: 1, filter: 'blur(0px)', rotate: 0, transition: { type: 'spring', stiffness: 80, damping: 20, delay: 0.2 } },
  },
};

export const LeadMagnetMusic: React.FC = () => {
  return (
    <section className="py-24 lg:py-32 px-6 bg-paper dark:bg-ink-forest relative overflow-hidden w-full">
      {/* Immersive Background Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(154,107,73,0.1),transparent_60%)] dark:bg-[radial-gradient(circle_at_30%_50%,rgba(230,163,116,0.08),transparent_60%)]"
        />
        <div className="absolute inset-0 bg-noise opacity-[0.03] mix-blend-overlay"></div>
      </div>
      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 md:px-12 flex flex-col lg:flex-row items-center justify-between gap-16 lg:gap-24">
        
        {/* LEFT COLUMN: The Circular Visual + Souffle badge stacked.
            Switched to `flex-col` so the Souffle d'Origine badge sits
            cleanly under the disc instead of next to it. */}
        <div className="relative w-full lg:w-1/2 flex flex-col items-center justify-center shrink-0 mt-8 lg:mt-0">
          
          {/* Rotating Copper Rings */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-[-10%] md:inset-[-20%] rounded-full border border-dashed border-copper-bruni/30 dark:border-copper-glow/20"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-[5%] md:inset-[0%] rounded-full border border-copper-bruni/10 dark:border-copper-glow/10"
          />
          {/* Floating PNG Container — disc itself. The Souffle d'Origine
              badge used to live inside this absolutely-positioned, but
              the inner flex centering + transform was pushing it off-axis
              when the host app's typography baseline shifted. Moving the
              badge OUT to a sibling under the disc and centering with the
              parent column's flex makes "centered under the headphones"
              robust regardless of host typography. */}
          <div className="relative h-64 w-64 md:h-[400px] md:w-[400px] rounded-full flex items-center justify-center overflow-visible bg-[#D5CEC4] dark:bg-paper-dark border border-transparent dark:border-copper-bruni/20 shadow-inner transition-colors duration-700">
            <motion.div
              animate={{ y: [-15, 15, -15] }}
              transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
              className="relative z-10 w-full h-full flex items-center justify-center"
            >
              <motion.img
                variants={ANIMATIONS.image}
                initial="initial"
                whileInView="animate"
                viewport={{ once: true }}
                src="https://storage.googleapis.com/origine1/headphones.png"
                alt="Expérience Origine Headphones"
                className="w-full h-full object-contain drop-shadow-[0_30px_50px_rgba(0,0,0,0.25)] dark:drop-shadow-[0_30px_60px_rgba(0,0,0,0.6)] p-6 md:p-10 brightness-105 transition-all duration-700"
                draggable={false}
              />
            </motion.div>
          </div>

          {/* Status Badge — sits under the disc, centered by the parent
              column's `justify-center`. -mt-5 lifts it back over the disc
              edge so it visually overlaps like the original layout. */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="-mt-5 whitespace-nowrap z-20"
          >
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold text-paper dark:text-ink-sureau bg-ink-sureau dark:bg-paper px-6 py-3 rounded-full shadow-xl transition-colors duration-700">
              <span className="h-1.5 w-1.5 rounded-full bg-copper-honey dark:bg-copper-bruni animate-pulse" />
              Souffle d'Origine
            </div>
          </motion.div>
        </div>
        {/* RIGHT COLUMN: Content */}
        <motion.div
          variants={ANIMATIONS.container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left"
        >
          <motion.div variants={ANIMATIONS.item} className="flex items-center gap-2 text-copper-bruni dark:text-copper-glow text-xs font-bold uppercase tracking-[0.2em] mb-4">
            <Headphones size={14} />
            Trame Sonore Originale
          </motion.div>
          
          <motion.h2 variants={ANIMATIONS.item} className="text-4xl md:text-5xl lg:text-6xl font-serif text-ink-sureau dark:text-paper mb-6 leading-tight">
            Fréquence <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-copper-bruni to-copper-honey dark:from-copper-glow dark:to-copper-light">d'Origine</span>
          </motion.h2>
          
          <motion.p variants={ANIMATIONS.item} className="text-lg text-ink-sureau/70 dark:text-paper/70 font-light leading-relaxed mb-8 max-w-md">
            La musique qui vous accompagne sur cette page a été composée pour réaligner votre système nerveux. Emportez cette fréquence avec vous pour retrouver votre centre à tout moment.
          </motion.p>
          {/* Metrics */}
          <motion.div variants={ANIMATIONS.item} className="flex gap-8 mb-10 border-y border-copper-bruni/20 dark:border-copper-bruni/20 py-4 w-full max-w-md justify-center lg:justify-start">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-ink-sureau/60 dark:text-paper/60">
                    <Activity size={12} /> Fréquence
                </div>
                <span className="font-serif text-xl text-copper-bruni dark:text-copper-light">432 Hz</span>
            </div>
            <div className="w-px h-10 bg-copper-bruni/20 dark:bg-copper-bruni/30"></div>
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-ink-sureau/60 dark:text-paper/60">
                    <Sparkles size={12} /> Qualité
                </div>
                <span className="font-serif text-xl text-copper-bruni dark:text-copper-light">Studio Haute Résolution</span>
            </div>
          </motion.div>
          {/* Download Button */}
          <motion.a
            variants={ANIMATIONS.item}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            href="https://www.krystinestlaurent.com/musiquedorigine"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex items-center justify-center gap-3 px-10 py-5 bg-white dark:bg-copper-bruni text-ink-sureau dark:text-paper rounded-full font-serif text-xl font-medium overflow-hidden shadow-lg transition-all hover:shadow-xl"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-copper-light/20 to-copper-bruni/20 dark:from-copper-glow dark:to-copper-honey opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <DownloadCloud size={24} className="relative z-10 text-copper-bruni dark:text-paper transition-transform group-hover:-translate-y-1" />
            <span className="relative z-10">Télécharger la musique</span>
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
};
