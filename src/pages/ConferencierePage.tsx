// ConferencierePage — merged pillar page combining the former /krystine
// bio/narrative + /conferenciere booking journey into one long editorial
// ribbon (April 2026). Serves both URLs (see App.tsx); /conferenciere
// auto-scrolls to the form section on mount so old "book" links keep
// their destination, /krystine opens at the top.
//
// Section order:
//   1. Hero (glass container · portrait)
//   2. Press marquee
//   3. Story (bio narrative — pull quote + 4 cards)
//   4. Stats row (count-up, editable via t.founder.stats)
//   5. Mission card (L'Art de vivre conscient)
//   6. Signature talks
//   7. Testimonials
//   8. Process timeline
//   9. Booking form
//   10. FAQ
//   11. Événements (LiveEventsSection — curated + admin-published)
//   12. Correspondence (newsletter)
//   13. Closing quote
//   14. Sticky CTA bar
//
// Motion follows the ui-ux-pro-max protocol used elsewhere on the site:
// spring entrances, ≤300 ms micro-interactions, scale-feedback hovers,
// reduced-motion safe throughout.

import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, useInView, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import { CONTENT, ASSETS } from '../content';
import EditableText from '../components/edit/EditableText';
import EditableImage from '../components/edit/EditableImage';
import EditorialSectionHeader from '../components/EditorialSectionHeader';
import Sprig from '../components/Sprig';
import NewsletterSignup from '../components/NewsletterSignup';
import LiveEventsSection from '../components/LiveEvents';
import { getEvents, type EventDoc } from '../firebase/firestore';
import { getUpcomingEvents } from '../lib/liveEvents';
import { useSiteFlags } from '../contexts/SiteFlagsContext';
import {
  addBookingRequest,
  type AudienceSize,
  type AudienceType,
  type BudgetRange,
  type EventFormat,
  type InterventionDuration,
  type InterventionKind,
  type LangPref,
} from '../firebase/firestore';

// ── Form option lists ──────────────────────────────────────────────────────
const INTERVENTION_OPTIONS: { id: InterventionKind; fr: string; en: string }[] = [
  { id: 'keynote',   fr: 'Conférence / Keynote',            en: 'Conference / Keynote' },
  { id: 'workshop',  fr: 'Atelier pratique',                en: 'Hands-on workshop' },
  { id: 'panel',     fr: 'Table ronde / Panel',             en: 'Roundtable / Panel' },
  { id: 'hosting',   fr: "Animation d'événement",           en: 'Event hosting' },
  { id: 'podcast',   fr: 'Podcast / Entrevue média',        en: 'Podcast / Media interview' },
  { id: 'corporate', fr: 'Formation corporate',             en: 'Corporate training' },
  { id: 'retreat',   fr: 'Retraite ou séjour',              en: 'Retreat or residency' },
  { id: 'other',     fr: 'Autre · à préciser',              en: 'Other — please specify' },
];
const FORMAT_OPTIONS: { id: EventFormat; fr: string; en: string }[] = [
  { id: 'in-person', fr: 'Présentiel',          en: 'In person' },
  { id: 'virtual',   fr: 'Virtuel',             en: 'Virtual' },
  { id: 'hybrid',    fr: 'Hybride',             en: 'Hybrid' },
  { id: 'open',      fr: 'Ouvert · à discuter', en: 'Open — to discuss' },
];
const AUDIENCE_OPTIONS: { id: AudienceType; fr: string; en: string }[] = [
  { id: 'general-public', fr: 'Grand public',                en: 'General public' },
  { id: 'corporate',      fr: 'Entreprise · équipe interne', en: 'Corporate / internal team' },
  { id: 'students',       fr: 'Étudiants · milieu éducatif', en: 'Students / education' },
  { id: 'healthcare',     fr: 'Professionnels de la santé',  en: 'Healthcare professionals' },
  { id: 'community',      fr: 'Communauté · association',    en: 'Community / association' },
  { id: 'other',          fr: 'Autre · à préciser',          en: 'Other — please specify' },
];
const SIZE_OPTIONS: { id: AudienceSize; fr: string; en: string }[] = [
  { id: 'under-50', fr: 'Moins de 50',     en: 'Under 50' },
  { id: '50-150',   fr: '50 à 150',        en: '50 to 150' },
  { id: '150-500',  fr: '150 à 500',       en: '150 to 500' },
  { id: '500-plus', fr: 'Plus de 500',     en: '500 or more' },
  { id: 'unknown',  fr: 'À déterminer',    en: 'To be determined' },
];
const DURATION_OPTIONS: { id: InterventionDuration; fr: string; en: string }[] = [
  { id: '30min',     fr: '30 minutes',              en: '30 minutes' },
  { id: '60min',     fr: '60 minutes',              en: '60 minutes' },
  { id: '90min',     fr: '90 minutes',              en: '90 minutes' },
  { id: 'half-day',  fr: 'Demi-journée (2–3 h)',    en: 'Half-day (2–3 hrs)' },
  { id: 'full-day',  fr: 'Journée complète',        en: 'Full day' },
  { id: 'multi-day', fr: 'Plusieurs jours',         en: 'Multi-day' },
  { id: 'flexible',  fr: 'Flexible · à discuter',   en: 'Flexible — to discuss' },
];
const BUDGET_OPTIONS: { id: BudgetRange; fr: string; en: string }[] = [
  { id: 'under-2k',   fr: 'Moins de 2 000 $',            en: 'Under $2,000' },
  { id: '2k-5k',      fr: '2 000 $ à 5 000 $',           en: '$2,000 to $5,000' },
  { id: '5k-10k',     fr: '5 000 $ à 10 000 $',          en: '$5,000 to $10,000' },
  { id: '10k-plus',   fr: 'Plus de 10 000 $',            en: '$10,000 or more' },
  { id: 'to-discuss', fr: 'À discuter',                  en: 'To discuss' },
];
const LANG_OPTIONS: { id: LangPref; fr: string; en: string }[] = [
  { id: 'fr',        fr: 'Français',  en: 'French' },
  { id: 'en',        fr: 'Anglais',   en: 'English' },
  { id: 'bilingual', fr: 'Bilingue',  en: 'Bilingual' },
];

type Form = {
  name: string; email: string; phone: string;
  organization: string; organizationUrl: string;
  city: string; region: string;
  interventionKind: InterventionKind; format: EventFormat;
  audienceType: AudienceType; audienceSize: AudienceSize;
  duration: InterventionDuration; preferredDate: string;
  budgetRange: BudgetRange; languagePref: LangPref;
  message: string;
};
const EMPTY_FORM: Form = {
  name: '', email: '', phone: '', organization: '', organizationUrl: '',
  city: '', region: '',
  interventionKind: 'keynote', format: 'in-person',
  audienceType: 'general-public', audienceSize: 'unknown',
  duration: 'flexible', preferredDate: '',
  budgetRange: 'to-discuss', languagePref: 'fr',
  message: '',
};

// ── Page content ────────────────────────────────────────────────────────────
const SIGNATURE_TALKS = [
  {
    key: 'conf.talk.tendances',
    kicker: { fr: 'Conférence vedette', en: 'Signature keynote' },
    title:  { fr: 'Au-delà des tendances', en: 'Beyond trends' },
    lede:   {
      fr: "Reprendre SA direction — écouter ce que le corps sait avant que l'algorithme ne l'écrase.",
      en: 'Reclaim YOUR direction — listen to what the body knows before the algorithm drowns it out.',
    },
    duration: { fr: '60 à 90 min', en: '60 to 90 min' },
    format:   { fr: 'Présentiel · Virtuel', en: 'In-person · Virtual' },
    sprig: 'olive' as const,
  },
  {
    key: 'conf.talk.boussole',
    kicker: { fr: 'Conférence signature', en: 'Signature talk' },
    title:  { fr: "L'Ayurveda comme boussole intérieure", en: 'Ayurveda as inner compass' },
    lede:   {
      fr: 'Une cartographie ancestrale pour la vie moderne — comment les éléments lisent ce qui se passe en vous.',
      en: 'An ancestral cartography for modern life — how the elements read what stirs within you.',
    },
    duration: { fr: '90 min · ½ journée', en: '90 min · ½ day' },
    format:   { fr: 'Présentiel · Hybride', en: 'In-person · Hybrid' },
    sprig: 'eucalyptus' as const,
  },
  {
    key: 'conf.talk.cycles',
    kicker: { fr: 'Conférence dédiée', en: 'Dedicated talk' },
    title:  { fr: 'La femme et ses saisons', en: 'A woman and her seasons' },
    lede:   {
      fr: 'Cycles biologiques et saisons intérieures — vivre en alliance avec son corps plutôt qu\'à son insu.',
      en: 'Biological cycles and inner seasons — moving with the body, not around it.',
    },
    duration: { fr: '60 min', en: '60 min' },
    format:   { fr: 'Présentiel', en: 'In-person' },
    sprig: 'laurel' as const,
  },
];

const PRESS_LIST = [
  'Salut Bonjour · TVA',
  'Émission Bien',
  '98.5 FM · Isabelle Maréchal',
  'Journal de Montréal',
  'Journal de Québec',
  'La Presse',
  'Châtelaine',
  'Coup de Pouce',
  'Le Devoir',
  'Radio-Canada',
  'Expo Manger Santé',
  'Pastel Fluo · documentaire Santé Intégrative',
  'Éditions de l\'Homme',
];

const TESTIMONIALS = [
  {
    quote: {
      fr: "Krystine a une voix rare — celle d'une femme qui sait, qui a vu, et qui sait nommer ce que le public n'a jamais osé dire. Notre événement n'a pas été le même après son passage.",
      en: "Krystine has a rare voice — a woman who knows, who has seen, and who can name what the room never dared say. Our event wasn't the same after she walked off stage.",
    },
    by: 'Productrice · Festival Mondial',
  },
  {
    quote: {
      fr: 'Un mélange parfait de rigueur scientifique et de sagesse ancestrale. Notre équipe est repartie avec des outils concrets et une nouvelle perspective.',
      en: 'A perfect blend of scientific rigour and ancestral wisdom. Our team left with practical tools and a new perspective.',
    },
    by: 'Directrice RH · Entreprise québécoise',
  },
  {
    quote: {
      fr: 'Krystine ne fait pas une conférence — elle ouvre un espace. Le public écoute différemment, comme s\'il rentrait à la maison.',
      en: 'Krystine doesn\'t give a talk — she opens a space. The audience listens differently, like coming home.',
    },
    by: 'Animatrice · Salut Bonjour',
  },
];

const PROCESS_STEPS = [
  { n: '01', titleFR: 'Vous nous écrivez',   titleEN: 'You reach out',        bodyFR: "Quelques minutes pour répondre au formulaire ci-dessous. Plus on en sait sur votre vision, mieux on prépare la rencontre.", bodyEN: 'A few minutes to fill the form below. The more we know about your vision, the better we prepare.' },
  { n: '02', titleFR: 'Échange de cadrage',  titleEN: 'Scoping conversation', bodyFR: "L'équipe revient sous 48 h ouvrables avec une proposition. Si elle convient, on planifie un appel pour affiner.", bodyEN: 'The team replies within 48 business hours with a proposal. If it fits, we schedule a call to refine.' },
  { n: '03', titleFR: 'Co-création',         titleEN: 'Co-creation',          bodyFR: "Krystine ajuste l'intervention selon votre public et votre contexte. C'est jamais un module pré-fait.", bodyEN: "Krystine tailors the talk to your audience and context. It's never a pre-baked module." },
  { n: '04', titleFR: 'Sur scène',           titleEN: 'On stage',             bodyFR: 'Le jour J, Krystine arrive ancrée et libre. Le reste appartient au public.', bodyEN: 'On the day, Krystine arrives grounded and free. The rest belongs to the audience.' },
];

const FAQ_ITEMS = [
  { qFR: 'Quels sujets Krystine aborde-t-elle ?', qEN: 'What topics does Krystine cover?',            aFR: "Ayurveda, santé féminine, médecine intégrative, équilibre travail-vie, transmission générationnelle, écologie intérieure. Les conférences sont toujours adaptées au public.", aEN: 'Ayurveda, women\'s health, integrative medicine, work-life balance, generational transmission, inner ecology. Talks are always tailored to the audience.' },
  { qFR: 'Voyage-t-elle à l\'extérieur du Québec ?', qEN: 'Does she travel outside Quebec?',           aFR: 'Oui — Canada, États-Unis, France, Belgique, Suisse selon l\'agenda. Indiquez la ville dans le formulaire et on vous revient avec la faisabilité.', aEN: 'Yes — Canada, USA, France, Belgium, Switzerland depending on schedule. Indicate the city in the form and we\'ll confirm feasibility.' },
  { qFR: 'Quels sont les délais habituels ?',     qEN: 'What are typical timelines?',                 aFR: '8 à 16 semaines avant l\'événement permettent une préparation idéale. Les demandes plus serrées sont étudiées au cas par cas.', aEN: '8 to 16 weeks before the event allows for ideal preparation. Tighter requests are reviewed case by case.' },
  { qFR: 'En quelles langues ?',                  qEN: 'In which languages?',                         aFR: 'Français principalement, anglais sur demande, bilingue possible.', aEN: 'French primarily, English on request, bilingual possible.' },
  { qFR: 'Quelle fourchette tarifaire ?',         qEN: 'What is the typical fee range?',              aFR: "Variable selon le format, la durée, le public et le déplacement. Indiquez votre enveloppe budgétaire dans le formulaire et l'équipe vous revient avec un devis adapté.", aEN: 'Varies by format, duration, audience, and travel. Indicate your budget range in the form and the team will reply with a tailored proposal.' },
];

// ── Hero (glass container for text) + portrait ─────────────────────────────
const Hero: React.FC<{ scrollToForm: () => void }> = ({ scrollToForm }) => {
  const { lang } = useApp();
  const reduce = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);

  // Ken-Burns-lite vertical drift on the portrait as the visitor leaves
  // the hero. Disabled under reduced-motion.
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const portraitY     = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, 60]);
  const portraitScale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [1, 1.06]);

  const lettersWrap = {
    hidden: { opacity: 1 },
    show:   { opacity: 1, transition: { staggerChildren: reduce ? 0 : 0.05, delayChildren: 0.1 } },
  };
  const letter = {
    hidden: reduce ? { opacity: 1, y: 0, filter: 'blur(0px)' } : { opacity: 0, y: 22, filter: 'blur(8px)' },
    show:   { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.75, ease: [0.2, 0.8, 0.2, 1] as const } },
  };

  return (
    <section ref={heroRef} className="relative pt-32 md:pt-40 pb-16 md:pb-24 px-6 overflow-hidden">
      <div className="max-w-[1400px] mx-auto grid lg:grid-cols-[6fr_5fr] gap-10 lg:gap-14 items-center">
        {/* LEFT — text in a glass-parchment container so it pops clean off
            the photographic body background. */}
        {/* No container — text sits directly on the parchment with a
            layered cream halo that gives every glyph enough separation
            from the photo texture. The halo composes of three shadows:
            a tight cream line (2px), a soft cream glow (12px), and a
            deeper warm outer shadow (24px) so the type reads like it's
            embossed into thick paper. `filter: drop-shadow` is NOT used
            — CSS text-shadow is higher fidelity on serif glyphs. */}
        <div className="relative">
          {/* Sprigs kept as ambient decorations */}
          <div aria-hidden className="pointer-events-none absolute -top-3 -left-2 w-10 h-14 opacity-70">
            <Sprig variant="laurel" fill="#8A8F72" />
          </div>
          <div aria-hidden className="pointer-events-none absolute -bottom-3 -right-2 w-10 h-14 opacity-70">
            <Sprig variant="eucalyptus" flip fill="#8A8F72" />
          </div>

          <motion.span
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
            className="inline-block uppercase tracking-[0.42em] text-[11px] md:text-xs font-bold text-[#6B402F] mb-5"
            style={{
              textShadow: '0 1px 0 rgba(244,231,221,0.95), 0 2px 6px rgba(244,231,221,0.8)',
            }}
          >
            · {lang === 'FR' ? 'Fondatrice · Conférencière · Autrice' : 'Founder · Speaker · Author'} ·
          </motion.span>

          <motion.h1
            variants={lettersWrap}
            initial="hidden"
            animate="show"
            aria-label="Krystine St-Laurent"
            className="font-serif uppercase text-[#1E140F] dark:text-[#F4E7DD] leading-[0.95]"
            style={{
              letterSpacing: '0.02em',
              // Strong layered halo — embossed into paper, not printed.
              textShadow:
                '0 1px 0 rgba(244,231,221,0.98), 0 2px 4px rgba(244,231,221,0.9), 0 4px 14px rgba(244,231,221,0.65), 0 8px 28px rgba(58,37,30,0.14)',
            }}
          >
            <span className="block whitespace-nowrap" style={{ fontSize: 'clamp(2.4rem, 5.8vw, 5.4rem)' }}>
              {Array.from('KRYSTINE').map((ch, i) => (
                <motion.span key={i} variants={letter} aria-hidden className="inline-block">
                  {ch}
                </motion.span>
              ))}
            </span>
            <motion.span
              initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
              className="block mt-1 md:mt-2 text-[#4A2818]"
              style={{
                fontSize: 'clamp(1.4rem, 3.3vw, 3.1rem)',
                letterSpacing: '0.08em',
                fontWeight: 400,
                textShadow:
                  '0 1px 0 rgba(244,231,221,0.95), 0 2px 6px rgba(244,231,221,0.8), 0 4px 14px rgba(244,231,221,0.5)',
              }}
            >
              St-Laurent
            </motion.span>
          </motion.h1>

          <motion.div
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
            className="mt-5 md:mt-7 flex flex-wrap items-center gap-2"
          >
            {[
              { fr: '37+ ans', en: '37+ yrs' },
              { fr: '3 livres', en: '3 books' },
              { fr: 'TEDx', en: 'TEDx' },
              { fr: 'Salut Bonjour', en: 'Salut Bonjour' },
            ].map((p, i) => (
              <span key={i}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-[0.25em] font-bold"
                style={{ background: 'rgba(255, 255, 255, 0.55)', border: '1px solid rgba(184,83,47,0.3)', color: '#3A251E' }}
              >
                <span className="w-1 h-1 rounded-full bg-[#B8532F]" />
                {lang === 'FR' ? p.fr : p.en}
              </span>
            ))}
          </motion.div>

          <motion.p
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.05, ease: [0.2, 0.8, 0.2, 1] }}
            className="mt-6 md:mt-8 font-serif italic text-[#2A1A12] text-lg md:text-xl leading-relaxed"
            style={{
              textShadow:
                '0 1px 0 rgba(244,231,221,0.95), 0 2px 6px rgba(244,231,221,0.75), 0 0 18px rgba(244,231,221,0.55)',
            }}
          >
            <EditableText
              fieldKey="conferenciere.hero.lede"
              defaultValue={lang === 'FR'
                ? 'Une voix rare — où la rigueur du clinicien rencontre la sagesse millénaire. Chaque conférence est cousue main pour le public qui l\'attend.'
                : 'A rare voice — where clinician\'s rigour meets millennial wisdom. Every talk is hand-tailored for the audience awaiting it.'}
              multiline
            />
          </motion.p>

          <motion.div
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.2, ease: [0.2, 0.8, 0.2, 1] }}
            className="mt-7 flex flex-wrap items-center gap-3"
          >
            <button
              type="button"
              onClick={scrollToForm}
              className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-[12px] uppercase font-semibold tracking-[0.28em] transition-[filter,transform] duration-300 hover:[filter:brightness(1.06)] active:scale-[0.98]"
              style={{
                background: '#3A251E', color: '#F4E7DD',
                border: '1px solid rgba(184,83,47,0.55)',
                boxShadow: '0 12px 28px rgba(58,37,30,0.28)',
              }}
            >
              {lang === 'FR' ? 'Réserver Krystine' : 'Book Krystine'}
              <i className="fa-solid fa-arrow-down text-[10px] transition-transform duration-300 group-hover:translate-y-0.5" />
            </button>
            <Link
              to="/medias#tv"
              className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-[12px] uppercase font-semibold tracking-[0.28em] transition-colors duration-300 hover:bg-[#3A251E]/5"
              style={{ background: 'transparent', color: '#3A251E', border: '1px solid rgba(58,37,30,0.5)' }}
            >
              <i className="fa-solid fa-play text-[10px] text-[#B8532F]" />
              {lang === 'FR' ? 'Voir une conférence' : 'Watch a talk'}
            </Link>
          </motion.div>
        </div>

        {/* RIGHT — portrait card. Using ASSETS.founder (proper portrait)
            with EditableImage so admin can swap. Ken-Burns drift on scroll. */}
        <motion.div
          initial={reduce ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
          className="relative mx-auto lg:mx-0 w-full max-w-[460px]"
        >
          <div className="relative aspect-[4/5] rounded-[28px] overflow-hidden shadow-[0_22px_60px_rgba(58,37,30,0.28)]"
            style={{ border: '1px solid rgba(184,83,47,0.35)' }}
          >
            <motion.div className="absolute inset-0" style={{ y: portraitY, scale: portraitScale }}>
              <EditableImage
                fieldKey="conferenciere.hero.portrait"
                defaultSrc={ASSETS.founder}
                className="absolute inset-0"
                alt="Krystine St-Laurent"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-[#3A251E]/40 via-transparent to-transparent pointer-events-none" />
              </EditableImage>
            </motion.div>
            <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 pointer-events-none">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#3A251E]/80 backdrop-blur text-[#F4D49A] text-[10px] uppercase tracking-[0.3em] font-bold">
                <span className="relative flex w-1.5 h-1.5">
                  <span className="absolute inset-0 rounded-full bg-[#B8532F] animate-ping" />
                  <span className="relative w-1.5 h-1.5 rounded-full bg-[#B8532F]" />
                </span>
                {lang === 'FR' ? 'En conférence' : 'On stage'}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// ── Press Marquee ──────────────────────────────────────────────────────────
const PressMarquee: React.FC = () => {
  const { lang } = useApp();
  const reduce = useReducedMotion();
  const list = [...PRESS_LIST, ...PRESS_LIST];
  return (
    <section className="relative py-10 md:py-14 overflow-hidden">
      <p className="text-center text-[10px] uppercase tracking-[0.4em] font-bold text-[#6B402F] mb-6">
        · {lang === 'FR' ? 'Sur scène · médias · institutions' : 'Stages · media · institutions'} ·
      </p>
      <div
        className="relative w-full overflow-hidden press-marquee-mask"
        style={{
          maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
        }}
      >
        <div className={`flex gap-12 md:gap-16 whitespace-nowrap ${reduce ? '' : 'press-marquee-track'}`}>
          {list.map((p, i) => (
            <span key={i} className="font-serif italic text-[#3A251E]/65 dark:text-white/55 text-xl md:text-2xl flex-shrink-0">
              {p}
            </span>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes press-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .press-marquee-track {
          animation: press-marquee 38s linear infinite;
          will-change: transform;
        }
        .press-marquee-mask:hover .press-marquee-track { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) { .press-marquee-track { animation: none; } }
      `}</style>
    </section>
  );
};

// ── Story (bio narrative) ──────────────────────────────────────────────────
const Story: React.FC = () => {
  const { lang } = useApp();
  const t = CONTENT[lang].founder;
  const reduce = useReducedMotion();

  const paragraphs = [
    { key: 'krystine.story.p1', value: t.story.p1 },
    { key: 'krystine.story.p2', value: t.story.p2 },
    { key: 'krystine.story.p4', value: t.story.p4 },
    { key: 'krystine.story.p5', value: t.story.p5 },
  ];

  return (
    <section className="relative py-16 md:py-24 px-6">
      <div className="max-w-[1200px] mx-auto">
        <EditorialSectionHeader
          kicker={lang === 'FR' ? 'Chapitre 01 · Son histoire' : 'Chapter 01 · Her story'}
          title={(
            <>
              <EditableText fieldKey="krystine.story.kicker" defaultValue={t.story.title} as="span" />
            </>
          )}
          lede={(
            <EditableText fieldKey="krystine.story.subtitle" defaultValue={t.story.subtitle} as="span" multiline />
          )}
          sprigs={['olive', 'laurel']}
          divider="laurel"
          className="mb-10 md:mb-14"
        />

        {/* Pull quote — no container. Large serif italic with a layered
            cream halo so the type reads as embossed on paper. */}
        <motion.blockquote
          initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
          className="mb-14 md:mb-20 max-w-4xl mx-auto px-4 text-center"
        >
          <p
            className="font-serif italic text-2xl md:text-4xl lg:text-5xl leading-[1.2] text-[#1E140F] dark:text-white"
            style={{
              textShadow:
                '0 1px 0 rgba(244,231,221,0.95), 0 2px 6px rgba(244,231,221,0.8), 0 4px 16px rgba(244,231,221,0.55)',
            }}
          >
            <span className="text-[#B8532F]/70 mr-1">&ldquo;</span>
            <EditableText fieldKey="krystine.story.quote" defaultValue={t.story.p3} multiline />
            <span className="text-[#B8532F]/70 ml-1">&rdquo;</span>
          </p>
        </motion.blockquote>

        {/* 4 paragraphs, numbered */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-7">
          {paragraphs.map((para, i) => (
            <motion.article
              key={para.key}
              initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.75, delay: reduce ? 0 : (i % 2) * 0.1, ease: [0.2, 0.8, 0.2, 1] }}
              className="relative rounded-[24px] p-6 md:p-8"
              style={{
                background: i % 2 === 0 ? '#F4E7DD' : '#ECD6BE',
                border: `1px solid ${i % 2 === 0 ? 'rgba(184,83,47,0.20)' : 'rgba(139,103,74,0.30)'}`,
                boxShadow: i % 2 === 0
                  ? '0 8px 20px rgba(107,74,47,0.08), inset 0 1px 0 rgba(255,255,255,0.5)'
                  : '0 10px 24px rgba(107,74,47,0.14), inset 0 1px 0 rgba(244,231,221,0.55)',
              }}
            >
              <span className="block font-serif italic text-[#B8532F] text-3xl md:text-4xl mb-3">
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="text-[#3A251E]/85 leading-relaxed font-serif">
                <EditableText fieldKey={para.key} defaultValue={para.value} multiline />
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};

// ── Animated stat counter (string-value aware) ─────────────────────────────
const AnimatedStat: React.FC<{ value: string; sub: string; label: string; fieldKeyBase: string }> = ({ value, sub, label, fieldKeyBase }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();
  // "37+" → parseable "37", suffix "+". Non-numeric values render as-is.
  const match = value.match(/^(\d+)(.*)$/);
  const target = match ? parseInt(match[1], 10) : null;
  const suffix = match ? match[2] : '';
  const [display, setDisplay] = useState(target == null || reduce ? value : `0${suffix}`);

  useEffect(() => {
    if (!inView || target == null || reduce) return;
    const duration = 1200;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(`${Math.round(target * eased)}${suffix}`);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, suffix, reduce]);

  return (
    <div
      ref={ref}
      className="rounded-[22px] p-6 md:p-7 text-center transition-all duration-500 hover:-translate-y-0.5"
      style={{
        background: '#F4E7DD',
        border: '1px solid rgba(184,83,47,0.22)',
        boxShadow: '0 8px 22px rgba(107,74,47,0.10), inset 0 1px 0 rgba(255,255,255,0.5)',
      }}
    >
      <div className="font-serif text-[#B8532F] leading-none mb-3" style={{ fontSize: 'clamp(2.2rem, 4.2vw, 3.4rem)' }}>
        {target == null ? (
          <EditableText fieldKey={`${fieldKeyBase}.value`} defaultValue={value} as="span" />
        ) : (
          display
        )}
      </div>
      <div className="text-[10px] md:text-[11px] uppercase tracking-[0.3em] font-bold text-[#3A251E] mb-1">
        <EditableText fieldKey={`${fieldKeyBase}.sub`} defaultValue={sub} as="span" />
      </div>
      <div className="text-xs text-[#6B402F]/85 font-serif italic">
        <EditableText fieldKey={`${fieldKeyBase}.label`} defaultValue={label} as="span" />
      </div>
    </div>
  );
};

// ── Stats row ──────────────────────────────────────────────────────────────
const StatsRow: React.FC = () => {
  const { lang } = useApp();
  const t = CONTENT[lang].founder;
  return (
    <section className="relative px-6 pb-8 md:pb-12">
      <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
        {t.stats.map((stat, i) => (
          <AnimatedStat
            key={i}
            value={stat.value}
            sub={stat.sub}
            label={stat.label}
            fieldKeyBase={`krystine.stats.${i}`}
          />
        ))}
      </div>
    </section>
  );
};

// ── Mission card (L'Art de vivre conscient) ────────────────────────────────
const MissionCard: React.FC = () => {
  const { lang } = useApp();
  const t = CONTENT[lang].founder;
  const reduce = useReducedMotion();
  return (
    <section className="relative py-12 md:py-16 px-6">
      <motion.div
        initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
        className="max-w-[1200px] mx-auto rounded-[28px] overflow-hidden shadow-[0_22px_50px_rgba(58,37,30,0.20)]"
        style={{ border: '1px solid rgba(184,83,47,0.25)' }}
      >
        <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr]">
          <div className="relative h-72 md:h-auto min-h-[360px] overflow-hidden">
            <EditableImage
              fieldKey="krystine.mission.image"
              defaultSrc={ASSETS.shopBg}
              className="absolute inset-0"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#3A251E]/35 to-[#3A251E]/90 pointer-events-none" />
            </EditableImage>
          </div>
          <div className="p-10 md:p-14 text-[#F4E7DD] flex flex-col justify-center" style={{ background: '#3A251E' }}>
            <span className="text-[#F4D49A] uppercase tracking-[0.3em] text-[10px] font-bold block mb-5">
              <EditableText
                fieldKey="krystine.mission.kicker"
                defaultValue={lang === 'FR' ? "L'Art de vivre conscient" : 'The Art of Conscious Living'}
              />
            </span>
            <h2 className="font-serif text-3xl md:text-4xl leading-[1.2] mb-6">
              <EditableText fieldKey="krystine.mission.title" defaultValue={t.bio.mission} multiline />
            </h2>
            <p className="text-[#F4E7DD]/75 leading-relaxed mb-8 font-serif italic">
              <EditableText fieldKey="krystine.mission.body" defaultValue={t.bio.outro} multiline />
            </p>
            <div className="flex items-center gap-4 text-[#F4D49A]/70 uppercase tracking-[0.25em] text-[10px] font-bold">
              <span className="h-px w-10 bg-[#B8532F]/60" />
              <EditableText fieldKey="krystine.mission.expert" defaultValue={t.bio.expert} />
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

// ── Signature Talks ────────────────────────────────────────────────────────
const SignatureTalks: React.FC = () => {
  const { lang } = useApp();
  const reduce = useReducedMotion();
  return (
    <section className="relative py-16 md:py-24 px-6">
      <div className="max-w-[1400px] mx-auto">
        <EditorialSectionHeader
          kicker={lang === 'FR' ? 'Chapitre 02 · Conférences signature' : 'Chapter 02 · Signature talks'}
          title={lang === 'FR' ? 'Trois portes d\'entrée' : 'Three doors in'}
          lede={lang === 'FR'
            ? 'Trois trames maîtresses. Chacune adaptée à votre public, votre temps, votre lieu.'
            : 'Three master frames. Each tailored to your audience, your time, your room.'}
          sprigs={['olive', 'wheat']}
          divider="bloom"
          className="mb-12 md:mb-16"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {SIGNATURE_TALKS.map((talk, i) => (
            <motion.article
              key={talk.key}
              initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 36 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{
                type: 'spring' as const, stiffness: 160, damping: 20, mass: 0.9,
                delay: reduce ? 0 : i * 0.08,
                opacity: { duration: 0.5, delay: reduce ? 0 : i * 0.08 },
              }}
              whileHover={reduce ? undefined : { y: -5, scale: 1.012, transition: { type: 'spring' as const, stiffness: 260, damping: 22 } }}
              className="relative rounded-[24px] p-6 md:p-7 group flex flex-col"
              style={{
                background: i === 1 ? '#ECD6BE' : '#F4E7DD',
                border: `1px solid ${i === 1 ? 'rgba(139,103,74,0.32)' : 'rgba(184,83,47,0.20)'}`,
                boxShadow: i === 1
                  ? '0 12px 28px rgba(107,74,47,0.16), inset 0 1px 0 rgba(244,231,221,0.55)'
                  : '0 10px 24px rgba(107,74,47,0.10), inset 0 1px 0 rgba(255,255,255,0.45)',
              }}
            >
              <div className="absolute -top-2 -right-2 w-8 h-12 opacity-65 pointer-events-none" aria-hidden>
                <Sprig variant={talk.sprig} fill="#8A8F72" />
              </div>
              <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#B8532F] mb-3">
                {lang === 'FR' ? talk.kicker.fr : talk.kicker.en}
              </span>
              <h3 className="font-serif text-2xl md:text-[1.65rem] leading-[1.15] text-[#3A251E] mb-3 transition-colors duration-300 group-hover:text-[#B8532F]">
                {lang === 'FR' ? talk.title.fr : talk.title.en}
              </h3>
              <p className="font-serif italic text-[#3A251E]/75 leading-relaxed text-[15px] mb-5 flex-1">
                {lang === 'FR' ? talk.lede.fr : talk.lede.en}
              </p>
              <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.25em] font-bold text-[#6B402F] mt-auto pt-4 border-t border-[#B8532F]/15">
                <span className="inline-flex items-center gap-1.5">
                  <i className="fa-regular fa-clock text-[#B8532F]" />
                  {lang === 'FR' ? talk.duration.fr : talk.duration.en}
                </span>
                <span className="w-1 h-1 rounded-full bg-[#B8532F]/50" />
                <span className="inline-flex items-center gap-1.5">
                  <i className="fa-solid fa-map-pin text-[#B8532F]" />
                  {lang === 'FR' ? talk.format.fr : talk.format.en}
                </span>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};

// ── Testimonials ───────────────────────────────────────────────────────────
const Testimonials: React.FC = () => {
  const { lang } = useApp();
  const reduce = useReducedMotion();
  const [tIndex, setTIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || reduce) return;
    const id = window.setInterval(() => setTIndex(i => (i + 1) % TESTIMONIALS.length), 8000);
    return () => window.clearInterval(id);
  }, [paused, reduce]);

  return (
    <section className="relative py-14 md:py-20 px-6">
      <div className="max-w-[1200px] mx-auto">
        <div
          className="relative rounded-[28px] px-6 md:px-12 py-12 md:py-16 text-center overflow-hidden"
          style={{
            background: 'rgba(244,231,221,0.7)',
            border: '1px solid rgba(184,83,47,0.20)',
            boxShadow: '0 10px 30px rgba(107,74,47,0.10)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
        >
          <i className="fa-solid fa-quote-left text-[#B8532F]/40 text-3xl mb-5" />
          <div className="relative min-h-[140px] md:min-h-[120px]">
            {TESTIMONIALS.map((tm, i) => (
              <motion.blockquote
                key={i}
                initial={false}
                animate={{ opacity: i === tIndex ? 1 : 0, y: i === tIndex ? 0 : 6 }}
                transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
                className="absolute inset-0 flex flex-col justify-center"
                style={{ pointerEvents: i === tIndex ? 'auto' : 'none' }}
              >
                <p className="font-serif italic text-[#3A251E] dark:text-white text-lg md:text-xl leading-relaxed max-w-3xl mx-auto">
                  « {lang === 'FR' ? tm.quote.fr : tm.quote.en} »
                </p>
                <p className="mt-5 text-[10px] uppercase tracking-[0.35em] font-bold text-[#6B402F]">{tm.by}</p>
              </motion.blockquote>
            ))}
          </div>
          <div className="mt-8 inline-flex items-center gap-2.5">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${lang === 'FR' ? 'Témoignage' : 'Testimonial'} ${i + 1}`}
                onClick={() => { setTIndex(i); setPaused(true); }}
                className="block transition-all duration-300"
                style={{
                  width: i === tIndex ? 26 : 8,
                  height: 8,
                  borderRadius: 999,
                  background: i === tIndex ? '#B8532F' : 'rgba(184,83,47,0.3)',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// ── Process Timeline ───────────────────────────────────────────────────────
const ProcessTimeline: React.FC = () => {
  const { lang } = useApp();
  const reduce = useReducedMotion();
  return (
    <section className="relative py-16 md:py-24 px-6">
      <div className="max-w-[1200px] mx-auto">
        <EditorialSectionHeader
          kicker={lang === 'FR' ? 'Chapitre 03 · Comment ça se passe' : 'Chapter 03 · How it unfolds'}
          title={lang === 'FR' ? 'De la demande à la scène' : 'From request to stage'}
          sprigs={['eucalyptus', 'laurel']}
          divider="compass"
          className="mb-12 md:mb-16"
        />
        <div className="relative grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-4">
          <div className="hidden md:block absolute top-8 left-[12%] right-[12%] h-px bg-gradient-to-r from-[#B8532F]/0 via-[#B8532F]/50 to-[#B8532F]/0" />
          {PROCESS_STEPS.map((step, i) => (
            <motion.div
              key={i}
              initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.7, delay: reduce ? 0 : i * 0.1, ease: [0.2, 0.8, 0.2, 1] }}
              className="relative text-center md:text-left"
            >
              <div className="relative mx-auto md:mx-0 mb-5 inline-flex">
                <span
                  className="relative z-10 inline-flex items-center justify-center w-16 h-16 rounded-full font-serif text-xl"
                  style={{
                    background: '#F4E7DD',
                    border: '1.5px solid #B8532F',
                    color: '#3A251E',
                    boxShadow: '0 8px 22px rgba(107,74,47,0.15)',
                  }}
                >
                  {step.n}
                </span>
              </div>
              <h3 className="font-serif text-xl md:text-[1.35rem] text-[#3A251E] dark:text-white mb-2 leading-snug">
                {lang === 'FR' ? step.titleFR : step.titleEN}
              </h3>
              <p className="font-serif italic text-[#3A251E]/70 dark:text-white/70 text-sm md:text-[15px] leading-relaxed">
                {lang === 'FR' ? step.bodyFR : step.bodyEN}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ── FAQ Accordion ──────────────────────────────────────────────────────────
const FAQ: React.FC = () => {
  const { lang } = useApp();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="relative py-16 md:py-24 px-6">
      <div className="max-w-[1200px] mx-auto">
        <EditorialSectionHeader
          kicker={lang === 'FR' ? 'Chapitre 05 · Questions courantes' : 'Chapter 05 · Common questions'}
          title={lang === 'FR' ? 'Avant d\'envoyer' : 'Before you send'}
          sprigs={['dandelion', 'wheat']}
          divider="laurel"
          className="mb-10 md:mb-14"
        />
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = open === i;
            return (
              <motion.div
                key={i}
                initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, delay: reduce ? 0 : i * 0.05, ease: [0.2, 0.8, 0.2, 1] }}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: isOpen ? '#F4E7DD' : 'rgba(244,231,221,0.55)',
                  border: `1px solid ${isOpen ? 'rgba(184,83,47,0.4)' : 'rgba(184,83,47,0.18)'}`,
                  boxShadow: isOpen ? '0 10px 28px rgba(107,74,47,0.12)' : '0 4px 14px rgba(107,74,47,0.05)',
                  transition: 'background 250ms ease, border-color 250ms ease, box-shadow 250ms ease',
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 md:px-6 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-serif text-[#3A251E] dark:text-white text-base md:text-lg leading-snug">
                    {lang === 'FR' ? item.qFR : item.qEN}
                  </span>
                  <span
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300"
                    style={{
                      background: isOpen ? '#B8532F' : 'rgba(184,83,47,0.12)',
                      color: isOpen ? '#F4E7DD' : '#B8532F',
                      transform: isOpen ? 'rotate(45deg)' : 'rotate(0)',
                    }}
                  >
                    <i className="fa-solid fa-plus text-[11px]" />
                  </span>
                </button>
                <motion.div
                  initial={false}
                  animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
                  transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="px-5 md:px-6 pb-5 md:pb-6">
                    <p className="font-serif italic text-[#3A251E]/75 dark:text-white/75 leading-relaxed text-[15px]">
                      {lang === 'FR' ? item.aFR : item.aEN}
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// ── Événements (curated + admin-published) ─────────────────────────────────
const EventsSection: React.FC = () => {
  const { lang } = useApp();
  const reduce = useReducedMotion();
  const [extraEvents, setExtraEvents] = useState<EventDoc[]>([]);
  useEffect(() => {
    getEvents().then(setExtraEvents).catch(() => setExtraEvents([]));
  }, []);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 60 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const upcoming = React.useMemo(() => getUpcomingEvents(), [tick]);
  const extraUpcoming = extraEvents.filter(ev => new Date(ev.date) >= new Date()).slice(0, 6);

  return (
    <motion.section
      id="events"
      initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
      className="relative py-16 md:py-24 px-6 scroll-mt-32"
    >
      <div className="max-w-[1200px] mx-auto">
        <EditorialSectionHeader
          kicker={lang === 'FR' ? 'Chapitre 06 · Où on se rejoint · Live' : 'Chapter 06 · Where we meet · Live'}
          title={lang === 'FR' ? 'Événements & Conférences' : 'Events & Conferences'}
          lede={lang === 'FR'
            ? 'Rencontres en direct, retraites, lancements — et une tournée en préparation.'
            : 'Live gatherings, retreats, launches — and a tour in the making.'}
          sprigs={['dandelion', 'wheat']}
          divider="compass"
          className="mb-10 md:mb-14"
        />

        <LiveEventsSection events={upcoming} />

        {extraUpcoming.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
            {extraUpcoming.map(ev => {
              const dateObj = new Date(ev.date);
              const dateStr = dateObj.toLocaleDateString(lang === 'FR' ? 'fr-CA' : 'en-CA', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              });
              return (
                <div key={ev.id}
                  className="group relative rounded-2xl border border-[#3A251E]/10 dark:border-white/10 bg-[#F4E7DD] dark:bg-[#3A251E]/60 p-6 transition-all duration-500 hover:-translate-y-1 hover:border-[#B8532F]/50 hover:shadow-lg"
                >
                  <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#B8532F] block mb-3">{dateStr}</span>
                  <h3 className="font-serif text-xl md:text-2xl text-[#3A251E] dark:text-white mb-1 group-hover:text-[#B8532F] transition-colors">{ev.title}</h3>
                  {ev.subtitle && <p className="text-sm font-serif italic text-[#3A251E]/60 dark:text-white/60 mb-3">{ev.subtitle}</p>}
                  {ev.location && (
                    <p className="text-sm text-[#3A251E]/65 dark:text-white/65 flex items-center gap-2 mb-3">
                      <i className="fa-solid fa-map-marker-alt text-[#B8532F] text-[11px]" />{ev.location}
                    </p>
                  )}
                  {ev.description && (
                    <p className="text-sm text-[#3A251E]/70 dark:text-white/70 leading-relaxed mb-4 line-clamp-3">{ev.description}</p>
                  )}
                  {ev.registrationLink && (
                    <a href={ev.registrationLink} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-[#3A251E] dark:bg-[#B8532F] text-white dark:text-[#3A251E] px-5 py-2 rounded-full font-bold uppercase tracking-widest text-[11px] hover:bg-[#B8532F] hover:text-[#3A251E] transition-colors"
                    >
                      {lang === 'FR' ? "S'inscrire" : 'Register'}
                      <i className="fa-solid fa-arrow-right text-[9px]" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.section>
  );
};

// ── Correspondence (newsletter) ────────────────────────────────────────────
const Correspondence: React.FC = () => {
  const { lang } = useApp();
  const t = CONTENT[lang].founder;
  const reduce = useReducedMotion();
  return (
    <motion.section
      initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
      className="relative py-14 md:py-20 px-6"
    >
      <div className="max-w-[1200px] mx-auto rounded-[28px] border border-[#B8532F]/22 bg-[rgba(244,231,221,0.85)] px-6 md:px-12 py-14 md:py-20 text-center"
        style={{ boxShadow: '0 10px 30px rgba(107,74,47,0.10)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      >
        <span className="text-[#B8532F] uppercase tracking-[0.35em] text-[11px] font-bold block mb-4">
          <EditableText
            fieldKey="krystine.newsletter.kicker"
            defaultValue={lang === 'FR' ? 'Une correspondance' : 'A correspondence'}
          />
        </span>
        <h3 className="font-serif text-3xl md:text-5xl leading-tight text-[#1E140F]">
          <EditableText fieldKey="krystine.newsletter.title" defaultValue={t.newsletter.title} />
        </h3>
        <h4 className="font-serif italic text-2xl md:text-4xl text-[#B8532F] leading-tight mb-10">
          <EditableText fieldKey="krystine.newsletter.subtitle" defaultValue={t.newsletter.subtitle} />
        </h4>
        <p className="text-[#3A251E]/70 leading-relaxed max-w-xl mx-auto mb-10 font-serif italic">
          <EditableText fieldKey="krystine.newsletter.intro" defaultValue={t.newsletter.intro} multiline />
        </p>

        <ul className="grid grid-cols-1 md:grid-cols-3 border-y border-[#3A251E]/10 mb-12 max-w-4xl mx-auto">
          {t.newsletter.list.map((item, i) => (
            <motion.li
              key={i}
              initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.55, delay: reduce ? 0 : i * 0.08, ease: [0.2, 0.8, 0.2, 1] }}
              className={`py-6 px-6 font-serif italic text-[#3A251E]/75 ${
                i < t.newsletter.list.length - 1 ? 'md:border-r border-[#3A251E]/10' : ''
              }`}
            >
              <EditableText fieldKey={`krystine.newsletter.list.${i}`} defaultValue={item} multiline />
            </motion.li>
          ))}
        </ul>

        <NewsletterSignup
          source="krystine"
          variant="light"
          ctaLabel={t.newsletter.cta}
          placeholder={lang === 'FR' ? 'Votre adresse courriel' : 'Your email address'}
          className="max-w-xl mx-auto"
        />
        <p className="text-[#3A251E]/65 text-sm italic mt-6">
          <EditableText fieldKey="krystine.newsletter.outro" defaultValue={t.newsletter.outro} multiline />
        </p>
      </div>
    </motion.section>
  );
};

// ── Closing quote ──────────────────────────────────────────────────────────
const Closing: React.FC = () => {
  const { lang } = useApp();
  const t = CONTENT[lang].founder;
  const reduce = useReducedMotion();
  return (
    <motion.section
      initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
      className="relative py-16 md:py-24 px-6 text-center"
    >
      <div className="max-w-4xl mx-auto">
        <span
          className="text-[#B8532F] uppercase tracking-[0.35em] text-[11px] font-bold block mb-8"
          style={{ textShadow: '0 1px 0 rgba(244,231,221,0.9), 0 2px 6px rgba(244,231,221,0.7)' }}
        >
          <EditableText fieldKey="krystine.closing.title" defaultValue={t.footerBio.title} />
        </span>
        <p
          className="font-serif italic text-2xl md:text-4xl lg:text-[2.6rem] leading-[1.26] text-[#1E140F]"
          style={{
            textShadow:
              '0 1px 0 rgba(244,231,221,0.95), 0 2px 6px rgba(244,231,221,0.8), 0 4px 16px rgba(244,231,221,0.55)',
          }}
        >
          <EditableText fieldKey="krystine.closing.text" defaultValue={t.footerBio.text} multiline />
        </p>
        <div className="flex items-center justify-center gap-6 mt-10">
          <span className="h-px w-16 bg-[#B8532F]/50" />
          <span
            className="uppercase tracking-[0.35em] text-[11px] font-bold text-[#B8532F]"
            style={{ textShadow: '0 1px 0 rgba(244,231,221,0.9), 0 2px 6px rgba(244,231,221,0.7)' }}
          >
            Krystine St-Laurent
          </span>
          <span className="h-px w-16 bg-[#B8532F]/50" />
        </div>
      </div>
    </motion.section>
  );
};

// ── Sticky bottom CTA ──────────────────────────────────────────────────────
const StickyCTA: React.FC<{ scrollToForm: () => void }> = ({ scrollToForm }) => {
  const { lang } = useApp();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <motion.div
      initial={false}
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 24 }}
      transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30"
      style={{ pointerEvents: visible ? 'auto' : 'none' }}
    >
      <button
        type="button"
        onClick={scrollToForm}
        className="group inline-flex items-center gap-3 px-6 md:px-8 py-3 md:py-3.5 rounded-full text-[11px] md:text-[12px] uppercase font-semibold tracking-[0.28em] transition-[filter,transform] duration-300 hover:[filter:brightness(1.06)] active:scale-[0.98]"
        style={{
          background: '#3A251E',
          color: '#F4E7DD',
          border: '1px solid rgba(184,83,47,0.6)',
          boxShadow: '0 16px 36px rgba(58,37,30,0.32)',
        }}
      >
        <i className="fa-solid fa-paper-plane text-[10px] text-[#F4D49A]" />
        {lang === 'FR' ? 'Réserver Krystine' : 'Book Krystine'}
        <i className="fa-solid fa-arrow-right text-[10px] text-[#F4D49A] transition-transform duration-300 group-hover:translate-x-1" />
      </button>
    </motion.div>
  );
};

// ── Page ───────────────────────────────────────────────────────────────────
const ConferencierePage: React.FC = () => {
  const { lang, user, member } = useApp();
  const location = useLocation();

  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Pre-fill from signed-in member.
  useEffect(() => {
    if (!user) return;
    setForm(prev => ({
      ...prev,
      name: prev.name || member?.displayName || user.displayName || '',
      email: prev.email || user.email || '',
      phone: prev.phone || member?.phone || '',
    }));
  }, [user, member]);

  // If the visitor arrives via /conferenciere, scroll to the form a beat
  // after mount (gives images/fonts time to settle). /krystine keeps the
  // natural top-of-page entry so the bio narrative leads.
  useEffect(() => {
    if (location.pathname !== '/conferenciere') return;
    const id = window.setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 500);
    return () => window.clearTimeout(id);
  }, [location.pathname]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!form.name.trim() || !form.email.trim()) {
      setErr(lang === 'FR' ? 'Nom et courriel sont requis.' : 'Name and email are required.');
      return;
    }
    setSending(true);
    try {
      await addBookingRequest({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        organization: form.organization.trim() || undefined,
        organizationUrl: form.organizationUrl.trim() || undefined,
        city: form.city.trim() || undefined,
        region: form.region.trim() || undefined,
        interventionKind: form.interventionKind,
        format: form.format,
        audienceType: form.audienceType,
        audienceSize: form.audienceSize,
        duration: form.duration,
        preferredDate: form.preferredDate.trim() || undefined,
        budgetRange: form.budgetRange,
        languagePref: form.languagePref,
        message: form.message.trim() || undefined,
        source: 'conferenciere',
        tags: [
          'booking-conferenciere',
          `kind-${form.interventionKind}`,
          `format-${form.format}`,
          `audience-${form.audienceType}`,
          `budget-${form.budgetRange}`,
        ],
      });
      setSent(true);
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    } catch (e: any) {
      setErr(e?.message || (lang === 'FR' ? 'Une erreur est survenue.' : 'Something went wrong.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="relative min-h-screen dark:bg-[#2E1A14] overflow-x-hidden">
      <Hero scrollToForm={scrollToForm} />
      <PressMarquee />
      <Story />
      <StatsRow />
      <MissionCard />
      <SignatureTalks />
      <Testimonials />
      <ProcessTimeline />

      {/* ── Booking Form ────────────────────────────────────────────────── */}
      <section ref={formRef} className="relative py-16 md:py-24 px-6 scroll-mt-24">
        <div className="max-w-[1200px] mx-auto">
          <EditorialSectionHeader
            kicker={lang === 'FR' ? 'Chapitre 04 · Réserver Krystine' : 'Chapter 04 · Book Krystine'}
            title={lang === 'FR' ? 'Faire une demande' : 'Submit a request'}
            lede={lang === 'FR'
              ? 'Quelques questions — cela aide l\'équipe à préparer une proposition juste. Réponse sous 48 h ouvrables.'
              : 'A few questions — it helps the team prepare a proper proposal. Reply within 48 business hours.'}
            sprigs={['olive', 'eucalyptus']}
            divider="bloom"
            className="mb-10 md:mb-14"
          />

          <div
            className="relative rounded-[28px] px-5 md:px-10 py-8 md:py-12 overflow-hidden"
            style={{
              background: 'rgba(244,231,221,0.85)',
              border: '1px solid rgba(184,83,47,0.22)',
              boxShadow: '0 14px 40px rgba(107,74,47,0.10)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
          >
            <div className="pointer-events-none absolute top-4 right-4 w-8 h-12 opacity-50" aria-hidden>
              <Sprig variant="olive" fill="#8A8F72" />
            </div>

            {sent ? (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 180, damping: 18 }}
                className="text-center py-10"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#B8532F]/15 text-[#B8532F] mb-5">
                  <i className="fa-solid fa-check text-2xl" />
                </div>
                <h3 className="font-serif text-2xl md:text-3xl text-[#3A251E] dark:text-white mb-3">
                  {lang === 'FR' ? 'Demande envoyée.' : 'Request sent.'}
                </h3>
                <p className="font-serif italic text-[#3A251E]/70 dark:text-white/70 max-w-md mx-auto">
                  {lang === 'FR'
                    ? "Merci. L'équipe vous revient sous 48 h ouvrables avec une proposition adaptée."
                    : 'Thank you. The team will reply within 48 business hours with a tailored proposal.'}
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-7">
                <FormSection step="1" titleFR="Qui êtes-vous ?" titleEN="Who are you?">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <Input value={form.name} onChange={v => set('name', v)} placeholder={lang === 'FR' ? 'Prénom et nom *' : 'Full name *'} required />
                    <Input type="email" value={form.email} onChange={v => set('email', v)} placeholder={lang === 'FR' ? 'Courriel *' : 'Email *'} required />
                    <Input type="tel" value={form.phone} onChange={v => set('phone', v)} placeholder={lang === 'FR' ? 'Téléphone' : 'Phone'} />
                    <Input value={form.organization} onChange={v => set('organization', v)} placeholder={lang === 'FR' ? 'Organisation / Entreprise' : 'Organization / Company'} />
                    <Input type="url" value={form.organizationUrl} onChange={v => set('organizationUrl', v)} placeholder={lang === 'FR' ? "Site web de l'organisation" : 'Organization website'} className="md:col-span-2" />
                  </div>
                </FormSection>

                <FormSection step="2" titleFR="Quel type d'intervention ?" titleEN="What type of intervention?">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <LabelledSelect label={lang === 'FR' ? "Type d'intervention" : 'Intervention type'} value={form.interventionKind} onChange={v => set('interventionKind', v as InterventionKind)} options={INTERVENTION_OPTIONS.map(o => ({ id: o.id, label: lang === 'FR' ? o.fr : o.en }))} />
                    <LabelledSelect label={lang === 'FR' ? 'Format' : 'Format'} value={form.format} onChange={v => set('format', v as EventFormat)} options={FORMAT_OPTIONS.map(o => ({ id: o.id, label: lang === 'FR' ? o.fr : o.en }))} />
                    <LabelledSelect label={lang === 'FR' ? 'Durée souhaitée' : 'Desired duration'} value={form.duration} onChange={v => set('duration', v as InterventionDuration)} options={DURATION_OPTIONS.map(o => ({ id: o.id, label: lang === 'FR' ? o.fr : o.en }))} />
                    <LabelledSelect label={lang === 'FR' ? 'Langue de prestation' : 'Language'} value={form.languagePref} onChange={v => set('languagePref', v as LangPref)} options={LANG_OPTIONS.map(o => ({ id: o.id, label: lang === 'FR' ? o.fr : o.en }))} />
                  </div>
                </FormSection>

                <FormSection step="3" titleFR="Public et contexte" titleEN="Audience and context">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <LabelledSelect label={lang === 'FR' ? 'Type de public' : 'Audience type'} value={form.audienceType} onChange={v => set('audienceType', v as AudienceType)} options={AUDIENCE_OPTIONS.map(o => ({ id: o.id, label: lang === 'FR' ? o.fr : o.en }))} />
                    <LabelledSelect label={lang === 'FR' ? 'Taille approximative' : 'Approximate size'} value={form.audienceSize} onChange={v => set('audienceSize', v as AudienceSize)} options={SIZE_OPTIONS.map(o => ({ id: o.id, label: lang === 'FR' ? o.fr : o.en }))} />
                    <Input value={form.city} onChange={v => set('city', v)} placeholder={lang === 'FR' ? 'Ville' : 'City'} />
                    <Input value={form.region} onChange={v => set('region', v)} placeholder={lang === 'FR' ? 'Région / province' : 'Region / province'} />
                  </div>
                </FormSection>

                <FormSection step="4" titleFR="Date et budget" titleEN="Date and budget">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <Input value={form.preferredDate} onChange={v => set('preferredDate', v)} placeholder={lang === 'FR' ? 'Date souhaitée ou période (ex. mars 2027)' : 'Desired date or window (e.g. March 2027)'} />
                    <LabelledSelect label={lang === 'FR' ? 'Enveloppe budgétaire' : 'Budget range'} value={form.budgetRange} onChange={v => set('budgetRange', v as BudgetRange)} options={BUDGET_OPTIONS.map(o => ({ id: o.id, label: lang === 'FR' ? o.fr : o.en }))} />
                  </div>
                </FormSection>

                <FormSection step="5" titleFR="Un mot sur votre événement" titleEN="Tell us about your event">
                  <textarea
                    value={form.message}
                    onChange={e => set('message', e.target.value)}
                    placeholder={lang === 'FR' ? 'Partagez le contexte, la thématique souhaitée, le public attendu, les contraintes logistiques, etc.' : 'Share the context, desired theme, expected audience, logistical constraints, etc.'}
                    rows={5}
                    className={`${FIELD_CLASS} resize-none`}
                  />
                </FormSection>

                {err && <p className="text-center text-sm text-red-700 dark:text-red-400">{err}</p>}

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-4 rounded-full font-bold uppercase tracking-[0.28em] text-[12px] transition-[filter,transform] duration-300 hover:[filter:brightness(1.06)] active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{
                    background: '#3A251E',
                    color: '#F4E7DD',
                    border: '1px solid rgba(184,83,47,0.55)',
                    boxShadow: '0 12px 28px rgba(58,37,30,0.28)',
                  }}
                >
                  {sending ? <i className="fa-solid fa-circle-notch fa-spin" /> : <i className="fa-solid fa-paper-plane text-[10px]" />}
                  {lang === 'FR' ? 'Envoyer la demande' : 'Send request'}
                </button>

                <p className="text-[11px] text-center text-[#3A251E]/75 dark:text-white/75 pt-2 italic font-serif">
                  {lang === 'FR'
                    ? "Vos réponses sont enregistrées de manière confidentielle. L'équipe revient vers vous avec une proposition adaptée."
                    : 'Your answers are stored confidentially. The team will reply with a tailored proposal.'}
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      <FAQ />
      <EventsSection />
      <Correspondence />
      <Closing />
      <StickyCTA scrollToForm={scrollToForm} />
    </div>
  );
};

// ─── Field primitives ──────────────────────────────────────────────────────
const FIELD_CLASS =
  'w-full px-4 py-3 rounded-xl border border-[#3A251E]/15 dark:border-white/15 bg-white/80 dark:bg-white/5 text-sm text-[#3A251E] dark:text-white placeholder:text-[#3A251E]/40 dark:placeholder:text-white/40 focus:outline-none focus:border-[#B8532F] focus:shadow-[0_0_0_4px_rgba(184,83,47,0.12)] transition-shadow duration-300';

const SELECT_CHEVRON =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'><path d='M2 4l4 4 4-4' stroke='%238B6F47' fill='none' stroke-width='1.5'/></svg>\")";

interface FormSectionProps {
  step: string; titleFR: string; titleEN: string;
  children: React.ReactNode;
}
const FormSection: React.FC<FormSectionProps> = ({ step, titleFR, titleEN, children }) => {
  const { lang } = useApp();
  return (
    <div className="rounded-[20px] border border-[#3A251E]/8 dark:border-white/8 bg-white/40 dark:bg-white/[0.03] p-4 md:p-5">
      <div className="flex items-center gap-3 mb-4">
        <span className="w-7 h-7 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0" style={{ background: '#B8532F', color: '#F4E7DD' }}>
          {step}
        </span>
        <h3 className="font-serif text-base md:text-lg text-[#3A251E] dark:text-white">
          {lang === 'FR' ? titleFR : titleEN}
        </h3>
      </div>
      {children}
    </div>
  );
};

interface InputProps {
  value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean;
  type?: string; className?: string;
}
const Input: React.FC<InputProps> = ({ value, onChange, placeholder, required, type = 'text', className = '' }) => (
  <input
    type={type}
    value={value}
    required={required}
    placeholder={placeholder}
    onChange={e => onChange(e.target.value)}
    className={`${FIELD_CLASS} ${className}`}
  />
);

interface SelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
}
const LabelledSelect: React.FC<SelectProps> = ({ label, value, onChange, options }) => (
  <label className="block">
    <span className="block text-[10px] uppercase tracking-widest text-[#3A251E]/60 dark:text-white/60 font-bold mb-2">
      {label}
    </span>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`${FIELD_CLASS} pr-10 appearance-none bg-[length:12px] bg-[right_1rem_center] bg-no-repeat`}
      style={{ backgroundImage: SELECT_CHEVRON }}
    >
      {options.map(o => (
        <option key={o.id} value={o.id}>{o.label}</option>
      ))}
    </select>
  </label>
);

export default ConferencierePage;
