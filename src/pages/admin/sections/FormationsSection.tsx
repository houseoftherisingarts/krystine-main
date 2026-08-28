import React, { useEffect, useState } from 'react';
import { getFormations, setFormationStatut, deleteFormation, type Formation } from '../../../firebase/formations';
import { Card } from '../primitives';

// Formations : le catalogue importé de Kajabi. Krystine publie, masque ou
// supprime chaque cours. La vitrine publique ne montre que les publiées.

const FormationsSection: React.FC = () => {
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = () => {
    setLoading(true);
    getFormations().then(setFormations).finally(() => setLoading(false));
  };
  useEffect(() => { refresh(); }, []);

  const basculer = async (f: Formation) => {
    setBusy(f.id);
    try {
      await setFormationStatut(f.id, f.statut === 'publie' ? 'masque' : 'publie');
      await refresh();
    } finally { setBusy(null); }
  };

  const supprimer = async (f: Formation) => {
    if (!confirm(`Supprimer « ${f.titre} » ? Cette action est définitive.`)) return;
    setBusy(f.id);
    try {
      await deleteFormation(f.id);
      await refresh();
    } finally { setBusy(null); }
  };

  const publiees = formations.filter(f => f.statut === 'publie').length;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#2a2015]/60 dark:text-white/60">
            Vos formations
          </h3>
          <span className="text-xs text-[#2a2015]/40 dark:text-white/40">
            {publiees} publiée{publiees > 1 ? 's' : ''} · {formations.length} au total
          </span>
        </div>
        <p className="mb-6 max-w-2xl text-sm text-[#2a2015]/60 dark:text-white/60">
          Le catalogue importé de Kajabi. Une formation masquée reste ici sans être visible
          du public. La supprimer la retire pour de bon.
        </p>
        {loading ? (
          <p className="text-sm text-[#2a2015]/50 dark:text-white/50">Chargement…</p>
        ) : formations.length === 0 ? (
          <p className="text-sm text-[#2a2015]/50 dark:text-white/50">Aucune formation pour l'instant.</p>
        ) : (
          <div className="space-y-3">
            {formations.map(f => (
              <div
                key={f.id}
                className="flex items-center gap-4 rounded-[15px] border border-[#2a2015]/10 p-3 dark:border-white/10"
              >
                {f.imageUrl ? (
                  <img src={f.imageUrl} alt={f.titre} className="h-16 w-24 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl bg-[#bb9a5e]/10">
                    <i className="fa-solid fa-graduation-cap text-[#7d6330]" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[#2a2015] dark:text-white">{f.titre}</p>
                  {f.description && (
                    <p className="truncate text-xs text-[#2a2015]/50 dark:text-white/50">{f.description}</p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
                    f.statut === 'publie'
                      ? 'bg-[#bb9a5e] text-[#2a2015]'
                      : 'bg-[#2a2015]/10 text-[#2a2015]/60 dark:bg-white/10 dark:text-white/60'
                  }`}
                >
                  {f.statut === 'publie' ? 'Publiée' : 'Masquée'}
                </span>
                <button
                  type="button"
                  onClick={() => basculer(f)}
                  disabled={busy === f.id}
                  title={f.statut === 'publie' ? 'Masquer cette formation' : 'Publier cette formation'}
                  className="shrink-0 rounded-full border border-[#bb9a5e] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#7d6330] transition-colors hover:bg-[#bb9a5e] hover:text-[#2a2015] disabled:opacity-40"
                >
                  {f.statut === 'publie' ? 'Masquer' : 'Publier'}
                </button>
                <button
                  type="button"
                  onClick={() => supprimer(f)}
                  disabled={busy === f.id}
                  title="Supprimer définitivement"
                  className="shrink-0 rounded-full border border-red-300 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-red-600 transition-colors hover:bg-red-600 hover:text-white disabled:opacity-40"
                >
                  <i className="fa-solid fa-trash" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default FormationsSection;
