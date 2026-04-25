import React, { useEffect, useMemo, useState } from 'react';
import { getGuideResponses, type GuideResponse } from '../../../firebase/firestore';
import { Card, EmptyState, GhostButton, downloadCsv } from '../primitives';

// Admin index for "Laissez-vous guider" responses. One row per submission:
// who (uid + email + name when authenticated, anonymous otherwise), the
// recommendation the engine produced, and the full set of answers via an
// expandable details element.
const GuideSection: React.FC = () => {
  const [responses, setResponses] = useState<GuideResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [recoFilter, setRecoFilter] = useState<string>('__all__');

  useEffect(() => {
    getGuideResponses(500)
      .then(setResponses)
      .finally(() => setLoading(false));
  }, []);

  // Distinct recommendation buckets actually present in the data — drives
  // the dropdown so new outcomes appear automatically as they arrive.
  const recoOptions = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    for (const r of responses) {
      const id = r.recommendationId || 'unknown';
      const prev = counts.get(id);
      counts.set(id, { label: r.recommendationLabel || id, count: (prev?.count || 0) + 1 });
    }
    return Array.from(counts.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  }, [responses]);

  const filtered = responses.filter(r => {
    if (recoFilter !== '__all__' && r.recommendationId !== recoFilter) return false;
    if (!filter) return true;
    const f = filter.toLowerCase();
    return (
      r.email?.toLowerCase().includes(f)
      || r.firstName?.toLowerCase().includes(f)
      || r.lastName?.toLowerCase().includes(f)
      || r.recommendationLabel?.toLowerCase().includes(f)
      || r.recommendationId?.toLowerCase().includes(f)
    );
  });

  const exportCsv = () => {
    downloadCsv(`parcours_${new Date().toISOString().slice(0, 10)}.csv`, filtered.map(r => ({
      date: r.createdAt?.toDate().toISOString() || '',
      email: r.email || '',
      firstName: r.firstName || '',
      lastName: r.lastName || '',
      uid: r.uid || '',
      recommendation: r.recommendationLabel || r.recommendationId,
      answers: (r.answers || []).map(a => `${a.questionLabel || a.qid}=${a.optionLabel || a.optionId}`).join(' | '),
    })));
  };

  if (loading) return <div className="py-12 flex justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#B8532F] text-2xl" /></div>;
  if (responses.length === 0) return <EmptyState icon="fa-compass">Aucun parcours « Laissez-vous guider » pour l'instant.</EmptyState>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={recoFilter}
          onChange={e => setRecoFilter(e.target.value)}
          className="px-4 py-2 rounded-full border border-[#3A251E]/10 dark:border-white/10 bg-white dark:bg-[#3A251E]/60 text-sm text-[#3A251E] dark:text-white outline-none focus:border-[#B8532F]"
        >
          <option value="__all__">Toutes les recommandations ({responses.length})</option>
          {recoOptions.map(opt => (
            <option key={opt.id} value={opt.id}>{opt.label} ({opt.count})</option>
          ))}
        </select>
        <input
          type="search"
          placeholder="Rechercher (email, nom, recommandation)…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="flex-1 min-w-[220px] px-4 py-2 rounded-full border border-[#3A251E]/10 dark:border-white/10 bg-white dark:bg-[#3A251E]/60 text-sm text-[#3A251E] dark:text-white outline-none focus:border-[#B8532F]"
        />
        <p className="text-sm text-[#3A251E]/60 dark:text-white/60">{filtered.length} / {responses.length}</p>
        <GhostButton onClick={exportCsv}><i className="fa-solid fa-file-csv" /> CSV</GhostButton>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F4E7DD] dark:bg-white/5 text-[10px] uppercase tracking-widest text-[#3A251E]/60 dark:text-white/60">
            <tr>
              <th className="text-left px-4 py-3">Personne</th>
              <th className="text-left px-4 py-3">Recommandation</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Date</th>
              <th className="text-left px-4 py-3">Réponses</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const name = [r.firstName, r.lastName].filter(Boolean).join(' ') || (r.email ? r.email.split('@')[0] : '');
              const isAuthed = !!r.uid;
              return (
                <tr key={r.id} className="border-t border-[#3A251E]/5 dark:border-white/5 align-top">
                  <td className="px-4 py-3">
                    {isAuthed ? (
                      <div className="min-w-0">
                        <p className="text-[#3A251E] dark:text-white truncate flex items-center gap-2">
                          {name || '—'}
                          <span className="text-[9px] uppercase tracking-widest bg-[#B8532F]/10 text-[#B8532F] px-2 py-0.5 rounded-full">Membre</span>
                        </p>
                        {r.email && <p className="text-[11px] text-[#3A251E]/50 dark:text-white/50 truncate">{r.email}</p>}
                      </div>
                    ) : (
                      <span className="text-[#3A251E]/40 dark:text-white/40 italic">Anonyme</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold bg-[#B8532F]/10 text-[#B8532F] px-2.5 py-1 rounded-full">
                      <i className="fa-solid fa-compass text-[9px]" />
                      {r.recommendationLabel || r.recommendationId}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#3A251E]/50 dark:text-white/50 hidden md:table-cell text-xs">
                    {r.createdAt?.toDate().toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: 'short' }) || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {r.answers?.length > 0 ? (
                      <details className="text-xs text-[#3A251E]/70 dark:text-white/70 max-w-md">
                        <summary className="cursor-pointer hover:text-[#B8532F] transition-colors uppercase tracking-widest text-[10px] font-bold">
                          {r.answers.length} réponses
                        </summary>
                        <ul className="mt-2 space-y-1 pl-4 list-disc">
                          {r.answers.map((a, i) => (
                            <li key={i}>
                              <span className="font-bold">{a.questionLabel || a.qid}</span>
                              {' — '}
                              <span className="italic">{a.optionLabel || a.optionId}</span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : (
                      <span className="text-[#3A251E]/30 dark:text-white/30">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default GuideSection;
