import React, { useEffect, useState } from 'react';
import {
  getBookingRequests,
  updateBookingRequest,
  deleteBookingRequest,
  type BookingRequest,
  type BookingStatus,
} from '../../../firebase/firestore';
import { Card, DangerButton, EmptyState, GhostButton } from '../primitives';

const STATUS_OPTIONS: { id: BookingStatus; label: string; color: string }[] = [
  { id: 'new',         label: 'Nouveau',     color: 'bg-[#D4AF37]/10 text-[#D4AF37]' },
  { id: 'in_progress', label: 'En cours',    color: 'bg-yellow-50 text-yellow-600' },
  { id: 'accepted',    label: 'Accepté',     color: 'bg-green-50 text-green-600' },
  { id: 'declined',    label: 'Refusé',      color: 'bg-red-50 text-red-500' },
];

// ─── Label dictionaries (FR only — admin is internal) ────────────────────────
// Keep in sync with the enum values in firestore.ts. Unknown keys fall back
// to the raw id so a future value still renders readable.

const INTERVENTION_LABELS: Record<string, string> = {
  keynote: 'Conférence / Keynote',
  workshop: 'Atelier pratique',
  panel: 'Table ronde / Panel',
  hosting: "Animation d'événement",
  podcast: 'Podcast / Entrevue média',
  corporate: 'Formation corporate',
  retreat: 'Retraite ou séjour',
  other: 'Autre',
};

const FORMAT_LABELS: Record<string, string> = {
  'in-person': 'Présentiel',
  virtual: 'Virtuel',
  hybrid: 'Hybride',
  open: 'Ouvert · à discuter',
};

const AUDIENCE_LABELS: Record<string, string> = {
  'general-public': 'Grand public',
  corporate: 'Entreprise',
  students: 'Étudiants',
  healthcare: 'Santé',
  community: 'Communauté',
  other: 'Autre',
};

const SIZE_LABELS: Record<string, string> = {
  'under-50': '< 50 personnes',
  '50-150': '50 à 150',
  '150-500': '150 à 500',
  '500-plus': '500 +',
  unknown: 'À déterminer',
};

const DURATION_LABELS: Record<string, string> = {
  '30min': '30 min',
  '60min': '60 min',
  '90min': '90 min',
  'half-day': 'Demi-journée',
  'full-day': 'Journée complète',
  'multi-day': 'Plusieurs jours',
  flexible: 'Flexible',
};

const BUDGET_LABELS: Record<string, string> = {
  'under-2k': '< 2 000 $',
  '2k-5k': '2 k – 5 k $',
  '5k-10k': '5 k – 10 k $',
  '10k-plus': '10 k $ et +',
  'to-discuss': 'À discuter',
};

const LANG_LABELS: Record<string, string> = {
  fr: 'Français',
  en: 'Anglais',
  bilingual: 'Bilingue',
};

const HOST_LABELS: Record<string, string> = {
  'request-only': 'Demande simple',
  'know-venue': 'Connaît un lieu',
  'can-venue': 'Peut fournir le lieu',
  'can-organize': "Peut aider à l'organisation",
  'venue-and-organize': 'Lieu + organisation',
};

const lookup = (dict: Record<string, string>, key?: string) =>
  key ? dict[key] ?? key : undefined;

// ─── Row component ───────────────────────────────────────────────────────────

const DetailRow: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => {
  if (!value) return null;
  return (
    <div className="flex items-baseline gap-3 py-1 text-sm">
      <span className="text-[10px] uppercase tracking-widest text-[#0B1A36]/50 dark:text-white/50 font-bold w-36 shrink-0">
        {label}
      </span>
      <span className="text-[#0B1A36]/85 dark:text-white/85 break-words">{value}</span>
    </div>
  );
};

const BookingsSection: React.FC = () => {
  const [items, setItems] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const refresh = () => getBookingRequests().then(setItems).finally(() => setLoading(false));
  useEffect(() => { refresh(); }, []);

  const changeStatus = async (id: string, status: BookingStatus) => {
    await updateBookingRequest(id, { status });
    setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i));
  };

  const del = async (b: BookingRequest) => {
    if (!b.id) return;
    if (!confirm('Supprimer cette demande ?')) return;
    await deleteBookingRequest(b.id);
    await refresh();
  };

  if (loading) return <div className="py-12 flex justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#D4AF37] text-2xl" /></div>;
  if (items.length === 0) return <EmptyState icon="fa-inbox">Aucune demande reçue.</EmptyState>;

  return (
    <div className="space-y-3">
      {items.map(b => {
        const isOpen = expanded === b.id;
        const status = STATUS_OPTIONS.find(s => s.id === (b.status || 'new')) || STATUS_OPTIONS[0];
        const sourceLabel = b.source === 'conference-tour' ? 'Tournée' : b.source === 'conferenciere' ? 'Réserver Krystine' : b.source || 'Autre';
        return (
          <Card key={b.id} className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-serif text-[#0B1A36] dark:text-white">{b.name}</h3>
                  <span className={`text-[10px] uppercase tracking-widest font-bold px-2.5 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                  <span className="text-[10px] uppercase tracking-widest font-bold px-2.5 py-0.5 rounded-full bg-[#0B1A36]/5 dark:bg-white/10 text-[#0B1A36]/70 dark:text-white/70">
                    {sourceLabel}
                  </span>
                </div>
                <p className="text-xs text-[#0B1A36]/50 dark:text-white/50 mt-1">
                  {b.email}
                  {b.phone ? ` · ${b.phone}` : ''}
                  {b.organization ? ` · ${b.organization}` : ''}
                  {lookup(INTERVENTION_LABELS, b.interventionKind) ? ` · ${lookup(INTERVENTION_LABELS, b.interventionKind)}` : ''}
                  {b.eventType ? ` · ${b.eventType}` : ''}
                </p>

                {isOpen && (
                  <div className="mt-5 border-t border-[#0B1A36]/5 dark:border-white/10 pt-4 space-y-0.5">
                    <DetailRow label="Courriel"       value={b.email} />
                    <DetailRow label="Téléphone"      value={b.phone} />
                    <DetailRow label="Organisation"   value={b.organization} />
                    <DetailRow label="Site web"       value={b.organizationUrl} />
                    <DetailRow label="Ville"          value={b.city} />
                    <DetailRow label="Région"         value={b.region} />
                    <DetailRow label="Intervention"   value={lookup(INTERVENTION_LABELS, b.interventionKind)} />
                    <DetailRow label="Format"         value={lookup(FORMAT_LABELS, b.format)} />
                    <DetailRow label="Durée"          value={lookup(DURATION_LABELS, b.duration)} />
                    <DetailRow label="Langue"         value={lookup(LANG_LABELS, b.languagePref)} />
                    <DetailRow label="Public"         value={lookup(AUDIENCE_LABELS, b.audienceType)} />
                    <DetailRow label="Taille public"  value={lookup(SIZE_LABELS, b.audienceSize)} />
                    <DetailRow label="Date souhaitée" value={b.preferredDate} />
                    <DetailRow label="Budget"         value={lookup(BUDGET_LABELS, b.budgetRange)} />
                    <DetailRow label="Rôle possible"  value={lookup(HOST_LABELS, b.hostCapability)} />
                    <DetailRow label="Type (libre)"   value={b.eventType} />
                    {b.message && (
                      <div className="pt-3">
                        <span className="block text-[10px] uppercase tracking-widest text-[#0B1A36]/50 dark:text-white/50 font-bold mb-1">
                          Message
                        </span>
                        <p className="text-sm text-[#0B1A36]/85 dark:text-white/85 leading-relaxed whitespace-pre-line">{b.message}</p>
                      </div>
                    )}
                    {b.tags && b.tags.length > 0 && (
                      <div className="pt-3 flex flex-wrap gap-1.5">
                        {b.tags.map(tag => (
                          <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-[#0B1A36]/5 dark:bg-white/10 text-[#0B1A36]/60 dark:text-white/60">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <select
                  value={b.status || 'new'}
                  onChange={e => b.id && changeStatus(b.id, e.target.value as BookingStatus)}
                  className="text-xs px-3 py-2 rounded-lg border border-[#0B1A36]/10 dark:border-white/10 bg-[#F5F5F0] dark:bg-white/5 text-[#0B1A36] dark:text-white"
                >
                  {STATUS_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                <GhostButton onClick={() => setExpanded(isOpen ? null : b.id!)}>
                  <i className={`fa-solid ${isOpen ? 'fa-chevron-up' : 'fa-chevron-down'}`} /> {isOpen ? 'Masquer' : 'Voir'}
                </GhostButton>
                <DangerButton onClick={() => del(b)}><i className="fa-solid fa-trash" /></DangerButton>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default BookingsSection;
