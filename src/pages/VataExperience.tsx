import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import {
  Wind, ArrowRight, ArrowDown, Check, CaretDown, Anchor, Ear, Drop, Quotes,
} from '@phosphor-icons/react';
import { Atmosphere } from '../components/motion/loeuvre';

/**
 * Expérience Ayurveda · Saison Vata — page de vente, langage V2 « magazine crème ».
 * Système multi-couleur de la charte : accent Vata #b9822f, accent-encre #8a5e1f,
 * tint de carte #efe1c6 sur crème #f4efe6. Contenu et câblage préservés
 * (checkout Kajabi, tiers, FAQ). Effets de scroll : mot fantôme « Vata »,
 * ligne de progression qui se dessine, DrawRule, parallax doux, médaillons.
 */

const ease = [0.22, 1, 0.36, 1] as const;
const SPRING = { type: 'spring' as const, stiffness: 220, damping: 24, mass: 0.8 };

const CHECKOUT = 'https://www.krystinestlaurent.com/VATAETPREMIUMOPTIONSDEPAIEMENT';
const go = () => window.open(CHECKOUT, '_blank', 'noopener,noreferrer');

/* Tokens V2 + identité Vata (air / automne) */
const C = {
  cream: '#f4efe6',
  panel: '#efe6d7',
  card: '#faf6ee',
  ink: '#1c1712',
  inkSoft: '#3a2f23',
  accent: '#b9822f',
  accentInk: '#8a5e1f',
  tint: '#efe1c6',
  dark: '#34241a',
};

/* Portrait hero : recadrage éditorial (brume, lever de soleil, feuilles d'or)
   du visuel Vata, sans le texte incrusté ni la bande noire. */
const HERO_IMG = 'https://wsrv.nl/?url=storage.googleapis.com/inspirata/Vata/bg.png&cx=0&cy=0&cw=870&ch=1044&precrop&w=1200&output=webp';

/* ════════════════════════ Données (préservées) ════════════════════════ */

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

const SYSTEMS: Array<[string, string, React.ComponentType<{ size?: number; weight?: any; className?: string }>]> = [
  ["Le système d'ancrage", "Avant de calmer le mental, il faut sécuriser le corps. Le souffle devient votre « bouton stop » accessible en 30 secondes, n'importe où.", Anchor],
  ['Le filtrage sensoriel', 'Vos 5 sens sont actuellement des portes grandes ouvertes. Nous allons poser des filtres pour que le bruit extérieur cesse de vous envahir.', Ear],
  ["La maintenance d'actif", "Votre corps est votre capital le plus précieux. Nous allons remettre de l'huile dans les rouages (sommeil, digestion) pour éviter la casse.", Drop],
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

/* ════════════════════════ Primitives V2 ════════════════════════ */

const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string; y?: number }> = ({ children, delay = 0, className, y = 30 }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 1 } : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.95, ease, delay }}
    >
      {children}
    </motion.div>
  );
};

const Kicker: React.FC<{ children: React.ReactNode; color?: string; className?: string }> = ({ children, color = C.accentInk, className = '' }) => (
  <p className={`text-[0.7rem] uppercase tracking-[0.34em] ${className}`} style={{ color }}>{children}</p>
);

/* Filet qui se trace au scroll (scaleX, transform seulement) */
const DrawRule: React.FC<{ className?: string; color?: string; center?: boolean; delay?: number }> = ({ className = '', color = C.accent, center = false, delay = 0.15 }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      className={`h-px ${className}`}
      style={{ background: color, transformOrigin: center ? 'center' : 'left center' }}
      initial={reduce ? false : { scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, amount: 0.7 }}
      transition={{ duration: 1.2, ease, delay }}
    />
  );
};

/* Médaillon Vata : plein accent, icône crème, éclosion à l'entrée + hover */
const Medallion: React.FC<{ Icon: React.ComponentType<{ size?: number; weight?: any }>; size?: number }> = ({ Icon, size = 48 }) => {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className="inline-grid place-items-center rounded-full will-change-transform"
      style={{ background: C.accent, color: C.card, width: size, height: size }}
      initial={reduce ? false : { scale: 0.4, rotate: -12, opacity: 0 }}
      whileInView={{ scale: 1, rotate: 0, opacity: 1 }}
      whileHover={reduce ? undefined : { scale: 1.09, rotate: -4 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={SPRING}
    >
      <Icon size={Math.round(size * 0.46)} weight="light" />
    </motion.span>
  );
};

/* ════════════════════════ Sections ════════════════════════ */

/* ── Hero · une de magazine ── */
const Hero: React.FC = () => {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const imgY = useTransform(scrollYProgress, [0, 1], ['0%', '9%']);
  return (
    <section
      ref={ref}
      className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] pt-[clamp(7rem,13vh,9.5rem)] pb-[clamp(2rem,5vh,4rem)] min-h-screen flex flex-col"
    >
      <Reveal y={12}>
        <div className="flex items-center justify-between border-t pt-3.5 text-[0.6rem] uppercase tracking-[0.28em]" style={{ borderColor: 'rgba(28,23,18,0.15)', color: 'rgba(28,23,18,0.55)' }}>
          <span>N&deg; 03 &middot; Saison Vata</span>
          <span className="hidden sm:inline">Québec &middot; MMXXVI</span>
        </div>
      </Reveal>

      <div className="flex-1 grid items-stretch gap-x-[clamp(2rem,5vw,5rem)] gap-y-10 lg:grid-cols-[1.08fr_0.92fr] mt-[clamp(2rem,5vh,4rem)]">
        {/* Masthead */}
        <div className="order-1 self-center">
          <Reveal y={20}>
            <div className="flex items-center gap-4 mb-7">
              <Medallion Icon={Wind} size={44} />
              <Kicker>Expérience Ayurveda &middot; Saison Vata</Kicker>
            </div>
          </Reveal>
          <Reveal y={26} delay={0.08}>
            <h1 className="v2-serif font-light leading-[0.96] text-[clamp(2.7rem,6.5vw,5.6rem)]" style={{ color: C.ink }}>
              Votre corps n'est pas fait pour cette vitesse.
            </h1>
          </Reveal>
          <Reveal y={24} delay={0.18}>
            <p className="mt-7 v2-serif italic text-[clamp(1.2rem,2.2vw,1.7rem)] leading-[1.35] max-w-[42ch]" style={{ color: C.inkSoft }}>
              Froid, sécheresse, surcharge mentale : la saison Vata teste vos limites.
              Apprenez à sécuriser vos portes sensorielles pour ramener
              le calme <span className="not-italic" style={{ color: C.accentInk }}>à l'intérieur.</span>
            </p>
          </Reveal>
          <Reveal y={20} delay={0.28}>
            <div className="mt-10 flex flex-wrap items-center gap-x-9 gap-y-4">
              <button
                type="button"
                onClick={go}
                className="group inline-flex items-center gap-2.5 min-h-[44px] text-[0.72rem] uppercase tracking-[0.2em] border-b pb-1.5 transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
                style={{ color: C.ink, borderColor: C.ink, outlineColor: C.accent }}
                onMouseEnter={(e) => { e.currentTarget.style.color = C.accentInk; e.currentTarget.style.borderColor = C.accent; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = C.ink; e.currentTarget.style.borderColor = C.ink; }}
              >
                Apaiser mon système nerveux
                <ArrowRight size={15} weight="regular" className="transition-transform duration-300 group-hover:translate-x-1" />
              </button>
              <a href="#parcours" className="v2-serif italic text-lg transition-colors duration-300 hover:opacity-70" style={{ color: 'rgba(28,23,18,0.7)' }}>
                Voir le parcours
              </a>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-7 gap-y-2">
              {['7 semaines + introduction', 'Automne · élément air', 'À votre rythme · accès immédiat'].map((m) => (
                <li key={m} className="flex items-center gap-2.5 text-[0.66rem] uppercase tracking-[0.2em]" style={{ color: 'rgba(28,23,18,0.62)' }}>
                  <span className="h-1 w-1 rounded-full" style={{ background: C.accent }} />
                  {m}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        {/* Encart portrait encadré · brume et feuilles d'or */}
        <div className="order-2 relative flex">
          <Reveal className="relative w-full self-center" delay={0.15} y={36}>
            <span className="pointer-events-none absolute -inset-2 border" style={{ borderColor: 'rgba(185,130,47,0.45)' }} aria-hidden />
            <div className="relative w-full aspect-[5/6] overflow-hidden">
              <motion.img
                src={HERO_IMG}
                alt="Brume d'automne sur un lac au lever du soleil, feuilles dorées portées par le vent"
                referrerPolicy="no-referrer"
                className="absolute left-0 top-[-5%] h-[112%] w-full object-cover will-change-transform"
                style={reduce ? undefined : { y: imgY }}
              />
              <div
                className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
                style={{ background: 'linear-gradient(to top, rgba(28,23,18,0.55), transparent)' }}
                aria-hidden
              />
              <p className="absolute bottom-4 left-4 right-4 v2-serif italic text-sm tracking-wide" style={{ color: C.cream }}>
                « Le vent se calme lorsqu'il trouve un endroit où se poser. »
              </p>
            </div>
            <span
              className="absolute -top-2 -left-2 px-3 py-1.5 text-[0.58rem] uppercase tracking-[0.24em]"
              style={{ background: C.ink, color: C.cream }}
            >
              Automne
            </span>
          </Reveal>
        </div>
      </div>

      <Reveal y={10}>
        <div className="flex items-end justify-between border-b pb-3.5 mt-[clamp(1.5rem,4vh,3rem)] text-[0.6rem] uppercase tracking-[0.28em]" style={{ borderColor: 'rgba(28,23,18,0.15)', color: 'rgba(28,23,18,0.55)' }}>
          <span className="flex items-center gap-2 v2-cue">
            <ArrowDown size={13} weight="regular" />
            Faire défiler
          </span>
          <span className="hidden sm:inline">Enraciner &middot; Réchauffer &middot; Apaiser</span>
        </div>
      </Reveal>
    </section>
  );
};

/* ── Signaux · mot fantôme « Vata » qui glisse derrière la grille ── */
const Signals: React.FC = () => {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const ghostX = useTransform(scrollYProgress, [0, 1], ['8%', '-16%']);
  return (
    <section ref={ref} className="relative w-full overflow-hidden px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,14vh,10rem)]">
      <motion.span
        aria-hidden
        className="pointer-events-none select-none absolute top-[8%] left-0 v2-serif italic font-light leading-none whitespace-nowrap"
        style={{ fontSize: 'clamp(12rem,30vw,26rem)', color: 'rgba(185,130,47,0.07)', x: reduce ? 0 : ghostX }}
      >
        Vata
      </motion.span>

      <div className="relative">
        <Reveal className="max-w-[820px] mb-4">
          <Kicker className="mb-5">Les signaux d'alerte</Kicker>
          <h2 className="v2-serif font-light leading-[1.02] text-[clamp(2.2rem,5vw,3.9rem)]" style={{ color: C.ink }}>
            Avez-vous perdu vos filtres ?
          </h2>
          <p className="mt-6 v2-serif italic text-[clamp(1.1rem,2vw,1.5rem)] leading-snug max-w-[46ch]" style={{ color: C.inkSoft }}>
            Si plus de trois de ces signaux vous ressemblent, votre vent intérieur est en turbulence.
          </p>
        </Reveal>
        <DrawRule className="w-24 mb-14" />

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
          className="grid gap-x-[clamp(2rem,4vw,4rem)] gap-y-12 sm:grid-cols-2 lg:grid-cols-3"
        >
          {SIGNALS.map(([t, d], i) => (
            <motion.article
              key={t}
              variants={{ hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.9, ease } } }}
              className="border-t pt-6"
              style={{ borderColor: 'rgba(28,23,18,0.14)' }}
            >
              <span className="text-[0.62rem] uppercase tracking-[0.26em] tabular-nums" style={{ color: C.accentInk }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-3 v2-serif font-light text-[1.45rem] leading-[1.15]" style={{ color: C.ink }}>{t}</h3>
              <p className="mt-3 text-[0.92rem] leading-[1.75]" style={{ color: C.inkSoft }}>{d}</p>
            </motion.article>
          ))}
        </motion.div>

        <Reveal className="mt-16">
          <p className="v2-serif italic text-[clamp(1.25rem,2.4vw,1.9rem)] leading-snug max-w-[38ch]" style={{ color: C.accentInk }}>
            Ces signes sont le langage du corps. Vata vous invite à ralentir.
          </p>
        </Reveal>
      </div>
    </section>
  );
};

/* ── Méthode · trois systèmes sur panneau, cartes tint ── */
const Method: React.FC = () => (
  <section className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,14vh,10rem)]" style={{ background: C.panel }}>
    <Reveal className="max-w-[820px] mb-14">
      <Kicker className="mb-5">La méthode</Kicker>
      <h2 className="v2-serif font-light leading-[1.02] text-[clamp(2.2rem,5vw,3.9rem)]" style={{ color: C.ink }}>
        Comment nous allons arrêter la fuite d'énergie
      </h2>
      <p className="mt-6 v2-serif italic text-[clamp(1.1rem,2vw,1.5rem)] leading-snug max-w-[46ch]" style={{ color: C.inkSoft }}>
        Pas de tâches en plus. Trois systèmes de régulation invisibles.
      </p>
    </Reveal>
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}
      className="grid gap-6 md:grid-cols-3"
    >
      {SYSTEMS.map(([t, d, Icon], i) => (
        <motion.article
          key={t}
          variants={{ hidden: { opacity: 0, y: 36 }, show: { opacity: 1, y: 0, transition: { duration: 0.9, ease } } }}
          whileHover={{ y: -8, transition: SPRING }}
          className="flex flex-col p-[clamp(1.6rem,2.5vw,2.25rem)] will-change-transform"
          style={{ background: C.tint }}
        >
          <div className="flex items-center justify-between">
            <Medallion Icon={Icon} size={48} />
            <span className="v2-serif font-light text-[2.4rem] leading-none tabular-nums" style={{ color: 'rgba(185,130,47,0.5)' }}>
              {String(i + 1).padStart(2, '0')}
            </span>
          </div>
          <h3 className="mt-7 v2-serif font-light text-[1.6rem] leading-[1.12]" style={{ color: C.ink }}>{t}</h3>
          <span className="mt-4 block h-px w-12" style={{ background: C.accent }} aria-hidden />
          <p className="mt-4 text-[0.94rem] leading-[1.8] flex-1" style={{ color: C.inkSoft }}>{d}</p>
        </motion.article>
      ))}
    </motion.div>
  </section>
);

/* ── Parcours · rangées indexées, ligne de progression qui se dessine ── */
const Journey: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.8', 'end 0.5'] });
  return (
    <section id="parcours" className="w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,14vh,10rem)] scroll-mt-24">
      <Reveal className="max-w-[820px] mb-16">
        <Kicker className="mb-5">L'art de l'ancrage réel</Kicker>
        <h2 className="v2-serif font-light leading-[1.02] text-[clamp(2.2rem,5vw,3.9rem)]" style={{ color: C.ink }}>
          Le parcours, étape par étape
        </h2>
        <p className="mt-6 v2-serif italic text-[clamp(1.1rem,2vw,1.5rem)] leading-snug max-w-[48ch]" style={{ color: C.inkSoft }}>
          Délaisser le superflu, éteindre le bruit, rebâtir votre sécurité intérieure.
        </p>
      </Reveal>

      <div ref={ref} className="relative pl-9 md:pl-14">
        {/* rail qui se dessine au fil du scroll */}
        <div className="pointer-events-none absolute left-[5px] md:left-[7px] top-2 bottom-2 w-px" style={{ background: 'rgba(185,130,47,0.18)' }} aria-hidden />
        <motion.div
          className="pointer-events-none absolute left-[5px] md:left-[7px] top-2 bottom-2 w-px"
          style={reduce ? { background: C.accent } : { background: C.accent, scaleY: scrollYProgress, transformOrigin: 'top center' }}
          aria-hidden
        />
        <div>
          {PHASES.map(([t, d], i) => (
            <Reveal key={t} y={26}>
              <article
                className={`relative grid gap-x-[clamp(2rem,5vw,5rem)] gap-y-3 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] items-baseline py-9 md:py-11 ${i > 0 ? 'border-t' : ''}`}
                style={{ borderColor: 'rgba(28,23,18,0.12)' }}
              >
                <span
                  className="absolute -left-9 md:-left-14 top-[2.6rem] md:top-[3.1rem] block h-3 w-3 rounded-full ring-4"
                  style={{ background: C.accent, ['--tw-ring-color' as any]: C.cream }}
                  aria-hidden
                />
                <div>
                  <div className="flex items-baseline gap-4">
                    <span className="v2-serif font-light text-[clamp(2rem,3.4vw,3rem)] leading-none tabular-nums" style={{ color: 'rgba(185,130,47,0.55)' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[0.62rem] uppercase tracking-[0.26em]" style={{ color: C.accentInk }}>Semaine {i + 1}</span>
                  </div>
                  <h3 className="mt-2 v2-serif font-light leading-[1.08] text-[clamp(1.6rem,2.8vw,2.3rem)]" style={{ color: C.ink }}>{t}</h3>
                </div>
                <p className="text-[0.95rem] leading-[1.8] max-w-[52ch]" style={{ color: C.inkSoft }}>{d}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ── Tarifs · deux parcours ── */
const Tiers: React.FC = () => (
  <section id="tarifs" className="w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,14vh,10rem)] scroll-mt-24" style={{ background: C.panel }}>
    <Reveal className="max-w-[820px] mb-14">
      <Kicker className="mb-5">Choisissez votre parcours</Kicker>
      <h2 className="v2-serif font-light leading-[1.02] text-[clamp(2.2rem,5vw,3.9rem)]" style={{ color: C.ink }}>
        Deux façons de traverser la saison
      </h2>
    </Reveal>
    <div className="grid md:grid-cols-2 gap-6 items-stretch">
      {TIERS.map((tier, i) => (
        <Reveal key={tier.name} delay={i * 0.1} className="h-full">
          <article
            className="h-full flex flex-col p-[clamp(1.75rem,3vw,3rem)] border"
            style={tier.recommended
              ? { background: C.tint, borderColor: 'rgba(185,130,47,0.55)' }
              : { background: C.card, borderColor: 'rgba(28,23,18,0.12)' }}
          >
            {tier.recommended && (
              <span className="self-start mb-5 px-3 py-1.5 text-[0.58rem] uppercase tracking-[0.24em]" style={{ background: C.accent, color: C.card }}>
                Expérience profonde
              </span>
            )}
            <h3 className="v2-serif font-light text-[clamp(1.7rem,2.6vw,2.2rem)] leading-[1.1]" style={{ color: C.ink }}>{tier.name}</h3>
            <p className="mt-3 v2-serif italic text-[1.05rem]" style={{ color: C.accentInk }}>{tier.intro}</p>
            <div className="mt-7 flex items-end gap-3">
              <span className="v2-serif font-light text-[clamp(2.6rem,4vw,3.4rem)] leading-none tabular-nums" style={{ color: C.accentInk }}>{tier.promo}</span>
              <span className="v2-serif text-xl line-through tabular-nums" style={{ color: 'rgba(28,23,18,0.4)' }}>{tier.price}</span>
            </div>
            {tier.plan && <p className="mt-2 text-[0.72rem] uppercase tracking-[0.16em]" style={{ color: 'rgba(28,23,18,0.6)' }}>{tier.plan}</p>}
            <span className="mt-6 block h-px w-full" style={{ background: 'rgba(185,130,47,0.35)' }} aria-hidden />
            <ul className="mt-6 space-y-3.5 flex-1">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-[0.92rem] leading-[1.65]" style={{ color: C.inkSoft }}>
                  <Check size={16} weight="bold" className="mt-1 shrink-0" style={{ color: C.accent }} />
                  {f}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={go}
              className="group mt-9 inline-flex items-center justify-center gap-2.5 w-full py-4 min-h-[44px] text-[0.7rem] uppercase tracking-[0.2em] transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
              style={{ background: C.ink, color: C.cream, outlineColor: C.accent }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.accent; e.currentTarget.style.color = C.ink; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = C.ink; e.currentTarget.style.color = C.cream; }}
            >
              {tier.name.includes('Bibliothèque') ? 'Rejoindre VATA + Bibliothèque' : 'Rejoindre VATA Essentiel'}
              <ArrowRight size={15} weight="regular" className="transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </article>
        </Reveal>
      ))}
    </div>
  </section>
);

/* ── Témoignages · citations éditoriales ── */
const Testimonials: React.FC = () => (
  <section className="w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,14vh,10rem)]">
    <Reveal className="max-w-[820px] mb-6">
      <Kicker className="mb-5">Elles l'ont vécu</Kicker>
      <h2 className="v2-serif font-light leading-[1.02] text-[clamp(2.2rem,5vw,3.9rem)]" style={{ color: C.ink }}>
        Témoignages de la communauté
      </h2>
    </Reveal>
    <DrawRule className="w-24 mb-14" />
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}
      className="grid gap-x-[clamp(2rem,4vw,4.5rem)] gap-y-12 md:grid-cols-3"
    >
      {TESTIMONIALS.map((t) => (
        <motion.figure
          key={t.who}
          variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.95, ease } } }}
          className="flex flex-col border-t pt-7"
          style={{ borderColor: 'rgba(185,130,47,0.4)' }}
        >
          <Quotes size={26} weight="light" style={{ color: C.accent }} aria-hidden />
          <blockquote className="mt-4 v2-serif italic font-light text-[1.12rem] leading-[1.55] flex-1" style={{ color: C.ink }}>
            « {t.quote} »
          </blockquote>
          <figcaption className="mt-6">
            <span className="block v2-serif text-[1.05rem]" style={{ color: C.accentInk }}>{t.who}</span>
            <span className="block mt-0.5 text-[0.8rem]" style={{ color: 'rgba(28,23,18,0.6)' }}>{t.role}</span>
          </figcaption>
        </motion.figure>
      ))}
    </motion.div>
  </section>
);

/* ── Bio · planche portrait encadrée, parallax doux ── */
const Bio: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-4%', '4%']);
  return (
    <section className="w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,14vh,10rem)]" style={{ background: C.panel }}>
      <div className="grid lg:grid-cols-2 gap-x-[clamp(2.5rem,5vw,5.5rem)] gap-y-12 items-center">
        <Reveal className="order-last lg:order-first">
          <div ref={ref} className="relative border p-2.5 shadow-[0_30px_70px_rgba(58,49,38,0.14)]" style={{ borderColor: 'rgba(156,122,68,0.5)', background: C.card }}>
            <div className="relative overflow-hidden aspect-[4/5]">
              <motion.img
                src="https://wsrv.nl/?url=storage.googleapis.com/inspirata/21%20jours/krysttine%20red.webp&w=1000&output=webp"
                alt="Krystine St-Laurent"
                loading="lazy"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover scale-110 will-change-transform"
                style={reduce ? undefined : { y }}
              />
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <Kicker color={C.brassInkFallback ?? '#7d6330'} className="mb-5">Fondatrice d'Inspirata Ayurveda</Kicker>
          <h2 className="v2-serif font-light leading-[1.02] text-[clamp(2.2rem,5vw,3.9rem)]" style={{ color: C.ink }}>
            Krystine St-Laurent
          </h2>
          <p className="mt-5 v2-serif italic text-[clamp(1.1rem,1.9vw,1.45rem)] leading-snug max-w-[44ch]" style={{ color: C.inkSoft }}>
            35 ans à la jonction de la rigueur clinique et de la santé globale.
          </p>
          <DrawRule className="mt-6 w-16" color="#9c7a44" />
          <div className="mt-7 space-y-4 text-[0.98rem] leading-[1.85] max-w-[54ch]" style={{ color: C.inkSoft }}>
            <p>Pendant 35 ans, Krystine a œuvré en soins intensifs et en recherche clinique, puis en herboristerie, Ayurveda et aromathérapie. Elle a vu ce que l'approche moderne fait bien. Et elle a vu là où elle vous laisse seule.</p>
            <p>Trois livres aux Éditions de l'Homme. Finaliste au Prix de la Santé Intégrative (catégorie Pionnier). Récipiendaire du Prime Mover Award (Las Vegas).</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

/* ── FAQ · deux colonnes pleine largeur ── */
const FAQItem: React.FC<{ q: string; a: string; open: boolean; onClick: () => void }> = ({ q, a, open, onClick }) => (
  <div className="border-b" style={{ borderColor: 'rgba(28,23,18,0.14)' }}>
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className="group w-full text-left py-6 flex items-center justify-between gap-5 min-h-[44px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
      style={{ outlineColor: C.accent }}
    >
      <h3 className="v2-serif font-light text-[1.25rem] md:text-[1.4rem] leading-[1.2] pr-4 transition-colors duration-300" style={{ color: open ? C.accentInk : C.ink }}>
        {q}
      </h3>
      <CaretDown size={18} weight="light" className={`shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} style={{ color: C.accentInk }} />
    </button>
    <AnimatePresence initial={false}>
      {open && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease }} className="overflow-hidden">
          <p className="pb-7 text-[0.95rem] leading-[1.8] max-w-[62ch]" style={{ color: C.inkSoft }}>{a}</p>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const Faq: React.FC = () => {
  const [open, setOpen] = useState<number | null>(0);
  const mid = Math.ceil(FAQS.length / 2);
  const columns = [FAQS.slice(0, mid), FAQS.slice(mid)];
  return (
    <section className="w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,14vh,10rem)]">
      <Reveal className="max-w-[820px] mb-6">
        <Kicker className="mb-5">Questions fréquentes</Kicker>
        <h2 className="v2-serif font-light leading-[1.02] text-[clamp(2.2rem,5vw,3.9rem)]" style={{ color: C.ink }}>
          Avant de dire oui
        </h2>
      </Reveal>
      <DrawRule className="w-24 mb-10" />
      <div className="grid lg:grid-cols-2 gap-x-[clamp(2.5rem,5vw,5.5rem)] items-start border-t" style={{ borderColor: 'rgba(28,23,18,0.14)' }}>
        {columns.map((col, c) => (
          <Reveal key={c} delay={c * 0.08}>
            {col.map(([q, a], j) => {
              const i = c * mid + j;
              return <FAQItem key={q} q={q} a={a} open={open === i} onClick={() => setOpen(open === i ? null : i)} />;
            })}
          </Reveal>
        ))}
      </div>
    </section>
  );
};

/* ── Clôture · l'unique moment sombre, arêtes nettes + Atmosphere ── */
const FinalCta: React.FC = () => (
  <section className="relative w-full overflow-hidden" style={{ background: C.dark }}>
    {/* arête nette : filet accent pleine largeur */}
    <span className="absolute inset-x-0 top-0 h-px z-10" style={{ background: C.accent }} aria-hidden />
    <Atmosphere light="50% 8%" strength={0.85} />
    <div className="relative px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,14vh,10rem)] text-center">
      <Reveal>
        <Kicker color="#d3a75e" className="mb-6 flex items-center justify-center gap-3">
          <Wind size={15} weight="light" aria-hidden /> Saison Vata &middot; L'automne vous attend
        </Kicker>
        <h2 className="mx-auto v2-serif font-light leading-[1.08] text-[clamp(2.2rem,5vw,3.9rem)] max-w-[22ch]" style={{ color: C.cream }}>
          Prête à traverser la saison autrement ?
        </h2>
        <p className="mt-7 mx-auto v2-serif italic text-[clamp(1.1rem,2vw,1.5rem)] leading-snug max-w-[40ch]" style={{ color: 'rgba(244,239,230,0.75)' }}>
          « Le calme n'est pas ce qui reste quand tout s'arrête. C'est ce que l'on cultive pendant que le vent souffle. »
        </p>
        <div className="mt-11 flex flex-wrap items-center justify-center gap-x-9 gap-y-5">
          <button
            type="button"
            onClick={go}
            className="group inline-flex items-center gap-2.5 px-9 py-4 min-h-[44px] text-[0.72rem] uppercase tracking-[0.2em] transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
            style={{ background: C.cream, color: C.dark, outlineColor: C.accent }}
            onMouseEnter={(e) => { e.currentTarget.style.background = C.accent; e.currentTarget.style.color = C.ink; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = C.cream; e.currentTarget.style.color = C.dark; }}
          >
            Apaiser mon système nerveux maintenant
            <ArrowRight size={15} weight="regular" className="transition-transform duration-300 group-hover:translate-x-1" />
          </button>
          <a href="#tarifs" className="v2-serif italic text-lg transition-colors duration-300" style={{ color: 'rgba(244,239,230,0.8)' }}>
            Revoir les deux parcours
          </a>
        </div>
        <p className="mt-9 text-[0.62rem] uppercase tracking-[0.26em]" style={{ color: 'rgba(244,239,230,0.45)' }}>
          Programme autonome &middot; accès immédiat &middot; à votre rythme
        </p>
      </Reveal>
    </div>
  </section>
);

/* ════════════════════════ Page ════════════════════════ */

const VataExperience: React.FC = () => (
  <div
    className="relative min-h-screen w-full antialiased overflow-x-hidden"
    style={{ background: C.cream, color: C.ink, fontFamily: '"Inter", system-ui, sans-serif' }}
  >
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..600&family=Inter:wght@300;400;500&display=swap');
      .v2-serif { font-family: "Fraunces", Georgia, serif; }
      .v2-grain {
        position: fixed; inset: 0; z-index: 60; pointer-events: none;
        opacity: 0.045; mix-blend-mode: multiply;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
      }
      @keyframes v2cue { 0%,100% { transform: translateY(0); opacity:.45 } 50% { transform: translateY(8px); opacity:1 } }
      .v2-cue { animation: v2cue 2.4s cubic-bezier(0.22,1,0.36,1) infinite; }
      @media (prefers-reduced-motion: reduce) { .v2-cue { animation: none; } }
    `}</style>

    <div className="v2-grain" aria-hidden />

    <Hero />
    <Signals />
    <Method />
    <Journey />
    <Tiers />
    <Testimonials />
    <Bio />
    <Faq />
    <FinalCta />
  </div>
);

export default VataExperience;
