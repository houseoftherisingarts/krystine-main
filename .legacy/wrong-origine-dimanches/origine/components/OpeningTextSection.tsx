import { motion } from 'framer-motion';

export default function OpeningTextSection() {
  return (
    <section className="py-24 px-6">
      <div className="w-full max-w-[800px] mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="text-2xl md:text-4xl font-serif font-light leading-relaxed text-[var(--color-eucalyptus-dark)]"
        >
          <span className="block font-medium text-[clamp(0.85rem,2.8vw,2.25rem)] whitespace-nowrap text-[var(--color-eucalyptus-dark)] tracking-wide">
            Votre corps a un agenda. Il suit les saisons. Il garde la mémoire.
          </span>
          <span className="italic text-[var(--color-copper)] mt-6 block text-2xl md:text-4xl">Depuis combien de temps ne l'avez-vous pas consulté ?</span>
          
          <div className="mt-12 p-8 md:p-10 border border-[var(--color-copper)]/30 rounded-[15px] bg-[var(--color-eucalyptus)]/5 relative w-full">
            <span className="block text-lg md:text-xl font-sans font-light leading-relaxed text-[var(--color-eucalyptus-dark)]">
              Les traditions védiques appellent cette jonction <span className="font-serif italic text-[var(--color-copper)]">Ritu Sandhi</span> : le passage entre deux saisons. Ce que vous ressentez en ce moment n'est pas une défaillance. C'est votre corps qui consulte sa propre mémoire. Ces trois dimanches ouvrent cet espace de lecture.
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
