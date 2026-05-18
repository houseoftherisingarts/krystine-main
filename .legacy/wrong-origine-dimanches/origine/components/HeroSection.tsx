import { motion } from 'framer-motion';

export default function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-6 py-24 overflow-hidden">
      {/* Subtle organic background texture/gradient */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[var(--color-eucalyptus-light)] rounded-full mix-blend-multiply filter blur-[120px] opacity-20 animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-[var(--color-copper-light)] rounded-full mix-blend-multiply filter blur-[150px] opacity-10" />
      </div>

      <div className="relative z-10 w-full max-w-[800px] mx-auto flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="mb-12 text-center"
        >
          <h1 className="text-[clamp(1.2rem,4.5vw,5rem)] font-sans font-light leading-tight tracking-[0.2em] text-[var(--color-eucalyptus-dark)] mb-8 uppercase whitespace-nowrap">
            LES DIMANCHES <span className="typo-origine font-serif italic tracking-normal text-[1.1em]">D'ORIGINE</span>
          </h1>
          <p className="text-2xl md:text-4xl font-serif font-medium text-[var(--color-copper)] mb-6">
            Trois rencontres. Trois pierres fondatrices.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
          className="w-full max-w-[800px] bg-white/50 backdrop-blur-md p-8 rounded-[15px] shadow-[0_10px_40px_-10px_rgba(90,107,93,0.1)] border border-[var(--color-eucalyptus)]/10"
        >
          <div className="flex flex-col items-center">
            <a
              href="https://www.krystinestlaurent.com/dimancheorigine"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full block text-center px-10 py-6 bg-[var(--color-copper)] text-[var(--color-chalk)] rounded-[15px] overflow-hidden transition-all duration-300 hover:bg-[var(--color-copper-dark)] hover:shadow-xl hover:shadow-[var(--color-copper)]/30 hover:-translate-y-1 font-sans font-bold tracking-widest text-lg md:text-xl uppercase"
            >
              Recevoir les rediffusions
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
