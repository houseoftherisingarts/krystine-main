import React, { useEffect, useState } from 'react';
import {
  getFormations, setFormationStatut, deleteFormation, updateFormationOptions,
  type Formation, type FormationOptions,
} from '../../../firebase/formations';
import { Card } from '../primitives';

// Le panneau « Options » d'une formation : paywall et prix, evergreen ou
// sortie datée, lancement orchestré, message aux acheteuses.
const OptionsPanel: React.FC<{ f: Formation; onSaved: () => void }> = ({ f, onSaved }) => {
  const [paywall, setPaywall] = useState(!!f.paywall);
  const [prix, setPrix] = useState(f.prix != null ? String(f.prix) : '');
  const [evergreen, setEvergreen] = useState(f.evergreen !== false);
  const [dateSortie, setDateSortie] = useState(f.dateSortie || '');
  const [lancement, setLancement] = useState(!!f.lancementOrchestre);
  const [message, setMessage] = useState(!!f.messageAcheteursEnvoye);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const enregistrer = async () => {
    setSaving(true);
    try {
      const options: FormationOptions = {
        paywall,
        prix: paywall && prix.trim() !== '' ? Math.max(0, Number(prix)) : null,
        evergreen,
        dateSortie: evergreen ? null : (dateSortie || null),
        lancementOrchestre: lancement,
        messageAcheteursEnvoye: message,
      };
      await updateFormationOptions(f.id, options);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onSaved();
    } finally { setSaving(false); }
  };

  const ligne = 'flex items-center gap-3 text-sm text-[#2a2015] dark:text-white';
  const case_ = 'h-4 w-4 accent-[#bb9a5e]';

  return (
    <div className="mt-3 space-y-4 rounded-[15px] bg-[#bb9a5e]/8 p-5 dark:bg-white/5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className={ligne}>
          <input type="checkbox" className={case_} checked={paywall} onChange={e => setPaywall(e.target.checked)} />
          Derrière un paywall
        </label>
        {paywall && (
          <label className={ligne}>
            Prix
            <input
              type="number" min="0" step="1" value={prix} onChange={e => setPrix(e.target.value)}
              placeholder="0"
              className="w-28 rounded-full border border-[#2a2015]/15 bg-white px-4 py-1.5 text-sm outline-none focus:border-[#bb9a5e] dark:border-white/15 dark:bg-[#2a2015]"
            />
            $ CA
          </label>
        )}
        <label className={ligne}>
          <input type="checkbox" className={case_} checked={evergreen} onChange={e => setEvergreen(e.target.checked)} />
          Evergreen (toujours disponible)
        </label>
        {!evergreen && (
          <label className={ligne}>
            Sortie le
            <input
              type="date" value={dateSortie} onChange={e => setDateSortie(e.target.value)}
              className="rounded-full border border-[#2a2015]/15 bg-white px-4 py-1.5 text-sm outline-none focus:border-[#bb9a5e] dark:border-white/15 dark:bg-[#2a2015]"
            />
          </label>
        )}
        <label className={ligne}>
          <input type="checkbox" className={case_} checked={lancement} onChange={e => setLancement(e.target.checked)} />
          Lancement orchestré
        </label>
        <label className={ligne}>
          <input type="checkbox" className={case_} checked={message} onChange={e => setMessage(e.target.checked)} />
          Message envoyé aux acheteuses
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button" onClick={enregistrer} disabled={saving}
          className="rounded-full bg-[#bb9a5e] px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-[#2a2015] transition-colors hover:bg-[#2a2015] hover:text-[#7d6330] disabled:opacity-40"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer les options'}
        </button>
        {saved && <span className="text-xs text-green-600">Enregistré.</span>}
      </div>
    </div>
  );
};

// Formations : le catalogue importé de Kajabi. Krystine publie, masque ou
// supprime chaque cours. La vitrine publique ne montre que les publiées.

const FormationsSection: React.FC = () => {
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [optionsOuvertes, setOptionsOuvertes] = useState<string | null>(null);

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
              <div key={f.id} className="rounded-[15px] border border-[#2a2015]/10 p-3 dark:border-white/10">
              <div className="flex items-center gap-4">
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
