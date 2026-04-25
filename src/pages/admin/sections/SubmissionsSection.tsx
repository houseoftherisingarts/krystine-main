import React, { useEffect, useMemo, useState } from 'react';
import {
  getBookingRequests,
  getNewsletterSubscribers,
  getDoshaResults,
  getGuideResponses,
  getAllMembers,
  type BookingRequest,
  type NewsletterSubscriber,
  type DoshaResult,
  type GuideResponse,
  type MemberDoc,
} from '../../../firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { Card, EmptyState, GhostButton, downloadCsv } from '../primitives';
import AdminClientView from '../AdminClientView';

// ─── Unified CRM inbox ──────────────────────────────────────────────────────
// Every public-facing form on the site writes into one of four Firestore
// collections (bookingRequests · newsletter · doshaResults · guideResponses).
// This section pulls all four, normalizes each document into a common row
// shape, and lets Krystine filter by form type, origin tag, and text. The
// type-specific sections still exist for deeper actions (status changes,
// mailing CSVs, etc.) — this view is the single "inbox" for what came in.

type FormCategory = 'booking' | 'newsletter' | 'waitlist' | 'dosha' | 'guide';

interface Submission {
  id: string;
  category: FormCategory;
  name: string;
  email: string;
  source: string;                 // granular origin (e.g. 'accueil-pulsation', 'waitlist-retraite-nov-2026')
  tags: string[];
  createdAt?: Timestamp;
  summary: string;                // one-line preview shown in the collapsed row
  details: Array<{ label: string; value: string }>; // key-value pairs shown on expand
  message?: string;               // free-form message shown as a paragraph
  // Dominant dosha ("Vata" | "Pitta" | "Kapha" | "Tridoshic" | …) — only
  // populated for dosha rows. Drives the secondary filter chips.
  doshaDominant?: string;
  // Populated during post-load member reconciliation. When present, the row's
  // name renders as a button that opens AdminClientView for that uid.
  memberUid?: string;
}

// ─── Category metadata ──────────────────────────────────────────────────────
const CATEGORY_META: Record<FormCategory, { label: string; icon: string; badge: string }> = {
  booking:    { label: 'Réservations',  icon: 'fa-handshake',     badge: 'bg-[#B8532F]/15 text-[#B8532F]' },
  newsletter: { label: 'Infolettre',    icon: 'fa-envelope',      badge: 'bg-[#3A251E]/10 text-[#3A251E]/80 dark:bg-white/10 dark:text-white/80' },
  waitlist:   { label: "Listes d'attente", icon: 'fa-hourglass-half', badge: 'bg-[#BC4A3C]/10 text-[#BC4A3C]' },
  dosha:      { label: 'Quiz Dosha',    icon: 'fa-circle-nodes',  badge: 'bg-[#6B402F]/15 text-[#6B402F]' },
  guide:      { label: 'Laissez-vous guider', icon: 'fa-compass', badge: 'bg-[#4A7C9D]/15 text-[#4A7C9D]' },
};

// Human-readable source name. Unknown keys fall back to the raw string.
function prettySource(s: string): string {
  const dict: Record<string, string> = {
    'conferenciere': 'Réserver Krystine',
    'conference-tour': 'Tournée de conférences',
    'accueil-pulsation': 'Pulsation · accueil',
    'quiz': 'Quiz Dosha',
    'guide': 'Laissez-vous guider',
    'import': 'Import CSV',
  };
  if (dict[s]) return dict[s];
  if (s.startsWith('waitlist-')) return `Liste d'attente · ${s.slice('waitlist-'.length).replace(/-/g, ' ')}`;
  return s;
}

// ─── Label dictionaries (re-used from BookingsSection, kept local to avoid
// creating a cross-section export). If these drift, the booking row just
// shows the raw enum id, which is harmless. ──────────────────────────────

const INTERVENTION_LABELS: Record<string, string> = {
  keynote: 'Conférence / Keynote', workshop: 'Atelier pratique', panel: 'Panel',
  hosting: "Animation d'événement", podcast: 'Podcast / Entrevue',
  corporate: 'Formation corporate', retreat: 'Retraite', other: 'Autre',
};
const FORMAT_LABELS: Record<string, string> = {
  'in-person': 'Présentiel', virtual: 'Virtuel', hybrid: 'Hybride', open: 'Ouvert',
};
const AUDIENCE_LABELS: Record<string, string> = {
  'general-public': 'Grand public', corporate: 'Entreprise', students: 'Étudiants',
  healthcare: 'Santé', community: 'Communauté', other: 'Autre',
};
const SIZE_LABELS: Record<string, string> = {
  'under-50': '< 50', '50-150': '50–150', '150-500': '150–500', '500-plus': '500 +', unknown: 'À déterminer',
};
const DURATION_LABELS: Record<string, string> = {
  '30min': '30 min', '60min': '60 min', '90min': '90 min',
  'half-day': 'Demi-journée', 'full-day': 'Journée', 'multi-day': 'Plusieurs jours', flexible: 'Flexible',
};
const BUDGET_LABELS: Record<string, string> = {
  'under-2k': '< 2 000 $', '2k-5k': '2 k – 5 k $', '5k-10k': '5 k – 10 k $',
  '10k-plus': '10 k $ et +', 'to-discuss': 'À discuter',
};
const LANG_LABELS: Record<string, string> = { fr: 'Français', en: 'Anglais', bilingual: 'Bilingue' };
const HOST_LABELS: Record<string, string> = {
  'request-only': 'Demande simple', 'know-venue': 'Connaît un lieu', 'can-venue': 'Peut fournir le lieu',
  'can-organize': "Peut organiser", 'venue-and-organize': 'Lieu + organisation',
};
const look = (d: Record<string, string>, k?: string) => (k ? d[k] ?? k : undefined);

// ─── Normalizers: each collection → Submission[] ────────────────────────────

function normalizeBooking(b: BookingRequest): Submission {
  const details: Submission['details'] = [];
  const push = (label: string, value?: string) => { if (value) details.push({ label, value }); };
  push('Téléphone',      b.phone);
  push('Organisation',   b.organization);
  push('Site web',       b.organizationUrl);
  push('Ville',          b.city);
  push('Région',         b.region);
  push('Intervention',   look(INTERVENTION_LABELS, b.interventionKind));
  push('Format',         look(FORMAT_LABELS, b.format));
  push('Durée',          look(DURATION_LABELS, b.duration));
  push('Langue',         look(LANG_LABELS, b.languagePref));
  push('Public',         look(AUDIENCE_LABELS, b.audienceType));
  push('Taille public',  look(SIZE_LABELS, b.audienceSize));
  push('Date souhaitée', b.preferredDate);
  push('Budget',         look(BUDGET_LABELS, b.budgetRange));
  push('Rôle possible',  look(HOST_LABELS, b.hostCapability));
  push('Type (libre)',   b.eventType);

  const summary = [
    look(INTERVENTION_LABELS, b.interventionKind),
    look(FORMAT_LABELS, b.format),
    b.city || b.organization,
  ].filter(Boolean).join(' · ') || b.eventType || 'Demande';

  return {
    id: `booking-${b.id}`,
    category: 'booking',
    name: b.name,
    email: b.email,
    source: b.source || 'conferenciere',
    tags: b.tags || [],
    createdAt: b.createdAt,
    summary,
    details,
    message: b.message,
  };
}

function normalizeNewsletter(n: NewsletterSubscriber): Submission {
  const isWaitlist = (n.source || '').startsWith('waitlist-') || (n.tags || []).some(t => t.startsWith('waitlist-'));
  const name = [n.firstName, n.lastName].filter(Boolean).join(' ').trim() || '(sans nom)';
  const details: Submission['details'] = [];
  if (n.firstName) details.push({ label: 'Prénom', value: n.firstName });
  if (n.lastName)  details.push({ label: 'Nom',    value: n.lastName });
  if (n.status)    details.push({ label: 'Statut', value: n.status });
  if (n.uid)       details.push({ label: 'Membre lié', value: 'oui' });

  return {
    id: `newsletter-${n.id}`,
    category: isWaitlist ? 'waitlist' : 'newsletter',
    name,
    email: n.email,
    source: n.source || 'newsletter',
    tags: n.tags || [],
    createdAt: n.subscribedAt,
    summary: isWaitlist
      ? prettySource(n.source || '')
      : (n.status === 'unsubscribed' ? 'Désabonné·e' : 'Abonné·e'),
    details,
  };
}

function normalizeDosha(d: DoshaResult): Submission {
  const name = [d.firstName, d.lastName].filter(Boolean).join(' ').trim() || '(sans nom)';
  return {
    id: `dosha-${d.id}`,
    category: 'dosha',
    name,
    email: d.email,
    source: d.source || 'quiz',
    tags: d.tags || [],
    createdAt: d.createdAt,
    summary: `Dominant : ${d.dominant}  ·  V ${d.vata} · P ${d.pitta} · K ${d.kapha}`,
    details: [
      { label: 'Dominant', value: d.dominant },
      { label: 'Vata',  value: String(d.vata) },
      { label: 'Pitta', value: String(d.pitta) },
      { label: 'Kapha', value: String(d.kapha) },
    ],
    doshaDominant: d.dominant,
  };
}

function normalizeGuide(g: GuideResponse): Submission {
  const name = [g.firstName, g.lastName].filter(Boolean).join(' ').trim() || '(anonyme)';
  const answers = (g.answers || []).map(a => `${a.questionLabel || a.qid} → ${a.optionId}`).join('  ·  ');
  return {
    id: `guide-${g.id}`,
    category: 'guide',
    name,
    email: g.email || '',
    source: g.source || 'guide',
    tags: g.tags || [],
    createdAt: g.createdAt,
    summary: `Recommandé : ${g.recommendationLabel || g.recommendationId}`,
    details: [
      { label: 'Recommandation', value: g.recommendationLabel || g.recommendationId },
      { label: 'Réponses',       value: answers || '—' },
    ],
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

type CategoryFilter = 'all' | FormCategory;
type TimeFilter = 'all' | '7d' | '30d' | '90d';
type DoshaFilter = 'all' | 'Vata' | 'Pitta' | 'Kapha' | 'Tridoshic';

const CATEGORY_TABS: { id: CategoryFilter; label: string }[] = [
  { id: 'all',        label: 'Toutes' },
  { id: 'booking',    label: 'Réservations' },
  { id: 'newsletter', label: 'Infolettre' },
  { id: 'waitlist',   label: "Listes d'attente" },
  { id: 'dosha',      label: 'Dosha' },
  { id: 'guide',      label: 'Guide' },
];

const TIME_TABS: { id: TimeFilter; label: string }[] = [
  { id: 'all', label: 'Tout' },
  { id: '7d',  label: '7 j' },
  { id: '30d', label: '30 j' },
  { id: '90d', label: '90 j' },
];

const DOSHA_TABS: { id: DoshaFilter; label: string; color: string }[] = [
  { id: 'all',       label: 'Tous',     color: 'border-[#3A251E]/10 dark:border-white/10' },
  { id: 'Vata',      label: 'Vata',     color: 'border-[#8F9779]/60 text-[#4A5D23]' },
  { id: 'Pitta',     label: 'Pitta',    color: 'border-[#BC4A3C]/60 text-[#BC4A3C]' },
  { id: 'Kapha',     label: 'Kapha',    color: 'border-[#4A7C9D]/60 text-[#4A7C9D]' },
  { id: 'Tridoshic', label: 'Tridosha', color: 'border-[#B8532F]/60 text-[#B8532F]' },
];

const SubmissionsSection: React.FC = () => {
  const [subs, setSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState<CategoryFilter>('all');
  const [time, setTime] = useState<TimeFilter>('all');
  const [dosha, setDosha] = useState<DoshaFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  // When set, open the admin client-view modal for that member. The name
  // column becomes a button only for submissions whose email matches a
  // known members/* record.
  const [viewingUid, setViewingUid] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getBookingRequests().catch(() => [] as BookingRequest[]),
      getNewsletterSubscribers().catch(() => [] as NewsletterSubscriber[]),
      getDoshaResults().catch(() => [] as DoshaResult[]),
      getGuideResponses().catch(() => [] as GuideResponse[]),
      getAllMembers().catch(() => [] as MemberDoc[]),
    ]).then(([bookings, subscribers, doshas, guides, members]) => {
      if (cancelled) return;

      // Build email → uid map for member reconciliation. Stored lowercase
      // so casing drift between the form payload and the members doc
      // doesn't break the link.
      const emailToUid = new Map<string, string>();
      members.forEach(m => {
        if (m.email) emailToUid.set(m.email.trim().toLowerCase(), m.uid);
      });
      const withMember = (s: Submission): Submission => {
        const key = s.email.trim().toLowerCase();
        const uid = key ? emailToUid.get(key) : undefined;
        return uid ? { ...s, memberUid: uid } : s;
      };

      const rows: Submission[] = [
        ...bookings.map(normalizeBooking).map(withMember),
        ...subscribers.map(normalizeNewsletter).map(withMember),
        ...doshas.map(normalizeDosha).map(withMember),
        ...guides.map(normalizeGuide).map(withMember),
      ];
      rows.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? 0;
        return tb - ta;
      });
      setSubs(rows);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  // Unique source options for the dropdown — refreshed whenever the base
  // list changes so new sources appear without a code push.
  const sourceOptions = useMemo(() => {
    const set = new Set<string>();
    subs.forEach(s => { if (s.source) set.add(s.source); });
    return Array.from(set).sort();
  }, [subs]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoff =
      time === '7d'  ? now - 7 * 86_400_000 :
      time === '30d' ? now - 30 * 86_400_000 :
      time === '90d' ? now - 90 * 86_400_000 : 0;
    const needle = search.trim().toLowerCase();

    return subs.filter(s => {
      if (cat !== 'all' && s.category !== cat) return false;
      if (sourceFilter !== 'all' && s.source !== sourceFilter) return false;
      if (cutoff && (s.createdAt?.toMillis?.() ?? 0) < cutoff) return false;
      // Dosha pill applies to dosha rows only; a non-dosha row never
      // matches a dosha filter, so switching the pill while on "Toutes"
      // narrows to the dosha submissions that fit.
      if (dosha !== 'all') {
        if (s.category !== 'dosha') return false;
        if (s.doshaDominant !== dosha) return false;
      }
      if (needle) {
        const hay = `${s.name} ${s.email} ${s.summary} ${s.message || ''} ${s.tags.join(' ')}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [subs, cat, time, dosha, sourceFilter, search]);

  const counts = useMemo(() => {
    const c: Record<CategoryFilter, number> = { all: subs.length, booking: 0, newsletter: 0, waitlist: 0, dosha: 0, guide: 0 };
    subs.forEach(s => { c[s.category]++; });
    return c;
  }, [subs]);

  const exportCsv = () => {
    const rows = filtered.map(s => ({
      date: s.createdAt?.toDate?.().toISOString?.() ?? '',
      category: s.category,
      name: s.name,
      email: s.email,
      source: s.source,
      tags: s.tags.join('|'),
      summary: s.summary,
      message: s.message || '',
    }));
    downloadCsv(`formulaires-${Date.now()}.csv`, rows);
  };

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <i className="fa-solid fa-circle-notch fa-spin text-[#B8532F] text-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Intro */}
      <Card className="p-5">
        <p className="text-sm text-[#3A251E]/70 dark:text-white/70 leading-relaxed">
          Toutes les réponses aux formulaires du site — Réserver Krystine, Tournée de conférences,
          Pulsation, listes d'attente, Quiz Dosha et Laissez-vous guider — atterrissent ici dans un
          seul flux filtrable. Les sections spécialisées (Demandes, Infolettre, Quiz Dosha, Parcours
          guidés) restent disponibles pour les actions ciblées.
        </p>
      </Card>

      {/* Filter bar — category tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {CATEGORY_TABS.map(tab => {
          const active = cat === tab.id;
          const n = counts[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => { setCat(tab.id); if (tab.id !== 'dosha' && tab.id !== 'all') setDosha('all'); }}
              className={`px-4 py-2 rounded-full text-[11px] uppercase tracking-widest font-bold border transition-colors ${
                active
                  ? 'bg-[#3A251E] dark:bg-[#B8532F] text-white dark:text-[#3A251E] border-transparent'
                  : 'border-[#3A251E]/10 dark:border-white/10 text-[#3A251E]/70 dark:text-white/70 hover:border-[#B8532F] hover:text-[#B8532F]'
              }`}
            >
              {tab.label}
              <span className={`ml-2 text-[10px] ${active ? 'opacity-70' : 'opacity-60'}`}>{n}</span>
            </button>
          );
        })}
      </div>

      {/* Dosha secondary filter — only visible when the current scope could
          include dosha rows (All or Dosha). Keeps the filter bar clean for
          categories where it would be irrelevant (e.g. Bookings). */}
      {(cat === 'all' || cat === 'dosha') && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest font-bold text-[#3A251E]/50 dark:text-white/50 mr-1">
            Dosha dominant
          </span>
          {DOSHA_TABS.map(tab => {
            const active = dosha === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setDosha(tab.id)}
                className={`px-3.5 py-1.5 rounded-full text-[11px] uppercase tracking-widest font-bold border transition-colors ${
                  active
                    ? `bg-[#3A251E] dark:bg-[#B8532F] text-white dark:text-[#3A251E] border-transparent`
                    : `${tab.color} bg-white/40 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10`
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Secondary filter row — source, time, search, export */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value)}
          className="text-xs px-4 py-2.5 rounded-full border border-[#3A251E]/10 dark:border-white/10 bg-white dark:bg-white/5 text-[#3A251E] dark:text-white min-w-[220px]"
        >
          <option value="all">Toutes les origines</option>
          {sourceOptions.map(s => <option key={s} value={s}>{prettySource(s)}</option>)}
        </select>

        <div className="flex items-center gap-1">
          {TIME_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setTime(tab.id)}
              className={`px-3 py-2 rounded-full text-[11px] uppercase tracking-widest font-bold border transition-colors ${
                time === tab.id
                  ? 'bg-[#B8532F]/15 text-[#B8532F] border-[#B8532F]/40'
                  : 'border-[#3A251E]/10 dark:border-white/10 text-[#3A251E]/60 dark:text-white/60 hover:text-[#B8532F]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-[#3A251E]/30 dark:text-white/30 text-[11px]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher nom, courriel, message…"
            className="w-full pl-10 pr-4 py-2.5 rounded-full border border-[#3A251E]/10 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-[#3A251E] dark:text-white placeholder:text-[#3A251E]/40 dark:placeholder:text-white/40 focus:outline-none focus:border-[#B8532F]"
          />
        </div>

        <GhostButton onClick={exportCsv} disabled={filtered.length === 0}>
          <i className="fa-solid fa-file-arrow-down" /> CSV
        </GhostButton>
      </div>

      {/* Results */}
      <div className="text-[11px] uppercase tracking-widest text-[#3A251E]/50 dark:text-white/50">
        {filtered.length} {filtered.length === 1 ? 'soumission' : 'soumissions'}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="fa-inbox">Aucune soumission ne correspond à ces filtres.</EmptyState>
      ) : (
        <div className="space-y-2">
          {filtered.map(s => {
            const meta = CATEGORY_META[s.category];
            const isOpen = expanded === s.id;
            const dateStr = s.createdAt?.toDate?.().toLocaleDateString('fr-CA', {
              year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            }) || '—';
            return (
              <Card key={s.id} className="px-5 py-4">
                <div className="w-full flex items-start gap-4">
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : s.id)}
                    aria-label="Afficher les détails"
                    className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${meta.badge}`}
                  >
                    <i className={`fa-solid ${meta.icon} text-sm`} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      {s.memberUid ? (
                        <button
                          type="button"
                          onClick={() => setViewingUid(s.memberUid!)}
                          className="font-serif text-[#3A251E] dark:text-white hover:text-[#B8532F] transition-colors inline-flex items-center gap-1.5"
                          title="Voir le profil client"
                        >
                          {s.name}
                          <i className="fa-solid fa-arrow-up-right-from-square text-[10px] text-[#B8532F]" />
                        </button>
                      ) : (
                        <h3 className="font-serif text-[#3A251E] dark:text-white">{s.name}</h3>
                      )}
                      <span className="text-[10px] uppercase tracking-widest font-bold text-[#3A251E]/50 dark:text-white/50">
                        · {meta.label}
                      </span>
                      {s.memberUid && (
                        <span className="text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full bg-[#B8532F]/15 text-[#B8532F]">
                          Membre
                        </span>
                      )}
                      <span className="text-[10px] uppercase tracking-widest text-[#3A251E]/40 dark:text-white/40 ml-auto">
                        {dateStr}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : s.id)}
                      className="block text-left w-full"
                    >
                      <p className="text-xs text-[#3A251E]/60 dark:text-white/60 mt-1 truncate">
                        {s.email || '—'} · <span className="italic">{prettySource(s.source)}</span>
                      </p>
                      <p className="text-xs text-[#3A251E]/70 dark:text-white/70 mt-1 truncate">{s.summary}</p>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : s.id)}
                    aria-label={isOpen ? 'Replier' : 'Déplier'}
                    className="shrink-0"
                  >
                    <i className={`fa-solid ${isOpen ? 'fa-chevron-up' : 'fa-chevron-down'} text-[#3A251E]/40 dark:text-white/40 text-xs mt-2`} />
                  </button>
                </div>

                {isOpen && (
                  <div className="mt-4 pl-[52px] border-t border-[#3A251E]/5 dark:border-white/10 pt-4 space-y-1">
                    {s.details.length === 0 ? (
                      <p className="text-xs text-[#3A251E]/40 dark:text-white/40 italic">Aucun détail structuré.</p>
                    ) : s.details.map((d, i) => (
                      <div key={i} className="flex items-baseline gap-3 py-0.5 text-sm">
                        <span className="text-[10px] uppercase tracking-widest text-[#3A251E]/50 dark:text-white/50 font-bold w-36 shrink-0">
                          {d.label}
                        </span>
                        <span className="text-[#3A251E]/85 dark:text-white/85 break-words">{d.value}</span>
                      </div>
                    ))}

                    {s.message && (
                      <div className="pt-3">
                        <span className="block text-[10px] uppercase tracking-widest text-[#3A251E]/50 dark:text-white/50 font-bold mb-1">
                          Message
                        </span>
                        <p className="text-sm text-[#3A251E]/85 dark:text-white/85 leading-relaxed whitespace-pre-line">{s.message}</p>
                      </div>
                    )}

                    {s.tags.length > 0 && (
                      <div className="pt-3 flex flex-wrap gap-1.5">
                        {s.tags.map(tag => (
                          <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-[#3A251E]/5 dark:bg-white/10 text-[#3A251E]/60 dark:text-white/60">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {viewingUid && (
        <AdminClientView uid={viewingUid} onClose={() => setViewingUid(null)} />
      )}
    </div>
  );
};

export default SubmissionsSection;
