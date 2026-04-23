import React, { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { CONTENT } from '../content';
import EditableText from '../components/edit/EditableText';
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

// "Réserver Krystine" — structured speaker-booking form.
// ─────────────────────────────────────────────────────────────────────────────
// Writes to the `bookingRequests` collection with `source: 'conferenciere'`
// so the existing admin Demandes view picks it up automatically (same
// destination as the ConferenceTourModal). We ask enough upstream that
// Krystine can triage without a follow-up call: what type of intervention,
// format, audience, date window, budget range, language.

// ── Option lists ────────────────────────────────────────────────────────────
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
  name: string;
  email: string;
  phone: string;
  organization: string;
  organizationUrl: string;
  city: string;
  region: string;
  interventionKind: InterventionKind;
  format: EventFormat;
  audienceType: AudienceType;
  audienceSize: AudienceSize;
  duration: InterventionDuration;
  preferredDate: string;
  budgetRange: BudgetRange;
  languagePref: LangPref;
  message: string;
};

const EMPTY_FORM: Form = {
  name: '',
  email: '',
  phone: '',
  organization: '',
  organizationUrl: '',
  city: '',
  region: '',
  interventionKind: 'keynote',
  format: 'in-person',
  audienceType: 'general-public',
  audienceSize: 'unknown',
  duration: 'flexible',
  preferredDate: '',
  budgetRange: 'to-discuss',
  languagePref: 'fr',
  message: '',
};

const ConferencierePage: React.FC = () => {
  const { lang, user, member } = useApp();
  const t = CONTENT[lang].booking;

  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

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
    } catch (e: any) {
      setErr(e?.message || (lang === 'FR' ? 'Une erreur est survenue.' : 'Something went wrong.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] dark:bg-[#050C1A]">
      {/* Hero */}
      <div className="pt-48 pb-24 px-6 bg-white dark:bg-[#0B1A36] border-b border-[#0B1A36]/5 dark:border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-serif text-[#0B1A36] dark:text-white mb-8">
            <EditableText fieldKey="conferenciere.hero.title" defaultValue={t.title} />
          </h1>
          <div className="w-24 h-1 bg-[#D4AF37] mx-auto mb-12" />
          <p className="text-xl text-[#0B1A36]/80 dark:text-white/80 leading-relaxed mb-6 font-serif italic">
            <EditableText fieldKey="conferenciere.hero.bio" defaultValue={t.bio} multiline />
          </p>
          <p className="text-lg text-[#0B1A36]/60 dark:text-white/60 leading-relaxed">
            <EditableText fieldKey="conferenciere.hero.program" defaultValue={t.program} multiline />
          </p>
        </div>
      </div>

      {/* Ritual promo */}
      <div className="py-20 px-6 text-center relative overflow-hidden bg-[#F5F5F0] dark:bg-[#050C1A]">
        <div className="relative z-10 max-w-3xl mx-auto">
          <span className="bg-[#D4AF37]/10 text-[#D4AF37] px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-6 inline-block">
            {lang === 'FR' ? 'Programme Exclusif' : 'Exclusive Program'}
          </span>
          <h2 className="text-3xl md:text-5xl font-serif text-[#0B1A36] dark:text-white mb-6">{t.ritual.title}</h2>
          <p className="text-xl text-[#0B1A36]/70 dark:text-white/70 mb-10 leading-relaxed">{t.ritual.desc}</p>
          <a href={t.ritual.kajabiLink} target="_blank" rel="noopener noreferrer"
            className="inline-block bg-[#D4AF37] text-white px-12 py-5 rounded-full font-bold uppercase tracking-widest text-sm shadow-lg hover:scale-105 transition-transform">
            {t.ritual.cta}
          </a>
          <p className="text-xs text-[#0B1A36]/40 dark:text-white/40 mt-4 uppercase tracking-wider">
            {lang === 'FR' ? 'Paiement sécurisé via Kajabi' : 'Secure payment via Kajabi'}
          </p>
        </div>
      </div>

      {/* Booking form */}
      <div className="py-24 px-6 bg-white dark:bg-[#0B1A36]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-serif text-[#0B1A36] dark:text-white mb-3 text-center">
            {lang === 'FR' ? 'Faire une demande' : 'Submit a request'}
          </h2>
          <p className="text-[#0B1A36]/60 dark:text-white/60 text-center mb-3 italic font-serif">
            {lang === 'FR'
              ? 'Répondez à quelques questions — cela aide l\'équipe à préparer une proposition juste.'
              : 'Answer a few questions — it helps the team prepare a proper proposal.'}
          </p>
          <p className="text-[#0B1A36]/45 dark:text-white/45 text-center mb-12 text-xs uppercase tracking-widest">
            {lang === 'FR' ? 'Réponse sous 48 h ouvrables' : 'Reply within 48 business hours'}
          </p>

          {sent ? (
            <div className="text-center py-14 bg-[#D4AF37]/10 rounded-[28px] border border-[#D4AF37]/20">
              <i className="fa-solid fa-check-circle text-[#D4AF37] text-5xl mb-5 block" />
              <h3 className="font-serif text-2xl text-[#0B1A36] dark:text-white mb-2">
                {lang === 'FR' ? 'Demande envoyée!' : 'Request sent!'}
              </h3>
              <p className="text-[#0B1A36]/60 dark:text-white/60">
                {lang === 'FR'
                  ? "Merci. L'équipe vous revient sous 48h ouvrables."
                  : "Thank you. The team will get back to you within 48 business hours."}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">

              {/* ── 1. Qui êtes-vous ── */}
              <Section
                step="1"
                titleFR="Qui êtes-vous ?"
                titleEN="Who are you?"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    value={form.name}
                    onChange={v => set('name', v)}
                    placeholder={lang === 'FR' ? 'Prénom et nom *' : 'Full name *'}
                    required
                  />
                  <Input
                    type="email"
                    value={form.email}
                    onChange={v => set('email', v)}
                    placeholder={lang === 'FR' ? 'Courriel *' : 'Email *'}
                    required
                  />
                  <Input
                    type="tel"
                    value={form.phone}
                    onChange={v => set('phone', v)}
                    placeholder={lang === 'FR' ? 'Téléphone' : 'Phone'}
                  />
                  <Input
                    value={form.organization}
                    onChange={v => set('organization', v)}
                    placeholder={lang === 'FR' ? 'Organisation / Entreprise' : 'Organization / Company'}
                  />
                  <Input
                    type="url"
                    value={form.organizationUrl}
                    onChange={v => set('organizationUrl', v)}
                    placeholder={lang === 'FR' ? 'Site web de l\'organisation' : 'Organization website'}
                    className="md:col-span-2"
                  />
                </div>
              </Section>

              {/* ── 2. Type d'intervention ── */}
              <Section
                step="2"
                titleFR="Quel type d'intervention ?"
                titleEN="What type of intervention?"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <LabelledSelect
                    label={lang === 'FR' ? "Type d'intervention" : 'Intervention type'}
                    value={form.interventionKind}
                    onChange={v => set('interventionKind', v as InterventionKind)}
                    options={INTERVENTION_OPTIONS.map(o => ({ id: o.id, label: lang === 'FR' ? o.fr : o.en }))}
                  />
                  <LabelledSelect
                    label={lang === 'FR' ? 'Format' : 'Format'}
                    value={form.format}
                    onChange={v => set('format', v as EventFormat)}
                    options={FORMAT_OPTIONS.map(o => ({ id: o.id, label: lang === 'FR' ? o.fr : o.en }))}
                  />
                  <LabelledSelect
                    label={lang === 'FR' ? 'Durée souhaitée' : 'Desired duration'}
                    value={form.duration}
                    onChange={v => set('duration', v as InterventionDuration)}
                    options={DURATION_OPTIONS.map(o => ({ id: o.id, label: lang === 'FR' ? o.fr : o.en }))}
                  />
                  <LabelledSelect
                    label={lang === 'FR' ? 'Langue de prestation' : 'Language'}
                    value={form.languagePref}
                    onChange={v => set('languagePref', v as LangPref)}
                    options={LANG_OPTIONS.map(o => ({ id: o.id, label: lang === 'FR' ? o.fr : o.en }))}
                  />
                </div>
              </Section>

              {/* ── 3. Public et contexte ── */}
              <Section
                step="3"
                titleFR="Public et contexte"
                titleEN="Audience and context"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <LabelledSelect
                    label={lang === 'FR' ? 'Type de public' : 'Audience type'}
                    value={form.audienceType}
                    onChange={v => set('audienceType', v as AudienceType)}
                    options={AUDIENCE_OPTIONS.map(o => ({ id: o.id, label: lang === 'FR' ? o.fr : o.en }))}
                  />
                  <LabelledSelect
                    label={lang === 'FR' ? 'Taille approximative' : 'Approximate size'}
                    value={form.audienceSize}
                    onChange={v => set('audienceSize', v as AudienceSize)}
                    options={SIZE_OPTIONS.map(o => ({ id: o.id, label: lang === 'FR' ? o.fr : o.en }))}
                  />
                  <Input
                    value={form.city}
                    onChange={v => set('city', v)}
                    placeholder={lang === 'FR' ? 'Ville' : 'City'}
                  />
                  <Input
                    value={form.region}
                    onChange={v => set('region', v)}
                    placeholder={lang === 'FR' ? 'Région / province' : 'Region / province'}
                  />
                </div>
              </Section>

              {/* ── 4. Date et budget ── */}
              <Section
                step="4"
                titleFR="Date et budget"
                titleEN="Date and budget"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    value={form.preferredDate}
                    onChange={v => set('preferredDate', v)}
                    placeholder={lang === 'FR'
                      ? 'Date souhaitée ou période (ex. mars 2027)'
                      : 'Desired date or window (e.g. March 2027)'}
                  />
                  <LabelledSelect
                    label={lang === 'FR' ? 'Enveloppe budgétaire' : 'Budget range'}
                    value={form.budgetRange}
                    onChange={v => set('budgetRange', v as BudgetRange)}
                    options={BUDGET_OPTIONS.map(o => ({ id: o.id, label: lang === 'FR' ? o.fr : o.en }))}
                  />
                </div>
              </Section>

              {/* ── 5. Message libre ── */}
              <Section
                step="5"
                titleFR="Un mot sur votre événement"
                titleEN="Tell us about your event"
              >
                <textarea
                  value={form.message}
                  onChange={e => set('message', e.target.value)}
                  placeholder={lang === 'FR'
                    ? "Partagez le contexte, la thématique souhaitée, le public attendu, les contraintes logistiques, etc."
                    : 'Share the context, desired theme, expected audience, logistical constraints, etc.'}
                  rows={5}
                  className={`${FIELD_CLASS} resize-none`}
                />
              </Section>

              {err && <p className="text-center text-sm text-red-600">{err}</p>}

              <button
                type="submit"
                disabled={sending}
                className="w-full bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] py-4 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {sending ? <i className="fa-solid fa-circle-notch fa-spin" /> : <i className="fa-solid fa-paper-plane text-xs" />}
                {lang === 'FR' ? 'Envoyer la demande' : 'Send request'}
              </button>

              <p className="text-[11px] text-center text-[#0B1A36]/50 dark:text-white/50 pt-2">
                {lang === 'FR'
                  ? "Vos réponses sont enregistrées de manière confidentielle. L'équipe revient vers vous avec une proposition adaptée."
                  : 'Your answers are stored confidentially. The team will reply with a tailored proposal.'}
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Field primitives ────────────────────────────────────────────────────────

const FIELD_CLASS =
  'w-full px-4 py-3 rounded-xl border border-[#0B1A36]/15 dark:border-white/15 bg-white dark:bg-white/5 text-sm text-[#0B1A36] dark:text-white placeholder:text-[#0B1A36]/40 dark:placeholder:text-white/40 focus:outline-none focus:border-[#D4AF37]';

const SELECT_CHEVRON =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'><path d='M2 4l4 4 4-4' stroke='%238B6F47' fill='none' stroke-width='1.5'/></svg>\")";

interface SectionProps {
  step: string;
  titleFR: string;
  titleEN: string;
  children: React.ReactNode;
}
const Section: React.FC<SectionProps> = ({ step, titleFR, titleEN, children }) => {
  const { lang } = useApp();
  return (
    <div className="border border-[#0B1A36]/10 dark:border-white/10 rounded-[22px] bg-[#FEFBF4]/60 dark:bg-white/[0.03] p-5 md:p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="w-7 h-7 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] text-xs font-bold flex items-center justify-center shrink-0">
          {step}
        </span>
        <h3 className="font-serif text-lg md:text-xl text-[#0B1A36] dark:text-white">
          {lang === 'FR' ? titleFR : titleEN}
        </h3>
      </div>
      {children}
    </div>
  );
};

interface InputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  className?: string;
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
    <span className="block text-[10px] uppercase tracking-widest text-[#0B1A36]/60 dark:text-white/60 font-bold mb-2">
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
