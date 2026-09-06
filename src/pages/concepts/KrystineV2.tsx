import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import SplitType from 'split-type';
import {
  ArrowUpRight, ArrowDown, ArrowRight, CaretDown, Check, CircleNotch,
  MapPin, Clock, Compass, Microphone, MoonStars, Quotes, EnvelopeSimple,
} from '@phosphor-icons/react';
import { useApp } from '../../contexts/AppContext';
import NewsletterSignup from '../../components/NewsletterSignup';
import CompteUpsell from '../../components/CompteUpsell';
import LiveEventsSection from '../../components/LiveEvents';
import { getEvents, addBookingRequest, type EventDoc } from '../../firebase/firestore';
import type {
  AudienceSize, AudienceType, BudgetRange, EventFormat,
  InterventionDuration, InterventionKind, LangPref,
} from '../../firebase/firestore';
import { getUpcomingEvents } from '../../lib/liveEvents';

gsap.registerPlugin(ScrollTrigger);

/**
 * Concept V2 — « Clair, aéré, luxe magazine (crème) », maintenant en page
 * vitrine complète pour Krystine St-Laurent, conférencière et autrice.
 * Hero couverture + parcours éditorial (histoire, conférences, témoignages,
 * processus, réservation, FAQ, agenda, infolettre). Le back-end est préservé :
 * réservation (addBookingRequest), événements en direct (getUpcomingEvents +
 * LiveEventsSection + getEvents Firestore), infolettre (NewsletterSignup).
 * Toutes les animations sont en transform/opacity (protocole Poids-plume).
 */

const EASE = 'cubic-bezier(0.22,1,0.36,1)';

const COVERLINES = ['37 ans de pratique', '3 livres · Éditions de l’Homme', 'USA, Canada & Europe'];

/* ════════════════════════ Données éditoriales ════════════════════════ */

const SIGNATURE_TALKS: {
  icon: React.ReactNode; kicker: string; title: string; lede: string;
  duration: string; format: string; feature?: boolean;
}[] = [
  {
    icon: <Compass size={22} weight="light" />,
    kicker: 'Conférence vedette',
    title: 'Au-delà des tendances',
    lede: "Reprendre SA direction, écouter ce que le corps sait avant que l’algorithme ne l’écrase.",
    duration: '60 à 90 min',
    format: 'Présentiel · Virtuel',
  },
  {
    icon: <Microphone size={22} weight="light" />,
    kicker: 'Conférence signature',
    title: 'L’Ayurveda comme boussole intérieure',
    lede: 'Une cartographie ancestrale pour la vie moderne : comment les éléments lisent ce qui se passe en vous.',
    duration: '90 min · ½ journée',
    format: 'Présentiel · Hybride',
    feature: true,
  },
  {
    icon: <MoonStars size={22} weight="light" />,
    kicker: 'Conférence dédiée',
    title: 'La femme et ses saisons',
    lede: "Cycles biologiques et saisons intérieures, pour vivre en alliance avec son corps plutôt qu’à son insu.",
    duration: '60 min',
    format: 'Présentiel',
  },
];

const TESTIMONIALS = [
  {
    quote: "Krystine a une voix rare, celle d’une femme qui sait, qui a vu, et qui sait nommer ce que le public n’a jamais osé dire. Notre événement n’a pas été le même après son passage.",
    by: 'Productrice · Festival Mondial',
  },
  {
    quote: 'Un mélange parfait de rigueur scientifique et de sagesse ancestrale. Notre équipe est repartie avec des outils concrets et une nouvelle perspective.',
    by: 'Directrice RH · Entreprise québécoise',
  },
  {
    quote: "Krystine ne fait pas une conférence. Elle ouvre un espace. Le public écoute différemment, comme s’il rentrait à la maison.",
    by: 'Animatrice · Salut Bonjour',
  },
];

const PROCESS_STEPS = [
  { n: '01', title: 'Vous nous écrivez', body: "Quelques minutes pour répondre au formulaire ci-dessous. Plus on en sait sur votre vision, mieux on prépare la rencontre." },
  { n: '02', title: 'Échange de cadrage', body: "L’équipe revient sous 48 h ouvrables avec une proposition. Si elle convient, on planifie un appel pour affiner." },
  { n: '03', title: 'Co-création', body: "Krystine ajuste l’intervention selon votre public et votre contexte. Ce n’est jamais un module pré-fait." },
  { n: '04', title: 'Sur scène', body: 'Le jour J, Krystine arrive ancrée et libre. Le reste appartient au public.' },
];

const FAQS = [
  { q: 'Quels sujets Krystine aborde-t-elle ?', a: "Ayurveda, santé féminine, médecine intégrative, équilibre travail-vie, transmission générationnelle, écologie intérieure. Les conférences sont toujours adaptées au public." },
  { q: "Voyage-t-elle à l’extérieur du Québec ?", a: "Oui : Canada, États-Unis, France, Belgique, Suisse selon l’agenda. Indiquez la ville dans le formulaire et on vous revient avec la faisabilité." },
  { q: 'Quels sont les délais habituels ?', a: "8 à 16 semaines avant l’événement permettent une préparation idéale. Les demandes plus serrées sont étudiées au cas par cas." },
  { q: 'En quelles langues ?', a: 'Français principalement, anglais sur demande, bilingue possible.' },
  { q: 'Quelle fourchette tarifaire ?', a: "Variable selon le format, la durée, le public et le déplacement. Indiquez votre enveloppe budgétaire dans le formulaire et l’équipe vous revient avec un devis adapté." },
];

/* ── Options du formulaire (back-end préservé) ── */
const INTERVENTION_OPTIONS: { id: InterventionKind; label: string }[] = [
  { id: 'keynote', label: 'Conférence / Keynote' },
  { id: 'workshop', label: 'Atelier pratique' },
  { id: 'panel', label: 'Table ronde / Panel' },
  { id: 'hosting', label: "Animation d’événement" },
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
  { id: 'half-day', label: 'Demi-journée (2-3 h)' },
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

// Eyebrow chapitre, registre de couverture.
const Kicker: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <p className={`text-[0.7rem] uppercase tracking-[0.34em] text-[#7d6330] ${className}`}>{children}</p>
);

// Champ éditorial : filet bas, pas de boîte (langage magazine).
const FIELD =
  'w-full bg-transparent border-b border-[#1c1712]/20 px-1 py-2.5 text-[0.95rem] text-[#1c1712] placeholder:text-[#1c1712]/40 focus:outline-none focus:border-[#9c7a44] transition-colors duration-300';

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
    <span className="block mb-2 text-[0.6rem] uppercase tracking-[0.2em] text-[#1c1712]/55">{label}</span>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${FIELD} appearance-none pr-8 cursor-pointer`}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
      <CaretDown size={14} weight="light" className="absolute right-1 top-1/2 -translate-y-1/2 text-[#7d6330] pointer-events-none" />
    </div>
  </label>
);

const Fieldset: React.FC<{ step: string; title: string; children: React.ReactNode }> = ({ step, title, children }) => (
  <div>
    <div className="flex items-baseline gap-3 mb-6">
      <span className="v2-serif italic text-[#7d6330] text-lg tabular-nums">{step}</span>
      <h3 className="v2-serif text-[1.25rem] font-light text-[#1c1712]">{title}</h3>
    </div>
    {children}
  </div>
);

/* ════════════════════════ Section · Réserver (back-end préservé) ════════════════════════ */

const BookingSection: React.FC = () => {
  const { user, member } = useApp();
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
    } catch (e: any) {
      setErr(e?.message || 'Une erreur est survenue.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section
      id="reserver"
      className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,15vh,11rem)] bg-[#efe6d7] scroll-mt-24"
    >
      <div data-reveal className="max-w-[760px] mx-auto text-center mb-14">
        <Kicker className="mb-5">Chapitre 04 · Réserver Krystine</Kicker>
        <h2 className="v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2.2rem,5vw,3.8rem)]">
          Faire une demande
        </h2>
        <p className="mt-6 v2-serif italic text-[clamp(1.1rem,2vw,1.45rem)] text-[#3a2f23] max-w-[44ch] mx-auto leading-snug">
          Quelques questions, cela aide l’équipe à préparer une proposition juste. Réponse sous 48 h ouvrables.
        </p>
      </div>

      <div data-reveal className="max-w-[860px] mx-auto">
        <div className="relative bg-[#faf6ee] p-[clamp(1.5rem,4vw,3.5rem)]">
          <span className="pointer-events-none absolute inset-3 border border-[#9c7a44]/30" aria-hidden />
          <div className="relative">
            {sent ? (
              <div className="text-center py-12 v2-pop">
                <span className="inline-grid place-items-center w-16 h-16 rounded-full border border-[#9c7a44]/40 text-[#7d6330] mb-6">
                  <Check size={26} weight="light" />
                </span>
                <h3 className="v2-serif font-light text-[2rem] text-[#1c1712] mb-3">Demande envoyée.</h3>
                <p className="v2-serif italic text-[#3a2f23] max-w-md mx-auto leading-relaxed">
                  Merci. L’équipe vous revient sous 48 h ouvrables avec une proposition adaptée.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-12">
                <Fieldset step="01" title="Qui êtes-vous ?">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <TextField value={form.name} onChange={(v) => set('name', v)} placeholder="Prénom et nom *" required />
                    <TextField type="email" value={form.email} onChange={(v) => set('email', v)} placeholder="Courriel *" required />
                    <TextField type="tel" value={form.phone} onChange={(v) => set('phone', v)} placeholder="Téléphone" />
                    <TextField value={form.organization} onChange={(v) => set('organization', v)} placeholder="Organisation / Entreprise" />
                    <TextField type="url" value={form.organizationUrl} onChange={(v) => set('organizationUrl', v)} placeholder="Site web de l’organisation" className="md:col-span-2" />
                  </div>
                </Fieldset>

                <Fieldset step="02" title="Quel type d’intervention ?">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <SelectField label="Type d’intervention" value={form.interventionKind} onChange={(v) => set('interventionKind', v as InterventionKind)} options={INTERVENTION_OPTIONS} />
                    <SelectField label="Format" value={form.format} onChange={(v) => set('format', v as EventFormat)} options={FORMAT_OPTIONS} />
                    <SelectField label="Durée souhaitée" value={form.duration} onChange={(v) => set('duration', v as InterventionDuration)} options={DURATION_OPTIONS} />
                    <SelectField label="Langue de prestation" value={form.languagePref} onChange={(v) => set('languagePref', v as LangPref)} options={LANG_OPTIONS} />
                  </div>
                </Fieldset>

                <Fieldset step="03" title="Public et contexte">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <SelectField label="Type de public" value={form.audienceType} onChange={(v) => set('audienceType', v as AudienceType)} options={AUDIENCE_OPTIONS} />
                    <SelectField label="Taille approximative" value={form.audienceSize} onChange={(v) => set('audienceSize', v as AudienceSize)} options={SIZE_OPTIONS} />
                    <TextField value={form.city} onChange={(v) => set('city', v)} placeholder="Ville" />
                    <TextField value={form.region} onChange={(v) => set('region', v)} placeholder="Région / province" />
                  </div>
                </Fieldset>

                <Fieldset step="04" title="Date et budget">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <TextField value={form.preferredDate} onChange={(v) => set('preferredDate', v)} placeholder="Date souhaitée ou période (ex. mars 2027)" />
                    <SelectField label="Enveloppe budgétaire" value={form.budgetRange} onChange={(v) => set('budgetRange', v as BudgetRange)} options={BUDGET_OPTIONS} />
                  </div>
                </Fieldset>

                <Fieldset step="05" title="Un mot sur votre événement">
                  <textarea
                    value={form.message}
                    onChange={(e) => set('message', e.target.value)}
                    placeholder="Partagez le contexte, la thématique souhaitée, le public attendu, les contraintes logistiques, etc."
                    rows={4}
                    className={`${FIELD} resize-none`}
                  />
                </Fieldset>

                {err && <p className="text-center text-sm text-[#9a3b2f]">{err}</p>}

                <button
                  type="submit"
                  disabled={sending}
                  className="group w-full inline-flex items-center justify-center gap-3 bg-[#1c1712] py-4 text-[0.72rem] uppercase tracking-[0.22em] text-[#f4efe6] transition-colors duration-300 hover:bg-[#9c7a44] disabled:opacity-60"
                >
                  {sending
                    ? <CircleNotch size={15} weight="bold" className="animate-spin" />
                    : <ArrowUpRight size={15} weight="regular" className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />}
                  Envoyer la demande
                </button>

                <p className="text-center text-[0.82rem] italic v2-serif text-[#3a2f23]/80">
                  Vos réponses sont enregistrées de manière confidentielle. L’équipe revient vers vous avec une proposition adaptée.
                </p>
                {!user && <CompteUpsell variant="light" />}
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

/* ════════════════════════ Section · FAQ ════════════════════════ */

const FaqSection: React.FC = () => {
  const [open, setOpen] = useState<number | null>(0);
  const half = Math.ceil(FAQS.length / 2);
  const cols = [FAQS.slice(0, half), FAQS.slice(half)];

  const renderItem = (f: { q: string; a: string }, idx: number) => {
    const isOpen = open === idx;
    return (
      <div key={idx} className="border-t border-[#1c1712]/15 last:border-b">
        <button
          onClick={() => setOpen(isOpen ? null : idx)}
          aria-expanded={isOpen}
          className="w-full text-left py-7 flex items-start justify-between gap-6 group"
        >
          <span className="v2-serif text-[clamp(1.15rem,1.7vw,1.45rem)] font-light leading-snug text-[#1c1712] transition-colors duration-300 group-hover:text-[#7d6330]">
            <span className="text-[#7d6330] tabular-nums mr-3 text-[0.8em]">{String(idx + 1).padStart(2, '0')}</span>
            {f.q}
          </span>
          <CaretDown
            size={18}
            weight="light"
            className={`mt-1.5 shrink-0 text-[#7d6330] transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
        <div className={`grid transition-all duration-500 ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`} style={{ transitionTimingFunction: EASE }}>
          <div className="overflow-hidden">
            <p className="pb-8 pr-10 text-[0.98rem] leading-[1.85] text-[#3a2f23] max-w-[58ch]">
              {f.a}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,15vh,11rem)] bg-[#f4efe6]">
      <div data-reveal className="mb-14">
        <Kicker className="mb-5">Avant d’envoyer</Kicker>
        <h2 className="v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2.2rem,5vw,4rem)]">
          Questions courantes
        </h2>
      </div>
      <div data-reveal className="grid md:grid-cols-2 gap-x-[clamp(2.5rem,5vw,5.5rem)] items-start">
        {cols.map((col, c) => (
          <div key={c}>
            {col.map((f, i) => renderItem(f, c === 0 ? i : i + half))}
          </div>
        ))}
      </div>
    </section>
  );
};

/* ════════════════════════ Section · Agenda live (back-end préservé) ════════════════════════ */

const EventsSection: React.FC = () => {
  const [extraEvents, setExtraEvents] = useState<EventDoc[]>([]);
  useEffect(() => {
    getEvents().then(setExtraEvents).catch(() => setExtraEvents([]));
  }, []);
  const upcoming = getUpcomingEvents({ hideTedx: true });
  const extraUpcoming = extraEvents.filter((ev) => new Date(ev.date) >= new Date()).slice(0, 6);

  return (
    <section className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,15vh,11rem)] bg-[#f4efe6]">
      <div data-reveal className="max-w-[1040px] mx-auto text-center mb-16">
        <Kicker className="mb-5">Où on se rejoint · Live</Kicker>
        <h2 className="v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2.2rem,5vw,3.8rem)]">
          Événements &amp; Conférences
        </h2>
        <p className="mt-6 v2-serif italic text-[clamp(1.1rem,2vw,1.45rem)] text-[#3a2f23] max-w-[44ch] mx-auto leading-snug">
          Rencontres en direct, retraites, lancements, plus une tournée en préparation.
        </p>
      </div>

      <div data-reveal>
        <LiveEventsSection events={upcoming} columns={2} />

        {extraUpcoming.length > 0 && (
          <div className="mx-auto max-w-[1180px] mt-4 grid md:grid-cols-2 md:gap-x-14">
            {extraUpcoming.map((ev) => {
              const dateStr = new Date(ev.date).toLocaleDateString('fr-CA', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              });
              return (
                <article key={ev.id} className="group grid grid-cols-1 gap-2 border-t border-[#1c1712]/12 py-9 md:grid-cols-[150px_1fr] md:gap-10">
                  <span className="text-[0.6rem] uppercase tracking-[0.22em] text-[#7d6330]">{dateStr}</span>
                  <div className="min-w-0">
                    <h3 className="v2-serif text-[clamp(1.5rem,2.6vw,2.2rem)] font-light leading-[1.1] text-[#1c1712] transition-colors duration-300 group-hover:text-[#7d6330]">{ev.title}</h3>
                    {ev.subtitle && <p className="mt-1.5 v2-serif italic text-[1.05rem] text-[#3a2f23]">{ev.subtitle}</p>}
                    {ev.location && (
                      <p className="mt-3 text-[0.7rem] uppercase tracking-[0.18em] text-[#1c1712]/60 flex items-center gap-2">
                        <MapPin size={13} weight="light" className="text-[#7d6330]" />{ev.location}
                      </p>
                    )}
                    {ev.description && <p className="mt-4 max-w-[60ch] text-[0.95rem] leading-[1.8] text-[#3a2f23]">{ev.description}</p>}
                    {ev.registrationLink && (
                      <a
                        href={ev.registrationLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-6 inline-flex items-center gap-2 text-[0.66rem] uppercase tracking-[0.2em] text-[#1c1712] border-b border-[#1c1712] pb-1 transition-colors hover:text-[#7d6330] hover:border-[#9c7a44]"
                      >
                        S’inscrire <ArrowUpRight size={13} weight="regular" />
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

/* ════════════════════════ Page ════════════════════════ */

export default function KrystineV2() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce) return;

    let lenis: Lenis | null = null;
    let split: SplitType | null = null;

    const raf = (time: number) => lenis?.raf(time * 1000);

    // Lenis-driven anchor scrolling pour la nav + les CTA de couverture.
    const onAnchorClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a[href^="#"]') as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || href === '#') return;
      const target = root.current?.querySelector(href) as HTMLElement | null;
      if (target) {
        e.preventDefault();
        lenis?.scrollTo(target, { offset: -72 });
      }
    };

    const ctx = gsap.context(() => {
      // ── Smooth scroll ──
      lenis = new Lenis({ duration: 1.1, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);

      const power3 = 'power3.out';

      // ── HERO masthead : révélation par ligne (mask + translateY) ──
      gsap.from('[data-line] > span', {
        yPercent: 115,
        duration: 1.2,
        ease: power3,
        stagger: 0.12,
        delay: 0.15,
      });

      // ── HERO portrait : volet clip-path + léger settle (Ken Burns) ──
      gsap.from('[data-portrait-clip]', {
        clipPath: 'inset(0% 0% 100% 0%)',
        duration: 1.35,
        ease: power3,
        delay: 0.35,
      });
      gsap.from('[data-portrait-img]', {
        scale: 1.14,
        duration: 1.9,
        ease: power3,
        delay: 0.35,
      });

      // ── HERO cover-lines + meta + CTA : fade-up échelonné ──
      gsap.from('[data-fade]', {
        opacity: 0,
        y: 22,
        duration: 1,
        ease: power3,
        stagger: 0.09,
        delay: 0.7,
      });

      // ── Parallaxe douce du portrait au scroll (transform only) ──
      gsap.to('[data-portrait-img]', {
        yPercent: 8,
        ease: 'none',
        scrollTrigger: {
          trigger: '[data-hero]',
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });

      // ── PREMIER TEMPS DE SCROLL : statement révélé ligne par ligne ──
      const statement = root.current?.querySelector('[data-statement]') as HTMLElement | null;
      if (statement) {
        split = new SplitType(statement, { types: 'lines', lineClass: 'v2-line' });
        gsap.set('.v2-line', { overflow: 'hidden' });
        gsap.from(split.lines, {
          yPercent: 110,
          duration: 1.1,
          ease: power3,
          stagger: 0.1,
          scrollTrigger: { trigger: statement, start: 'top 80%' },
        });
      }

      // ── Chiffres + image inset : fade-up au scroll ──
      gsap.from('[data-beat]', {
        opacity: 0,
        y: 30,
        duration: 1.05,
        ease: power3,
        stagger: 0.12,
        scrollTrigger: { trigger: '[data-beat-grid]', start: 'top 78%' },
      });
      gsap.from('[data-beat-img-clip]', {
        clipPath: 'inset(100% 0% 0% 0%)',
        duration: 1.3,
        ease: power3,
        scrollTrigger: { trigger: '[data-beat-img-clip]', start: 'top 82%' },
      });
      gsap.to('[data-beat-img]', {
        yPercent: -10,
        ease: 'none',
        scrollTrigger: {
          trigger: '[data-beat-img-clip]',
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });

      // ── Révélation générique des sections étendues (transform/opacity) ──
      gsap.set('[data-reveal]', { opacity: 0, y: 36 });
      ScrollTrigger.batch('[data-reveal]', {
        start: 'top 86%',
        onEnter: (els) =>
          gsap.to(els, {
            opacity: 1,
            y: 0,
            duration: 1.05,
            ease: power3,
            stagger: 0.1,
            overwrite: true,
          }),
      });
    }, root);

    root.current?.addEventListener('click', onAnchorClick);

    return () => {
      root.current?.removeEventListener('click', onAnchorClick);
      ctx.revert();
      split?.revert();
      gsap.ticker.remove(raf);
      lenis?.destroy();
    };
  }, []);

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
        @keyframes v2pop { from { opacity:0; transform: translateY(10px) scale(.97) } to { opacity:1; transform:none } }
        .v2-pop { animation: v2pop .6s ${EASE} both; }
        @media (prefers-reduced-motion: reduce) { .v2-cue, .v2-pop { animation: none; } }
      `}</style>

      <div className="v2-grain" aria-hidden />

      {/* Menu unifié du site = NavBar global (affiché par App.tsx) */}

      {/* ─────────── HERO · couverture ─────────── */}
      <section
        data-hero
        className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] pt-[clamp(7rem,13vh,9.5rem)] pb-[clamp(2rem,5vh,4rem)] min-h-screen flex flex-col"
      >
        {/* ligne de tête · info d'édition */}
        <div
          data-fade
          className="flex items-center justify-between border-t border-[#1c1712]/15 pt-3.5 text-[0.6rem] uppercase tracking-[0.28em] text-[#1c1712]/55"
        >
          <span>N&deg; 01 &middot; Conférences &amp; Ayurvéda</span>
          <span className="hidden sm:inline">Québec &middot; MMXXVI</span>
        </div>

        {/* grille couverture */}
        <div className="flex-1 grid items-stretch gap-x-[clamp(2rem,5vw,5rem)] gap-y-10 lg:grid-cols-[1.05fr_0.95fr] mt-[clamp(2rem,5vh,4rem)]">
          {/* MASTHEAD */}
          <div className="order-1 lg:row-start-1 lg:col-start-1 self-start">
            <p
              data-fade
              className="text-[0.7rem] uppercase tracking-[0.34em] text-[#7d6330] mb-7"
            >
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
            <div className="relative w-full self-center">
              {/* filet brass d'encadrement */}
              <span className="pointer-events-none absolute -inset-2 border border-[#9c7a44]/35" aria-hidden />
              <div
                data-portrait-clip
                className="relative w-full aspect-[5/6] overflow-hidden"
                style={{ clipPath: 'inset(0% 0% 0% 0%)' }}
              >
                <img
                  data-portrait-img
                  src="/accueil/assets/hero-ml-poster.jpg"
                  alt="Krystine St-Laurent, conférencière et autrice"
                  className="h-full w-full object-cover object-[47%_32%] will-change-transform"
                />
                {/* voile très léger bas pour asseoir la légende */}
                <div
                  className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
                  style={{ background: 'linear-gradient(to top, rgba(28,23,18,0.45), transparent)' }}
                  aria-hidden
                />
                {/* légende couverture */}
                <p
                  data-fade
                  className="absolute bottom-4 left-4 right-4 v2-serif italic text-[#f4efe6] text-sm tracking-wide"
                >
                  « Une voix rare, où la rigueur du clinicien rencontre la sagesse millénaire. »
                </p>
              </div>
              {/* tab cover-line coin haut-gauche */}
              <span
                data-fade
                className="absolute -top-2 -left-2 bg-[#1c1712] text-[#f4efe6] px-3 py-1.5 text-[0.58rem] uppercase tracking-[0.24em]"
              >
                2025
              </span>
            </div>
          </div>

          {/* BAS-GAUCHE · cover-lines + tagline + CTA */}
          <div className="order-3 lg:row-start-2 lg:col-start-1 self-end">
            <ul data-fade className="flex flex-wrap gap-x-7 gap-y-2 mb-7">
              {COVERLINES.map((c) => (
                <li
                  key={c}
                  className="flex items-center gap-2.5 text-[0.68rem] uppercase tracking-[0.2em] text-[#1c1712]/70"
                >
                  <span className="h-1 w-1 rounded-full bg-[#9c7a44]" />
                  {c}
                </li>
              ))}
            </ul>

            <p
              data-fade
              className="v2-serif text-[clamp(1.35rem,2.4vw,1.95rem)] font-light leading-[1.32] text-[#3a2f23] max-w-[34ch]"
            >
              Chaque conférence est cousue main pour le public qui l&rsquo;attend. Pas un
              module pré-fait, une rencontre.
            </p>

            <div data-fade className="mt-9 flex flex-wrap items-center gap-x-9 gap-y-4">
              <a
                href="#reserver"
                className="group inline-flex items-center gap-2.5 text-[0.72rem] uppercase tracking-[0.2em] text-[#1c1712] border-b border-[#1c1712] pb-1.5 transition-colors duration-300 hover:text-[#7d6330] hover:border-[#9c7a44]"
              >
                Réserver une conférence
                <ArrowUpRight size={15} weight="regular" className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
              <a
                href="#conferences"
                className="v2-serif italic text-lg text-[#1c1712]/70 hover:text-[#7d6330] transition-colors duration-300"
              >
                Voir les conférences
              </a>
            </div>
          </div>
        </div>

        {/* pied de hero · indice de scroll */}
        <div
          data-fade
          className="flex items-end justify-between border-b border-[#1c1712]/15 pb-3.5 mt-[clamp(1.5rem,4vh,3rem)] text-[0.6rem] uppercase tracking-[0.28em] text-[#1c1712]/55"
        >
          <span className="flex items-center gap-2 v2-cue">
            <ArrowDown size={13} weight="regular" />
            Faire défiler
          </span>
          <span className="hidden sm:inline">Salut Bonjour &middot; USA, Canada &amp; Europe</span>
        </div>
      </section>

      {/* ─────────── PREMIER TEMPS DE SCROLL · son histoire ─────────── */}
      <section
        id="histoire"
        className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,16vh,12rem)] scroll-mt-24"
      >
        <p className="text-[0.7rem] uppercase tracking-[0.34em] text-[#7d6330] mb-12">
          Chapitre 01 &middot; Son histoire
        </p>

        <div
          data-beat-grid
          className="grid gap-x-[clamp(2rem,5vw,5rem)] gap-y-14 lg:grid-cols-[1.15fr_0.85fr] items-end"
        >
          {/* statement révélé ligne par ligne */}
          <div>
            <p
              data-statement
              className="v2-serif font-light leading-[1.18] text-[#1c1712] text-[clamp(1.9rem,4.4vw,3.6rem)] max-w-[20ch]"
            >
              37 ans à traverser les milieux de la santé, avant de choisir
              l&rsquo;herboristerie, l&rsquo;Ayurveda et l&rsquo;aromathérapie.
            </p>

            {/* chiffres */}
            <div className="mt-14 grid grid-cols-3 gap-6 max-w-xl border-t border-[#1c1712]/15 pt-9">
              {[
                ['37', 'ans de pratique'],
                ['03', 'livres publiés'],
                ['Scènes', 'USA, Canada & Europe'],
              ].map(([n, l]) => (
                <div data-beat key={l}>
                  <p className="v2-serif text-[clamp(2rem,4vw,3.2rem)] font-light leading-none text-[#7d6330]">
                    {n}
                  </p>
                  <p className="mt-3 text-[0.66rem] uppercase tracking-[0.18em] text-[#1c1712]/60 leading-relaxed">
                    {l}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* image inset avec parallaxe + clip reveal */}
          <div className="relative">
            <div
              data-beat-img-clip
              className="relative aspect-[4/5] w-full overflow-hidden"
              style={{ clipPath: 'inset(0% 0% 0% 0%)' }}
            >
              <img
                data-beat-img
                src="/origine-square.jpg"
                alt="Krystine St-Laurent, univers Inspira Nature"
                className="absolute inset-0 h-[120%] w-full object-cover object-center will-change-transform"
              />
            </div>
            <p
              data-beat
              className="mt-4 v2-serif italic text-[#1c1712]/55 text-sm"
            >
              Du système de santé conventionnel à la scène &middot; Inspira Nature
            </p>
          </div>
        </div>
      </section>

      {/* ─────────── CHAPITRE 02 · CONFÉRENCES SIGNATURE ─────────── */}
      <section
        id="conferences"
        className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,15vh,11rem)] bg-[#efe6d7] scroll-mt-24"
      >
        <div data-reveal className="max-w-[760px] mb-16">
          <Kicker className="mb-5">Chapitre 02 · Conférences signature</Kicker>
          <h2 className="v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2.2rem,5vw,4rem)]">
            Trois portes d’entrée
          </h2>
          <p className="mt-6 v2-serif italic text-[clamp(1.1rem,2vw,1.5rem)] text-[#3a2f23] max-w-[46ch] leading-snug">
            Trois trames maîtresses. Chacune adaptée à votre public, votre temps, votre lieu.
          </p>
        </div>

        <div data-reveal className="grid md:grid-cols-3 gap-px bg-[#1c1712]/12 border border-[#1c1712]/12">
          {SIGNATURE_TALKS.map((talk) => (
            <article
              key={talk.title}
              className={`group h-full flex flex-col p-[clamp(1.75rem,3vw,2.5rem)] transition-colors duration-500 ${talk.feature ? 'bg-[#faf6ee]' : 'bg-[#efe6d7] hover:bg-[#faf6ee]'}`}
            >
              <span className="inline-grid place-items-center w-12 h-12 rounded-full border border-[#9c7a44]/40 text-[#7d6330] mb-7">
                {talk.icon}
              </span>
              <span className="text-[0.6rem] uppercase tracking-[0.24em] text-[#7d6330] mb-4">{talk.kicker}</span>
              <h3 className="v2-serif text-[1.6rem] font-light leading-[1.12] text-[#1c1712] mb-4">{talk.title}</h3>
              <p className="v2-serif italic text-[#3a2f23] leading-relaxed text-[1rem] flex-1">{talk.lede}</p>
              <div className="mt-8 pt-5 border-t border-[#1c1712]/12 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.62rem] uppercase tracking-[0.16em] text-[#1c1712]/65">
                <span className="inline-flex items-center gap-1.5"><Clock size={13} weight="light" className="text-[#7d6330]" />{talk.duration}</span>
                <span className="h-1 w-1 rounded-full bg-[#9c7a44]/50" />
                <span className="inline-flex items-center gap-1.5"><MapPin size={13} weight="light" className="text-[#7d6330]" />{talk.format}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ─────────── TÉMOIGNAGES ─────────── */}
      <section className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,15vh,11rem)] bg-[#f4efe6]">
        <div data-reveal className="max-w-[760px] mb-16">
          <Kicker className="mb-5">Ce qu’on en dit</Kicker>
          <h2 className="v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2.2rem,5vw,4rem)]">
            Après son passage
          </h2>
        </div>

        <div data-reveal className="grid md:grid-cols-3 gap-x-[clamp(2rem,4vw,4rem)] gap-y-12">
          {TESTIMONIALS.map((t) => (
            <figure key={t.by} className="flex flex-col border-t border-[#9c7a44]/40 pt-8">
              <Quotes size={28} weight="fill" className="text-[#9c7a44]/40 mb-5" />
              <blockquote className="v2-serif italic text-[#1c1712] text-[1.15rem] leading-[1.55] flex-1">
                {t.quote}
              </blockquote>
              <figcaption className="mt-7 text-[0.62rem] uppercase tracking-[0.2em] text-[#7d6330]">{t.by}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ─────────── CHAPITRE 03 · COMMENT ÇA SE PASSE ─────────── */}
      <section className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,15vh,11rem)] bg-[#efe6d7]">
        <div data-reveal className="max-w-[760px] mb-16">
          <Kicker className="mb-5">Chapitre 03 · Comment ça se passe</Kicker>
          <h2 className="v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2.2rem,5vw,4rem)]">
            De la demande à la scène
          </h2>
        </div>

        <div data-reveal className="grid md:grid-cols-2 lg:grid-cols-4 gap-x-[clamp(1.5rem,3vw,3rem)] gap-y-12">
          {PROCESS_STEPS.map((step) => (
            <div key={step.n} className="border-t-2 border-[#9c7a44] pt-6">
              <span className="v2-serif text-[2.6rem] font-light leading-none text-[#7d6330] tabular-nums">{step.n}</span>
              <h3 className="mt-5 v2-serif text-[1.3rem] font-light leading-snug text-[#1c1712]">{step.title}</h3>
              <p className="mt-3 text-[0.92rem] leading-[1.8] text-[#3a2f23]">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────── CHAPITRE 04 · RÉSERVER (back-end préservé) ─────────── */}
      <BookingSection />

      {/* ─────────── FAQ ─────────── */}
      <FaqSection />

      {/* ─────────── AGENDA LIVE (back-end préservé) ─────────── */}
      <EventsSection />

      {/* ─────────── INFOLETTRE (back-end préservé) ─────────── */}
      <section className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,15vh,11rem)] bg-[#efe6d7]">
        <div data-reveal className="max-w-[720px] mx-auto text-center">
          <Kicker className="mb-5">Une correspondance</Kicker>
          <h2 className="v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2.2rem,5vw,3.8rem)]">
            Rester en lien
          </h2>
          <p className="mt-6 v2-serif italic text-[clamp(1.1rem,2vw,1.45rem)] text-[#3a2f23] max-w-[44ch] mx-auto leading-snug">
            Les nouvelles conférences, les tournées et les rendez-vous, déposés dans votre boîte, sans bruit.
          </p>
          <div className="mt-10">
            <NewsletterSignup
              source="conferenciere"
              variant="light"
              emailOnly
              ctaLabel="Rejoindre le fil"
              placeholder="Votre adresse courriel"
              className="max-w-xl mx-auto"
            />
          </div>
        </div>
      </section>

      {/* ─────────── CLÔTURE · CTA + back-cover ─────────── */}
      <footer className="relative w-full bg-[#34241a] text-[#f4efe6] px-[clamp(1.5rem,5vw,5.5rem)] pt-[clamp(5rem,12vh,9rem)] pb-12">
        <div className="max-w-[860px] mx-auto text-center">
          <p className="v2-serif italic font-light text-[clamp(1.6rem,3.6vw,2.8rem)] leading-[1.24] text-[#f4efe6]">
            « Krystine ne fait pas une conférence, elle ouvre un espace. »
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-9 gap-y-4">
            <a
              href="#reserver"
              className="group inline-flex items-center gap-2.5 text-[0.72rem] uppercase tracking-[0.2em] text-[#34241a] bg-[#f4efe6] px-8 py-3.5 transition-colors duration-300 hover:bg-[#9c7a44]"
            >
              Réserver Krystine
              <ArrowRight size={15} weight="regular" className="transition-transform duration-300 group-hover:translate-x-1" />
            </a>
            <a
              href="mailto:teamksl@inspiratanature.com"
              className="inline-flex items-center gap-2.5 v2-serif italic text-lg text-[#f4efe6]/80 hover:text-[#c8a86a] transition-colors duration-300"
            >
              <EnvelopeSimple size={16} weight="light" /> teamksl@inspiratanature.com
            </a>
          </div>
        </div>

        <div className="mt-[clamp(4rem,9vh,7rem)] pt-7 border-t border-[#f4efe6]/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-[0.6rem] uppercase tracking-[0.24em] text-[#f4efe6]/45">
          <span className="v2-serif normal-case tracking-tight text-[0.95rem] text-[#f4efe6]/80">
            Krystine <span className="italic font-light">St-Laurent</span>
          </span>
          <span>Inspira Nature &middot; Québec &middot; MMXXVI</span>
        </div>
      </footer>
    </div>
  );
}
