import React, { useEffect, useState } from 'react';
import { getDoshaResults, deleteDoshaResult, type DoshaResult } from '../../../firebase/firestore';
import { Card, DangerButton, EmptyState, GhostButton, downloadCsv } from '../primitives';

const DoshaSection: React.FC = () => {
  const [rows, setRows] = useState<DoshaResult[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => getDoshaResults().then(setRows).finally(() => setLoading(false));
  useEffect(() => { refresh(); }, []);

  const del = async (r: DoshaResult) => {
    if (!r.id) return;
    if (!confirm(`Supprimer le résultat de ${r.email} ?`)) return;
    await deleteDoshaResult(r.id);
    await refresh();
  };

  const exportCsv = () => {
    downloadCsv(`quiz_dosha_${new Date().toISOString().slice(0, 10)}.csv`, rows.map(r => ({
      firstName: r.firstName, lastName: r.lastName, email: r.email,
      dominant: r.dominant, vata: r.vata, pitta: r.pitta, kapha: r.kapha,
      createdAt: r.createdAt?.toDate().toISOString() || '',
    })));
  };

  if (loading) return <div className="py-12 flex justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#B8532F] text-2xl" /></div>;
  if (rows.length === 0) return <EmptyState icon="fa-circle-nodes">Aucun résultat de quiz pour l'instant.</EmptyState>;

  const totals = { vata: 0, pitta: 0, kapha: 0 };
  rows.forEach(r => { const k = r.dominant?.toLowerCase(); if (k === 'vata' || k === 'pitta' || k === 'kapha') totals[k]++; });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {(['vata', 'pitta', 'kapha'] as const).map(k => (
          <Card key={k} className="p-4 text-center">
            <p className="text-[10px] uppercase tracking-widest font-bold text-[#B8532F]">{k}</p>
            <p className="text-2xl font-serif text-[#3A251E] dark:text-white mt-1">{totals[k]}</p>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-[#3A251E]/60 dark:text-white/60">{rows.length} résultat{rows.length > 1 ? 's' : ''}</p>
        <GhostButton onClick={exportCsv}><i className="fa-solid fa-file-csv" /> Exporter CSV</GhostButton>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F4E7DD] dark:bg-white/5 text-[10px] uppercase tracking-widest text-[#3A251E]/60 dark:text-white/60">
            <tr>
              <th className="text-left px-4 py-3">Nom</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Email</th>
              <th className="text-left px-4 py-3">Dominant</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Scores</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Date</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t border-[#3A251E]/5 dark:border-white/5 hover:bg-[#B8532F]/5">
                <td className="px-4 py-3 text-[#3A251E] dark:text-white">{r.firstName} {r.lastName}</td>
                <td className="px-4 py-3 text-[#3A251E]/70 dark:text-white/70 hidden md:table-cell">{r.email}</td>
                <td className="px-4 py-3">
                  <span className="capitalize text-[#B8532F] font-bold">{r.dominant}</span>
                </td>
                <td className="px-4 py-3 text-[#3A251E]/50 dark:text-white/50 hidden md:table-cell font-mono text-xs">
                  V{r.vata} · P{r.pitta} · K{r.kapha}
                </td>
                <td className="px-4 py-3 text-[#3A251E]/50 dark:text-white/50 hidden md:table-cell">{r.createdAt?.toDate().toLocaleDateString('fr-CA') || '—'}</td>
                <td className="px-4 py-3 text-right">
                  <DangerButton onClick={() => del(r)}><i className="fa-solid fa-trash" /></DangerButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default DoshaSection;
