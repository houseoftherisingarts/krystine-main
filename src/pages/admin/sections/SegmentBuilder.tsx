import React, { useEffect, useMemo, useState } from 'react';
import {
  getAllMembers, getNewsletterSubscribers, getClientOrders,
  getDoshaResults, getGuideResponses,
  createMessagingGroup,
  type MemberDoc, type NewsletterSubscriber, type ClientOrder,
  type DoshaResult, type GuideResponse, type MessagingGroup,
} from '../../../firebase/firestore';
import { getMemberPoints, type PointsBalance } from '../../../firebase/points';
import {
  buildContactMetrics, evaluateSegment, findField, newCriterion,
  FIELDS, OPERATOR_LABELS,
  type Segment, type Criterion, type CriterionField, type Operator, type ContactMetrics,
} from '../../../lib/segments';
import { Card, GhostButton, PrimaryButton, DangerButton, Input, Label, Textarea } from '../primitives';

// ─── Segment builder modal ──────────────────────────────────────────────────
// Loads every relevant collection once, then re-evaluates the criteria
// client-side on each change so the matching count + preview stay live.
// Points balances are only fetched when a points-based criterion is
// introduced (there's no bulk loader — one getMemberPoints call per
// member, run in parallel).

interface Props {
  onClose: () => void;
  onCreated: (groupId: string) => void;
}

const SegmentBuilder: React.FC<Props> = ({ onClose, onCreated }) => {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<MemberDoc[]>([]);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [doshas, setDoshas] = useState<DoshaResult[]>([]);
  const [guides, setGuides] = useState<GuideResponse[]>([]);
  const [pointsByUid, setPointsByUid] = useState<Record<string, PointsBalance>>({});
  const [pointsLoading, setPointsLoading] = useState(false);

  const [segment, setSegment] = useState<Segment>({ mode: 'all', criteria: [newCriterion()] });
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Bulk load everything except points (deferred).
  useEffect(() => {
    Promise.all([
      getAllMembers(),
      getNewsletterSubscribers(),
      getClientOrders(),
      getDoshaResults(),
      getGuideResponses(),
    ]).then(([m, s, o, d, g]) => {
      setMembers(m); setSubscribers(s); setOrders(o); setDoshas(d); setGuides(g);
      setLoading(false);
    });
  }, []);

  const needsPoints = segment.criteria.some(c =>
    c.field === 'pointsBalance' || c.field === 'pointsLifetime' || c.field === 'tier'
  );

  // Fetch point balances lazily when a points-based criterion first
  // appears. Stored in state so subsequent toggles don't refetch.
  useEffect(() => {
    if (!needsPoints || pointsLoading) return;
    if (Object.keys(pointsByUid).length > 0) return;
    const uids = members.map(m => m.uid).filter(Boolean);
    if (uids.length === 0) return;
    setPointsLoading(true);
    Promise.all(uids.map(u => getMemberPoints(u).then(b => [u, b] as const)))
      .then(entries => {
        const out: Record<string, PointsBalance> = {};
        for (const [u, b] of entries) out[u] = b;
        setPointsByUid(out);
      })
      .finally(() => setPointsLoading(false));
  }, [needsPoints, members, pointsLoading, pointsByUid]);

  const allContacts = useMemo<ContactMetrics[]>(
    () => buildContactMetrics({
      members, subscribers, orders, doshaResults: doshas, guideResponses: guides,
      pointsByUid: needsPoints ? pointsByUid : undefined,
    }),
    [members, subscribers, orders, doshas, guides, pointsByUid, needsPoints]
  );

  const matched = useMemo(
    () => evaluateSegment(allContacts, segment),
    [allContacts, segment]
  );

  const addCriterion = () =>
    setSegment(s => ({ ...s, criteria: [...s.criteria, newCriterion()] }));

  const removeCriterion = (id: string) =>
    setSegment(s => ({ ...s, criteria: s.criteria.filter(c => c.id !== id) }));

  const updateCriterion = (id: string, patch: Partial<Criterion>) =>
    setSegment(s => ({
      ...s,
      criteria: s.criteria.map(c => c.id === id ? { ...c, ...patch } : c),
    }));

  const save = async () => {
    setErr(null);
    if (!name.trim()) { setErr('Donnez un nom au groupe.'); return; }
    if (matched.length === 0) { setErr('Aucun contact ne correspond. Ajustez les critères.'); return; }
    setSaving(true);
    try {
      const group: Omit<MessagingGroup, 'id' | 'createdAt' | 'updatedAt'> = {
        name: name.trim(),
        description: description.trim() || undefined,
        memberUids: matched.map(c => c.uid).filter((u): u is string => !!u),
        memberEmails: matched.map(c => c.email),
        segment: {
          mode: segment.mode,
          criteria: segment.criteria.map(c => ({
            id: c.id, field: c.field, op: c.op, value: c.value, extra: c.extra,
          })),
        },
      };
      const ref = await createMessagingGroup(group);
      onCreated(ref.id);
    } catch (e: any) {
      setErr(e?.message || 'Erreur lors de la création.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center p-4 bg-[#0B1A36]/60 backdrop-blur-md overflow-y-auto" onClick={onClose}>
      <div className="relative w-full max-w-4xl my-8 bg-white dark:bg-[#0B1A36] rounded-[28px] shadow-2xl border border-[#D4AF37]/20" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 md:px-8 py-5 border-b border-[#0B1A36]/5 dark:border-white/10 flex items-start justify-between gap-3 sticky top-0 bg-white dark:bg-[#0B1A36] rounded-t-[28px] z-10">
          <div>
            <span className="text-[#D4AF37] uppercase tracking-[0.3em] text-[10px] font-bold block mb-1">
              Segment intelligent
            </span>
            <h2 className="font-serif text-2xl text-[#0B1A36] dark:text-white">Nouveau groupe par segment</h2>
            <p className="text-sm text-[#0B1A36]/60 dark:text-white/60 mt-1 font-serif italic">
              Composez des critères (dosha, points, achats, parcours…) — le comptage se met à jour en direct.
            </p>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="w-9 h-9 rounded-full text-[#0B1A36]/40 dark:text-white/40 hover:text-[#0B1A36] dark:hover:text-white shrink-0">
            <i className="fa-solid fa-times text-lg" />
          </button>
        </div>

        {loading ? (
          <div className="py-24 flex justify-center">
            <i className="fa-solid fa-circle-notch fa-spin text-[#D4AF37] text-2xl" />
          </div>
        ) : (
          <div className="p-6 md:p-8 space-y-6">

            {/* ── Group meta ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nom du groupe *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex. Maniaques des huiles" />
              </div>
              <div>
                <Label>Description (facultatif)</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="À quoi sert ce groupe ?" />
              </div>
            </div>

            {/* ── Mode ── */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[11px] uppercase tracking-widest font-bold text-[#0B1A36]/70 dark:text-white/70">
                  Critères
                </h3>
                <div className="flex items-center gap-1 p-1 rounded-full bg-[#F5F5F0] dark:bg-white/5">
                  <ModeButton active={segment.mode === 'all'} onClick={() => setSegment(s => ({ ...s, mode: 'all' }))}>Tous les critères (ET)</ModeButton>
                  <ModeButton active={segment.mode === 'any'} onClick={() => setSegment(s => ({ ...s, mode: 'any' }))}>Au moins un (OU)</ModeButton>
                </div>
              </div>

              <div className="space-y-3">
                {segment.criteria.map((c) => (
                  <CriterionRow
                    key={c.id}
                    criterion={c}
                    onChange={patch => updateCriterion(c.id, patch)}
                    onRemove={() => removeCriterion(c.id)}
                    canRemove={segment.criteria.length > 1}
                  />
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <GhostButton onClick={addCriterion}>
                  <i className="fa-solid fa-plus text-[10px]" /> Ajouter un critère
                </GhostButton>
                {pointsLoading && (
                  <span className="text-[11px] text-[#0B1A36]/50 dark:text-white/50">
                    <i className="fa-solid fa-circle-notch fa-spin mr-2" /> Chargement des points…
                  </span>
                )}
              </div>
            </Card>

            {/* ── Preview ── */}
            <Card className="p-5">
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="text-[11px] uppercase tracking-widest font-bold text-[#0B1A36]/70 dark:text-white/70">
                  Aperçu
                </h3>
                <p className="text-sm text-[#0B1A36] dark:text-white">
                  <span className="font-serif text-2xl text-[#D4AF37]">{matched.length}</span>{' '}
                  contact{matched.length === 1 ? '' : 's'} correspond{matched.length === 1 ? '' : 'ent'}
                </p>
              </div>

              {matched.length === 0 ? (
                <p className="text-sm text-[#0B1A36]/40 dark:text-white/40 italic py-3">
                  Personne ne correspond aux critères actuels.
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto divide-y divide-[#0B1A36]/5 dark:divide-white/5">
                  {matched.slice(0, 50).map(c => (
                    <div key={c.email} className="flex items-center justify-between py-2 text-sm">
                      <div className="min-w-0">
                        <p className="text-[#0B1A36] dark:text-white truncate">{c.name}</p>
                        <p className="text-[11px] text-[#0B1A36]/50 dark:text-white/50 truncate">{c.displayEmail}</p>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest shrink-0">
                        {c.dosha && <span className="px-2 py-0.5 rounded-full bg-[#0B1A36]/5 dark:bg-white/10 text-[#0B1A36]/60 dark:text-white/60">{c.dosha}</span>}
                        {c.isMember && <span className="px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] font-bold">Compte</span>}
                      </div>
                    </div>
                  ))}
                  {matched.length > 50 && (
                    <p className="py-2 text-[11px] text-[#0B1A36]/40 dark:text-white/40 italic text-center">
                      + {matched.length - 50} autres…
                    </p>
                  )}
                </div>
              )}
            </Card>

            {err && <p className="text-center text-sm text-red-600">{err}</p>}

            {/* ── Footer ── */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <GhostButton onClick={onClose}>Annuler</GhostButton>
              <PrimaryButton onClick={save} disabled={saving || !name.trim() || matched.length === 0}>
                {saving ? <i className="fa-solid fa-circle-notch fa-spin" /> : <i className="fa-solid fa-check text-[10px]" />}
                Créer le groupe ({matched.length})
              </PrimaryButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Criterion row ──────────────────────────────────────────────────────────
interface RowProps {
  criterion: Criterion;
  onChange: (patch: Partial<Criterion>) => void;
  onRemove: () => void;
  canRemove: boolean;
}
const CriterionRow: React.FC<RowProps> = ({ criterion, onChange, onRemove, canRemove }) => {
  const field = findField(criterion.field);

  // Reset value/operator when the field changes to keep the row consistent.
  const setField = (newFieldId: CriterionField) => {
    const f = findField(newFieldId);
    if (!f) return;
    const defaultValue: string | number | boolean =
      f.valueKind === 'boolean' ? true :
      f.valueKind === 'number'  ? 0 :
      f.options?.[0]?.value ?? '';
    onChange({
      field: newFieldId,
      op: f.operators[0],
      value: defaultValue,
      extra: f.needsExtra ? '' : undefined,
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto] gap-3 items-center p-3 rounded-xl bg-[#F5F5F0] dark:bg-white/5 border border-[#0B1A36]/5 dark:border-white/5">

      {/* Field select */}
      <select
        value={criterion.field}
        onChange={e => setField(e.target.value as CriterionField)}
        className="px-3 py-2 rounded-lg border border-[#0B1A36]/10 dark:border-white/10 bg-white dark:bg-[#0B1A36]/80 text-sm text-[#0B1A36] dark:text-white"
      >
        {FIELDS.map(f => (
          <option key={f.id} value={f.id}>{f.label}</option>
        ))}
      </select>

      {/* Operator select */}
      <select
        value={criterion.op}
        onChange={e => onChange({ op: e.target.value as Operator })}
        className="px-3 py-2 rounded-lg border border-[#0B1A36]/10 dark:border-white/10 bg-white dark:bg-[#0B1A36]/80 text-sm text-[#0B1A36] dark:text-white"
      >
        {field?.operators.map(op => (
          <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>
        ))}
      </select>

      {/* Value input(s) */}
      <div className="flex items-center gap-2">
        {field?.valueKind === 'enum' || field?.valueKind === 'boolean' ? (
          <select
            value={String(criterion.value)}
            onChange={e => {
              const v = field.valueKind === 'boolean' ? e.target.value === 'true' : e.target.value;
              onChange({ value: v });
            }}
            className="flex-1 px-3 py-2 rounded-lg border border-[#0B1A36]/10 dark:border-white/10 bg-white dark:bg-[#0B1A36]/80 text-sm text-[#0B1A36] dark:text-white"
          >
            {field.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : field?.valueKind === 'number' ? (
          <input
            type="number"
            value={Number(criterion.value)}
            onChange={e => onChange({ value: Number(e.target.value) })}
            className="flex-1 px-3 py-2 rounded-lg border border-[#0B1A36]/10 dark:border-white/10 bg-white dark:bg-[#0B1A36]/80 text-sm text-[#0B1A36] dark:text-white"
          />
        ) : (
          <input
            type="text"
            value={String(criterion.value)}
            onChange={e => onChange({ value: e.target.value })}
            placeholder="valeur"
            className="flex-1 px-3 py-2 rounded-lg border border-[#0B1A36]/10 dark:border-white/10 bg-white dark:bg-[#0B1A36]/80 text-sm text-[#0B1A36] dark:text-white"
          />
        )}
        {field?.needsExtra && (
          <input
            type="text"
            value={criterion.extra || ''}
            onChange={e => onChange({ extra: e.target.value })}
            placeholder={field.extraPlaceholder}
            className="w-40 px-3 py-2 rounded-lg border border-[#0B1A36]/10 dark:border-white/10 bg-white dark:bg-[#0B1A36]/80 text-sm text-[#0B1A36] dark:text-white"
            title={field.extraLabel}
          />
        )}
      </div>

      {/* Remove */}
      <DangerButton onClick={onRemove} disabled={!canRemove} className="shrink-0">
        <i className="fa-solid fa-xmark" />
      </DangerButton>

      {field?.description && (
        <p className="md:col-span-4 text-[11px] text-[#0B1A36]/50 dark:text-white/50 italic mt-1">
          {field.description}
        </p>
      )}
    </div>
  );
};

// ─── Mode toggle button ─────────────────────────────────────────────────────
const ModeButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-bold transition-colors ${
      active
        ? 'bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36]'
        : 'text-[#0B1A36]/60 dark:text-white/60 hover:text-[#D4AF37]'
    }`}
  >
    {children}
  </button>
);

export default SegmentBuilder;
