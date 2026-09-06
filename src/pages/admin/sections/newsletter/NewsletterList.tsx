import React, { useEffect, useState } from 'react';
import { getNewsletters, deleteNewsletter, type NewsletterDoc } from '../../../../firebase/firestore';
import { Card, PrimaryButton, DangerButton, EmptyState, GhostButton } from '../../primitives';

interface Props {
  onOpen: (id: string | null) => void;
}

const statusLabel: Record<string, { label: string; color: string }> = {
  draft:     { label: 'Brouillon',  color: 'bg-[#BA7B39]/15 text-[#8B4A2F]' },
  scheduled: { label: 'Planifiée',  color: 'bg-blue-50 text-blue-600' },
  sending:   { label: 'Envoi…',     color: 'bg-yellow-50 text-yellow-600' },
  sent:      { label: 'Envoyée',    color: 'bg-green-50 text-green-600' },
  failed:    { label: 'Échec',      color: 'bg-red-50 text-red-500' },
};

const NewsletterList: React.FC<Props> = ({ onOpen }) => {
  const [items, setItems] = useState<NewsletterDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => getNewsletters().then(setItems).finally(() => setLoading(false));
  useEffect(() => { refresh(); }, []);

  const del = async (n: NewsletterDoc) => {
    if (!n.id) return;
    if (n.status === 'sent') { alert('Une infolettre déjà envoyée ne peut pas être supprimée.'); return; }
    if (!confirm(`Supprimer "${n.title || n.subject}" ?`)) return;
    await deleteNewsletter(n.id);
    refresh();
  };

  if (loading) return <div className="py-12 flex justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#8B4A2F] text-2xl" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-[#293027]/60 dark:text-white/60">{items.length} infolettre{items.length > 1 ? 's' : ''}</p>
        <PrimaryButton onClick={() => onOpen(null)} className="ml-auto"><i className="fa-solid fa-plus" /> Nouvelle infolettre</PrimaryButton>
      </div>

      {items.length === 0 ? (
        <EmptyState icon="fa-envelope-open-text">Aucune infolettre pour l'instant. Créez-en une pour commencer.</EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#EEE7DB] dark:bg-white/5 text-[10px] uppercase tracking-widest text-[#293027]/60 dark:text-white/60">
              <tr>
                <th className="text-left px-4 py-3">Titre</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Sujet</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Statut</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Destinataires</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell" title="Part des personnes qui ont ouvert le courriel (les messageries qui bloquent les images ne comptent pas)">Ouvertures</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Mise à jour</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(n => {
                const st = statusLabel[n.status] || statusLabel.draft;
                return (
                  <tr key={n.id} className="border-t border-[#293027]/5 dark:border-white/5 hover:bg-[#BA7B39]/5">
                    <td className="px-4 py-3 text-[#293027] dark:text-white font-serif">
                      {n.lettreDor && <i className="fa-solid fa-crown mr-2 text-xs" style={{ color: '#c9a24a' }} title="Lettre d'or, à l'interne" />}
                      {n.title || '—'}
                    </td>
                    <td className="px-4 py-3 text-[#293027]/70 dark:text-white/70 hidden md:table-cell truncate max-w-[280px]">{n.subject || '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={`text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full ${st.color}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3 text-[#293027]/60 dark:text-white/60 hidden lg:table-cell">{n.stats?.recipients ?? '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {n.status === 'sent' && (n.stats?.recipients || 0) > 0 ? (
                        <span className="text-[#8B4A2F]">
                          {Math.round(((n.stats?.opens || 0) / (n.stats!.recipients || 1)) * 100)} %
                          <span className="ml-1 text-[11px] text-[#293027]/45 dark:text-white/45">({n.stats?.opens || 0})</span>
                        </span>
                      ) : <span className="text-[#293027]/35 dark:text-white/35">—</span>}
                    </td>
                    <td className="px-4 py-3 text-[#293027]/50 dark:text-white/50 hidden md:table-cell">{n.updatedAt?.toDate().toLocaleDateString('fr-CA') || '—'}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <GhostButton onClick={() => onOpen(n.id!)}><i className="fa-solid fa-pen" /> {n.status === 'sent' ? 'Voir' : 'Modifier'}</GhostButton>
                      {n.status !== 'sent' && (
                        <DangerButton onClick={() => del(n)} className="ml-2"><i className="fa-solid fa-trash" /></DangerButton>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

export default NewsletterList;
