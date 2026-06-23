import React from 'react';
import { motion } from 'framer-motion';

/**
 * Expérience Origine — page React au style L'Œuvre (espresso/cream/brass)
 * avec un accent botanique vert forêt préservé de l'identité du cours.
 *
 * Phase 1 : Hero + Curriculum (les 3 piliers). Le contenu est extrait du
 * sous-app statique src/pages/origine/ (constants.ts). Les sections Pricing,
 * FAQ, Programme, Trilogie suivent en Phase 2.
 */

const ease = [0.16, 0.8, 0.24, 1] as const;

const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({
  children,
  delay = 0,
  className,
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 30, filter: 'blur(6px)' }}
    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
    transition={{ duration: 1.1, ease, delay }}
  >
    {children}
  </motion.div>
);

type Pillar = {
  roman: string;
  range: string;
  subtitle: string;
  body: React.ReactNode;
  reflection: string;
};

const PILLARS: Pillar[] = [
  {
    roman: 'Pilier I',
    range: 'Semaines 1 à 4',
    subtitle: 'Ce que le corps essaie de dire',
    body: (
      <>
        Calmer le bruit pour entendre ce qui est là. D'où viennent vos décisions ? Qu'est-ce que le
        corps essaie de dire ? L'Ayurveda donne les premiers mots pour le nommer. Le premier geste :
        écouter avant d'agir.
      </>
    ),
    reflection:
      "Après quatre semaines, les signaux que le corps envoie depuis des mois deviennent lisibles. La confusion se dissipe. Ce qui semblait flou porte un nom.",
  },
  {
    roman: 'Pilier II',
    range: 'Semaines 5 à 8',
    subtitle: 'Ce qui vous appartient vraiment',
    body: (
      <>
        Retirer ce qui encombre, poser ce qui soutient. Faire le tri entre ce qui est à vous et ce
        que l'on vous a imposé. L'Ayurveda éclaire ce qui nourrit vraiment. La Dinacharya, l'art
        ancestral de s'accorder aux rythmes du jour, devient votre charpente.
      </>
    ),
    reflection:
      "Les gestes qui ne vous appartiennent pas tombent. Ceux qui vous soutiennent se posent. Le tri entre ce que l'on vous a imposé et ce qui est juste pour vous devient clair. Le matin change.",
  },
  {
    roman: 'Pilier III',
    range: 'Semaines 9 à 12',
    subtitle: 'Le retour au point d’origine',
    body: (
      <>
        Installer la capacité de retour. Les saisons comme boussole. Ce qui reste quand le parcours
        se termine. La boussole est rétablie, l'expérience continue en vous. Les repères restent. Le
        corps s'en souvient.
      </>
    ),
    reflection:
      "La lecture tient seule. Les saisons deviennent votre boussole. Le parcours se termine, la capacité reste. Le corps s'en souvient.",
  },
];

const OrigineExperience: React.FC = () => {
  return (
    <div className="bg-cream text-ink font-sans antialiased">
      {/* ─────────────────── HERO ─────────────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-espressoDeep">
        {/* halo botanique + laiton, très diffus */}
        <div className="pointer-events-none absolute -top-1/4 -left-1/4 h-[70%] w-[70%] rounded-full bg-forest/20 blur-[140px]" />
        <div className="pointer-events-none absolute -bottom-1/4 -right-1/5 h-[60%] w-[60%] rounded-full bg-brass/10 blur-[150px]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay [background-image:radial-gradient(circle_at_30%_20%,#fff_0.5px,transparent_0.5px)] [background-size:3px_3px]" />

        <div className="relative z-10 mx-auto w-full max-w-[1280px] px-6 md:px-12 py-28">
          <Reveal>
            <p className="font-sans text-[0.62rem] md:text-[0.7rem] uppercase tracking-[0.32em] text-brass mb-10">
              Expérience Origine
            </p>
          </Reveal>

          <Reveal delay={0.12}>
            <h1 className="font-serif font-medium text-ctext leading-[0.98] text-[clamp(2.4rem,6vw,5rem)] max-w-[16ch]">
              Vous n'avez pas besoin de plus d'information.
            </h1>
          </Reveal>

          <Reveal delay={0.24}>
            <p className="mt-8 font-serif italic text-[clamp(1.5rem,3.4vw,2.6rem)] leading-snug text-ctextSoft max-w-[20ch]">
              Vous avez besoin de revenir à{' '}
              <span className="text-brassBright not-italic">votre point d'origine.</span>
            </p>
          </Reveal>

          <Reveal delay={0.4}>
            <div className="mt-14 flex flex-wrap items-center gap-6">
              <a
                href="#curriculum"
                className="inline-flex items-center gap-3 rounded-full bg-brass px-8 py-3.5 font-sans text-[0.7rem] uppercase tracking-[0.18em] text-espressoDeep transition-colors duration-300 hover:bg-brassBright"
              >
                Découvrir le parcours
                <span aria-hidden>→</span>
              </a>
              <span className="font-serif italic text-ctextSoft/80 text-base">
                « Catherine, participante fondatrice »
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─────────────────── CURRICULUM ─────────────────── */}
      <section id="curriculum" className="relative bg-cream py-28 md:py-40">
        <div className="mx-auto w-full max-w-[1280px] px-6 md:px-12">
          <Reveal className="text-center">
            <p className="font-sans text-[0.62rem] uppercase tracking-[0.28em] text-brassInk mb-6">
              12 semaines · trois piliers
            </p>
            <h2 className="font-serif font-medium uppercase tracking-[0.02em] text-ink leading-[1.04] text-[clamp(2rem,4.4vw,3.4rem)]">
              Retour au Point d'Origine
            </h2>
            <p className="mt-6 font-serif italic text-[clamp(1.1rem,2vw,1.5rem)] text-inkSoft max-w-[40ch] mx-auto">
              Une sagesse de 5 000 ans, dans votre réalité d'aujourd'hui.
            </p>
          </Reveal>

          {/* fil vertical botanique */}
          <div className="relative mt-24 md:mt-32">
            <div
              className="pointer-events-none absolute left-[7px] md:left-1/2 top-2 bottom-2 w-px bg-gradient-to-b from-forest/0 via-forest/40 to-forest/0 md:-translate-x-1/2"
              aria-hidden
            />

            <div className="space-y-24 md:space-y-32">
              {PILLARS.map((p, i) => (
                <Reveal key={p.roman} delay={i * 0.05}>
                  <article className="relative grid md:grid-cols-2 gap-x-16 gap-y-6 items-start">
                    {/* nœud sur le fil */}
                    <span
                      className="absolute left-0 md:left-1/2 top-2 h-3.5 w-3.5 rounded-full bg-brass ring-4 ring-cream md:-translate-x-1/2"
                      aria-hidden
                    />

                    {/* colonne titre */}
                    <div className={`pl-9 md:pl-0 ${i % 2 === 0 ? 'md:text-right md:pr-16' : 'md:order-2 md:pl-16'}`}>
                      <p className="font-sans text-[0.6rem] uppercase tracking-[0.26em] text-brassInk">
                        {p.range}
                      </p>
                      <p className="mt-3 font-serif text-forestDeep text-[0.95rem] uppercase tracking-[0.18em]">
                        {p.roman}
                      </p>
                      <h3 className="mt-2 font-serif font-medium text-ink leading-[1.05] text-[clamp(1.7rem,2.8vw,2.4rem)]">
                        {p.subtitle}
                      </h3>
                    </div>

                    {/* colonne corps + réflexion manuscrite */}
                    <div className={`pl-9 md:pl-0 ${i % 2 === 0 ? '' : 'md:order-1 md:text-right md:pr-16'}`}>
                      <p className="font-sans text-[0.95rem] leading-[1.85] text-inkSoft max-w-[46ch]">
                        {p.body}
                      </p>
                      <p
                        className={`mt-7 font-serif italic text-brassInk text-[clamp(1.15rem,1.7vw,1.45rem)] leading-snug max-w-[42ch] ${
                          i % 2 === 0 ? '' : 'md:ml-auto'
                        }`}
                      >
                        {p.reflection}
                      </p>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>

          <Reveal className="mt-28 md:mt-36 text-center">
            <p className="mx-auto max-w-[52ch] font-serif text-[clamp(1.2rem,2.1vw,1.7rem)] leading-snug text-ink">
              12 semaines pour comprendre les messages du corps, retrouver ce qui nous appartient,
              ancrer les rituels qui tiennent, et revenir au point d'origine.
            </p>
            <div className="mt-6 mx-auto h-px w-16 bg-brass" />
          </Reveal>
        </div>
      </section>
    </div>
  );
};

export default OrigineExperience;
