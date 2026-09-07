import React, { useEffect, useMemo, useState } from 'react';
import { getReponsesSondage, type Question, type ReponseSondage, type Sondage, type ValeurReponse } from '../../../../firebase/sondages';
import { Card, EmptyState, GhostButton, downloadCsv } from '../../primitives';

// Le détail d'un sondage : pour chaque question à choix, des barres avec
// pourcentage et compte; pour le texte libre, la liste des réponses; en bas,
// le tableau des réponses individuelles et l'export CSV.

const optionsDe = (q: Question): string[] => {
  if (q.type === 'echelle') {
    const min = q.min ?? 1, max = q.max ?? 5;
    return Array.from({ length: max - min + 1 }, (_, i) => String(min + i));
  }
  return q.options || [];
};

const formatValeur = (v: ValeurReponse | undefined): string => {
  if (v === undefined) return '';
  return Array.isArray(v) ? v.join(' · ') : String(v);
};

// `at` est un Timestamp Firestore en temps normal (serverTimestamp() côté
// repondreSondage); une donnée abîmée ou un doc écrit à la main ne doit
// jamais faire planter toute la page admin pour autant.
const dateLisible = (at: unknown, opts: Intl.DateTimeFormatOptions): string => {
  const d = (at as { toDate?: () => Date } | undefined)?.toDate?.();
  return d ? d.toLocaleString('fr-CA', opts) : '—';
};

const SondageReponses: React.FC<{ sondage: Sondage; onRetour: () => void }> = ({ sondage, onRetour }) => {
  const [reponses, setReponses] = useState<ReponseSondage[]>([]);
  const [loading, setLoading] = useState(true);
  const [ouverte, setOuverte] = useState<string | null>(null);

  useEffect(() => {
    getReponsesSondage(sondage.id).then(setReponses).finally(() => setLoading(false));
  }, [sondage.id]);

  const total = reponses.length;
  const statsParQuestion = useMemo(() => {
    const map = new Map<string, { option: string; count: number; pct: number }[]>();
    for (const q of sondage.questions || []) {
      if (q.type === 'texte') continue;
      const compte = new Map<string, number>();
      for (const o of optionsDe(q)) compte.set(o, 0);
      for (const r of reponses) {
        const v = r.reponses?.[q.id];
        if (v === undefined) continue;
        const vs = Array.isArray(v) ? v.map(String) : [String(v)];
        for (const x of vs) if (compte.has(x)) compte.set(x, (compte.get(x) || 0) + 1);
      }
      map.set(q.id, Array.from(compte.entries()).map(([option, count]) => ({ option, count, pct: total ? Math.round((count / total) * 100) : 0 })));
    }
    return map;
  }, [reponses, sondage.questions, total]);

  const exportCsv = () => {
    downloadCsv(`sondage-${sondage.id}.csv`, reponses.map((r) => {
      const row: Record<string, string> = {
        email: r.email || '',
        date: (r.at as { toDate?: () => Date } | undefined)?.toDate?.().toISOString() || '',
      };
      for (const q of sondage.questions || []) row[q.texte] = formatValeur(r.reponses?.[q.id]);
      return row;
    }));
  };

  if (loading) return <div className="py-12 flex justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#8B4A2F] text-2xl" /></div>;

  return (
    <div className="space-y-5">
      <button type="button" onClick={onRetour} className="text-[11px] font-bold uppercase tracking-widest text-[#8B4A2F] hover:underline dark:text-[#d9a05b]">
        <i className="fa-solid fa-arrow-left mr-2" /> Tous les sondages
      </button>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl text-[#293027] dark:text-white">{sondage.titre}</h2>
          <p className="text-sm text-[#293027]/60 dark:text-white/60">{total} réponse{total > 1 ? 's' : ''}</p>
        </div>
        {total > 0 && <GhostButton onClick={exportCsv}><i className="fa-solid fa-file-csv" /> Exporter CSV</GhostButton>}
      </div>

      {total === 0 ? (
        <EmptyState icon="fa-clipboard-question">Aucune réponse reçue pour l'instant.</EmptyState>
      ) : (
        <>
          <div className="space-y-4">
            {(sondage.questions || []).map((q) => (
              <Card key={q.id} className="p-5">
                <p className="text-sm font-bold text-[#293027] dark:text-white">{q.texte}</p>
                {q.type === 'texte' ? (
                  <ul className="mt-3 space-y-3">
                    {reponses.filter((r) => r.reponses?.[q.id]).length === 0 && (
                      <li className="text-xs text-[#293027]/45 dark:text-white/45">Aucune réponse écrite pour cette question.</li>
                    )}
                    {reponses.filter((r) => r.reponses?.[q.id]).map((r, i) => (
                      <li key={i} className="rounded-xl bg-[#EEE7DB] dark:bg-white/5 px-4 py-3">
                        <p className="text-sm text-[#293027] dark:text-white whitespace-pre-line">{formatValeur(r.reponses?.[q.id])}</p>
                        <p className="mt-1.5 text-[10px] uppercase tracking-widest text-[#293027]/45 dark:text-white/45">
                          {r.email || 'anonyme'} · {r.at ? (r.at as any).toDate().toLocaleDateString('fr-CA') : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-3 space-y-2">
                    {(statsParQuestion.get(q.id) || []).map((s) => (
                      <div key={s.option}>
                        <div className="flex items-center justify-between text-xs text-[#293027]/70 dark:text-white/70">
                          <span>{s.option}</span>
                          <span className="font-mono">{s.pct}% · {s.count}</span>
                        </div>
                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#293027]/8 dark:bg-white/10">
                          <div className="h-full rounded-full bg-[#BA7B39]" style={{ width: `${s.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>

          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#EEE7DB] dark:bg-white/5 text-[10px] uppercase tracking-widest text-[#293027]/60 dark:text-white/60">
                <tr>
                  <th className="text-left px-4 py-3">Courriel</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Date</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {reponses.map((r, i) => (
                  <React.Fragment key={i}>
                    <tr className="border-t border-[#293027]/5 dark:border-white/5">
                      <td className="px-4 py-3 text-[#293027] dark:text-white">{r.email || 'anonyme'}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-[#293027]/50 dark:text-white/50">
                        {r.at ? (r.at as any).toDate().toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <GhostButton onClick={() => setOuverte(ouverte === (r.email || String(i)) ? null : (r.email || String(i)))}>
                          {ouverte === (r.email || String(i)) ? 'Fermer' : 'Voir le détail'}
                        </GhostButton>
                      </td>
                    </tr>
                    {ouverte === (r.email || String(i)) && (
                      <tr className="border-t border-[#293027]/5 dark:border-white/5 bg-[#EEE7DB]/50 dark:bg-white/5">
                        <td colSpan={3} className="px-4 py-4">
                          <ul className="space-y-2 text-xs">
                            {(sondage.questions || []).map((q) => (
                              <li key={q.id}>
                                <span className="font-bold text-[#293027] dark:text-white">{q.texte}</span>
                                {' — '}
                                <span className="text-[#293027]/70 dark:text-white/70">{formatValeur(r.reponses?.[q.id]) || '—'}</span>
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
};

export default SondageReponses;
