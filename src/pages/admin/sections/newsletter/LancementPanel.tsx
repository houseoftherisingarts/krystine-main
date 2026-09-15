import React, { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { getNewsletters, type NewsletterDoc } from '../../../../firebase/firestore';
import { Card, Input, Label, PrimaryButton, GhostButton, DangerButton, Textarea } from '../../primitives';

// Le calendrier maître du lancement de l'Expérience Origine 2 : les sept
// phases du plan KSL Automne 2026, avec leurs dates, ce qu'elles visent, et
// les lettres qui vont avec, écrites d'avance. La phase du jour est en
// évidence. Krystine ouvre chaque lettre dans le composeur, relit, envoie.
// Rien ne part d'ici : l'envoi reste son geste (ordre d'Alex, 6 sept 2026).

export interface Phase { n: number; titre: string; sousTitre?: string; du: string; au: string; objectifs?: string[]; lettres?: string[] }
interface Lancement { titre?: string; phases: Phase[]; note?: string }

const DOC = 'etat/lancementOrigine2';
const jourISO = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const lisible = (iso: string) => { const [a, m, j] = iso.split('-').map(Number); return new Date(a, m - 1, j).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' }); };

const statutLettre: Record<string, string> = { draft: 'Brouillon', scheduled: 'Planifiée', sending: 'Envoi…', sent: 'Envoyée', failed: 'Échec' };

const LancementPanel: React.FC<{ onOpen: (id: string) => void }> = ({ onOpen }) => {
  const [data, setData] = useState<Lancement | null>(null);
  const [lettres, setLettres] = useState<NewsletterDoc[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [choix, setChoix] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!db) return;
    return onSnapshot(doc(db, DOC), s => setData(s.exists() ? (s.data() as Lancement) : { titre: 'Lancement Expérience Origine 2', phases: [] }));
  }, []);
  useEffect(() => { getNewsletters().then(setLettres); }, []);

  const aujourdhui = jourISO();
  const phaseDuJour = useMemo(() => data?.phases.find(p => p.du <= aujourdhui && aujourdhui <= p.au)?.n ?? null, [data, aujourdhui]);
  const lettre = (id: string) => lettres.find(l => l.id === id);

  const majPhase = (n: number, patch: Partial<Phase>) => setData(d => (d ? { ...d, phases: d.phases.map(p => (p.n === n ? { ...p, ...patch } : p)) } : d));
  const enregistrer = async () => {
    if (!db || !data) return;
    await setDoc(doc(db, DOC), { ...data, maj: serverTimestamp() }, { merge: true });
    setMessage('Calendrier enregistré.');
  };
  const ajouterPhase = () => setData(d => (d ? { ...d, phases: [...d.phases, { n: (d.phases.at(-1)?.n || 0) + 1, titre: 'Nouvelle phase', du: aujourdhui, au: aujourdhui, objectifs: [], lettres: [] }] } : d));

  if (!data) return <div className="py-12 flex justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#8B4A2F] text-2xl" /></div>;

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[240px]">
            <Label>Le lancement</Label>
            <Input value={data.titre || ''} onChange={e => setData({ ...data, titre: e.target.value })} />
          </div>
          <div className="text-sm text-[#293027]/60 dark:text-white/60">
            {phaseDuJour ? <>Aujourd'hui : <strong className="text-[#8B4A2F]">phase {phaseDuJour}</strong></> : 'Aucune phase en cours aujourd\'hui'}
          </div>
          <PrimaryButton onClick={enregistrer}><i className="fa-solid fa-floppy-disk" /> Enregistrer</PrimaryButton>
        </div>
        {message && <p className="mt-2 text-sm text-[#8B4A2F]">{message}</p>}
      </Card>

      {/* La frise : une case par phase, la phase du jour en noir chaud et or. */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
        {data.phases.map(p => (
          <a key={p.n} href={`#phase-${p.n}`} className={`shrink-0 basis-[9.5rem] md:shrink md:min-w-0 md:basis-0 md:flex-1 snap-start rounded-xl px-3 py-2 text-center transition-colors ${p.n === phaseDuJour ? 'bg-[#141311] text-[#EEE7DB]' : p.au < aujourdhui ? 'bg-[#293027]/10 text-[#293027]/50 dark:bg-white/10 dark:text-white/50' : 'bg-[#BA7B39]/10 text-[#293027] dark:text-white'}`}>
            <div className={`text-[10px] uppercase tracking-widest font-bold ${p.n === phaseDuJour ? 'text-[#e0b060]' : ''}`}>Phase {p.n}</div>
            <div className="font-serif text-sm leading-tight truncate" title={p.titre}>{p.titre}</div>
            <div className="text-[10px] opacity-70 whitespace-nowrap overflow-hidden text-ellipsis">{lisible(p.du)} au {lisible(p.au)}</div>
          </a>
        ))}
      </div>

      {data.phases.map(p => (
        <Card key={p.n} className={`p-5 space-y-4 ${p.n === phaseDuJour ? 'ring-2 ring-[#e0b060]' : ''}`}>
          <div id={`phase-${p.n}`} className="grid gap-4 md:grid-cols-[auto_1fr_11rem_11rem] items-end scroll-mt-24">
            <div className="font-serif text-4xl text-[#BA7B39] leading-none">{p.n}</div>
            <div>
              <Label>Phase</Label>
              <Input value={p.titre} onChange={e => majPhase(p.n, { titre: e.target.value })} />
              <Input className="mt-2" value={p.sousTitre || ''} placeholder="En une ligne, ce que la phase vise" onChange={e => majPhase(p.n, { sousTitre: e.target.value })} />
            </div>
            <div><Label>Du</Label><Input type="date" value={p.du} onChange={e => majPhase(p.n, { du: e.target.value })} /></div>
            <div><Label>Au</Label><Input type="date" value={p.au} onChange={e => majPhase(p.n, { au: e.target.value })} /></div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Ce qu'il faut faire (une ligne par point)</Label>
              <Textarea rows={7} value={(p.objectifs || []).join('\n')} onChange={e => majPhase(p.n, { objectifs: e.target.value.split('\n') })} />
            </div>
            <div>
              <Label>Les lettres de la phase</Label>
              <div className="space-y-2">
                {(p.lettres || []).map(id => {
                  const l = lettre(id);
                  return (
                    <div key={id} className="flex items-center gap-2 rounded-xl border border-[#293027]/10 dark:border-white/10 px-3 py-2">
                      <span className="flex-1 font-serif text-[#293027] dark:text-white truncate">{l?.title || l?.subject || id}</span>
                      <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full ${l?.status === 'sent' ? 'bg-green-50 text-green-600' : 'bg-[#BA7B39]/15 text-[#8B4A2F]'}`}>{statutLettre[l?.status || 'draft'] || 'Brouillon'}</span>
                      <GhostButton onClick={() => onOpen(id)} title="Ouvrir dans le composeur"><i className="fa-solid fa-pen" /></GhostButton>
                      <DangerButton onClick={() => majPhase(p.n, { lettres: (p.lettres || []).filter(x => x !== id) })} title="Retirer de la phase"><i className="fa-solid fa-xmark" /></DangerButton>
                    </div>
                  );
                })}
                <div className="flex gap-2">
                  <select className="flex-1 rounded-xl border border-[#293027]/15 bg-white px-3 py-2 text-sm dark:bg-white/5 dark:text-white" value={choix[p.n] || ''} onChange={e => setChoix({ ...choix, [p.n]: e.target.value })}>
                    <option value="">Ajouter une lettre…</option>
                    {lettres.filter(l => !(p.lettres || []).includes(l.id!)).map(l => <option key={l.id} value={l.id}>{l.title || l.subject}</option>)}
                  </select>
                  <GhostButton disabled={!choix[p.n]} onClick={() => { majPhase(p.n, { lettres: [...(p.lettres || []), choix[p.n]] }); setChoix({ ...choix, [p.n]: '' }); }}><i className="fa-solid fa-plus" /></GhostButton>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <DangerButton onClick={() => { if (confirm(`Retirer la phase ${p.n} ?`)) setData({ ...data, phases: data.phases.filter(x => x.n !== p.n) }); }}><i className="fa-solid fa-trash" /> Retirer la phase</DangerButton>
          </div>
        </Card>
      ))}

      <div className="flex flex-wrap gap-3">
        <GhostButton onClick={ajouterPhase}><i className="fa-solid fa-plus" /> Ajouter une phase</GhostButton>
        <PrimaryButton onClick={enregistrer}><i className="fa-solid fa-floppy-disk" /> Enregistrer</PrimaryButton>
      </div>
    </div>
  );
};

export default LancementPanel;
