import React, { useEffect, useRef, useState } from 'react';
import {
  getFormations, setFormationStatut, deleteFormation, updateFormationOptions,
  getLecons, ajouterLecon, supprimerLecon, setLeconOrdre,
  type Formation, type FormationOptions, type Lecon,
} from '../../../firebase/formations';
import { Card } from '../primitives';

// Les leçons d'un cours : téléversement (vidéo, musique, PDF, autre fichier),
// ordre par flèches, suppression. Le fichier part dans formations-contenu/
// (privé) et la leçon apparaît immédiatement dans le lecteur.
const LeconsPanel: React.FC<{ formationId: string }> = ({ formationId }) => {
  const [lecons, setLecons] = useState<Lecon[]>([]);
  const [charge, setCharge] = useState(true);
  const [televersement, setTeleversement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const fichierRef = useRef<HTMLInputElement>(null);

  const refresh = () => getLecons(formationId).then(setLecons).finally(() => setCharge(false));
  useEffect(() => { refresh(); }, [formationId]);

  const televerser = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichiers = Array.from(e.target.files || []);
    if (!fichiers.length) return;
    setErreur(null); setTeleversement(true);
    try {
      let ordre = lecons.length;
      for (const f of fichiers) {
        const titre = f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
        await ajouterLecon(formationId, f, titre || f.name, ordre++);
      }
      await refresh();
    } catch (err: any) {
      setErreur(err?.message || 'Le téléversement a échoué.');
    } finally {
      setTeleversement(false);
      if (fichierRef.current) fichierRef.current.value = '';
    }
  };

  const bouger = async (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= lecons.length) return;
    await Promise.all([
      setLeconOrdre(formationId, lecons[i].id, j),
      setLeconOrdre(formationId, lecons[j].id, i),
    ]);
    await refresh();
  };

  const retirer = async (l: Lecon) => {
    if (!confirm(`Supprimer la leçon « ${l.titre} » ?`)) return;
    await supprimerLecon(formationId, l);
    await refresh();
  };

  return (
    <div className="mt-4 border-t border-[#38403a]/10 pt-4 dark:border-white/10">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B4A2F]">
          Leçons ({lecons.length})
        </p>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#BA7B39] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#293027] transition-colors hover:bg-[#9c6630]">
          <i className="fa-solid fa-upload text-[10px]" />
          {televersement ? 'Téléversement…' : 'Ajouter des leçons'}
          <input
            ref={fichierRef} type="file" multiple className="hidden"
            accept="video/*,audio/*,.pdf,application/pdf,*/*"
            onChange={televerser} disabled={televersement}
          />
        </label>
      </div>
      {erreur && <p className="mb-3 text-xs text-red-600">{erreur}</p>}
      {charge ? (
        <p className="text-xs text-[#38403a]/50 dark:text-white/50">Chargement…</p>
      ) : lecons.length === 0 ? (
        <p className="text-xs text-[#38403a]/50 dark:text-white/50">
          Aucune leçon. Téléversez des vidéos, des musiques ou des PDF : l'ordre de téléversement devient l'ordre du cours.
        </p>
      ) : (
        <div className="space-y-1.5">
          {lecons.map((l, i) => (
            <div key={l.id} className="flex items-center gap-3 rounded-[12px] bg-white/50 px-3 py-2 text-sm dark:bg-white/5">
              <i className={`fa-solid ${l.type === 'video' ? 'fa-circle-play' : l.type === 'audio' ? 'fa-music' : l.type === 'pdf' ? 'fa-file-pdf' : 'fa-file'} w-4 text-[#8B4A2F]`} />
              <span className="min-w-0 flex-1 truncate text-[#293027] dark:text-white">{i + 1}. {l.titre}</span>
              <button type="button" onClick={() => bouger(i, -1)} disabled={i === 0} title="Monter" className="text-[#38403a]/40 hover:text-[#8B4A2F] disabled:opacity-20 dark:text-white/40"><i className="fa-solid fa-chevron-up" /></button>
              <button type="button" onClick={() => bouger(i, 1)} disabled={i === lecons.length - 1} title="Descendre" className="text-[#38403a]/40 hover:text-[#8B4A2F] disabled:opacity-20 dark:text-white/40"><i className="fa-solid fa-chevron-down" /></button>
              <button type="button" onClick={() => retirer(l)} title="Supprimer" className="text-red-400 hover:text-red-600"><i className="fa-solid fa-trash" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Le panneau « Options » d'une formation : paywall et prix, evergreen ou
// sortie datée, lancement orchestré, message aux acheteuses.
const OptionsPanel: React.FC<{ f: Formation; onSaved: () => void }> = ({ f, onSaved }) => {
  const [paywall, setPaywall] = useState(!!f.paywall);
  const [prix, setPrix] = useState(f.prix != null ? String(f.prix) : '');
  const [evergreen, setEvergreen] = useState(f.evergreen !== false);
  const [dateSortie, setDateSortie] = useState(f.dateSortie || '');
  const [lancement, setLancement] = useState(!!f.lancementOrchestre);
  const [message, setMessage] = useState(!!f.messageAcheteursEnvoye);
  const [categorie, setCategorie] = useState<'cours' | 'musique'>(f.categorie || 'cours');
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
        categorie,
      };
      await updateFormationOptions(f.id, options);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onSaved();
    } finally { setSaving(false); }
  };

  const ligne = 'flex items-center gap-3 text-sm text-[#293027] dark:text-white';
  const case_ = 'h-4 w-4 accent-[#BA7B39]';

  return (
    <div className="mt-3 space-y-4 rounded-[15px] bg-[#BA7B39]/8 p-5 dark:bg-white/5">
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
              className="w-28 rounded-full border border-[#293027]/15 bg-white px-4 py-1.5 text-sm outline-none focus:border-[#BA7B39] dark:border-white/15 dark:bg-[#293027]"
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
              className="rounded-full border border-[#293027]/15 bg-white px-4 py-1.5 text-sm outline-none focus:border-[#BA7B39] dark:border-white/15 dark:bg-[#293027]"
            />
          </label>
        )}
        <label className={ligne}>
          Catégorie
          <select
            value={categorie}
            onChange={e => setCategorie(e.target.value as 'cours' | 'musique')}
            className="rounded-full border border-[#293027]/15 bg-white px-4 py-1.5 text-sm outline-none focus:border-[#BA7B39] dark:border-white/15 dark:bg-[#293027]"
          >
            <option value="cours">Cours</option>
            <option value="musique">Musique</option>
          </select>
        </label>
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
          className="rounded-full bg-[#BA7B39] px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-[#293027] transition-colors hover:bg-[#293027] hover:text-[#8B4A2F] disabled:opacity-40"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer les options'}
        </button>
        {saved && <span className="text-xs text-green-600">Enregistré.</span>}
      </div>
      <LeconsPanel formationId={f.id} />
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
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#293027]/60 dark:text-white/60">
            Vos formations
          </h3>
          <span className="text-xs text-[#293027]/40 dark:text-white/40">
            {publiees} publiée{publiees > 1 ? 's' : ''} · {formations.length} au total
          </span>
        </div>
        <p className="mb-6 max-w-2xl text-sm text-[#293027]/60 dark:text-white/60">
          Le catalogue importé de Kajabi. Une formation masquée reste ici sans être visible
          du public. La supprimer la retire pour de bon.
        </p>
        {loading ? (
          <p className="text-sm text-[#293027]/50 dark:text-white/50">Chargement…</p>
        ) : formations.length === 0 ? (
          <p className="text-sm text-[#293027]/50 dark:text-white/50">Aucune formation pour l'instant.</p>
        ) : (
          <div className="space-y-3">
            {formations.map(f => (
              <div key={f.id} className="rounded-[15px] border border-[#293027]/10 p-3 dark:border-white/10">
              <div className="flex items-center gap-4">
                {f.imageUrl ? (
                  <img src={f.imageUrl} alt={f.titre} className="h-16 w-24 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl bg-[#BA7B39]/10">
                    <i className="fa-solid fa-graduation-cap text-[#8B4A2F]" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[#293027] dark:text-white">{f.titre}</p>
                  {f.description && (
                    <p className="truncate text-xs text-[#293027]/50 dark:text-white/50">{f.description}</p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
                    f.statut === 'publie'
                      ? 'bg-[#BA7B39] text-[#293027]'
                      : 'bg-[#293027]/10 text-[#293027]/60 dark:bg-white/10 dark:text-white/60'
                  }`}
                >
                  {f.statut === 'publie' ? 'Publiée' : 'Masquée'}
                </span>
                <button
                  type="button"
                  onClick={() => basculer(f)}
                  disabled={busy === f.id}
                  title={f.statut === 'publie' ? 'Masquer cette formation' : 'Publier cette formation'}
                  className="shrink-0 rounded-full border border-[#BA7B39] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#8B4A2F] transition-colors hover:bg-[#BA7B39] hover:text-[#293027] disabled:opacity-40"
                >
                  {f.statut === 'publie' ? 'Masquer' : 'Publier'}
                </button>
                <button
                  type="button"
                  onClick={() => setOptionsOuvertes(optionsOuvertes === f.id ? null : f.id)}
                  title="Paywall, prix, sortie, lancement"
                  className={`shrink-0 rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                    optionsOuvertes === f.id
                      ? 'border-[#293027] bg-[#293027] text-[#8B4A2F]'
                      : 'border-[#293027]/20 text-[#293027]/70 hover:border-[#BA7B39] hover:text-[#8B4A2F] dark:border-white/20 dark:text-white/70'
                  }`}
                >
                  <i className="fa-solid fa-sliders mr-1" /> Options
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
              {optionsOuvertes === f.id && <OptionsPanel f={f} onSaved={refresh} />}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default FormationsSection;
