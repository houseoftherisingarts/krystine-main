import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import SplitType from 'split-type';
import {
  ArrowUpRight, ArrowDown, ArrowRight, CaretDown, Clock, MapPin, Check,
  Quotes, EnvelopeSimple, PaperPlaneTilt, CircleNotch, Compass, Microphone, MoonStars,
} from '@phosphor-icons/react';
import { useApp } from '../contexts/AppContext';
import NewsletterSignup from '../components/NewsletterSignup';
import LiveEventsSection from '../components/LiveEvents';
import { getUpcomingEvents } from '../lib/liveEvents';
import {
  getEvents,
  addBookingRequest,
  type EventDoc,
  type AudienceSize,
  type AudienceType,
  type BudgetRange,
  type EventFormat,
  type InterventionDuration,
  type InterventionKind,
  type LangPref,
} from '../firebase/firestore';

/**
 * Conférencière · langage « magazine crème » (concept V2 retenu).
 * Couverture éditoriale pour Krystine St-Laurent : champ crème prédominant,
 * un seul accent laiton, filets d'édition, Fraunces + Inter, révélations
 * ligne par ligne (SplitType) et volets clip-path, défilement doux Lenis +
 * GSAP. Deux respirations en « pleine page sombre » (Témoignages, Infolettre).
 *
 * Le back-end est repris tel quel depuis ConferenciereLoeuvre :
 * formulaire de réservation (addBookingRequest), événements en direct
 * (getUpcomingEvents + LiveEventsSection + getEvents Firestore) et
 * l'infolettre (NewsletterSignup, source="conferenciere").
 */

const EASE = 'cubic-bezier(0.22,1,0.36,1)';

/* ════════════════════════ Données (copie reprise telle quelle) ════════════════════════ */

const COVERLINES = ['37 ans de pratique', '3 livres · Éditions de l’Homme', 'TEDx'];

const STORY = [
  "37 ans à traverser les milieux de la santé : soins intensifs, industrie pharmaceutique, recherche clinique en insuffisance cardiaque, avant de choisir l'herboristerie, l'Ayurveda et l'aromathérapie.",
  "Auteure de trois livres aux Éditions de l'Homme. Créatrice de série télé et du podcast Au-delà des tendances. Elle a vu ce que l'approche moderne fait bien, et là où elle laisse les gens seuls.",
  // « appartenance » remplacé par « ce double regard » pour ce public québécois.
  "Sur scène, ce double regard devient une voix rare : la rigueur du clinicien rencontre la sagesse millénaire. Chaque conférence est cousue main pour le public qui l'attend.",
];

const SIGNATURE_TALKS: {
  icon: React.ReactNode; kicker: string; title: string; lede: string;
  duration: string; format: string; feature?: boolean;
}[] = [
  {
    icon: <Compass size={20} weight="regular" />,
    kicker: 'Conférence vedette',
    title: 'Au-delà des tendances',
    lede: "Reprendre SA direction, écouter ce que le corps sait avant que l'algorithme ne l'écrase.",
    duration: '60 à 90 min',
    format: 'Présentiel · Virtuel',
  },
  {
    icon: <Microphone size={20} weight="regular" />,
    kicker: 'Conférence signature',
    title: "L'Ayurveda comme boussole intérieure",
    lede: 'Une cartographie ancestrale pour la vie moderne : comment les éléments lisent ce qui se passe en vous.',
    duration: '90 min · ½ journée',
    format: 'Présentiel · Hybride',
    feature: true,
  },
  {
    icon: <MoonStars size={20} weight="regular" />,
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

/* ════════════════════════ Primitives V2 ════════════════════════ */

const Eyebrow: React.FC<{ children: React.ReactNode; on?: 'light' | 'dark' }> = ({ children, on = 'light' }) => (
  <p className={`text-[0.7rem] uppercase tracking-[0.34em] ${on === 'dark' ? 'text-[#c8a464]' : 'text-[#9c7a44]'}`}>
    {children}
  </p>
);

/* Filet d'édition : hairline + libellé gauche + libellé droite */
const EditionRule: React.FC<{ left: string; right?: string; on?: 'light' | 'dark' }> = ({ left, right, on = 'light' }) => {
  const c = on === 'dark' ? 'border-[#f4efe6]/15 text-[#f4efe6]/55' : 'border-[#1c1712]/15 text-[#1c1712]/55';
  return (
    <div className={`flex items-center justify-between border-t pt-3.5 text-[0.6rem] uppercase tracking-[0.28em] ${c}`}>
      <span>{left}</span>
      {right && <span className="hidden sm:inline">{right}</span>}
    </div>
  );
};

/* Champ de formulaire crème, encre, anneau de focus laiton */
const V2_FIELD =
  'w-full rounded-[3px] border border-[#1c1712]/15 bg-[#faf6ef] px-4 py-3 text-sm text-[#1c1712] placeholder:text-[#1c1712]/40 focus:outline-none focus:border-[#9c7a44] focus:ring-1 focus:ring-[#9c7a44] transition-colors min-h-[44px]';

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
    className={`${V2_FIELD} ${className}`}
  />
);

const SelectField: React.FC<{
  label: string; value: string; onChange: (v: string) => void;
  options: { id: string; label: string }[];
}> = ({ label, value, onChange, options }) => (
  <label className="block">
    <span className="block mb-2 text-[0.6rem] uppercase tracking-[0.18em] text-[#9c7a44] font-medium">{label}</span>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${V2_FIELD} appearance-none pr-10 cursor-pointer`}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
      <CaretDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9c7a44] pointer-events-none" />
    </div>
  </label>
);

const FormBlock: React.FC<{ step: string; title: string; children: React.ReactNode }> = ({ step, title, children }) => (
  <div className="rounded-[6px] border border-[#1c1712]/12 bg-[#faf6ef] p-5 md:p-6">
    <div className="flex items-center gap-3 mb-5">
      <span className="grid place-items-center w-8 h-8 rounded-full bg-[#9c7a44] text-[#f4efe6] v2-serif text-sm tabular-nums shrink-0">{step}</span>
      <h3 className="v2-serif text-lg md:text-xl text-[#1c1712]">{title}</h3>
    </div>
    {children}
  </div>
);

/* ════════════════════════ FAQ (accordéon, crème) ════════════════════════ */

const FaqSection: React.FC = () => {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,15vh,11rem)] scroll-mt-24">
      <div className="mx-auto w-full max-w-[920px]">
        <EditionRule left="N° 06 · Avant d'envoyer" right="Questions" />
        <div className="mt-10 mb-12" data-reveal>
          <Eyebrow>Questions courantes</Eyebrow>
          <h2 data-split className="v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2.1rem,5vw,3.6rem)] mt-5">
            Avant d’écrire
          </h2>
        </div>

        <div data-group>
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div
                key={i}
                data-item
                className={`border-t ${isOpen ? 'border-[#9c7a44]/40' : 'border-[#1c1712]/12'} ${i === FAQS.length - 1 ? 'border-b' : ''}`}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="w-full text-left py-6 flex items-start justify-between gap-6 min-h-[44px] group"
                >
                  <h3 className={`v2-serif text-lg md:text-xl pr-4 transition-colors ${isOpen ? 'text-[#9c7a44]' : 'text-[#1c1712] group-hover:text-[#9c7a44]'}`}>
                    <span className="tabular-nums text-[#1c1712]/40 mr-3 text-base">{String(i + 1).padStart(2, '0')}</span>
                    {f.q}
                  </h3>
                  <CaretDown size={18} className={`shrink-0 mt-1.5 text-[#9c7a44] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <div
                  className="grid transition-[grid-template-rows] duration-300 ease-out"
                  style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                >
                  <div className="overflow-hidden">
                    <p className="pb-7 pr-8 text-[#1c1712]/70 leading-[1.85] text-[0.95rem] max-w-[64ch]">
                      {f.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/* ════════════════════════ Événements en direct (back-end préservé) ════════════════════════ */

const EventsSection: React.FC = () => {
  const { lang } = useApp();
  const [extraEvents, setExtraEvents] = useState<EventDoc[]>([]);
  useEffect(() => {
    getEvents().then(setExtraEvents).catch(() => setExtraEvents([]));
  }, []);
  const upcoming = getUpcomingEvents();
  const extraUpcoming = extraEvents.filter((ev) => new Date(ev.date) >= new Date()).slice(0, 6);

  return (
    <section id="events" className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,15vh,11rem)] scroll-mt-24">
      <div className="mx-auto w-full max-w-[1280px]">
        <EditionRule left="N° 07 · En direct" right="Où on se rejoint" />
        <div className="mt-10 mb-14 max-w-[44ch]" data-reveal>
          <Eyebrow>Événements &amp; conférences</Eyebrow>
          <h2 data-split className="v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2.1rem,5vw,3.8rem)] mt-5">
            Rencontres à venir
          </h2>
          <p className="mt-6 v2-serif italic text-[clamp(1.1rem,2vw,1.5rem)] text-[#1c1712]/60">
            Rencontres en direct, retraites, lancements, plus une tournée en préparation.
          </p>
        </div>

        <div data-reveal>
          <LiveEventsSection events={upcoming} />
        </div>

        {extraUpcoming.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8" data-group>
            {extraUpcoming.map((ev) => {
              const dateStr = new Date(ev.date).toLocaleDateString('fr-CA', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              });
              return (
                <div
                  key={ev.id}
                  data-item
                  className="group h-full rounded-[6px] border border-[#1c1712]/12 bg-[#faf6ef] p-6 transition-shadow hover:shadow-[0_18px_40px_rgba(28,23,18,0.08)]"
                >
                  <span className="text-[0.6rem] uppercase tracking-[0.22em] font-medium text-[#9c7a44] block mb-3">{dateStr}</span>
                  <h3 className="v2-serif text-xl md:text-2xl text-[#1c1712] mb-1 transition-colors group-hover:text-[#9c7a44]">{ev.title}</h3>
                  {ev.subtitle && <p className="text-sm v2-serif italic text-[#1c1712]/55 mb-3">{ev.subtitle}</p>}
                  {ev.location && (
                    <p className="text-sm text-[#1c1712]/65 flex items-center gap-2 mb-3">
                      <MapPin size={13} className="text-[#9c7a44]" />{ev.location}
                    </p>
                  )}
                  {ev.description && (
                    <p className="text-sm text-[#1c1712]/65 leading-relaxed mb-4 line-clamp-3">{ev.description}</p>
                  )}
                  {ev.registrationLink && (
                    <a
                      href={ev.registrationLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-[#1c1712] text-[#f4efe6] px-5 py-2 uppercase tracking-[0.16em] text-[0.65rem] transition-colors hover:bg-[#9c7a44]"
                    >
                      {lang === 'FR' ? "S'inscrire" : 'Register'}<ArrowRight size={13} />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

/* ════════════════════════ Page ════════════════════════ */

export default function ConferenciereV2() {
  const root = useRef<HTMLDivElement>(null);
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

  /* ── Motion : une seule instance Lenis + GSAP/ScrollTrigger pour toute la page ── */
  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce) return;

    let lenis: Lenis | null = null;
    const splits: SplitType[] = [];
    const raf = (time: number) => lenis?.raf(time * 1000);
    const power3 = 'power3.out';

    const ctx = gsap.context(() => {
      // Défilement doux
      lenis = new Lenis({ duration: 1.1, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);

      /* ── HERO (séquence au chargement, portée au hero) ── */
      gsap.from('[data-hero] [data-line] > span', {
        yPercent: 115, duration: 1.2, ease: power3, stagger: 0.12, delay: 0.15,
      });
      gsap.from('[data-portrait-clip]', {
        clipPath: 'inset(0% 0% 100% 0%)', duration: 1.35, ease: power3, delay: 0.35,
      });
      gsap.from('[data-portrait-img]', {
        scale: 1.14, duration: 1.9, ease: power3, delay: 0.35,
      });
      gsap.from('[data-hero] [data-fade]', {
        opacity: 0, y: 22, duration: 1, ease: power3, stagger: 0.09, delay: 0.7,
      });
      gsap.to('[data-portrait-img]', {
        yPercent: 8, ease: 'none',
        scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: 'bottom top', scrub: true },
      });

      /* ── Titres : révélation ligne par ligne (SplitType) ── */
      gsap.utils.toArray<HTMLElement>('[data-split]').forEach((el) => {
        const s = new SplitType(el, { types: 'lines', lineClass: 'v2-line' });
        splits.push(s);
        gsap.set(el.querySelectorAll('.v2-line'), { overflow: 'hidden' });
        if (s.lines) {
          gsap.from(s.lines, {
            yPercent: 110, duration: 1.1, ease: power3, stagger: 0.1,
            scrollTrigger: { trigger: el, start: 'top 85%' },
          });
        }
      });

      /* ── Groupes : fade-up échelonné (80–120 ms) ── */
      gsap.utils.toArray<HTMLElement>('[data-group]').forEach((group) => {
        const items = group.querySelectorAll('[data-item]');
        if (!items.length) return;
        gsap.from(items, {
          opacity: 0, y: 30, duration: 1.05, ease: power3, stagger: 0.1,
          scrollTrigger: { trigger: group, start: 'top 80%' },
        });
      });

      /* ── Révélations simples ── */
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
        gsap.from(el, {
          opacity: 0, y: 26, duration: 1, ease: power3,
          scrollTrigger: { trigger: el, start: 'top 86%' },
        });
      });

      /* ── Volets clip-path sur images ── */
      gsap.utils.toArray<HTMLElement>('[data-clip]').forEach((el) => {
        gsap.from(el, {
          clipPath: 'inset(100% 0% 0% 0%)', duration: 1.3, ease: power3,
          scrollTrigger: { trigger: el, start: 'top 84%' },
        });
      });

      /* ── Parallaxe douce (transform only) ── */
      gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((el) => {
        gsap.to(el, {
          yPercent: -10, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
        });
      });
    }, root);

    // Recalcul après chargement des polices (les lignes peuvent se reflouer).
    const refresh = () => ScrollTrigger.refresh();
    if (typeof document !== 'undefined' && (document as any).fonts?.ready) {
      (document as any).fonts.ready.then(refresh);
    }

    return () => {
      ctx.revert();
      splits.forEach((s) => s.revert());
      gsap.ticker.remove(raf);
      lenis?.destroy();
    };
  }, []);

  const navLinks: [string, string][] = [
    ['Histoire', '#histoire'],
    ['Conférences', '#talks'],
    ['Réserver', '#reserver'],
  ];

  return (
    <div
      ref={root}
      className="relative min-h-screen w-full bg-[#f4efe6] text-[#1c1712] antialiased overflow-x-hidden"
      style={{ fontFamily: '"Inter", system-ui, sans-serif' }}
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
        .v2-cue { animation: v2cue 2.4s ${EASE} infinite; }
        @media (prefers-reduced-motion: reduce) { .v2-cue { animation: none; } }
      `}</style>

      <div className="v2-grain" aria-hidden />

      {/* ─────────── NAV · masthead magazine ─────────── */}
      <header className="fixed top-0 left-0 z-50 w-full px-[clamp(1.5rem,5vw,5.5rem)] py-6 flex items-center justify-between mix-blend-multiply">
        <a href="#" className="v2-serif text-[1.05rem] tracking-tight text-[#1c1712]">
          Krystine <span className="italic font-light">St-Laurent</span>
        </a>
        <nav className="hidden md:flex items-center gap-10">
          {navLinks.map(([label, href]) => (
            <a
              key={label}
              href={href}
              className="text-[0.7rem] uppercase tracking-[0.22em] text-[#1c1712]/70 hover:text-[#9c7a44] transition-colors duration-300"
            >
              {label}
            </a>
          ))}
        </nav>
        <span className="text-[0.62rem] uppercase tracking-[0.24em] text-[#1c1712]/50">
          Inspira&nbsp;Nature
        </span>
      </header>

      {/* ─────────── S0 · HERO couverture ─────────── */}
      <section
        data-hero
        className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] pt-[clamp(7rem,13vh,9.5rem)] pb-[clamp(2rem,5vh,4rem)] min-h-screen flex flex-col"
      >
        <div
          data-fade
          className="flex items-center justify-between border-t border-[#1c1712]/15 pt-3.5 text-[0.6rem] uppercase tracking-[0.28em] text-[#1c1712]/55"
        >
          <span>N&deg; 01 &middot; Conférences &amp; Ayurvéda</span>
          <span className="hidden sm:inline">Québec &middot; MMXXVI</span>
        </div>

        <div className="flex-1 grid items-stretch gap-x-[clamp(2rem,5vw,5rem)] gap-y-10 lg:grid-cols-[1.05fr_0.95fr] mt-[clamp(2rem,5vh,4rem)]">
          {/* MASTHEAD */}
          <div className="order-1 lg:row-start-1 lg:col-start-1 self-start">
            <p data-fade className="text-[0.7rem] uppercase tracking-[0.34em] text-[#9c7a44] mb-7">
              Conférencière &middot; Autrice
            </p>
            <h1 className="v2-serif font-light leading-[0.9] text-[#1c1712] text-[clamp(3.2rem,9.5vw,9.5rem)]">
              <span data-line className="block overflow-hidden">
                <span className="block">Krystine</span>
              </span>
              <span data-line className="block overflow-hidden">
                <span className="block italic font-normal text-[#3a2f23]">St-Laurent</span>
              </span>
            </h1>
          </div>

          {/* PORTRAIT */}
          <div className="order-2 lg:row-start-1 lg:row-span-2 lg:col-start-2 self-stretch relative flex">
            <div className="relative w-full min-h-[58vh] lg:min-h-0">
              <span className="pointer-events-none absolute -inset-2 border border-[#9c7a44]/35" aria-hidden />
              <div
                data-portrait-clip
                className="relative h-full w-full overflow-hidden"
                style={{ clipPath: 'inset(0% 0% 0% 0%)' }}
              >
                <img
                  data-portrait-img
                  src="/accueil/assets/hero-ml-poster.jpg"
                  alt="Krystine St-Laurent, conférencière et autrice"
                  className="h-full w-full object-cover object-[47%_32%] will-change-transform"
                />
                <div
                  className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
                  style={{ background: 'linear-gradient(to top, rgba(28,23,18,0.45), transparent)' }}
                  aria-hidden
                />
                <p data-fade className="absolute bottom-4 left-4 right-4 v2-serif italic text-[#f4efe6] text-sm tracking-wide">
                  « Une voix rare, où la rigueur du clinicien rencontre la sagesse millénaire. »
                </p>
              </div>
              <span data-fade className="absolute -top-2 -left-2 bg-[#1c1712] text-[#f4efe6] px-3 py-1.5 text-[0.58rem] uppercase tracking-[0.24em]">
                Édition Ayurvéda
              </span>
            </div>
          </div>

          {/* BAS-GAUCHE · cover-lines + tagline + CTA */}
          <div className="order-3 lg:row-start-2 lg:col-start-1 self-end">
            <ul data-fade className="flex flex-wrap gap-x-7 gap-y-2 mb-7">
              {COVERLINES.map((c) => (
                <li key={c} className="flex items-center gap-2.5 text-[0.68rem] uppercase tracking-[0.2em] text-[#1c1712]/70">
                  <span className="h-1 w-1 rounded-full bg-[#9c7a44]" />
                  {c}
                </li>
              ))}
            </ul>

            <p data-fade className="v2-serif text-[clamp(1.35rem,2.4vw,1.95rem)] font-light leading-[1.32] text-[#3a2f23] max-w-[34ch]">
              Chaque conférence est cousue main pour le public qui l&rsquo;attend. Pas un
              module pré-fait, une rencontre.
            </p>

            <div data-fade className="mt-9 flex flex-wrap items-center gap-x-9 gap-y-4">
              <button
                onClick={scrollToForm}
                className="group inline-flex items-center gap-2.5 text-[0.72rem] uppercase tracking-[0.2em] text-[#1c1712] border-b border-[#1c1712] pb-1.5 transition-colors duration-300 hover:text-[#9c7a44] hover:border-[#9c7a44]"
              >
                Réserver Krystine
                <ArrowUpRight size={15} weight="regular" className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
              <a href="#talks" className="v2-serif italic text-lg text-[#1c1712]/70 hover:text-[#9c7a44] transition-colors duration-300">
                Voir les conférences
              </a>
            </div>
          </div>
        </div>

        <div
          data-fade
          className="flex items-end justify-between border-b border-[#1c1712]/15 pb-3.5 mt-[clamp(1.5rem,4vh,3rem)] text-[0.6rem] uppercase tracking-[0.28em] text-[#1c1712]/55"
        >
          <span className="flex items-center gap-2 v2-cue">
            <ArrowDown size={13} weight="regular" />
            Faire défiler
          </span>
          <span className="hidden sm:inline">Salut Bonjour &middot; TEDx</span>
        </div>
      </section>

      {/* ─────────── S1 · SON HISTOIRE ─────────── */}
      <section id="histoire" className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,16vh,12rem)] scroll-mt-24">
        <EditionRule left="N° 02 · Chapitre 01 · Son histoire" right="De la clinique à la scène" />

        <div data-beat-grid className="mt-12 grid gap-x-[clamp(2rem,5vw,5rem)] gap-y-14 lg:grid-cols-[0.95fr_1.05fr] items-start">
          {/* Colonne gauche · titre + chiffres + image inset */}
          <div>
            <Eyebrow>Chapitre 01 &middot; Son histoire</Eyebrow>
            <h2 data-split className="v2-serif font-light leading-[1.04] text-[#1c1712] text-[clamp(2.2rem,5vw,4rem)] mt-5 max-w-[12ch]">
              De la clinique à la scène
            </h2>
            <div className="mt-7 h-px w-16 bg-[#9c7a44]" />

            <div className="mt-12 grid grid-cols-3 gap-6 max-w-md border-t border-[#1c1712]/15 pt-9" data-group>
              {[
                ['37', 'ans de pratique'],
                ['03', 'livres publiés'],
                ['TEDx', 'et Salut Bonjour'],
              ].map(([n, l]) => (
                <div data-item key={l}>
                  <p className="v2-serif text-[clamp(1.8rem,3.6vw,2.9rem)] font-light leading-none text-[#9c7a44]">{n}</p>
                  <p className="mt-3 text-[0.66rem] uppercase tracking-[0.18em] text-[#1c1712]/60 leading-relaxed">{l}</p>
                </div>
              ))}
            </div>

            <div className="relative mt-12 max-w-md">
              <div
                data-clip
                className="relative aspect-[4/5] w-full overflow-hidden"
                style={{ clipPath: 'inset(0% 0% 0% 0%)' }}
              >
                <img
                  data-parallax
                  src="/origine-square.jpg"
                  alt="Krystine St-Laurent, univers Inspira Nature"
                  className="absolute inset-0 h-[120%] w-full object-cover object-center will-change-transform"
                />
              </div>
              <p data-reveal className="mt-4 v2-serif italic text-[#1c1712]/55 text-sm">
                De la clinique à la scène &middot; Inspira Nature
              </p>
            </div>
          </div>

          {/* Colonne droite · les trois paragraphes (copie reprise) */}
          <div className="space-y-9 lg:pt-2" data-group>
            {STORY.map((p, i) => (
              <p data-item key={i} className="text-[1.02rem] leading-[1.9] text-[#1c1712]/75 max-w-[58ch]">
                <span className="v2-serif italic text-[#9c7a44] text-xl mr-2.5 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                {p}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── S2 · CONFÉRENCES SIGNATURE ─────────── */}
      <section id="talks" className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,15vh,11rem)] scroll-mt-24">
        <EditionRule left="N° 03 · Chapitre 02 · Conférences signature" right="Trois trames maîtresses" />

        <div className="mt-12 mb-16 max-w-[46ch]" data-reveal>
          <Eyebrow>Chapitre 02 &middot; Conférences signature</Eyebrow>
          <h2 data-split className="v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2.2rem,5.2vw,4.2rem)] mt-5">
            Trois portes d’entrée
          </h2>
          <p className="mt-6 v2-serif italic text-[clamp(1.1rem,2vw,1.5rem)] text-[#1c1712]/60">
            Trois trames maîtresses. Chacune adaptée à votre public, votre temps, votre lieu.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-px bg-[#1c1712]/12 border border-[#1c1712]/12" data-group>
          {SIGNATURE_TALKS.map((talk) => (
            <article
              data-item
              key={talk.title}
              className={`h-full flex flex-col p-8 lg:p-10 ${talk.feature ? 'bg-[#1c1712] text-[#f4efe6]' : 'bg-[#f4efe6]'}`}
            >
              <span className={`grid place-items-center w-12 h-12 rounded-full mb-7 ${talk.feature ? 'bg-[#c8a464] text-[#1c1712]' : 'bg-[#9c7a44] text-[#f4efe6]'}`}>
                {talk.icon}
              </span>
              <span className={`text-[0.6rem] uppercase tracking-[0.24em] mb-3 ${talk.feature ? 'text-[#c8a464]' : 'text-[#9c7a44]'}`}>
                {talk.kicker}
              </span>
              <h3 className={`v2-serif font-light text-2xl leading-[1.15] mb-4 ${talk.feature ? 'text-[#f4efe6]' : 'text-[#1c1712]'}`}>
                {talk.title}
              </h3>
              <p className={`v2-serif italic leading-relaxed text-[0.98rem] flex-1 ${talk.feature ? 'text-[#f4efe6]/75' : 'text-[#1c1712]/65'}`}>
                {talk.lede}
              </p>
              <div className={`mt-8 pt-5 border-t flex flex-wrap items-center gap-4 text-[0.62rem] uppercase tracking-[0.16em] ${talk.feature ? 'border-[#f4efe6]/20 text-[#f4efe6]/75' : 'border-[#1c1712]/15 text-[#1c1712]/60'}`}>
                <span className="inline-flex items-center gap-1.5"><Clock size={13} className={talk.feature ? 'text-[#c8a464]' : 'text-[#9c7a44]'} />{talk.duration}</span>
                <span className={`w-1 h-1 rounded-full ${talk.feature ? 'bg-[#c8a464]/60' : 'bg-[#9c7a44]/50'}`} />
                <span className="inline-flex items-center gap-1.5"><MapPin size={13} className={talk.feature ? 'text-[#c8a464]' : 'text-[#9c7a44]'} />{talk.format}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ─────────── S3 · TÉMOIGNAGES · pleine page sombre ─────────── */}
      <section className="relative w-full bg-[#16100a] text-[#f4efe6] px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,16vh,12rem)]">
        <EditionRule left="N° 04 · Ce qu'on en dit" right="Après son passage" on="dark" />

        <div className="mt-12 mb-16 max-w-[40ch]" data-reveal>
          <Eyebrow on="dark">Ce qu’on en dit</Eyebrow>
          <h2 data-split className="v2-serif font-light leading-[1.02] text-[#f4efe6] text-[clamp(2.2rem,5.2vw,4.2rem)] mt-5">
            Après son passage
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-x-[clamp(2rem,4vw,4rem)] gap-y-12" data-group>
          {TESTIMONIALS.map((t) => (
            <figure data-item key={t.by} className="h-full flex flex-col border-t border-[#f4efe6]/15 pt-8">
              <Quotes size={30} weight="fill" className="text-[#c8a464]/50 mb-6" />
              <blockquote className="v2-serif italic text-[#f4efe6] text-[1.15rem] leading-[1.55] flex-1">
                « {t.quote} »
              </blockquote>
              <figcaption className="mt-7 text-[0.62rem] uppercase tracking-[0.22em] text-[#c8a464]">
                {t.by}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ─────────── S4 · COMMENT ÇA SE PASSE ─────────── */}
      <section className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,15vh,11rem)]">
        <EditionRule left="N° 05 · Chapitre 03 · Comment ça se passe" right="De la demande à la scène" />

        <div className="mt-12 mb-16 max-w-[44ch]" data-reveal>
          <Eyebrow>Chapitre 03 &middot; Comment ça se passe</Eyebrow>
          <h2 data-split className="v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2.2rem,5.2vw,4.2rem)] mt-5">
            De la demande à la scène
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-x-[clamp(1.5rem,3vw,3rem)] gap-y-12" data-group>
          {PROCESS_STEPS.map((step) => (
            <div data-item key={step.n} className="border-t-2 border-[#9c7a44] pt-6">
              <span className="v2-serif text-4xl font-light text-[#9c7a44] tabular-nums leading-none">{step.n}</span>
              <h3 className="mt-5 v2-serif text-xl text-[#1c1712] leading-snug">{step.title}</h3>
              <p className="mt-3 text-[0.92rem] leading-[1.8] text-[#1c1712]/70">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────── S5 · RÉSERVER · FORMULAIRE (back-end préservé) ─────────── */}
      <section
        id="reserver"
        ref={formRef}
        className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,15vh,11rem)] scroll-mt-24"
      >
        <div className="mx-auto w-full max-w-[1000px]">
          <EditionRule left="N° 08 · Chapitre 04 · Réserver Krystine" right="Réponse sous 48 h" />

          <div className="mt-12 mb-12 max-w-[46ch]" data-reveal>
            <Eyebrow>Chapitre 04 &middot; Réserver Krystine</Eyebrow>
            <h2 data-split className="v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2.2rem,5.2vw,4.2rem)] mt-5">
              Faire une demande
            </h2>
            <p className="mt-6 v2-serif italic text-[clamp(1.1rem,2vw,1.4rem)] text-[#1c1712]/60">
              Quelques questions, cela aide l’équipe à préparer une proposition juste. Réponse sous 48 h ouvrables.
            </p>
          </div>

          <div data-reveal className="rounded-[10px] border border-[#1c1712]/12 bg-[#faf6ef] p-6 md:p-10">
            {sent ? (
              <div className="text-center py-10">
                <span className="inline-grid place-items-center w-16 h-16 rounded-full bg-[#9c7a44]/15 text-[#9c7a44] mb-5">
                  <Check size={28} />
                </span>
                <h3 className="v2-serif text-2xl md:text-3xl text-[#1c1712] mb-3">Demande envoyée.</h3>
                <p className="v2-serif italic text-[#1c1712]/65 max-w-md mx-auto leading-relaxed">
                  Merci. L’équipe vous revient sous 48 h ouvrables avec une proposition adaptée.
                </p>
              </div>
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
                    className={`${V2_FIELD} resize-none`}
                  />
                </FormBlock>

                {err && <p className="text-center text-sm text-red-700">{err}</p>}

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full inline-flex items-center justify-center gap-2.5 rounded-full bg-[#1c1712] py-4 text-[0.7rem] uppercase tracking-[0.2em] text-[#f4efe6] transition-colors hover:bg-[#9c7a44] disabled:opacity-60 min-h-[44px]"
                >
                  {sending ? <CircleNotch size={15} className="animate-spin" /> : <PaperPlaneTilt size={15} />}
                  Envoyer la demande
                </button>

                <p className="text-center text-[0.78rem] italic v2-serif text-[#1c1712]/55 pt-1">
                  Vos réponses sont enregistrées de manière confidentielle. L’équipe revient vers vous avec une proposition adaptée.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ─────────── S6 · FAQ ─────────── */}
      <FaqSection />

      {/* ─────────── S7 · ÉVÉNEMENTS EN DIRECT (back-end préservé) ─────────── */}
      <EventsSection />

      {/* ─────────── S8 · INFOLETTRE · pleine page sombre (back-end préservé) ─────────── */}
      <section className="relative w-full bg-[#16100a] text-[#f4efe6] px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,16vh,12rem)]">
        <EditionRule left="N° 09 · Une correspondance" right="Rester en lien" on="dark" />
        <div className="mx-auto w-full max-w-[760px] text-center mt-14" data-reveal>
          <Eyebrow on="dark">Une correspondance</Eyebrow>
          <h2 data-split className="v2-serif font-light leading-[1.02] text-[#f4efe6] text-[clamp(2.2rem,5.2vw,4.2rem)] mt-5">
            Rester en lien
          </h2>
          <p className="mt-6 v2-serif italic text-[clamp(1.1rem,2vw,1.4rem)] text-[#f4efe6]/65 max-w-[44ch] mx-auto leading-snug">
            Les nouvelles conférences, les tournées et les rendez-vous, déposés dans votre boîte, sans bruit.
          </p>
          <div className="mt-12">
            <NewsletterSignup
              source="conferenciere"
              variant="dark"
              ctaLabel="Rejoindre le fil"
              placeholder="Votre adresse courriel"
              className="max-w-xl mx-auto"
            />
          </div>
        </div>
      </section>

      {/* ─────────── S9 · CLÔTURE · CTA ─────────── */}
      <section className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,14vh,10rem)]">
        <div className="mx-auto w-full max-w-[820px] text-center" data-reveal>
          <p className="v2-serif italic font-light text-[clamp(1.6rem,3.6vw,2.8rem)] leading-[1.24] text-[#1c1712]">
            « Krystine ne fait pas une conférence, elle ouvre un espace. »
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-9 gap-y-4">
            <button
              onClick={scrollToForm}
              className="group inline-flex items-center gap-2.5 rounded-full bg-[#1c1712] px-9 py-4 text-[0.7rem] uppercase tracking-[0.2em] text-[#f4efe6] transition-colors duration-300 hover:bg-[#9c7a44] min-h-[44px]"
            >
              Réserver Krystine
              <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-0.5" />
            </button>
            <a
              href="mailto:teamksl@inspiratanature.com"
              className="inline-flex items-center gap-2 v2-serif italic text-lg text-[#9c7a44] hover:text-[#1c1712] transition-colors border-b border-[#9c7a44]/40 pb-1"
            >
              <EnvelopeSimple size={16} /> teamksl@inspiratanature.com
            </a>
          </div>
        </div>
      </section>

      {/* ─────────── FOOTER · magazine minimal ─────────── */}
      <footer className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] pb-12 pt-2">
        <div className="border-t border-[#1c1712]/15 pt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <a href="#" className="v2-serif text-[1.15rem] tracking-tight text-[#1c1712]">
              Krystine <span className="italic font-light">St-Laurent</span>
            </a>
            <p className="mt-2 text-[0.62rem] uppercase tracking-[0.24em] text-[#1c1712]/50">
              Inspira&nbsp;Nature &middot; Québec
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <a href="#talks" className="text-[0.7rem] uppercase tracking-[0.2em] text-[#1c1712]/65 hover:text-[#9c7a44] transition-colors">Conférences</a>
            <a href="#reserver" className="text-[0.7rem] uppercase tracking-[0.2em] text-[#1c1712]/65 hover:text-[#9c7a44] transition-colors">Réserver</a>
            <a href="mailto:teamksl@inspiratanature.com" className="text-[0.7rem] uppercase tracking-[0.2em] text-[#1c1712]/65 hover:text-[#9c7a44] transition-colors">
              teamksl@inspiratanature.com
            </a>
          </nav>
        </div>
        <p className="mt-8 text-[0.58rem] uppercase tracking-[0.24em] text-[#1c1712]/40">
          © MMXXVI Inspira Nature. Tous droits réservés.
        </p>
      </footer>
    </div>
  );
}
