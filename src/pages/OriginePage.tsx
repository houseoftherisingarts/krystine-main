import React from 'react';
import { useApp } from '../contexts/AppContext';
import { CONTENT, ASSETS } from '../content';
import EditableText from '../components/edit/EditableText';
import EditableImage from '../components/edit/EditableImage';

const OriginePage: React.FC = () => {
  const { lang } = useApp();
  const t = CONTENT[lang].origine;

  return (
    <div className="min-h-screen dark:bg-[#2E1A14] text-[#3A251E] dark:text-white">
      {/* Hero Full Screen */}
      <div className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
        <EditableImage
          fieldKey="origine.hero.background"
          defaultSrc={ASSETS.origineBanner}
          className="absolute inset-0"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70 pointer-events-none" />
        <div className="relative z-10 text-center text-white px-6 max-w-4xl">
          <span className="text-[#B8532F] uppercase tracking-[0.4em] text-xs font-bold block mb-6">
            <EditableText
              fieldKey="origine.hero.kicker"
              defaultValue={lang === 'FR' ? 'Programme' : 'Program'}
            />
          </span>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif leading-tight mb-6 text-shadow">
            <EditableText fieldKey="origine.hero.title" defaultValue={t.hero.title} />
          </h1>
          <p className="text-xl md:text-2xl font-serif italic text-white/80 max-w-2xl mx-auto mb-12">
            <EditableText fieldKey="origine.hero.subtitle" defaultValue={t.hero.subtitle} multiline />
          </p>
          <a href="#pricing" className="bg-[#B8532F] text-[#3A251E] px-12 py-5 rounded-full font-bold uppercase tracking-widest text-sm shadow-lg hover:bg-white transition-colors">
            <EditableText fieldKey="origine.hero.cta" defaultValue={t.hero.cta} />
          </a>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <i className="fa-solid fa-chevron-down text-white/50 text-2xl" />
        </div>
      </div>

      {/* Transition section */}
      <div className="py-20 px-6 text-center bg-[#F4E7DD] dark:bg-[#3A251E]">
        <p className="font-serif text-2xl md:text-3xl text-[#3A251E] dark:text-white italic max-w-3xl mx-auto leading-relaxed">{t.transition}</p>
      </div>

      {/* About section */}
      <div className="py-24 px-6 md:px-12 bg-white dark:bg-[#2E1A14]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-16 items-center">
          <div className="md:w-1/2">
            <img src={ASSETS.krystineRed} alt="Krystine St-Laurent" className="rounded-[30px] shadow-2xl w-full object-cover aspect-[4/5]" />
          </div>
          <div className="md:w-1/2">
            <h2 className="text-4xl font-serif text-[#3A251E] dark:text-white mb-6">{t.about.title}</h2>
            <p className="text-[#3A251E]/70 dark:text-white/70 leading-relaxed mb-12 text-lg">{t.about.p1}</p>
            <div className="space-y-6">
              {t.about.testimonials.map((test: any, i: number) => (
                <blockquote key={i} className="border-l-4 border-[#B8532F] pl-6">
                  <p className="font-serif italic text-[#3A251E]/80 dark:text-white/80 mb-2">"{test.text}"</p>
                  <footer className="text-xs uppercase tracking-widest text-[#B8532F] font-bold">— {test.author}</footer>
                </blockquote>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="py-24 px-6 bg-[#F4E7DD] dark:bg-[#3A251E]">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-serif text-[#3A251E] dark:text-white italic mb-4">{t.timeline.title}</h2>
          <p className="text-[#3A251E]/60 dark:text-white/60">{t.timeline.intro}</p>
        </div>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {t.timeline.steps.map((step: any, i: number) => (
            <div key={i} className="relative bg-white dark:bg-[#2E1A14]/60 rounded-[24px] p-8 shadow-lg border border-[#3A251E]/5 dark:border-white/5">
              <span className="text-[#B8532F] text-4xl font-serif font-bold block mb-4 opacity-30">{step.id}</span>
              <h3 className="text-xl font-serif text-[#3A251E] dark:text-white mb-2">{step.title}</h3>
              <p className="text-xs text-[#B8532F] upper tracking-widest font-bold mb-3">{step.duration}</p>
              <p className="text-[#3A251E]/60 dark:text-white/60 text-sm leading-relaxed">{step.details}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div id="pricing" className="py-24 px-6 bg-white dark:bg-[#2E1A14]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-serif text-[#3A251E] dark:text-white mb-12">{t.pricing.title}</h2>
          <div className="bg-gradient-to-br from-[#3A251E] to-[#4A3228] rounded-[30px] p-12 text-white border border-[#B8532F]/20 mb-8">
            <span className="text-[#B8532F] uppercase tracking-widest text-xs font-bold block mb-6">{t.pricing.price}</span>
            <ul className="space-y-4 mb-10 text-left max-w-sm mx-auto">
              {t.pricing.features.map((f: string, i: number) => (
                <li key={i} className="flex items-center gap-3 text-white/90">
                  <i className="fa-solid fa-check text-[#B8532F]" /> {f}
                </li>
              ))}
            </ul>
            <button className="w-full bg-[#B8532F] text-[#3A251E] py-5 rounded-full font-bold uppercase tracking-widest text-sm shadow-lg hover:bg-white transition-colors">
              {t.pricing.cta}
            </button>
          </div>
          {/* Guarantee */}
          <div className="bg-[#B8532F]/10 border border-[#B8532F]/30 rounded-[20px] p-8 text-center">
            <span className="bg-[#B8532F] text-[#3A251E] text-xs font-bold uppercase tracking-widest px-4 py-1 rounded-full mb-4 inline-block">{t.pricing.guarantee.badge}</span>
            <h3 className="font-serif text-xl text-[#3A251E] dark:text-white mb-2">{t.pricing.guarantee.title}</h3>
            <p className="text-[#3A251E]/60 dark:text-white/60 text-sm">{t.pricing.guarantee.text}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OriginePage;
