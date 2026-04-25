import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  getAllMembers, getNewsletterSubscribers, bulkAddNewsletterSubscribers,
  type MemberDoc, type NewsletterSubscriber, type BulkImportResult,
} from '../../../firebase/firestore';
import { parseCsv, mapCsvToSubscribers } from '../../../lib/csv';
import { Card, EmptyState, GhostButton, downloadCsv } from '../primitives';
import AdminClientView from '../AdminClientView';

// Unified CRM row — one per distinct email, merging a member profile with
// every newsletter subscription for the same address. A contact may be member-only,
// newsletter-only, or both. All downstream filters/columns work off this shape.
interface ContactRow {
  email: string;          // lowercased canonical key
  displayEmail: string;   // original casing (for display)
  uid?: string;           // populated only when this contact has a members/ doc
  displayName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  dosha?: string;
  provider?: string;      // 'google' | 'email' — from members collection
  isMember: boolean;
  sources: string[];      // distinct newsletter `source` values for this contact
  tags: string[];         // union of newsletter tags
  joinedAt?: Date;        // earliest known first-seen (joinedAt or subscribedAt)
  photoURL?: string;
}

// Sentinel values for the view dropdown that can't clash with real source keys.
const ALL_CONTACTS = '__all__';
const MEMBERS_ONLY = '__members__';
const NO_SOURCE = '__none__';

// Pretty labels for known source keys. Unknown keys fall through to the raw
// value so new lists appear in the dropdown automatically.
const sourceLabel = (key: string): string => {
  const base = key.replace(/_google$/, '');
  const isGoogle = key.endsWith('_google');
  const pretty = (() => {
    switch (base) {
      case 'waitlist-pitta':                   return "Liste d'attente · Pitta";
      case 'waitlist-kapha':                   return "Liste d'attente · Kapha";
      case 'waitlist-vata':                    return "Liste d'attente · Vata";
      case 'waitlist-retraite-ayurveda-mai-2026': return "Retraite Ayurveda · mai 2026";
      case 'waitlist-lancement-anglicane':     return "Lancement · L'Anglicane (oct. 2026)";
      case 'waitlist-lancement-montreal':      return 'Lancement · Montréal (nov. 2026)';
      case 'waitlist-retraite-nov-2026':       return 'Retraite · novembre 2026';
      case 'waitlist-retraite-val-morin-nov-2026': return 'Retraite Val-Morin · novembre 2026';
      case 'waitlist-retraite-fev-2027':       return 'Retraite · février 2027';
      case 'waitlist-retraite-mai-2027':       return 'Retraite · mai 2027';
      case 'accueil-pulsation': return 'Accueil — La Pulsation';
      case 'krystine':          return 'Page Krystine';
      case 'podcast':           return 'Page Podcast';
      case 'quiz':              return 'Quiz Dosha';
      case 'conferenciere':     return 'Demande de conférence';
      case 'conference-tour':   return 'Tournée de conférences';
      case 'guide':             return 'Laissez-vous guider';
      case 'csv-import':        return 'Import CSV';
      case 'import':            return 'Import manuel';
      case 'kajabi':            return 'Import Kajabi';
      case 'origine':           return 'Expérience Origine';
      case 'main':              return 'Infolettre principale';
      default:                  return base;
    }
  })();
  return isGoogle ? `${pretty} · Google` : pretty;
};

function mergeContacts(members: MemberDoc[], subs: NewsletterSubscriber[]): ContactRow[] {
  const map = new Map<string, ContactRow>();

  for (const m of members) {
    if (!m.email) continue;
    const key = m.email.toLowerCase();
    map.set(key, {
      email: key,
      displayEmail: m.email,
      uid: m.uid,
      displayName: m.displayName,
      phone: m.phone,
      dosha: m.dosha,
      provider: m.provider,
      isMember: true,
      sources: [],
      tags: [],
      joinedAt: m.joinedAt?.toDate(),
      photoURL: m.photoURL,
    });
  }

  for (const s of subs) {
    if (!s.email) continue;
    const key = s.email.toLowerCase();
    const src = s.source?.trim();
    const subDate = s.subscribedAt?.toDate();
    const existing = map.get(key);
    if (existing) {
      if (src && !existing.sources.includes(src)) existing.sources.push(src);
      for (const t of s.tags || []) if (!existing.tags.includes(t)) existing.tags.push(t);
      if (!existing.firstName && s.firstName) existing.firstName = s.firstName;
      if (!existing.lastName && s.lastName) existing.lastName = s.lastName;
      // Keep the *earliest* first-seen across both collections.
      if (subDate && (!existing.joinedAt || subDate < existing.joinedAt)) existing.joinedAt = subDate;
    } else {
      map.set(key, {
        email: key,
        displayEmail: s.email,
        firstName: s.firstName,
        lastName: s.lastName,
        isMember: false,
        sources: src ? [src] : [],
        tags: [...(s.tags || [])],
        joinedAt: subDate,
      });
    }
  }

  // Most-recent contact first.
  return Array.from(map.values()).sort((a, b) => {
    const ta = a.joinedAt?.getTime() ?? 0;
    const tb = b.joinedAt?.getTime() ?? 0;
    return tb - ta;
  });
}

const MembersSection: React.FC = () => {
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [view, setView] = useState<string>(ALL_CONTACTS);
  // When set, opens the read-only client-view overlay for that member uid.
  const [viewingUid, setViewingUid] = useState<string | null>(null);
  // CSV import — flagged as `source: 'import'` so the bucket is filterable
  // in the view dropdown above the table (and pretty-labeled "Import manuel").
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const [m, s] = await Promise.all([getAllMembers(), getNewsletterSubscribers()]);
      setContacts(mergeContacts(m, s));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportResult(null);
    setImporting(true);
    try {
      const text = await file.text();
      const raw = parseCsv(text);
      const rows = mapCsvToSubscribers(raw);
      if (!rows.length) {
        setImportError('Aucune adresse courriel valide détectée. Le fichier doit contenir une colonne « email » (ou « courriel »).');
        return;
      }
      // Force `source: 'import'` so every row is grouped under the same
      // CRM bucket regardless of what columns the CSV had.
      const result = await bulkAddNewsletterSubscribers(
        rows.map(r => ({ ...r, source: 'import', tags: [...(r.tags || []), 'import'] })),
      );
      setImportResult(result);
      await refresh();
    } catch (err: any) {
      setImportError(err?.message || 'Importation échouée.');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  // Build the view dropdown from the data — "all", "members only", every
  // distinct newsletter source with counts, then "no source" for stragglers.
  const viewOptions = useMemo(() => {
    const counts = new Map<string, number>();
    let memberCount = 0;
    let noSource = 0;
    for (const c of contacts) {
      if (c.isMember) memberCount++;
      if (c.sources.length === 0 && !c.isMember) noSource++;
      for (const s of c.sources) counts.set(s, (counts.get(s) || 0) + 1);
    }
    const sources = Array.from(counts.entries())
      .sort((a, b) => sourceLabel(a[0]).localeCompare(sourceLabel(b[0]), 'fr'));
    return { memberCount, noSource, sources };
  }, [contacts]);

  const filtered = contacts.filter(c => {
    if (view !== ALL_CONTACTS) {
      if (view === MEMBERS_ONLY) {
        if (!c.isMember) return false;
      } else if (view === NO_SOURCE) {
        if (c.isMember || c.sources.length > 0) return false;
      } else {
        if (!c.sources.includes(view)) return false;
      }
    }
    if (!filter) return true;
    const f = filter.toLowerCase();
    return (
      c.email.includes(f)
      || c.displayName?.toLowerCase().includes(f)
      || c.firstName?.toLowerCase().includes(f)
      || c.lastName?.toLowerCase().includes(f)
      || c.phone?.includes(f)
      || c.sources.some(s => s.toLowerCase().includes(f))
      || c.tags.some(t => t.toLowerCase().includes(f))
    );
  });

  const exportCsv = () => {
    const slug = view === ALL_CONTACTS ? 'tous'
      : view === MEMBERS_ONLY ? 'membres'
      : view === NO_SOURCE ? 'sans-source'
      : view;
    downloadCsv(`clients_${slug}_${new Date().toISOString().slice(0, 10)}.csv`, filtered.map(c => ({
      email: c.displayEmail,
      displayName: c.displayName || [c.firstName, c.lastName].filter(Boolean).join(' '),
      phone: c.phone || '',
      dosha: c.dosha || '',
      provider: c.provider || '',
      isMember: c.isMember ? 'yes' : 'no',
      sources: c.sources.join('|'),
      tags: c.tags.join('|'),
      firstSeenAt: c.joinedAt?.toISOString() || '',
    })));
  };

  if (loading) return <div className="py-12 flex justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#B8532F] text-2xl" /></div>;
  if (contacts.length === 0) return <EmptyState icon="fa-users">Aucun contact pour l'instant.</EmptyState>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={view}
          onChange={e => setView(e.target.value)}
          title="Filtrer par vue / source"
          className="px-4 py-2 rounded-full border border-[#3A251E]/10 dark:border-white/10 bg-white dark:bg-[#3A251E]/60 text-sm text-[#3A251E] dark:text-white outline-none focus:border-[#B8532F]"
        >
          <option value={ALL_CONTACTS}>Tous les contacts ({contacts.length})</option>
          <option value={MEMBERS_ONLY}>Membres inscrits ({viewOptions.memberCount})</option>
          {viewOptions.sources.map(([key, count]) => (
            <option key={key} value={key}>{sourceLabel(key)} ({count})</option>
          ))}
          {viewOptions.noSource > 0 && (
            <option value={NO_SOURCE}>Sans source ({viewOptions.noSource})</option>
          )}
        </select>
        <input
          type="search"
          placeholder="Rechercher (email, nom, téléphone, étiquette)…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="flex-1 min-w-[220px] px-4 py-2 rounded-full border border-[#3A251E]/10 dark:border-white/10 bg-white dark:bg-[#3A251E]/60 text-sm text-[#3A251E] dark:text-white outline-none focus:border-[#B8532F]"
        />
        <p className="text-sm text-[#3A251E]/60 dark:text-white/60">{filtered.length} / {contacts.length}</p>
        <label
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-bold uppercase tracking-widest text-[11px] bg-[#B8532F] text-[#3A251E] cursor-pointer hover:bg-[#3A251E] hover:text-[#B8532F] transition-colors"
          title="Importer un CSV de contacts (étiqueté « Import manuel »)"
        >
          <i className="fa-solid fa-file-import" />
          {importing ? 'Importation…' : 'Importer CSV'}
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleImportCsv}
            disabled={importing}
          />
        </label>
        <GhostButton onClick={exportCsv}><i className="fa-solid fa-file-csv" /> Exporter CSV</GhostButton>
      </div>
      {importError && (
        <div className="px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm">{importError}</div>
      )}
      {importResult && (
        <div className="px-4 py-3 rounded-xl bg-green-50 text-green-700 text-sm">
          Importation terminée : <strong>{importResult.inserted}</strong> ajoutés,
          &nbsp;<strong>{importResult.skippedDuplicates}</strong> doublons ignorés,
          &nbsp;<strong>{importResult.invalid}</strong> lignes invalides.
          Les nouveaux contacts apparaissent sous « Import manuel » dans le filtre vue ci-dessus.
        </div>
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F4E7DD] dark:bg-white/5 text-[10px] uppercase tracking-widest text-[#3A251E]/60 dark:text-white/60">
            <tr>
              <th className="text-left px-4 py-3">Contact</th>
              <th className="text-left px-4 py-3 hidden lg:table-cell">Source · Vue</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Dosha</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Téléphone</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Auth</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Premier contact</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => {
              const name = c.displayName || [c.firstName, c.lastName].filter(Boolean).join(' ') || c.displayEmail.split('@')[0];
              // Only member-backed rows can drill into the portal preview —
              // newsletter-only contacts have no members/<uid> doc.
              const canOpen = c.isMember && !!c.uid;
              return (
                <tr
                  key={c.email}
                  onClick={() => { if (canOpen) setViewingUid(c.uid!); }}
                  className={`border-t border-[#3A251E]/5 dark:border-white/5 ${canOpen ? 'hover:bg-[#B8532F]/5 cursor-pointer' : 'hover:bg-[#3A251E]/[0.02] dark:hover:bg-white/[0.02]'}`}
                  title={canOpen ? "Ouvrir l'espace client" : undefined}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-cover bg-center bg-[#F4E7DD] dark:bg-white/5 border border-[#3A251E]/5 dark:border-white/10 shrink-0 flex items-center justify-center text-[10px] text-[#3A251E]/40 dark:text-white/40" style={{ backgroundImage: c.photoURL ? `url(${c.photoURL})` : undefined }}>
                        {!c.photoURL && <i className={`fa-solid ${c.isMember ? 'fa-user' : 'fa-envelope'}`} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[#3A251E] dark:text-white truncate flex items-center gap-2">
                          {name}
                          {c.isMember && <span className="text-[9px] uppercase tracking-widest bg-[#B8532F]/10 text-[#B8532F] px-2 py-0.5 rounded-full">Membre</span>}
                          {canOpen && <i className="fa-solid fa-arrow-right text-[#B8532F]/40 text-[10px]" />}
                        </p>
                        <p className="text-[11px] text-[#3A251E]/50 dark:text-white/50 truncate">{c.displayEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {c.sources.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {c.sources.slice(0, 3).map(s => (
                          <span key={s} className="text-[10px] uppercase tracking-widest bg-[#B8532F]/10 text-[#B8532F] px-2 py-0.5 rounded-full">{sourceLabel(s)}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[#3A251E]/30 dark:text-white/30">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {c.dosha ? <span className="text-[#B8532F] font-bold capitalize">{c.dosha}</span> : <span className="text-[#3A251E]/30 dark:text-white/30">—</span>}
                  </td>
                  <td className="px-4 py-3 text-[#3A251E]/70 dark:text-white/70 hidden md:table-cell">{c.phone || '—'}</td>
                  <td className="px-4 py-3 text-[#3A251E]/50 dark:text-white/50 hidden md:table-cell capitalize">{c.provider || (c.isMember ? '—' : 'infolettre')}</td>
                  <td className="px-4 py-3 text-[#3A251E]/50 dark:text-white/50 hidden md:table-cell">{c.joinedAt?.toLocaleDateString('fr-CA') || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {viewingUid && (
        <AdminClientView uid={viewingUid} onClose={() => setViewingUid(null)} />
      )}
    </div>
  );
};

export default MembersSection;
