import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useReducedMotion } from 'framer-motion';
import { Wind, ArrowRight, ArrowDown, Check, CaretDown, Anchor, Ear, Drop } from '@phosphor-icons/react';
import { Atmosphere } from '../components/motion/loeuvre';

/**
 * Expérience Ayurveda · Saison Vata. Refonte intégrale « revue d'automne » :
 * couverture typographique pure, sommaire à numéros romains, chapitres
 * numérotés, exergues, planche tarifs, FAQ deux colonnes. Base V2 magazine
 * crème (Fraunces + Inter, filets laiton) avec une touche de vert sauge
 * (#74824a décor, #55602f texte, tint #e6e8cf). Câblage préservé :
 * checkout Kajabi, ancres #parcours / #tarifs.
 */

const ease = [0.22, 1, 0.36, 1] as const;
const SPRING = { type: 'spring' as const, stiffness: 220, damping: 24, mass: 0.8 };

const CHECKOUT = 'https://www.krystinestlaurent.com/VATAETPREMIUMOPTIONSDEPAIEMENT';
const go = () => window.open(CHECKOUT, '_blank', 'noopener,noreferrer');

/* Tokens V2 + accent sauge de la page */
const C = {
  cream: '#f4efe6',
  panel: '#efe6d7',
  card: '#faf6ee',
  ink: '#1c1712',
  inkSoft: '#3a2f23',
  brass: '#9c7a44',
  brassInk: '#7d6330',
  sage: '#74824a',
  sageInk: '#55602f',
  sageTint: '#e6e8cf',
  dark: '#34241a',
};

const hairline = 'rgba(28,23,18,0.14)';

/* ════════════════════════ Contenu (copie préservée) ════════════════════════ */

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

const SYSTEMS: Array<[string, string, React.ComponentType<{ size?: number; weight?: any }>]> = [
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

const TOC = [
  ['I', 'Les signaux', '#signaux'],
  ['II', 'La méthode', '#methode'],
  ['III', 'Le parcours', '#parcours'],
  ['IV', 'Les tarifs', '#tarifs'],
  ['V', 'Questions', '#faq'],
];

/* ════════════════════════ Primitives ════════════════════════ */

const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string; y?: number }> = ({ children, delay = 0, className, y = 28 }) => {
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

/* Ligne de titre révélée par masque (couverture) */
const MaskLine: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => {
  const reduce = useReducedMotion();
  return (
    <span className="block overflow-hidden">
      <motion.span
        className="block will-change-transform"
        initial={reduce ? false : { y: '112%' }}
        animate={{ y: 0 }}
        transition={{ duration: 1.15, ease, delay }}
      >
        {children}
      </motion.span>
    </span>
  );
};

/* Filet qui se trace au scroll */
const DrawRule: React.FC<{ className?: string; color?: string; delay?: number }> = ({ className = '', color = C.sage, delay = 0.1 }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      className={`h-px origin-left ${className}`}
      style={{ background: color }}
      initial={reduce ? false : { scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, amount: 0.7 }}
      transition={{ duration: 1.2, ease, delay }}
    />
  );
};

/* Rafales de vent : traits SVG qui se dessinent (signature de la couverture) */
const WindLines: React.FC<{ className?: string }> = ({ className = '' }) => {
  const reduce = useReducedMotion();
  const paths = [
    ['M8 46 C 170 6, 330 92, 592 30', 0.5, 0.5],
    ['M0 112 C 160 74, 350 150, 570 104', 0.34, 0.85],
    ['M52 172 C 210 136, 370 204, 600 152', 0.24, 1.2],
  ] as const;
  return (
    <svg viewBox="0 0 600 210" fill="none" aria-hidden className={className} preserveAspectRatio="xMidYMid meet">
      {paths.map(([d, o, delay]) => (
        <motion.path
          key={d}
          d={d}
          stroke={C.sage}
          strokeWidth="1.1"
          strokeLinecap="round"
          style={{ opacity: o }}
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.9, ease, delay }}
        />
      ))}
    </svg>
  );
};

/* En-tête de chapitre : numéro romain géant + kicker + titre + lede */
const ChapterHead: React.FC<{ no: string; kicker: string; title: string; lede?: string; className?: string }> = ({ no, kicker, title, lede, className = '' }) => (
  <Reveal className={className}>
    <div className="flex items-start gap-[clamp(1.25rem,2.5vw,2.25rem)]">
      <span aria-hidden className="v2-serif font-light leading-[0.85] text-[clamp(4rem,8vw,7rem)] select-none" style={{ color: 'rgba(116,130,74,0.28)' }}>
        {no}
      </span>
      <div className="pt-[0.4em]">
        <p className="text-[0.7rem] uppercase tracking-[0.34em]" style={{ color: C.sageInk }}>{kicker}</p>
        <h2 className="mt-4 v2-serif font-light leading-[1.02] text-[clamp(2.1rem,4.6vw,3.7rem)]" style={{ color: C.ink }}>{title}</h2>
        {lede && (
          <p className="mt-5 v2-serif italic text-[clamp(1.1rem,1.9vw,1.45rem)] leading-snug max-w-[46ch]" style={{ color: C.inkSoft }}>{lede}</p>
        )}
        <DrawRule className="mt-6 w-20" />
      </div>
    </div>
  </Reveal>
);

/* Médaillon sauge qui éclot */
const Medallion: React.FC<{ Icon: React.ComponentType<{ size?: number; weight?: any }>; size?: number }> = ({ Icon, size = 52 }) => {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className="inline-grid place-items-center rounded-full will-change-transform"
      style={{ background: C.sage, color: C.card, width: size, height: size }}
      initial={reduce ? false : { scale: 0.4, rotate: -12, opacity: 0 }}
      whileInView={{ scale: 1, rotate: 0, opacity: 1 }}
      whileHover={reduce ? undefined : { scale: 1.09, rotate: -4 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={SPRING}
    >
      <Icon size={Math.round(size * 0.44)} weight="light" />
    </motion.span>
  );
};

/* Exergue : citation dont les mots apparaissent en cascade */
const Exergue: React.FC<{ children: string }> = ({ children }) => {
  const reduce = useReducedMotion();
  const words = children.split(' ');
  return (
    <section className="w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(4.5rem,10vh,7.5rem)]">
      <DrawRule className="w-full" color="rgba(116,130,74,0.4)" />
      <motion.blockquote
        className="mx-auto max-w-[34ch] py-[clamp(3rem,6vh,4.5rem)] text-center v2-serif italic font-light leading-[1.3] text-[clamp(1.6rem,3.4vw,2.7rem)]"
        style={{ color: C.inkSoft }}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.6 }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : 0.06 } } }}
      >
        {words.map((w, i) => (
          <motion.span
            key={i}
            className="inline-block will-change-transform"
            variants={{ hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } } }}
          >
            {w}{i < words.length - 1 ? ' ' : ''}
          </motion.span>
        ))}
      </motion.blockquote>
      <DrawRule className="w-full" color="rgba(116,130,74,0.4)" />
    </section>
  );
};

/* CTA souligné */
const UnderlineCta: React.FC<{ label: string; onClick?: () => void }> = ({ label, onClick }) => (
  <button
    type="button"
    onClick={onClick ?? go}
    className="group inline-flex items-center gap-2.5 min-h-[44px] text-[0.72rem] uppercase tracking-[0.2em] border-b pb-1.5 transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
    style={{ color: C.ink, borderColor: C.ink, outlineColor: C.sage }}
    onMouseEnter={(e) => { e.currentTarget.style.color = C.sageInk; e.currentTarget.style.borderColor = C.sage; }}
    onMouseLeave={(e) => { e.currentTarget.style.color = C.ink; e.currentTarget.style.borderColor = C.ink; }}
  >
    {label}
    <ArrowRight size={15} weight="regular" className="transition-transform duration-300 group-hover:translate-x-1" />
  </button>
);

/* ════════════════════════ Couverture typographique ════════════════════════ */

const Cover: React.FC = () => (
  <header className="relative w-full min-h-screen flex flex-col px-[clamp(1.5rem,5vw,5.5rem)] pt-[clamp(6.5rem,12vh,9rem)] pb-[clamp(1.5rem,4vh,3rem)]">
    {/* Ligne d'édition */}
    <Reveal y={10}>
      <div className="flex items-center justify-between border-t pt-3.5 text-[0.6rem] uppercase tracking-[0.28em]" style={{ borderColor: hairline, color: 'rgba(28,23,18,0.55)' }}>
        <span>Édition d'automne · Saison Vata</span>
        <span className="hidden sm:inline">Québec · MMXXVI</span>
      </div>
    </Reveal>

    <div className="relative flex-1 flex flex-col justify-center py-[clamp(2.5rem,6vh,4.5rem)]">
      <WindLines className="pointer-events-none absolute right-0 top-[6%] w-[min(58vw,640px)] hidden md:block" />

      <div className="relative flex items-center gap-5 mb-8">
        <Medallion Icon={Wind} size={46} />
        <p className="text-[0.7rem] uppercase tracking-[0.34em]" style={{ color: C.sageInk }}>Expérience Ayurveda · 7 semaines</p>
      </div>

      <h1 className="relative v2-serif font-light leading-[0.94] text-[clamp(3rem,8.6vw,7.6rem)] max-w-[13ch]" style={{ color: C.ink }}>
        <MaskLine delay={0.05}>Votre corps</MaskLine>
        <MaskLine delay={0.16}>n'est pas fait</MaskLine>
        <MaskLine delay={0.27}><em className="not-italic" style={{ color: C.sageInk }}>pour cette vitesse.</em></MaskLine>
      </h1>

      <div className="relative mt-10 grid gap-y-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
        <Reveal delay={0.42} y={20}>
          <p className="v2-serif italic text-[clamp(1.2rem,2.2vw,1.7rem)] leading-[1.35] max-w-[40ch]" style={{ color: C.inkSoft }}>
            Froid, sécheresse, surcharge mentale : la saison Vata teste vos limites.
            Apprenez à sécuriser vos portes sensorielles pour ramener le calme à l'intérieur.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-x-9 gap-y-4">
            <UnderlineCta label="Apaiser mon système nerveux" />
            <a
              href="#parcours"
              className="v2-serif italic text-lg transition-colors duration-300 hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
              style={{ color: 'rgba(28,23,18,0.7)', outlineColor: C.sage }}
            >
              Voir le parcours
            </a>
          </div>
        </Reveal>
        <Reveal delay={0.55} y={16} className="lg:justify-self-end">
          <ul className="space-y-2.5">
            {['7 semaines + introduction', 'Automne · élément air', 'À votre rythme · accès immédiat'].map((m) => (
              <li key={m} className="flex items-center gap-3 text-[0.66rem] uppercase tracking-[0.2em]" style={{ color: 'rgba(28,23,18,0.62)' }}>
                <span className="h-1 w-1 rounded-full shrink-0" style={{ background: C.sage }} />
                {m}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </div>

    {/* Sommaire */}
    <motion.nav
      aria-label="Sommaire"
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.7 } } }}
      className="border-t"
      style={{ borderColor: hairline }}
    >
      <div className="grid grid-cols-2 md:grid-cols-5">
        {TOC.map(([no, label, href], i) => (
          <motion.a
            key={label}
            href={href}
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.8, ease } } }}
            className={`group flex items-baseline gap-3 py-5 pr-4 min-h-[44px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] ${i > 0 ? 'md:border-l md:pl-6' : ''}`}
            style={{ borderColor: hairline, outlineColor: C.sage }}
          >
            <span className="v2-serif font-light text-[1.35rem] leading-none transition-colors duration-300" style={{ color: C.sageInk }}>{no}</span>
            <span className="text-[0.62rem] uppercase tracking-[0.24em] transition-transform duration-300 group-hover:translate-x-1" style={{ color: C.ink }}>{label}</span>
          </motion.a>
        ))}
      </div>
      <div className="flex items-center justify-between border-t pt-3.5 pb-1 text-[0.6rem] uppercase tracking-[0.28em]" style={{ borderColor: hairline, color: 'rgba(28,23,18,0.55)' }}>
        <span className="flex items-center gap-2 v2-cue"><ArrowDown size={13} weight="regular" /> Faire défiler</span>
        <span className="hidden sm:inline">Enraciner · Réchauffer · Apaiser</span>
      </div>
    </motion.nav>
  </header>
);

/* ════════════════════════ Chapitre I · Les signaux ════════════════════════ */

const Signals: React.FC = () => (
  <section id="signaux" className="w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(5.5rem,13vh,9rem)] scroll-mt-24">
    <div className="grid gap-y-12 lg:grid-cols-[0.85fr_1.15fr] gap-x-[clamp(3rem,6vw,6rem)] items-start">
      <div className="lg:sticky lg:top-28">
        <ChapterHead
          no="I"
          kicker="Les signaux d'alerte"
          title="Avez-vous perdu vos filtres ?"
          lede="Si plus de trois de ces signaux vous ressemblent, votre vent intérieur est en turbulence."
        />
      </div>

      <div>
        <motion.ol
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.08 }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
          className="border-t"
          style={{ borderColor: hairline }}
        >
          {SIGNALS.map(([t, d], i) => (
            <motion.li
              key={t}
              variants={{ hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0, transition: { duration: 0.85, ease } } }}
              className="grid md:grid-cols-[3.25rem_0.9fr_1.1fr] gap-x-6 gap-y-1.5 items-baseline border-b py-6"
              style={{ borderColor: hairline }}
            >
              <span aria-hidden className="v2-serif font-light text-[1.5rem] leading-none tabular-nums" style={{ color: C.sageInk }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="v2-serif font-light text-[1.3rem] leading-[1.15]" style={{ color: C.ink }}>{t}</h3>
              <p className="text-[0.9rem] leading-[1.7]" style={{ color: C.inkSoft }}>{d}</p>
            </motion.li>
          ))}
        </motion.ol>
        <Reveal className="mt-10">
          <p className="v2-serif italic text-[clamp(1.2rem,2.2vw,1.7rem)] leading-snug max-w-[38ch]" style={{ color: C.sageInk }}>
            Ces signes sont le langage du corps. Vata vous invite à ralentir.
          </p>
        </Reveal>
      </div>
    </div>
  </section>
);

/* ════════════════════════ Chapitre II · La méthode ════════════════════════ */

const Method: React.FC = () => (
  <section id="methode" className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(5.5rem,13vh,9rem)] scroll-mt-24" style={{ background: C.panel }}>
    <span className="absolute inset-x-0 top-0 h-px" style={{ background: 'rgba(116,130,74,0.45)' }} aria-hidden />
    <ChapterHead
      no="II"
      kicker="La méthode"
      title="Comment nous allons arrêter la fuite d'énergie"
      lede="Pas de tâches en plus. Trois systèmes de régulation invisibles."
      className="mb-[clamp(3rem,7vh,5rem)]"
    />
    <div className="border-t" style={{ borderColor: 'rgba(28,23,18,0.16)' }}>
      {SYSTEMS.map(([t, d, Icon], i) => (
        <Reveal key={t} delay={i * 0.06}>
          <article
            className="grid md:grid-cols-[auto_0.85fr_1.15fr] gap-x-[clamp(2rem,4.5vw,4.5rem)] gap-y-5 items-start py-[clamp(2.25rem,5vh,3.5rem)] border-b"
            style={{ borderColor: 'rgba(28,23,18,0.16)' }}
          >
            <div className="flex items-center gap-5">
              <Medallion Icon={Icon} />
              <span aria-hidden className="v2-serif font-light text-[clamp(2.4rem,4vw,3.4rem)] leading-none tabular-nums" style={{ color: 'rgba(116,130,74,0.4)' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
            </div>
            <h3 className="v2-serif font-light text-[clamp(1.6rem,2.6vw,2.15rem)] leading-[1.1]" style={{ color: C.ink }}>{t}</h3>
            <p className="text-[0.96rem] leading-[1.8] max-w-[56ch]" style={{ color: C.inkSoft }}>{d}</p>
          </article>
        </Reveal>
      ))}
    </div>
    <span className="absolute inset-x-0 bottom-0 h-px" style={{ background: 'rgba(116,130,74,0.45)' }} aria-hidden />
  </section>
);

/* ════════════════════════ Chapitre III · Le parcours (colonne vertébrale) ════════════════════════ */

const Journey: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.78', 'end 0.55'] });
  return (
    <section id="parcours" className="w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(5.5rem,13vh,9rem)] scroll-mt-24">
      <ChapterHead
        no="III"
        kicker="L'art de l'ancrage réel"
        title="Le parcours, étape par étape"
        lede="Délaisser le superflu, éteindre le bruit, rebâtir votre sécurité intérieure."
        className="mb-[clamp(3.5rem,8vh,5.5rem)]"
      />

      <div ref={ref} className="relative">
        {/* Colonne vertébrale : gauche en mobile, centrée en desktop */}
        <div className="pointer-events-none absolute top-1 bottom-1 left-[6px] lg:left-1/2 w-px -translate-x-1/2" style={{ background: 'rgba(116,130,74,0.22)' }} aria-hidden />
        <motion.div
          className="pointer-events-none absolute top-1 bottom-1 left-[6px] lg:left-1/2 w-px -translate-x-1/2 origin-top"
          style={reduce ? { background: C.sage } : { background: C.sage, scaleY: scrollYProgress }}
          aria-hidden
        />

        {PHASES.map(([t, d], i) => {
          const leftSide = i % 2 === 0;
          return (
            <div key={t} className="relative grid lg:grid-cols-2 gap-x-[clamp(4rem,8vw,8rem)]">
              <span
                className="absolute left-[6px] lg:left-1/2 top-[2.9rem] h-2.5 w-2.5 -translate-x-1/2 rounded-full"
                style={{ background: C.sage, boxShadow: `0 0 0 5px ${C.cream}` }}
                aria-hidden
              />
              <Reveal
                y={26}
                className={`pl-9 lg:pl-0 py-[clamp(1.75rem,4vh,2.75rem)] ${leftSide ? 'lg:col-start-1 lg:text-right' : 'lg:col-start-2'}`}
              >
                <div className={`flex items-baseline gap-4 ${leftSide ? 'lg:justify-end' : ''}`}>
                  <span aria-hidden className="v2-serif font-light text-[clamp(1.9rem,3.2vw,2.8rem)] leading-none tabular-nums" style={{ color: 'rgba(116,130,74,0.45)' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[0.62rem] uppercase tracking-[0.26em]" style={{ color: C.sageInk }}>Semaine {i + 1}</span>
                </div>
                <h3 className="mt-2.5 v2-serif font-light leading-[1.08] text-[clamp(1.55rem,2.7vw,2.2rem)]" style={{ color: C.ink }}>{t}</h3>
                <p className={`mt-3 text-[0.94rem] leading-[1.75] max-w-[46ch] ${leftSide ? 'lg:ml-auto' : ''}`} style={{ color: C.inkSoft }}>{d}</p>
              </Reveal>
            </div>
          );
        })}
      </div>
    </section>
  );
};

/* ════════════════════════ Chapitre IV · Planche tarifs ════════════════════════ */

const Tiers: React.FC = () => (
  <section id="tarifs" className="w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(5.5rem,13vh,9rem)] scroll-mt-24">
    <ChapterHead
      no="IV"
      kicker="Choisissez votre parcours"
      title="Deux façons de traverser la saison"
      className="mb-[clamp(3rem,7vh,5rem)]"
    />
    <Reveal>
      <div className="relative border" style={{ borderColor: 'rgba(156,122,68,0.45)', background: C.card }}>
        <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: C.sage }} aria-hidden />
        <div className="grid md:grid-cols-2">
          {TIERS.map((tier, i) => (
            <article
              key={tier.name}
              className={`flex flex-col p-[clamp(1.75rem,3.5vw,3.25rem)] ${i > 0 ? 'border-t md:border-t-0 md:border-l' : ''}`}
              style={{ borderColor: 'rgba(28,23,18,0.12)', background: tier.recommended ? C.sageTint : 'transparent' }}
            >
              <div className="min-h-[2rem]">
                {tier.recommended && (
                  <span className="inline-block px-3 py-1.5 text-[0.58rem] uppercase tracking-[0.24em]" style={{ background: C.sage, color: C.card }}>
                    Expérience profonde
                  </span>
                )}
              </div>
              <h3 className="mt-4 v2-serif font-light text-[clamp(1.7rem,2.6vw,2.25rem)] leading-[1.1]" style={{ color: C.ink }}>{tier.name}</h3>
              <p className="mt-3 v2-serif italic text-[1.05rem] leading-snug" style={{ color: C.sageInk }}>{tier.intro}</p>
              <div className="mt-8 flex items-end gap-3.5">
                <span className="v2-serif font-light text-[clamp(2.8rem,4.4vw,3.8rem)] leading-none tabular-nums" style={{ color: C.ink }}>{tier.promo}</span>
                <span className="v2-serif text-xl line-through tabular-nums" style={{ color: 'rgba(28,23,18,0.42)' }}>{tier.price}</span>
              </div>
              <p className="mt-2 text-[0.72rem] uppercase tracking-[0.16em] min-h-[1.1rem]" style={{ color: 'rgba(28,23,18,0.6)' }}>{tier.plan || 'Tarif de lancement'}</p>
              <DrawRule className="mt-7 w-full" color="rgba(116,130,74,0.5)" />
              <ul className="mt-7 space-y-3.5 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-[0.92rem] leading-[1.65]" style={{ color: C.inkSoft }}>
                    <Check size={16} weight="bold" className="mt-1 shrink-0" style={{ color: C.sage }} />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={go}
                className="group mt-10 inline-flex items-center justify-center gap-2.5 w-full py-4 min-h-[44px] text-[0.7rem] uppercase tracking-[0.2em] transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
                style={{ background: C.ink, color: C.cream, outlineColor: C.sage }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.sage; e.currentTarget.style.color = C.card; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = C.ink; e.currentTarget.style.color = C.cream; }}
              >
                {tier.name.includes('Bibliothèque') ? 'Rejoindre VATA + Bibliothèque' : 'Rejoindre VATA Essentiel'}
                <ArrowRight size={15} weight="regular" className="transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </article>
          ))}
        </div>
      </div>
    </Reveal>
  </section>
);

/* ════════════════════════ Témoignages · le courrier ════════════════════════ */

const Testimonials: React.FC = () => {
  const [lead, ...rest] = TESTIMONIALS;
  return (
    <section className="w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(5.5rem,13vh,9rem)]" style={{ background: C.panel }}>
      <Reveal className="mb-[clamp(2.5rem,6vh,4rem)]">
        <p className="text-[0.7rem] uppercase tracking-[0.34em]" style={{ color: C.sageInk }}>Elles l'ont vécu</p>
        <h2 className="mt-4 v2-serif font-light leading-[1.02] text-[clamp(2.1rem,4.6vw,3.7rem)]" style={{ color: C.ink }}>
          Témoignages de la communauté
        </h2>
      </Reveal>

      {/* Témoignage en exergue */}
      <Reveal>
        <figure className="relative border-t pt-[clamp(2rem,4vh,3rem)]" style={{ borderColor: 'rgba(116,130,74,0.45)' }}>
          <span aria-hidden className="pointer-events-none select-none absolute -top-2 left-0 v2-serif italic leading-none text-[clamp(5rem,9vw,8rem)]" style={{ color: 'rgba(116,130,74,0.18)' }}>
            «
          </span>
          <blockquote className="relative v2-serif italic font-light leading-[1.4] text-[clamp(1.35rem,2.6vw,2.1rem)] max-w-[52ch] pl-[clamp(2.5rem,5vw,4.5rem)]" style={{ color: C.ink }}>
            {lead.quote}
          </blockquote>
          <figcaption className="mt-6 pl-[clamp(2.5rem,5vw,4.5rem)]">
            <span className="v2-serif text-[1.05rem]" style={{ color: C.sageInk }}>{lead.who}</span>
            <span className="ml-3 text-[0.8rem]" style={{ color: 'rgba(28,23,18,0.6)' }}>{lead.role}</span>
          </figcaption>
        </figure>
      </Reveal>

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}
        className="mt-[clamp(2.5rem,6vh,4rem)] grid md:grid-cols-2 gap-x-[clamp(3rem,6vw,6rem)] gap-y-10"
      >
        {rest.map((t) => (
          <motion.figure
            key={t.who}
            variants={{ hidden: { opacity: 0, y: 26 }, show: { opacity: 1, y: 0, transition: { duration: 0.9, ease } } }}
            className="border-t pt-6"
            style={{ borderColor: 'rgba(28,23,18,0.16)' }}
          >
            <blockquote className="v2-serif italic font-light text-[1.1rem] leading-[1.55]" style={{ color: C.inkSoft }}>
              « {t.quote} »
            </blockquote>
            <figcaption className="mt-5">
              <span className="v2-serif text-[1rem]" style={{ color: C.sageInk }}>{t.who}</span>
              <span className="ml-3 text-[0.8rem]" style={{ color: 'rgba(28,23,18,0.6)' }}>{t.role}</span>
            </figcaption>
          </motion.figure>
        ))}
      </motion.div>
    </section>
  );
};

/* ════════════════════════ La guide · bio typographique ════════════════════════ */

const Bio: React.FC = () => (
  <section className="w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(5.5rem,13vh,9rem)]">
    <div className="grid gap-y-10 lg:grid-cols-[0.9fr_1.1fr] gap-x-[clamp(3rem,7vw,7rem)] items-start">
      <Reveal>
        <p className="text-[0.7rem] uppercase tracking-[0.34em]" style={{ color: C.brassInk }}>Fondatrice d'Inspirata Ayurveda</p>
        <h2 className="mt-4 v2-serif font-light leading-[0.98] text-[clamp(2.6rem,5.4vw,4.6rem)]" style={{ color: C.ink }}>
          Krystine <span className="italic">St-Laurent</span>
        </h2>
        <p className="mt-5 v2-serif italic text-[clamp(1.1rem,1.9vw,1.45rem)] leading-snug max-w-[38ch]" style={{ color: C.inkSoft }}>
          35 ans à la jonction de la rigueur clinique et de la santé globale.
        </p>
        <DrawRule className="mt-6 w-20" color={C.brass} />
      </Reveal>
      <Reveal delay={0.1}>
        <div className="space-y-5 text-[1rem] leading-[1.9] max-w-[58ch] lg:pt-2" style={{ color: C.inkSoft }}>
          <p className="v2-dropcap">
            Pendant 35 ans, Krystine a œuvré en soins intensifs et en recherche clinique, puis en herboristerie,
            Ayurveda et aromathérapie. Elle a vu ce que l'approche moderne fait bien. Et elle a vu là où elle vous laisse seule.
          </p>
          <p>Trois livres aux Éditions de l'Homme. Finaliste au Prix de la Santé Intégrative (catégorie Pionnier). Récipiendaire du Prime Mover Award (Las Vegas).</p>
        </div>
      </Reveal>
    </div>
  </section>
);

/* ════════════════════════ Chapitre V · FAQ deux colonnes ════════════════════════ */

const FAQItem: React.FC<{ q: string; a: string; open: boolean; onClick: () => void }> = ({ q, a, open, onClick }) => (
  <div className="border-b" style={{ borderColor: hairline }}>
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className="w-full text-left py-6 flex items-center justify-between gap-5 min-h-[44px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
      style={{ outlineColor: C.sage }}
    >
      <h3 className="v2-serif font-light text-[1.25rem] md:text-[1.4rem] leading-[1.2] pr-4 transition-colors duration-300" style={{ color: open ? C.sageInk : C.ink }}>
        {q}
      </h3>
      <CaretDown size={18} weight="light" className={`shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} style={{ color: C.sageInk }} />
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
    <section id="faq" className="w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(5.5rem,13vh,9rem)] scroll-mt-24">
      <ChapterHead no="V" kicker="Questions fréquentes" title="Avant de dire oui" className="mb-[clamp(2.5rem,6vh,4rem)]" />
      <div className="grid lg:grid-cols-2 gap-x-[clamp(3rem,6vw,6rem)] items-start border-t" style={{ borderColor: hairline }}>
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

/* ════════════════════════ Quatrième de couverture (moment sombre unique) ════════════════════════ */

const BackCover: React.FC = () => (
  <section className="relative w-full overflow-hidden" style={{ background: C.dark }}>
    <span className="absolute inset-x-0 top-0 h-px z-10" style={{ background: C.sage }} aria-hidden />
    <Atmosphere light="50% 8%" strength={0.85} />
    <div className="relative px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(5.5rem,13vh,9rem)] text-center">
      <Reveal>
        <p className="flex items-center justify-center gap-3 text-[0.7rem] uppercase tracking-[0.34em]" style={{ color: '#c6cf9b' }}>
          <Wind size={15} weight="light" aria-hidden /> Saison Vata · L'automne vous attend
        </p>
        <h2 className="mt-7 mx-auto v2-serif font-light leading-[1.08] text-[clamp(2.2rem,5vw,3.9rem)] max-w-[22ch]" style={{ color: C.cream }}>
          Prête à traverser la saison autrement ?
        </h2>
        <p className="mt-7 mx-auto v2-serif italic text-[clamp(1.1rem,2vw,1.5rem)] leading-snug max-w-[40ch]" style={{ color: 'rgba(244,239,230,0.75)' }}>
          « Le calme se cultive pendant que le vent souffle. »
        </p>
        <div className="mt-11 flex flex-wrap items-center justify-center gap-x-9 gap-y-5">
          <button
            type="button"
            onClick={go}
            className="group inline-flex items-center gap-2.5 px-9 py-4 min-h-[44px] text-[0.72rem] uppercase tracking-[0.2em] transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
            style={{ background: C.cream, color: C.dark, outlineColor: C.sage }}
            onMouseEnter={(e) => { e.currentTarget.style.background = C.sage; e.currentTarget.style.color = C.card; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = C.cream; e.currentTarget.style.color = C.dark; }}
          >
            Apaiser mon système nerveux maintenant
            <ArrowRight size={15} weight="regular" className="transition-transform duration-300 group-hover:translate-x-1" />
          </button>
          <a
            href="#tarifs"
            className="v2-serif italic text-lg transition-colors duration-300 hover:opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
            style={{ color: 'rgba(244,239,230,0.8)', outlineColor: C.sage }}
          >
            Revoir les deux parcours
          </a>
        </div>
        <p className="mt-10 text-[0.62rem] uppercase tracking-[0.26em]" style={{ color: 'rgba(244,239,230,0.5)' }}>
          Programme autonome · accès immédiat · à votre rythme
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
      .v2-dropcap::first-letter {
        font-family: "Fraunces", Georgia, serif; font-weight: 300;
        float: left; font-size: 3.6em; line-height: 0.82;
        padding-right: 0.12em; color: #55602f;
      }
      @keyframes v2cue { 0%,100% { transform: translateY(0); opacity:.45 } 50% { transform: translateY(8px); opacity:1 } }
      .v2-cue { animation: v2cue 2.4s cubic-bezier(0.22,1,0.36,1) infinite; }
      @media (prefers-reduced-motion: reduce) { .v2-cue { animation: none; } }
    `}</style>

    <div className="v2-grain" aria-hidden />

    <Cover />
    <Exergue>« Le vent se calme lorsqu'il trouve un endroit où se poser. »</Exergue>
    <Signals />
    <Method />
    <Journey />
    <Tiers />
    <Testimonials />
    <Bio />
    <Faq />
    <BackCover />
  </div>
);

export default VataExperience;
