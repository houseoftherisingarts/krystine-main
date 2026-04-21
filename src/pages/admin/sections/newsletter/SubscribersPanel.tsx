import React, { useEffect, useRef, useState } from 'react';
import {
  getNewsletterSubscribers, deleteNewsletterSubscriber, bulkAddNewsletterSubscribers,
  type NewsletterSubscriber, type BulkImportResult,
} from '../../../../firebase/firestore';
import { parseCsv, mapCsvToSubscribers } from '../../../../lib/csv';
import { Card, DangerButton, EmptyState, GhostButton, downloadCsv } from '../../primitives';

const SubscribersPanel: React.FC = () => {
  const [subs, setSubs] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
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

  const filtered = subs.filter(s => {
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
    const rows = subs.map(s => ({
      email: s.email,
      firstName: s.firstName || '',
      lastName: s.lastName || '',
      tags: (s.tags || []).join('|'),
      status: s.status || 'active',
      source: s.source || '',
      subscribedAt: s.subscribedAt?.toDate().toISOString() || '',
    }));
    downloadCsv(`infolettre_${new Date().toISOString().slice(0, 10)}.csv`, rows);
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
        <input
          type="search"
          placeholder="Rechercher (email, nom, étiquette)…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="flex-1 min-w-[220px] px-4 py-2 rounded-full border border-[#0B1A36]/10 dark:border-white/10 bg-white dark:bg-[#0B1A36]/60 text-sm text-[#0B1A36] dark:text-white outline-none focus:border-[#D4AF37]"
        />
        <p className="text-sm text-[#0B1A36]/60 dark:text-white/60">{filtered.length} / {subs.length}</p>
        <label className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-bold uppercase tracking-widest text-[11px] bg-[#D4AF37] text-[#0B1A36] cursor-pointer hover:bg-[#0B1A36] hover:text-[#D4AF37] transition-colors">
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
      <p className="text-[11px] text-[#0B1A36]/50 dark:text-white/50">
        Format CSV attendu — colonnes reconnues : <code className="bg-[#D4AF37]/10 px-1 rounded">email</code>, <code className="bg-[#D4AF37]/10 px-1 rounded">firstName</code>,
        <code className="bg-[#D4AF37]/10 px-1 rounded">lastName</code>, <code className="bg-[#D4AF37]/10 px-1 rounded">tags</code> (séparées par <code>|</code> ou <code>,</code>). Les synonymes français (<em>courriel</em>, <em>prénom</em>, <em>nom</em>) sont acceptés.
      </p>

      {/* List */}
      {loading ? (
        <div className="py-12 flex justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#D4AF37] text-2xl" /></div>
      ) : subs.length === 0 ? (
        <EmptyState icon="fa-envelope">Aucun abonné pour l'instant. Importez votre liste pour commencer.</EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F5F0] dark:bg-white/5 text-[10px] uppercase tracking-widest text-[#0B1A36]/60 dark:text-white/60">
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
                <tr key={s.id} className="border-t border-[#0B1A36]/5 dark:border-white/5 hover:bg-[#D4AF37]/5">
                  <td className="px-4 py-3 text-[#0B1A36] dark:text-white">{s.email}</td>
                  <td className="px-4 py-3 text-[#0B1A36]/70 dark:text-white/70 hidden md:table-cell">{[s.firstName, s.lastName].filter(Boolean).join(' ') || '—'}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {(s.tags && s.tags.length > 0) ? (
                      <div className="flex flex-wrap gap-1">
                        {s.tags.slice(0, 3).map(t => (
                          <span key={t} className="text-[10px] uppercase tracking-widest bg-[#D4AF37]/10 text-[#D4AF37] px-2 py-0.5 rounded-full">{t}</span>
                        ))}
                      </div>
                    ) : <span className="text-[#0B1A36]/40 dark:text-white/40">—</span>}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full ${
                      s.status === 'unsubscribed' ? 'bg-red-50 text-red-500' :
                      s.status === 'bounced'      ? 'bg-orange-50 text-orange-500' :
                      s.status === 'pending'      ? 'bg-yellow-50 text-yellow-600' :
                      'bg-green-50 text-green-600'
                    }`}>{s.status || 'active'}</span>
                  </td>
                  <td className="px-4 py-3 text-[#0B1A36]/50 dark:text-white/50 hidden md:table-cell">{s.source || '—'}</td>
                  <td className="px-4 py-3 text-[#0B1A36]/50 dark:text-white/50 hidden md:table-cell">{s.subscribedAt?.toDate().toLocaleDateString('fr-CA') || '—'}</td>
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
