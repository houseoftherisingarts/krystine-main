import { motion } from 'framer-motion';
import FootprintTrail from './FootprintTrail';

export default function DestinationSection() {
  return (
    <section className="relative pt-8 pb-32 px-6 bg-[#FBF9F6]">
      <div className="mb-8">
        <FootprintTrail count={4} colorClass="text-[#B58A59]/50" />
      </div>

      <div className="relative z-10 w-full max-w-[800px] mx-auto text-center flex flex-col items-center">
        {/* Formulaire d'inscription */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="w-full max-w-[800px] mb-16"
        >
          <div className="flex flex-col items-center">
            <a
              href="https://www.krystinestlaurent.com/dimancheorigine"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full block text-center px-10 py-6 bg-[#B58A59] text-white rounded-[15px] overflow-hidden transition-all duration-300 hover:bg-[#9A734A] hover:shadow-xl hover:shadow-[#B58A59]/30 hover:-translate-y-1 font-sans font-bold tracking-widest text-lg md:text-xl uppercase"
            >
              Recevoir les rediffusions
            </a>
          </div>
        </motion.div>

        <div className="mb-16">
          <FootprintTrail count={3} colorClass="text-[#B58A59]/50" />
        </div>

        <motion.a
          href="https://krystinestlaurent.ca/origine/"
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
          className="block w-full border-2 border-[#B58A59] bg-white shadow-xl rounded-[30px] p-10 md:p-20 lg:p-24 transition-transform duration-300 hover:scale-[1.02] hover:shadow-2xl cursor-pointer"
        >
          <p className="text-xl md:text-2xl font-sans font-light leading-relaxed text-[#4D564A] mb-16 max-w-3xl mx-auto">
            Les Dimanches d’Origine posent les premières pierres.<br />
            <span className="font-serif italic text-[#B58A59] text-3xl md:text-4xl lg:text-5xl mt-5 block">Expérience Origine ouvre la porte.</span>
          </p>
          
          <div className="py-4">
            <h2 className="text-5xl md:text-7xl lg:text-8xl font-serif text-[#B58A59] tracking-wide mb-12 uppercase">
              EXPÉRIENCE ORIGINE
            </h2>
            <div className="flex flex-col items-center gap-4 mt-8">
              <p className="text-2xl md:text-3xl lg:text-4xl font-serif italic text-[#B58A59] max-w-2xl text-center leading-snug">
                Cohorte fondatrice de 350 personnes seulement
              </p>
              <p className="text-sm md:text-base font-sans font-semibold text-[#4D564A] uppercase tracking-[0.2em] mt-3">
                — Places limitées —
              </p>
            </div>
          </div>
        </motion.a>
      </div>
    </section>
  );
}
