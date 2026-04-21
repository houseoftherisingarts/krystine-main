import React, { useEffect, useState } from 'react';
import { getBookingRequests, updateBookingRequest, deleteBookingRequest, type BookingRequest, type BookingStatus } from '../../../firebase/firestore';
import { Card, DangerButton, EmptyState, GhostButton } from '../primitives';

const STATUS_OPTIONS: { id: BookingStatus; label: string; color: string }[] = [
  { id: 'new',         label: 'Nouveau',     color: 'bg-[#D4AF37]/10 text-[#D4AF37]' },
  { id: 'in_progress', label: 'En cours',    color: 'bg-yellow-50 text-yellow-600' },
  { id: 'accepted',    label: 'Accepté',     color: 'bg-green-50 text-green-600' },
  { id: 'declined',    label: 'Refusé',      color: 'bg-red-50 text-red-500' },
];

const BookingsSection: React.FC = () => {
  const [items, setItems] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const refresh = () => getBookingRequests().then(setItems).finally(() => setLoading(false));
  useEffect(() => { refresh(); }, []);

  const changeStatus = async (id: string, status: BookingStatus) => {
    await updateBookingRequest(id, { status });
    setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i));
  };

  const del = async (b: BookingRequest) => {
    if (!b.id) return;
    if (!confirm('Supprimer cette demande ?')) return;
    await deleteBookingRequest(b.id);
    await refresh();
  };

  if (loading) return <div className="py-12 flex justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#D4AF37] text-2xl" /></div>;
  if (items.length === 0) return <EmptyState icon="fa-inbox">Aucune demande reçue.</EmptyState>;

  return (
    <div className="space-y-3">
      {items.map(b => {
        const isOpen = expanded === b.id;
        const status = STATUS_OPTIONS.find(s => s.id === (b.status || 'new')) || STATUS_OPTIONS[0];
        return (
          <Card key={b.id} className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-serif text-[#0B1A36] dark:text-white">{b.name}</h3>
                  <span className={`text-[10px] uppercase tracking-widest font-bold px-2.5 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                </div>
                <p className="text-xs text-[#0B1A36]/50 dark:text-white/50 mt-1">
                  {b.email}
                  {b.organization ? ` · ${b.organization}` : ''}
                  {b.eventType ? ` · ${b.eventType}` : ''}
                </p>
                {isOpen && b.message && (
                  <p className="mt-4 text-sm text-[#0B1A36]/80 dark:text-white/80 leading-relaxed whitespace-pre-line">{b.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <select
                  value={b.status || 'new'}
                  onChange={e => b.id && changeStatus(b.id, e.target.value as BookingStatus)}
                  className="text-xs px-3 py-2 rounded-lg border border-[#0B1A36]/10 dark:border-white/10 bg-[#F5F5F0] dark:bg-white/5 text-[#0B1A36] dark:text-white"
                >
                  {STATUS_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                <GhostButton onClick={() => setExpanded(isOpen ? null : b.id!)}>
                  <i className={`fa-solid ${isOpen ? 'fa-chevron-up' : 'fa-chevron-down'}`} /> {isOpen ? 'Masquer' : 'Voir'}
                </GhostButton>
                <DangerButton onClick={() => del(b)}><i className="fa-solid fa-trash" /></DangerButton>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default BookingsSection;
