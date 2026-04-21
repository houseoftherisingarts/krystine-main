import React, { useEffect, useState } from 'react';
import { getAllMembers, type MemberDoc } from '../../../firebase/firestore';
import { Card, EmptyState, GhostButton, downloadCsv } from '../primitives';

const MembersSection: React.FC = () => {
  const [members, setMembers] = useState<MemberDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => { getAllMembers().then(setMembers).finally(() => setLoading(false)); }, []);

  const filtered = members.filter(m => {
    if (!filter) return true;
    const f = filter.toLowerCase();
    return (m.email?.toLowerCase().includes(f) || m.displayName?.toLowerCase().includes(f));
  });

  const exportCsv = () => {
    downloadCsv(`membres_${new Date().toISOString().slice(0, 10)}.csv`, members.map(m => ({
      email: m.email,
      displayName: m.displayName || '',
      phone: m.phone || '',
      dosha: m.dosha || '',
      provider: m.provider || '',
      joinedAt: m.joinedAt?.toDate().toISOString() || '',
    })));
  };

  if (loading) return <div className="py-12 flex justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#D4AF37] text-2xl" /></div>;
  if (members.length === 0) return <EmptyState icon="fa-users">Aucun membre inscrit.</EmptyState>;

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
        <p className="text-sm text-[#0B1A36]/60 dark:text-white/60">{filtered.length} / {members.length}</p>
        <GhostButton onClick={exportCsv}><i className="fa-solid fa-file-csv" /> CSV</GhostButton>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F5F5F0] dark:bg-white/5 text-[10px] uppercase tracking-widest text-[#0B1A36]/60 dark:text-white/60">
            <tr>
              <th className="text-left px-4 py-3">Membre</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Dosha</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Téléphone</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Auth</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Inscrit</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => (
              <tr key={m.uid} className="border-t border-[#0B1A36]/5 dark:border-white/5 hover:bg-[#D4AF37]/5">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-cover bg-center bg-[#F5F5F0] dark:bg-white/5 border border-[#0B1A36]/5 dark:border-white/10 shrink-0" style={{ backgroundImage: m.photoURL ? `url(${m.photoURL})` : undefined }} />
                    <div className="min-w-0">
                      <p className="text-[#0B1A36] dark:text-white truncate">{m.displayName || m.email.split('@')[0]}</p>
                      <p className="text-[11px] text-[#0B1A36]/50 dark:text-white/50 truncate">{m.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  {m.dosha ? <span className="text-[#D4AF37] font-bold capitalize">{m.dosha}</span> : <span className="text-[#0B1A36]/30 dark:text-white/30">—</span>}
                </td>
                <td className="px-4 py-3 text-[#0B1A36]/70 dark:text-white/70 hidden md:table-cell">{m.phone || '—'}</td>
                <td className="px-4 py-3 text-[#0B1A36]/50 dark:text-white/50 hidden md:table-cell capitalize">{m.provider || '—'}</td>
                <td className="px-4 py-3 text-[#0B1A36]/50 dark:text-white/50 hidden md:table-cell">{m.joinedAt?.toDate().toLocaleDateString('fr-CA') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default MembersSection;
