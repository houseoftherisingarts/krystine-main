import React, { useEffect, useMemo, useState } from 'react';
import { getCommandesStripe, type CommandeStripe } from '../../../../firebase/commandes';
import { Card, GhostButton, downloadCsv } from '../../primitives';

// Les ventes Stripe (formations, Foyer, Origine, niskas achetés en argent,
// pourboires) avec le détail TPS/TVQ du Québec (ajouté 2026-09-07), pour la
// comptabilité de Krystine : revenus et taxes toujours dans deux colonnes
// séparées, jamais mélangés.

const argent = (cents: number) => (cents / 100).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' });

const SOURCE_LABEL: Record<CommandeStripe['source'], string> = {
  formation: 'Formation',
  niskas: 'Niskas',
  pourboire: 'Pourboire',
};

function sommer(commandes: CommandeStripe[]) {
  return commandes.reduce((acc, c) => ({ ht: acc.ht + c.montantHT, taxes: acc.taxes + c.taxes }), { ht: 0, taxes: 0 });
}

const CommandesStripeCard: React.FC = () => {
  const [commandes, setCommandes] = useState<CommandeStripe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getCommandesStripe().then(setCommandes).finally(() => setLoading(false)); }, []);

  const { moisCourant, anneeCourante, visibles } = useMemo(() => {
    const maintenant = new Date();
    const dansLeMois = (c: CommandeStripe) => {
      const d = c.date?.toDate();
      return !!d && d.getMonth() === maintenant.getMonth() && d.getFullYear() === maintenant.getFullYear();
    };
    const dansLAnnee = (c: CommandeStripe) => c.date?.toDate()?.getFullYear() === maintenant.getFullYear();
    return {
      moisCourant: sommer(commandes.filter(dansLeMois)),
      anneeCourante: sommer(commandes.filter(dansLAnnee)),
      visibles: commandes.slice(0, 50),
    };
  }, [commandes]);

  const exporter = () => downloadCsv('commandes-krystine.csv', commandes.map(c => ({
    date: c.date?.toDate().toLocaleDateString('fr-CA') || '',
    source: SOURCE_LABEL[c.source],
    produit: c.libelle,
    'revenus (hors taxes)': (c.montantHT / 100).toFixed(2),
    'taxes (TPS + TVQ)': (c.taxes / 100).toFixed(2),
    total: (c.total / 100).toFixed(2),
    'sans taxes': c.sansTaxes ? 'oui' : '',
  })));

  if (loading) return <Card className="p-6"><i className="fa-solid fa-circle-notch fa-spin text-[#8B4A2F]" /></Card>;
  if (commandes.length === 0) return null;

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-5">
        <h3 className="text-sm font-bold uppercase tracking-widest text-[#293027]/60 dark:text-white/60">Ventes Stripe · Revenus et taxes</h3>
        <GhostButton onClick={exporter}><i className="fa-solid fa-file-csv" /> Exporter CSV</GhostButton>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="rounded-[15px] border border-[#293027]/10 dark:border-white/10 p-4">
          <p className="text-2xl font-serif text-[#293027] dark:text-white">{argent(moisCourant.ht)}</p>
          <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#BA7B39] mt-1">Revenus du mois (hors taxes)</p>
        </div>
        <div className="rounded-[15px] border border-[#293027]/10 dark:border-white/10 p-4">
          <p className="text-2xl font-serif text-[#293027] dark:text-white">{argent(moisCourant.taxes)}</p>
          <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#BA7B39] mt-1">Taxes du mois (TPS + TVQ)</p>
        </div>
        <div className="rounded-[15px] border border-[#293027]/10 dark:border-white/10 p-4">
          <p className="text-2xl font-serif text-[#293027] dark:text-white">{argent(anneeCourante.ht)}</p>
          <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#BA7B39] mt-1">Revenus de l'année (hors taxes)</p>
        </div>
        <div className="rounded-[15px] border border-[#293027]/10 dark:border-white/10 p-4">
          <p className="text-2xl font-serif text-[#293027] dark:text-white">{argent(anneeCourante.taxes)}</p>
          <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#BA7B39] mt-1">Taxes de l'année (TPS + TVQ)</p>
        </div>
      </div>

      {/* Tableau dès sm : en dessous, les colonnes revenus/taxes sortiraient de
          l'écran dans un défilement caché. Une carte empilée les garde visibles. */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-[#293027]/50 dark:text-white/50 border-b border-[#293027]/10 dark:border-white/10">
              <th className="py-2 pr-3 font-bold">Date</th>
              <th className="py-2 pr-3 font-bold">Produit</th>
              <th className="py-2 pr-3 font-bold text-right">Revenus (hors taxes)</th>
              <th className="py-2 pr-3 font-bold text-right">Taxes (TPS + TVQ)</th>
              <th className="py-2 pr-3 font-bold text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map(c => (
              <tr key={c.id} className="border-b border-[#293027]/5 dark:border-white/5">
                <td className="py-2 pr-3 text-[#293027]/60 dark:text-white/60 whitespace-nowrap">{c.date?.toDate().toLocaleDateString('fr-CA') || '—'}</td>
                <td className="py-2 pr-3 text-[#293027] dark:text-white">
                  {c.libelle}
                  <span className="ml-2 text-[10px] uppercase tracking-widest text-[#293027]/40 dark:text-white/40">{SOURCE_LABEL[c.source]}</span>
                  {c.sansTaxes && <span className="ml-2 text-[10px] uppercase tracking-widest text-[#8B4A2F] bg-[#BA7B39]/10 rounded-full px-2 py-0.5">Sans taxes</span>}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-[#293027] dark:text-white">{argent(c.montantHT)}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-[#293027] dark:text-white">{argent(c.taxes)}</td>
                <td className="py-2 pr-3 text-right tabular-nums font-bold text-[#293027] dark:text-white">{argent(c.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-3 sm:hidden">
        {visibles.map(c => (
          <li key={c.id} className="rounded-[15px] border border-[#293027]/10 dark:border-white/10 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[#293027] dark:text-white font-serif">{c.libelle}</p>
              <span className="shrink-0 text-[10px] uppercase tracking-widest text-[#293027]/40 dark:text-white/40">{SOURCE_LABEL[c.source]}</span>
            </div>
            <p className="text-[11px] text-[#293027]/50 dark:text-white/50 mt-0.5">
              {c.date?.toDate().toLocaleDateString('fr-CA') || '—'}
              {c.sansTaxes && <span className="ml-2 uppercase tracking-widest text-[#8B4A2F] bg-[#BA7B39]/10 rounded-full px-2 py-0.5">Sans taxes</span>}
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-right">
              <div><p className="text-[9px] uppercase tracking-widest text-[#293027]/40 dark:text-white/40">Revenus</p><p className="tabular-nums text-[#293027] dark:text-white">{argent(c.montantHT)}</p></div>
              <div><p className="text-[9px] uppercase tracking-widest text-[#293027]/40 dark:text-white/40">Taxes</p><p className="tabular-nums text-[#293027] dark:text-white">{argent(c.taxes)}</p></div>
              <div><p className="text-[9px] uppercase tracking-widest text-[#293027]/40 dark:text-white/40">Total</p><p className="tabular-nums font-bold text-[#293027] dark:text-white">{argent(c.total)}</p></div>
            </div>
          </li>
        ))}
      </ul>
      {commandes.length > visibles.length && (
        <p className="mt-3 text-[11px] text-[#293027]/50 dark:text-white/50">{visibles.length} des {commandes.length} commandes affichées. L'export CSV contient tout.</p>
      )}
    </Card>
  );
};

export default CommandesStripeCard;
