import React, { useEffect, useState } from 'react';
import { Card, Input, Textarea, Label, PrimaryButton, GhostButton, ToggleSwitch } from '../primitives';
import { TIERS, type Reward } from '../../../lib/pointsConfig';
import { suivreRecompenses, enregistrerRecompenses, nouvelleRecompense } from '../../../firebase/recompenses';

// Les récompenses de la plante, palier par palier. Krystine allume ou éteint
// chaque récompense, change son prix en niskas et ses mots, en ajoute une à
// n'importe quel palier. Tout part dans settings/recompenses au clic sur
// « Enregistrer », et l'onglet Points des membres suit aussitôt.

const SANS_PALIER = '__libre';

const RecompensesSection: React.FC = () => {
  const [liste, setListe] = useState<Reward[]>([]);
  const [charge, setCharge] = useState(true);
  const [modifie, setModifie] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [avis, setAvis] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);

  useEffect(() => {
    const stop = suivreRecompenses(l => { if (!modifie) setListe(l); setCharge(false); });
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patch = (id: string, p: Partial<Reward>) => {
    setListe(prev => prev.map(r => r.id === id ? { ...r, ...p } : r));
    setModifie(true);
  };
  const retirer = (r: Reward) => {
    if (!confirm(`Effacer « ${r.labelFR || r.id} » ? Pour la cacher sans l'effacer, éteignez-la plutôt.`)) return;
    setListe(prev => prev.filter(x => x.id !== r.id));
    setModifie(true);
  };
  const ajouter = (minTier?: string) => {
    const n = nouvelleRecompense(minTier);
    setListe(prev => [...prev, n]);
    setModifie(true);
    setOuvert(n.id);
  };
  const enregistrer = async () => {
    const vide = liste.find(r => !r.labelFR.trim());
    if (vide) { setAvis('Chaque récompense a besoin d\'un nom en français.'); setOuvert(vide.id); return; }
    setOccupe(true); setAvis(null);
    try {
      await enregistrerRecompenses(liste);
      setModifie(false);
      setAvis('Enregistré. Les membres voient déjà la nouvelle liste.');
    } catch (e: any) {
      setAvis(e?.message || 'L\'enregistrement a échoué.');
    } finally { setOccupe(false); }
  };

  const groupes: Array<{ cle: string; titre: string; sousTitre: string; accent: string; minTier?: string }> = [
    { cle: SANS_PALIER, titre: 'Dès la graine', sousTitre: 'Offertes à toutes, seul le solde compte.', accent: '#8F9779' },
    ...TIERS.filter(t => t.threshold > 0).map(t => ({
      cle: t.id, titre: `Palier ${t.labelFR}`, sousTitre: `Se débloque à ${t.threshold} niskas gagnés, dans la vie du compte.`, accent: t.accent, minTier: t.id,
    })),
  ];

  if (charge) return <div className="py-12 flex justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#8B4A2F] text-2xl" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl text-[#293027] dark:text-white">Récompenses de la plante</h2>
          <p className="mt-1 max-w-2xl text-sm text-[#293027]/60 dark:text-white/60">
            Ce que les membres échangent contre leurs niskas, palier par palier. Une récompense éteinte disparaît de leur onglet Points sans rien effacer.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {modifie && <span className="text-xs text-[#8B4A2F]">Modifications non enregistrées</span>}
          <PrimaryButton onClick={enregistrer} disabled={occupe || !modifie}>{occupe ? 'Enregistrement…' : 'Enregistrer'}</PrimaryButton>
        </div>
      </div>
      {avis && <p className={`rounded-xl px-4 py-3 text-sm ${avis.startsWith('Enregistré') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{avis}</p>}

      {groupes.map(g => {
        const siennes = liste.filter(r => (r.minTier || SANS_PALIER) === g.cle);
        return (
          <Card key={g.cle} className="p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: g.accent }}>{g.titre}</p>
                <p className="mt-1 text-sm text-[#293027]/60 dark:text-white/60">{g.sousTitre}</p>
              </div>
              <GhostButton onClick={() => ajouter(g.minTier)}><i className="fa-solid fa-plus" /> Ajouter une récompense</GhostButton>
            </div>
            <ul className="mt-4 space-y-2">
              {siennes.length === 0 && <li className="px-3 py-3 text-sm text-[#293027]/45 dark:text-white/45">Aucune récompense à ce palier pour l'instant.</li>}
              {siennes.map(r => {
                const eteinte = r.actif === false;
                const estOuvert = ouvert === r.id;
                return (
                  <li key={r.id} className={`rounded-2xl border transition-colors ${eteinte ? 'border-[#293027]/5 dark:border-white/5 bg-[#EEE7DB]/40 dark:bg-white/[0.02]' : 'border-[#293027]/10 dark:border-white/10 bg-white/70 dark:bg-white/5'}`}>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <ToggleSwitch checked={!eteinte} onChange={v => patch(r.id, { actif: v })} />
                      <button onClick={() => setOuvert(estOuvert ? null : r.id)} className="min-w-0 flex-1 text-left">
                        <span className={`block truncate font-serif text-lg text-[#293027] dark:text-white ${eteinte ? 'opacity-50' : ''}`}>{r.labelFR || <span className="italic opacity-50">Sans nom</span>}</span>
                        <span className="block text-xs text-[#293027]/55 dark:text-white/55">{r.cost} niskas{r.oneShot ? ' · une seule fois' : ''}{eteinte ? ' · éteinte' : ''}</span>
                      </button>
                      <button onClick={() => setOuvert(estOuvert ? null : r.id)} className="w-9 h-9 rounded-full text-[#293027]/50 hover:text-[#8B4A2F] dark:text-white/50" aria-label="Modifier">
                        <i className={`fa-solid ${estOuvert ? 'fa-chevron-up' : 'fa-pen'} text-xs`} />
                      </button>
                      <button onClick={() => retirer(r)} className="w-9 h-9 rounded-full text-[#293027]/40 hover:text-red-500 dark:text-white/40" aria-label="Effacer">
                        <i className="fa-solid fa-trash text-xs" />
                      </button>
                    </div>
                    {estOuvert && (
                      <div className="grid gap-4 border-t border-[#293027]/5 px-4 py-4 dark:border-white/5 md:grid-cols-2">
                        <div><Label>Nom (français)</Label><Input value={r.labelFR} onChange={e => patch(r.id, { labelFR: e.target.value })} placeholder="ex. 10 % sur la boutique" /></div>
                        <div><Label>Nom (anglais)</Label><Input value={r.labelEN} onChange={e => patch(r.id, { labelEN: e.target.value })} placeholder="ex. 10% off the shop" /></div>
                        <div><Label>Description (français)</Label><Textarea rows={3} value={r.descFR} onChange={e => patch(r.id, { descFR: e.target.value })} /></div>
                        <div><Label>Description (anglais)</Label><Textarea rows={3} value={r.descEN} onChange={e => patch(r.id, { descEN: e.target.value })} /></div>
                        <div><Label>Prix en niskas</Label><Input type="number" min={0} step={10} value={r.cost} onChange={e => patch(r.id, { cost: Number(e.target.value) })} /></div>
                        <div>
                          <Label>Palier requis</Label>
                          <select value={r.minTier || SANS_PALIER} onChange={e => patch(r.id, { minTier: e.target.value === SANS_PALIER ? undefined : e.target.value })}
                            className="w-full rounded-xl border border-[#38403a]/10 bg-white/70 px-3 py-2 text-sm text-[#293027] outline-none focus:border-[#BA7B39] dark:border-white/10 dark:bg-white/5 dark:text-white">
                            <option value={SANS_PALIER}>Aucun, dès la graine</option>
                            {TIERS.filter(t => t.threshold > 0).map(t => <option key={t.id} value={t.id}>{t.labelFR} ({t.threshold} niskas)</option>)}
                          </select>
                        </div>
                        <label className="flex items-center gap-3 text-sm text-[#293027] dark:text-white md:col-span-2">
                          <input type="checkbox" checked={!!r.oneShot} onChange={e => patch(r.id, { oneShot: e.target.checked })} className="accent-[#BA7B39]" />
                          Une seule fois par membre (cadeau, envoi postal, accès à un cours)
                        </label>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}
    </div>
  );
};

export default RecompensesSection;
