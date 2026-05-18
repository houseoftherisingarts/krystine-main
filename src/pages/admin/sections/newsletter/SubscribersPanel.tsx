import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  getNewsletterSubscribers, deleteNewsletterSubscriber, bulkAddNewsletterSubscribers,
  type NewsletterSubscriber, type BulkImportResult,
} from '../../../../firebase/firestore';
import { parseCsv, mapCsvToSubscribers } from '../../../../lib/csv';
import { Card, DangerButton, EmptyState, GhostButton, downloadCsv } from '../../primitives';

// Sentinel value for the "All contacts" option — an empty string would collide
// with records that genuinely have no source set, which we surface separately.
const ALL_SOURCES = '__all__';
const NO_SOURCE = '__none__';

// Pretty label for well-known source keys. Unknown sources fall through to the
// raw key so new lists appear in the dropdown automatically.
const sourceLabel = (key: string): string => {
  // Strip the "_google" suffix — we show the origin form, the Google variant
  // is visible via tags if needed.
  const base = key.replace(/_google$/, '');
  const isGoogle = key.endsWith('_google');
  const pretty = (() => {
    switch (base) {
      case 'waitlist-origine':                 return "Liste d'attente · Origine (prochaine cohorte)";
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

const SubscribersPanel: React.FC = () => {
  const [subs, setSubs] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [source, setSource] = useState<string>(ALL_SOURCES);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => { setLoading(true); getNewsletterSubscribers().then(setSubs).finally(() => setLoading(false)); };
  useEffect(() => { refresh(); }, []);

  const del = async (s: NewsletterSubscriber) => {
    if (!s.id) return;
    if (!confirm(`Retirer ${s.email} ?`)) return;
    await deleteNewsletterSubscriber(s.id);
    await refresh();
  };

  // Build the source dropdown from the data — every distinct `source` plus a
  // "Sans source" bucket for records missing one. Auto-expands as new forms
  // start writing to the `newsletter` collection.
  const sourceOptions = useMemo(() => {
    const counts = new Map<string, number>();
    let noSource = 0;
    for (const s of subs) {
      const key = s.source?.trim();
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
      else noSource++;
    }
    const entries = Array.from(counts.entries())
      .sort((a, b) => sourceLabel(a[0]).localeCompare(sourceLabel(b[0]), 'fr'));
    return { entries, noSource };
  }, [subs]);

  const filtered = subs.filter(s => {
    if (source !== ALL_SOURCES) {
      const k = s.source?.trim() || '';
      if (source === NO_SOURCE ? !!k : k !== source) return false;
    }
    if (!filter) return true;
    const f = filter.toLowerCase();
    return (
      s.email?.toLowerCase().includes(f)
      || s.firstName?.toLowerCase().includes(f)
      || s.lastName?.toLowerCase().includes(f)
      || (s.tags || []).some(t => t.toLowerCase().includes(f))
    );
  });

  const exportCsv = () => {
    // Export the currently-filtered view so Krystine can pull per-list CSVs
    // (e.g. only the Pitta waitlist) just by picking the source dropdown.
    const rows = filtered.map(s => ({
      email: s.email,
      firstName: s.firstName || '',
      lastName: s.lastName || '',
      tags: (s.tags || []).join('|'),
      status: s.status || 'active',
      source: s.source || '',
      subscribedAt: s.subscribedAt?.toDate().toISOString() || '',
    }));
    const slug = source === ALL_SOURCES ? 'tous' : source === NO_SOURCE ? 'sans-source' : source;
    downloadCsv(`infolettre_${slug}_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
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
      const result = await bulkAddNewsletterSubscribers(rows);
      setImportResult(result);
      await refresh();
    } catch (err: any) {
      setImportError(err?.message || 'Importation échouée.');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={source}
          onChange={e => setSource(e.target.value)}
          title="Filtrer par source / formulaire"
          className="px-4 py-2 rounded-full border border-[#3A251E]/10 dark:border-white/10 bg-white dark:bg-[#3A251E]/60 text-sm text-[#3A251E] dark:text-white outline-none focus:border-[#B8532F]"
        >
          <option value={ALL_SOURCES}>Tous les contacts ({subs.length})</option>
          {sourceOptions.entries.map(([key, count]) => (
            <option key={key} value={key}>{sourceLabel(key)} ({count})</option>
          ))}
          {sourceOptions.noSource > 0 && (
            <option value={NO_SOURCE}>Sans source ({sourceOptions.noSource})</option>
          )}
        </select>
        <input
          type="search"
          placeholder="Rechercher (email, nom, étiquette)…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="flex-1 min-w-[220px] px-4 py-2 rounded-full border border-[#3A251E]/10 dark:border-white/10 bg-white dark:bg-[#3A251E]/60 text-sm text-[#3A251E] dark:text-white outline-none focus:border-[#B8532F]"
        />
        <p className="text-sm text-[#3A251E]/60 dark:text-white/60">{filtered.length} / {subs.length}</p>
        <label className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-bold uppercase tracking-widest text-[11px] bg-[#B8532F] text-[#3A251E] cursor-pointer hover:bg-[#3A251E] hover:text-[#B8532F] transition-colors">
          <i className="fa-solid fa-file-import" /> {importing ? 'Importation…' : 'Importer CSV'}
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} disabled={importing} />
        </label>
        <GhostButton onClick={exportCsv}><i className="fa-solid fa-file-csv" /> Exporter CSV</GhostButton>
      </div>

      {/* Import feedback */}
      {importError && (
        <div className="px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm">{importError}</div>
      )}
      {importResult && (
        <div className="px-4 py-3 rounded-xl bg-green-50 text-green-700 text-sm">
          Importation terminée : <strong>{importResult.inserted}</strong> ajoutés,
          &nbsp;<strong>{importResult.skippedDuplicates}</strong> doublons ignorés,
          &nbsp;<strong>{importResult.invalid}</strong> lignes invalides.
        </div>
      )}
      <p className="text-[11px] text-[#3A251E]/50 dark:text-white/50">
        Format CSV attendu — colonnes reconnues : <code className="bg-[#B8532F]/10 px-1 rounded">email</code>, <code className="bg-[#B8532F]/10 px-1 rounded">firstName</code>,
        <code className="bg-[#B8532F]/10 px-1 rounded">lastName</code>, <code className="bg-[#B8532F]/10 px-1 rounded">tags</code> (séparées par <code>|</code> ou <code>,</code>). Les synonymes français (<em>courriel</em>, <em>prénom</em>, <em>nom</em>) sont acceptés.
      </p>

      {/* List */}
      {loading ? (
        <div className="py-12 flex justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#B8532F] text-2xl" /></div>
      ) : subs.length === 0 ? (
        <EmptyState icon="fa-envelope">Aucun abonné pour l'instant. Importez votre liste pour commencer.</EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F4E7DD] dark:bg-white/5 text-[10px] uppercase tracking-widest text-[#3A251E]/60 dark:text-white/60">
              <tr>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Nom</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Étiquettes</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Statut</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Source</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="border-t border-[#3A251E]/5 dark:border-white/5 hover:bg-[#B8532F]/5">
                  <td className="px-4 py-3 text-[#3A251E] dark:text-white">{s.email}</td>
                  <td className="px-4 py-3 text-[#3A251E]/70 dark:text-white/70 hidden md:table-cell">{[s.firstName, s.lastName].filter(Boolean).join(' ') || '—'}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {(s.tags && s.tags.length > 0) ? (
                      <div className="flex flex-wrap gap-1">
                        {s.tags.slice(0, 3).map(t => (
                          <span key={t} className="text-[10px] uppercase tracking-widest bg-[#B8532F]/10 text-[#B8532F] px-2 py-0.5 rounded-full">{t}</span>
                        ))}
                      </div>
                    ) : <span className="text-[#3A251E]/40 dark:text-white/40">—</span>}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full ${
                      s.status === 'unsubscribed' ? 'bg-red-50 text-red-500' :
                      s.status === 'bounced'      ? 'bg-orange-50 text-orange-500' :
                      s.status === 'pending'      ? 'bg-yellow-50 text-yellow-600' :
                      'bg-green-50 text-green-600'
                    }`}>{s.status || 'active'}</span>
                  </td>
                  <td className="px-4 py-3 text-[#3A251E]/50 dark:text-white/50 hidden md:table-cell">{s.source || '—'}</td>
                  <td className="px-4 py-3 text-[#3A251E]/50 dark:text-white/50 hidden md:table-cell">{s.subscribedAt?.toDate().toLocaleDateString('fr-CA') || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <DangerButton onClick={() => del(s)}><i className="fa-solid fa-trash" /></DangerButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

export default SubscribersPanel;
