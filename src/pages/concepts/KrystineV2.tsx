import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import SplitType from 'split-type';
import {
  ArrowUpRight, ArrowDown, CaretDown, Check, CircleNotch,
  MapPin, Quotes,
} from '@phosphor-icons/react';
import { useApp } from '../../contexts/AppContext';
import NewsletterSignup from '../../components/NewsletterSignup';
import LiveEventsSection from '../../components/LiveEvents';
import { getEventsPublics, getTemoignagesPublies, addBookingRequest, type EventDoc } from '../../firebase/firestore';
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

const COVERLINES = ['Près de 40 ans de pratique', 'La trilogie · Éditions de l’Homme', 'USA, Canada & Europe'];

/* ════════════════════════ Données éditoriales ════════════════════════ */

// Une conférence, plusieurs portes de programmation (Krystine, 26 septembre
// 2026). Les portes ne sont pas des conférences : ce sont des contextes pour
// le même One Talk. L'Ayurveda, la nature et le corps nourrissent la
// conférence sans en devenir le titre ni la catégorie.
const ONE_TALK = {
  title: 'Plus de réponses. Moins de confiance ?',
  sousTitre: 'Ce que l’abondance d’information fait à notre capacité de juger et de choisir.',
  texte: 'Nous avons accès à davantage d’informations, de conseils, d’experts, de méthodes et de technologies que jamais. Cette conférence explore ce qui se passe lorsque les réponses se multiplient plus vite que notre capacité à les examiner, et les capacités humaines que nous voulons continuer d’exercer nous-mêmes.',
  promesse: 'Le public repart avec une façon plus claire d’examiner les réponses qui lui sont proposées, d’en évaluer la pertinence et de décider de la confiance à leur accorder.',
};

const PORTES: { titre: string; ligne: string }[] = [
  { titre: 'IA & humain', ligne: 'Ce que nous gagnons à déléguer, et ce que nous voulons continuer d’exercer.' },
  { titre: 'En entreprise', ligne: 'La place du jugement humain dans des environnements où outils, systèmes et automatisation prennent une place croissante.' },
  { titre: 'Leadership & entrepreneuriat', ligne: 'Choisir lorsque données, experts, méthodes et recommandations se multiplient.' },
  { titre: 'Éducation & transmission', ligne: 'Transmettre le savoir tout en développant la capacité à questionner, comprendre et choisir.' },
  { titre: 'Associations professionnelles', ligne: 'Naviguer entre expertise, recommandations, nouvelles pratiques et jugement professionnel.' },
  { titre: 'Femmes', ligne: 'Choisir parmi tout ce qui nous est présenté comme étant « bon pour nous ».' },
  { titre: 'Culture & société', ligne: 'Ce que l’abondance de réponses change dans notre rapport à l’autorité, au jugement et au choix.' },
  { titre: 'Grand public', ligne: 'Comment déterminer ce qui mérite notre confiance lorsque les réponses se multiplient.' },
];

// Seulement des paroles réellement reçues (Krystine, 26 septembre 2026 : les
// témoignages de la directrice RH et de l'animatrice n'en étaient pas).
const TESTIMONIALS = [
  {
    quote: "Krystine a une voix rare, celle d’une femme qui sait, qui a vu, et qui sait nommer ce que le public n’a jamais osé dire. Notre événement n’a pas été le même après son passage.",
    by: 'Productrice d’événements corporatifs',
  },
];

const PROCESS_STEPS = [
  { n: '01', title: 'Vous nous écrivez', body: "Quelques minutes pour répondre au formulaire ci-dessous. Plus l’on en sait sur votre vision, mieux l’on prépare la rencontre." },
  { n: '02', title: 'Échange de cadrage', body: "L’équipe revient sous 48 h ouvrables avec une proposition. Si elle convient, l’on planifie un appel pour affiner." },
  { n: '03', title: 'Co-création', body: "Krystine ajuste l’intervention selon votre public et votre contexte. Ce n’est jamais un module pré-fait." },
  { n: '04', title: 'Sur scène', body: 'Le jour J, Krystine arrive ancrée et libre. Le reste appartient au public.' },
];

const FAQS = [
  { q: 'Comment la conférence s’adapte-t-elle à notre événement ?', a: "Le cœur de la conférence demeure le même. Le contexte, les histoires, les exemples et certains angles sont choisis en fonction du public et de la programmation. Une conférence destinée à des dirigeants, à un événement sur l’IA, à une association professionnelle ou à un public féminin peut ainsi ouvrir par une porte différente tout en portant la même conversation centrale." },
  { q: "Voyage-t-elle à l’extérieur du Québec ?", a: "Oui : Canada, États-Unis, France, Belgique, Suisse selon l’agenda. Indiquez la ville dans le formulaire et l’on vous revient avec la faisabilité." },
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

/* ════════════════════════ Section · Le film ════════════════════════ */

// Le film de conférence 2026 (Krystine, 26 septembre 2026), sur le modèle de
// l'accueil : plein cadre, voile vert profond à gauche, texte par-dessus. La
// boucle est la version sans les écrans de texte, pour que rien ne se superpose.
const FilmSection: React.FC = () => {
  const ref = useRef<HTMLVideoElement>(null);
  const [son, setSon] = useState(false);
  useEffect(() => {
    const v = ref.current; if (!v) return;
    v.src = window.innerWidth > 900 ? '/accueil/assets/film/conference-2026-1080.mp4' : '/accueil/assets/film/conference-2026-720.mp4';
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => {}); else if (v.muted) v.pause();
    }, { threshold: 0.2 });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  const basculer = () => {
    const v = ref.current; if (!v) return;
    v.muted = !v.muted; setSon(!v.muted);
    if (!v.muted) v.play().catch(() => {});
  };
  return (
    <section className="relative w-full overflow-hidden bg-[#1b2622] min-h-[clamp(34rem,82vh,52rem)] flex items-center">
      <video
        ref={ref}
        muted
        loop
        playsInline
        preload="metadata"
        poster="/accueil/assets/film/conference-2026-poster.jpg"
        aria-label="Krystine St-Laurent en conférence"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ filter: 'sepia(0.34) saturate(0.68) brightness(0.86) contrast(0.94)' }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: 'radial-gradient(120% 90% at 70% 45%, rgba(186,123,57,.16) 0%, rgba(27,20,12,0) 55%, rgba(20,15,10,.55) 100%), linear-gradient(90deg, rgba(27,38,34,.94) 0%, rgba(27,38,34,.78) 38%, rgba(27,38,34,.28) 72%, rgba(27,38,34,.12) 100%)' }}
      />
      <div data-reveal className="relative z-10 w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(4rem,10vh,6rem)]">
        <div className="max-w-[34rem]">
          <p className="text-[0.66rem] uppercase tracking-[0.3em] text-[#d9a05b]">Krystine sur scène</p>
          <h2 className="mt-5 v2-serif font-light leading-[1.06] text-[#EEE7DB] text-[clamp(2.2rem,4.4vw,3.6rem)]">
            Plus de réponses. Moins de confiance ?
          </h2>
          <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-5">
            <a
              href="#reserver"
              className="inline-flex items-center gap-2.5 bg-[#BA7B39] px-7 py-3.5 text-[0.68rem] uppercase tracking-[0.2em] text-[#1c1712] transition-colors hover:bg-[#d9a05b]"
            >
              Inviter Krystine <ArrowUpRight size={14} weight="regular" />
            </a>
            <button
              type="button"
              onClick={basculer}
              aria-pressed={son}
              className="inline-flex items-center gap-2.5 text-[0.68rem] uppercase tracking-[0.2em] text-[#EEE7DB] border-b border-[#EEE7DB]/60 pb-1 hover:border-[#d9a05b] hover:text-[#d9a05b]"
            >
              {son ? 'Couper le son' : 'Voir le film, avec le son'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ════════════════════════ Section · Témoignages ════════════════════════ */

// Les paroles fixes plus celles que Krystine approuve dans l'admin
// (Événements & Conférences › Témoignages reçus). Rien d'inventé.
const TemoignagesSection: React.FC = () => {
  const [recus, setRecus] = useState<{ quote: string; by: string }[]>([]);
  useEffect(() => {
    getTemoignagesPublies()
      .then((ts) => setRecus(ts.map((t) => ({ quote: t.texte, by: [t.nom, t.role, t.evenement].filter(Boolean).join(' · ') }))))
      .catch(() => setRecus([]));
  }, []);
  const tous = [...TESTIMONIALS, ...recus];
  return (
    <section className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,15vh,11rem)] bg-[#f4efe6]">
      <div data-reveal className="max-w-[760px] mb-16">
        <Kicker className="mb-5">Ce que l’on en dit</Kicker>
        <h2 className="v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2.2rem,5vw,4rem)]">
          Après son passage
        </h2>
      </div>

      <div data-reveal className={`grid gap-y-12 ${tous.length > 1 ? 'md:grid-cols-2 gap-x-[clamp(2rem,4vw,4rem)]' : ''}`}>
        {tous.map((t, i) => (
          <figure key={`${t.by}-${i}`} className={`flex flex-col border-t border-[#9c7a44]/40 pt-10 ${tous.length > 1 ? '' : 'max-w-[980px]'}`}>
            <Quotes size={34} weight="fill" className="text-[#9c7a44]/40 mb-6" />
            <blockquote className={`v2-serif italic text-[#1c1712] leading-[1.45] flex-1 ${tous.length > 1 ? 'text-[clamp(1.15rem,1.8vw,1.45rem)]' : 'text-[clamp(1.35rem,2.4vw,2rem)]'}`}>
              {t.quote}
            </blockquote>
            <figcaption className="mt-7 text-[0.62rem] uppercase tracking-[0.2em] text-[#7d6330]">{t.by}</figcaption>
          </figure>
        ))}
      </div>

      <p data-reveal className="mt-14 text-[0.95rem] text-[#3a2f23]">
        Vous avez assisté à une conférence de Krystine ?{' '}
        <Link to="/conferenciere/temoignage" className="border-b border-[#1c1712] pb-0.5 hover:text-[#7d6330] hover:border-[#9c7a44]">
          Laissez-nous un mot
        </Link>
      </p>
    </section>
  );
};

/* ════════════════════════ Section · Agenda live (back-end préservé) ════════════════════════ */

const EventsSection: React.FC = () => {
  const [extraEvents, setExtraEvents] = useState<EventDoc[]>([]);
  useEffect(() => {
    getEventsPublics().then(setExtraEvents).catch(() => setExtraEvents([]));
  }, []);
  // Une seule carte de retraite ici : la page parle d'abord aux organisatrices,
  // et trois « Retraite à venir » sans date se répétaient.
  const upcoming = getUpcomingEvents({ hideTedx: true }).filter((e) => e.id !== 'retraite-fev-2027' && e.id !== 'retraite-mai-2027');
  // Un événement de la base qui double une carte de l'agenda (même
  // identifiant, comme le lancement à L'Anglicane) ne s'affiche qu'une fois.
  const dejaAffiches = new Set(upcoming.map((e) => e.id));
  const jourLocal = (iso: string) => new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00` : iso);
  const extraUpcoming = extraEvents
    .filter((ev) => !dejaAffiches.has(ev.slug || ev.id) && jourLocal(ev.date) >= new Date())
    .slice(0, 6);

  return (
    <section className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,15vh,11rem)] bg-[#f4efe6]">
      <div data-reveal className="max-w-[1040px] mx-auto text-center mb-16">
        <Kicker className="mb-5">Où l’on se rejoint · Live</Kicker>
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
              const dateStr = jourLocal(ev.date).toLocaleDateString('fr-CA', {
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
          <span>N&deg; 01 &middot; Conférences</span>
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
              Conférencière &middot; Keynote speaker &middot; Autrice best-seller
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
                  src="/conferences/krystine-scene-haut.webp"
                  alt="Krystine St-Laurent sur scène, en conférence"
                  className="h-full w-full object-cover object-[40%_30%] will-change-transform"
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
                  « Qu’est-ce qui nourrit et soutient réellement la vie ? »
                </p>
              </div>
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
              Comment choisir dans un monde qui pense de plus en plus à notre place&nbsp;?
            </p>
            <div data-fade className="mt-6 max-w-[40rem] space-y-4 text-[0.98rem] leading-[1.8] text-[#3a2f23]">
              <p>
                Nous n&rsquo;avons jamais eu accès à autant d&rsquo;informations, de conseils, d&rsquo;experts, de méthodes et maintenant
                d&rsquo;intelligence artificielle. Pourtant, plus les réponses se multiplient, plus il peut devenir difficile de savoir
                lesquelles croire, lesquelles suivre et ce qui nous convient réellement.
              </p>
              <p>
                Sur scène, Krystine St-Laurent explore ce que cette abondance de réponses fait à notre jugement, à notre confiance et à
                notre capacité de choisir, et comment retrouver des repères sans remettre notre autorité à une nouvelle méthode, un
                nouvel expert ou une nouvelle technologie.
              </p>
            </div>

            <div data-fade className="mt-9 flex flex-wrap items-center gap-x-9 gap-y-4">
              <a
                href="#reserver"
                className="group inline-flex items-center gap-2.5 text-[0.72rem] uppercase tracking-[0.2em] text-[#1c1712] border-b border-[#1c1712] pb-1.5 transition-colors duration-300 hover:text-[#7d6330] hover:border-[#9c7a44]"
              >
                Inviter Krystine
                <ArrowUpRight size={15} weight="regular" className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
              <a
                href="#conferences"
                className="v2-serif italic text-lg text-[#1c1712]/70 hover:text-[#7d6330] transition-colors duration-300"
              >
                Découvrir la conférence
              </a>
            </div>
            <p data-fade className="mt-6 text-[0.6rem] uppercase tracking-[0.24em] text-[#1c1712]/55">
              Conférences en français, en anglais ou dans les deux
            </p>
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
        </div>
      </section>

      <FilmSection />

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
              Près de 40 ans à relier ce que nous avons appris à séparer.
            </p>

            {/* chiffres */}
            <div className="mt-14 grid grid-cols-3 gap-6 max-w-xl border-t border-[#1c1712]/15 pt-9">
              {[
                ['40', 'ans de pratique'],
                ['03', 'tomes de la trilogie'],
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
                src="/conferences/mont-tremblant-2024-krystine.webp"
                alt="Krystine St-Laurent en conférence devant une salle pleine, Mont-Tremblant, juin 2024"
                className="absolute inset-0 h-[120%] w-full object-cover object-[64%_center] will-change-transform"
              />
            </div>
            <p
              data-beat
              className="mt-4 v2-serif italic text-[#1c1712]/55 text-sm"
            >
              Du système de santé conventionnel à la scène
            </p>
          </div>
        </div>
      </section>

      {/* ─────────── CHAPITRE 02 · UNE CONFÉRENCE, PLUSIEURS PORTES ─────────── */}
      <section
        id="conferences"
        className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,15vh,11rem)] bg-[#efe6d7] scroll-mt-24"
      >
        <div data-reveal className="max-w-[900px] mb-14">
          <Kicker className="mb-5">Chapitre 02 · La conférence</Kicker>
          <h2 className="v2-serif font-light leading-[1.05] text-[#1c1712] text-[clamp(2rem,4.2vw,3.4rem)]">
            Une conférence. Plusieurs portes de programmation.
          </h2>
        </div>

        {/* Le One Talk */}
        <article data-reveal className="max-w-[900px] border-t border-[#9c7a44]/50 pt-10">
          <h3 className="v2-serif text-[clamp(1.8rem,3.2vw,2.6rem)] font-light leading-[1.1] text-[#1c1712]">{ONE_TALK.title}</h3>
          <p className="mt-5 v2-serif italic text-[clamp(1.1rem,1.8vw,1.35rem)] leading-snug text-[#3a2f23]">{ONE_TALK.sousTitre}</p>
          <p className="mt-6 max-w-[62ch] text-[0.98rem] leading-[1.85] text-[#3a2f23]">{ONE_TALK.texte}</p>
          <p className="mt-6 max-w-[62ch] border-l-2 border-[#9c7a44] pl-5 v2-serif text-[1.08rem] leading-[1.7] text-[#1c1712]">{ONE_TALK.promesse}</p>
        </article>

        {/* Les portes : des contextes pour la même conférence, pas d'autres conférences */}
        <div data-reveal className="mt-[clamp(3.5rem,8vh,5.5rem)]">
          <p className="mb-8 text-[0.62rem] uppercase tracking-[0.24em] text-[#7d6330]">Portes de programmation</p>
          <ol className="grid gap-x-[clamp(2rem,5vw,5rem)] md:grid-cols-2">
            {PORTES.map((porte, i) => (
              <li key={porte.titre} className="flex gap-5 border-t border-[#1c1712]/15 py-6">
                <span className="v2-serif w-8 shrink-0 text-[1.05rem] font-light tabular-nums text-[#7d6330]">{String(i + 1).padStart(2, '0')}</span>
                <div className="min-w-0">
                  <h4 className="text-[0.72rem] uppercase tracking-[0.2em] text-[#1c1712]">{porte.titre}</h4>
                  <p className="mt-2 v2-serif text-[1.02rem] leading-[1.6] text-[#3a2f23]">{porte.ligne}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ─────────── LA SALLE · vraie photo (lancement du premier livre, 2018) ─────────── */}
      <section className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] pt-[clamp(4rem,10vh,7rem)] bg-[#f4efe6]">
        <figure data-reveal className="mx-auto max-w-[1400px]">
          <div className="border border-[#9c7a44]/45 p-2">
            <img
              src="/conferences/lancement-2018.webp"
              alt="Krystine St-Laurent sur scène devant une salle comble, au lancement de son premier livre en 2018"
              loading="lazy"
              className="block aspect-[16/9] w-full object-cover"
            />
          </div>
          <figcaption className="mt-4 text-[0.62rem] uppercase tracking-[0.22em] text-[#7d6330]">
            Au lancement de son premier livre, devant une salle comble &middot; 2018
          </figcaption>
        </figure>
      </section>

      <TemoignagesSection />

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
    </div>
  );
}
