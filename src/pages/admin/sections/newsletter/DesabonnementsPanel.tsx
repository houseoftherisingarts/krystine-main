import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { Card, EmptyState } from '../../primitives';

// Les désabonnements, en un seul endroit (Krystine, 27 sept. 2026) : chaque
// départ fait sur le site depuis 180 jours, sa date, ses raisons et son mot
// libre, avec le total par raison et par semaine. Les départs importés de
// Shopify ou de Kajabi n'ont pas de date et n'apparaissent pas ici.
const RAISONS: Record<string, string> = { 'trop-de-courriels': 'Trop de courriels', contenu: 'Le contenu ne me parle plus', 'pas-inscrite': 'Je ne me souviens pas de m’être inscrite', autrement: 'Je préfère suivre Krystine autrement', autre: 'Autre' };
interface Depart { email: string; nom: string; le: Date; raisons: string[]; autre?: string }

const DesabonnementsPanel: React.FC = () => {
  const [departs, setDeparts] = useState<Depart[] | null>(null);
  useEffect(() => {
    if (!db) return;
    const depuis = Timestamp.fromMillis(Date.now() - 180 * 86400e3);
    getDocs(query(collection(db, 'newsletter'), where('unsubscribedAt', '>=', depuis))).then(snap => {
      const parAdresse = new Map<string, Depart>();
      snap.forEach(d => {
        const x = d.data() as any;
        if (x.status !== 'unsubscribed' || (x.tags || []).includes('essai-technique')) return;
        const email = String(x.email || '').toLowerCase();
        const le: Date = x.unsubscribedAt?.toDate?.() || new Date(0);
        const prec = parAdresse.get(email);
        const raisons = Array.from(new Set([...(prec?.raisons || []), ...((x.raisonsDepart || []) as string[])]));
        parAdresse.set(email, { email, nom: [x.firstName, x.lastName].filter(Boolean).join(' '), le: prec && prec.le > le ? prec.le : le, raisons, autre: x.raisonAutre || prec?.autre });
      });
      setDeparts([...parAdresse.values()].sort((a, b) => b.le.getTime() - a.le.getTime()));
    }).catch(() => setDeparts([]));
  }, []);

  const totaux = useMemo(() => {
    const t: Record<string, number> = {}; let sans = 0;
    (departs || []).forEach(d => { if (!d.raisons.length) sans++; d.raisons.forEach(r => { t[r] = (t[r] || 0) + 1; }); });
    return { t, sans };
  }, [departs]);

  if (!departs) return <p className="text-sm text-[#293027]/60">Chargement…</p>;
  if (!departs.length) return <EmptyState icon="fa-door-open">Aucun désabonnement fait sur le site depuis 180 jours.</EmptyState>;
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="font-serif text-2xl text-[#293027] dark:text-white">Désabonnements</h2>
        <p className="text-xs text-[#293027]/55 dark:text-white/55 mt-1">{departs.length} personnes se sont désabonnées depuis le site ces 180 derniers jours. La raison est facultative : la plupart n’en donnent pas.</p>
        <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(totaux.t).sort((a, b) => b[1] - a[1]).map(([r, n]) => (
            <div key={r} className="rounded-xl border border-[#293027]/10 dark:border-white/10 px-4 py-3">
              <div className="text-xs text-[#293027]/60 dark:text-white/60">{RAISONS[r] || r}</div>
              <div className="font-serif text-2xl text-[#293027] dark:text-white">{n}</div>
            </div>
          ))}
          <div className="rounded-xl border border-dashed border-[#293027]/15 dark:border-white/15 px-4 py-3">
            <div className="text-xs text-[#293027]/60 dark:text-white/60">Sans raison donnée</div>
            <div className="font-serif text-2xl text-[#293027] dark:text-white">{totaux.sans}</div>
          </div>
        </div>
      </Card>
      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#EEE7DB] dark:bg-white/5 text-[10px] uppercase tracking-widest text-[#293027]/60 dark:text-white/60">
            <tr><th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Personne</th><th className="text-left px-4 py-3">Raisons</th><th className="text-left px-4 py-3">Son mot</th></tr>
          </thead>
          <tbody>
            {departs.map(d => (
              <tr key={d.email} className="border-t border-[#293027]/5 dark:border-white/5">
                <td className="px-4 py-3 whitespace-nowrap text-[#293027]/70 dark:text-white/70">{d.le.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })} · {d.le.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}</td>
                <td className="px-4 py-3"><div className="text-[#293027] dark:text-white">{d.nom || '—'}</div><div className="text-[11px] text-[#293027]/55 dark:text-white/55">{d.email}</div></td>
                <td className="px-4 py-3 text-[#293027] dark:text-white">{d.raisons.length ? d.raisons.map(r => RAISONS[r] || r).join(' · ') : <span className="text-[#293027]/40">—</span>}</td>
                <td className="px-4 py-3 text-[#293027]/80 dark:text-white/80">{d.autre || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default DesabonnementsPanel;
