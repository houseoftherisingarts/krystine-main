import { motion } from 'framer-motion';
import { Compass } from 'lucide-react';

const purposes = [
  "Une connexion à des repères plus anciens, que l’Ayurveda nous guide à retrouver",
  "Observer les rythmes et les éléments qui influencent le corps",
  "Reconnaître les signaux que le corps envoie déjà",
  "Prendre un moment pour voir ce qui s’est accumulé et reconnaître ce qui s’est éloigné de l’axe (ou votre point d'origine)"
];

export default function PurposeSection() {
  return (
    <section className="py-24 px-6 bg-[var(--color-eucalyptus)] text-[var(--color-chalk)] w-full">
      <div className="w-full max-w-[800px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-serif font-light mb-6">
            Ce que sont ces rencontres
          </h2>
          <div className="w-12 h-px bg-[var(--color-copper)] mx-auto" />
        </motion.div>

        <ul className="space-y-8 w-full">
          {purposes.map((purpose, index) => (
            <motion.li
              key={index}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8, delay: index * 0.15, ease: "easeOut" }}
              className="flex items-start"
            >
              <span className="text-[var(--color-chalk)] mr-6 mt-1 shrink-0">
                <Compass size={24} strokeWidth={1.5} />
              </span>
              <span className="text-lg md:text-xl font-sans font-light leading-relaxed">
                {purpose}
              </span>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
