import React, { useEffect, useState } from 'react';
import { getNewsletterSubscribers, deleteNewsletterSubscriber, type NewsletterSubscriber } from '../../../firebase/firestore';
import { Card, DangerButton, EmptyState, GhostButton, downloadCsv } from '../primitives';

const NewsletterSection: React.FC = () => {
  const [subs, setSubs] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const refresh = () => getNewsletterSubscribers().then(setSubs).finally(() => setLoading(false));
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
    return (s.email?.toLowerCase().includes(f) || s.firstName?.toLowerCase().includes(f) || s.lastName?.toLowerCase().includes(f));
  });

  const exportCsv = () => {
    const rows = subs.map(s => ({
      email: s.email,
      firstName: s.firstName || '',
      lastName: s.lastName || '',
      source: s.source || '',
      subscribedAt: s.subscribedAt?.toDate().toISOString() || '',
    }));
    downloadCsv(`infolettre_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  if (loading) return <div className="py-12 flex justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#D4AF37] text-2xl" /></div>;
  if (subs.length === 0) return <EmptyState icon="fa-envelope">Aucun abonné pour l'instant.</EmptyState>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Rechercher…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2 rounded-full border border-[#0B1A36]/10 dark:border-white/10 bg-white dark:bg-[#0B1A36]/60 text-sm text-[#0B1A36] dark:text-white outline-none focus:border-[#D4AF37]"
        />
        <p className="text-sm text-[#0B1A36]/60 dark:text-white/60">{filtered.length} / {subs.length}</p>
        <GhostButton onClick={exportCsv}><i className="fa-solid fa-file-csv" /> Exporter CSV</GhostButton>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F5F5F0] dark:bg-white/5 text-[10px] uppercase tracking-widest text-[#0B1A36]/60 dark:text-white/60">
            <tr>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Nom</th>
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
    </div>
  );
};

export default NewsletterSection;
