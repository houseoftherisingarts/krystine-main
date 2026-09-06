import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, ArrowRight, ArrowDown, Clock, MapPin, Check,
  Mic, Compass, Moon, Quote, Mail, Send, Loader2,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import NewsletterSignup from '../components/NewsletterSignup';
import CompteUpsell from '../components/CompteUpsell';
import LiveEventsSection from '../components/LiveEvents';
import { Seam } from '../components/motion/loeuvre';
import { getEvents, type EventDoc } from '../firebase/firestore';
import { getUpcomingEvents } from '../lib/liveEvents';
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

/**
 * Conférencière · style L'Œuvre — refonte éditoriale (espresso/cream/brass,
 * accent botanique forest). Krystine St-Laurent, conférencière et autrice.
 * Le back-end est préservé : formulaire de réservation (addBookingRequest),
 * événements en direct (getUpcomingEvents + LiveEventsSection + getEvents
 * Firestore), et l'infolettre (NewsletterSignup, source="conferenciere").
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

/* ════════════════════════ Données ════════════════════════ */

const BADGES = ['37 ans de pratique', '3 livres', 'TEDx', 'Salut Bonjour'];

const STORY = [
  "37 ans à traverser les milieux de la santé : soins intensifs, industrie pharmaceutique, recherche clinique en insuffisance cardiaque, avant de choisir l'herboristerie, l'Ayurveda et l'aromathérapie.",
  "Auteure de trois livres aux Éditions de l'Homme. Créatrice de série télé et du podcast Au-delà des tendances. Elle a vu ce que l'approche moderne fait bien, et là où elle laisse les gens seuls.",
  "Sur scène, cette double appartenance devient une voix rare : la rigueur du clinicien rencontre la sagesse millénaire. Chaque conférence est cousue main pour le public qui l'attend.",
];

const SIGNATURE_TALKS: { icon: React.ReactNode; kicker: string; title: string; lede: string; duration: string; format: string; feature?: boolean }[] = [
  {
    icon: <Compass size={20} />,
    kicker: 'Conférence vedette',
    title: 'Au-delà des tendances',
    lede: "Reprendre SA direction, écouter ce que le corps sait avant que l'algorithme ne l'écrase.",
    duration: '60 à 90 min',
    format: 'Présentiel · Virtuel',
  },
  {
    icon: <Mic size={20} />,
    kicker: 'Conférence signature',
    title: "L'Ayurveda comme boussole intérieure",
    lede: 'Une cartographie ancestrale pour la vie moderne : comment les éléments lisent ce qui se passe en vous.',
    duration: '90 min · ½ journée',
    format: 'Présentiel · Hybride',
    feature: true,
  },
  {
    icon: <Moon size={20} />,
    kicker: 'Conférence dédiée',
    title: 'La femme et ses saisons',
    lede: "Cycles biologiques et saisons intérieures, pour vivre en alliance avec son corps plutôt qu'à son insu.",
    duration: '60 min',
    format: 'Présentiel',
  },
];

const TESTIMONIALS = [
  {
    quote: "Krystine a une voix rare, celle d'une femme qui sait, qui a vu, et qui sait nommer ce que le public n'a jamais osé dire. Notre événement n'a pas été le même après son passage.",
    by: 'Productrice · Festival Mondial',
  },
  {
    quote: 'Un mélange parfait de rigueur scientifique et de sagesse ancestrale. Notre équipe est repartie avec des outils concrets et une nouvelle perspective.',
    by: 'Directrice RH · Entreprise québécoise',
  },
  {
    quote: "Krystine ne fait pas une conférence. Elle ouvre un espace. Le public écoute différemment, comme s'il rentrait à la maison.",
    by: 'Animatrice · Salut Bonjour',
  },
];

const PROCESS_STEPS = [
  { n: '01', title: 'Vous nous écrivez', body: "Quelques minutes pour répondre au formulaire ci-dessous. Plus on en sait sur votre vision, mieux on prépare la rencontre." },
  { n: '02', title: 'Échange de cadrage', body: "L'équipe revient sous 48 h ouvrables avec une proposition. Si elle convient, on planifie un appel pour affiner." },
  { n: '03', title: 'Co-création', body: "Krystine ajuste l'intervention selon votre public et votre contexte. Ce n'est jamais un module pré-fait." },
  { n: '04', title: 'Sur scène', body: 'Le jour J, Krystine arrive ancrée et libre. Le reste appartient au public.' },
];

const FAQS = [
  { q: 'Quels sujets Krystine aborde-t-elle ?', a: "Ayurveda, santé féminine, médecine intégrative, équilibre travail-vie, transmission générationnelle, écologie intérieure. Les conférences sont toujours adaptées au public." },
  { q: "Voyage-t-elle à l'extérieur du Québec ?", a: "Oui : Canada, États-Unis, France, Belgique, Suisse selon l'agenda. Indiquez la ville dans le formulaire et on vous revient avec la faisabilité." },
  { q: 'Quels sont les délais habituels ?', a: "8 à 16 semaines avant l'événement permettent une préparation idéale. Les demandes plus serrées sont étudiées au cas par cas." },
  { q: 'En quelles langues ?', a: 'Français principalement, anglais sur demande, bilingue possible.' },
  { q: 'Quelle fourchette tarifaire ?', a: "Variable selon le format, la durée, le public et le déplacement. Indiquez votre enveloppe budgétaire dans le formulaire et l'équipe vous revient avec un devis adapté." },
];

/* ── Listes d'options du formulaire (back-end préservé) ── */
const INTERVENTION_OPTIONS: { id: InterventionKind; label: string }[] = [
  { id: 'keynote', label: 'Conférence / Keynote' },
  { id: 'workshop', label: 'Atelier pratique' },
  { id: 'panel', label: 'Table ronde / Panel' },
  { id: 'hosting', label: "Animation d'événement" },
  { id: 'podcast', label: 'Podcast / Entrevue média' },
  { id: 'corporate', label: 'Formation corporate' },
  { id: 'retreat', label: 'Retraite ou séjour' },
  { id: 'other', label: 'Autre · à préciser' },
];
const FORMAT_OPTIONS: { id: EventFormat; label: string }[] = [
  { id: 'in-person', label: 'Présentiel' },
  { id: 'virtual', label: 'Virtuel' },
  { id: 'hybrid', label: 'Hybride' },
  { id: 'open', label: 'Ouvert · à discuter' },
];
const AUDIENCE_OPTIONS: { id: AudienceType; label: string }[] = [
  { id: 'general-public', label: 'Grand public' },
  { id: 'corporate', label: 'Entreprise · équipe interne' },
  { id: 'students', label: 'Étudiants · milieu éducatif' },
  { id: 'healthcare', label: 'Professionnels de la santé' },
  { id: 'community', label: 'Communauté · association' },
  { id: 'other', label: 'Autre · à préciser' },
];
const SIZE_OPTIONS: { id: AudienceSize; label: string }[] = [
  { id: 'under-50', label: 'Moins de 50' },
  { id: '50-150', label: '50 à 150' },
  { id: '150-500', label: '150 à 500' },
  { id: '500-plus', label: 'Plus de 500' },
  { id: 'unknown', label: 'À déterminer' },
];
const DURATION_OPTIONS: { id: InterventionDuration; label: string }[] = [
  { id: '30min', label: '30 minutes' },
  { id: '60min', label: '60 minutes' },
  { id: '90min', label: '90 minutes' },
  { id: 'half-day', label: 'Demi-journée (2–3 h)' },
  { id: 'full-day', label: 'Journée complète' },
  { id: 'multi-day', label: 'Plusieurs jours' },
  { id: 'flexible', label: 'Flexible · à discuter' },
];
const BUDGET_OPTIONS: { id: BudgetRange; label: string }[] = [
  { id: 'under-2k', label: 'Moins de 2 000 $' },
  { id: '2k-5k', label: '2 000 $ à 5 000 $' },
  { id: '5k-10k', label: '5 000 $ à 10 000 $' },
  { id: '10k-plus', label: 'Plus de 10 000 $' },
  { id: 'to-discuss', label: 'À discuter' },
];
const LANG_OPTIONS: { id: LangPref; label: string }[] = [
  { id: 'fr', label: 'Français' },
  { id: 'en', label: 'Anglais' },
  { id: 'bilingual', label: 'Bilingue' },
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

/* ════════════════════════ Primitives de formulaire ════════════════════════ */

const FIELD =
  'w-full rounded-xl border border-cream3 bg-card px-4 py-3 text-sm text-ink placeholder:text-inkSoft/60 focus:outline-none focus:border-brass focus:ring-1 focus:ring-brass transition-colors min-h-[44px]';

const TextField: React.FC<{
  value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; type?: string; className?: string;
}> = ({ value, onChange, placeholder, required, type = 'text', className = '' }) => (
  <input
    type={type}
    value={value}
    required={required}
    placeholder={placeholder}
    onChange={(e) => onChange(e.target.value)}
    className={`${FIELD} ${className}`}
  />
);

const SelectField: React.FC<{
  label: string; value: string; onChange: (v: string) => void;
  options: { id: string; label: string }[];
}> = ({ label, value, onChange, options }) => (
  <label className="block">
    <span className="block mb-2 font-sans text-[0.6rem] uppercase tracking-[0.18em] text-brassInk font-semibold">{label}</span>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${FIELD} appearance-none pr-10 cursor-pointer`}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-brassInk pointer-events-none" />
    </div>
  </label>
);

const FormBlock: React.FC<{ step: string; title: string; children: React.ReactNode }> = ({ step, title, children }) => (
  <div className="rounded-2xl border border-cream3 bg-cream2 p-5 md:p-6">
    <div className="flex items-center gap-3 mb-5">
      <span className="grid place-items-center w-8 h-8 rounded-full bg-brass text-espressoDeep font-serif text-sm tabular-nums shrink-0">{step}</span>
      <h3 className="font-serif text-lg md:text-xl text-ink">{title}</h3>
    </div>
    {children}
  </div>
);

/* ════════════════════════ Sections ════════════════════════ */

const FaqSection: React.FC = () => {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="bg-cream2 py-24 md:py-32">
      <div className="mx-auto w-full max-w-[860px] px-6 md:px-12">
        <Reveal className="text-center mb-12">
          <Eyebrow>Avant d'envoyer</Eyebrow>
          <SectionTitle className="mt-4">Questions courantes</SectionTitle>
          <div className="mt-5 h-px w-16 bg-brass mx-auto" />
        </Reveal>
        <Reveal>
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={i} className={`mb-3 rounded-2xl border bg-card overflow-hidden transition-shadow ${isOpen ? 'border-brass/40 shadow-[0_10px_30px_rgba(187,154,94,0.12)]' : 'border-cream3 shadow-sm'}`}>
                <button onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen}
                  className="w-full text-left py-5 px-6 md:px-8 flex items-center justify-between gap-4 min-h-[44px] group">
                  <h3 className={`font-serif text-lg md:text-xl pr-6 transition-colors ${isOpen ? 'text-brassInk' : 'text-ink group-hover:text-brassInk'}`}>
                    <span className="tabular-nums text-inkSoft mr-2">{i + 1}.</span>{f.q}
                  </h3>
                  <ChevronDown className={`w-5 h-5 shrink-0 text-brassInk transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease }}>
                      <p className="px-6 md:px-8 pb-7 text-inkSoft leading-[1.8] font-sans text-[0.95rem] max-w-[62ch]">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
};

/* ── Événements en direct (back-end préservé) ── */
const EventsSection: React.FC = () => {
  const { lang } = useApp();
  const [extraEvents, setExtraEvents] = useState<EventDoc[]>([]);
  useEffect(() => {
    getEvents().then(setExtraEvents).catch(() => setExtraEvents([]));
  }, []);
  const upcoming = getUpcomingEvents();
  const extraUpcoming = extraEvents.filter((ev) => new Date(ev.date) >= new Date()).slice(0, 6);

  return (
    <section id="events" className="bg-cream py-24 md:py-32 scroll-mt-32">
      <div className="mx-auto w-full max-w-[1280px] px-6 md:px-12">
        <Reveal className="text-center mb-14">
          <Eyebrow>Où on se rejoint · Live</Eyebrow>
          <SectionTitle className="mt-4">Événements &amp; Conférences</SectionTitle>
          <p className="mt-6 font-serif italic text-[clamp(1.1rem,2vw,1.5rem)] text-inkSoft max-w-[44ch] mx-auto">
            Rencontres en direct, retraites, lancements, plus une tournée en préparation.
          </p>
        </Reveal>

        <Reveal>
          <LiveEventsSection events={upcoming} />
        </Reveal>

        {extraUpcoming.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
            {extraUpcoming.map((ev) => {
              const dateStr = new Date(ev.date).toLocaleDateString('fr-CA', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              });
              return (
                <Reveal key={ev.id}>
                  <div className="group h-full rounded-3xl border border-cream3 bg-card p-6 transition-shadow hover:shadow-xl">
                    <span className="text-[0.6rem] uppercase tracking-[0.22em] font-semibold text-brassInk block mb-3">{dateStr}</span>
                    <h3 className="font-serif text-xl md:text-2xl text-ink mb-1 transition-colors group-hover:text-brassInk">{ev.title}</h3>
                    {ev.subtitle && <p className="text-sm font-serif italic text-inkSoft mb-3">{ev.subtitle}</p>}
                    {ev.location && (
                      <p className="text-sm text-inkSoft flex items-center gap-2 mb-3">
                        <MapPin size={13} className="text-brassInk" />{ev.location}
                      </p>
                    )}
                    {ev.description && (
                      <p className="text-sm text-inkSoft leading-relaxed mb-4 line-clamp-3">{ev.description}</p>
                    )}
                    {ev.registrationLink && (
                      <a href={ev.registrationLink} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-full bg-espresso text-cream px-5 py-2 font-sans font-semibold uppercase tracking-[0.16em] text-[0.65rem] transition-colors hover:bg-brass hover:text-espressoDeep">
                        {lang === 'FR' ? "S'inscrire" : 'Register'}<ArrowRight size={13} />
                      </a>
                    )}
                  </div>
                </Reveal>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

/* ════════════════════════ Page ════════════════════════ */

const ConferenciereLoeuvre: React.FC = () => {
  const { lang, user, member } = useApp();

  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Pré-remplissage depuis le membre connecté.
  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      name: prev.name || member?.displayName || user.displayName || '',
      email: prev.email || user.email || '',
      phone: prev.phone || member?.phone || '',
    }));
  }, [user, member]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!form.name.trim() || !form.email.trim()) {
      setErr('Nom et courriel sont requis.');
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
      setErr(e?.message || 'Une erreur est survenue.');
    } finally {
      setSending(false);
    }
  };

  const heroItem = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.9, ease } },
  };

  return (
    <div className="bg-cream text-ink font-sans antialiased">

      {/* ─────────── HERO · même cinémagraphe que l'accueil ─────────── */}
      <section className="relative flex min-h-screen items-center overflow-hidden bg-espressoDeep">
        {/* cinémagraphe partagé avec le hero d'accueil */}
        <div className="absolute inset-0 z-0" aria-hidden>
          <video
            className="absolute right-0 top-1/2 h-full w-auto min-w-full -translate-y-1/2 object-cover md:left-auto md:w-[82%]"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="/accueil/assets/hero-ml-poster.jpg"
          >
            <source src="/accueil/assets/hero-motionleap.mp4" type="video/mp4" />
          </video>
        </div>
        {/* voile lisible, du sombre vers la transparence (comme l'accueil) */}
        <div
          className="absolute inset-0 z-[1]"
          aria-hidden
          style={{ background: 'linear-gradient(90deg, rgba(22,16,10,0.95) 0%, rgba(22,16,10,0.88) 22%, rgba(22,16,10,0.62) 42%, rgba(22,16,10,0.3) 62%, rgba(22,16,10,0.08) 80%, rgba(22,16,10,0) 94%)' }}
        />

        <motion.div
          className="relative z-[2] mx-auto w-full max-w-[1280px] px-6 md:px-12 py-28"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09 } } }}
        >
          <div className="max-w-[36rem]">
            <motion.p variants={heroItem} className="font-sans text-[0.62rem] md:text-[0.7rem] uppercase tracking-[0.32em] text-brass mb-8">
              Conférencière · Autrice
            </motion.p>
            <motion.h1 variants={heroItem} className="font-serif font-medium text-ctext leading-[0.96] text-[clamp(2.8rem,6vw,5.2rem)]">
              Krystine<br /><span className="italic font-normal text-brassBright">St-Laurent</span>
            </motion.h1>
            <motion.p variants={heroItem} className="mt-7 font-serif italic text-[clamp(1.3rem,2.6vw,2rem)] leading-snug text-ctextSoft max-w-[26ch]">
              Une voix rare, où la rigueur du clinicien rencontre la sagesse millénaire.
            </motion.p>
            <motion.div variants={heroItem} className="mt-8 flex flex-wrap gap-2.5">
              {BADGES.map((b) => (
                <span key={b} className="inline-flex items-center gap-2 rounded-full border border-brass/30 bg-brass/8 px-4 py-1.5 text-[0.62rem] font-sans uppercase tracking-[0.16em] text-brass">
                  <span className="w-1 h-1 rounded-full bg-brass" />{b}
                </span>
              ))}
            </motion.div>
            <motion.p variants={heroItem} className="mt-8 font-sans text-[0.98rem] leading-[1.8] text-ctextSoft max-w-[46ch]">
              Chaque conférence est cousue main pour le public qui l'attend. Pas un module pré-fait, une rencontre.
            </motion.p>
            <motion.div variants={heroItem} className="mt-11 flex flex-wrap items-center gap-5">
              <button onClick={scrollToForm}
                className="inline-flex items-center gap-3 rounded-full bg-brass px-8 py-3.5 font-sans text-[0.7rem] uppercase tracking-[0.18em] text-espressoDeep transition-colors duration-300 hover:bg-brassBright min-h-[44px]">
                Réserver Krystine <ArrowDown size={16} />
              </button>
              <a href="#talks" className="inline-flex items-center gap-2 font-serif italic text-ctextSoft/85 text-lg border-b border-brass/30 pb-1 transition-colors hover:text-brassBright">
                Voir les conférences
              </a>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ─────────── SON HISTOIRE ─────────── */}
      <section className="relative bg-cream py-24 md:py-32 overflow-hidden">
        <Seam from="#16100a" />
        <div className="relative z-10 mx-auto w-full max-w-[1180px] px-6 md:px-12 grid lg:grid-cols-[0.9fr_1.1fr] gap-12 lg:gap-20 items-start">
          <Reveal>
            <Eyebrow>Chapitre 01 · Son histoire</Eyebrow>
            <SectionTitle className="mt-5">De la clinique<br /><span className="italic font-normal text-brassInk">à la scène</span></SectionTitle>
            <div className="mt-6 h-px w-16 bg-brass" />
            <p className="mt-8 font-script text-[2rem] text-brassInk leading-none" style={{ fontFamily: '"Pinyon Script", cursive' }}>Krystine</p>
          </Reveal>
          <Reveal delay={0.1} className="space-y-7">
            {STORY.map((p, i) => (
              <p key={i} className="font-sans text-[1.02rem] leading-[1.85] text-inkSoft max-w-[56ch]">
                <span className="font-serif italic text-brassInk text-xl mr-2 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                {p}
              </p>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ─────────── CONFÉRENCES SIGNATURE ─────────── */}
      <section id="talks" className="relative bg-espressoSoft py-24 md:py-32 overflow-hidden">
        <Seam from="#f6f3ee" />
        <div className="relative z-10 mx-auto w-full max-w-[1280px] px-6 md:px-12">
          <Reveal className="text-center mb-16">
            <Eyebrow on="dark">Chapitre 02 · Conférences signature</Eyebrow>
            <SectionTitle on="dark" className="mt-4">Trois portes d'entrée</SectionTitle>
            <p className="mt-6 font-serif italic text-[clamp(1.1rem,2vw,1.5rem)] text-ctextSoft max-w-[42ch] mx-auto">
              Trois trames maîtresses. Chacune adaptée à votre public, votre temps, votre lieu.
            </p>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6">
            {SIGNATURE_TALKS.map((talk, i) => (
              <Reveal key={talk.title} delay={i * 0.08}>
                <article className={`h-full flex flex-col rounded-3xl border p-8 transition-shadow hover:shadow-2xl ${talk.feature ? 'bg-espresso border-brass/40' : 'bg-espressoDeep border-ctextSoft/12'}`}>
                  <span className="grid place-items-center w-12 h-12 rounded-2xl bg-brass text-espressoDeep mb-6">{talk.icon}</span>
                  <span className="font-sans text-[0.6rem] uppercase tracking-[0.22em] text-brass mb-3">{talk.kicker}</span>
                  <h3 className="font-serif text-2xl text-ctext leading-[1.15] mb-4">{talk.title}</h3>
                  <p className="font-serif italic text-ctextSoft leading-relaxed text-[0.98rem] flex-1">{talk.lede}</p>
                  <div className="mt-7 pt-5 border-t border-ctextSoft/15 flex items-center gap-4 text-[0.62rem] font-sans uppercase tracking-[0.16em] text-ctextSoft/80">
                    <span className="inline-flex items-center gap-1.5"><Clock size={13} className="text-brass" />{talk.duration}</span>
                    <span className="w-1 h-1 rounded-full bg-brass/50" />
                    <span className="inline-flex items-center gap-1.5"><MapPin size={13} className="text-brass" />{talk.format}</span>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── TÉMOIGNAGES ─────────── */}
      <section className="relative bg-cream2 py-24 md:py-32 overflow-hidden">
        <Seam from="#2a2015" />
        <div className="relative z-10 mx-auto w-full max-w-[1180px] px-6 md:px-12">
          <Reveal className="text-center mb-16">
            <Eyebrow>Ce qu'on en dit</Eyebrow>
            <SectionTitle className="mt-4">Après son passage</SectionTitle>
            <div className="mt-5 h-px w-16 bg-brass mx-auto" />
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.by} delay={i * 0.08}>
                <figure className="h-full flex flex-col rounded-3xl border border-cream3 bg-card p-8 shadow-sm">
                  <Quote size={26} className="text-brass/50 mb-5" />
                  <blockquote className="font-serif italic text-ink text-[1.05rem] leading-[1.6] flex-1">« {t.quote} »</blockquote>
                  <figcaption className="mt-6 font-sans text-[0.62rem] uppercase tracking-[0.2em] text-brassInk font-semibold">{t.by}</figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── COMMENT ÇA SE PASSE ─────────── */}
      <section className="bg-cream py-24 md:py-32">
        <div className="mx-auto w-full max-w-[1280px] px-6 md:px-12">
          <Reveal className="text-center mb-16">
            <Eyebrow>Chapitre 03 · Comment ça se passe</Eyebrow>
            <SectionTitle className="mt-4">De la demande à la scène</SectionTitle>
            <div className="mt-5 h-px w-24 bg-brass mx-auto" />
          </Reveal>
          <div className="grid md:grid-cols-4 gap-6 md:gap-5">
            {PROCESS_STEPS.map((step, i) => (
              <Reveal key={step.n} delay={i * 0.08}>
                <div className="h-full rounded-3xl bg-card border-t-[3px] border-t-brass border-x border-b border-cream3 p-7">
                  <span className="font-serif text-3xl text-brassInk tabular-nums leading-none">{step.n}</span>
                  <h3 className="mt-4 font-serif text-xl text-ink leading-snug">{step.title}</h3>
                  <p className="mt-3 font-sans text-[0.92rem] leading-[1.75] text-inkSoft">{step.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── RÉSERVER · FORMULAIRE (back-end préservé) ─────────── */}
      <section ref={formRef} className="relative bg-espresso py-24 md:py-32 scroll-mt-24 overflow-hidden">
        <Seam from="#f6f3ee" />
        <div className="relative z-10 mx-auto w-full max-w-[980px] px-6 md:px-12">
          <Reveal className="text-center mb-12">
            <Eyebrow on="dark">Chapitre 04 · Réserver Krystine</Eyebrow>
            <SectionTitle on="dark" className="mt-4">Faire une demande</SectionTitle>
            <p className="mt-6 font-serif italic text-[clamp(1.1rem,2vw,1.4rem)] text-ctextSoft max-w-[46ch] mx-auto">
              Quelques questions, cela aide l'équipe à préparer une proposition juste. Réponse sous 48 h ouvrables.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="rounded-[2rem] border border-cream3 bg-cream p-6 md:p-10 shadow-xl">
              {sent ? (
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 180, damping: 18 }}
                  className="text-center py-10"
                >
                  <span className="inline-grid place-items-center w-16 h-16 rounded-full bg-brass/15 text-brassInk mb-5">
                    <Check size={28} />
                  </span>
                  <h3 className="font-serif text-2xl md:text-3xl text-ink mb-3">Demande envoyée.</h3>
                  <p className="font-serif italic text-inkSoft max-w-md mx-auto leading-relaxed">
                    Merci. L'équipe vous revient sous 48 h ouvrables avec une proposition adaptée.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <FormBlock step="1" title="Qui êtes-vous ?">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      <TextField value={form.name} onChange={(v) => set('name', v)} placeholder="Prénom et nom *" required />
                      <TextField type="email" value={form.email} onChange={(v) => set('email', v)} placeholder="Courriel *" required />
                      <TextField type="tel" value={form.phone} onChange={(v) => set('phone', v)} placeholder="Téléphone" />
                      <TextField value={form.organization} onChange={(v) => set('organization', v)} placeholder="Organisation / Entreprise" />
                      <TextField type="url" value={form.organizationUrl} onChange={(v) => set('organizationUrl', v)} placeholder="Site web de l'organisation" className="md:col-span-2" />
                    </div>
                  </FormBlock>

                  <FormBlock step="2" title="Quel type d'intervention ?">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      <SelectField label="Type d'intervention" value={form.interventionKind} onChange={(v) => set('interventionKind', v as InterventionKind)} options={INTERVENTION_OPTIONS} />
                      <SelectField label="Format" value={form.format} onChange={(v) => set('format', v as EventFormat)} options={FORMAT_OPTIONS} />
                      <SelectField label="Durée souhaitée" value={form.duration} onChange={(v) => set('duration', v as InterventionDuration)} options={DURATION_OPTIONS} />
                      <SelectField label="Langue de prestation" value={form.languagePref} onChange={(v) => set('languagePref', v as LangPref)} options={LANG_OPTIONS} />
                    </div>
                  </FormBlock>

                  <FormBlock step="3" title="Public et contexte">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      <SelectField label="Type de public" value={form.audienceType} onChange={(v) => set('audienceType', v as AudienceType)} options={AUDIENCE_OPTIONS} />
                      <SelectField label="Taille approximative" value={form.audienceSize} onChange={(v) => set('audienceSize', v as AudienceSize)} options={SIZE_OPTIONS} />
                      <TextField value={form.city} onChange={(v) => set('city', v)} placeholder="Ville" />
                      <TextField value={form.region} onChange={(v) => set('region', v)} placeholder="Région / province" />
                    </div>
                  </FormBlock>

                  <FormBlock step="4" title="Date et budget">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      <TextField value={form.preferredDate} onChange={(v) => set('preferredDate', v)} placeholder="Date souhaitée ou période (ex. mars 2027)" />
                      <SelectField label="Enveloppe budgétaire" value={form.budgetRange} onChange={(v) => set('budgetRange', v as BudgetRange)} options={BUDGET_OPTIONS} />
                    </div>
                  </FormBlock>

                  <FormBlock step="5" title="Un mot sur votre événement">
                    <textarea
                      value={form.message}
                      onChange={(e) => set('message', e.target.value)}
                      placeholder="Partagez le contexte, la thématique souhaitée, le public attendu, les contraintes logistiques, etc."
                      rows={5}
                      className={`${FIELD} resize-none`}
                    />
                  </FormBlock>

                  {err && <p className="text-center text-sm text-red-700">{err}</p>}

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full inline-flex items-center justify-center gap-2.5 rounded-full bg-espressoDeep py-4 font-sans text-[0.7rem] uppercase tracking-[0.2em] text-cream transition-colors hover:bg-brass hover:text-espressoDeep disabled:opacity-60 min-h-[44px]"
                  >
                    {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                    Envoyer la demande
                  </button>

                  <p className="text-center text-[0.78rem] italic font-serif text-inkSoft pt-1">
                    Vos réponses sont enregistrées de manière confidentielle. L'équipe revient vers vous avec une proposition adaptée.
                  </p>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─────────── FAQ ─────────── */}
      <FaqSection />

      {/* ─────────── ÉVÉNEMENTS EN DIRECT (back-end préservé) ─────────── */}
      <EventsSection />

      {/* ─────────── INFOLETTRE (back-end préservé) ─────────── */}
      <section className="bg-espressoSoft py-24 md:py-32">
        <div className="mx-auto w-full max-w-[820px] px-6 md:px-12 text-center">
          <Reveal>
            <Eyebrow on="dark">Une correspondance</Eyebrow>
            <SectionTitle on="dark" className="mt-4">Rester en lien</SectionTitle>
            <p className="mt-6 font-serif italic text-[clamp(1.1rem,2vw,1.4rem)] text-ctextSoft max-w-[44ch] mx-auto leading-snug">
              Les nouvelles conférences, les tournées et les rendez-vous, déposés dans votre boîte, sans bruit.
            </p>
            <div className="mt-10">
              <NewsletterSignup
                source="conferenciere"
                variant="dark"
                ctaLabel="Rejoindre le fil"
                placeholder="Votre adresse courriel"
                className="max-w-xl mx-auto"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─────────── CLÔTURE · CTA ─────────── */}
      <section className="relative bg-cream py-20 md:py-28 text-center overflow-hidden">
        <Seam from="#2a2015" />
        <div className="relative z-10 mx-auto w-full max-w-[760px] px-6 md:px-12">
          <Reveal>
            <p className="font-serif italic text-[clamp(1.5rem,3.4vw,2.6rem)] leading-[1.26] text-ink">
              « Krystine ne fait pas une conférence, elle ouvre un espace. »
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-5">
              <button onClick={scrollToForm}
                className="inline-flex items-center gap-3 rounded-full bg-espressoDeep px-9 py-4 font-sans text-[0.7rem] uppercase tracking-[0.18em] text-cream transition-colors hover:bg-brass hover:text-espressoDeep min-h-[44px]">
                Réserver Krystine <ArrowRight size={16} />
              </button>
              <a href="mailto:teamksl@inspiratanature.com"
                className="inline-flex items-center gap-2 font-serif italic text-brassInk hover:text-brassBright transition-colors text-lg border-b border-brass/30 pb-1">
                <Mail size={16} /> teamksl@inspiratanature.com
              </a>
            </div>
          </Reveal>
        </div>
      </section>

    </div>
  );
};

export default ConferenciereLoeuvre;
