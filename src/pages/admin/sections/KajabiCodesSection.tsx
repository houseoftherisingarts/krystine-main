// « Codes de l'ancien système » : les achats faits sur Kajabi retrouvent leur
// propriétaire ici, formation par formation.
//
// 1. Chaque offre Kajabi (telle que Stripe l'a vue) se relie à une ou
//    plusieurs formations du site, dans la colonne de droite.
// 2. Quand une formation est migrée, le bouton « Envoyer les codes » fait
//    partir un code personnel à chaque acheteuse de cette formation
//    (functions/src/kajabi.ts). Elle l'entre dans « Mes formations ».
import React, { useEffect, useMemo, useState } from 'react';
import { getFormations, type Formation } from '../../../firebase/formations';
import { getOffresKajabi, relierOffreKajabi, getEtatRegistreKajabi, emettreCodesKajabi, type OffreKajabi, type EtatRegistre } from '../../../firebase/kajabi';
import { Card, Input, PrimaryButton, GhostButton, EmptyState } from '../primitives';

const VIDE: EtatRegistre = { aRestaurer: 0, codeEnvoye: 0, restaure: 0 };

const KajabiCodesSection: React.FC = () => {
  const [offres, setOffres] = useState<OffreKajabi[]>([]);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [etat, setEtat] = useState<Record<string, EtatRegistre>>({});
  const [chargement, setChargement] = useState(true);
  const [formationChoisie, setFormationChoisie] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [avis, setAvis] = useState('');

  const recharger = () => {
    setChargement(true);
    Promise.all([getOffresKajabi(), getFormations(), getEtatRegistreKajabi()])
      .then(([o, f, e]) => { setOffres(o); setFormations(f.sort((a, b) => a.titre.localeCompare(b.titre, 'fr'))); setEtat(e); })
      .catch(() => setAvis("Le registre n'a pas pu être lu."))
      .finally(() => setChargement(false));
  };
  useEffect(recharger, []);

  const titreDe = useMemo(() => new Map(formations.map(f => [f.id, f.titre])), [formations]);
  const acheteusesDe = (formationId: string) => offres.filter(o => o.formationIds.includes(formationId)).reduce((n, o) => n + (etat[o.id] || VIDE).aRestaurer, 0);

  const relier = async (o: OffreKajabi, formationId: string, ajouter: boolean) => {
    const ids = ajouter ? [...new Set([...o.formationIds, formationId])] : o.formationIds.filter(x => x !== formationId);
    await relierOffreKajabi(o.id, ids);
    setOffres(prev => prev.map(x => (x.id === o.id ? { ...x, formationIds: ids } : x)));
  };

  const envoyer = async (test: boolean) => {
    if (!formationChoisie || envoi) return;
    const n = acheteusesDe(formationChoisie);
    if (!test && !confirm(`Envoyer un code personnel aux ${n} acheteuses de « ${titreDe.get(formationChoisie)} » ? Chacune recevra un courriel maintenant.`)) return;
    setEnvoi(true); setAvis('');
    try {
      const r = await emettreCodesKajabi(formationChoisie, test ? testEmail : undefined);
      setAvis(test ? `Code de test envoyé à ${testEmail}.` : r.message || `${r.envoyes} codes envoyés, ${r.sautes} déjà faits, ${r.erreurs} courriels en erreur.`);
      recharger();
    } catch (e) {
      setAvis((e as Error).message || "L'envoi n'a pas fonctionné.");
    } finally {
      setEnvoi(false);
    }
  };

  if (chargement) return <p className="text-sm text-[#293027]/50">Lecture du registre…</p>;
  if (!offres.length) return <EmptyState icon="fa-key">Le registre est vide. Lancez <code>node scripts/kajabi/registre.mjs --ecrire</code> pour le remplir depuis Stripe.</EmptyState>;

  const totaux = Object.values(etat).reduce((t, e) => ({ aRestaurer: t.aRestaurer + e.aRestaurer, codeEnvoye: t.codeEnvoye + e.codeEnvoye, restaure: t.restaure + e.restaure }), { ...VIDE });

  return (
    <div className="space-y-6">
      <Card>
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">Envoyer les codes d'une formation migrée</p>
        <p className="mt-2 text-sm text-[#293027]/70">Choisissez la formation qui vient d'arriver sur le site. Chaque acheteuse de l'ancien système reçoit un code personnel par courriel (et dans sa messagerie si elle a déjà un compte), qu'elle entre dans « Mes formations ». Un code ne sert qu'une fois et vaut 180 jours.</p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex min-w-[260px] flex-1 flex-col gap-1 text-xs font-semibold text-[#293027]/70">
            Formation
            <select value={formationChoisie} onChange={e => setFormationChoisie(e.target.value)} className="rounded-[10px] border border-[#293027]/15 bg-white px-3 py-2 text-sm text-[#293027]">
              <option value="">Choisir…</option>
              {formations.map(f => <option key={f.id} value={f.id}>{f.titre} · {acheteusesDe(f.id)} à prévenir</option>)}
            </select>
          </label>
          <PrimaryButton disabled={!formationChoisie || envoi || acheteusesDe(formationChoisie) === 0} onClick={() => envoyer(false)}>
            {envoi ? 'Envoi…' : `Envoyer les codes (${formationChoisie ? acheteusesDe(formationChoisie) : 0})`}
          </PrimaryButton>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <Input placeholder="Adresse de test" value={testEmail} onChange={e => setTestEmail(e.target.value)} className="max-w-xs" />
          <GhostButton disabled={!formationChoisie || !testEmail.includes('@') || envoi} onClick={() => envoyer(true)}>Envoyer un code de test</GhostButton>
        </div>
        {avis && <p className="mt-3 text-sm text-[#8B4A2F]">{avis}</p>}
        <p className="mt-3 text-xs text-[#293027]/50">Registre : {totaux.aRestaurer} achats à restaurer · {totaux.codeEnvoye} codes envoyés · {totaux.restaure} formations retrouvées.</p>
      </Card>

      <Card>
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">Relier chaque offre Kajabi à sa formation sur le site</p>
        <p className="mt-2 text-sm text-[#293027]/70">Une offre peut ouvrir plusieurs formations. Le nom entre parenthèses est celui que Stripe a vu; pour une offre sans nom, l'identifiant se retrouve dans Kajabi sous Ventes › Offres.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[10px] uppercase tracking-widest text-[#293027]/50"><th className="py-2 pr-4">Offre Kajabi</th><th className="py-2 pr-4">Acheteuses</th><th className="py-2 pr-4">À restaurer · envoyés · retrouvés</th><th className="py-2">Formations du site</th></tr></thead>
            <tbody>
              {offres.map(o => {
                const e = etat[o.id] || VIDE;
                return (
                  <tr key={o.id} className="border-t border-[#293027]/10 align-top">
                    <td className="py-3 pr-4"><div className="font-medium text-[#293027]">{o.titre || `Offre ${o.id}`}</div><div className="text-xs text-[#293027]/50">{o.id}</div></td>
                    <td className="py-3 pr-4">{o.acheteuses}</td>
                    <td className="py-3 pr-4 whitespace-nowrap">{e.aRestaurer} · {e.codeEnvoye} · {e.restaure}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        {o.formationIds.map(id => (
                          <button key={id} onClick={() => relier(o, id, false)} title="Retirer" className="rounded-full bg-[#BA7B39]/15 px-3 py-1 text-xs text-[#8B4A2F]">{titreDe.get(id) || id} ×</button>
                        ))}
                        <select value="" onChange={ev => ev.target.value && relier(o, ev.target.value, true)} className="rounded-full border border-[#293027]/15 bg-white px-2 py-1 text-xs text-[#293027]/70">
                          <option value="">+ relier…</option>
                          {formations.filter(f => !o.formationIds.includes(f.id)).map(f => <option key={f.id} value={f.id}>{f.titre}</option>)}
                        </select>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default KajabiCodesSection;
