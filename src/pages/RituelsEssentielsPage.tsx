import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, CaretDown, FlowerLotus, Heartbeat, Wind, HandPalm, Compass } from '@phosphor-icons/react';
import { getProducts, type ShopifyProduct } from '../shopify';
import { cheminPaiement } from '../lib/cheminCours';

/**
 * Rituels essentiels : la page de vente de la petite offre d'entrée (27 $),
 * rapatriée de l'ancienne page krystinestlaurent.com/RITUELSVIVANTS, renommée Rituels essentiels le 6 oct. 2026
 * (Krystine, 4 oct. 2026). Les mots sont ceux de Krystine; seuls les mots
 * proscrits et le possessif du corps ont été ajustés.
 *
 * Page sœur de /vata (VataExperience.tsx, 5 oct. 2026 : « on dirait que je
 * m'ennuie de Vata et de ses beaux visuels ») : même revue crème Fraunces +
 * Inter, mêmes chapitres à chiffres romains, même parcours à colonne
 * vertébrale, même planche tarif chevauchant une bande sombre, même FAQ et
 * même barre d'achat mobile. L'accent de la page est le cuivre #BA7B39 et
 * le doré #7d6330 du site, et la bande sombre le vert profond du V2.
 * L'achat passe par la page de paiement commune (/paiement/rituels-vivants, l’identifiant reste celui de la première édition).
 */

const ID = 'rituels-vivants';
const PAIEMENT = cheminPaiement(ID);
const CTA = 'J’accède aux Rituels essentiels (27 $)';

const ease = [0.16, 0.8, 0.24, 1] as const;
const APPEAR = 1.1;

const C = {
  cream: '#f4efe6',
  panel: '#efe6d7',
  card: '#faf6ee',
  ink: '#1c1712',
  inkSoft: '#3a2f23',
  brass: '#9c7a44',
  brassInk: '#7d6330',
  // L'accent de la page : le cuivre et le doré du site (Krystine, 5 oct. 2026 :
  // le rouge de l'ancienne page, « psychologiquement, c'est un frein »).
  accent: '#BA7B39',
  accentInk: '#7d6330',
  paper: '#F7F3EA',
  ivory: '#EEE7DB',
  cuivre: '#BA7B39',
  brassLight: '#d9a05b',
};
// La bande sombre : le vert profond du langage V2 (jamais de brun).
const VERT = 'linear-gradient(165deg, #1f2a25 0%, #28352F 55%, #33433b 100%)';
const hairline = 'rgba(28,23,18,0.14)';

/* Le gras des mots clés (Krystine, 6 oct. 2026) : 600, couleur d'encre, jamais d'italique. */
const B: React.FC<{ children: React.ReactNode; clair?: boolean }> = ({ children, clair }) => (
  <strong style={{ fontWeight: 600, color: clair ? C.paper : C.ink }}>{children}</strong>
);
const PY = 'py-[clamp(3.25rem,9vh,7rem)]';
const GX = 'px-[clamp(1.5rem,5vw,5.5rem)]';

/* ════════════════════════ Contenu (mots de Krystine) ════════════════════════ */

// Les 10 capsules et le bonus, dans l'ordre et avec la durée réelle des vidéos
// (formations/rituels-vivants/lecons, dureeSecondes).
// Les images sont des arrêts sur image des vraies capsules (public/rituels-vivants/).
const MODULES: { etiquette: string; nom: string; capsules: [string, number][]; image?: string }[] = [
  { etiquette: 'Module 1', nom: 'Capsules d’introduction à l’Ayurveda', capsules: [
    ['Capsule d’introduction à l’Ayurveda, partie 1', 587],
    ['Capsule d’introduction à l’Ayurveda, partie 2', 854],
    ['Capsule d’introduction à l’Ayurveda, partie 3', 806],
  ] },
  { etiquette: 'Module 2', nom: 'Capsules d’introduction à l’automassage', capsules: [
    ['Capsule d’introduction à l’automassage, partie 1', 880],
    ['Capsule d’introduction à l’automassage, partie 2', 316],
    ['Capsule d’introduction à l’automassage, partie 3', 267],
    ['Capsule d’introduction à l’automassage, partie 4', 200],
  ], image: '/rituels-vivants/automassage-bras.webp' },
  { etiquette: 'Module 3', nom: 'Capsules d’introduction aux soins du nez et de la bouche', capsules: [
    ['Capsule d’introduction aux soins du nez', 681],
    ['Capsule d’introduction aux soins de la bouche', 950],
  ], image: '/rituels-vivants/soin-du-nez.webp' },
  { etiquette: 'Module 4', nom: 'Capsule d’introduction aux soins des mains et des pieds', capsules: [
    ['Capsule d’introduction aux soins des mains et des pieds', 166],
  ], image: '/rituels-vivants/mains.webp' },
  { etiquette: 'Bonus', nom: 'Envie d’aller plus loin ?', capsules: [
    ['Plantes, stress et sagesse : une invitation concrète', 157],
  ] },
];

const duree = (s: number) => `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')}`;
const TOTAL = MODULES.reduce((t, m) => t + m.capsules.reduce((u, [, s]) => u + s, 0), 0);
const totalLisible = `${Math.floor(TOTAL / 3600)} h ${String(Math.round((TOTAL % 3600) / 60)).padStart(2, '0')}`;

const BIENFAITS: [React.ReactNode, React.ComponentType<{ size?: number; weight?: any }>][] = [
  [<>Apaiser le <B>système nerveux</B></>, Heartbeat],
  [<><B>Respirer mieux</B> et clarifier vos pensées</>, Wind],
  [<><B>Libérer les tensions</B> accumulées dans les mains et les pieds</>, HandPalm],
  [<>Retrouver un <B>cap clair</B> grâce à une sagesse ancienne, rendue simple aujourd’hui</>, Compass],
];

const POUR_VOUS: React.ReactNode[] = [
  <>Vous sentez <B>l’appel de ralentir</B>, mais vos journées filent sans pause.</>,
  <>Vous avez essayé tant de solutions… sans jamais trouver <B>celle qui s’installe vraiment</B>.</>,
  <>Et si ce qu’il vous manquait n’était pas un autre programme, mais <B>un fil authentique pour revenir à vous</B>?</>,
];

const TEMOIGNAGES: [string, string][] = [
  ['J’ai retrouvé une forme de calme que je n’avais plus senti depuis longtemps.', 'Élise'],
  ['J’ai enfin compris que prendre soin de moi pouvait ne pas être compliqué!', 'Marie-Anne'],
];

const QUESTIONS: [string, React.ReactNode][] = [
  ['Quand ai-je accès aux capsules ?', <><B>L’accès est immédiat.</B> Dès le paiement confirmé, les 10 capsules et le bonus vous attendent dans votre espace, sur le site, à regarder à votre rythme.</>],
  ['Sous quelle forme sont les capsules ?', <>Ce sont des <B>vidéos</B>, à regarder dans votre espace sur le site, à l’ordinateur, sur tablette ou sur téléphone. Le <B>guide de 14 pages</B> se télécharge en PDF.</>],
  ['Combien de temps demandent les capsules ?', <>Les 10 capsules et le bonus totalisent {totalLisible} de vidéo, de 2 à 16 minutes chacune. Les pratiques elles-mêmes tiennent en <B>moins de 5 minutes par jour</B>.</>],
  ['Faut-il déjà connaître l’Ayurveda ?', <>Les trois premières capsules sont une <B>introduction concrète et simple</B> à l’Ayurveda (la médecine traditionnelle de l’Inde) : elles accueillent aussi celles qui la découvrent.</>],
  ['Comment se fait le paiement ?', <><B>Un seul paiement de 27 $</B>, par carte, sur le formulaire sécurisé du site. Si vous n’avez pas encore de compte, il se crée avec l’adresse courriel du paiement.</>],
  ['À qui écrire pour une question ?', 'Notre équipe est là pour vous : écrivez-nous à teamksl@inspiratanature.com.'],
];

// Les soins INSPIRATA AYURVEDA qui prolongent les capsules (catalogue Shopify).
const SOINS: { handle: string; capsule: string; nom: string }[] = [
  { handle: 'huile-corporelle-apaisante-vata-3', capsule: 'Automassage', nom: 'L’Apaisante Vata (Vent et Espace)' },
  { handle: 'huile-nasale-nez-zen', capsule: 'Soin du nez', nom: 'Nez ZEN' },
  { handle: 'gratte-langue-cuivre', capsule: 'Soin de la bouche', nom: 'Gratte-langue en cuivre' },
];

// Le guide PDF, inclus avec l'achat (leçon protégée formations/rituels-vivants/lecons/012).
const GUIDE = <><B>Le guide des Rituels essentiels</B>, à télécharger (<B>14 pages</B>)</>;
const NOTE_GUIDE = 'Tiré du premier tome de Krystine St-Laurent, Nature & Ayurveda.';

const DOSHAS: [string, string, string][] = [
  ['vata', 'Vata', 'Vent et Espace'],
  ['pitta', 'Pitta', 'Feu et Eau'],
  ['kapha', 'Kapha', 'Eau et Terre'],
];

const img = (n: string) => `/rituels-vivants/${n}.webp`;


/* ════════════════════════ Primitives (calquées sur /vata) ════════════════════════ */

const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string; y?: number }> = ({ children, delay = 0, className, y = 28 }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} initial={reduce ? { opacity: 1 } : { opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }} transition={{ duration: APPEAR, ease, delay }}>
      {children}
    </motion.div>
  );
};

const MaskLine: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => {
  const reduce = useReducedMotion();
  return (
    <span className="block overflow-hidden pb-[0.06em]">
      <motion.span className="block will-change-transform" initial={reduce ? false : { y: '112%' }} animate={{ y: 0 }} transition={{ duration: 1.15, ease, delay }}>
        {children}
      </motion.span>
    </span>
  );
};

const DrawRule: React.FC<{ className?: string; color?: string; delay?: number }> = ({ className = '', color = C.accent, delay = 0.1 }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div aria-hidden className={`h-px origin-left ${className}`} style={{ background: color }} initial={reduce ? false : { scaleX: 0 }}
      whileInView={{ scaleX: 1 }} viewport={{ once: true, amount: 0.7 }} transition={{ duration: 1.2, ease, delay }} />
  );
};

const ChapterHead: React.FC<{ no: string; kicker: string; title: string; lede?: string; className?: string; sombre?: boolean }> = ({ no, kicker, title, lede, className = '', sombre }) => (
  <Reveal className={className}>
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:gap-[clamp(1.25rem,2.5vw,2.25rem)]">
      {/* Les chiffres romains des chapitres sont retirés : ils mélangeaient la lectrice (Krystine, 6 oct. 2026). */}
      <div className="min-w-0" data-chapitre={no}>
        <p className="text-[0.7rem] uppercase tracking-[0.34em]" style={{ color: sombre ? C.ivory : C.accentInk }}>{kicker}</p>
        <h2 className="mt-4 v2-serif font-light leading-[1.02] text-[clamp(1.8rem,4.6vw,3.7rem)]" style={{ color: sombre ? C.paper : C.ink }}>{title}</h2>
        {lede && <p className="mt-5 v2-serif text-[clamp(1.1rem,1.9vw,1.45rem)] leading-snug max-w-[46ch]" style={{ color: sombre ? C.ivory : C.inkSoft }}>{lede}</p>}
        <DrawRule className="mt-6 w-20" color={sombre ? C.brassLight : C.accent} />
      </div>
    </div>
  </Reveal>
);

const Medallion: React.FC<{ Icon: React.ComponentType<{ size?: number; weight?: any }>; size?: number }> = ({ Icon, size = 52 }) => {
  const reduce = useReducedMotion();
  return (
    <motion.span className="inline-block shrink-0" style={{ width: size, height: size }} initial={reduce ? false : { opacity: 0 }}
      whileInView={{ opacity: 1 }} viewport={{ once: true, amount: 0.6 }} transition={{ duration: APPEAR, ease }}>
      <span className="v2-medal grid h-full w-full place-items-center rounded-full" style={{ background: C.accent, color: C.card }}>
        <Icon size={Math.round(size * 0.44)} weight="light" />
      </span>
    </motion.span>
  );
};

const Exergue: React.FC<{ children: string; gras?: number }> = ({ children, gras = 0 }) => {
  const reduce = useReducedMotion();
  const words = children.split(' ');
  return (
    <section className={`w-full ${GX} py-[clamp(4.5rem,10vh,7.5rem)]`}>
      <DrawRule className="w-full" color="rgba(186,123,57,0.35)" />
      <motion.blockquote className="mx-auto max-w-[34ch] py-[clamp(3rem,6vh,4.5rem)] text-center v2-serif font-light leading-[1.3] text-[clamp(1.6rem,3.4vw,2.7rem)]"
        style={{ color: C.inkSoft }} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.6 }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : 0.06 } } }}>
        {words.map((w, i) => (
          <React.Fragment key={i}>
            <motion.span className="inline-block will-change-transform"
              variants={{ hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: APPEAR, ease } } }}>
              {i < gras ? <strong style={{ fontWeight: 600, color: C.ink }}>{w}</strong> : w}
            </motion.span>
            {i < words.length - 1 ? ' ' : ''}
          </React.Fragment>
        ))}
      </motion.blockquote>
      <DrawRule className="w-full" color="rgba(186,123,57,0.35)" />
    </section>
  );
};

/* Le bouton noir carré de /vata, en lien vers le paiement */
const BoutonAchat: React.FC<{ children: React.ReactNode; className?: string; clair?: boolean }> = ({ children, className = '', clair }) => (
  <Link to={PAIEMENT}
    className={`group inline-flex min-h-[48px] items-center justify-center gap-2.5 whitespace-nowrap px-5 py-4 text-[0.64rem] uppercase tracking-[0.08em] sm:px-8 sm:text-[0.72rem] sm:tracking-[0.18em] transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 ${clair ? 'bg-[#f4efe6] text-[#1c1712]' : 'bg-[#1c1712] text-[#f4efe6]'} hover:bg-[#9c7a44] hover:text-[#faf6ee] ${className}`}
    style={{ outlineColor: C.accent }}>
    {children}
    <ArrowRight size={15} weight="regular" className="shrink-0 transition-transform duration-300 group-hover:translate-x-1" />
  </Link>
);

/* Un arrêt sur image posé comme une photo sur la table */
const Still: React.FC<{ src: string; className?: string; eager?: boolean }> = ({ src, className = '', eager }) => (
  <img src={src} alt="" width={576} height={720} loading={eager ? 'eager' : 'lazy'} decoding="async"
    className={`block w-full h-auto aspect-[4/5] object-cover rounded-[4px] border ${className}`}
    style={{ borderColor: 'rgba(28,23,18,0.1)', boxShadow: '0 22px 44px -22px rgba(28,23,18,0.5), 0 2px 6px rgba(28,23,18,0.08)' }} />
);

/* ════════════════════════ Couverture : l'extrait vidéo au centre de l'éventail ════════════════════════ */

const FAN: Array<[string, number, string, number]> = [
  ['automassage-oreilles', -13, '-50%', 1],
  ['soin-du-nez', -6.5, '-25%', 2],
  ['soin-de-la-bouche', 6.5, '25%', 2],
  ['mains', 13, '50%', 1],
];

const VideoFan: React.FC = () => {
  const reduce = useReducedMotion();
  // React ne pose pas l'attribut muted : sans lui, les téléphones refusent la lecture automatique.
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = video.current;
    if (!v || reduce) return;
    v.muted = true;
    v.play().catch(() => {});
  }, [reduce]);
  return (
    <figure className="min-w-0">
      <div className="relative mx-auto w-[min(84vw,380px)] lg:w-full aspect-[1/0.86] select-none">
        {FAN.map(([id, rot, x, z], i) => (
          <div key={id} aria-hidden className="absolute bottom-[3%] left-1/2 w-[38%] -ml-[19%]" style={{ zIndex: z }}>
            <motion.div className="origin-bottom will-change-transform" initial={reduce ? false : { rotate: 0, x: '0%', y: 30, opacity: 0 }}
              animate={{ rotate: rot, x, y: z === 1 ? '5%' : '1.5%', opacity: 1 }} transition={{ duration: 1.2, ease, delay: 0.35 + i * 0.08 }}>
              <Still src={img(id)} eager />
            </motion.div>
          </div>
        ))}
        <div className="absolute bottom-[3%] left-1/2 w-[46%] -ml-[23%]" style={{ zIndex: 3 }}>
          <motion.div className="will-change-transform" initial={reduce ? false : { y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 1.2, ease, delay: 0.3 }}>
            <video ref={video} src="/rituels-vivants/extrait-krystine-parle.mp4" poster="/rituels-vivants/extrait-krystine-parle-poster.webp"
              autoPlay={!reduce} muted loop playsInline preload="auto" aria-label="Krystine présente les Rituels essentiels"
              className="block w-full aspect-[4/5] object-cover rounded-[4px] border"
              style={{ borderColor: 'rgba(28,23,18,0.1)', boxShadow: '0 30px 60px -26px rgba(28,23,18,0.6), 0 2px 6px rgba(28,23,18,0.08)' }} />
            <span aria-hidden className="absolute inset-x-0 -bottom-[10px] mx-auto block h-[2px] w-12" style={{ background: C.accent }} />
          </motion.div>
        </div>
      </div>
      <figcaption className="mt-7 text-center text-[0.58rem] sm:text-[0.62rem] uppercase tracking-[0.16em] sm:tracking-[0.24em]" style={{ color: 'rgba(28,23,18,0.62)' }}>
        Les gestes, pas à pas
      </figcaption>
    </figure>
  );
};

const Cover: React.FC = () => (
  <header className={`relative w-full min-h-screen flex flex-col ${GX} pt-[clamp(6.5rem,12vh,9rem)] pb-[clamp(1.5rem,4vh,3rem)]`}>
    <div className="relative flex-1 grid items-center gap-y-12 gap-x-[clamp(2rem,4vw,4rem)] py-[clamp(2.5rem,6vh,4.5rem)] lg:grid-cols-[minmax(0,1fr)_clamp(300px,38vw,580px)]">
      <div className="relative min-w-0">
        <p className="mb-4 text-[0.66rem] font-semibold uppercase tracking-[0.3em]" style={{ color: C.accentInk }}>Inspirés de l’Ayurveda</p>
        <div className="flex items-center gap-5 mb-8">
          <Medallion Icon={FlowerLotus} size={46} />
          <p className="text-[0.62rem] sm:text-[0.7rem] uppercase tracking-[0.14em] sm:tracking-[0.34em]" style={{ color: C.accentInk }}>10 capsules vidéo + 1 bonus <span className="whitespace-nowrap">· {totalLisible}</span></p>
        </div>
        <h1 className="v2-serif font-light leading-[0.92] text-[clamp(3rem,6.8vw,6.2rem)]" style={{ color: C.ink }}>
          <MaskLine delay={0.05}>Rituels</MaskLine>
          <MaskLine delay={0.16}>essentiels</MaskLine>
        </h1>
        <span aria-hidden className="mt-6 block h-[2px] w-16" style={{ background: C.accent }} />
        <Reveal delay={0.42} y={20} className="mt-8">
          <p className="v2-serif text-[clamp(1.2rem,2.2vw,1.7rem)] leading-[1.35] max-w-[36ch]" style={{ color: C.inkSoft }}>
            Quand vos sens sont surchargés : des <B>pratiques courtes</B> qui redonnent <B>ancrage et direction</B>
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-x-9 gap-y-4">
            <BoutonAchat>{CTA}</BoutonAchat>
            <a href="#capsules" className="v2-serif text-lg transition-opacity duration-300 hover:opacity-70" style={{ color: 'rgba(28,23,18,0.7)' }}>Voir les capsules</a>
          </div>
        </Reveal>
        <Reveal delay={0.55} y={16} className="mt-9">
          <ul className="space-y-2.5">
            {['27 $ · Accès immédiat', 'Moins de 5 minutes par jour', 'Pour tous les profils'].map((m) => (
              <li key={m} className="flex items-center gap-3 text-[0.66rem] uppercase tracking-[0.2em]" style={{ color: 'rgba(28,23,18,0.62)' }}>
                <span className="h-1 w-1 rounded-full shrink-0" style={{ background: C.accent }} />{m}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
      <VideoFan />
    </div>
  </header>
);

/* ════════════════════════ Bande vert profond + les trois doshas ════════════════════════ */

const Bande: React.FC = () => (
  <section className={`relative w-full ${GX} ${PY}`} style={{ background: VERT }}>
    <Reveal>
      <div className="mx-auto max-w-[760px]">
        <DrawRule className="mb-8 w-20" color={C.accent} />
        <p className="v2-serif text-[clamp(1.2rem,2vw,1.55rem)] leading-[1.55]" style={{ color: C.paper }}>
          Une <B clair>introduction concrète, simple</B>, dans le monde des rituels ancestraux prisés pour réduire la turbulence et déposer <B clair>les bases d’un équilibre</B>. Quand le chaos extérieur devient trop vif et stressant.
        </p>
      </div>
    </Reveal>
  </section>
);

const Doshas: React.FC = () => (
  <section className={`w-full ${GX} ${PY}`}>
    <Reveal className="grid items-center gap-x-[clamp(2rem,5vw,5rem)] gap-y-10 lg:grid-cols-[1fr_1.1fr]">
      <p className="v2-serif font-light text-[clamp(1.35rem,2.3vw,1.95rem)] leading-[1.35] max-w-[30ch]" style={{ color: C.ink }}>
        Ces gestes accompagnent <B>les trois doshas</B> (les trois grandes énergies du corps selon l’Ayurveda), quel que soit celui qui domine en ce moment.
      </p>
      <div className="grid grid-cols-3 gap-4 sm:gap-8">
        {DOSHAS.map(([cle, nom, elements]) => (
          <div key={cle} className="flex flex-col items-center text-center">
            <img src={`/quiz/pictos/${cle}.png`} alt="" aria-hidden className="h-[clamp(5.5rem,11vw,8.5rem)] w-auto object-contain" loading="lazy" />
            <p className="mt-4 v2-serif font-light text-[clamp(1.1rem,1.8vw,1.45rem)]" style={{ color: C.ink }}>{nom}</p>
            <p className="mt-1 text-[0.6rem] uppercase tracking-[0.2em]" style={{ color: C.brassInk }}>{elements}</p>
          </div>
        ))}
      </div>
    </Reveal>
  </section>
);

/* ════════════════════════ I · Pour qui ════════════════════════ */

const PourQui: React.FC = () => (
  <section id="pour-qui" className={`relative w-full ${GX} ${PY} scroll-mt-24`} style={{ background: C.panel }}>
    <span className="absolute inset-x-0 top-0 h-px" style={{ background: 'rgba(186,123,57,0.35)' }} aria-hidden />
    <div className="grid gap-y-12 lg:grid-cols-[0.85fr_1.15fr] gap-x-[clamp(3rem,6vw,6rem)] items-start">
      <div className="lg:sticky lg:top-28">
        <ChapterHead no="I" kicker="Pour qui" title="Cet espace est pour vous si…" />
      </div>
      <ol className="border-t" style={{ borderColor: hairline }}>
        {POUR_VOUS.map((p, i) => (
          <Reveal key={i} delay={i * 0.06}>
            <li className="grid grid-cols-[3rem_1fr] md:grid-cols-[4rem_1fr] gap-x-6 items-baseline border-b py-8" style={{ borderColor: hairline }}>
              <span aria-hidden className="v2-serif font-light text-[clamp(1.9rem,3vw,2.6rem)] leading-none tabular-nums" style={{ color: C.accent }}>{String(i + 1).padStart(2, '0')}</span>
              <p className="v2-serif font-light text-[clamp(1.25rem,1.9vw,1.6rem)] leading-[1.4]" style={{ color: C.ink }}>{p}</p>
            </li>
          </Reveal>
        ))}
      </ol>
    </div>
  </section>
);

/* ════════════════════════ II · Les pratiques ════════════════════════ */

const Pratiques: React.FC = () => (
  <section id="pratiques" className={`relative w-full ${GX} ${PY} scroll-mt-24`}>
    <ChapterHead no="II" kicker="Les pratiques" title="En moins de 5 minutes par jour" lede="Ces pratiques express vous aident à :" className="mb-[clamp(3rem,7vh,5rem)]" />
    <div className="border-t" style={{ borderColor: 'rgba(28,23,18,0.16)' }}>
      {BIENFAITS.map(([t, Icon], i) => (
        <Reveal key={i} delay={i * 0.06}>
          <article className="grid grid-cols-[auto_1fr] md:grid-cols-[clamp(9.5rem,12vw,11rem)_1fr] gap-x-[clamp(1.5rem,4.5vw,4.5rem)] items-center py-[clamp(1.75rem,4vh,2.75rem)] border-b" style={{ borderColor: 'rgba(28,23,18,0.16)' }}>
            <div className="flex items-center gap-5">
              <Medallion Icon={Icon} />
              <span aria-hidden className="hidden md:inline v2-serif font-light text-[clamp(2.4rem,4vw,3.4rem)] leading-none tabular-nums" style={{ color: C.accent }}>{String(i + 1).padStart(2, '0')}</span>
            </div>
            <h3 className="v2-serif font-light text-[clamp(1.35rem,2.4vw,2rem)] leading-[1.2] max-w-[34ch]" style={{ color: C.ink }}>{t}</h3>
          </article>
        </Reveal>
      ))}
    </div>
  </section>
);

/* ════════════════════════ III · Les capsules, sur la colonne vertébrale ════════════════════════ */

const Capsules: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.78', 'end 0.55'] });
  return (
    <section id="capsules" className={`relative w-full ${GX} ${PY} scroll-mt-24`} style={{ background: C.panel }}>
      <span className="absolute inset-x-0 top-0 h-px" style={{ background: 'rgba(186,123,57,0.35)' }} aria-hidden />
      <ChapterHead no="III" kicker="Ce que vous recevez" title="10 capsules et 1 bonus" lede={`${totalLisible} de vidéo au total, à votre rythme`} className="mb-[clamp(3.5rem,8vh,5.5rem)]" />
      <div ref={ref} className="relative">
        <div className="pointer-events-none absolute top-1 bottom-1 left-[6px] lg:left-1/2 w-px -translate-x-1/2" style={{ background: 'rgba(186,123,57,0.2)' }} aria-hidden />
        <motion.div className="pointer-events-none absolute top-1 bottom-1 left-[6px] lg:left-1/2 w-px -translate-x-1/2 origin-top"
          style={reduce ? { background: C.accent } : { background: C.accent, scaleY: scrollYProgress }} aria-hidden />
        {MODULES.map((m, i) => {
          const gauche = i % 2 === 0;
          return (
            <div key={m.nom} className="relative grid lg:grid-cols-2 gap-x-[clamp(4rem,8vw,8rem)]">
              <span className="absolute left-[6px] lg:left-1/2 top-[2.9rem] h-2.5 w-2.5 -translate-x-1/2 rounded-full" style={{ background: C.accent, boxShadow: `0 0 0 5px ${C.panel}` }} aria-hidden />
              <Reveal y={26} className={`pl-9 lg:pl-0 py-[clamp(1.75rem,4vh,2.75rem)] ${gauche ? 'lg:col-start-1' : 'lg:col-start-2'}`}>
                <div className={`flex items-start gap-[clamp(1.1rem,2.2vw,2rem)] ${gauche ? 'lg:flex-row-reverse' : ''}`}>
                  {m.image && <div className="w-[clamp(78px,20vw,96px)] lg:w-[clamp(110px,9.5vw,140px)] shrink-0"><Still src={m.image} /></div>}
                  <div className="min-w-0 flex-1">
                    <div className={`flex items-baseline gap-4 ${gauche ? 'lg:justify-end' : ''}`}>
                      <span aria-hidden className="v2-serif font-light text-[clamp(1.9rem,3.2vw,2.8rem)] leading-none tabular-nums" style={{ color: C.accent }}>{String(i + 1).padStart(2, '0')}</span>
                      <span className="text-[0.62rem] uppercase tracking-[0.26em]" style={{ color: C.accentInk }}>{m.etiquette}</span>
                    </div>
                    <h3 className={`mt-2.5 v2-serif font-light leading-[1.12] text-[clamp(1.4rem,2.4vw,1.95rem)] ${gauche ? 'lg:text-right' : ''}`} style={{ color: C.ink }}>{m.nom}</h3>
                    <ul className="mt-4 border-t" style={{ borderColor: hairline }}>
                      {m.capsules.map(([titre, s]) => (
                        <li key={titre} className="flex items-baseline justify-between gap-5 border-b py-2.5" style={{ borderColor: hairline }}>
                          <span className="text-[0.92rem] leading-[1.5]" style={{ color: C.inkSoft }}>{titre}</span>
                          <span className="shrink-0 text-[0.72rem] tracking-[0.08em] tabular-nums" style={{ color: 'rgba(28,23,18,0.55)' }}>{duree(s)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Reveal>
            </div>
          );
        })}
      </div>
      <Reveal className="mt-[clamp(2.5rem,6vh,4rem)] text-center">
        <p className="inline-flex items-start gap-3 text-[1rem] leading-[1.6]" style={{ color: C.ink }}>
          <Check size={16} weight="bold" className="mt-1 shrink-0" style={{ color: C.accentInk }} /><span>{GUIDE}</span>
        </p>
        <p className="mt-2 text-[0.75rem] leading-[1.6]" style={{ color: 'rgba(28,23,18,0.62)' }}>{NOTE_GUIDE}</p>
      </Reveal>
    </section>
  );
};

/* ════════════════════════ 10 bonnes raisons (Nature & Ayurveda, mot pour mot) ════════════════════════ */

// Tiré mot pour mot du livre de Krystine (Krystine, 5 oct. 2026) : ne rien reformuler.
const RAISONS: React.ReactNode[] = [
  'Lubrifie les articulations',
  'Aide à ralentir les effets du vieillissement',
  <>Aide à <B>relâcher le stress</B></>,
  'Améliore la tonicité musculaire et l’élasticité de la peau',
  <>Apaise le <B>système nerveux</B></>,
  <>Aide à préparer le corps au <B>sommeil</B></>,
  'Permet de déloger les impuretés sous la peau et dans les tissus adipeux (graisse)',
  'Stimule la circulation lymphatique et favorise l’élimination des déchets',
  'Aide à s’ancrer dans le moment présent',
  'Favorise le relâchement de l’ocytocine, une hormone aux nombreux effets dont celui de réduire les tensions musculaires',
];

const Raisons: React.FC = () => (
  <section id="automassage" className={`relative w-full ${GX} ${PY} scroll-mt-24`}>
    <Reveal className="mb-[clamp(2.5rem,6vh,4rem)]">
      <h2 className="v2-serif font-light leading-[1.02] text-[clamp(1.8rem,4.6vw,3.7rem)] max-w-[22ch]" style={{ color: C.ink }}>10 bonnes raisons de pratiquer l’automassage</h2>
      <DrawRule className="mt-6 w-20" />
    </Reveal>
    <div className="grid md:grid-cols-2 gap-x-[clamp(3rem,6vw,6rem)] border-t md:border-t-0" style={{ borderColor: hairline }}>
      {RAISONS.map((r, i) => (
        <Reveal key={i} delay={(i % 2) * 0.06} className={i < 2 ? 'md:border-t' : ''}>
          <div className="grid grid-cols-[3.25rem_1fr] sm:grid-cols-[4.25rem_1fr] items-baseline gap-x-5 border-b py-5 h-full" style={{ borderColor: hairline }}>
            <span className="v2-serif font-light text-[clamp(2rem,3.4vw,2.8rem)] leading-none tabular-nums" style={{ color: C.accent }}>{String(i + 1).padStart(2, '0')}</span>
            <span className="v2-serif font-light text-[clamp(1.1rem,1.6vw,1.3rem)] leading-[1.45]" style={{ color: C.ink }}>{r}</span>
          </div>
        </Reveal>
      ))}
    </div>
    {/* Page imprimée du livre, confirmée par Krystine le 5 oct. 2026. */}
    <p className="mt-8 text-[0.75rem] leading-[1.6]" style={{ color: 'rgba(28,23,18,0.62)' }}>
      Krystine St-Laurent, Nature &amp; Ayurveda, Éditions de l’Homme, 2018, p. 225
    </p>
  </section>
);

/* ════════════════════════ Les capsules en images (éventail des arrêts sur image) ════════════════════════ */

const REPERES: Array<[string, string]> = [
  ['10', `capsules vidéo · ${totalLisible} au total`],
  ['1', 'bonus : Plantes, stress et sagesse'],
  ['27 $', 'Un seul paiement · accès immédiat'],
];

const FAN_RECU: Array<[string, number, string, string]> = [
  ['automassage-bras', -15, '-100%', '8%'],
  ['soin-du-nez', -8, '-52%', '2%'],
  ['soin-de-la-bouche', 8, '52%', '2%'],
  ['mains', 15, '100%', '8%'],
];

const EnImages: React.FC = () => {
  const reduce = useReducedMotion();
  return (
    <section className={`relative w-full ${GX} ${PY}`} style={{ background: C.panel }}>
      <div className="grid gap-y-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-x-[clamp(3rem,6vw,6rem)] items-center">
        <div>
          <Reveal>
            <p className="text-[0.7rem] uppercase tracking-[0.34em]" style={{ color: C.accentInk }}>Rituels essentiels</p>
            <p className="mt-6 max-w-[46ch] text-[1rem] leading-[1.85]" style={{ color: C.inkSoft }}>
              L’Ayurveda, <B>l’automassage</B>, les <B>soins du nez et de la bouche</B>, les soins des <B>mains et des pieds</B>, puis une invitation concrète autour des plantes et du stress.
            </p>
            <DrawRule className="mt-6 w-20" />
          </Reveal>
          <div className="mt-10 border-t" style={{ borderColor: 'rgba(28,23,18,0.16)' }}>
            {REPERES.map(([n, l], i) => (
              <Reveal key={n} delay={i * 0.06}>
                <div className="grid grid-cols-[5rem_1fr] sm:grid-cols-[7rem_1fr] items-baseline gap-x-5 border-b py-5" style={{ borderColor: 'rgba(28,23,18,0.16)' }}>
                  <span className="v2-serif font-light text-[clamp(2rem,3.4vw,2.8rem)] leading-none tabular-nums whitespace-nowrap" style={{ color: C.accent }}>{n}</span>
                  <span className="text-[0.95rem] leading-[1.6]" style={{ color: C.inkSoft }}>{l}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
        <Reveal delay={0.12} className="w-full min-w-0">
          <figure>
            <motion.div aria-hidden className="relative mx-auto w-full max-w-[520px] aspect-[1/0.72] select-none" initial={reduce ? false : 'hidden'} whileInView="show" viewport={{ once: true, amount: 0.35 }}>
              {FAN_RECU.map(([id, rot, x, y], i) => (
                <div key={id} className="absolute bottom-[4%] left-1/2 w-[30%] -ml-[15%]" style={{ zIndex: i === 1 || i === 2 ? 4 : 2 }}>
                  <motion.div className="origin-bottom will-change-transform" style={reduce ? { rotate: rot, x, y } : undefined}
                    variants={{ hidden: { rotate: 0, x: '0%', y: 24, opacity: 0 }, show: { rotate: rot, x, y, opacity: 1, transition: { duration: APPEAR, ease, delay: 0.1 + (i === 1 || i === 2 ? 0 : 0.08) } } }}>
                    <Still src={img(id)} />
                  </motion.div>
                </div>
              ))}
              <div className="absolute bottom-[4%] left-1/2 w-[36%] -ml-[18%]" style={{ zIndex: 10 }}>
                <motion.div className="will-change-transform" variants={{ hidden: { y: 24, opacity: 0 }, show: { y: 0, opacity: 1, transition: { duration: APPEAR, ease } } }}>
                  <Still src={img('automassage-oreilles')} />
                </motion.div>
              </div>
            </motion.div>
          </figure>
        </Reveal>
      </div>
    </section>
  );
};

/* ════════════════════════ IV · L'offre : bande vert profond + planche ════════════════════════ */

const Offre: React.FC = () => (
  <section id="offre" className="w-full scroll-mt-24">
    <div className={`w-full ${GX} pt-[clamp(3.25rem,9vh,7rem)] pb-[clamp(7rem,16vh,10rem)]`} style={{ background: VERT }}>
      <ChapterHead sombre no="IV" kicker="L’offre · Rituels essentiels" title="Passez de la surstimulation à la clarté" />
    </div>
    <div className={`relative w-full ${GX} pb-[clamp(3.25rem,9vh,7rem)] -mt-[clamp(4.5rem,11vh,6.5rem)]`}>
      <Reveal>
        <div className="relative mx-auto max-w-[1180px] border" style={{ borderColor: 'rgba(156,122,68,0.45)', background: C.card, boxShadow: '0 30px 60px -30px rgba(28,23,18,0.45)' }}>
          <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: C.accent }} aria-hidden />
          <article className="grid gap-y-2 p-[clamp(1.75rem,3.5vw,3.25rem)] lg:grid-cols-[0.95fr_1.05fr] lg:gap-x-[clamp(3rem,5vw,5rem)]">
            <div className="flex flex-col">
              {/* La bannière de la première édition (krystinestlaurent.com/RITUELSVIVANTS, renommée Rituels essentiels le 6 oct. 2026). */}
              <div className="relative">
                <span className="pointer-events-none absolute -inset-1.5 border" style={{ borderColor: 'rgba(156,122,68,0.4)' }} aria-hidden />
                <img src={img('rituels-banniere-fondu')} alt="Rituels essentiels inspirés de l'Ayurveda, gestes simples à l'huile, moins de 5 minutes par jour" loading="lazy" className="block aspect-[3/1] w-full object-cover" />
              </div>
              <h3 className="mt-8 v2-serif font-light text-[clamp(1.7rem,2.6vw,2.25rem)] leading-[1.1]" style={{ color: C.ink }}>Rituels essentiels</h3>
              <div className="mt-6 flex items-end gap-3.5">
                <span className="v2-serif font-light text-[clamp(2.8rem,4.4vw,3.8rem)] leading-none tabular-nums" style={{ color: C.ink }}>27 $</span>
              </div>
              <p className="mt-3 text-[0.9rem] leading-snug" style={{ color: C.inkSoft }}><B>Un seul paiement</B> de 27 $</p>
              <BoutonAchat className="mt-8 w-full !px-3 sm:!px-4 !text-[0.62rem] sm:!text-[0.7rem]">{CTA}</BoutonAchat>
            </div>
            <div>
              <DrawRule className="mt-7 w-full lg:mt-0" color="rgba(186,123,57,0.4)" />
              <ul className="mt-7 space-y-3.5">
                {[<><B>10 capsules vidéo + 1 bonus</B> · {totalLisible}</>, <><B>Accès immédiat</B>, à votre rythme</>, ...MODULES.map(m => m.etiquette === 'Bonus' ? 'Bonus · Plantes, stress et sagesse' : m.nom), GUIDE].map((f, k) => (
                  <li key={k} className="flex items-start gap-3 text-[0.92rem] leading-[1.65]" style={{ color: C.inkSoft }}>
                    <Check size={16} weight="bold" className="mt-1 shrink-0" style={{ color: C.accentInk }} /><span>{f}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[0.72rem] leading-[1.6]" style={{ color: 'rgba(28,23,18,0.62)' }}>{NOTE_GUIDE}</p>
            </div>
          </article>
        </div>
      </Reveal>
    </div>
  </section>
);

/* ════════════════════════ Les soins INSPIRATA AYURVEDA ════════════════════════ */

const Soins: React.FC<{ produits: ShopifyProduct[] }> = ({ produits }) => (
  <section className={`w-full ${GX} pb-[clamp(3.25rem,9vh,7rem)]`}>
    <Reveal>
      <p className="text-[0.7rem] uppercase tracking-[0.34em]" style={{ color: C.brassInk }}>INSPIRATA AYURVEDA</p>
      <h2 className="mt-4 v2-serif font-light leading-[1.02] text-[clamp(1.8rem,4.6vw,3.7rem)] max-w-[20ch]" style={{ color: C.ink }}>Les huiles utilisées dans les capsules</h2>
      <DrawRule className="mt-6 w-20" color={C.brass} />
    </Reveal>
    <div className="mt-12 grid gap-x-[clamp(1.5rem,3vw,3rem)] gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {produits.map((p, i) => {
        const soin = SOINS.find(s => s.handle === p.handle)!;
        return (
          <Reveal key={p.handle} delay={i * 0.08}>
            <Link to={`/boutique/produit/${p.handle}`} className="group block">
              <figure className="border p-2" style={{ borderColor: 'rgba(156,122,68,0.45)', background: C.card }}>
                <div className="overflow-hidden">
                  <img src={p.featuredImage!.url} alt={p.featuredImage!.altText || soin.nom} loading="lazy" className="block w-full aspect-[4/5] object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                </div>
                <figcaption className="mt-2 text-right text-[0.62rem] uppercase tracking-[0.26em]" style={{ color: C.brassInk }}>Capsule · {soin.capsule}</figcaption>
              </figure>
              <p className="mt-6 v2-serif font-light text-[clamp(1.25rem,1.9vw,1.6rem)] leading-[1.25]" style={{ color: C.ink }}>{soin.nom}</p>
              <span className="mt-5 inline-flex items-center gap-2.5 border-b pb-1.5 text-[0.72rem] uppercase tracking-[0.2em]" style={{ color: C.ink, borderColor: C.ink }}>
                Voir la fiche <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </Link>
          </Reveal>
        );
      })}
    </div>
  </section>
);

/* ════════════════════════ Témoignages · le courrier ════════════════════════ */

const Temoignages: React.FC = () => {
  const [[premier, nom1], ...autres] = TEMOIGNAGES;
  return (
    <section id="temoignages" className={`w-full ${GX} ${PY} scroll-mt-24`} style={{ background: C.panel }}>
      <Reveal className="mb-[clamp(2.5rem,6vh,4rem)]">
        <p className="text-[0.7rem] uppercase tracking-[0.34em]" style={{ color: C.accentInk }}>Elles l’ont vécu</p>
        <h2 className="mt-4 v2-serif font-light leading-[1.02] text-[clamp(1.8rem,4.6vw,3.7rem)]" style={{ color: C.ink }}>Témoignages</h2>
      </Reveal>
      <Reveal>
        <figure className="relative border-t pt-[clamp(2rem,4vh,3rem)]" style={{ borderColor: 'rgba(186,123,57,0.4)' }}>
          <span aria-hidden className="pointer-events-none select-none absolute -top-2 left-0 v2-serif leading-none text-[clamp(5rem,9vw,8rem)]" style={{ color: 'rgba(186,123,57,0.16)' }}>«</span>
          <blockquote className="relative v2-serif font-light leading-[1.4] text-[clamp(1.35rem,2.6vw,2.1rem)] max-w-[52ch] pl-[clamp(2.5rem,5vw,4.5rem)]" style={{ color: C.ink }}>{premier}</blockquote>
          <figcaption className="mt-6 pl-[clamp(2.5rem,5vw,4.5rem)] v2-serif text-[1.05rem]" style={{ color: C.accentInk }}>{nom1}</figcaption>
        </figure>
      </Reveal>
      {autres.map(([texte, nom], i) => (
        <Reveal key={nom} delay={0.08 * (i + 1)} className="mt-[clamp(2.5rem,6vh,4rem)]">
          <figure className="border-t pt-6" style={{ borderColor: 'rgba(28,23,18,0.16)' }}>
            <blockquote className="v2-serif font-light text-[clamp(1.15rem,1.8vw,1.4rem)] leading-[1.55]" style={{ color: C.inkSoft }}>« {texte} »</blockquote>
            <figcaption className="mt-5 v2-serif text-[1rem]" style={{ color: C.accentInk }}>{nom}</figcaption>
          </figure>
        </Reveal>
      ))}
    </section>
  );
};

/* ════════════════════════ Qui vous guide ════════════════════════ */

const Bio: React.FC = () => (
  <section className={`w-full ${GX} ${PY}`}>
    <div className="grid gap-y-10 lg:grid-cols-[1.1fr_0.9fr] gap-x-[clamp(3rem,7vw,7rem)] items-center">
      <Reveal>
        <p className="text-[0.7rem] uppercase tracking-[0.34em]" style={{ color: C.brassInk }}>Votre guide</p>
        <h2 className="mt-4 v2-serif font-light leading-[1.02] text-[clamp(2.4rem,4.6vw,3.8rem)]" style={{ color: C.ink }}>
          Krystine <span className="whitespace-nowrap">St‑Laurent</span>
        </h2>
        <DrawRule className="mt-6 w-20" color={C.brass} />
        <p className="mt-6 text-[1rem] leading-[1.9] max-w-[56ch]" style={{ color: C.inkSoft }}>
          <B>Près de 40 ans d’expérience</B>, soins intensifs, recherche clinique, les coulisses du système, avant de choisir l’herboristerie, l’Ayurveda et l’aromathérapie. Auteure de <B>trois livres aux Éditions de l’Homme</B>. Créatrice de Santé la vie et du podcast Au-delà des tendances.
        </p>
      </Reveal>
      <Reveal delay={0.1}>
        <figure className="border p-2 mx-auto max-w-[460px] lg:max-w-none" style={{ borderColor: 'rgba(156,122,68,0.45)', background: C.card }}>
          {/* Photo professionnelle, les yeux ouverts (Krystine, 6 oct. 2026 : « la dernière photo, j'ai les yeux fermés »). */}
          <img src="/speaking/assets/krystine-smile.webp" alt="Krystine St-Laurent, souriante, assise sur un divan" loading="lazy" className="block w-full aspect-[4/5] object-cover object-[62%_40%]" />
          <figcaption className="mt-2 text-right text-[0.62rem] uppercase tracking-[0.26em]" style={{ color: C.brassInk }}>Krystine St-Laurent</figcaption>
        </figure>
      </Reveal>
    </div>
  </section>
);

/* ════════════════════════ V · Bon à savoir (FAQ deux colonnes) ════════════════════════ */

const Faq: React.FC = () => {
  const [open, setOpen] = useState<number | null>(0);
  const mid = Math.ceil(QUESTIONS.length / 2);
  const colonnes = [QUESTIONS.slice(0, mid), QUESTIONS.slice(mid)];
  return (
    <section id="questions" className={`w-full ${GX} ${PY} scroll-mt-24`} style={{ background: C.panel }}>
      <ChapterHead no="V" kicker="Questions" title="Bon à savoir" className="mb-[clamp(2.5rem,6vh,4rem)]" />
      <div className="grid lg:grid-cols-2 gap-x-[clamp(3rem,6vw,6rem)] items-start border-t" style={{ borderColor: hairline }}>
        {colonnes.map((col, c) => (
          <Reveal key={c} delay={c * 0.08}>
            {col.map(([q, a], j) => {
              const i = c * mid + j;
              const ouvert = open === i;
              return (
                <div key={q} className="border-b" style={{ borderColor: hairline }}>
                  <button type="button" onClick={() => setOpen(ouvert ? null : i)} aria-expanded={ouvert}
                    className="w-full text-left py-6 flex items-center justify-between gap-5 min-h-[44px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4" style={{ outlineColor: C.accent }}>
                    <h3 className="v2-serif font-light text-[1.25rem] md:text-[1.4rem] leading-[1.2] pr-4 transition-colors duration-300" style={{ color: ouvert ? C.accentInk : C.ink }}>{q}</h3>
                    <CaretDown size={18} weight="light" className={`shrink-0 transition-transform duration-300 ${ouvert ? 'rotate-180' : ''}`} style={{ color: C.accentInk }} />
                  </button>
                  <AnimatePresence initial={false}>
                    {ouvert && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1, transition: { duration: 0.45, ease } }}
                        exit={{ height: 0, opacity: 0, transition: { duration: 0.25, ease } }} className="overflow-hidden">
                        <p className="pb-7 text-[0.95rem] leading-[1.8] max-w-[62ch]" style={{ color: C.inkSoft }}>{a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </Reveal>
        ))}
      </div>
    </section>
  );
};

/* ════════════════════════ Quatrième de couverture ════════════════════════ */

const QuatriemeCouverture: React.FC = () => (
  <section className="relative w-full overflow-hidden" style={{ background: VERT }}>
    <span className="absolute inset-x-0 top-0 h-px" style={{ background: C.accent }} aria-hidden />
    <div className={`relative ${GX} py-[clamp(3.75rem,11vh,9rem)] text-center`}>
      <Reveal>
        <p className="flex items-center justify-center gap-3 text-[0.7rem] uppercase tracking-[0.34em]" style={{ color: C.brassLight }}>
          <FlowerLotus size={15} weight="light" aria-hidden /> Rituels essentiels · 27 $
        </p>
        <h2 className="mt-7 mx-auto v2-serif font-light leading-[1.08] text-[clamp(2.2rem,5vw,3.9rem)] max-w-[22ch]" style={{ color: C.cream }}>Rituels essentiels</h2>
        <p className="mt-7 mx-auto v2-serif text-[clamp(1.1rem,2vw,1.5rem)] leading-snug max-w-[40ch]" style={{ color: 'rgba(244,239,230,0.75)' }}>
          Quand vos sens sont surchargés : des <B clair>pratiques courtes</B> qui redonnent ancrage et direction
        </p>
        <div className="mt-11 flex flex-wrap items-center justify-center gap-x-9 gap-y-5">
          <BoutonAchat clair>{CTA}</BoutonAchat>
          <a href="#capsules" className="v2-serif text-lg transition-opacity duration-300 hover:opacity-75" style={{ color: 'rgba(244,239,230,0.8)' }}>Revoir les capsules</a>
        </div>
        <p className="mt-10 text-[0.7rem] uppercase tracking-[0.26em]" style={{ color: 'rgba(244,239,230,0.78)' }}>10 capsules + 1 bonus · Accès immédiat</p>
      </Reveal>
    </div>
  </section>
);

/* ════════════════════════ Barre d'achat mobile (comme /vata) ════════════════════════ */

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
      <style>{'@media (max-width: 767px) { body { padding-bottom: calc(84px + var(--bande-temoins, 0px)) !important; } }'}</style>
      <div aria-hidden={!visible}
        className={`fixed inset-x-0 bottom-0 z-50 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden transition-transform duration-500 ${visible ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ bottom: 'var(--bande-temoins, 0px)', background: C.cream, borderColor: hairline, transitionTimingFunction: 'cubic-bezier(.16,.8,.24,1)' }}>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="v2-serif text-[1.35rem] leading-none tabular-nums" style={{ color: C.ink }}>27 $</p>
            <p className="mt-1 text-[0.58rem] uppercase tracking-[0.16em]" style={{ color: 'rgba(28,23,18,0.6)' }}>Rituels essentiels · accès immédiat</p>
          </div>
          <Link to={PAIEMENT} tabIndex={visible ? 0 : -1} className="inline-flex min-h-[48px] shrink-0 items-center gap-2 px-5 text-[0.64rem] uppercase tracking-[0.14em]" style={{ background: C.ink, color: C.cream }}>
            J’accède <ArrowRight size={14} weight="regular" />
          </Link>
        </div>
      </div>
    </>
  );
};

/* ════════════════════════ Page ════════════════════════ */

const RituelsEssentielsPage: React.FC = () => {
  const [produits, setProduits] = useState<ShopifyProduct[]>([]);
  useEffect(() => {
    getProducts(60, 'FR')
      .then(ps => setProduits(SOINS.map(s => ps.find(p => p.handle === s.handle)).filter((p): p is ShopifyProduct => !!p && !!p.featuredImage)))
      .catch(() => setProduits([]));
  }, []);
  return (
    <div className="relative min-h-screen w-full antialiased overflow-x-hidden" style={{ background: C.cream, color: C.ink, fontFamily: '"Inter", system-ui, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..600&family=Inter:wght@300;400;500;600&display=swap');
        .v2-serif { font-family: "Fraunces", Georgia, serif; }
        .v2-grain {
          position: fixed; inset: 0; z-index: 60; pointer-events: none;
          opacity: 0.045; mix-blend-mode: multiply;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }
        .v2-medal { transition: transform .6s cubic-bezier(.16,.8,.24,1); }
        @media (hover: hover) and (pointer: fine) { .v2-medal:hover { transform: scale(1.09) rotate(-4deg); } }
        @media (prefers-reduced-motion: reduce) { .v2-medal:hover { transform: none; } }
      `}</style>
      <div className="v2-grain" aria-hidden />

      <Cover />
      <Exergue gras={6}>Moins de 5 minutes par jour suffisent pour réinstaller souffle, calme et cap clair.</Exergue>
      <Bande />
      <Doshas />
      <PourQui />
      <Pratiques />
      <Capsules />
      <Raisons />
      <EnImages />
      <Offre />
      {produits.length > 0 && <Soins produits={produits} />}
      <Temoignages />
      <Bio />
      <Faq />
      <QuatriemeCouverture />
      <BarreAchat />
    </div>
  );
};

export default RituelsEssentielsPage;
