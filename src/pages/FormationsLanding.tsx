import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Compass, Fire, Wind, Sun, Leaf } from '@phosphor-icons/react';
import NewsletterSignup from '../components/NewsletterSignup';
import LiveEventsSection from '../components/LiveEvents';
import { getUpcomingEvents } from '../lib/liveEvents';
import { goToRoute } from '../lib/staticRoutes';
import { getFormationsPubliees, type Formation } from '../firebase/formations';

/**
 * /formations : la page d'accueil des formations de Krystine.
 * Trois programmes en vedette (Origine, Foyer, Vata), la bande des saisons,
 * le catalogue vivant (Firestore, statut « publie »), les événements et
 * l'infolettre. Canon V2 « magazine crème », motion Framer seulement.
 * Le texte source est en français; la version anglaise vient de en.json.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

const Reveal: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({ children, className = '', delay = 0 }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.9, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
};

const Kicker: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <p className={`text-[0.68rem] font-bold uppercase tracking-[0.3em] text-[#7d6330] ${className}`}>{children}</p>
);

/* ── Les trois programmes en vedette ─────────────────────────────────────── */
interface Programme {
  key: string;
  Icon: React.ComponentType<{ size?: number; weight?: any; className?: string }>;
  tag: string;
  title: string;
  subtitle: string;
  body: string;
  facts: string[];
  price?: string;
  cta: string;
  href: string;
  image: string;
  accent: string;
  tint: string;
}

const PROGRAMMES: Programme[] = [
  {
    key: 'origine',
    Icon: Compass,
    tag: 'Parcours signature · 12 semaines',
    title: "L'Expérience Origine",
    subtitle: 'Sortir du pilotage extérieur et retrouver vos propres repères',
    body: "Douze semaines accompagnées au cœur de l'Ayurveda, avec un audio, un guide et un direct chaque semaine. Trois piliers pour observer, reconstruire et ancrer. La prochaine cohorte s'annonce d'abord à la liste d'attente.",
    facts: ['12 semaines', 'Audio + guide + direct hebdomadaire', 'Cohorte accompagnée'],
    cta: "Découvrir l'Expérience Origine",
    href: '/origine',
    image: 'https://storage.googleapis.com/origine1/banner%20origine%20enveloppe.jpg',
    accent: '#9c7a44',
    tint: '#faf6ee',
  },
  {
    key: 'foyer',
    Icon: Fire,
    tag: 'Autour du feu · Ouvert',
    title: "Le Foyer d'Origine",
    subtitle: 'Le calendrier vivant des douze portes',
    body: "Un lieu pour revenir à vos propres repères, une porte à la fois. Chaque mois, une porte s'ouvre avec ses leçons, ses documents et son fil d'échanges avec Krystine et les autres membres.",
    facts: ['Douze portes, une par mois', 'Leçons, documents et fil de groupe', 'Accès immédiat'],
    price: '497 $',
    cta: 'Entrer au Foyer',
    href: '/foyer',
    image: '/assets/foyer-visuel-16x9.jpg',
    accent: '#b4533a',
    tint: '#f1ddcf',
  },
  {
    key: 'vata',
    Icon: Wind,
    tag: 'Saison Vata · En autonomie',
    title: 'Programme Vata',
    subtitle: 'Enraciner, réchauffer, apaiser',
    body: "Vent, sécheresse, dispersion : la saison Vata teste les nerfs. Un programme guidé de sept semaines pour ancrer le corps et la tête avant l'hiver, à suivre à votre rythme.",
    facts: ['Sept semaines', 'À votre rythme', 'Avec Krystine'],
    price: '397 $',
    cta: 'Découvrir le programme Vata',
    href: '/vata',
    image: 'https://firebasestorage.googleapis.com/v0/b/krystinestlaurent-87566.firebasestorage.app/o/formations%2Fkajabi-2148727800%2Fvignette.jpg?alt=media&token=36541136-478a-47a7-b2b3-1e9a6e33b9cf',
    accent: '#b9822f',
    tint: '#efe1c6',
  },
];

/* ── Les saisons ─────────────────────────────────────────────────────────── */
const SAISONS = [
  {
    key: 'kapha',
    Icon: Leaf,
    saison: 'Printemps · Kapha',
    title: 'Expérience Ayurveda : saison Kapha',
    body: 'Alléger, remettre en mouvement, sortir de la lourdeur de fin d\'hiver.',
    status: "Liste d'attente",
    href: '/liste-attente?programme=kapha',
    accent: '#74824a',
  },
  {
    key: 'pitta',
    Icon: Sun,
    saison: 'Été · Pitta',
    title: 'Expérience Estivale Vivante et Guidée : Pitta',
    body: 'Un espace de retour à soi pendant la saison intense et lumineuse de l\'été.',
    status: 'Accès libre',
    href: '/cours/kajabi-2149054844',
    accent: '#b4533a',
  },
  {
    key: 'vata',
    Icon: Wind,
    saison: 'Automne · Vata',
    title: 'Abondance et Transformation Profonde : saison Vata',
    body: 'Ancrer le corps et la tête avant l\'hiver, sept semaines à votre rythme.',
    status: 'Disponible',
    href: '/vata',
    accent: '#b9822f',
  },
];

const FormationsLanding: React.FC = () => {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [formations, setFormations] = useState<Formation[]>([]);
  const events = getUpcomingEvents({ hideTedx: true });

  // Les documents de test (titre commençant par TEST) restent hors de la vitrine.
  useEffect(() => { getFormationsPubliees().then(l => setFormations(l.filter(f => !/^test\b/i.test(f.titre)))).catch(() => setFormations([])); }, []);
  useEffect(() => {
    if (window.location.hash === '#evenements') {
      window.setTimeout(() => document.getElementById('evenements')?.scrollIntoView({ behavior: 'smooth' }), 300);
    }
  }, []);

  const go = (href: string) => goToRoute(navigate, href);
  const [vedette, ...paire] = PROGRAMMES;

  return (
    <div className="min-h-screen bg-[#f4efe6] text-[#1c1712]">
      {/* ─────────── HERO ─────────── */}
      <section className="relative overflow-hidden px-[clamp(1.5rem,5vw,5.5rem)] pt-36 pb-16 md:pt-44 md:pb-24">
        <div className="mx-auto grid max-w-[1320px] items-center gap-12 lg:grid-cols-[7fr_5fr]">
          <div>
            <motion.div initial={reduce ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }}>
              <Kicker>Programmes · Ayurveda</Kicker>
            </motion.div>
            <motion.h1
              className="mt-4 max-w-[12ch] font-serif text-[clamp(2.8rem,6.5vw,6rem)] leading-[0.98] tracking-[-0.01em]"
              initial={reduce ? false : { opacity: 0, y: 26, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 1, ease: EASE, delay: 0.1 }}
            >
              Les formations de Krystine
            </motion.h1>
            <motion.p
              className="mt-7 max-w-[36rem] font-serif text-[clamp(1.15rem,1.7vw,1.5rem)] leading-[1.5] text-[#3a2f23]"
              initial={reduce ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE, delay: 0.25 }}
            >
              Des parcours pour revenir au corps, aux rythmes et aux cycles de la nature : une cohorte accompagnée, un foyer qui s'ouvre porte après porte, et des programmes de saison à suivre à votre rythme.
            </motion.p>
            <motion.div className="mt-9 flex flex-wrap gap-3" initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE, delay: 0.4 }}>
              <a href="#programmes" className="inline-flex items-center gap-2.5 rounded-full bg-[#9c7a44] px-7 py-3.5 text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[#1c1712] transition-transform duration-300 hover:-translate-y-0.5">
                Voir les programmes <ArrowRight size={14} weight="bold" />
              </a>
              <a href="#catalogue" className="inline-flex items-center gap-2.5 rounded-full border border-[#1c1712]/25 px-7 py-3.5 text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[#1c1712] transition-colors duration-300 hover:border-[#9c7a44] hover:text-[#7d6330]">
                Toutes les formations
              </a>
            </motion.div>
          </div>
          <motion.div
            className="relative"
            initial={reduce ? false : { opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, ease: EASE, delay: 0.2 }}
          >
            <div className="pointer-events-none absolute inset-0 translate-x-4 translate-y-4 rounded-[15px] border border-[#9c7a44]/60" aria-hidden />
            <img
              src={vedette.image}
              alt="L'Expérience Origine, la boîte et son sceau de cuivre"
              className="aspect-[5/6] w-full rounded-[15px] object-cover shadow-[0_40px_80px_-30px_rgba(28,23,18,0.45)]"
              width={880} height={1056}
            />
            <div className="absolute -left-4 bottom-8 bg-[#1c1712] px-4 py-3 text-[#f4efe6] shadow-[0_18px_40px_rgba(28,23,18,0.25)]">
              <p className="text-[0.6rem] uppercase tracking-[0.24em] text-[#c8a86a]">Parcours signature</p>
              <p className="mt-1 font-serif text-xl leading-tight">L'Expérience Origine</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─────────── PROGRAMMES ─────────── */}
      <section id="programmes" className="scroll-mt-24 px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(4rem,9vh,7rem)]">
        <div className="mx-auto max-w-[1320px]">
          <Reveal className="mb-12 max-w-[46rem]">
            <Kicker>Les trois programmes</Kicker>
            <h2 className="mt-3 font-serif text-[clamp(2rem,4vw,3.4rem)] leading-[1.05]">Trois façons d'entrer dans l'Œuvre</h2>
            <p className="mt-5 font-serif text-[clamp(1.05rem,1.4vw,1.3rem)] leading-[1.5] text-[#3a2f23]">
              Un parcours accompagné en cohorte, un foyer qui vit toute l'année, et un programme de saison à suivre seule. Chacun mène au même endroit : vos propres repères.
            </p>
          </Reveal>

          {/* Vedette pleine largeur : Origine */}
          <Reveal>
            <article
              className="group grid cursor-pointer overflow-hidden rounded-[15px] border border-[#1c1712]/10 bg-[#faf6ee] shadow-[0_30px_60px_-40px_rgba(28,23,18,0.4)] lg:grid-cols-[5fr_7fr]"
              onClick={() => go(vedette.href)}
            >
              <div className="relative min-h-[280px] overflow-hidden">
                <img src={vedette.image} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.04]" loading="lazy" />
              </div>
              <div className="p-8 md:p-12">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[#f4efe6]" style={{ background: vedette.accent }}><vedette.Icon size={22} weight="regular" /></span>
                  <Kicker>{vedette.tag}</Kicker>
                </div>
                <h3 className="mt-6 font-serif text-[clamp(1.9rem,3.2vw,2.8rem)] leading-[1.05]">{vedette.title}</h3>
                <p className="mt-2 font-serif text-lg text-[#7d6330]">{vedette.subtitle}</p>
                <p className="mt-5 max-w-[42rem] leading-[1.7] text-[#3a2f23]">{vedette.body}</p>
                <ul className="mt-6 flex flex-wrap gap-2">
                  {vedette.facts.map(f => (
                    <li key={f} className="rounded-full border border-[#1c1712]/15 px-3.5 py-1.5 text-[0.72rem] tracking-[0.06em] text-[#3a2f23]">{f}</li>
                  ))}
                </ul>
                <span className="mt-8 inline-flex items-center gap-2.5 text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[#7d6330]">
                  {vedette.cta} <ArrowRight size={14} weight="bold" className="transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </div>
            </article>
          </Reveal>

          {/* La paire : Foyer et Vata */}
          <div className="mt-8 grid gap-8 md:grid-cols-2">
            {paire.map((p, i) => (
              <Reveal key={p.key} delay={i * 0.12}>
                <article
                  className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-[15px] border border-[#1c1712]/10 shadow-[0_30px_60px_-40px_rgba(28,23,18,0.4)] transition-transform duration-500 hover:-translate-y-1"
                  style={{ background: p.tint }}
                  onClick={() => go(p.href)}
                >
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <img src={p.image} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.04]" loading="lazy" />
                  </div>
                  <div className="flex flex-1 flex-col p-7 md:p-9">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#f4efe6]" style={{ background: p.accent }}><p.Icon size={20} weight="regular" /></span>
                      <Kicker>{p.tag}</Kicker>
                    </div>
                    <h3 className="mt-5 font-serif text-[clamp(1.7rem,2.6vw,2.3rem)] leading-[1.08]">{p.title}</h3>
                    <p className="mt-1.5 font-serif text-lg" style={{ color: p.accent }}>{p.subtitle}</p>
                    <p className="mt-4 leading-[1.7] text-[#3a2f23]">{p.body}</p>
                    <ul className="mt-5 flex flex-wrap gap-2">
                      {p.facts.map(f => (
                        <li key={f} className="rounded-full border border-[#1c1712]/15 px-3.5 py-1.5 text-[0.72rem] tracking-[0.06em] text-[#3a2f23]">{f}</li>
                      ))}
                    </ul>
                    <div className="mt-auto flex items-center justify-between pt-8">
                      <span className="inline-flex items-center gap-2.5 text-[0.72rem] font-bold uppercase tracking-[0.18em]" style={{ color: p.accent }}>
                        {p.cta} <ArrowRight size={14} weight="bold" className="transition-transform duration-300 group-hover:translate-x-1" />
                      </span>
                      {p.price && <span className="font-serif text-2xl text-[#1c1712]">{p.price}</span>}
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── LES SAISONS ─────────── */}
      <section className="bg-[#efe6d7] px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(4rem,9vh,7rem)]">
        <div className="mx-auto max-w-[1320px]">
          <Reveal className="grid gap-6 lg:grid-cols-[5fr_7fr] lg:items-end">
            <div>
              <Kicker>Au fil des saisons</Kicker>
              <h2 className="mt-3 font-serif text-[clamp(2rem,4vw,3.4rem)] leading-[1.05]">Une saison, une expérience</h2>
            </div>
            <p className="font-serif text-[clamp(1.05rem,1.4vw,1.3rem)] leading-[1.5] text-[#3a2f23]">
              L'Ayurveda lit l'année en trois temps. Printemps Kapha, été Pitta, automne Vata : chaque saison porte son expérience, avec ses rituels et ses plantes, pour vivre en alliance avec le corps plutôt qu'à son insu.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {SAISONS.map((s, i) => (
              <Reveal key={s.key} delay={i * 0.1}>
                <article
                  className="group flex h-full cursor-pointer flex-col rounded-[15px] border border-[#1c1712]/10 bg-[#f4efe6] p-7 transition-transform duration-500 hover:-translate-y-1"
                  onClick={() => (s.href.startsWith('/liste-attente') ? navigate(s.href) : go(s.href))}
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#f4efe6]" style={{ background: s.accent }}><s.Icon size={20} weight="regular" /></span>
                    <p className="text-[0.66rem] font-bold uppercase tracking-[0.26em]" style={{ color: s.accent }}>{s.saison}</p>
                  </div>
                  <h3 className="mt-5 font-serif text-[1.5rem] leading-[1.15]">{s.title}</h3>
                  <p className="mt-3 leading-[1.65] text-[#3a2f23]">{s.body}</p>
                  <div className="mt-auto flex items-center justify-between pt-7 text-[0.68rem] font-bold uppercase tracking-[0.18em]">
                    <span className="text-[#7d6330]">{s.status}</span>
                    <ArrowRight size={14} weight="bold" className="transition-transform duration-300 group-hover:translate-x-1" style={{ color: s.accent }} />
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── CATALOGUE ─────────── */}
      {formations.length > 0 && (
        <section id="catalogue" className="scroll-mt-24 px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(4rem,9vh,7rem)]">
          <div className="mx-auto max-w-[1320px]">
            <Reveal className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <Kicker>Toutes les formations</Kicker>
                <h2 className="mt-3 font-serif text-[clamp(2rem,4vw,3.4rem)] leading-[1.05]">Apprendre avec Krystine</h2>
              </div>
              <Link to="/cours" className="inline-flex items-center gap-2.5 text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[#7d6330] hover:text-[#1c1712]">
                Voir le catalogue complet <ArrowRight size={14} weight="bold" />
              </Link>
            </Reveal>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {formations.map((f, i) => (
                <Reveal key={f.id} delay={(i % 3) * 0.08}>
                  <Link
                    to={f.lienFiche || `/cours/${f.id}`}
                    className="group block h-full overflow-hidden rounded-[15px] border border-[#1c1712]/10 bg-[#faf6ee] transition-transform duration-500 hover:-translate-y-1"
                  >
                    {f.imageUrl ? (
                      <img src={f.imageUrl} alt={f.titre} className="aspect-video w-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.03]" loading="lazy" />
                    ) : (
                      <div className="flex aspect-video w-full items-center justify-center bg-[#9c7a44]/10"><Compass size={34} className="text-[#7d6330]" /></div>
                    )}
                    <div className="p-6">
                      <h3 className="font-serif text-xl leading-snug">{f.titre}</h3>
                      {f.description && <p className="mt-2 line-clamp-2 text-sm leading-[1.6] text-[#3a2f23]/75">{f.description}</p>}
                      <p className="mt-4 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#7d6330]">
                        {f.paywall && f.prix ? `${f.prix} $ CA` : 'Accès libre'}
                      </p>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─────────── ÉVÉNEMENTS ─────────── */}
      {events.length > 0 && (
        <section id="evenements" className="scroll-mt-24 bg-[#efe6d7] px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(4rem,9vh,7rem)]">
          <Reveal className="mx-auto mb-14 max-w-[1040px] text-center">
            <Kicker>En direct</Kicker>
            <h2 className="mt-3 font-serif text-[clamp(2rem,4vw,3.4rem)] leading-[1.05]">Événements et conférences</h2>
            <p className="mx-auto mt-5 max-w-[44ch] font-serif text-[clamp(1.05rem,1.4vw,1.3rem)] leading-snug text-[#3a2f23]">
              Rencontres en direct, retraites et lancements, annoncés ici avant partout ailleurs.
            </p>
          </Reveal>
          <LiveEventsSection events={events} columns={2} />
        </section>
      )}

      {/* ─────────── INFOLETTRE ─────────── */}
      <section className="px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(4rem,9vh,7rem)]">
        <div className="mx-auto max-w-[1040px]">
          <NewsletterSignup source="formations" tags={['formations']} variant="light" />
        </div>
      </section>

      {/* ─────────── FERMETURE ─────────── */}
      <section className="bg-[#34241a] px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(5rem,12vh,9rem)] text-[#f4efe6]">
        <Reveal className="mx-auto max-w-[900px] text-center">
          <p className="font-serif text-[clamp(1.6rem,3.2vw,2.6rem)] leading-[1.25]">« L'équilibre se cultive, saison après saison. »</p>
          <p className="mt-4 font-serif text-lg text-[#c8a86a]">Krystine</p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <a href="#programmes" className="inline-flex items-center gap-2.5 rounded-full bg-[#9c7a44] px-7 py-3.5 text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[#1c1712]">Voir les programmes <ArrowRight size={14} weight="bold" /></a>
            <a href="/speaking?lang=fr" className="inline-flex items-center gap-2.5 rounded-full border border-[#f4efe6]/35 px-7 py-3.5 text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[#f4efe6] hover:border-[#c8a86a]">La conférencière</a>
          </div>
        </Reveal>
      </section>
    </div>
  );
};

export default FormationsLanding;
