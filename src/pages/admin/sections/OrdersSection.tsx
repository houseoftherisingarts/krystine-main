import React, { useEffect, useState } from 'react';
import { getClientOrders, updateClientOrder, deleteClientOrder, type ClientOrder, type ClientOrderStatus } from '../../../firebase/firestore';
import { Card, DangerButton, EmptyState, GhostButton, Input, PrimaryButton, Label } from '../primitives';

const STATUS_OPTIONS: { id: ClientOrderStatus; label: string }[] = [
  { id: 'pending_payment', label: 'En attente de paiement' },
  { id: 'paid',            label: 'Payé' },
  { id: 'shipped',         label: 'Expédié' },
  { id: 'delivered',       label: 'Livré' },
  { id: 'cancelled',       label: 'Annulé' },
];

const OrdersSection: React.FC = () => {
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ClientOrder | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = () => getClientOrders().then(setOrders).finally(() => setLoading(false));
  useEffect(() => { refresh(); }, []);

  const save = async () => {
    if (!editing?.id) return;
    setSaving(true);
    try {
      await updateClientOrder(editing.id, {
        status: editing.status,
        trackingNumber: editing.trackingNumber || '',
        trackingUrl: editing.trackingUrl || '',
        notes: editing.notes || '',
      });
      await refresh();
      setEditing(null);
    } finally { setSaving(false); }
  };

  const del = async (o: ClientOrder) => {
    if (!o.id) return;
    if (!confirm(`Supprimer la commande #${o.id.slice(0, 8)} ?`)) return;
    await deleteClientOrder(o.id);
    await refresh();
  };

  if (loading) return <div className="py-12 flex justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#B8532F] text-2xl" /></div>;
  if (orders.length === 0) return <EmptyState icon="fa-box">Aucune commande enregistrée.</EmptyState>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#3A251E]/60 dark:text-white/60">{orders.length} commande{orders.length > 1 ? 's' : ''}</p>

      {orders.map(o => (
        <Card key={o.id} className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <p className="font-mono text-xs text-[#3A251E]/60 dark:text-white/60">#{o.id?.slice(0, 8)}</p>
                <span className={`text-[10px] uppercase tracking-widest font-bold px-2.5 py-0.5 rounded-full ${
                  o.status === 'delivered' ? 'bg-green-50 text-green-600' :
                  o.status === 'shipped' ? 'bg-indigo-50 text-indigo-600' :
                  o.status === 'paid' ? 'bg-blue-50 text-blue-600' :
                  o.status === 'cancelled' ? 'bg-red-50 text-red-500' :
                  'bg-yellow-50 text-yellow-600'
                }`}>{STATUS_OPTIONS.find(s => s.id === o.status)?.label || o.status}</span>
              </div>
              <p className="text-sm text-[#3A251E] dark:text-white font-serif">{o.email}</p>
              <p className="text-xs text-[#3A251E]/50 dark:text-white/50">
                {o.createdAt?.toDate().toLocaleString('fr-CA') || '—'} · {o.items.length} article{o.items.length > 1 ? 's' : ''} {o.subtotal ? ` · ${o.subtotal}` : ''}
              </p>
              {o.trackingNumber && <p className="text-xs font-mono text-[#B8532F] mt-2">{o.trackingNumber}</p>}
            </div>
            <div className="flex gap-2">
              <GhostButton onClick={() => setEditing(o)}><i className="fa-solid fa-pen" /> Gérer</GhostButton>
              <DangerButton onClick={() => del(o)}><i className="fa-solid fa-trash" /></DangerButton>
            </div>
          </div>

          {editing?.id === o.id && (
            <div className="mt-5 pt-5 border-t border-[#3A251E]/5 dark:border-white/5 space-y-4">
              <div>
                <Label>Statut</Label>
                <select
                  value={editing.status}
                  onChange={e => setEditing({ ...editing, status: e.target.value as ClientOrderStatus })}
                  className="w-full px-4 py-3 rounded-xl border border-[#3A251E]/10 dark:border-white/10 bg-[#F4E7DD] dark:bg-white/5 text-[#3A251E] dark:text-white"
                >
                  {STATUS_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Numéro de suivi</Label>
                  <Input value={editing.trackingNumber || ''} onChange={e => setEditing({ ...editing, trackingNumber: e.target.value })} />
                </div>
                <div>
                  <Label>URL de suivi (optionnel)</Label>
                  <Input type="url" value={editing.trackingUrl || ''} onChange={e => setEditing({ ...editing, trackingUrl: e.target.value })} placeholder="https://postescanada.ca/…" />
                </div>
              </div>
              <div>
                <Label>Notes internes</Label>
                <Input value={editing.notes || ''} onChange={e => setEditing({ ...editing, notes: e.target.value })} />
              </div>
              <ul className="text-xs text-[#3A251E]/60 dark:text-white/60 bg-[#F4E7DD] dark:bg-white/5 rounded-xl p-3 space-y-1">
                {o.items.map((it, i) => (
                  <li key={i}>{it.quantity}× {it.title} {it.price ? `— ${it.price}` : ''}</li>
                ))}
              </ul>
              <div className="flex justify-end gap-3">
                <GhostButton onClick={() => setEditing(null)}>Annuler</GhostButton>
                <PrimaryButton onClick={save} disabled={saving}>
                  {saving ? <><i className="fa-solid fa-circle-notch fa-spin" /> Enregistrement</> : 'Enregistrer'}
                </PrimaryButton>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};

export default OrdersSection;
