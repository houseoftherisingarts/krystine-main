import React, { useEffect, useMemo, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../../../firebase';
import {
  getMessagingGroups, createMessagingGroup, updateMessagingGroup, deleteMessagingGroup,
  getAllMembers, getNewsletterSubscribers,
  sendMessage, createNewsletter, tagSubscribersForGroup,
  type MessagingGroup, type MemberDoc, type NewsletterSubscriber,
} from '../../../firebase/firestore';
import { Card, EmptyState, GhostButton, PrimaryButton, DangerButton, Input, Label, Textarea } from '../primitives';
import SegmentBuilder from './SegmentBuilder';
import {
  getClientOrders, getDoshaResults, getGuideResponses,
  type ClientOrder, type DoshaResult, type GuideResponse,
} from '../../../firebase/firestore';
import { getMemberPoints, type PointsBalance } from '../../../firebase/points';
import { buildContactMetrics, evaluateSegment, type Segment } from '../../../lib/segments';

// ─── Messaging groups section ────────────────────────────────────────────────
// Krystine curates segments of her audience (e.g. "VIP retraites", "Origine
// alumnae", "Lancement Anglicane — invités") and broadcasts to them either
// through the internal messages channel (appears in their client portal)
// or through a batch email (newsletter cloud function).
//
// A group stores two parallel lists:
//   • `memberUids`   — signed-in members; reachable through internal messages
//   • `memberEmails` — any email; reachable through batch email
// Adding a contact populates whichever fields are available: a members-
// collection match contributes both uid + email; a newsletter-only contact
// contributes only an email.

// Unified picker row — merges members and newsletter subscribers by email
// so Krystine can add any known contact to a group.
interface Contact {
  email: string;         // lowercased key
  displayEmail: string;
  uid?: string;
  name?: string;
  isMember: boolean;
}

function buildContactPool(members: MemberDoc[], subs: NewsletterSubscriber[]): Contact[] {
  const map = new Map<string, Contact>();
  for (const m of members) {
    if (!m.email) continue;
    const key = m.email.trim().toLowerCase();
    map.set(key, {
      email: key,
      displayEmail: m.email,
      uid: m.uid,
      name: m.displayName || key,
      isMember: true,
    });
  }
  for (const s of subs) {
    if (!s.email) continue;
    const key = s.email.trim().toLowerCase();
    const existing = map.get(key);
    const pretty = [s.firstName, s.lastName].filter(Boolean).join(' ').trim();
    if (existing) {
      if (!existing.name && pretty) existing.name = pretty;
    } else {
      map.set(key, { email: key, displayEmail: s.email, name: pretty || key, isMember: false });
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    (a.name || a.email).localeCompare(b.name || b.email, 'fr')
  );
}

// ─── Top-level section ──────────────────────────────────────────────────────
const GroupsSection: React.FC = () => {
  const [groups, setGroups] = useState<MessagingGroup[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [segmenting, setSegmenting] = useState(false);
  // Track which segment-backed groups are mid-refresh so we can show a
  // spinner on the correct row without blocking the rest of the UI.
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const refresh = () =>
    Promise.all([
      getMessagingGroups(),
      getAllMembers(),
      getNewsletterSubscribers(),
    ]).then(([gs, members, subs]) => {
      setGroups(gs);
      setContacts(buildContactPool(members, subs));
      setLoading(false);
    });

  useEffect(() => { refresh(); }, []);

  const selected = useMemo(
    () => groups.find(g => g.id === selectedId) || null,
    [groups, selectedId]
  );

  // Re-evaluate a segment-backed group against fresh data. Loads only the
  // collections the segment might need, loads points lazily based on the
  // criteria, then updates the group's member lists.
  const refreshSegment = async (group: MessagingGroup) => {
    if (!group.segment || !group.id) return;
    setRefreshingId(group.id);
    try {
      const needsPoints = group.segment.criteria.some(c =>
        c.field === 'pointsBalance' || c.field === 'pointsLifetime' || c.field === 'tier'
      );
      const [members, subs, orders, doshas, guides] = await Promise.all([
        (await import('../../../firebase/firestore')).getAllMembers(),
        (await import('../../../firebase/firestore')).getNewsletterSubscribers(),
        getClientOrders(),
        getDoshaResults(),
        getGuideResponses(),
      ]);
      let pointsByUid: Record<string, PointsBalance> | undefined;
      if (needsPoints) {
        const uids = members.map(m => m.uid).filter(Boolean);
        const entries = await Promise.all(uids.map(u => getMemberPoints(u).then(b => [u, b] as const)));
        pointsByUid = Object.fromEntries(entries);
      }
      const metrics = buildContactMetrics({
        members, subscribers: subs, orders: orders as ClientOrder[],
        doshaResults: doshas as DoshaResult[], guideResponses: guides as GuideResponse[],
        pointsByUid,
      });
      const matched = evaluateSegment(metrics, group.segment as Segment);
      await updateMessagingGroup(group.id, {
        memberUids: matched.map(c => c.uid).filter((u): u is string => !!u),
        memberEmails: matched.map(c => c.email),
      });
      await refresh();
    } finally {
      setRefreshingId(null);
    }
  };

  if (loading) {
    return <div className="py-16 flex justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#B8532F] text-2xl" /></div>;
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <p className="text-sm text-[#3A251E]/70 dark:text-white/70 leading-relaxed">
          Créez des groupes de clients (ex. cohortes, listes d'attente, alumnae) et envoyez-leur des
          messages internes (visibles dans leur espace client) ou des courriels en lot (via le
          système d'infolettre). Les membres avec un compte reçoivent les messages internes ; tous
          reçoivent les courriels.
        </p>
      </Card>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-serif text-lg text-[#3A251E] dark:text-white">
          Groupes <span className="text-[#3A251E]/40 dark:text-white/40 text-sm">· {groups.length}</span>
        </h3>
        <div className="flex items-center gap-2">
          <GhostButton onClick={() => setSegmenting(true)}>
            <i className="fa-solid fa-filter text-[10px]" /> Segment intelligent
          </GhostButton>
          <PrimaryButton onClick={() => setCreating(true)}>
            <i className="fa-solid fa-plus text-[10px]" /> Nouveau groupe
          </PrimaryButton>
        </div>
      </div>

      {creating && (
        <CreateGroupCard
          onCancel={() => setCreating(false)}
          onCreated={async (id) => { setCreating(false); await refresh(); setSelectedId(id); }}
        />
      )}

      {groups.length === 0 && !creating ? (
        <EmptyState icon="fa-users-rectangle">Aucun groupe. Commencez par en créer un.</EmptyState>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map(g => {
            const isSegment = !!g.segment;
            const isRefreshing = refreshingId === g.id;
            return (
              <Card
                key={g.id}
                className={`p-5 transition-all hover:-translate-y-0.5 hover:shadow-md ${selectedId === g.id ? 'ring-2 ring-[#B8532F]/60' : ''}`}
              >
                <button type="button" onClick={() => setSelectedId(g.id!)} className="text-left w-full">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-serif text-[#3A251E] dark:text-white">{g.name}</h4>
                      {isSegment && (
                        <span className="text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full bg-[#B8532F]/15 text-[#B8532F]">
                          <i className="fa-solid fa-filter text-[9px] mr-1" />Segment
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-[#3A251E]/50 dark:text-white/50 shrink-0">
                      {g.memberEmails?.length || 0} membre{(g.memberEmails?.length || 0) === 1 ? '' : 's'}
                    </span>
                  </div>
                  {g.description && (
                    <p className="text-xs text-[#3A251E]/60 dark:text-white/60 mt-2 leading-relaxed">{g.description}</p>
                  )}
                  <p className="text-[10px] uppercase tracking-widest text-[#3A251E]/40 dark:text-white/40 mt-3">
                    {(g.memberUids?.length || 0)} avec compte · {Math.max(0, (g.memberEmails?.length || 0) - (g.memberUids?.length || 0))} courriel seul
                  </p>
                </button>
                {isSegment && (
                  <div className="mt-3 pt-3 border-t border-[#3A251E]/5 dark:border-white/10">
                    <GhostButton
                      onClick={e => { e.stopPropagation(); refreshSegment(g); }}
                      disabled={isRefreshing}
                    >
                      {isRefreshing ? <i className="fa-solid fa-circle-notch fa-spin" /> : <i className="fa-solid fa-rotate text-[10px]" />}
                      Rafraîchir les membres
                    </GhostButton>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {selected && (
        <GroupDetail
          group={selected}
          contacts={contacts}
          onClose={() => setSelectedId(null)}
          onChanged={refresh}
        />
      )}

      {segmenting && (
        <SegmentBuilder
          onClose={() => setSegmenting(false)}
          onCreated={async id => { setSegmenting(false); await refresh(); setSelectedId(id); }}
        />
      )}
    </div>
  );
};

// ─── Create group card ───────────────────────────────────────────────────────
const CreateGroupCard: React.FC<{ onCancel: () => void; onCreated: (id: string) => void }> = ({ onCancel, onCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const ref = await createMessagingGroup({
        name: name.trim(),
        description: description.trim() || undefined,
        memberUids: [],
        memberEmails: [],
      });
      onCreated(ref.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <Label>Nom du groupe</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex. Alumnae Origine · cohorte 2026" autoFocus />
        </div>
        <div>
          <Label>Description (facultatif)</Label>
          <Textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Contexte interne — à quoi sert ce groupe ?" />
        </div>
        <div className="flex gap-2 pt-1">
          <PrimaryButton type="submit" disabled={busy || !name.trim()}>
            {busy ? <i className="fa-solid fa-circle-notch fa-spin" /> : <i className="fa-solid fa-check text-[10px]" />} Créer
          </PrimaryButton>
          <GhostButton type="button" onClick={onCancel}>Annuler</GhostButton>
        </div>
      </form>
    </Card>
  );
};

// ─── Group detail view ───────────────────────────────────────────────────────
const GroupDetail: React.FC<{
  group: MessagingGroup;
  contacts: Contact[];
  onClose: () => void;
  onChanged: () => Promise<unknown>;
}> = ({ group, contacts, onClose, onChanged }) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || '');

  // Re-pull the latest field values whenever the selected group changes.
  useEffect(() => {
    setName(group.name);
    setDescription(group.description || '');
  }, [group.id]);

  const saveMeta = async () => {
    await updateMessagingGroup(group.id!, {
      name: name.trim() || group.name,
      description: description.trim() || undefined,
    });
    setEditing(false);
    await onChanged();
  };

  const remove = async () => {
    if (!confirm(`Supprimer le groupe "${group.name}" ?`)) return;
    await deleteMessagingGroup(group.id!);
    onClose();
    await onChanged();
  };

  const addContacts = async (toAdd: Contact[]) => {
    const emails = Array.from(new Set([
      ...(group.memberEmails || []),
      ...toAdd.map(c => c.email),
    ]));
    const uids = Array.from(new Set([
      ...(group.memberUids || []),
      ...toAdd.map(c => c.uid).filter((u): u is string => !!u),
    ]));
    await updateMessagingGroup(group.id!, { memberEmails: emails, memberUids: uids });
    setPickerOpen(false);
    await onChanged();
  };

  const removeContact = async (email: string) => {
    const match = contacts.find(c => c.email === email);
    const uidToDrop = match?.uid;
    await updateMessagingGroup(group.id!, {
      memberEmails: (group.memberEmails || []).filter(e => e !== email),
      memberUids: uidToDrop ? (group.memberUids || []).filter(u => u !== uidToDrop) : (group.memberUids || []),
    });
    await onChanged();
  };

  // Reconstruct member rows from the stored emails, pulling profile data
  // from the live contact pool when available.
  const memberRows = (group.memberEmails || []).map(email => {
    const c = contacts.find(c => c.email === email);
    return c || { email, displayEmail: email, isMember: false, name: email };
  });

  return (
    <Card className="p-5 md:p-6 border-[#B8532F]/40">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-2">
              <Input value={name} onChange={e => setName(e.target.value)} />
              <Textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" />
              <div className="flex gap-2">
                <PrimaryButton onClick={saveMeta}>Enregistrer</PrimaryButton>
                <GhostButton onClick={() => setEditing(false)}>Annuler</GhostButton>
              </div>
            </div>
          ) : (
            <>
              <h3 className="font-serif text-xl text-[#3A251E] dark:text-white">{group.name}</h3>
              {group.description && (
                <p className="text-sm text-[#3A251E]/60 dark:text-white/60 mt-1 leading-relaxed">{group.description}</p>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!editing && <GhostButton onClick={() => setEditing(true)}><i className="fa-solid fa-pen" /> Modifier</GhostButton>}
          <DangerButton onClick={remove}><i className="fa-solid fa-trash" /></DangerButton>
          <button onClick={onClose} aria-label="Fermer" className="w-9 h-9 rounded-full flex items-center justify-center text-[#3A251E]/40 dark:text-white/40 hover:text-[#3A251E] dark:hover:text-white">
            <i className="fa-solid fa-times" />
          </button>
        </div>
      </div>

      {/* ── Members ── */}
      <div className="border-t border-[#3A251E]/5 dark:border-white/10 pt-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[11px] uppercase tracking-widest font-bold text-[#3A251E]/60 dark:text-white/60">
            Membres · {memberRows.length}
          </h4>
          <GhostButton onClick={() => setPickerOpen(true)}><i className="fa-solid fa-user-plus" /> Ajouter</GhostButton>
        </div>

        {memberRows.length === 0 ? (
          <p className="text-sm text-[#3A251E]/40 dark:text-white/40 italic py-4 text-center">Aucun membre dans ce groupe.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {memberRows.map(c => (
              <div key={c.email} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-[#F4E7DD] dark:bg-white/5 border border-[#3A251E]/5 dark:border-white/5">
                <div className="min-w-0">
                  <p className="text-sm text-[#3A251E] dark:text-white truncate">{c.name || c.email}</p>
                  <p className="text-[11px] text-[#3A251E]/50 dark:text-white/50 truncate">{c.displayEmail}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full ${c.uid ? 'bg-[#B8532F]/15 text-[#B8532F]' : 'bg-[#3A251E]/5 dark:bg-white/10 text-[#3A251E]/50 dark:text-white/50'}`}>
                    {c.uid ? 'Compte' : 'Courriel'}
                  </span>
                  <button onClick={() => removeContact(c.email)} aria-label="Retirer" className="w-7 h-7 rounded-full text-[#3A251E]/30 dark:text-white/30 hover:text-red-500 transition-colors">
                    <i className="fa-solid fa-xmark text-xs" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Compose ── */}
      {memberRows.length > 0 && (
        <ComposePanel group={group} memberCount={memberRows.length} uidCount={group.memberUids?.length || 0} />
      )}

      {pickerOpen && (
        <ContactPicker
          contacts={contacts}
          excludeEmails={new Set(group.memberEmails || [])}
          onCancel={() => setPickerOpen(false)}
          onConfirm={addContacts}
        />
      )}
    </Card>
  );
};

// ─── Compose panel ──────────────────────────────────────────────────────────
const ComposePanel: React.FC<{ group: MessagingGroup; memberCount: number; uidCount: number }> = ({ group, memberCount, uidCount }) => {
  const [mode, setMode] = useState<'internal' | 'email'>('internal');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const emailCount = memberCount;           // every stored email receives the newsletter
  const internalCount = uidCount;           // only members with a uid receive internal messages

  const sendInternal = async () => {
    if (!body.trim()) return;
    setSending(true); setResult(null);
    let ok = 0, fail = 0;
    for (const uid of group.memberUids || []) {
      try {
        await sendMessage(uid, 'admin', body.trim(), {
          memberEmail: '',
          memberName: '',
          memberPhotoURL: '',
        });
        ok++;
      } catch {
        fail++;
      }
    }
    setSending(false);
    setResult({
      ok: fail === 0,
      message: fail === 0
        ? `Message envoyé à ${ok} membre${ok === 1 ? '' : 's'}.`
        : `${ok} envoyé(s), ${fail} échec(s).`,
    });
    if (fail === 0) setBody('');
  };

  const sendEmail = async () => {
    if (!subject.trim() || !body.trim() || !group.id) return;
    setSending(true); setResult(null);
    try {
      // 1. Ensure every group email is tagged group-<id> on the newsletter list.
      const tagged = await tagSubscribersForGroup(group.id, group.memberEmails || []);

      // 2. Create a newsletter targeting the tag. A single text block keeps
      //    the payload simple; Krystine can refine in the newsletter editor
      //    if she wants rich blocks later.
      const ref = await createNewsletter({
        title: `[Groupe] ${group.name}`,
        subject: subject.trim(),
        fromName: 'Krystine St-Laurent',
        blocks: [{ type: 'paragraph', content: { text: body.trim() } }],
        status: 'draft',
        segmentTag: `group-${group.id}`,
      });

      // 3. Fire the Cloud Function. Mirrors Composer.tsx's call signature.
      if (!app) throw new Error('Firebase non configuré.');
      const fns = getFunctions(app, 'us-central1');
      const call = httpsCallable(fns, 'sendNewsletter');
      const res: any = await call({ newsletterId: ref.id });
      const recipients = res?.data?.recipients ?? 'à confirmer';
      setResult({ ok: true, message: `Courriel envoyé. ${tagged} abonné·e·s tagué·e·s · ${recipients} destinataire(s).` });
      setSubject(''); setBody('');
    } catch (e: any) {
      setResult({ ok: false, message: e?.message || "Échec de l'envoi — vérifiez que sendNewsletter est déployé." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t border-[#3A251E]/5 dark:border-white/10 mt-6 pt-5">
      <h4 className="text-[11px] uppercase tracking-widest font-bold text-[#3A251E]/60 dark:text-white/60 mb-3">
        Envoyer un message
      </h4>

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setMode('internal')}
          className={`px-4 py-2 rounded-full text-[11px] uppercase tracking-widest font-bold border transition-colors ${
            mode === 'internal'
              ? 'bg-[#3A251E] dark:bg-[#B8532F] text-white dark:text-[#3A251E] border-transparent'
              : 'border-[#3A251E]/10 dark:border-white/10 text-[#3A251E]/70 dark:text-white/70 hover:border-[#B8532F] hover:text-[#B8532F]'
          }`}
        >
          <i className="fa-solid fa-comments text-[10px] mr-1" /> Interne · {internalCount}
        </button>
        <button
          type="button"
          onClick={() => setMode('email')}
          className={`px-4 py-2 rounded-full text-[11px] uppercase tracking-widest font-bold border transition-colors ${
            mode === 'email'
              ? 'bg-[#3A251E] dark:bg-[#B8532F] text-white dark:text-[#3A251E] border-transparent'
              : 'border-[#3A251E]/10 dark:border-white/10 text-[#3A251E]/70 dark:text-white/70 hover:border-[#B8532F] hover:text-[#B8532F]'
          }`}
        >
          <i className="fa-solid fa-envelope text-[10px] mr-1" /> Courriel · {emailCount}
        </button>
      </div>

      {mode === 'email' && (
        <div className="mb-3">
          <Label>Sujet du courriel</Label>
          <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Un mot pour vous, cohorte fondatrice…" />
        </div>
      )}

      <Label>{mode === 'internal' ? 'Message à envoyer dans la messagerie interne' : 'Corps du courriel'}</Label>
      <Textarea
        rows={5}
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder={mode === 'internal'
          ? 'Votre message apparaîtra dans leur espace client.'
          : 'Texte simple — le système d\'infolettre envoie le courriel.'}
      />

      <div className="flex items-center justify-between mt-4">
        <p className="text-[11px] text-[#3A251E]/50 dark:text-white/50">
          {mode === 'internal'
            ? `Envoi à ${internalCount} membre${internalCount === 1 ? '' : 's'} ayant un compte (les courriels seuls ne sont pas joignables ici).`
            : `Envoi à ${emailCount} adresse${emailCount === 1 ? '' : 's'} via l'infolettre (segment group-${group.id?.slice(0, 6)}…).`}
        </p>
        <PrimaryButton onClick={mode === 'internal' ? sendInternal : sendEmail} disabled={sending || !body.trim() || (mode === 'email' && !subject.trim())}>
          {sending ? <i className="fa-solid fa-circle-notch fa-spin" /> : <i className="fa-solid fa-paper-plane text-[10px]" />}
          {mode === 'internal' ? 'Envoyer interne' : 'Envoyer le courriel'}
        </PrimaryButton>
      </div>

      {result && (
        <p className={`mt-3 text-xs ${result.ok ? 'text-green-600' : 'text-red-600'}`}>{result.message}</p>
      )}
    </div>
  );
};

// ─── Contact picker modal ────────────────────────────────────────────────────
const ContactPicker: React.FC<{
  contacts: Contact[];
  excludeEmails: Set<string>;
  onCancel: () => void;
  onConfirm: (toAdd: Contact[]) => Promise<void>;
}> = ({ contacts, excludeEmails, onCancel, onConfirm }) => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const available = useMemo(() => contacts.filter(c => !excludeEmails.has(c.email)), [contacts, excludeEmails]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return !q ? available : available.filter(c => `${c.name || ''} ${c.email}`.toLowerCase().includes(q));
  }, [available, search]);

  const toggle = (email: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email); else next.add(email);
      return next;
    });
  };

  const submit = () => {
    const toAdd = available.filter(c => selected.has(c.email));
    onConfirm(toAdd);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#3A251E]/60 backdrop-blur-md" onClick={onCancel}>
      <div className="relative w-full max-w-xl bg-white dark:bg-[#3A251E] rounded-[24px] shadow-2xl border border-[#B8532F]/20 p-6 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg text-[#3A251E] dark:text-white">Ajouter des membres</h3>
          <button onClick={onCancel} aria-label="Fermer" className="w-8 h-8 rounded-full text-[#3A251E]/40 dark:text-white/40 hover:text-[#3A251E] dark:hover:text-white">
            <i className="fa-solid fa-times" />
          </button>
        </div>

        <Input
          placeholder="Rechercher un nom ou une adresse…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
        />

        <div className="mt-3 flex-1 overflow-y-auto space-y-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-[#3A251E]/40 dark:text-white/40 italic py-6 text-center">Aucun contact.</p>
          ) : filtered.map(c => {
            const isSel = selected.has(c.email);
            return (
              <button
                key={c.email}
                type="button"
                onClick={() => toggle(c.email)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg border transition-colors text-left ${
                  isSel
                    ? 'border-[#B8532F] bg-[#B8532F]/10'
                    : 'border-transparent hover:bg-[#F4E7DD] dark:hover:bg-white/5'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm text-[#3A251E] dark:text-white truncate">{c.name || c.email}</p>
                  <p className="text-[11px] text-[#3A251E]/50 dark:text-white/50 truncate">{c.displayEmail}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full ${c.isMember ? 'bg-[#B8532F]/15 text-[#B8532F]' : 'bg-[#3A251E]/5 dark:bg-white/10 text-[#3A251E]/50 dark:text-white/50'}`}>
                    {c.isMember ? 'Compte' : 'Courriel'}
                  </span>
                  <i className={`fa-solid ${isSel ? 'fa-check-circle text-[#B8532F]' : 'fa-circle text-[#3A251E]/20 dark:text-white/20'}`} />
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-[11px] text-[#3A251E]/50 dark:text-white/50">{selected.size} sélectionné·e·s</p>
          <div className="flex gap-2">
            <GhostButton onClick={onCancel}>Annuler</GhostButton>
            <PrimaryButton onClick={submit} disabled={selected.size === 0}>
              <i className="fa-solid fa-check text-[10px]" /> Ajouter {selected.size > 0 ? `(${selected.size})` : ''}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupsSection;
