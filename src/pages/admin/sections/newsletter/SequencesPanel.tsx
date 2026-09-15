import React, { useEffect, useMemo, useState } from 'react';
import { getNewsletters, type NewsletterDoc } from '../../../../firebase/firestore';
import { getFormations, type Formation } from '../../../../firebase/formations';
import {
  ecouterSequences, ecouterInscrits, creerSequence, enregistrerSequence, supprimerSequence,
  marquerLettreSequence, testerSequence, type Sequence, type Etape, type Inscrit,
} from '../../../../firebase/sequences';
import { Card, Input, Label, PrimaryButton, GhostButton, DangerButton, ToggleSwitch, EmptyState } from '../../primitives';

// Les séquences : une suite de lettres qui partent toutes seules, à tant de
// jours après l'entrée d'une personne. La première sert l'accueil d'une
// acheteuse de l'Expérience Origine 2 (plan KSL Automne 2026, chantier 1).
// Chaque étape est une infolettre du composeur : Krystine l'écrit et la
// relit là où elle écrit tout le reste, la séquence ne fait que la porter.

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'etape';
const delaiLisible = (h: number) => (h === 0 ? 'tout de suite' : h % 24 === 0 ? `${h / 24} jour${h / 24 > 1 ? 's' : ''} après` : `${h} h après`);

const SequencesPanel: React.FC<{ onOpen: (id: string) => void }> = ({ onOpen }) => {
  const [seqs, setSeqs] = useState<Sequence[]>([]);
  const [lettres, setLettres] = useState<NewsletterDoc[]>([]);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [courante, setCourante] = useState<string | null>(null);
  const [brouillon, setBrouillon] = useState<Sequence | null>(null);
  const [inscrits, setInscrits] = useState<Inscrit[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  useEffect(() => ecouterSequences(s => { setSeqs(s); setCourante(c => c || s[0]?.id || null); }), []);
  useEffect(() => { getNewsletters().then(setLettres); getFormations().then(setFormations); }, []);
  useEffect(() => { if (!courante) return; return ecouterInscrits(courante, setInscrits); }, [courante]);
  // Le brouillon local suit la séquence choisie, jusqu'à ce qu'on l'enregistre.
  useEffect(() => { setBrouillon(seqs.find(s => s.id === courante) || null); }, [courante, seqs]);

  const lettresChoisissables = useMemo(() => lettres.filter(l => l.status !== 'sending'), [lettres]);

  const maj = (patch: Partial<Sequence>) => setBrouillon(b => (b ? { ...b, ...patch } : b));
  const majEtape = (i: number, patch: Partial<Etape>) => maj({ etapes: (brouillon?.etapes || []).map((e, j) => (j === i ? { ...e, ...patch } : e)) });

  const enregistrer = async () => {
    if (!brouillon) return;
    setOccupe(true); setMessage(null);
    try {
      const etapes = (brouillon.etapes || []).map(e => ({ ...e, cle: e.cle || slug(e.titre || 'etape'), delaiHeures: Math.max(0, Number(e.delaiHeures) || 0) }));
      await enregistrerSequence(brouillon.id, { titre: brouillon.titre, actif: !!brouillon.actif, declencheur: brouillon.declencheur, etapes });
      for (const e of etapes) if (e.newsletterId) await marquerLettreSequence(e.newsletterId).catch(() => {});
      setMessage('Séquence enregistrée.');
      getNewsletters().then(setLettres);
    } catch (e: any) { setMessage(e?.message || 'Échec de l\'enregistrement.'); }
    finally { setOccupe(false); }
  };

  const nouvelle = async () => {
    const titre = prompt('Le nom de la séquence (par exemple « Accueil Origine 2 ») :');
    if (!titre) return;
    const id = await creerSequence(titre.trim());
    setCourante(id);
  };

  const supprimer = async () => {
    if (!brouillon) return;
    if (!confirm(`Supprimer la séquence « ${brouillon.titre} » et sa liste d'inscrits ?`)) return;
    await supprimerSequence(brouillon.id);
    setCourante(null);
  };

  const tester = async (e: Etape) => {
    if (!brouillon) return;
    const email = prompt(`Envoyer l'étape « ${e.titre || e.cle} » tout de suite à quelle adresse ?`, 'krystine@inspiratanature.com');
    if (!email) return;
    setOccupe(true); setMessage(null);
    try { await testerSequence({ sequenceId: brouillon.id, cle: e.cle, email, mode: 'etape' }); setMessage(`Étape envoyée à ${email}.`); }
    catch (err: any) { setMessage(err?.message || 'L\'envoi a échoué.'); }
    finally { setOccupe(false); }
  };

  const inscrire = async () => {
    if (!brouillon) return;
    const email = prompt('Inscrire quelle adresse dans la séquence ? Sa suite partira selon les délais.');
    if (!email) return;
    const firstName = prompt('Son prénom (pour « Bonjour {{firstName}} ») :') || '';
    setOccupe(true); setMessage(null);
    try { await testerSequence({ sequenceId: brouillon.id, email, firstName, mode: 'inscrire' }); setMessage(`${email} est dans la séquence.`); }
    catch (err: any) { setMessage(err?.message || 'L\'inscription a échoué.'); }
    finally { setOccupe(false); }
  };

  const declencheurTexte = (s: Sequence) => {
    if (s.declencheur?.type !== 'achat') return 'À la main seulement';
    const fid = s.declencheur.formationId;
    return `À l'achat de « ${formations.find(f => f.id === fid)?.titre || fid} »`;
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-3">
        <PrimaryButton onClick={nouvelle} className="w-full"><i className="fa-solid fa-plus" /> Nouvelle séquence</PrimaryButton>
        <Card className="p-2">
          {seqs.length === 0 && <p className="px-3 py-4 text-sm text-[#293027]/60 dark:text-white/60">Aucune séquence encore.</p>}
          {seqs.map(s => (
            <button key={s.id} onClick={() => setCourante(s.id)}
              className={`w-full text-left px-4 py-3 rounded-xl transition-colors ${courante === s.id ? 'bg-[#141311] text-[#EEE7DB]' : 'hover:bg-[#BA7B39]/10 text-[#293027] dark:text-white'}`}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-serif text-lg">{s.titre}</span>
                <span className={`text-[10px] uppercase tracking-widest font-bold ${s.actif ? 'text-[#e0b060]' : courante === s.id ? 'text-white/50' : 'text-[#293027]/40'}`}>{s.actif ? 'Active' : 'En pause'}</span>
              </div>
              <div className={`text-[11px] ${courante === s.id ? 'text-white/60' : 'text-[#293027]/50 dark:text-white/50'}`}>{(s.etapes || []).length} étape{(s.etapes || []).length > 1 ? 's' : ''} · {declencheurTexte(s)}</div>
            </button>
          ))}
        </Card>
      </div>

      {!brouillon ? (
        <EmptyState icon="fa-timeline">Choisissez une séquence, ou créez-en une. Chaque étape est une infolettre du composeur, envoyée à tant de jours après l'entrée d'une personne.</EmptyState>
      ) : (
        <div className="space-y-5">
          <Card className="p-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-[1fr_auto] items-end">
              <div>
                <Label>Nom de la séquence</Label>
                <Input value={brouillon.titre} onChange={e => maj({ titre: e.target.value })} />
              </div>
              <ToggleSwitch checked={!!brouillon.actif} onChange={v => maj({ actif: v })} label={brouillon.actif ? 'Active : elle envoie' : 'En pause : rien ne part'} />
            </div>
            <div>
              <Label>Ce qui fait entrer une personne dans la séquence</Label>
              <select
                className="w-full rounded-xl border border-[#293027]/15 bg-white px-3 py-2 text-sm dark:bg-white/5 dark:text-white"
                value={brouillon.declencheur?.type === 'achat' ? `achat:${(brouillon.declencheur as { formationId: string }).formationId}` : 'manuel'}
                onChange={e => {
                  const v = e.target.value;
                  maj({ declencheur: v === 'manuel' ? { type: 'manuel' } : { type: 'achat', formationId: v.slice(6) } });
                }}>
                <option value="manuel">À la main seulement (bouton « Inscrire une adresse »)</option>
                {formations.filter(f => f.paywall).map(f => <option key={f.id} value={`achat:${f.id}`}>L'achat de « {f.titre} »</option>)}
              </select>
              <p className="mt-1 text-[11px] text-[#293027]/50 dark:text-white/50">L'achat par Stripe inscrit l'acheteuse et envoie tout de suite ce qui est à « tout de suite ». Le reste part au fil des jours, un passage toutes les quinze minutes.</p>
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-xl text-[#293027] dark:text-white">Les étapes</h3>
              <GhostButton onClick={() => maj({ etapes: [...(brouillon.etapes || []), { cle: '', titre: '', delaiHeures: (brouillon.etapes || []).length ? 24 * ((brouillon.etapes || []).length + 1) : 0, newsletterId: '' }] })}><i className="fa-solid fa-plus" /> Ajouter une étape</GhostButton>
            </div>
            {(brouillon.etapes || []).length === 0 && <p className="text-sm text-[#293027]/60 dark:text-white/60">Aucune étape. La première part en général « tout de suite ».</p>}
            {(brouillon.etapes || []).map((e, i) => (
              <div key={i} className="grid gap-3 md:grid-cols-[1fr_120px_1fr_auto] items-end rounded-xl border border-[#293027]/10 dark:border-white/10 p-3">
                <div>
                  <Label>Étape</Label>
                  <Input value={e.titre || ''} placeholder="Bienvenue, premier pas, …" onChange={ev => majEtape(i, { titre: ev.target.value, cle: e.cle || slug(ev.target.value) })} />
                </div>
                <div>
                  <Label>Jours après</Label>
                  <Input type="number" min={0} step={0.5} value={Number(e.delaiHeures) / 24} onChange={ev => majEtape(i, { delaiHeures: Math.round(Number(ev.target.value) * 24) })} />
                  <div className="text-[10px] text-[#293027]/50 dark:text-white/50 mt-1">{delaiLisible(Number(e.delaiHeures) || 0)}</div>
                </div>
                <div>
                  <Label>La lettre</Label>
                  <select className="w-full rounded-xl border border-[#293027]/15 bg-white px-3 py-2 text-sm dark:bg-white/5 dark:text-white" value={e.newsletterId} onChange={ev => majEtape(i, { newsletterId: ev.target.value })}>
                    <option value="">Choisir une infolettre…</option>
                    {lettresChoisissables.map(l => <option key={l.id} value={l.id}>{l.title || l.subject}{l.role === 'sequence' ? ' · séquence' : ''}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  {e.newsletterId && <GhostButton onClick={() => onOpen(e.newsletterId)} title="Ouvrir la lettre dans le composeur"><i className="fa-solid fa-pen" /></GhostButton>}
                  {e.newsletterId && e.cle && <GhostButton onClick={() => tester(e)} disabled={occupe} title="Envoyer cette étape tout de suite à une adresse"><i className="fa-solid fa-paper-plane" /></GhostButton>}
                  <DangerButton onClick={() => maj({ etapes: (brouillon.etapes || []).filter((_, j) => j !== i) })} title="Retirer l'étape"><i className="fa-solid fa-trash" /></DangerButton>
                </div>
                {typeof brouillon.stats?.[e.cle] === 'number' && <div className="md:col-span-4 text-[11px] text-[#8B4A2F]">{brouillon.stats[e.cle]} envoi{brouillon.stats[e.cle] > 1 ? 's' : ''} jusqu'ici</div>}
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <PrimaryButton onClick={enregistrer} disabled={occupe}><i className="fa-solid fa-floppy-disk" /> Enregistrer la séquence</PrimaryButton>
              <GhostButton onClick={inscrire} disabled={occupe}><i className="fa-solid fa-user-plus" /> Inscrire une adresse</GhostButton>
              <DangerButton onClick={supprimer} className="ml-auto"><i className="fa-solid fa-trash" /> Supprimer</DangerButton>
            </div>
            {message && <p className="text-sm text-[#8B4A2F]">{message}</p>}
          </Card>

          <Card className="p-5">
            <h3 className="font-serif text-xl text-[#293027] dark:text-white mb-3">Les personnes dans la séquence <span className="text-sm text-[#293027]/50 dark:text-white/50 font-sans">({inscrits.length})</span></h3>
            {inscrits.length === 0 ? (
              <p className="text-sm text-[#293027]/60 dark:text-white/60">Personne encore. Elles arriveront par le déclencheur, ou par « Inscrire une adresse ».</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-[10px] uppercase tracking-widest text-[#293027]/60 dark:text-white/60">
                    <tr><th className="text-left py-2 pr-4">Personne</th><th className="text-left py-2 pr-4">Entrée</th>{(brouillon.etapes || []).map(e => <th key={e.cle} className="text-left py-2 pr-4">{e.titre || e.cle}</th>)}</tr>
                  </thead>
                  <tbody>
                    {inscrits.slice(0, 60).map(p => (
                      <tr key={p.id} className="border-t border-[#293027]/5 dark:border-white/5">
                        <td className="py-2 pr-4 text-[#293027] dark:text-white">{p.firstName ? `${p.firstName} · ` : ''}{p.email}</td>
                        <td className="py-2 pr-4 text-[#293027]/60 dark:text-white/60">{p.debuteLe?.toDate().toLocaleDateString('fr-CA')}</td>
                        {(brouillon.etapes || []).map(e => (
                          <td key={e.cle} className="py-2 pr-4">
                            {p.envoyes?.[e.cle] ? <span className="text-green-700" title={p.envoyes[e.cle].toDate().toLocaleString('fr-CA')}><i className="fa-solid fa-check" /></span>
                              : p.erreurs?.[e.cle] ? <span className="text-red-600" title={p.erreurs[e.cle]}><i className="fa-solid fa-triangle-exclamation" /></span>
                              : <span className="text-[#293027]/30 dark:text-white/30">·</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default SequencesPanel;
