import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Check, ChevronDown, BookOpen, ArrowRight, Headphones, Activity, Sparkles, Download } from 'lucide-react';
import { Atmosphere, Feuille, Parallax, Seam } from '../components/motion/loeuvre';
import { useUI, useAuth } from '../contexts/AppContext';
import BoutonCompte from '../components/BoutonCompte';

/**
 * Expérience Origine — page de vente au canon L'Œuvre (espresso/crème/laiton)
 * avec un accent botanique vert forêt préservé de l'identité du cours.
 *
 * Deux lois de mise en page, posées par Alex le 6 septembre 2026 :
 *  1. FEUILLES. Chaque section vit dans une <Feuille> : elle s'épingle, la
 *     suivante monte par-dessus avec ses coins arrondis et son ombre. Une
 *     section plus haute que l'écran s'épingle par le bas, donc elle se lit
 *     entièrement avant d'être recouverte. Rien ne se perd.
 *  2. PLEINE LARGEUR. L'écran est en 16:9. Aucun conteneur borné, aucun bloc
 *     centré avec du vide sur les côtés : gouttières fluides + grille
 *     éditoriale asymétrique de 12 colonnes, repliée en une colonne sous md.
 *
 * Skills : premium-web (orchestrateur) · impeccable (craft) · gsap-scrolltrigger
 * (culture de l'épinglage; la page reste en framer-motion et CSS sticky).
 */

const ease = [0.16, 0.8, 0.24, 1] as const;

/* Gouttières fluides : 4vw, plancher 20px (= px-5 sur mobile), plafond 72px. */
const GUT = 'px-[clamp(1.25rem,4vw,4.5rem)]';
/* Grille éditoriale : 12 colonnes pleine largeur, une seule colonne sous md. */
const G12 = 'grid grid-cols-12 gap-x-[clamp(1rem,2.5vw,3rem)]';

const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({
  children, delay = 0, className,
}) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 1 } : { opacity: 0, y: 28, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 1.0, ease, delay }}
    >
      {children}
    </motion.div>
  );
};

/* ── Timeline des piliers : le rail laiton court au centre de la grille et se
   dessine au fil du scroll, les piliers s'ouvrent de part et d'autre jusqu'aux
   gouttières. La course se termine avant l'épinglage de la feuille, sinon le
   rail se figerait à mi-course. ── */
const PillarsTimeline: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.95'] });
  return (
    <div ref={ref} className="relative mt-20 md:mt-28">
      <motion.div
        className="pointer-events-none absolute left-[7px] md:left-1/2 top-2 bottom-2 w-px bg-gradient-to-b from-brass/0 via-brass/50 to-brass/0 md:-translate-x-1/2"
        style={reduce ? undefined : { scaleY: scrollYProgress, transformOrigin: 'top center' }}
        aria-hidden
      />
      <div className="space-y-20 md:space-y-32">
        {PILLARS.map((p, i) => {
          const gauche = i % 2 === 0;
          const titre = gauche
            ? 'md:col-span-6 md:col-start-1 md:text-right md:pr-14'
            : 'md:col-span-6 md:col-start-7 md:pl-14';
          const corps = gauche
            ? 'md:col-span-6 md:col-start-7 md:pl-14'
            : 'md:col-span-6 md:col-start-1 md:row-start-1 md:text-right md:pr-14';
          return (
            <Reveal key={p.roman}>
              <article className={`relative ${G12} gap-y-6 items-start`}>
                <span className="absolute left-0 md:left-1/2 top-2 md:-translate-x-1/2" aria-hidden>
                  <motion.span
                    className="block h-3.5 w-3.5 rounded-full bg-brass ring-4 ring-cream"
                    initial={reduce ? false : { scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true, amount: 1 }}
                    transition={{ duration: 0.7, ease, delay: 0.35 }}
                  />
                </span>
                <div className={`col-span-12 pl-9 md:pl-0 ${titre}`}>
                  <p className="font-sans text-[0.6rem] uppercase tracking-[0.26em] text-brassInk">{p.range}</p>
                  <p className="mt-3 font-serif text-forestDeep text-[0.95rem] uppercase tracking-[0.18em]">{p.roman}</p>
                  <h3 className="mt-2 font-serif font-medium text-ink leading-[1.05] text-[clamp(1.7rem,2.8vw,2.4rem)]">{p.subtitle}</h3>
                </div>
                <div className={`col-span-12 pl-9 md:pl-0 ${corps}`}>
                  <p className={`font-sans text-[0.95rem] leading-[1.85] text-inkSoft max-w-[62ch] ${gauche ? '' : 'md:ml-auto'}`}>{p.body}</p>
                  <p className={`mt-7 font-serif font-medium text-brassInk text-[clamp(1.15rem,1.7vw,1.45rem)] leading-snug max-w-[44ch] ${gauche ? '' : 'md:ml-auto'}`}>{p.reflection}</p>
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
};

/* ── Filet laiton qui se trace à l'entrée (scaleX, transform seulement) ── */
const DrawRule: React.FC<{ className?: string; center?: boolean; delay?: number }> = ({ className = '', center = false, delay = 0.15 }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      className={`h-px bg-brass ${className}`}
      style={{ transformOrigin: center ? 'center' : 'left center' }}
      initial={reduce ? false : { scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, amount: 0.7 }}
      transition={{ duration: 1.2, ease, delay }}
    />
  );
};

const Eyebrow: React.FC<{ children: React.ReactNode; on?: 'dark' | 'light' }> = ({ children, on = 'light' }) => (
  <p className={`font-sans text-[0.62rem] uppercase tracking-[0.28em] ${on === 'dark' ? 'text-brass' : 'text-brassInk'}`}>
    {children}
  </p>
);

const SectionTitle: React.FC<{ children: React.ReactNode; on?: 'dark' | 'light'; className?: string }> = ({ children, on = 'light', className = '' }) => (
  <h2 className={`font-serif font-medium leading-[1.04] text-[clamp(2rem,4.4vw,3.4rem)] ${on === 'dark' ? 'text-ctext' : 'text-ink'} ${className}`}>
    {children}
  </h2>
);

/* ════════════════════════ Données ════════════════════════ */

const PILLARS = [
  { roman: 'Pilier I', range: 'Semaines 1 à 4', subtitle: 'Ce que le corps essaie de dire',
    body: "Calmer le bruit pour entendre ce qui est là. D'où viennent vos décisions ? Qu'est-ce que le corps essaie de dire ? L'Ayurveda donne les premiers mots pour le nommer. Le premier geste : écouter avant d'agir.",
    reflection: "Après quatre semaines, les signaux que le corps envoie depuis des mois deviennent lisibles. La confusion se dissipe. Ce qui semblait flou porte un nom." },
  { roman: 'Pilier II', range: 'Semaines 5 à 8', subtitle: 'Ce qui vous appartient vraiment',
    body: "Retirer ce qui encombre, poser ce qui soutient. Faire le tri entre ce qui est à vous et ce que l'on vous a imposé. L'Ayurveda éclaire ce qui nourrit vraiment. La Dinacharya, l'art ancestral de s'accorder aux rythmes du jour, devient votre charpente.",
    reflection: "Les gestes qui ne vous appartiennent pas tombent. Ceux qui vous soutiennent se posent. Le tri entre ce que l'on vous a imposé et ce qui est juste pour vous devient clair. Le matin change." },
  { roman: 'Pilier III', range: 'Semaines 9 à 12', subtitle: "Le retour au point d'origine",
    body: "Installer la capacité de retour. Les saisons comme boussole. Ce qui reste quand le parcours se termine. La boussole est rétablie, l'expérience continue en vous. Les repères restent. Le corps s'en souvient.",
    reflection: "La lecture tient seule. Les saisons deviennent votre boussole. Le parcours se termine, la capacité reste. Le corps s'en souvient." },
];

const WORKS = [
  { title: 'Les modules audios', body: "La lecture qui manquait. Chaque semaine, le corps devient plus lisible. Les signaux qui semblaient confus deviennent des réponses. À écouter en marchant, en cuisinant, à votre rythme." },
  { title: 'Les méditations guidées', body: "Ce qui a été reçu a besoin de se déposer. Un ancrage court, entre les rendez-vous, pour que la compréhension descende de la tête vers le corps." },
  { title: 'Vos questions', body: "Le privilège fondatrice. Vos questions sont soumises trois jours avant. Krystine et son équipe les lisent, préparent, et le rendez-vous s'ajuste à ce que vous vivez réellement. Pas un parcours générique. Votre réalité." },
  { title: 'Notre rendez-vous', body: "Deux heures chaque semaine, en direct. Krystine enseigne, écoute, ajuste. Chaque rendez-vous se termine par une méditation de groupe. 24 heures de présence directe sur 12 semaines. Celles qui ont essayé seules savent pourquoi cela change tout." },
  { title: 'Le Guide', body: "Le compagnon papier des douze semaines. Repères saisonniers, questions, recettes, rituels, espace d'écriture. Ce qui reste entre vos mains quand l'écran se ferme." },
  { title: "L'Espace", body: "Une communauté, mais pas comme vous les connaissez. Un endroit calme entre les rendez-vous. Sans notifications, sans obligation de publier. Pour ceux et celles qui ne veulent pas traverser seuls." },
];

const VALUE_ITEMS = [
  { title: '12 rendez-vous en direct avec Krystine (24 h de présence)', detail: "Chaque semaine, en direct. Elle enseigne, elle écoute, elle ajuste, et chaque rendez-vous se termine par une méditation de groupe. Vingt-quatre heures de présence directe sur douze semaines.", value: '4 800 $' },
  { title: '12 modules audio, la grille de lecture du corps', detail: "Chaque semaine, un enseignement en audio. Une grille de lecture pour se comprendre quand le corps donne des signaux que l'on ne sait pas décoder.", value: '600 $' },
  { title: '12 méditations audio guidées', detail: "Un ancrage personnel, court et pré-enregistré, pour laisser se déposer ce qui a été reçu entre les rendez-vous.", value: '360 $' },
  { title: 'Vos questions, le privilège fondatrice', detail: "Soumises trois jours avant le rendez-vous. Krystine et son équipe les lisent, préparent, et le rendez-vous s'ajuste à ce que vous vivez réellement.", value: '500 $' },
  { title: "Le Guide du Retour à l'Origine", detail: "Le compagnon papier des douze semaines. Repères saisonniers, recettes, rituels, journal d'observation.", value: '150 $' },
  { title: "L'Espace, la communauté d'Origine", detail: "Une communauté, mais pas comme vous les connaissez. Un endroit calme entre les rendez-vous. Sans notifications, sans obligation de publier.", value: '300 $' },
  { title: 'Liste de musique (spirale dorée, 432 Hz)', detail: "Une liste de musique qui fait voyager le cœur et l'âme, disponible avec un lien privé sur Spotify.", value: '97 $' },
];

const FAQS = [
  { q: "Est-ce que c'est pour moi même si je ne connais rien à l'Ayurveda ?", a: "Absolument. Expérience Origine est conçu pour vous guider pas à pas, que vous soyez novice ou initié. L'Ayurveda n'est pas un prérequis, c'est l'outil que nous découvrirons ensemble pour lire votre corps." },
  { q: "Je connais déjà l'Ayurveda ou j'enseigne le yoga. Est-ce que c'est pour moi aussi ?", a: "Oui. Ce n'est pas un cours théorique, c'est une expérience d'intégration. Nous allons au-delà des concepts pour toucher le senti. De nombreux professionnels de la santé et du bien-être y trouvent une profondeur nouvelle pour leur pratique." },
  { q: "Est-ce que Krystine est vraiment présente ou ce sont des pré-enregistrements ?", a: "C'est un accompagnement hybride et vivant. Les enseignements fondamentaux sont des audios, mais le cœur du parcours bat lors des 12 rencontres en direct avec Krystine (les dimanches)." },
  { q: "Est-ce qu'il faut avoir lu les deux premiers livres de Krystine ?", a: "Non, ce n'est pas nécessaire. Le parcours se suffit à lui-même. Les livres peuvent être des compléments enrichissants, mais tout ce dont vous avez besoin pour vivre l'expérience est inclus." },
  { q: "J'ai suivi tellement de formations et j'ai l'impression d'avoir empilé les connaissances. Rien ne semble rester. Pourquoi ce serait différent cette fois ?", a: "C'est la différence entre savoir et sentir. Origine n'est pas une formation intellectuelle de plus. C'est un espace pour déposer le savoir dans le corps. On ne cherche pas à ajouter, on cherche à intégrer." },
  { q: "Quelque chose me dit oui, mais j'arrête toujours en chemin. Qu'est-ce qui me dit que cette fois je vais tenir ?", a: "La structure du parcours est conçue spécifiquement pour vous soutenir sans vous surcharger. Les méditations courtes et la communauté bienveillante sont là pour vous ramener à vous-même, à votre rythme." },
  { q: "Combien de temps par semaine ?", a: "Prévoyez environ 3 heures par semaine : 2 heures pour notre rencontre en direct le dimanche, et environ 1 heure répartie dans votre semaine pour écouter le module audio et pratiquer les intégrations." },
  { q: "Le cercle est limité à 350 personnes. Est-ce que je vais me perdre dans le groupe ?", a: "Au contraire. Cette limite garantit une intimité et permet à Krystine de ressentir l'énergie du groupe. L'espace communautaire est conçu pour être un lieu calme, loin du bruit des grands réseaux sociaux." },
  { q: "J'ai déjà essayé beaucoup de choses.", a: "Si vous avez l'impression d'avoir tout essayé, c'est peut-être qu'il est temps d'arrêter de chercher à l'extérieur. Origine vous ramène à votre propre autorité intérieure et aux signaux de votre corps." },
  { q: "C'est un investissement important pour moi.", a: "C'est un engagement envers vous-même. C'est pour cela que nous offrons des options de versements, et surtout une Garantie Cœur Léger de 15 jours. Si vous sentez que ce n'est pas votre place, vous serez remboursée." },
  { q: "À quelle heure ont lieu les rencontres en direct ?", a: "Les rencontres ont lieu le dimanche, en direct, et chacune est disponible en rediffusion dans les 24 heures. L'horaire précis de la prochaine cohorte sera transmis en priorité aux personnes de la liste d'attente." },
];

const TESTIMONIALS = [
  { quote: "Personne ne parle de ces choses-là comme Krystine. Quand elle explique, tout devient clair.", who: 'Annie' },
  { quote: "Je me suis rarement écoutée tout au long de ma vie. C'est la première fois que quelqu'un me donne les outils pour le faire.", who: 'Françoise' },
  { quote: "Ce que j'ai lu dans cent livres sans comprendre, Krystine l'a rendu évident.", who: 'Marie' },
];

/* Pré-ouverture : aucune inscription directe. Tous les appels à l'action
   mènent à la liste d'attente (prix et checkout volontairement absents). */
const WAITLIST = '/liste-attente?programme=origine';

/* ════════════════════════ Sections ════════════════════════ */

const FAQItem: React.FC<{ q: string; a: string; i: number; open: boolean; onClick: () => void }> = ({ q, a, i, open, onClick }) => (
  <div className={`mb-3 rounded-2xl border bg-card overflow-hidden transition-shadow ${open ? 'border-brass/40 shadow-[0_10px_30px_rgba(187,154,94,0.12)]' : 'border-cream3 shadow-sm'}`}>
    <button onClick={onClick} aria-expanded={open}
      className="w-full text-left py-5 px-6 md:px-8 flex items-center justify-between gap-4 min-h-[44px] group">
      <h3 className={`font-serif text-lg md:text-xl pr-6 transition-colors ${open ? 'text-brassInk' : 'text-ink group-hover:text-brassInk'}`}>
        <span className="tabular-nums text-inkSoft mr-2">{i + 1}.</span>{q}
      </h3>
      <ChevronDown className={`w-5 h-5 shrink-0 text-brassInk transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
    </button>
    <AnimatePresence initial={false}>
      {open && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease }}>
          <p className="px-6 md:px-8 pb-7 text-inkSoft leading-[1.8] font-sans text-[0.95rem] max-w-[62ch]">{a}</p>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const FaqSection: React.FC = () => {
  const [open, setOpen] = useState<number | null>(0);
  // Deux colonnes indépendantes sur la grille de 12 : ouvrir un item ne fait
  // bouger que sa colonne. Titre à gauche, jamais centré.
  const mid = Math.ceil(FAQS.length / 2);
  const columns = [FAQS.slice(0, mid), FAQS.slice(mid)];
  return (
    <section id="faq" className="relative bg-cream2 py-24 md:py-32">
      <div className={`w-full ${GUT}`}>
        <div className={G12}>
          <Reveal className="col-span-12 md:col-span-6 mb-12 md:mb-14">
            <Eyebrow>Vos questions</Eyebrow>
            <SectionTitle className="mt-4 uppercase tracking-[0.02em] text-[clamp(1.7rem,3.2vw,2.5rem)]">
              Questions fréquentes
            </SectionTitle>
            <DrawRule className="mt-6 w-24" />
          </Reveal>
        </div>
        <div className={`${G12} items-start`}>
          {columns.map((col, c) => (
            <Reveal key={c} delay={c * 0.08} className="col-span-12 md:col-span-6">
              {col.map((f, j) => {
                const i = c * mid + j;
                return (
                  <FAQItem key={i} i={i} q={f.q} a={f.a} open={open === i} onClick={() => setOpen(open === i ? null : i)} />
                );
              })}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

const OrigineExperience: React.FC = () => {
  const { lang } = useUI();
  const { user } = useAuth();

  // Le hero est épinglé par la Feuille : son propre rect ne bouge plus une fois
  // pinné, donc la parallaxe et l'extinction se pilotent sur le scroll de page,
  // ramené à la hauteur mesurée du hero (mesure vivante, desktop et mobile).
  const heroRef = useRef<HTMLElement>(null);
  const heroSpan = useRef(1);
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const mesurer = () => { heroSpan.current = Math.max(el.offsetHeight, 1); };
    mesurer();
    const ro = new ResizeObserver(mesurer);
    ro.observe(el);
    window.addEventListener('resize', mesurer);
    return () => { ro.disconnect(); window.removeEventListener('resize', mesurer); };
  }, []);
  const { scrollY } = useScroll();
  const avance = (v: number) => Math.min(1, Math.max(0, v / heroSpan.current));
  const heroY = useTransform(scrollY, (v) => `${(-6 * avance(v)).toFixed(2)}%`);
  const heroScale = useTransform(scrollY, (v) => 1 + 0.06 * avance(v));
  const heroDim = useTransform(scrollY, (v) => `brightness(${(1 - 0.55 * avance(v)).toFixed(3)})`);

  const heroCopy = (
    <>
      <p className="font-sans text-[0.62rem] md:text-[0.7rem] uppercase tracking-[0.32em] text-brass mb-7 md:mb-8">Expérience Origine</p>
      <h1 className="font-serif font-medium text-ctext leading-[0.98] text-[clamp(2.1rem,4.6vw,4rem)] max-w-[24ch] [text-shadow:0_2px_30px_rgba(0,0,0,0.55)]">Vous n'avez pas besoin de plus d'information.</h1>
      <p className="mt-6 md:mt-7 font-serif text-[clamp(1.3rem,2.6vw,2.1rem)] leading-snug text-ctextSoft max-w-[26ch]">Vous avez besoin de revenir à <span className="text-brassBright">votre point d'origine.</span></p>
      <div className="mt-9 md:mt-11 flex flex-wrap items-center gap-5 md:gap-6">
        <a href="#curriculum" className="inline-flex items-center gap-3 rounded-full bg-brass px-8 py-3.5 font-sans text-[0.7rem] uppercase tracking-[0.18em] text-espressoDeep transition-colors duration-300 hover:bg-brassBright min-h-[44px]">Découvrir le parcours <ArrowRight size={16} /></a>
        <span className="font-serif text-ctextSoft/80 text-base">« Catherine, participante fondatrice »</span>
      </div>
    </>
  );

  return (
    /* Aucun overflow sur ce conteneur : c'est lui le bloc englobant des feuilles
       sticky. Un overflow autre que visible tuerait l'épinglage. */
    <div className="bg-cream text-ink font-sans antialiased">

      {/* ─────────── FEUILLE 1 · HERO ─────────── */}
      <Feuille z={1} premiere>
        <section ref={heroRef} className="relative w-full overflow-hidden bg-espressoDeep">
          {/* DESKTOP : bande pleine largeur, image complète, texte sur les colonnes 1 à 7 */}
          <div className="relative hidden md:block w-full overflow-hidden aspect-[2528/1015]">
            <motion.img
              src="https://storage.googleapis.com/origine1/banner%20origine%20enveloppe.jpg"
              alt="Enveloppe Expérience Origine, sceau boussole, sauge et lavande"
              className="absolute left-0 top-[-6%] h-[112%] w-full object-cover"
              style={{ y: heroY, scale: heroScale, filter: heroDim }}
              referrerPolicy="no-referrer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, ease }}
            />
            {/* Voiles : assombrir la gauche pour le texte, laisser l'enveloppe (droite) claire */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(90deg, rgba(22,16,10,0.90) 0%, rgba(22,16,10,0.72) 30%, rgba(22,16,10,0.30) 54%, transparent 74%)' }} />
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(22,16,10,0.28) 0%, transparent 28%, transparent 70%, rgba(22,16,10,0.42) 100%)' }} />
            <Atmosphere strength={0} vignette={false} />
            <div className="absolute inset-0 z-10 flex items-center">
              <div className={`w-full ${GUT} ${G12}`}>
                <motion.div className="col-span-12 md:col-span-7" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease }}>
                  {heroCopy}
                </motion.div>
              </div>
            </div>
          </div>
          {/* MOBILE : image pleine largeur complète (aucun crop), texte dessous, lu
              avant tout recouvrement puisque la feuille s'épingle par le bas */}
          <div className="md:hidden">
            <motion.img
              src="https://storage.googleapis.com/origine1/banner%20origine%20enveloppe.jpg"
              alt="Enveloppe Expérience Origine, sceau boussole, sauge et lavande"
              className="w-full h-auto block"
              referrerPolicy="no-referrer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, ease }}
            />
            <div className={`${GUT} pt-10 pb-14`}>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease }}>
                {heroCopy}
              </motion.div>
            </div>
          </div>
        </section>
      </Feuille>

      {/* ─────────── FEUILLE 2 · CURRICULUM ─────────── */}
      <Feuille z={2}>
        <section id="curriculum" className="relative bg-cream py-24 md:py-36">
          <div className={`w-full ${GUT}`}>
            <div className={`${G12} gap-y-8 items-end`}>
              <Reveal className="col-span-12 md:col-span-6">
                <Eyebrow>12 semaines · trois piliers</Eyebrow>
                <SectionTitle className="mt-5 uppercase tracking-[0.02em]">Retour au Point d'Origine</SectionTitle>
                <DrawRule className="mt-6 w-24" />
              </Reveal>
              <Reveal delay={0.08} className="col-span-12 md:col-span-5 md:col-start-8">
                <p className="font-serif text-[clamp(1.1rem,2vw,1.5rem)] leading-snug text-inkSoft max-w-[34ch]">Une sagesse de 5 000 ans, dans votre réalité d'aujourd'hui.</p>
              </Reveal>
            </div>
            <PillarsTimeline />
          </div>
        </section>
      </Feuille>

      {/* ─────────── FEUILLE 3 · BANDE CTA ─────────── */}
      <Feuille z={3}>
        <section className="relative bg-cream2 py-16 md:py-24">
          <Seam from="#f6f3ee" height={90} />
          <div className={`relative w-full ${GUT}`}>
            <Reveal>
              <div className={`${G12} gap-y-8 items-end border-y border-ink/12 py-14 md:py-16`}>
                <p className="col-span-12 md:col-span-8 font-serif text-[clamp(1.35rem,2.5vw,2.1rem)] leading-[1.35] text-ink max-w-[48ch]">12 semaines pour comprendre les messages du corps, retrouver ce qui nous appartient, ancrer les rituels qui tiennent, et revenir <span className="text-brassInk">au point d'origine.</span></p>
                <div className="col-span-12 md:col-span-4 md:flex md:justify-end">
                  <Link to={WAITLIST} className="inline-flex items-center gap-3 bg-ink px-9 py-4 font-sans text-[0.7rem] uppercase tracking-[0.2em] text-cream transition-colors duration-300 hover:bg-brass hover:text-espressoDeep min-h-[44px]">Rejoindre la liste d'attente <ArrowRight size={16} /></Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </Feuille>

      {/* ─────────── FEUILLE 4 · TRILOGIE (texte à gauche, planche à droite) ─────────── */}
      <Feuille z={4}>
        <section className="relative bg-cream2 py-24 md:py-32">
          <div className={`w-full ${GUT} ${G12} gap-y-12 items-center`}>
            <Reveal className="col-span-12 md:col-span-5">
              <Eyebrow>L'Œuvre fondatrice</Eyebrow>
              <SectionTitle className="mt-4">La Trilogie d'Origine</SectionTitle>
              <DrawRule className="mt-5 w-16" />
              <p className="mt-7 font-sans text-[1.05rem] leading-[1.85] text-inkSoft max-w-[62ch]">Trois livres. 8 ans. 1200 pages inspirées de l'Ayurveda, <span className="text-brassInk font-medium">et une partie de leur contenu inédit nourrit Expérience Origine avant même sa publication.</span></p>
              <p className="mt-8 text-[2rem] text-brassInk leading-none" style={{ fontFamily: '"Pinyon Script", cursive' }}>Krystine</p>
            </Reveal>
            <Reveal delay={0.1} className="col-span-12 md:col-span-6 md:col-start-7">
              <div className="rounded-[2rem] border border-cream3 bg-card p-5 md:p-8 shadow-xl overflow-hidden">
                <Parallax speed={0.08}>
                  <img src="https://wsrv.nl/?url=https%3A%2F%2Fstorage.googleapis.com%2Forigine1%2FA%25CC%2580%2520venir%2520biento%25CC%2582t!.png&w=1200&output=webp" alt="La Trilogie d'Origine" loading="lazy" className="w-full h-auto object-contain max-h-[560px]" referrerPolicy="no-referrer" />
                </Parallax>
              </div>
            </Reveal>
          </div>
        </section>
      </Feuille>

      {/* ─────────── FEUILLE 5 · CE QUI TRAVAILLE CHAQUE SEMAINE ─────────── */}
      <Feuille z={5}>
        <section className="relative bg-cream py-24 md:py-32">
          <Seam from="#f1ebe0" height={90} />
          <div className={`relative w-full ${GUT}`}>
            <div className={G12}>
              <Reveal className="col-span-12 md:col-span-6">
                <Eyebrow>Chaque semaine</Eyebrow>
                <SectionTitle className="mt-4">Ce qui travaille pour vous chaque semaine</SectionTitle>
                <DrawRule className="mt-5 w-24" />
              </Reveal>
            </div>
            <div className={`${G12} gap-y-6 mt-14 md:mt-16`}>
              {WORKS.map((w, i) => (
                <Reveal key={w.title} delay={(i % 3) * 0.06} className="col-span-12 md:col-span-6 lg:col-span-4">
                  <div className="h-full rounded-3xl bg-card border border-cream3 p-8 md:p-9 transition-[transform,box-shadow] duration-500 hover:shadow-xl hover:-translate-y-1.5">
                    <div className="flex items-center gap-4 mb-4">
                      <span className="w-2.5 h-2.5 rounded-full bg-brass shrink-0" />
                      <h3 className="font-serif text-xl md:text-2xl text-ink">{w.title}</h3>
                    </div>
                    <p className="font-sans text-[0.95rem] leading-[1.8] text-inkSoft md:pl-7 max-w-[62ch]">{w.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
            <div className={`${G12} mt-16`}>
              <Reveal className="col-span-12 md:col-span-8 md:col-start-5">
                <p className="font-serif font-medium text-brassInk text-[clamp(1.3rem,2.4vw,2rem)] leading-snug max-w-[48ch]">12 semaines pour comprendre les messages du corps, retrouver ce qui nous appartient et revenir <span className="uppercase tracking-[0.12em]">au point d'Origine</span>.</p>
              </Reveal>
            </div>
          </div>
        </section>
      </Feuille>

      {/* ─────────── FEUILLE 6 · JOURNAL (planche à gauche, texte à droite) ─────────── */}
      <Feuille z={6}>
        <section className="relative bg-cream3 py-24 md:py-32">
          <Seam from="#f6f3ee" height={90} />
          <div className={`relative w-full ${GUT} ${G12} gap-y-12 items-center`}>
            <Reveal className="col-span-12 md:col-span-6 md:col-start-7">
              <span className="inline-flex items-center gap-2 rounded-full border border-brass/30 text-brassInk px-3 py-1 text-[0.6rem] uppercase tracking-[0.18em]"><BookOpen size={12} /> Journal d'observation</span>
              <SectionTitle className="mt-5">L'accompagnement pour réfléchir, noter, observer, intégrer.</SectionTitle>
              <ul className="mt-8 space-y-4 max-w-[62ch]">
                {["L'observation des repères saisonniers pour s'ajuster au fil des semaines.", "L'intégration de rituels ancrés dans la sagesse ayurvédique.", "L'espace d'écriture pour suivre ce qui se dépose en vous."].map((li) => (
                  <li key={li} className="flex items-start gap-3 text-inkSoft font-sans text-[0.98rem] leading-relaxed">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-forest shrink-0" />{li}
                  </li>
                ))}
              </ul>
              <p className="mt-8 inline-flex items-center gap-2 text-brassInk font-medium text-sm"><Check size={16} /> Inclus dans Expérience Origine</p>
            </Reveal>
            <Reveal delay={0.1} className="col-span-12 md:col-span-5 md:col-start-1 md:row-start-1">
              <div className="relative w-full aspect-[3/4] rounded-l-md rounded-r-2xl border-l-[8px] border-brass shadow-2xl overflow-hidden bg-card">
                <Parallax speed={0.1} className="h-full" innerClassName="h-full">
                  <img src="https://storage.googleapis.com/origine1/Livre%20cover%20origine.jpeg" alt="Journal d'observation et de rituels" loading="lazy" className="w-full h-full object-cover scale-110" referrerPolicy="no-referrer" />
                </Parallax>
              </div>
            </Reveal>
          </div>
        </section>
      </Feuille>

      {/* ─────────── FEUILLE 7 · KRYSTINE (texte à gauche, portrait à droite) ─────────── */}
      <Feuille z={7}>
        <section id="about" className="relative bg-cream2 py-24 md:py-32">
          <Seam from="#ede5d7" height={90} />
          <div className={`relative w-full ${GUT} ${G12} gap-y-12 items-center`}>
            <Reveal className="col-span-12 md:col-span-6">
              <Eyebrow>Celle qui enseigne</Eyebrow>
              <SectionTitle className="mt-4">Krystine St-Laurent</SectionTitle>
              <DrawRule className="mt-5 w-16" />
              <p className="mt-7 font-sans text-[1.02rem] leading-[1.85] text-inkSoft max-w-[62ch]">Près de 40 ans à traverser les milieux de la santé, soins intensifs, industrie pharmaceutique, recherche clinique en insuffisance cardiaque, avant de choisir l'herboristerie, l'Ayurveda et l'aromathérapie. Auteure de trois livres aux Éditions de l'Homme. Créatrice de la série télé Santé la vie et du podcast Au-delà des tendances. Elle a vu ce que l'approche moderne fait bien. Et elle a vu là où elle laisse les gens seuls. Les rituels qu'elle enseigne, elle les pratique chaque matin.</p>
              <div className="mt-8 space-y-5 pt-6 border-t border-ink/12 max-w-[62ch]">
                {TESTIMONIALS.map((t) => (
                  <p key={t.who} className="text-ink">
                    <span className="font-serif text-[1.05rem] leading-snug">« {t.quote} »</span>
                    <span className="block mt-1 text-inkSoft/80 text-sm">— {t.who}</span>
                  </p>
                ))}
              </div>
            </Reveal>
            <Reveal delay={0.08} className="col-span-12 md:col-span-5 md:col-start-8">
              <div className="relative border border-brass/45 p-2.5 bg-card shadow-[0_30px_70px_rgba(58,49,38,0.14)]">
                <div className="relative overflow-hidden aspect-[4/5]">
                  <Parallax speed={0.1} className="h-full" innerClassName="h-full">
                    <img src="https://wsrv.nl/?url=storage.googleapis.com/origine1/krystine%20red%20NG.webp&w=1000&output=webp" alt="Krystine St-Laurent" loading="lazy" className="w-full h-full object-cover scale-110" referrerPolicy="no-referrer" />
                  </Parallax>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </Feuille>

      {/* ─────────── FEUILLE 8 · CE QUI EST INCLUS + LISTE D'ATTENTE ─────────── */}
      <Feuille z={8}>
        <section id="liste-attente" className="relative bg-cream py-24 md:py-32">
          <Seam from="#f1ebe0" height={90} />
          <div className={`relative w-full ${GUT}`}>
            <div className={`${G12} gap-y-6 items-end`}>
              <Reveal className="col-span-12 md:col-span-6">
                <Eyebrow>Prochaine cohorte</Eyebrow>
                <SectionTitle className="mt-4">Ce qui est inclus</SectionTitle>
                <DrawRule className="mt-5 w-24" />
              </Reveal>
              <Reveal delay={0.08} className="col-span-12 md:col-span-5 md:col-start-8">
                <p className="font-serif text-[clamp(1.05rem,1.8vw,1.4rem)] leading-snug text-inkSoft max-w-[34ch]">Le cercle est limité à 350 personnes, et les portes ne sont pas encore ouvertes.</p>
              </Reveal>
            </div>

            <div className={`${G12} gap-y-10 mt-12 md:mt-16 items-start`}>
              {/* Argumentaire, colonnes 1 à 7 */}
              <Reveal className="col-span-12 md:col-span-7">
                <div className="rounded-[2rem] border border-cream3 bg-card p-6 md:p-9 shadow-lg">
                  <div className="border-b border-brass/20 pb-4 mb-5">
                    <h3 className="font-serif font-medium text-lg md:text-xl uppercase tracking-[0.08em] text-ink">Le contenu du parcours</h3>
                  </div>
                  <div>
                    {VALUE_ITEMS.map((it, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 14 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.5 }}
                        transition={{ duration: 0.8, ease, delay: 0.1 + i * 0.06 }}
                        className={`flex items-start gap-3 py-4 ${i < VALUE_ITEMS.length - 1 ? 'border-b border-cream3' : ''}`}
                      >
                        <Check size={16} className="text-brass mt-1 shrink-0" />
                        <div>
                          <p className="font-sans text-[0.95rem] font-semibold text-ink leading-snug">{it.title}</p>
                          <p className="mt-1 font-sans text-[0.85rem] text-inkSoft leading-relaxed max-w-[62ch]">{it.detail}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="mt-6 rounded-2xl bg-forest/8 border border-forest/20 p-5 flex items-start gap-3">
                    <span className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-forestDeep mt-0.5 whitespace-nowrap">Boni</span>
                    <span className="font-sans text-[0.9rem] text-inkSoft">15 % sur toute la boutique Inspirata Ayurveda (huiles, aromathérapie, rituels douceur), pendant les 12 semaines, sans limite de fréquence.</span>
                  </div>
                </div>
              </Reveal>

              {/* Formulaire / porte d'entrée, colonnes 8 à 12 */}
              <Reveal delay={0.1} className="col-span-12 md:col-span-5">
                <div className="relative border border-brass/45 bg-card p-8 md:p-10">
                  <span className="pointer-events-none absolute inset-3 border border-brass/25" aria-hidden />
                  <div className="relative">
                    <p className="font-sans text-[0.65rem] uppercase tracking-[0.3em] text-brassInk">Prochaine cohorte</p>
                    <p className="mt-8 font-serif text-[clamp(1.5rem,2.2vw,2rem)] leading-[1.25] text-ink max-w-[22ch]">Les portes de la prochaine traversée ne sont pas encore ouvertes.</p>
                    <p className="mt-5 font-sans text-[0.95rem] leading-[1.8] text-inkSoft max-w-[46ch]">Les personnes sur la liste d'attente reçoivent les détails et l'accès en premier, avant toute annonce publique.</p>
                    <Link to={WAITLIST} className="mt-9 block w-full bg-ink py-4 text-center font-sans text-[0.72rem] tracking-[0.2em] uppercase text-cream transition-colors duration-300 hover:bg-brass hover:text-espressoDeep min-h-[44px]">Rejoindre la liste d'attente</Link>
                    <p className="mt-5 font-serif text-[0.95rem] text-inkSoft/80">Sans engagement. Vous choisirez librement à l'ouverture des portes.</p>
                  </div>
                </div>
              </Reveal>
            </div>

            {/* Garantie */}
            <div className={`${G12} mt-12`}>
              <Reveal className="col-span-12 md:col-span-8">
                <div className="rounded-3xl border border-cream3 bg-card p-8 md:p-10 shadow-sm">
                  <h4 className="font-serif font-medium text-xl md:text-2xl text-ink uppercase tracking-[0.08em] mb-4">Notre garantie cœur léger, 30 jours</h4>
                  <p className="font-sans text-[1.02rem] leading-relaxed text-inkSoft max-w-[62ch]">Si après <span className="text-brassInk font-medium">30 jours</span> vous sentez que ce cadre ne vous convient pas, nous vous <span className="text-brassInk font-medium">remboursons</span>. Sans question. Cela enlève le risque.</p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      </Feuille>

      {/* ─────────── FEUILLE 9 · FAQ ─────────── */}
      <Feuille z={9}>
        <FaqSection />
      </Feuille>

      {/* ─────────── FEUILLE 10 · FRÉQUENCE D'ORIGINE (le seul moment sombre,
           sur le brun chaud back-cover de la charte #34241a) ─────────── */}
      <Feuille z={10}>
        <section className="relative py-24 md:py-32 overflow-hidden" style={{ backgroundColor: '#34241a' }}>
          <Atmosphere light="30% 32%" />
          <div className={`relative w-full ${GUT} ${G12} gap-y-14 items-center`}>
            {/* Disque + écouteurs flottants */}
            <Reveal className="col-span-12 md:col-span-5 flex flex-col items-start">
              <div className="relative w-full max-w-[420px] aspect-square flex items-center justify-center">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 28, repeat: Infinity, ease: 'linear' }} className="absolute inset-[-8%] rounded-full border border-dashed border-brass/30" />
                <motion.div animate={{ rotate: -360 }} transition={{ duration: 38, repeat: Infinity, ease: 'linear' }} className="absolute inset-[6%] rounded-full border border-brass/15" />
                <div className="absolute inset-[14%] rounded-full bg-brass/12 blur-2xl" />
                <motion.img
                  src="https://storage.googleapis.com/origine1/headphones.png"
                  alt="Écouteurs · Expérience Origine"
                  draggable={false}
                  referrerPolicy="no-referrer"
                  animate={{ y: [-14, 14, -14] }}
                  transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
                  className="relative z-10 w-[64%] h-[64%] object-contain drop-shadow-[0_30px_55px_rgba(0,0,0,0.55)]"
                />
              </div>
              <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-cream text-espressoDeep px-6 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] shadow-xl">
                <span className="h-1.5 w-1.5 rounded-full bg-brass animate-pulse" /> Souffle d'Origine
              </div>
            </Reveal>
            {/* Contenu */}
            <Reveal delay={0.1} className="col-span-12 md:col-span-6 md:col-start-7">
              <p className="inline-flex items-center gap-2 text-brass text-xs font-bold uppercase tracking-[0.2em] mb-4"><Headphones size={14} /> Trame sonore originale</p>
              <h2 className="font-serif font-medium text-ctext text-[clamp(2.2rem,4.4vw,3.4rem)] leading-[1.05] max-w-[16ch]">Fréquence <span className="text-brassBright">d'Origine</span></h2>
              <p className="mt-6 font-sans text-[1rem] leading-relaxed text-ctextSoft max-w-[62ch]">La musique qui vous accompagne sur cette page a été composée pour réaligner votre système nerveux. Emportez cette fréquence avec vous pour retrouver votre centre à tout moment.</p>
              <div className="mt-8 flex gap-10 border-y border-brass/20 py-4 max-w-[34rem]">
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-2 text-[0.7rem] uppercase tracking-widest text-ctextSoft/70"><Activity size={12} /> Fréquence</span>
                  <span className="font-serif text-xl text-brassBright">432 Hz</span>
                </div>
                <div className="w-px h-10 bg-brass/20" />
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-2 text-[0.7rem] uppercase tracking-widest text-ctextSoft/70"><Sparkles size={12} /> Qualité</span>
                  <span className="font-serif text-xl text-brassBright">Studio haute résolution</span>
                </div>
              </div>
              {/* La musique vit dans la boutique de l'espace membre (5 niskas),
                  pas au Foyer d'Origine : visiteuse non connectée → créer un
                  compte (niskas de bienvenue offertes); membre connectée →
                  lien direct sur la boutique, onglet Téléchargements. */}
              {user ? (
                <a
                  href="/compte?onglet=telechargements#boutique"
                  className="mt-9 inline-flex items-center gap-3 rounded-full bg-brass px-9 py-4 font-serif text-lg text-espressoDeep transition-colors hover:bg-brassBright min-h-[44px]"
                >
                  <Download size={20} /> {lang === 'FR' ? 'L\'obtenir dans ma boutique · 5 niskas' : 'Get it in my shop · 5 niskas'}
                </a>
              ) : (
                <div className="mt-9">
                  <BoutonCompte
                    taille="lg"
                    libelle={lang === 'FR' ? "Créer mon compte pour l'obtenir" : 'Create my account to get it'}
                  />
                  <p className="mt-4 font-sans text-sm leading-relaxed text-ctextSoft max-w-[62ch]">
                    {lang === 'FR'
                      ? "Cette fréquence vous attend dans votre espace membre, pour 5 niskas. Votre compte vous offre des niskas de bienvenue dès sa création, de quoi l'obtenir sans attendre."
                      : 'This frequency is waiting in your member space, for 5 niskas. Your account comes with welcome niskas the moment you create it, enough to get it right away.'}
                  </p>
                </div>
              )}
            </Reveal>
          </div>
        </section>
      </Feuille>

      {/* ─────────── FEUILLE 11 · CLÔTURE (citation à gauche, gestes à droite) ─────────── */}
      <Feuille z={11}>
        <section className="relative bg-cream min-h-screen flex items-center py-24 md:py-28">
          <Seam from="#34241a" height={110} />
          <div className={`relative w-full ${GUT} ${G12} gap-y-12 items-end`}>
            <Reveal className="col-span-12 md:col-span-8">
              <Eyebrow>Expérience Origine</Eyebrow>
              <p className="mt-7 font-serif font-medium text-ink leading-[1.02] text-[clamp(2.2rem,5vw,4rem)] max-w-[26ch]">Le corps sait. Il manquait la carte pour le lire.</p>
              <DrawRule className="mt-10 w-32" />
            </Reveal>
            <Reveal delay={0.08} className="col-span-12 md:col-span-4">
              <Link to={WAITLIST} className="block w-full bg-ink py-4 text-center font-sans text-[0.72rem] tracking-[0.2em] uppercase text-cream transition-colors duration-300 hover:bg-brass hover:text-espressoDeep min-h-[44px]">Rejoindre la liste d'attente</Link>
              <a href="mailto:teamksl@inspiratanature.com" className="mt-7 block font-serif text-brassInk hover:text-brassDeep transition-colors text-lg md:text-xl">
                Une question ? teamksl@inspiratanature.com
              </a>
            </Reveal>
          </div>
        </section>
      </Feuille>

    </div>
  );
};

export default OrigineExperience;
