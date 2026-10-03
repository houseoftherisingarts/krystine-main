import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useReducedMotion } from 'framer-motion';
import { Wind, ArrowRight, ArrowDown, Check, CaretDown, Anchor, Ear, Drop } from '@phosphor-icons/react';
import { Atmosphere } from '../components/motion/loeuvre';
import StickerFormat from '../components/cours/StickerFormat';
import LecteurAudioCours from '../components/cours/LecteurAudioCours';
import { enLancement, TIERS } from './vata/offre';
import { SEMAINES_VATA } from './vata/semaines';
import { FORMATION_VATA_ID, prixEnVigueur, montantVersement, versementsPermis } from '../lib/versements';

/**
 * Expérience Ayurveda · Saison Vata. Refonte intégrale « revue d'automne » :
 * couverture typographique pure, sommaire à numéros romains, chapitres
 * numérotés, exergues, planche tarifs, FAQ deux colonnes. Base V2 magazine
 * crème (Fraunces + Inter, filets laiton) avec une touche de vert sauge
 * (#74824a décor, #55602f texte, tint #e6e8cf). Câblage préservé :
 * checkout Kajabi, ancres #parcours / #tarifs.
 */

// La courbe maison, sans rebond (cubic-bezier(.16,.8,.24,1)) et la durée d'apparition.
const ease = [0.16, 0.8, 0.24, 1] as const;
const APPEAR = 1.1;

// VATA Essentiel se vend et se suit ici même (Stripe + leçons natives, 50 leçons
// du produit Kajabi du 17 juillet 2024). Un seul palier depuis septembre 2026 :
// la Grande Bibliothèque n'est plus offerte.
// Le bouton mène à la page de choix (un paiement ou trois versements); qui
// possède déjà le cours y est renvoyée tout droit vers ses leçons.
const COURS = '/paiement/vata';
const go = () => { window.location.href = COURS; };
// Le prix en vigueur, calculé comme la caisse (versements.ts).
const prixVata = () => prixEnVigueur(FORMATION_VATA_ID, parseInt(TIERS[0].promo, 10));

/* Tokens V2 + accent sauge de la page */
const C = {
  cream: '#f4efe6',
  panel: '#efe6d7',
  card: '#faf6ee',
  ink: '#1c1712',
  inkSoft: '#3a2f23',
  brass: '#9c7a44',
  brassInk: '#7d6330',
  sage: '#606d39',
  sageInk: '#3f4a27',
  sageTint: '#e6e8cf',
  // Sauge vivant pour les GRANDS éléments décoratifs (chiffres, médaillons, filets).
  sageVif: '#74824a',
  // Bandes vert olive pleine largeur, comme la bannière du cours (1er oct. 2026).
  paper: '#F7F3EA',
  ivory: '#EEE7DB',
  brassLight: '#d9a05b',
  sagePale: '#dfe3c2',
  dark: '#34241a',
};

// Dégradé de la bannière du cours : olive foncé vers olive plus pâle.
const OLIVE = 'linear-gradient(165deg, #3d4033 0%, #4a4d3c 55%, #5a5d47 100%)';

const hairline = 'rgba(28,23,18,0.14)';

// Rythme crème (1er oct. 2026) : les sections alternent crème et crème chaud
// (C.panel), avec deux bandes olive. Chaque section garde le même espacement resserré.
const PY = 'py-[clamp(3.25rem,9vh,7rem)]';

/* ════════════════════════ Contenu (copie préservée) ════════════════════════ */

// Les signaux regroupés en trois portraits de Vata qui s'emballe (Krystine,
// 30 sept. 2026 : une seule idée). La lectrice coche ceux qui lui ressemblent.
const SIGNALS = [
  ['Le mental', 'Le mental tourbillonne dans mille et un scénarios, dont la majorité ne verront jamais le jour. La surstimulation des sens ramène le chaos à l\'intérieur, et la clarté s\'efface.'],
  ["Le sommeil et l'énergie", 'Le réveil de 3 h du matin, lorsque les soucis de la journée restent ouverts comme de vieux fichiers. L\'épuisement s\'installe, et il devient difficile de retrouver son centre.'],
  ['Le corps', 'Les mains glacées, la peau sèche et morne, la digestion irrégulière, et le ventre où tant de tensions se font sentir. Le corps se dessèche et demande à être réchauffé.'],
];

const SYSTEMS: Array<[string, string, React.ComponentType<{ size?: number; weight?: any }>]> = [
  ["Le système d'ancrage", "Le souffle d'abord, pour rappeler au corps qu'il est en sécurité, enveloppé et aimé. Une main sur le cœur, l'autre sur le ventre, l'expiration s'allonge : 4 secondes, puis 5, puis 6, puis 7.", Anchor],
  ["Le filtrage sensoriel", "Connecter, observer, apaiser nos sens permet de se rebrancher vers le cœur. Un sens à la fois, nous apprenons à choisir ce qui entre et reste dans notre biodiversité intérieure.", Ear],
  ["Ce qui réchauffe", "En sanskrit, le mot huile se dit sneha, et il signifie aussi amour. L'huile chaude, l'armoire à épices et l'eau digestive aident le corps à se réchauffer et la sécheresse à s'hydrater, et le mental s'apaise avec eux.", Drop],
];

// Les titres des semaines sont ceux du cours (src/pages/vata/semaines.ts), une
// seule version partout (Krystine, 30 sept. 2026).
const PHASES = [
  ["Préparer votre espace", "Un espace bienveillant et enveloppant, rien qu'à vous, et une intention déposée chaque matin pour plonger tout en douceur."],
  ["Le souffle", "Le souffle pour calmer le tourbillon, en quelques secondes."],
  ["L'ouïe", "Fermer les portes de l'ouïe et offrir au système nerveux le calme dont il a soif."],
  ["La vue", "Reposer les yeux, loin des écrans, et retrouver une clarté que l'on croyait perdue."],
  ["L'odorat", "Le nez nous mène : une seule inspiration, et l'état d'esprit change."],
  ["Le goût", "Les saveurs qui réchauffent le corps et calment les turbulences."],
  ["Le toucher", "L'huile chaude recrée une protection autour du corps, qui se sent enfin enveloppé."],
  ["La présence", "Renverser l'effet d'un stress continu, et repartir avec des repères qui nous appartiennent."],
  ['Clore la saison', 'Un dernier mot de Krystine, et votre guide complet de 204 pages à garder et à relire.'],
];

/* Couvertures des documents du programme (public/vata/couvertures) */
const couv = (id: string) => `/vata/couvertures/${id}.jpg`;
// L'image de chaque étape du parcours vient de semaines.ts (source unique,
// Krystine 2 oct. 2026 : les visuels tirés des PDF, sans fleurs gelées).
const COUV_DOCS = ['002', '006', '008', '012', '014', '017', '020', '021', '022', '023', '026', '027', '028', '029', '030', '033', '034', '035', '036', '037', '040', '041', '042', '043', '046', '047', '048'];
const phaseLabel = (i: number) => (i === 0 ? 'Introduction' : i === PHASES.length - 1 ? 'Conclusion' : `Semaine ${i}`);

const TESTIMONIALS = [
  { quote: "Avant de rejoindre le programme de Krystine, je me sentais épuisée, à concilier travail et vie personnelle sans me laisser de temps. J'avais l'impression que même si je courais plus vite, rien n'y faisait. Aujourd'hui, grâce à de petites pratiques ayurvédiques intégrées à ma routine, j'ai retrouvé de l'énergie et de la clarté sans ajouter de stress à ma journée. Et je sais que ce n'est que le commencement.", who: 'Marie-Claude', role: 'Une vie professionnelle débordante' },
  { quote: "Je ne pensais jamais comprendre avec autant de facilité ce que l'Ayurveda, sous la guidance de Krystine, pouvait amener dans ma vie et celle de ma famille. J'avais ses deux livres, mais ce programme est tellement puissant : il nous aide à intégrer, à vivre la théorie.", who: 'Sophie', role: 'Lectrice des deux livres' },
  { quote: "En tant que maman et aidante naturelle, je culpabilisais de prendre du temps pour moi. Les conseils de Krystine m'ont montré comment nourrir mon bien-être tout en prenant soin de ma famille. Mes proches le remarquent : je suis lumineuse.", who: 'Julie', role: 'Celle qui pense aux autres en premier' },
  { quote: "La transition dans cette nouvelle phase de ma vie était plutôt difficile, jusqu'à ce que je rencontre Krystine. Son approche m'a aidée à me reconnecter à ma force intérieure et à aborder ce changement avec vitalité et sérénité, sans bouleverser mon mode de vie.", who: 'Nicole', role: 'Une transition de vie importante' },
];

const FAQS = [
  ["Est-ce que je dois connaître l'Ayurveda ?", "Le programme est conçu pour être simple, concret et accessible. Krystine rend chaque notion claire, pour qu'elle devienne un outil pratique dans votre quotidien."],
  ['Combien de temps ai-je accès au contenu ?', "Vous gardez l'accès à tout ce qui s'est ouvert pendant au moins trois ans. Vous pourrez y revenir chaque fois que Vata se réveille."],
  ["Quel est l'investissement de temps requis ?", "C'est un programme qui respecte votre rythme. Les capsules audio font entre 5 et 15 minutes. L'idée n'est pas d'ajouter une corvée, mais de remplacer certaines habitudes stressantes par des moments d'apaisement."],
  ["Comment les semaines s'ouvrent-elles ?", "L'introduction et la semaine 1 s'ouvrent dès votre inscription. Ensuite, une nouvelle semaine s'ouvre tous les 7 jours, un courriel vous prévient à chaque fois, et vous gardez l'accès à tout ce qui est ouvert."],
  ['Est-ce que je peux suivre sur mobile ou tablette ?', "Oui. Le programme s'adapte à votre téléphone et à votre tablette, et vous pouvez écouter vos capsules comme un balado, même écran verrouillé, pendant vos déplacements."],
  ['Et si le programme ne me convient pas ?', "Vous avez la garantie cœur léger : si le programme ne vous convient pas, écrivez-nous dans les 15 jours suivant l'achat et nous vous remboursons."],
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
      transition={{ duration: APPEAR, ease, delay }}
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
const DrawRule: React.FC<{ className?: string; color?: string; delay?: number }> = ({ className = '', color = C.sageVif, delay = 0.1 }) => {
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
          stroke={C.sageVif}
          strokeWidth="1.1"
          strokeLinecap="round"
          style={{ opacity: o }}
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease, delay }}
        />
      ))}
    </svg>
  );
};

/* En-tête de chapitre : numéro romain géant + kicker + titre + lede */
const ChapterHead: React.FC<{ no: string; kicker: string; title: string; lede?: string; className?: string; olive?: boolean }> = ({ no, kicker, title, lede, className = '', olive }) => (
  <Reveal className={className}>
    {/* Au téléphone, le chiffre romain passe au-dessus pour laisser toute la largeur au titre. */}
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:gap-[clamp(1.25rem,2.5vw,2.25rem)]">
      <span aria-hidden className="v2-serif font-light leading-[0.85] text-[2.75rem] sm:text-[clamp(4rem,8vw,7rem)] select-none" style={{ color: olive ? C.brassLight : C.sageVif }}>
        {no}
      </span>
      <div className="min-w-0 sm:pt-[0.4em]">
        <p className="text-[0.7rem] uppercase tracking-[0.34em]" style={{ color: olive ? C.ivory : C.sageInk }}>{kicker}</p>
        <h2 className="mt-4 v2-serif font-light leading-[1.02] text-[clamp(1.8rem,4.6vw,3.7rem)]" style={{ color: olive ? C.paper : C.ink }}>{title}</h2>
        {lede && (
          <p className="mt-5 v2-serif text-[clamp(1.1rem,1.9vw,1.45rem)] leading-snug max-w-[46ch]" style={{ color: olive ? C.ivory : C.inkSoft }}>{lede}</p>
        )}
        <DrawRule className="mt-6 w-20" color={olive ? C.brassLight : C.sageVif} />
      </div>
    </div>
  </Reveal>
);

/* Médaillon sauge qui éclot */
const Medallion: React.FC<{ Icon: React.ComponentType<{ size?: number; weight?: any }>; size?: number }> = ({ Icon, size = 52 }) => {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className="inline-block shrink-0"
      style={{ width: size, height: size }}
      initial={reduce ? false : { opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: APPEAR, ease }}
    >
      {/* La rotation au survol vit en CSS (.v2-medal), souris seulement. */}
      <span className="v2-medal grid h-full w-full place-items-center rounded-full" style={{ background: C.sageVif, color: C.card }}>
        <Icon size={Math.round(size * 0.44)} weight="light" />
      </span>
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
        className="mx-auto max-w-[34ch] py-[clamp(3rem,6vh,4.5rem)] text-center v2-serif font-light leading-[1.3] text-[clamp(1.6rem,3.4vw,2.7rem)]"
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
            variants={{ hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: APPEAR, ease } } }}
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

/* Une couverture de document, posée comme du papier */
const Doc: React.FC<{ id: string; className?: string; eager?: boolean; src?: string }> = ({ id, className = '', eager, src }) => (
  <img
    src={src ?? couv(id)}
    alt=""
    width={707}
    height={1000}
    loading={eager ? 'eager' : 'lazy'}
    decoding="async"
    className={`block w-full h-auto aspect-[707/1000] object-cover rounded-[4px] border ${className}`}
    style={{ borderColor: 'rgba(28,23,18,0.1)', boxShadow: '0 22px 44px -22px rgba(28,23,18,0.5), 0 2px 6px rgba(28,23,18,0.08)' }}
  />
);

/* Éventail de couvertures dans l'en-tête : les documents posés sur la table */
const FAN: Array<[string, number, string, number]> = [
  // id, rotation, décalage horizontal (% de la carte), profondeur
  ['006', -13, '-50%', 1],
  ['012', -6.5, '-25%', 2],
  ['029', 6.5, '25%', 2],
  ['041', 13, '50%', 1],
  ['guide', 0, '0%', 3],
];

const CoverFan: React.FC = () => {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden className="relative mx-auto w-[min(84vw,360px)] lg:w-full aspect-[1/0.8] select-none">
      {FAN.map(([id, rot, x, z], i) => (
        <div key={id} className="absolute bottom-[3%] left-1/2 w-[40%] -ml-[20%]" style={{ zIndex: z }}>
          <motion.div
            className="origin-bottom will-change-transform"
            initial={reduce ? false : { rotate: 0, x: '0%', y: 30, opacity: 0 }}
            animate={{ rotate: rot, x, y: z === 1 ? '5%' : z === 2 ? '1.5%' : '0%', opacity: 1 }}
            transition={{ duration: 1.2, ease, delay: 0.35 + i * 0.08 }}
          >
            <Doc id={id} eager className={id === 'guide' ? 'scale-[1.08] origin-bottom' : ''} />
          </motion.div>
        </div>
      ))}
    </div>
  );
};

/* ════════════════════════ Couverture typographique ════════════════════════ */

const Cover: React.FC = () => {
  const reduce = useReducedMotion();
  return (
  <header className="relative w-full min-h-screen flex flex-col px-[clamp(1.5rem,5vw,5.5rem)] pt-[clamp(6.5rem,12vh,9rem)] pb-[clamp(1.5rem,4vh,3rem)]">
    <div className="relative flex-1 grid items-center gap-y-12 gap-x-[clamp(2rem,4vw,4rem)] py-[clamp(2.5rem,6vh,4.5rem)] lg:grid-cols-[minmax(0,1fr)_clamp(260px,30vw,460px)]">
      <WindLines className="pointer-events-none absolute right-0 top-[6%] w-[min(58vw,640px)] hidden md:block" />
      <div className="relative min-w-0">

      <p className="relative mb-4 text-[0.66rem] font-semibold uppercase tracking-[0.3em]" style={{ color: C.sageInk }}>L'Expérience Ayurveda · Saison Vata</p>
      <div className="relative flex items-center gap-5 mb-8">
        <Medallion Icon={Wind} size={46} />
        <p className="text-[0.7rem] uppercase tracking-[0.34em]" style={{ color: C.sageInk }}>VATA Essentiel · Sept semaines</p>
      </div>

      <h1 className="relative v2-serif font-light leading-[0.98] text-[clamp(2.1rem,5.6vw,5.4rem)]" style={{ color: C.ink }}>
        <MaskLine delay={0.05}>Apaiser le mental,</MaskLine>
        <MaskLine delay={0.16}><em className="not-italic" style={{ color: C.sageInk }}>un sens à la fois.</em></MaskLine>
      </h1>

      <div className="relative mt-10 grid gap-y-8 2xl:grid-cols-[1.15fr_0.85fr] 2xl:items-end">
        <Reveal delay={0.42} y={20}>
          <p className="v2-serif text-[clamp(1.2rem,2.2vw,1.7rem)] leading-[1.35] max-w-[40ch]" style={{ color: C.inkSoft }}>
            Des ancrages pour apaiser le mental lorsque les turbulences sont trop fortes.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-x-9 gap-y-4">
            {/* Le bouton d'achat avec le prix dès le haut (revue des visiteuses, 2 oct. 2026). */}
            <button
              type="button"
              onClick={go}
              className="group inline-flex min-h-[48px] items-center justify-center gap-2.5 whitespace-nowrap px-5 py-4 text-[0.64rem] uppercase tracking-[0.08em] sm:px-8 sm:text-[0.72rem] sm:tracking-[0.18em] transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
              style={{ background: C.ink, color: C.cream, outlineColor: C.sage }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.sage; e.currentTarget.style.color = C.card; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = C.ink; e.currentTarget.style.color = C.cream; }}
            >
              Commencer VATA Essentiel · {prixVata()} $
              <ArrowRight size={15} weight="regular" className="shrink-0 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
            <a
              href="#parcours"
              className="v2-serif text-lg transition-colors duration-300 hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
              style={{ color: 'rgba(28,23,18,0.7)', outlineColor: C.sage }}
            >
              Voir le parcours
            </a>
          </div>
        </Reveal>
        <Reveal delay={0.55} y={16} className="2xl:justify-self-end">
          <ul className="space-y-2.5">
            {['Capsules, méditations et guide de 204 pages', '7 semaines + introduction', 'Éléments air et espace', 'Accès immédiat'].map((m) => (
              <li key={m} className="flex items-center gap-3 text-[0.66rem] uppercase tracking-[0.2em]" style={{ color: 'rgba(28,23,18,0.62)' }}>
                <span className="h-1 w-1 rounded-full shrink-0" style={{ background: C.sage }} />
                {m}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
      </div>
      <CoverFan />
    </div>

    {/* Sommaire */}
    {/* Le sommaire est retiré (Krystine, 1er oct. 2026 : pas clair) */}
  </header>
  );
};

/* ════════════════════════ Ella · la lectrice qui se reconnaît ════════════════════════ */
// Ella, l'avatar principal de Krystine (entrepreneure, 45-55 ans), fil du tome 3.
// Le seul but de ce passage : que la lectrice se sente vue et entendue
// (Krystine, 30 sept. 2026).

const Ella: React.FC = () => (
  <section className={`relative w-full px-[clamp(1.5rem,5vw,5.5rem)] ${PY}`} style={{ background: OLIVE }}>
    <Reveal>
      <div className="mx-auto max-w-[760px]">
        <DrawRule className="mb-8 w-20" color={C.brassLight} />
        <div className="space-y-6 v2-serif text-[clamp(1.2rem,2vw,1.55rem)] leading-[1.55]" style={{ color: C.paper }}>
          <p>Il est 3 h du matin. Elle a les mains glacées, et le mental déjà au travail : la réunion de demain, la liste qui s'allonge, ce qu'elle a oublié de dire. Le jour, elle tient tout, les gens, les projets, les décisions. Le soir, le corps lâche avant elle. La nuit, les soucis semblent encore plus grands.</p>
          <p style={{ color: C.sagePale }}>Ce qu'elle ressent porte un nom : Vata, le vent qui fait tourner le moulin intérieur. Plus il vente, plus le mental s'emballe, et il s'apaise lorsque nous lui offrons des points de repère, un sens à la fois.</p>
        </div>
      </div>
    </Reveal>
  </section>
);

/* ════════════════════════ Chapitre I · Les signaux ════════════════════════ */

const Signals: React.FC = () => {
  const reduce = useReducedMotion();
  const [coches, setCoches] = useState<boolean[]>(() => SIGNALS.map(() => false));
  const n = coches.filter(Boolean).length;
  const reponse = n === 0
    ? null
    : n === 1
      ? 'Un premier signal. Vata commence à se faire entendre, et c\'est le bon moment pour mettre en place des points de repère.'
      : 'Il vente fort à l\'intérieur. C\'est exactement le moment de vous repositionner et de vous enraciner dans des pratiques qui font du sens.';
  return (
  <section id="signaux" className={`w-full px-[clamp(1.5rem,5vw,5.5rem)] ${PY} scroll-mt-24`}>
    <div className="grid gap-y-12 lg:grid-cols-[0.85fr_1.15fr] gap-x-[clamp(3rem,6vw,6rem)] items-start">
      <div className="lg:sticky lg:top-28">
        <ChapterHead
          no="I"
          kicker="Les signaux du corps"
          title="Lorsque le mental s'emballe"
          lede="Cochez les portraits qui vous ressemblent. Si deux sur trois vous parlent, le corps vous envoie déjà des signaux plus forts."
        />
      </div>

      <div>
        <ol className="border-t" style={{ borderColor: hairline }}>
          {SIGNALS.map(([t, d], i) => (
            <li key={t} className="border-b" style={{ borderColor: hairline }}>
              <button
                type="button"
                aria-pressed={coches[i]}
                onClick={() => setCoches(c => c.map((v, j) => (j === i ? !v : v)))}
                className="group grid w-full grid-cols-[2.5rem_1fr] md:grid-cols-[3.25rem_0.9fr_1.1fr] gap-x-6 gap-y-1.5 items-baseline py-7 pl-3 pr-3 md:pl-4 md:pr-5 text-left active:scale-[0.99] motion-reduce:active:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
                style={{ outlineColor: C.sage, background: coches[i] ? C.sageTint : 'transparent', transition: 'background-color .3s cubic-bezier(.16,.8,.24,1), transform .14s cubic-bezier(.16,.8,.24,1)' }}
              >
                <span
                  aria-hidden
                  className="mt-1 flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors duration-300 md:ml-2"
                  style={{ borderColor: C.sageInk, background: coches[i] ? C.sageInk : 'transparent', color: C.card }}
                >
                  {coches[i] && <Check size={14} weight="bold" />}
                </span>
                <h3 className="v2-serif font-light text-[1.45rem] leading-[1.15]" style={{ color: C.ink }}>{t}</h3>
                <p className="col-start-2 md:col-start-auto text-[0.95rem] leading-[1.7]" style={{ color: C.inkSoft }}>{d}</p>
              </button>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[0.7rem] uppercase tracking-[0.2em]" style={{ color: C.sageInk }}>
          {n === 0 ? 'Touchez un portrait pour dire oui' : `${n} sur ${SIGNALS.length} vous ressemble${n > 1 ? 'nt' : ''}`}
        </p>
        <Reveal className="mt-8">
          {/* La phrase de réponse et le lien arrivent en fondu doux, sans saut. */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={reponse || 'repos'}
              className="v2-serif text-[clamp(1.2rem,2.2vw,1.7rem)] leading-snug max-w-[38ch]"
              style={{ color: C.sageInk }}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: 0.6, ease }}
            >
              {reponse || 'Ces signes sont des signaux que le corps envoie. Lorsque nous ralentissons assez, il retrouve le chemin du retour vers l\'équilibre.'}
            </motion.p>
          </AnimatePresence>
          <AnimatePresence initial={false}>
            {n >= 2 && (
              <motion.div
                className="mt-6"
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease }}
              >
                <UnderlineCta label="Voir le parcours" onClick={() => document.getElementById('parcours')?.scrollIntoView({ behavior: 'smooth' })} />
              </motion.div>
            )}
          </AnimatePresence>
        </Reveal>
      </div>
    </div>
  </section>
  );
};

/* ════════════════════════ Chapitre II · La méthode ════════════════════════ */

const Method: React.FC = () => (
  <section id="methode" className={`relative w-full px-[clamp(1.5rem,5vw,5.5rem)] ${PY} scroll-mt-24`} style={{ background: C.panel }}>
    <span className="absolute inset-x-0 top-0 h-px" style={{ background: 'rgba(116,130,74,0.45)' }} aria-hidden />
    <ChapterHead
      no="II"
      kicker="La méthode"
      title="Reprendre le pouvoir sur vos turbulences"
      lede="L'Ayurveda est tel un vieux grand-père qui nous prend par la main pour nous dire : « Viens, je vais te montrer le chemin du retour à la maison. » Nous y avançons une respiration à la fois, sans pression aucune."
      className="mb-[clamp(3rem,7vh,5rem)]"
    />
    <div className="border-t" style={{ borderColor: 'rgba(28,23,18,0.16)' }}>
      {SYSTEMS.map(([t, d, Icon], i) => (
        <Reveal key={t} delay={i * 0.06}>
          <article
            className="grid md:grid-cols-[clamp(9.5rem,12vw,11rem)_0.85fr_1.15fr] gap-x-[clamp(2rem,4.5vw,4.5rem)] gap-y-5 items-start py-[clamp(2.25rem,5vh,3.5rem)] border-b"
            style={{ borderColor: 'rgba(28,23,18,0.16)' }}
          >
            <div className="flex items-center gap-5">
              <Medallion Icon={Icon} />
              <span aria-hidden className="v2-serif font-light text-[clamp(2.4rem,4vw,3.4rem)] leading-none tabular-nums" style={{ color: C.sageVif }}>
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
    <section id="parcours" className={`relative w-full px-[clamp(1.5rem,5vw,5.5rem)] ${PY} scroll-mt-24`} style={{ background: C.panel }}>
      <span className="absolute inset-x-0 top-0 h-px" style={{ background: 'rgba(116,130,74,0.45)' }} aria-hidden />
      <ChapterHead
        no="III"
        kicker="Un sens à la fois"
        title="Le parcours, étape par étape"
        lede="Au bout de sept semaines, lorsque le vent se lève, vous savez comment revenir à vous."
        className="mb-[clamp(3.5rem,8vh,5.5rem)]"
      />

      <div ref={ref} className="relative">
        {/* Colonne vertébrale : gauche en mobile, centrée en desktop */}
        <div className="pointer-events-none absolute top-1 bottom-1 left-[6px] lg:left-1/2 w-px -translate-x-1/2" style={{ background: 'rgba(116,130,74,0.22)' }} aria-hidden />
        <motion.div
          className="pointer-events-none absolute top-1 bottom-1 left-[6px] lg:left-1/2 w-px -translate-x-1/2 origin-top"
          style={reduce ? { background: C.sageVif } : { background: C.sageVif, scaleY: scrollYProgress }}
          aria-hidden
        />

        {PHASES.map(([t, d], i) => {
          const leftSide = i % 2 === 0;
          return (
            <div key={t} className="relative grid lg:grid-cols-2 gap-x-[clamp(4rem,8vw,8rem)]">
              <span
                className="absolute left-[6px] lg:left-1/2 top-[2.9rem] h-2.5 w-2.5 -translate-x-1/2 rounded-full"
                style={{ background: C.sageVif, boxShadow: `0 0 0 5px ${C.panel}` }}
                aria-hidden
              />
              <Reveal
                y={26}
                className={`pl-9 lg:pl-0 py-[clamp(1.75rem,4vh,2.75rem)] ${leftSide ? 'lg:col-start-1 lg:text-right' : 'lg:col-start-2'}`}
              >
                <div className={`flex items-start gap-[clamp(1.1rem,2.2vw,2rem)] ${leftSide ? 'lg:flex-row-reverse' : ''}`}>
                <div className="w-[clamp(78px,20vw,96px)] lg:w-[clamp(110px,9.5vw,140px)] shrink-0">
                  <Doc id={`semaine-${i}`} src={SEMAINES_VATA[i]?.vignette} />
                </div>
                <div className="min-w-0 flex-1">
                <div className={`flex items-baseline gap-4 ${leftSide ? 'lg:justify-end' : ''}`}>
                  <span aria-hidden className="v2-serif font-light text-[clamp(1.9rem,3.2vw,2.8rem)] leading-none tabular-nums" style={{ color: C.sageVif }}>
                    {String(i).padStart(2, '0')}
                  </span>
                  <span className="text-[0.62rem] uppercase tracking-[0.26em]" style={{ color: C.sageInk }}>{phaseLabel(i)}</span>
                </div>
                <h3 className="mt-2.5 v2-serif font-light leading-[1.08] text-[clamp(1.55rem,2.7vw,2.2rem)]" style={{ color: C.ink }}>{t}</h3>
                <p className={`mt-3 text-[0.94rem] leading-[1.75] max-w-[46ch] ${leftSide ? 'lg:ml-auto' : ''}`} style={{ color: C.inkSoft }}>{d}</p>
                </div>
                </div>
              </Reveal>
            </div>
          );
        })}
      </div>
      <span className="absolute inset-x-0 bottom-0 h-px" style={{ background: 'rgba(116,130,74,0.45)' }} aria-hidden />
    </section>
  );
};

/* ════════════════════════ Écoutez un extrait ════════════════════════ */

const Extrait: React.FC = () => (
  <section id="extrait" className={`w-full px-[clamp(1.5rem,5vw,5.5rem)] ${PY} scroll-mt-24`} style={{ background: C.cream }}>
    <div className="grid gap-y-10 lg:grid-cols-[0.8fr_1.2fr] gap-x-[clamp(3rem,6vw,6rem)] items-center">
      <Reveal>
        <p className="text-[0.7rem] uppercase tracking-[0.34em]" style={{ color: C.sageInk }}>Écoutez un extrait</p>
        <h2 className="mt-4 v2-serif font-light leading-[1.05] text-[clamp(2rem,4vw,3.2rem)] max-w-[16ch]" style={{ color: C.ink }}>
          Écoutez Krystine avant de commencer.
        </h2>
        <DrawRule className="mt-6 w-20" />
      </Reveal>
      <Reveal delay={0.1} className="min-w-0">
        <p className="mb-3 whitespace-nowrap text-[0.56rem] uppercase tracking-[0.1em] sm:hidden" style={{ color: 'rgba(28,23,18,0.62)' }}>Introduction au programme · 1 min 48</p>
        <div className="[&>div]:static [&>div]:mt-0 [&>div]:px-0">
          <LecteurAudioCours
            url="/vata/extrait-introduction.mp3"
            titre="Introduction au programme"
            soustitre="Krystine St-Laurent"
            pochette="/vata/couvertures/guide.jpg"
            lang="FR"
            variante="creme"
          />
        </div>
      </Reveal>
    </div>
  </section>
);

/* ════════════════════════ Ce que vous recevez ════════════════════════ */

const REPERES: Array<[string, string]> = [
  ['23', 'capsules et méditations · 4 h 12 min d’écoute'],
  ['27', 'documents à télécharger'],
  ['204', 'Le guide complet de 204 pages, offert à la fin du parcours'],
];

// Éventail de couvertures sans titre autour du guide (1er oct. 2026) : la couleur
// des documents, sans remettre leur table des matières.
const FAN_RECU: Array<[string, number, string, string]> = [
  // id, rotation, décalage horizontal (% de la carte), descente
  ['img-006', -17, '-118%', '9%'],
  ['img-012', -11, '-80%', '4%'],
  ['img-029', -5, '-41%', '1%'],
  ['img-041', 5, '41%', '1%'],
  ['img-048', 11, '80%', '4%'],
  ['img-021', 17, '118%', '9%'],
];

const ReceivedFan: React.FC = () => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      className="relative mx-auto w-full max-w-[520px] aspect-[1/0.66] select-none"
      initial={reduce ? false : 'hidden'}
      whileInView="show"
      viewport={{ once: true, amount: 0.35 }}
    >
      {FAN_RECU.map(([id, rot, x, y], i) => (
        <div key={id} className="absolute bottom-[4%] left-1/2 w-[25%] -ml-[12.5%]" style={{ zIndex: 6 - Math.abs(i - 2.5) * 2 }}>
          <motion.div
            className="origin-bottom will-change-transform"
            variants={{
              hidden: { rotate: 0, x: '0%', y: 24, opacity: 0 },
              show: { rotate: rot, x, y, opacity: 1, transition: { duration: APPEAR, ease, delay: 0.1 + Math.abs(i - 2.5) * 0.06 } },
            }}
            style={reduce ? { rotate: rot, x, y } : undefined}
          >
            <Doc id={id} />
          </motion.div>
        </div>
      ))}
      <div className="absolute bottom-[4%] left-1/2 w-[31%] -ml-[15.5%]" style={{ zIndex: 10 }}>
        <motion.div
          className="will-change-transform"
          variants={{ hidden: { y: 24, opacity: 0 }, show: { y: 0, opacity: 1, transition: { duration: APPEAR, ease } } }}
        >
          <Doc id="guide" />
        </motion.div>
      </div>
    </motion.div>
  );
};

const Received: React.FC = () => {
  return (
    <section id="contenu" className={`relative w-full px-[clamp(1.5rem,5vw,5.5rem)] ${PY} scroll-mt-24`} style={{ background: C.cream }}>
      <div className="grid gap-y-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-x-[clamp(3rem,6vw,6rem)] items-center">
        <div>
          <Reveal>
            <p className="text-[0.7rem] uppercase tracking-[0.34em]" style={{ color: C.sageInk }}>Le matériel du programme</p>
            <h2 className="mt-4 v2-serif font-light leading-[1.02] text-[clamp(1.8rem,4.6vw,3.7rem)]" style={{ color: C.ink }}>Ce que vous recevez</h2>
            <DrawRule className="mt-6 w-20" />
          </Reveal>
          <div className="mt-10 border-t" style={{ borderColor: 'rgba(28,23,18,0.16)' }}>
            {REPERES.map(([n, l], i) => (
              <Reveal key={n} delay={i * 0.06}>
                <div className="grid grid-cols-[4.5rem_1fr] sm:grid-cols-[6.5rem_1fr] items-baseline gap-x-5 border-b py-5" style={{ borderColor: 'rgba(28,23,18,0.16)' }}>
                  <span className="v2-serif font-light text-[clamp(2rem,3.4vw,2.8rem)] leading-none tabular-nums" style={{ color: C.sageVif }}>{n}</span>
                  <span className="text-[0.95rem] leading-[1.6]" style={{ color: C.inkSoft }}>{l}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
        <Reveal delay={0.12} className="w-full min-w-0">
          <figure>
            <ReceivedFan />
            <figcaption className="mt-5 text-center whitespace-nowrap text-[0.58rem] sm:text-[0.62rem] uppercase tracking-[0.16em] sm:tracking-[0.24em]" style={{ color: 'rgba(28,23,18,0.62)' }}>
              Le guide complet · 204 pages
            </figcaption>
          </figure>
        </Reveal>
      </div>

      {/* Le mur des 27 couvertures est retiré (Krystine, 30 sept. 2026) : leurs
          titres formaient la table des matières du programme. */}
    </section>
  );
};

/* ════════════════════════ Chapitre IV · Planche tarifs ════════════════════════ */

const Tiers: React.FC = () => (
  <section id="tarifs" className="w-full scroll-mt-24">
    {/* Ouverture de l'offre sur la bande olive; la carte de prix chevauche le bas de la bande. */}
    <div className="w-full px-[clamp(1.5rem,5vw,5.5rem)] pt-[clamp(3.25rem,9vh,7rem)] pb-[clamp(7rem,16vh,10rem)]" style={{ background: OLIVE }}>
    <ChapterHead
      olive
      no="IV"
      kicker="L'offre · VATA Essentiel"
      title="Près de 40 ans, réunis en sept semaines"
      lede="Tout ce que Krystine a appris à relier, la clinique, les plantes et l'Ayurveda, rassemblé en un seul chemin."
      className="mb-[clamp(2.5rem,6vh,4rem)]"
    />
    {/* Ce qu'elle y gagne, avant la liste (Krystine, 30 sept. 2026 : « whats in it for them ») */}
    <div className="mx-auto grid max-w-[1180px] gap-6 md:grid-cols-3">
      {[
        ['Un mental apaisé', 'même lorsque tout s\'accélère autour.'],
        ['Un corps réchauffé et nourri', 'au lieu de crispé et desséché.'],
        ['Des repères qui vous appartiennent', 'à reprendre chaque fois que Vata se réveille.'],
      ].map(([t, d], i) => (
        <Reveal key={t} delay={0.08 * i}>
          <div className="border-t pt-5" style={{ borderColor: C.brassLight }}>
            <p className="v2-serif font-light text-[clamp(1.35rem,2vw,1.7rem)] leading-[1.15]" style={{ color: C.paper }}>{t}</p>
            <p className="mt-2 text-[0.95rem] leading-[1.6]" style={{ color: C.ivory }}>{d}</p>
          </div>
        </Reveal>
      ))}
    </div>
    </div>
    <div className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] pb-[clamp(3.25rem,9vh,7rem)] -mt-[clamp(4.5rem,11vh,6.5rem)]">
    <Reveal>
      <div className="relative mx-auto max-w-[1180px] border" style={{ borderColor: 'rgba(156,122,68,0.45)', background: C.card, boxShadow: '0 30px 60px -30px rgba(28,23,18,0.45)' }}>
        <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: C.sageVif }} aria-hidden />
        <div className="grid">
          {TIERS.map((tier, i) => (
            <article
              key={tier.name}
              className={`grid gap-y-2 p-[clamp(1.75rem,3.5vw,3.25rem)] lg:grid-cols-[0.95fr_1.05fr] lg:gap-x-[clamp(3rem,5vw,5rem)] ${i > 0 ? 'border-t md:border-t-0 md:border-l' : ''}`}
              style={{ borderColor: 'rgba(28,23,18,0.12)', background: tier.recommended ? C.sageTint : 'transparent' }}
            >
              <div className="flex flex-col">
              <div className="min-h-[2rem]">
                {tier.recommended && (
                  <span className="inline-block px-3 py-1.5 text-[0.58rem] uppercase tracking-[0.24em]" style={{ background: C.sage, color: C.card }}>
                    Expérience profonde
                  </span>
                )}
              </div>
              <h3 className="mt-4 v2-serif font-light text-[clamp(1.7rem,2.6vw,2.25rem)] leading-[1.1]" style={{ color: C.ink }}>{tier.name}</h3>
              <p className="mt-3 v2-serif text-[1.05rem] leading-snug" style={{ color: C.sageInk }}>{tier.intro}</p>
              <div className="mt-8 flex items-end gap-3.5">
                <span className="v2-serif font-light text-[clamp(2.8rem,4.4vw,3.8rem)] leading-none tabular-nums" style={{ color: C.ink }}>{enLancement() ? tier.promo : tier.price}</span>
                {enLancement() && <span className="v2-serif text-xl line-through tabular-nums" style={{ color: 'rgba(28,23,18,0.42)' }}>{tier.price}</span>}
              </div>
              {(() => {
                const prix = prixEnVigueur(FORMATION_VATA_ID, parseInt(tier.promo, 10));
                return (
                  <p className="mt-3 text-[0.9rem] leading-snug tabular-nums" style={{ color: C.inkSoft }}>
                    {versementsPermis(prix).includes(3) && <>ou 3 versements de {montantVersement(prix, 3)} $<span aria-hidden="true"> · </span></>}Taxes en sus
                  </p>
                );
              })()}
              <p className="mt-2 text-[0.72rem] uppercase tracking-[0.16em] min-h-[1.1rem]" style={{ color: 'rgba(28,23,18,0.6)' }}>{enLancement() ? 'Une valeur de plus de 1 100 $ · tarif de lancement jusqu’au 1er novembre' : 'Une valeur de plus de 1 100 $'}</p>
              <button
                type="button"
                onClick={go}
                className="group mt-8 inline-flex items-center justify-center gap-2 sm:gap-2.5 w-full px-3 sm:px-4 py-4 min-h-[44px] whitespace-nowrap text-[0.66rem] sm:text-[0.7rem] uppercase tracking-[0.06em] sm:tracking-[0.2em] transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
                style={{ background: C.ink, color: C.cream, outlineColor: C.sage }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.sage; e.currentTarget.style.color = C.card; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = C.ink; e.currentTarget.style.color = C.cream; }}
              >
                Commencer VATA Essentiel
                <ArrowRight size={15} weight="regular" className="transition-transform duration-300 group-hover:translate-x-1" />
              </button>
              <p className="mt-3 text-center text-[0.8rem] leading-snug" style={{ color: C.inkSoft }}>Garantie cœur léger : 15 jours pour changer d'avis, remboursement complet. De 5 à 15 minutes par jour.</p>
              </div>
              <div>
              <DrawRule className="mt-7 w-full lg:mt-0" color="rgba(116,130,74,0.5)" />
              <ul className="mt-7 space-y-3.5">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-[0.92rem] leading-[1.65]" style={{ color: C.inkSoft }}>
                    <Check size={16} weight="bold" className="mt-1 shrink-0" style={{ color: C.sageInk }} />
                    {f}
                  </li>
                ))}
              </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </Reveal>
    </div>
  </section>
);

/* ════════════════════════ Témoignages · le courrier ════════════════════════ */

const Testimonials: React.FC = () => {
  const reduce = useReducedMotion();
  const [lead, ...rest] = TESTIMONIALS;
  return (
    <section className={`w-full px-[clamp(1.5rem,5vw,5.5rem)] ${PY}`} style={{ background: C.panel }}>
      <Reveal className="mb-[clamp(2.5rem,6vh,4rem)]">
        <p className="text-[0.7rem] uppercase tracking-[0.34em]" style={{ color: C.sageInk }}>Elles l'ont vécu</p>
        <h2 className="mt-4 v2-serif font-light leading-[1.02] text-[clamp(1.8rem,4.6vw,3.7rem)]" style={{ color: C.ink }}>
          Témoignages
        </h2>
      </Reveal>

      {/* Témoignage en exergue */}
      <Reveal>
        <figure className="relative border-t pt-[clamp(2rem,4vh,3rem)]" style={{ borderColor: 'rgba(116,130,74,0.45)' }}>
          <span aria-hidden className="pointer-events-none select-none absolute -top-2 left-0 v2-serif leading-none text-[clamp(5rem,9vw,8rem)]" style={{ color: 'rgba(116,130,74,0.18)' }}>
            «
          </span>
          <blockquote className="relative v2-serif font-light leading-[1.4] text-[clamp(1.35rem,2.6vw,2.1rem)] max-w-[52ch] pl-[clamp(2.5rem,5vw,4.5rem)]" style={{ color: C.ink }}>
            {lead.quote}
          </blockquote>
          <figcaption className="mt-6 pl-[clamp(2.5rem,5vw,4.5rem)]">
            <span className="v2-serif text-[1.05rem]" style={{ color: C.sageInk }}>{lead.who}</span>
            <span className="ml-3 text-[0.8rem]" style={{ color: 'rgba(28,23,18,0.6)' }}>{lead.role}</span>
          </figcaption>
        </figure>
      </Reveal>

      <motion.div
        initial={reduce ? false : 'hidden'}
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}
        className="mt-[clamp(2.5rem,6vh,4rem)] grid md:grid-cols-2 gap-x-[clamp(3rem,6vw,6rem)] gap-y-10"
      >
        {rest.map((t, i) => (
          <motion.figure
            key={t.who}
            variants={{ hidden: { opacity: 0, y: 26 }, show: { opacity: 1, y: 0, transition: { duration: APPEAR, ease } } }}
            // Nombre impair de cartes : la dernière prend toute la rangée, sans case vide.
            className={`border-t pt-6 ${rest.length % 2 === 1 && i === rest.length - 1 ? 'md:col-span-2' : ''}`}
            style={{ borderColor: 'rgba(28,23,18,0.16)' }}
          >
            <blockquote className="v2-serif font-light text-[1.1rem] leading-[1.55]" style={{ color: C.inkSoft }}>
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
  // La biographie de l'accueil, mot pour mot (Krystine, 30 sept. 2026), avec
  // sa photo, puis la Trilogie d'Origine.
  <section className={`w-full px-[clamp(1.5rem,5vw,5.5rem)] ${PY}`}>
    <div className="grid gap-y-10 lg:grid-cols-[1.1fr_0.9fr] gap-x-[clamp(3rem,7vw,7rem)] items-center">
      <Reveal>
        <p className="text-[0.7rem] uppercase tracking-[0.34em]" style={{ color: C.brassInk }}>Qui vous guide</p>
        <h2 className="mt-4 v2-serif font-light leading-[1.02] text-[clamp(2.4rem,4.6vw,3.8rem)]" style={{ color: C.ink }}>
          Krystine <span className="whitespace-nowrap">St‑Laurent</span>
        </h2>
        <p className="mt-4 v2-serif text-[clamp(1.1rem,1.9vw,1.4rem)] leading-snug max-w-[34ch]" style={{ color: C.inkSoft }}>Près de 40 ans à relier ce que nous avons appris à séparer.</p>
        <DrawRule className="mt-6 w-20" color={C.brass} />
        <div className="mt-6 space-y-5 text-[1rem] leading-[1.9] max-w-[56ch]" style={{ color: C.inkSoft }}>
          <p>Pendant des années, Krystine a œuvré en soins intensifs et en recherche clinique, dans les coulisses du système, avant de choisir l'Ayurveda, les plantes médicinales et l'aromathérapie. Depuis, elle relie la rigueur de la science à la sagesse de la nature, pour que chaque personne apprenne à écouter son propre corps.</p>
          <p>Autrice de la Trilogie d'Origine, près de 1 200 pages dont deux best-sellers, elle a créé l'émission Santé la vie et le podcast Au-delà des tendances.</p>
          <p>Dans Vata, c'est elle qui vous guide, capsule après capsule.</p>
        </div>
        <a href="/medias" className="mt-8 flex items-center gap-5 group" aria-label="La Trilogie d'Origine, aux Éditions de l'Homme">
          <img src="/accueil/assets/trilogy-books.png" alt="La Trilogie d'Origine : Nature & Ayurveda, Féminité & Ayurveda et le tome 3 à paraître" loading="lazy" className="h-auto w-[clamp(9rem,18vw,13rem)] transition-transform duration-500 group-hover:-translate-y-1" />
          <span>
            <span className="block text-[0.62rem] uppercase tracking-[0.26em]" style={{ color: C.brassInk }}>La Trilogie d'Origine</span>
            <span className="mt-1 block text-[0.72rem] uppercase tracking-[0.14em]" style={{ color: C.inkSoft }}>Publiée aux Éditions de l'Homme · découvrir les livres</span>
          </span>
        </a>
      </Reveal>
      <Reveal delay={0.1}>
        <figure className="border p-2" style={{ borderColor: 'rgba(156,122,68,0.45)', background: C.card }}>
          <img src="https://wsrv.nl/?url=storage.googleapis.com/origine1/krystine%20red%20NG.webp&w=1000&output=webp" alt="Krystine St-Laurent" loading="lazy" referrerPolicy="no-referrer" className="block w-full aspect-[4/5] object-cover object-top" />
          <figcaption className="mt-2 text-right text-[0.62rem] uppercase tracking-[0.26em]" style={{ color: C.brassInk }}>Krystine St-Laurent</figcaption>
        </figure>
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
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1, transition: { duration: 0.45, ease } }}
          exit={{ height: 0, opacity: 0, transition: { duration: 0.25, ease } }}
          className="overflow-hidden"
        >
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
    <section id="faq" className={`w-full px-[clamp(1.5rem,5vw,5.5rem)] ${PY} scroll-mt-24`} style={{ background: C.panel }}>
      <ChapterHead no="V" kicker="Vos questions" title="Questions fréquentes" className="mb-[clamp(2.5rem,6vh,4rem)]" />
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
  <section className="relative w-full overflow-hidden" style={{ background: 'linear-gradient(160deg, #3d4033 0%, #4a4d3c 55%, #5a5d47 100%)' }}>
    <span className="absolute inset-x-0 top-0 h-px z-10" style={{ background: C.sage }} aria-hidden />
    <Atmosphere light="50% 8%" strength={0.35} />
    <div className="relative px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(3.75rem,11vh,9rem)] text-center">
      <Reveal>
        <p className="flex items-center justify-center gap-3 text-[0.7rem] uppercase tracking-[0.34em]" style={{ color: '#c6cf9b' }}>
          <Wind size={15} weight="light" aria-hidden /> VATA Essentiel · Un sens à la fois
        </p>
        <h2 className="mt-7 mx-auto v2-serif font-light leading-[1.08] text-[clamp(2.2rem,5vw,3.9rem)] max-w-[22ch]" style={{ color: C.cream }}>
          Prête à apaiser le mental ?
        </h2>
        <p className="mt-7 mx-auto v2-serif text-[clamp(1.1rem,2vw,1.5rem)] leading-snug max-w-[40ch]" style={{ color: 'rgba(244,239,230,0.75)' }}>
          « Le calme se cultive pendant que le vent souffle. »
        </p>
        <div className="mt-11 flex flex-wrap items-center justify-center gap-x-9 gap-y-5">
          <button
            type="button"
            onClick={go}
            className="group inline-flex items-center gap-2 sm:gap-2.5 px-5 sm:px-9 py-4 min-h-[44px] whitespace-nowrap text-[0.68rem] sm:text-[0.72rem] uppercase tracking-[0.08em] sm:tracking-[0.2em] transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
            style={{ background: C.cream, color: C.dark, outlineColor: C.sage }}
            onMouseEnter={(e) => { e.currentTarget.style.background = C.sage; e.currentTarget.style.color = C.card; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = C.cream; e.currentTarget.style.color = C.dark; }}
          >
            Commencer VATA Essentiel
            <ArrowRight size={15} weight="regular" className="transition-transform duration-300 group-hover:translate-x-1" />
          </button>
          <a
            href="#tarifs"
            className="v2-serif text-lg transition-colors duration-300 hover:opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
            style={{ color: 'rgba(244,239,230,0.8)', outlineColor: C.sage }}
          >
            Revoir le programme et son tarif
          </a>
        </div>
        <p className="mt-10 text-[0.62rem] uppercase tracking-[0.26em]" style={{ color: 'rgba(244,239,230,0.5)' }}>
          Programme autonome · accès immédiat
        </p>
      </Reveal>
    </div>
  </section>
);

/* ════════════════════════ Barre d'achat mobile ════════════════════════ */
// Fixe en bas de l'écran sur mobile, après le premier écran; la page garde
// un espace en bas de la même hauteur pour que rien ne soit caché.
const BarreAchat: React.FC = () => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const maj = () => setVisible(window.scrollY > window.innerHeight * 0.85);
    maj();
    window.addEventListener('scroll', maj, { passive: true });
    return () => window.removeEventListener('scroll', maj);
  }, []);
  return (
    <>
    {/* L'espace sous tout le contenu, pied de page compris, pour que la barre ne cache rien. */}
    <style>{'@media (max-width: 767px) { body { padding-bottom: 84px; } }'}</style>
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-50 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden transition-transform duration-500 ${visible ? 'translate-y-0' : 'translate-y-full'}`}
      style={{ background: C.cream, borderColor: hairline, transitionTimingFunction: 'cubic-bezier(.16,.8,.24,1)' }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="v2-serif text-[1.35rem] leading-none tabular-nums" style={{ color: C.ink }}>{prixVata()} $</p>
          <p className="mt-1 text-[0.58rem] uppercase tracking-[0.16em]" style={{ color: 'rgba(28,23,18,0.6)' }}>VATA Essentiel · taxes en sus</p>
        </div>
        <button
          type="button"
          onClick={go}
          tabIndex={visible ? 0 : -1}
          className="inline-flex min-h-[48px] shrink-0 items-center gap-2 px-5 text-[0.64rem] uppercase tracking-[0.14em]"
          style={{ background: C.ink, color: C.cream }}
        >
          Commencer
          <ArrowRight size={14} weight="regular" />
        </button>
      </div>
    </div>
    </>
  );
};

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
      .v2-cue { animation: v2cue 2.4s cubic-bezier(.16,.8,.24,1) 3; }
      .v2-medal { transition: transform .6s cubic-bezier(.16,.8,.24,1); }
      @media (hover: hover) and (pointer: fine) { .v2-medal:hover { transform: scale(1.09) rotate(-4deg); } }
      @media (prefers-reduced-motion: reduce) { .v2-cue { animation: none; } .v2-medal:hover { transform: none; } }
    `}</style>

    <div className="v2-grain" aria-hidden />

    <Cover />
    <Exergue>« Nous avons le pouvoir sur nos turbulences. »</Exergue>
    <Ella />
        <Signals />
    <Method />
    <Exergue>« Une journée n’est pas une suite de cases ; c’est un rythme entier à préserver. »</Exergue>
    <Extrait />
    <Journey />
    <Received />
    <Tiers />
    <Testimonials />
    <Bio />
    <Faq />
    <BackCover />
    <BarreAchat />
  </div>
);

export default VataExperience;
