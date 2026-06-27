import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, Leaf, Sun, Snowflake, Sprout, Compass,
  Calendar, MapPin, Bell, Hourglass, Radio, Ticket, BookOpen, Route, Mic, ChevronDown,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { goToRoute } from '../lib/staticRoutes';
import { getUpcomingEvents, type LiveEvent } from '../lib/liveEvents';
import WaitlistModal, { type WaitlistTarget } from '../components/WaitlistModal';
import { Seam } from '../components/motion/loeuvre';
import ConferenceTourModal from '../components/ConferenceTourModal';
import {
  liveEventToCalendar, downloadIcs, googleCalendarUrl, outlookCalendarUrl,
} from '../lib/calendar';
import NewsletterSignup from '../components/NewsletterSignup';

/**
 * Formations — page React au style L'Œuvre (espresso/cream/brass, accent
 * botanique forest). Reconstruite à neuf : zéro reprise du visuel d'origine.
 * Préserve le back-end : programmes saisonniers (Origine/Vata/Pitta/Kapha),
 * événements live via getUpcomingEvents() + WaitlistModal + ConferenceTour,
 * et NewsletterSignup (source="formations").
 * Helpers, rythme et motion alignés sur OrigineExperience / VataExperience.
 */

const ease = [0.16, 0.8, 0.24, 1] as const;

const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({
  children, delay = 0, className,
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 28, filter: 'blur(6px)' }}
    whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
    viewport={{ once: true, amount: 0.15 }}
    transition={{ duration: 1.0, ease, delay }}
  >
    {children}
  </motion.div>
);

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

/* ════════════════════════ Données — programmes saisonniers ════════════════════════ */

type Season = 'origine' | 'vata' | 'pitta' | 'kapha';

interface Programme {
  key: Season;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  tagFR: string; tagEN: string;
  titleFR: string; titleEN: string;
  subtitleFR: string; subtitleEN: string;
  bodyFR: string; bodyEN: string;
  statusFR: string; statusEN: string;
  ctaFR: string; ctaEN: string;
  href: string;
  external?: boolean;   // hard nav (Kajabi)
  waitlist?: boolean;   // SPA nav to /liste-attente
}

const PROGRAMMES: Programme[] = [
  {
    key: 'origine',
    Icon: Compass,
    tagFR: 'Parcours signature · Prochaine cohorte',
    tagEN: 'Signature journey · Next cohort',
    titleFR: "L'Expérience Origine",
    titleEN: 'The Origin Experience',
    subtitleFR: 'Retrouver votre boussole intérieure',
    subtitleEN: 'Rediscover your inner compass',
    bodyFR: "Un parcours de 12 semaines au cœur de l'Ayurveda. La cohorte en cours est complète. Inscrivez-vous à la liste d'attente pour la prochaine ouverture.",
    bodyEN: 'A 12-week journey at the heart of Ayurveda. The current cohort is full. Join the waitlist for the next opening.',
    statusFR: "Liste d'attente ouverte",
    statusEN: 'Waitlist open',
    ctaFR: "Rejoindre la liste d'attente",
    ctaEN: 'Join the waitlist',
    href: '/liste-attente?programme=origine',
    waitlist: true,
  },
  {
    key: 'vata',
    Icon: Snowflake,
    tagFR: 'Saison Vata · Disponible',
    tagEN: 'Vata season · Available',
    titleFR: "L'Automne",
    titleEN: 'Autumn',
    subtitleFR: 'Enraciner · Réchauffer · Apaiser',
    subtitleEN: 'Ground · Warm · Soothe',
    bodyFR: "Vent, sécheresse, dispersion : la saison Vata teste les nerfs. Un programme pour ancrer le corps et la tête avant l'hiver.",
    bodyEN: 'Wind, dryness, scattering: the Vata season tests the nerves. A program to ground body and mind before winter.',
    statusFR: 'Programme disponible',
    statusEN: 'Program available',
    ctaFR: 'Découvrir le programme',
    ctaEN: 'Discover the program',
    href: '/vata',
  },
  {
    key: 'pitta',
    Icon: Sun,
    tagFR: 'Saison Pitta · En cours',
    tagEN: 'Pitta season · Live',
    titleFR: "L'Été",
    titleEN: 'Summer',
    subtitleFR: 'Rafraîchir · Apaiser · Adoucir',
    subtitleEN: 'Cool · Soothe · Soften',
    bodyFR: "Quand la chaleur monte, le feu intérieur s'emballe. Un programme pour traverser la saison Pitta sans se brûler.",
    bodyEN: 'When the heat rises, the inner fire flares. A program to walk through the Pitta season without burning out.',
    statusFR: 'Programme disponible',
    statusEN: 'Program available',
    ctaFR: 'Accéder au programme',
    ctaEN: 'Open the program',
    href: 'https://krystinestlaurent.mykajabi.com/experience-ayurveda-saison-estivale',
    external: true,
  },
  {
    key: 'kapha',
    Icon: Sprout,
    tagFR: 'Saison Kapha · Bientôt',
    tagEN: 'Kapha season · Soon',
    titleFR: 'Le Printemps',
    titleEN: 'Spring',
    subtitleFR: 'Activer · Alléger · Stimuler',
    subtitleEN: 'Activate · Lighten · Stimulate',
    bodyFR: "L'éveil du printemps demande de bouger, drainer, alléger. Un programme pour traverser la saison Kapha avec élan et clarté.",
    bodyEN: "Spring's awakening calls for movement, drainage, lightness. A program to walk through the Kapha season with momentum and clarity.",
    statusFR: "Liste d'attente ouverte",
    statusEN: 'Waitlist open',
    ctaFR: "Rejoindre la liste d'attente",
    ctaEN: 'Join the waitlist',
    href: '/liste-attente?programme=kapha',
    waitlist: true,
  },
];

/* ════════════════════════ Carte programme (saisonnier) ════════════════════════ */

const ProgrammeCard: React.FC<{ p: Programme; lang: 'FR' | 'EN'; onOpen: (p: Programme) => void; featured?: boolean }> = ({ p, lang, onOpen, featured }) => {
  const Icon = p.Icon;
  const tag = lang === 'FR' ? p.tagFR : p.tagEN;
  const title = lang === 'FR' ? p.titleFR : p.titleEN;
  const subtitle = lang === 'FR' ? p.subtitleFR : p.subtitleEN;
  const body = lang === 'FR' ? p.bodyFR : p.bodyEN;
  const status = lang === 'FR' ? p.statusFR : p.statusEN;
  const cta = lang === 'FR' ? p.ctaFR : p.ctaEN;

  return (
    <article
      className={`group h-full flex flex-col rounded-[2rem] border bg-card p-8 md:p-10 transition-shadow hover:shadow-xl ${
        featured ? 'border-brass/40 shadow-[0_18px_50px_rgba(187,154,94,0.14)]' : 'border-cream3'
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <span className="grid place-items-center w-12 h-12 rounded-2xl bg-brass/12 text-brassInk">
          <Icon size={22} />
        </span>
        {p.waitlist && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brass/30 text-brassInk px-3 py-1 text-[0.58rem] font-sans uppercase tracking-[0.18em]">
            <Hourglass size={11} /> {lang === 'FR' ? "Liste d'attente" : 'Waitlist'}
          </span>
        )}
      </div>

      <p className="mt-7 font-sans text-[0.6rem] uppercase tracking-[0.24em] text-brassInk">{tag}</p>
      <h3 className={`mt-3 font-serif font-medium text-ink leading-[1.05] ${featured ? 'text-[clamp(2rem,3.4vw,2.8rem)]' : 'text-[clamp(1.6rem,2.6vw,2.1rem)]'}`}>{title}</h3>
      <p className="mt-2 font-serif italic text-brassInk text-[clamp(1.05rem,1.6vw,1.3rem)]">{subtitle}</p>
      <p className="mt-5 font-sans text-[0.95rem] leading-[1.8] text-inkSoft flex-1 max-w-[48ch]">{body}</p>

      <div className="mt-8 flex flex-wrap items-center gap-5 pt-6 border-t border-cream3">
        <button
          type="button"
          onClick={() => onOpen(p)}
          className="inline-flex items-center gap-3 rounded-full bg-brass px-7 py-3.5 font-sans text-[0.7rem] uppercase tracking-[0.16em] text-espressoDeep transition-colors hover:bg-brassBright min-h-[44px]"
        >
          {cta} <ArrowRight size={15} />
        </button>
        <span className="inline-flex items-center gap-2 font-sans text-[0.62rem] uppercase tracking-[0.18em] text-inkSoft/80">
          {p.waitlist ? <Hourglass size={13} className="text-brassInk" /> : <Leaf size={13} className="text-forest" />}
          {status}
        </span>
      </div>
    </article>
  );
};

/* ════════════════════════ Événements & Conférences (wiring back-end) ════════════════════════ */

const EVENT_META: Record<LiveEvent['kind'], { Icon: React.ComponentType<{ size?: number; className?: string }>; fr: string; en: string }> = {
  'in-progress':      { Icon: Radio,    fr: 'En cours',          en: 'In progress' },
  'ticketed':         { Icon: Ticket,   fr: 'Billetterie ouverte', en: 'Tickets open' },
  'retreat-waitlist': { Icon: Leaf,     fr: 'Retraite · liste',  en: 'Retreat · list' },
  'launch-waitlist':  { Icon: BookOpen, fr: 'Lancement · liste', en: 'Launch · list' },
  'tour-request':     { Icon: Route,    fr: 'Tournée · demande', en: 'Tour · request' },
  'announcement':     { Icon: Mic,      fr: 'Annonce',           en: 'Announcement' },
};

const CalendarMenu: React.FC<{ event: LiveEvent; lang: 'FR' | 'EN' }> = ({ event, lang }) => {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const cal = liveEventToCalendar(event, lang);
  if (!cal) return null;

  const handle = (kind: 'ics' | 'google' | 'outlook') => {
    setOpen(false);
    if (kind === 'ics') downloadIcs(cal);
    if (kind === 'google') window.open(googleCalendarUrl(cal), '_blank', 'noopener,noreferrer');
    if (kind === 'outlook') window.open(outlookCalendarUrl(cal), '_blank', 'noopener,noreferrer');
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full border border-brass/30 px-4 py-2 font-sans text-[0.62rem] uppercase tracking-[0.16em] text-brassInk transition-colors hover:bg-brass/10 min-h-[44px]"
      >
        <Calendar size={13} /> {lang === 'FR' ? 'Calendrier' : 'Calendar'}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="menu" className="absolute z-20 mt-2 right-0 w-60 rounded-2xl border border-cream3 bg-card shadow-[0_14px_40px_rgba(58,37,30,0.18)] overflow-hidden">
          {([
            ['ics', lang === 'FR' ? 'Apple · iCal · Outlook' : 'Apple · iCal · Outlook', lang === 'FR' ? 'Télécharger .ics' : 'Download .ics'],
            ['google', 'Google Calendar', lang === 'FR' ? 'Nouvel onglet' : 'New tab'],
            ['outlook', 'Outlook', 'Outlook.com'],
          ] as const).map(([k, label, sub]) => (
            <button
              key={k}
              type="button"
              role="menuitem"
              onClick={() => handle(k)}
              className="w-full flex flex-col items-start px-4 py-3 text-left hover:bg-cream2 transition-colors"
            >
              <span className="font-sans text-[0.85rem] text-ink">{label}</span>
              <span className="font-sans text-[0.7rem] text-inkSoft">{sub}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const EventCard: React.FC<{
  event: LiveEvent;
  lang: 'FR' | 'EN';
  onWaitlist: (t: WaitlistTarget) => void;
  onTour: () => void;
  navigate: ReturnType<typeof useNavigate>;
}> = ({ event: ev, lang, onWaitlist, onTour, navigate }) => {
  const meta = EVENT_META[ev.kind];
  const BadgeIcon = meta.Icon;
  const title = lang === 'FR' ? ev.titleFR : ev.titleEN;
  const subtitle = lang === 'FR' ? ev.subtitleFR : ev.subtitleEN;
  const date = lang === 'FR' ? ev.dateFR : ev.dateEN;
  const location = lang === 'FR' ? ev.locationFR : ev.locationEN;
  const body = lang === 'FR' ? ev.bodyFR : ev.bodyEN;
  const ctaOverride = lang === 'FR' ? ev.ctaLabelFR : ev.ctaLabelEN;

  return (
    <article className={`h-full flex flex-col rounded-[1.8rem] border bg-espresso p-7 md:p-8 transition-shadow hover:shadow-[0_22px_50px_rgba(0,0,0,0.35)] ${ev.featured ? 'border-brass/45' : 'border-brass/15'}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <span className="font-sans text-[0.6rem] uppercase tracking-[0.24em] text-brass">{date}</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brass/12 text-brass px-3 py-1 text-[0.56rem] font-sans uppercase tracking-[0.16em]">
          <BadgeIcon size={11} /> {lang === 'FR' ? meta.fr : meta.en}
        </span>
      </div>

      <h3 className="mt-4 font-serif font-medium text-ctext text-[clamp(1.4rem,2.4vw,1.9rem)] leading-snug">{title}</h3>
      {subtitle && <p className="mt-1.5 font-serif italic text-ctextSoft text-[0.98rem]">{subtitle}</p>}
      {location && (
        <p className="mt-3 inline-flex items-center gap-2 font-sans text-[0.8rem] text-ctextSoft/80">
          <MapPin size={13} className="text-brass shrink-0" /> {location}
        </p>
      )}
      {body && <p className="mt-4 font-sans text-[0.9rem] leading-[1.7] text-ctextSoft flex-1">{body}</p>}

      <div className="mt-7 flex flex-wrap items-center gap-3 pt-5 border-t border-brass/15">
        {ev.kind === 'in-progress' && ev.internalHref && (
          <button
            type="button"
            onClick={() => goToRoute(navigate, ev.internalHref!)}
            className="inline-flex items-center gap-2 rounded-full bg-brass px-6 py-3 font-sans text-[0.64rem] uppercase tracking-[0.16em] text-espressoDeep transition-colors hover:bg-brassBright min-h-[44px]"
          >
            {ctaOverride ?? (lang === 'FR' ? 'Découvrir le programme' : 'View the program')} <ArrowRight size={14} />
          </button>
        )}
        {ev.kind === 'ticketed' && ev.registerUrl && (
          <a
            href={ev.registerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-brass px-6 py-3 font-sans text-[0.64rem] uppercase tracking-[0.16em] text-espressoDeep transition-colors hover:bg-brassBright min-h-[44px]"
          >
            {ctaOverride ?? (lang === 'FR' ? 'Billets' : 'Tickets')} <ArrowRight size={14} />
          </a>
        )}
        {(ev.kind === 'retreat-waitlist' || ev.kind === 'launch-waitlist') && ev.waitlistTarget && (
          <button
            type="button"
            onClick={() => onWaitlist(ev.waitlistTarget!)}
            className="inline-flex items-center gap-2 rounded-full bg-brass px-6 py-3 font-sans text-[0.64rem] uppercase tracking-[0.16em] text-espressoDeep transition-colors hover:bg-brassBright min-h-[44px]"
          >
            <Bell size={13} /> {ctaOverride ?? (lang === 'FR' ? "Liste d'attente" : 'Join waitlist')}
          </button>
        )}
        {(ev.kind === 'tour-request' || ev.triggersTourRequest) && (
          <button
            type="button"
            onClick={onTour}
            className="inline-flex items-center gap-2 rounded-full bg-brass px-6 py-3 font-sans text-[0.64rem] uppercase tracking-[0.16em] text-espressoDeep transition-colors hover:bg-brassBright min-h-[44px]"
          >
            <Route size={13} /> {ctaOverride ?? (lang === 'FR' ? 'Demander une tournée' : 'Request a tour stop')}
          </button>
        )}
        {ev.startDate && <CalendarMenu event={ev} lang={lang} />}
      </div>
    </article>
  );
};

/* ════════════════════════ Page ════════════════════════ */

const FormationsLoeuvre: React.FC = () => {
  const { lang } = useApp();
  const navigate = useNavigate();

  const [waitlistTarget, setWaitlistTarget] = useState<WaitlistTarget | null>(null);
  const [tourOpen, setTourOpen] = useState(false);

  const events = getUpcomingEvents();
  const featured = PROGRAMMES[0];
  const seasonal = PROGRAMMES.slice(1);

  const openProgramme = (p: Programme) => {
    if (p.waitlist) navigate(p.href);
    else goToRoute(navigate, p.href);
  };

  return (
    <div className="bg-cream text-ink font-sans antialiased">

      {/* ─────────── HERO ─────────── */}
      <section className="relative min-h-[78vh] flex items-center overflow-hidden bg-espressoDeep">
        <div className="pointer-events-none absolute -top-1/4 -left-1/4 h-[65%] w-[65%] rounded-full bg-forest/18 blur-[150px]" />
        <div className="pointer-events-none absolute -bottom-1/4 -right-1/5 h-[60%] w-[60%] rounded-full bg-brass/10 blur-[150px]" />
        <div className="relative z-10 mx-auto w-full max-w-[1280px] px-6 md:px-12 py-28 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease }}>
            <p className="font-sans text-[0.62rem] md:text-[0.7rem] uppercase tracking-[0.32em] text-brass mb-8">
              {lang === 'FR' ? 'Programmes & Accompagnements' : 'Programs & Guidance'}
            </p>
            <h1 className="font-serif font-medium text-ctext leading-[0.98] text-[clamp(2.6rem,5.6vw,4.6rem)] max-w-[14ch]">
              {lang === 'FR' ? 'Formations' : 'Programs'}
            </h1>
            <p className="mt-7 font-serif italic text-[clamp(1.3rem,2.8vw,2.1rem)] leading-snug text-ctextSoft max-w-[26ch]">
              {lang === 'FR'
                ? "Intégrer l'Ayurveda dans votre quotidien, "
                : 'Weave Ayurveda into your daily life, '}
              <span className="text-brassBright not-italic">{lang === 'FR' ? 'au rythme des saisons.' : 'with the seasons.'}</span>
            </p>
            <p className="mt-7 font-sans text-[0.95rem] leading-relaxed text-ctextSoft/85 max-w-[46ch]">
              {lang === 'FR'
                ? 'Quatre parcours saisonniers et un accompagnement signature, pensés pour intégrer la sagesse ayurvédique à votre mesure, à votre rythme.'
                : 'Four seasonal journeys and one signature program, designed to integrate ayurvedic wisdom at your own measure and pace.'}
            </p>
            <div className="mt-12 flex flex-wrap items-center gap-5">
              <a href="#programmes" className="inline-flex items-center gap-3 rounded-full bg-brass px-8 py-3.5 font-sans text-[0.7rem] uppercase tracking-[0.18em] text-espressoDeep transition-colors hover:bg-brassBright min-h-[44px]">
                {lang === 'FR' ? 'Voir les programmes' : 'See the programs'} <ArrowRight size={16} />
              </a>
              <a href="#events" className="font-sans text-[0.7rem] uppercase tracking-[0.18em] text-ctextSoft/80 border-b border-brass/30 pb-1 hover:text-brassBright transition-colors">
                {lang === 'FR' ? 'Événements & conférences' : 'Events & conferences'}
              </a>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease, delay: 0.15 }}
            className="hidden lg:flex justify-center"
          >
            <div className="relative w-[320px] h-[320px] flex items-center justify-center">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }} className="absolute inset-0 rounded-full border border-dashed border-brass/25" />
              <motion.div animate={{ rotate: -360 }} transition={{ duration: 42, repeat: Infinity, ease: 'linear' }} className="absolute inset-[12%] rounded-full border border-brass/12" />
              <div className="absolute inset-[26%] rounded-full bg-brass/12 blur-2xl" />
              <Compass size={120} className="relative z-10 text-brassBright" strokeWidth={1} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─────────── PROGRAMMES SAISONNIERS ─────────── */}
      <section id="programmes" className="relative bg-cream py-24 md:py-32 overflow-hidden">
        <Seam from="#16100a" />
        <div className="relative z-10 mx-auto w-full max-w-[1280px] px-6 md:px-12">
          <Reveal className="text-center">
            <Eyebrow>{lang === 'FR' ? 'Au rythme des saisons' : 'With the seasons'}</Eyebrow>
            <SectionTitle className="mt-4 uppercase tracking-[0.02em]">
              {lang === 'FR' ? 'Les Programmes Saisonniers' : 'The Seasonal Programs'}
            </SectionTitle>
            <p className="mt-6 font-serif italic text-[clamp(1.1rem,2vw,1.5rem)] text-inkSoft max-w-[44ch] mx-auto">
              {lang === 'FR'
                ? "Chaque saison demande un geste différent. Choisissez la vôtre."
                : 'Each season asks for a different gesture. Choose yours.'}
            </p>
            <div className="mt-6 h-px w-24 bg-brass mx-auto" />
          </Reveal>

          {/* Featured — Origine */}
          <Reveal className="mt-16">
            <ProgrammeCard p={featured} lang={lang} onOpen={openProgramme} featured />
          </Reveal>

          {/* Trois saisons */}
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            {seasonal.map((p, i) => (
              <Reveal key={p.key} delay={(i % 3) * 0.07}>
                <ProgrammeCard p={p} lang={lang} onOpen={openProgramme} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── ÉVÉNEMENTS & CONFÉRENCES ─────────── */}
      {events.length > 0 && (
        <section id="events" className="relative scroll-mt-32 bg-espressoSoft py-24 md:py-32 overflow-hidden">
          <Seam from="#f6f3ee" />
          <div className="relative z-10 mx-auto w-full max-w-[1280px] px-6 md:px-12">
            <Reveal className="text-center mb-16">
              <Eyebrow on="dark">{lang === 'FR' ? 'Où on se rejoint · LIVE' : 'Where we meet · LIVE'}</Eyebrow>
              <SectionTitle on="dark" className="mt-4">
                {lang === 'FR' ? 'Événements & Conférences' : 'Events & Conferences'}
              </SectionTitle>
              <p className="mt-5 font-serif italic text-[clamp(1.05rem,1.9vw,1.4rem)] text-ctextSoft max-w-[52ch] mx-auto">
                {lang === 'FR'
                  ? 'Rencontres en direct, retraites, lancements, plus une tournée en préparation.'
                  : 'Live gatherings, retreats, launches, and a tour in the making.'}
              </p>
              <div className="mt-6 h-px w-16 bg-brass/70 mx-auto" />
            </Reveal>

            <div className="grid md:grid-cols-2 gap-6">
              {events.map((ev, i) => (
                <Reveal key={ev.id} delay={(i % 2) * 0.07}>
                  <EventCard
                    event={ev}
                    lang={lang}
                    onWaitlist={setWaitlistTarget}
                    onTour={() => setTourOpen(true)}
                    navigate={navigate}
                  />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─────────── NEWSLETTER ─────────── */}
      <section className="relative bg-cream2 py-24 md:py-32 overflow-hidden">
        <Seam from="#2a2015" />
        <div className="relative z-10 mx-auto w-full max-w-[760px] px-6 md:px-12 text-center">
          <Reveal>
            <Eyebrow>{lang === 'FR' ? 'Rester dans le fil' : 'Stay in the thread'}</Eyebrow>
            <SectionTitle className="mt-4">
              {lang === 'FR' ? "L'Ayurveda, au fil des saisons" : 'Ayurveda, season after season'}
            </SectionTitle>
            <p className="mt-6 font-serif italic text-[clamp(1.05rem,1.8vw,1.35rem)] text-inkSoft max-w-[46ch] mx-auto">
              {lang === 'FR'
                ? "Ouvertures de cohortes, retraites, lancements : recevez le fil avant tout le monde."
                : 'Cohort openings, retreats, launches: get the thread before anyone else.'}
            </p>
          </Reveal>
          <Reveal delay={0.1} className="mt-10">
            <NewsletterSignup source="formations" variant="light" />
          </Reveal>
        </div>
      </section>

      {/* Modaux back-end (réutilisés tels quels) */}
      <WaitlistModal target={waitlistTarget} onClose={() => setWaitlistTarget(null)} />
      <ConferenceTourModal open={tourOpen} onClose={() => setTourOpen(false)} />
    </div>
  );
};

export default FormationsLoeuvre;
