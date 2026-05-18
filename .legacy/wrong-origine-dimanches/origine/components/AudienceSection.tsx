import { motion } from 'framer-motion';

export default function AudienceSection() {
  return (
    <section className="py-24 md:py-32 px-6 bg-[#4D564A] w-full shadow-sm relative overflow-hidden">
      <div className="w-full max-w-[800px] mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <span className="text-[#B58A59] uppercase tracking-[0.15em] font-sans text-sm md:text-base mb-8 block">
            À QUI CES RENCONTRES S'ADRESSENT
          </span>
          <p className="text-[#FBF9F6] text-3xl md:text-5xl lg:text-6xl font-serif italic font-light leading-tight">
            Pour celles qui cherchent un rythme qui tient.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
