import React, { useEffect, useMemo, useState } from 'react';
import { getCommandesStripe, type CommandeStripe } from '../../../../firebase/commandes';
import { getShopifyOrders, type ShopifyOrderDoc } from '../../../../firebase/firestore';
import { Card } from '../../primitives';

// Les ventes des deux maisons côte à côte (Krystine, 9 oct. 2026) :
// INSPIRATA AYURVEDA (la boutique Shopify, commandes reçues par le webhook)
// et Krystine St-Laurent (les ventes Stripe du site : formations, niskas,
// pourboires). Montants taxes comprises, commandes annulées exclues.

type Ligne = { n: number; total: number };
const vide = (): Ligne => ({ n: 0, total: 0 });
const argent = (d: number) => d.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' });

function periodes() {
  const m = new Date();
  const jour = new Date(m.getFullYear(), m.getMonth(), m.getDate());
  return {
    aujourdhui: jour,
    septJours: new Date(jour.getTime() - 6 * 864e5),
    mois: new Date(m.getFullYear(), m.getMonth(), 1),
    annee: new Date(m.getFullYear(), 0, 1),
  };
}

function cumuler(items: { date?: Date; montant: number }[]) {
  const p = periodes();
  const r = { aujourdhui: vide(), septJours: vide(), mois: vide(), annee: vide() };
  for (const it of items) {
    if (!it.date) continue;
    (Object.keys(r) as (keyof typeof r)[]).forEach(k => {
      if (it.date! >= p[k]) { r[k].n += 1; r[k].total += it.montant; }
    });
  }
  return r;
}

const LIBELLES: [keyof ReturnType<typeof cumuler>, string][] = [
  ['aujourdhui', "Aujourd'hui"], ['septJours', '7 derniers jours'], ['mois', 'Ce mois-ci'], ['annee', 'Cette année'],
];

const Colonne: React.FC<{ titre: string; sous: string; data: ReturnType<typeof cumuler>; note?: string }> = ({ titre, sous, data, note }) => (
  <div>
    <h3 className="text-sm font-bold uppercase tracking-widest text-[#293027] dark:text-white">{titre}</h3>
    <p className="text-[11px] text-[#293027]/60 dark:text-white/60 mb-4">{sous}</p>
    <dl className="grid grid-cols-2 gap-3">
      {LIBELLES.map(([k, l]) => (
        <div key={k} className="rounded-xl bg-[#293027]/[0.04] dark:bg-white/[0.06] p-3">
          <dt className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#BA7B39]">{l}</dt>
          <dd className="mt-1 text-xl font-serif text-[#293027] dark:text-white">{argent(data[k].total)}</dd>
          <dd className="text-[11px] text-[#293027]/60 dark:text-white/60">{data[k].n} commande{data[k].n > 1 ? 's' : ''}</dd>
        </div>
      ))}
    </dl>
    {note && <p className="mt-3 text-[11px] leading-relaxed text-[#293027]/60 dark:text-white/60">{note}</p>}
  </div>
);

const VentesDeuxMaisonsCard: React.FC = () => {
  const [shopify, setShopify] = useState<ShopifyOrderDoc[]>([]);
  const [stripe, setStripe] = useState<CommandeStripe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getShopifyOrders(20000).catch(() => []), getCommandesStripe().catch(() => [])])
      .then(([s, c]) => { setShopify(s); setStripe(c); })
      .finally(() => setLoading(false));
  }, []);

  const { inspirata, ksl, depuis } = useMemo(() => {
    const valides = shopify.filter(o => !o.cancelledAt && o.financialStatus !== 'voided' && o.financialStatus !== 'refunded');
    const dates = valides.map(o => o.createdAt?.toDate()).filter(Boolean) as Date[];
    const plusAncienne = dates.length ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;
    return {
      inspirata: cumuler(valides.map(o => ({ date: o.createdAt?.toDate(), montant: o.totalPrice || 0 }))),
      ksl: cumuler(stripe.map(c => ({ date: c.date?.toDate(), montant: (c.total || 0) / 100 }))),
      depuis: plusAncienne,
    };
  }, [shopify, stripe]);

  if (loading) return <Card className="p-6"><i className="fa-solid fa-circle-notch fa-spin text-[#8B4A2F]" /></Card>;

  const noteShopify = depuis
    ? `Commandes reçues depuis le ${depuis.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })}. Pour les commandes plus anciennes : Ventes › Analytics Shopify › « Importer l'historique ».`
    : "Aucune commande reçue pour l'instant. Ventes › Analytics Shopify › « Importer l'historique » fait entrer les anciennes.";

  return (
    <Card className="p-6">
      <div className="grid gap-8 md:grid-cols-2">
        <Colonne titre="INSPIRATA AYURVEDA" sous="La boutique Shopify · taxes et livraison comprises" data={inspirata} note={noteShopify} />
        <Colonne titre="Krystine St-Laurent" sous="Le site : formations, niskas, pourboires · taxes comprises" data={ksl} />
      </div>
    </Card>
  );
};

export default VentesDeuxMaisonsCard;
