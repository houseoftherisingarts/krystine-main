import React, { useEffect, useMemo, useState } from 'react';
import { getShopifyOrders, type ShopifyOrderDoc } from '../../../firebase/firestore';
import { Card, EmptyState, GhostButton } from '../primitives';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../../../firebase';

const RANGES: { id: string; label: string; days: number | null }[] = [
  { id: '7',   label: '7 j',    days: 7 },
  { id: '30',  label: '30 j',   days: 30 },
  { id: '90',  label: '90 j',   days: 90 },
  { id: '365', label: '12 mois', days: 365 },
  { id: 'all', label: 'Tout',   days: null },
];

const formatCurrency = (amount: number, currency = 'CAD') =>
  new Intl.NumberFormat('fr-CA', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);

interface Bucket { date: string; revenue: number; orders: number; }

const AnalyticsSection: React.FC = () => {
  const [orders, setOrders] = useState<ShopifyOrderDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30');
  const [backfillBusy, setBackfillBusy] = useState(false);
  const [backfillMsg, setBackfillMsg] = useState<string | null>(null);

  const refresh = () => getShopifyOrders(5000).then(setOrders).finally(() => setLoading(false));
  useEffect(() => { refresh(); }, []);

  const days = RANGES.find(r => r.id === range)?.days ?? null;
  const cutoff = days ? Date.now() - days * 86400000 : 0;

  const filtered = useMemo(() => orders.filter(o => {
    if (o.cancelledAt) return false;
    if (!o.createdAt) return days === null;
    return o.createdAt.toMillis() >= cutoff;
  }), [orders, cutoff, days]);

  const currency = filtered[0]?.currency || orders[0]?.currency || 'CAD';

  const revenue = filtered.reduce((s, o) => s + (o.totalPrice || 0), 0);
  const count = filtered.length;
  const aov = count > 0 ? revenue / count : 0;
  const uniqueCustomers = new Set(filtered.map(o => o.customer?.email || o.email).filter(Boolean)).size;
  const paid = filtered.filter(o => ['paid', 'partially_refunded'].includes(o.financialStatus)).length;
  const fulfilled = filtered.filter(o => o.fulfillmentStatus === 'fulfilled').length;

  // Daily buckets for chart
  const buckets = useMemo<Bucket[]>(() => {
    const n = days ?? 30;
    const map = new Map<string, Bucket>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      map.set(key, { date: key, revenue: 0, orders: 0 });
    }
    filtered.forEach(o => {
      if (!o.createdAt) return;
      const key = o.createdAt.toDate().toISOString().slice(0, 10);
      const b = map.get(key);
      if (b) { b.revenue += o.totalPrice || 0; b.orders += 1; }
    });
    return Array.from(map.values());
  }, [filtered, days]);

  // Top products
  const topProducts = useMemo(() => {
    const counts = new Map<string, { title: string; qty: number; revenue: number }>();
    filtered.forEach(o => o.lineItems?.forEach(li => {
      const key = li.productId || li.title;
      const prev = counts.get(key) || { title: li.title, qty: 0, revenue: 0 };
      prev.qty += li.quantity;
      prev.revenue += (li.price || 0) * li.quantity;
      counts.set(key, prev);
    }));
    return Array.from(counts.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [filtered]);

  const runBackfill = async () => {
    if (!confirm('Importer l\'historique complet des commandes Shopify ? Cela peut prendre plusieurs minutes.')) return;
    if (!app) { setBackfillMsg('Firebase non configuré.'); return; }
    setBackfillBusy(true);
    setBackfillMsg(null);
    try {
      const fn = httpsCallable<unknown, { imported: number; pages: number }>(getFunctions(app), 'shopifyBackfill');
      const res = await fn({});
      setBackfillMsg(`Importé : ${res.data.imported} commandes (${res.data.pages} pages).`);
      await refresh();
    } catch (e: any) {
      setBackfillMsg(e?.message || 'Import échoué.');
    } finally {
      setBackfillBusy(false);
    }
  };

  const kpis = [
    { label: 'Revenu', value: formatCurrency(revenue, currency), icon: 'fa-sack-dollar', accent: 'text-[#B8532F]' },
    { label: 'Commandes', value: count.toString(), icon: 'fa-box', accent: 'text-[#4A7C9D]' },
    { label: 'Panier moyen', value: formatCurrency(aov, currency), icon: 'fa-chart-line', accent: 'text-[#2D4A3E]' },
    { label: 'Clients', value: uniqueCustomers.toString(), icon: 'fa-users', accent: 'text-[#BC4A3C]' },
    { label: 'Payées', value: paid.toString(), icon: 'fa-check-circle', accent: 'text-green-500' },
    { label: 'Expédiées', value: fulfilled.toString(), icon: 'fa-truck', accent: 'text-indigo-500' },
  ];

  const maxRev = Math.max(1, ...buckets.map(b => b.revenue));

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex gap-1 p-1 rounded-full bg-white dark:bg-[#3A251E]/60 border border-[#3A251E]/5 dark:border-white/5">
          {RANGES.map(r => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`px-4 py-1.5 text-[11px] uppercase tracking-widest font-bold rounded-full transition-colors ${range === r.id ? 'bg-[#3A251E] dark:bg-[#B8532F] text-white dark:text-[#3A251E]' : 'text-[#3A251E]/60 dark:text-white/60 hover:text-[#B8532F]'}`}
            >{r.label}</button>
          ))}
        </div>
        <GhostButton onClick={runBackfill} disabled={backfillBusy}>
          <i className={`fa-solid ${backfillBusy ? 'fa-circle-notch fa-spin' : 'fa-cloud-arrow-down'}`} />
          {backfillBusy ? 'Importation…' : 'Importer l\'historique'}
        </GhostButton>
      </div>
      {backfillMsg && <p className="text-xs text-[#B8532F] font-mono">{backfillMsg}</p>}

      {loading ? (
        <div className="py-12 flex justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#B8532F] text-2xl" /></div>
      ) : orders.length === 0 ? (
        <EmptyState icon="fa-chart-line">
          Aucune donnée Shopify. Configurez les webhooks ou lancez un import d'historique.
        </EmptyState>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {kpis.map(k => (
              <Card key={k.label} className="p-4">
                <i className={`fa-solid ${k.icon} ${k.accent} text-xl mb-2 block`} />
                <p className="text-xl md:text-2xl font-serif text-[#3A251E] dark:text-white leading-none">{k.value}</p>
                <p className="text-[9px] uppercase tracking-widest text-[#3A251E]/50 dark:text-white/50 font-bold mt-2">{k.label}</p>
              </Card>
            ))}
          </div>

          {/* Revenue chart */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm uppercase tracking-widest text-[#3A251E]/60 dark:text-white/60 font-bold">
                Revenu quotidien
              </h3>
              <span className="text-xs text-[#3A251E]/40 dark:text-white/40">
                {buckets.length} jours · max {formatCurrency(maxRev, currency)}
              </span>
            </div>
            <div className="flex items-end gap-[2px] h-40">
              {buckets.map(b => {
                const h = (b.revenue / maxRev) * 100;
                const isWeekend = [0, 6].includes(new Date(b.date).getDay());
                return (
                  <div key={b.date} className="flex-1 flex flex-col justify-end group relative">
                    <div
                      className={`w-full ${isWeekend ? 'bg-[#B8532F]/60' : 'bg-[#B8532F]'} rounded-t-sm transition-all group-hover:opacity-100 opacity-80`}
                      style={{ height: `${Math.max(h, b.revenue > 0 ? 2 : 0)}%` }}
                    />
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-[#3A251E] text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none z-10">
                      {b.date}<br />{formatCurrency(b.revenue, currency)} · {b.orders} cmd
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Top products + recent orders */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-sm uppercase tracking-widest text-[#3A251E]/60 dark:text-white/60 font-bold mb-4">
                Produits les plus vendus
              </h3>
              {topProducts.length === 0 ? (
                <p className="text-sm italic text-[#3A251E]/40 dark:text-white/40">Aucune vente dans cette période.</p>
              ) : (
                <ul className="space-y-3">
                  {topProducts.map((p, i) => (
                    <li key={p.title} className="flex items-center gap-3 text-sm">
                      <span className="text-[10px] uppercase tracking-widest font-bold text-[#B8532F] w-6">#{i + 1}</span>
                      <span className="flex-1 text-[#3A251E] dark:text-white truncate">{p.title}</span>
                      <span className="text-[#3A251E]/60 dark:text-white/60 text-xs">{p.qty}×</span>
                      <span className="text-[#B8532F] font-bold">{formatCurrency(p.revenue, currency)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-6">
              <h3 className="text-sm uppercase tracking-widest text-[#3A251E]/60 dark:text-white/60 font-bold mb-4">
                Dernières commandes Shopify
              </h3>
              {filtered.slice(0, 8).length === 0 ? (
                <p className="text-sm italic text-[#3A251E]/40 dark:text-white/40">Aucune commande.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {filtered.slice(0, 8).map(o => (
                    <li key={o.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs text-[#3A251E]/60 dark:text-white/60">{o.name}</p>
                        <p className="text-[#3A251E] dark:text-white truncate">{o.customer?.name || o.email || '—'}</p>
                      </div>
                      <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full ${
                        o.financialStatus === 'paid' ? 'bg-green-50 text-green-600'
                        : o.financialStatus === 'refunded' ? 'bg-red-50 text-red-500'
                        : 'bg-yellow-50 text-yellow-600'
                      }`}>{o.financialStatus}</span>
                      <span className="text-[#B8532F] font-bold">{formatCurrency(o.totalPrice, o.currency)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsSection;
