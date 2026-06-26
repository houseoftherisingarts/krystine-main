import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, ArrowRight, Snowflake, Sparkles } from 'lucide-react';

/**
 * Expérience Ayurveda · Saison Vata — page React (style L'Œuvre).
 * Porte le bundle statique /vata vers React. Contenu extrait de
 * src/pages/vata/constants.ts. Botanique forest + espresso/cream/brass.
 */

const ease = [0.16, 0.8, 0.24, 1] as const;
const CHECKOUT = 'https://www.krystinestlaurent.com/VATAETPREMIUMOPTIONSDEPAIEMENT';
const go = () => window.open(CHECKOUT, '_blank', 'noopener,noreferrer');

const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className }) => (
  <motion.div className={className} initial={{ opacity: 0, y: 28, filter: 'blur(6px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 1.0, ease, delay }}>
    {children}
  </motion.div>
);
const Eyebrow: React.FC<{ children: React.ReactNode; on?: 'dark' | 'light' }> = ({ children, on = 'light' }) => (
  <p className={`font-sans text-[0.62rem] uppercase tracking-[0.28em] ${on === 'dark' ? 'text-brass' : 'text-brassInk'}`}>{children}</p>
);
const Title: React.FC<{ children: React.ReactNode; on?: 'dark' | 'light'; className?: string }> = ({ children, on = 'light', className = '' }) => (
  <h2 className={`font-serif font-medium leading-[1.05] text-[clamp(2rem,4.2vw,3.2rem)] ${on === 'dark' ? 'text-ctext' : 'text-ink'} ${className}`}>{children}</h2>
);

const SIGNALS = [
  ['La surchauffe mentale', '15 onglets ouverts en permanence. Vous ne « pensez » plus, vous subissez le bruit de vos pensées.'],
  ['Le réveil de 3h du matin', "Le corps est épuisé, mais le mental vous réveille brutalement. Impossible de redescendre."],
  ['Le vent intérieur', "Ballonnements et irrégularité. Une sensation d'inconfort, comme si la digestion était devenue laborieuse."],
  ['La saturation temporelle', "Sensation d'étouffement. L'impression physique que le temps se contracte et vous écrase."],
  ['La peau de papier', 'Tiraillements, frilosité. Votre enveloppe extérieure semble trop fine pour vous protéger.'],
  ["L'envahissement sensoriel", 'Le moindre bruit vous agresse. La lumière vive fatigue. Vos filtres ne fonctionnent plus.'],
  ['Mains et pieds glacés', 'Une sensation de froid persistante. Même sous la couette, la chaleur ne se rend pas au bout des doigts.'],
  ['Le corps qui « grince »', "Raideurs et craquements. Le sentiment d'avoir perdu sa fluidité naturelle et son « huile » interne."],
  ['La dispersion mentale', "Vous commencez dix tâches, n'en finissez aucune. Votre focus s'effrite et vous perdez le fil constamment."],
];

const SYSTEMS = [
  ["Le système d'ancrage", "Avant de calmer le mental, il faut sécuriser le corps. Le souffle devient votre « bouton stop » accessible en 30 secondes, n'importe où."],
  ['Le filtrage sensoriel', 'Vos 5 sens sont actuellement des portes grandes ouvertes. Nous allons poser des filtres pour que le bruit extérieur cesse de vous envahir.'],
  ["La maintenance d'actif", "Votre corps est votre capital le plus précieux. Nous allons remettre de l'huile dans les rouages (sommeil, digestion) pour éviter la casse."],
];

const PHASES = [
  ['Créer le sanctuaire', "Avant de ralentir, il faut se sentir en sécurité. Nous préparons votre espace pour que votre corps s'autorise enfin à déposer les armes."],
  ["Le souffle qui ancre", "L'air pour calmer l'air. Le geste invisible qui stoppe le tourbillon mental en quelques secondes, même au milieu du chaos."],
  ['Le luxe du silence', "Protéger vos oreilles. Comment fermer les portes de l'ouïe pour offrir à votre système nerveux le calme dont il a soif."],
  ['Le repos du regard', 'Déposer ses yeux. Libérer votre vision de la fatigue des écrans pour retrouver une clarté que vous croyiez perdue.'],
  ["L'accès direct", "Le secret de l'odorat. Utiliser les essences pour « hacker » votre stress et changer d'état d'esprit en une seule inspiration."],
  ['La chaleur intérieure', 'Le réconfort du goût. Les rituels gourmands et les aliments stratégiques qui réchauffent le corps et calment les turbulences.'],
  ['Le cocon de soie', "L'onction du toucher. L'art de l'huile chaude pour recréer une protection autour de vous et ne plus vous sentir à vif."],
  ['La force tranquille', "L'autonomie totale. Vous repartez habitée par une nouvelle présence et un système d'auto-régulation que vous posséderez pour toujours."],
];

const TIERS = [
  {
    name: 'VATA Essentiel', price: '497 $', promo: '397 $', plan: '',
    intro: 'Le camp de base pour un système nerveux surchargé.',
    features: ['7 modules · 7 semaines (plus 1 semaine d\'introduction)', '18 capsules d\'accompagnement audio', '7 méditations pré-enregistrées', '19 rituels guidés', 'Guide PDF de 204 pages', 'Accès à la communauté'],
    recommended: false,
  },
  {
    name: 'VATA + Grande Bibliothèque', price: '797 $', promo: '597 $', plan: 'ou 2 × 327 $',
    intro: "L'expérience enrichie pour approfondir votre pratique et votre compréhension.",
    features: ['Tout ce qui est inclus dans VATA Essentiel', 'Série « Santé la vie » : 2 saisons complètes (19 épisodes)', 'Capsules « Rituels essentiels »', 'Masterclass Dharma', 'Masterclass Aromathérapie', 'Accès à la Grande Bibliothèque illimité'],
    recommended: true,
  },
];

const TESTIMONIALS = [
  { quote: "J'étais en mode alerte en continu : proche aidante, travail, famille… La nuit, je me réveillais vers 3 h. Avec VATA, le simple fait d'avoir un fil sur 7 semaines m'a permis de reprendre prise sur mes soirées. Mes nuits sont plus réparatrices.", who: 'Sonia T.', role: "52 ans, maman d'ados et proche aidante" },
  { quote: "Comme entrepreneure, je vivais avec 15 onglets ouverts dans mon cerveau. Les semaines sur les sens ont été un déclic. J'ai ajusté ce que je laisse entrer (bruits, écrans, lumières). C'est fou ce qu'un changement de 1 % peut faire !", who: 'Julie B.', role: 'Entrepreneure à grande tendance VATA' },
  { quote: "J'ai fait beaucoup de formations. Krystine a une façon unique d'enseigner et d'accompagner. Ses connaissances ne partent pas du mental, mais du cœur. Je n'ai qu'un mot : GRATITUDE.", who: 'Caroline P.', role: 'Mère de 4 enfants au mental à tendance surchargé' },
];

const FAQS = [
  ["Est-ce que je dois connaître l'Ayurveda ?", "Non, pas du tout. Le programme est conçu pour être simple, concret et accessible. Krystine vulgarise les concepts ancestraux pour qu'ils deviennent des outils pratiques dans votre quotidien moderne."],
  ['Combien de temps ai-je accès au contenu ?', "Vous conservez l'accès à votre parcours VATA tant que la plateforme est en ligne. Vous pourrez donc y revenir l'an prochain si vous en ressentez le besoin."],
  ["Quel est l'investissement de temps requis ?", "C'est un programme qui respecte votre rythme. Les capsules audio font entre 5 et 15 minutes. L'idée n'est pas d'ajouter une corvée, mais de remplacer certaines habitudes stressantes par des rituels d'apaisement."],
  ['Est-ce que je peux suivre sur mobile ou tablette ?', "Oui. La plateforme est responsive et vous pouvez même écouter vos capsules en mode « podcast » pendant vos déplacements."],
  ['Quelle est la différence entre les deux options ?', "L'option Essentiel contient tout le parcours de 7 semaines. L'option Premium ajoute un accès illimité à la Grande Bibliothèque : plus de 50 capsules, des séries télé et des Masterclasses exclusives."],
];

const Faq: React.FC = () => {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="bg-cream2 py-24 md:py-32">
      <div className="mx-auto w-full max-w-[820px] px-6 md:px-12">
        <Reveal className="text-center mb-12"><Eyebrow>Questions fréquentes</Eyebrow></Reveal>
        <Reveal>
          {FAQS.map(([q, a], i) => (
            <div key={i} className={`mb-3 rounded-2xl border bg-card overflow-hidden ${open === i ? 'border-brass/40 shadow-[0_10px_30px_rgba(187,154,94,0.12)]' : 'border-cream3 shadow-sm'}`}>
              <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="w-full text-left py-5 px-6 md:px-8 flex items-center justify-between gap-4 min-h-[44px] group">
                <h3 className={`font-serif text-lg md:text-xl pr-6 ${open === i ? 'text-brassInk' : 'text-ink group-hover:text-brassInk'}`}>{q}</h3>
                <ChevronDown className={`w-5 h-5 shrink-0 text-brassInk transition-transform duration-300 ${open === i ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease }}>
                    <p className="px-6 md:px-8 pb-7 text-inkSoft leading-[1.8] font-sans text-[0.95rem] max-w-[62ch]">{a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
};

const VataExperience: React.FC = () => {
  return (
    <div className="bg-cream text-ink font-sans antialiased">
      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-espressoDeep">
        <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: 'url(https://storage.googleapis.com/inspirata/Vata/bg.png)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(120deg, #16100a 10%, rgba(22,16,10,0.7) 55%, transparent 100%)' }} />
        <div className="pointer-events-none absolute -bottom-1/4 -right-1/5 h-[55%] w-[55%] rounded-full bg-forest/20 blur-[150px]" />
        <div className="relative z-10 mx-auto w-full max-w-[1280px] px-6 md:px-12 py-28">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease }}>
            <p className="inline-flex items-center gap-2 text-brass text-[0.62rem] md:text-[0.7rem] uppercase tracking-[0.3em] mb-8"><Snowflake size={14} /> Expérience Ayurveda · Saison Vata</p>
            <h1 className="font-serif font-medium text-ctext leading-[1.0] text-[clamp(2.4rem,5.4vw,4.6rem)] max-w-[18ch]">Votre corps n'est pas fait pour cette vitesse.</h1>
            <p className="mt-7 font-serif italic text-[clamp(1.2rem,2.4vw,1.8rem)] leading-snug text-ctextSoft max-w-[42ch]">Froid, sécheresse, surcharge mentale : la saison Vata teste vos limites. Apprenez à sécuriser vos portes sensorielles pour ramener le calme à l'intérieur.</p>
            <div className="mt-12 flex flex-wrap items-center gap-5">
              <button onClick={go} className="inline-flex items-center gap-3 rounded-full bg-brass px-8 py-4 font-sans text-[0.7rem] uppercase tracking-[0.16em] text-espressoDeep transition-colors hover:bg-brassBright min-h-[44px]">Apaiser mon système nerveux <ArrowRight size={16} /></button>
              <span className="font-sans text-[0.75rem] text-ctextSoft/70">Programme autonome · accès immédiat · à votre rythme</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── SIGNAUX D'ALERTE ── */}
      <section className="bg-cream py-24 md:py-32">
        <div className="mx-auto w-full max-w-[1280px] px-6 md:px-12">
          <Reveal className="text-center mb-14">
            <Eyebrow>Les signaux d'alerte</Eyebrow>
            <Title className="mt-4">Avez-vous perdu vos filtres ?</Title>
            <p className="mt-5 font-serif italic text-[clamp(1.05rem,1.9vw,1.4rem)] text-inkSoft max-w-[52ch] mx-auto">Si plus de trois de ces signaux vous ressemblent, votre vent intérieur est en turbulence.</p>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SIGNALS.map(([t, d], i) => (
              <Reveal key={i} delay={(i % 3) * 0.05}>
                <div className="h-full rounded-2xl bg-card border border-cream3 p-7 transition-shadow hover:shadow-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-2 h-2 rounded-full bg-forest shrink-0" />
                    <h3 className="font-serif text-lg md:text-xl text-ink leading-snug">{t}</h3>
                  </div>
                  <p className="font-sans text-[0.9rem] leading-relaxed text-inkSoft">{d}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="text-center mt-14">
            <p className="font-serif italic text-brassInk text-[clamp(1.2rem,2.2vw,1.7rem)]">Ces signes sont le langage du corps. Vata vous invite à ralentir.</p>
          </Reveal>
        </div>
      </section>

      {/* ── 3 SYSTÈMES ── */}
      <section className="bg-espressoSoft py-24 md:py-32">
        <div className="mx-auto w-full max-w-[1180px] px-6 md:px-12">
          <Reveal className="text-center mb-16">
            <Eyebrow on="dark">La méthode</Eyebrow>
            <Title on="dark" className="mt-4">Comment nous allons arrêter la fuite d'énergie</Title>
            <p className="mt-5 font-serif italic text-[clamp(1.05rem,1.9vw,1.4rem)] text-ctextSoft max-w-[56ch] mx-auto">Pas de tâches en plus. Trois systèmes de régulation invisibles.</p>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6">
            {SYSTEMS.map(([t, d], i) => (
              <Reveal key={i} delay={i * 0.08}>
                <div className="h-full rounded-3xl border border-brass/20 bg-espresso p-8">
                  <span className="font-serif text-brass text-3xl">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="mt-4 font-serif text-xl md:text-2xl text-ctext leading-snug">{t}</h3>
                  <p className="mt-3 font-sans text-[0.92rem] leading-relaxed text-ctextSoft">{d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROGRAMME 8 PHASES ── */}
      <section className="bg-cream py-24 md:py-32">
        <div className="mx-auto w-full max-w-[1080px] px-6 md:px-12">
          <Reveal className="text-center mb-16">
            <Eyebrow>L'art de l'ancrage réel</Eyebrow>
            <Title className="mt-4 uppercase tracking-[0.02em]">Le parcours, étape par étape</Title>
            <p className="mt-5 font-serif italic text-[clamp(1.05rem,1.9vw,1.4rem)] text-inkSoft max-w-[54ch] mx-auto">Délaisser le superflu, éteindre le bruit, rebâtir votre sécurité intérieure.</p>
          </Reveal>
          <div className="relative">
            <div className="pointer-events-none absolute left-[18px] md:left-1/2 top-2 bottom-2 w-px bg-gradient-to-b from-forest/0 via-forest/40 to-forest/0 md:-translate-x-1/2" aria-hidden />
            <div className="space-y-12">
              {PHASES.map(([t, d], i) => (
                <Reveal key={i}>
                  <div className={`relative grid md:grid-cols-2 gap-x-14 items-center ${i % 2 ? 'md:[direction:rtl]' : ''}`}>
                    <span className="absolute left-[11px] md:left-1/2 top-3 h-3.5 w-3.5 rounded-full bg-brass ring-4 ring-cream md:-translate-x-1/2" aria-hidden />
                    <div className={`pl-12 md:pl-0 [direction:ltr] ${i % 2 ? 'md:pl-14' : 'md:text-right md:pr-14'}`}>
                      <span className="font-serif text-brassInk text-sm uppercase tracking-[0.2em]">Semaine {i + 1}</span>
                      <h3 className="mt-1 font-serif font-medium text-ink text-[clamp(1.5rem,2.6vw,2.1rem)] leading-snug">{t}</h3>
                    </div>
                    <div className={`pl-12 md:pl-0 [direction:ltr] ${i % 2 ? 'md:text-right md:pr-14' : 'md:pl-14'}`}>
                      <p className="font-sans text-[0.95rem] leading-[1.8] text-inkSoft max-w-[44ch] md:inline-block">{d}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TARIFS ── */}
      <section id="tarifs" className="bg-cream3 py-24 md:py-32">
        <div className="mx-auto w-full max-w-[1080px] px-6 md:px-12">
          <Reveal className="text-center mb-14"><Eyebrow>Choisissez votre parcours</Eyebrow><Title className="mt-4">Deux façons de traverser la saison</Title></Reveal>
          <div className="grid md:grid-cols-2 gap-7 items-stretch">
            {TIERS.map((tier, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <div className={`h-full flex flex-col rounded-[2rem] border p-8 md:p-10 ${tier.recommended ? 'border-brass/50 bg-espresso' : 'border-cream3 bg-card'}`}>
                  {tier.recommended && <span className="self-start mb-4 rounded-full bg-brass/15 text-brass px-3 py-1 text-[0.58rem] font-bold uppercase tracking-[0.16em]">Expérience profonde</span>}
                  <h3 className={`font-serif text-2xl md:text-3xl ${tier.recommended ? 'text-ctext' : 'text-ink'}`}>{tier.name}</h3>
                  <p className={`mt-2 font-serif italic text-[0.98rem] ${tier.recommended ? 'text-ctextSoft' : 'text-inkSoft'}`}>{tier.intro}</p>
                  <div className="mt-6 flex items-end gap-3">
                    <span className={`font-serif text-4xl tabular-nums ${tier.recommended ? 'text-brassBright' : 'text-brassInk'}`}>{tier.promo}</span>
                    <span className={`font-serif text-lg line-through tabular-nums ${tier.recommended ? 'text-ctextSoft/60' : 'text-inkSoft/60'}`}>{tier.price}</span>
                  </div>
                  {tier.plan && <p className={`mt-1 text-[0.78rem] uppercase tracking-[0.12em] ${tier.recommended ? 'text-ctextSoft/70' : 'text-inkSoft/70'}`}>{tier.plan}</p>}
                  <ul className="mt-7 space-y-3 flex-1">
                    {tier.features.map((f, j) => (
                      <li key={j} className={`flex items-start gap-3 text-[0.9rem] leading-relaxed ${tier.recommended ? 'text-ctextSoft' : 'text-inkSoft'}`}>
                        <Check size={16} className={`mt-0.5 shrink-0 ${tier.recommended ? 'text-brass' : 'text-brassInk'}`} />{f}
                      </li>
                    ))}
                  </ul>
                  <button onClick={go} className={`mt-8 w-full rounded-xl py-4 font-serif text-base tracking-[0.08em] uppercase transition-colors min-h-[44px] ${tier.recommended ? 'bg-brass text-espressoDeep hover:bg-brassBright' : 'bg-espresso text-ctext hover:bg-espressoDeep'}`}>{tier.name.includes('Bibliothèque') ? 'Rejoindre VATA + Bibliothèque' : 'Rejoindre VATA Essentiel'}</button>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── TÉMOIGNAGES ── */}
      <section className="bg-cream py-24 md:py-32">
        <div className="mx-auto w-full max-w-[1180px] px-6 md:px-12">
          <Reveal className="text-center mb-14"><Eyebrow>Elles l'ont vécu</Eyebrow><Title className="mt-4">Témoignages de la communauté</Title></Reveal>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={i} delay={i * 0.06}>
                <figure className="h-full rounded-3xl bg-card border border-cream3 p-8 flex flex-col">
                  <Sparkles size={18} className="text-brass mb-4" />
                  <blockquote className="font-serif italic text-[1.02rem] leading-relaxed text-ink flex-1">« {t.quote} »</blockquote>
                  <figcaption className="mt-5 pt-4 border-t border-cream3">
                    <span className="block font-serif text-brassInk">{t.who}</span>
                    <span className="block text-[0.8rem] text-inkSoft">{t.role}</span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── BIO ── */}
      <section className="bg-espressoSoft py-24 md:py-32">
        <div className="mx-auto w-full max-w-[1100px] px-6 md:px-12 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <Reveal className="order-last lg:order-first">
            <div className="rounded-[2rem] overflow-hidden aspect-[4/5] shadow-2xl">
              <img src="https://wsrv.nl/?url=storage.googleapis.com/inspirata/21%20jours/krysttine%20red.webp&w=1000&output=webp" alt="Krystine St-Laurent" loading="lazy" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <Eyebrow on="dark">Fondatrice d'Inspirata Ayurveda</Eyebrow>
            <Title on="dark" className="mt-3">Krystine St-Laurent</Title>
            <p className="mt-5 font-serif italic text-[clamp(1.05rem,1.8vw,1.35rem)] text-ctextSoft max-w-[48ch]">35 ans à la jonction de la rigueur clinique et de la santé globale.</p>
            <div className="mt-6 space-y-4 font-sans text-[0.98rem] leading-[1.85] text-ctextSoft max-w-[52ch]">
              <p>Pendant 35 ans, Krystine a œuvré en soins intensifs et en recherche clinique, puis en herboristerie, Ayurveda et aromathérapie. Elle a vu ce que l'approche moderne fait bien. Et elle a vu là où elle vous laisse seule.</p>
              <p>Trois livres aux Éditions de l'Homme. Finaliste au Prix de la Santé Intégrative (catégorie Pionnier). Récipiendaire du Prime Mover Award (Las Vegas).</p>
            </div>
          </Reveal>
        </div>
      </section>

      <Faq />

      {/* ── CTA FINAL ── */}
      <section className="bg-espressoDeep py-20 md:py-24 text-center">
        <div className="mx-auto w-full max-w-[760px] px-6 md:px-12">
          <Reveal>
            <Title on="dark">Prête à traverser la saison autrement ?</Title>
            <button onClick={go} className="mt-9 inline-flex items-center gap-3 rounded-full bg-brass px-9 py-4 font-sans text-[0.7rem] uppercase tracking-[0.16em] text-espressoDeep transition-colors hover:bg-brassBright min-h-[44px]">Apaiser mon système nerveux maintenant <ArrowRight size={16} /></button>
          </Reveal>
        </div>
      </section>
    </div>
  );
};

export default VataExperience;
