import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import { CONTENT, ASSETS } from '../content';
import NewsletterSignup from '../components/NewsletterSignup';

// Reveal preset used across sections. Respects prefers-reduced-motion.
const revealBase = (reduce: boolean) => ({
  initial: reduce ? {} : { opacity: 0, y: 40 },
  whileInView: reduce ? {} : { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
});

const KrystinePage: React.FC = () => {
  const { lang } = useApp();
  const t = CONTENT[lang].founder;
  const navigate = useNavigate();
  const reduce = useReducedMotion() ?? false;

  // Hero image parallax — image drifts slower than the page for depth.
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroProg } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroImgY = useTransform(heroProg, [0, 1], ['0%', '18%']);
  const heroImgScale = useTransform(heroProg, [0, 1], [1.06, 1.14]);

  // Full-bleed image parallax in the mission section.
  const missionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: missionProg } = useScroll({ target: missionRef, offset: ['start end', 'end start'] });
  const missionBgY = useTransform(missionProg, [0, 1], ['-12%', '12%']);

  const reveal = revealBase(reduce);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#0B1A36] to-[#050C1A] text-white overflow-x-hidden">
      {/* Hero */}
      <div ref={heroRef} className="relative pt-44 pb-12 px-6 md:px-12 flex flex-col md:flex-row items-start justify-center max-w-7xl mx-auto gap-12">
        {/* Left: Text */}
        <motion.div
          initial={reduce ? {} : { opacity: 0, y: 20 }}
          animate={reduce ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="md:w-1/2 pt-10 md:sticky md:top-32 h-fit z-20"
        >
          <h2 className="text-[#D4AF37] uppercase tracking-[0.2em] font-bold text-xs md:text-sm mb-4">
            {lang === 'FR' ? 'La Fondatrice' : 'The Founder'}
          </h2>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif text-white mb-6 leading-none">
            Krystine<br /><span className="italic text-white/50">St-Laurent</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/70 font-serif italic max-w-lg mb-8">{t.bio.intro}</p>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mt-8 mb-8">
            {t.stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={reduce ? {} : { opacity: 0, y: 20 }}
                animate={reduce ? {} : { opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 + i * 0.08, ease: 'easeOut' }}
                whileHover={reduce ? {} : { y: -4, scale: 1.02 }}
                className="bg-white/5 backdrop-blur p-6 rounded-2xl border border-white/10 hover:border-[#D4AF37]/40 hover:bg-white/10 hover:shadow-[0_0_30px_rgba(212,175,55,0.12)] transition-all cursor-default"
              >
                <span className="text-3xl font-serif text-[#D4AF37] mb-1 block">{stat.value}</span>
                <span className="text-white/80 uppercase tracking-widest text-[10px] font-bold block">{stat.sub}</span>
                <span className="text-white/40 text-xs font-medium">{stat.label}</span>
              </motion.div>
            ))}
          </div>

          <motion.button
            onClick={() => navigate('/conferenciere')}
            whileHover={reduce ? {} : { scale: 1.02 }}
            whileTap={reduce ? {} : { scale: 0.98 }}
            className="w-full bg-[#D4AF37] text-[#0B1A36] font-bold uppercase tracking-widest text-sm py-4 rounded-xl hover:bg-white transition-colors shadow-lg flex items-center justify-center gap-2"
          >
            {t.cta} <i className="fa-solid fa-arrow-right" />
          </motion.button>
        </motion.div>

        {/* Right: Photo (parallax + hover cross-fade) */}
        <div className="md:w-1/2 relative h-[60vh] md:h-[80vh] w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 group">
          <motion.div
            style={reduce ? undefined : { y: heroImgY, scale: heroImgScale }}
            className="absolute inset-0 will-change-transform"
          >
            <img src={ASSETS.founder} alt="Krystine St-Laurent" className="w-full h-full object-cover object-top absolute inset-0 transition-opacity duration-700 group-hover:opacity-0" />
            <img src={ASSETS.founderHover} alt="Krystine St-Laurent" className="w-full h-full object-cover object-top absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#050C1A] via-transparent to-transparent opacity-80 pointer-events-none" />
        </div>
      </div>

      {/* === Editorial Story — asymmetric chapter === */}
      <section className="relative pt-32 md:pt-44 pb-24 md:pb-32 px-6 md:px-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          {/* Section label — sticky so it accompanies the read-through. */}
          <motion.div
            {...reveal}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="flex items-center gap-6 mb-16 md:mb-20 md:sticky md:top-28 z-10 bg-[#050C1A]/60 backdrop-blur-sm py-2 -mx-6 md:-mx-12 px-6 md:px-12 w-fit rounded-full"
          >
            <span className="h-px w-16 bg-[#D4AF37]" />
            <span className="uppercase tracking-[0.3em] text-[10px] md:text-xs font-bold text-[#D4AF37]">
              {t.story.title}
            </span>
          </motion.div>

          {/* Display pull quote (p3 — the heart of the story) */}
          <motion.blockquote
            {...reveal}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="mb-24 md:mb-32 max-w-6xl"
          >
            <p className="font-serif text-white leading-[1.05] text-4xl md:text-6xl lg:text-7xl">
              <span className="font-serif italic text-[#D4AF37]/40 mr-2">"</span>
              {t.story.p3}
              <span className="font-serif italic text-[#D4AF37]/40 ml-2">"</span>
            </p>
            <footer className="mt-10 flex items-center gap-4">
              <span className="h-px w-10 bg-white/30" />
              <span className="uppercase tracking-[0.3em] text-[10px] font-bold text-white/40">
                {t.story.subtitle}
              </span>
            </footer>
          </motion.blockquote>

          {/* Numbered narrative — offset columns with staggered reveal */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-x-16 gap-y-20">
            {[t.story.p1, t.story.p2, t.story.p4, t.story.p5].map((para, i) => (
              <motion.article
                key={i}
                initial={reduce ? {} : { opacity: 0, y: 50 }}
                whileInView={reduce ? {} : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7, delay: i * 0.12, ease: 'easeOut' }}
                whileHover={reduce ? {} : { y: -4 }}
                className={`md:col-span-6 ${i % 2 === 1 ? 'md:mt-28' : ''} group cursor-default`}
              >
                <span className="block font-serif italic text-[#D4AF37]/70 group-hover:text-[#D4AF37] transition-colors text-3xl md:text-4xl mb-4">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="text-lg md:text-xl text-white/75 group-hover:text-white/90 transition-colors leading-relaxed font-light">
                  {para}
                </p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* === Full-bleed image + mission panel (scroll-linked parallax) === */}
      <section ref={missionRef} className="relative grid grid-cols-1 md:grid-cols-12 items-stretch border-t border-white/5">
        <div className="md:col-span-7 relative min-h-[55vh] md:min-h-[85vh] overflow-hidden">
          <motion.div
            style={reduce ? undefined : { y: missionBgY }}
            className="absolute -inset-y-[15%] inset-x-0 bg-cover bg-center will-change-transform"
          >
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${ASSETS.shopBg})` }} />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#050C1A]/40 via-transparent to-[#050C1A]" />
        </div>
        <motion.div
          initial={reduce ? {} : { opacity: 0, x: 40 }}
          whileInView={reduce ? {} : { opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="md:col-span-5 bg-[#050C1A] p-10 md:p-16 lg:p-20 flex flex-col justify-center"
        >
          <span className="uppercase tracking-[0.3em] text-[10px] font-bold text-[#D4AF37] mb-8 block">
            {lang === 'FR' ? 'L\'Art de vivre conscient' : 'The Art of Conscious Living'}
          </span>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-white leading-[1.15] mb-8">
            {t.bio.mission}
          </h2>
          <p className="text-white/60 text-lg leading-relaxed mb-10 font-light">
            {t.bio.outro}
          </p>
          <div className="flex items-center gap-4 text-white/40 uppercase tracking-[0.25em] text-[10px] font-bold">
            <span className="h-px w-10 bg-[#D4AF37]/50" />
            {t.bio.expert}
          </div>
        </motion.div>
      </section>

      {/* === Correspondence — letter-style newsletter === */}
      <section className="py-32 md:py-40 px-6 md:px-12 border-t border-white/5">
        <motion.div
          {...reveal}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="max-w-3xl mx-auto text-center"
        >
          <span className="uppercase tracking-[0.3em] text-[10px] font-bold text-[#D4AF37] mb-8 block">
            {lang === 'FR' ? 'Une correspondance' : 'A correspondence'}
          </span>
          <h3 className="font-serif text-4xl md:text-6xl text-white leading-tight">
            {t.newsletter.title}
          </h3>
          <h4 className="font-serif italic text-3xl md:text-5xl text-[#D4AF37] leading-tight mb-12">
            {t.newsletter.subtitle}
          </h4>

          <p className="text-white/60 text-lg leading-relaxed max-w-xl mx-auto mb-16 font-light">
            {t.newsletter.intro}
          </p>

          {/* Three italic offerings — no bullets, no borders, just breathing dividers */}
          <ul className="grid grid-cols-1 md:grid-cols-3 border-y border-white/10 mb-16">
            {t.newsletter.list.map((item, i) => (
              <motion.li
                key={i}
                initial={reduce ? {} : { opacity: 0, y: 20 }}
                whileInView={reduce ? {} : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: 'easeOut' }}
                className={`py-8 px-6 text-white/80 font-serif italic text-base leading-relaxed ${
                  i < t.newsletter.list.length - 1 ? 'md:border-r border-white/10' : ''
                }`}
              >
                {item}
              </motion.li>
            ))}
          </ul>

          <NewsletterSignup
            source="krystine"
            variant="dark"
            ctaLabel={t.newsletter.cta}
            placeholder={lang === 'FR' ? 'Votre adresse email' : 'Your email address'}
            className="max-w-xl mx-auto"
          />

          <p className="text-white/30 text-xs italic mt-8">{t.newsletter.outro}</p>
        </motion.div>
      </section>

      {/* === Closing statement === */}
      <section className="relative py-32 md:py-44 px-6 md:px-12 border-t border-white/5 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            initial={reduce ? {} : { scale: 0.8, opacity: 0 }}
            whileInView={reduce ? {} : { scale: 1, opacity: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[90vw] max-w-[900px] max-h-[900px] rounded-full bg-[#D4AF37]/[0.05] blur-3xl"
          />
        </div>

        <motion.div
          {...reveal}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="relative max-w-4xl mx-auto text-center z-10"
        >
          <span className="uppercase tracking-[0.3em] text-[10px] font-bold text-[#D4AF37] mb-10 block">
            {t.footerBio.title}
          </span>
          <p className="font-serif italic text-3xl md:text-5xl lg:text-6xl text-white/90 leading-[1.15] mb-16">
            {t.footerBio.text}
          </p>

          <div className="flex items-center justify-center gap-6 mb-14">
            <span className="h-px w-16 bg-[#D4AF37]/40" />
            <span className="uppercase tracking-[0.3em] text-[11px] font-bold text-[#D4AF37]">
              Krystine St-Laurent
            </span>
            <span className="h-px w-16 bg-[#D4AF37]/40" />
          </div>

          <motion.button
            onClick={() => navigate('/conferenciere')}
            whileHover={reduce ? {} : { scale: 1.04, boxShadow: '0 0 40px rgba(212,175,55,0.35)' }}
            whileTap={reduce ? {} : { scale: 0.97 }}
            transition={{ duration: 0.25 }}
            className="inline-flex items-center gap-3 border border-[#D4AF37]/40 text-[#D4AF37] uppercase tracking-[0.25em] text-xs font-bold px-10 py-4 rounded-full hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors"
          >
            {t.cta} <i className="fa-solid fa-arrow-right text-[10px]" />
          </motion.button>
        </motion.div>
      </section>
    </div>
  );
};

export default KrystinePage;
