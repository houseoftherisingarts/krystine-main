import React, { useEffect, useMemo, useState } from 'react';
import { getNewsletters, nouvelleLettreDepuis, type NewsletterDoc } from '../../../../firebase/firestore';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { getFormations, type Formation } from '../../../../firebase/formations';
import {
  ecouterSequences, ecouterInscrits, creerSequence, enregistrerSequence, supprimerSequence,
  marquerLettreSequence, testerSequence, compterInscrits, type Sequence, type Etape, type Inscrit, type StrategieSequence,
} from '../../../../firebase/sequences';
import { libelleTag } from '../../../../lib/paliers';
import RelectureSequence, { estApprouvee } from './RelectureSequence';
import { Card, Input, Label, PrimaryButton, GhostButton, DangerButton, ToggleSwitch, EmptyState, Textarea } from '../../primitives';

// La réflexion avant les lettres (Krystine, 27 sept. 2026) : pourquoi la
// séquence existe, pour qui, ce qu'elle promet, où elle mène, comment nous
// saurons qu'elle marche. Les lettres s'écrivent ensuite, étape par étape.
const CHAMPS_STRATEGIE: { cle: keyof StrategieSequence; libelle: string; aide: string }[] = [
  { cle: 'intention', libelle: 'Pourquoi cette séquence', aide: 'Ce que nous voulons offrir à ces personnes.' },
  { cle: 'pourQui', libelle: 'Pour qui', aide: 'Ce qu’elles vivent quand elles cochent ce carré.' },
  { cle: 'promesse', libelle: 'Ce qu’elles vont recevoir', aide: 'Le fil des lettres, en une phrase.' },
  { cle: 'destination', libelle: 'Où elle mène', aide: 'La porte ouverte à la fin (sans pression).' },
  { cle: 'mesure', libelle: 'Comment nous saurons que cela marche', aide: 'Ce que nous regarderons dans l’Analyse.' },
  { cle: 'notes', libelle: 'Notes', aide: 'Idées, histoires, épisodes, témoignages à placer.' },
];

// Les séquences : une suite de lettres qui partent toutes seules, à tant de
// jours après l'entrée d'une personne. La première sert l'accueil d'une
// acheteuse de l'Expérience Origine 2 (plan KSL Automne 2026, chantier 1).
// Chaque étape est une infolettre du composeur : Krystine l'écrit et la
// relit là où elle écrit tout le reste, la séquence ne fait que la porter.

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'etape';
// Les carrés qu'une lectrice peut cocher (dans une lettre ou sur /mes-choix) :
// chacun peut faire entrer une personne dans une séquence (27 sept. 2026).
const ETIQUETTES = ['interet-choisir', 'interet-rythme', 'interet-rester-entiere', 'interet-relier', 'preference-autonomie', 'preference-accompagnement'];
const delaiLisible = (h: number) => (h === 0 ? 'tout de suite' : h % 24 === 0 ? `${h / 24} jour${h / 24 > 1 ? 's' : ''} après` : `${h} h après`);

// La séquence ouverte se garde le temps d'un aller-retour au composeur.
let derniereSequence: string | null = null;

const SequencesPanel: React.FC<{ onOpen: (id: string) => void }> = ({ onOpen }) => {
  const [seqs, setSeqs] = useState<Sequence[]>([]);
  const [lettres, setLettres] = useState<NewsletterDoc[]>([]);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [courante, setCourante] = useState<string | null>(derniereSequence);
  useEffect(() => { derniereSequence = courante; }, [courante]);
  const [brouillon, setBrouillon] = useState<Sequence | null>(null);
  const [inscrits, setInscrits] = useState<Inscrit[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [compte, setCompte] = useState<Record<string, number>>({});
  // La réflexion d'ensemble, au-dessus de toutes les séquences (admin seulement).
  const [carte, setCarte] = useState('');
  const [carteOuverte, setCarteOuverte] = useState(true);
  const [carteMsg, setCarteMsg] = useState<string | null>(null);
  useEffect(() => { if (db) getDoc(doc(db, 'analyseInfolettre', '_strategie')).then(d => setCarte(String(d.data()?.contenu || ''))).catch(() => {}); }, []);
  const garderCarte = async () => {
    if (!db) return;
    await setDoc(doc(db, 'analyseInfolettre', '_strategie'), { contenu: carte, maj: serverTimestamp() }, { merge: true });
    setCarteMsg('Enregistré.'); window.setTimeout(() => setCarteMsg(null), 2000);
  };

  useEffect(() => ecouterSequences(s => { setSeqs(s); setCourante(c => c || s[0]?.id || null); }), []);
  useEffect(() => { getNewsletters().then(setLettres); getFormations().then(setFormations); }, []);
  const idsSeqs = seqs.map(s => s.id).join(',');
  useEffect(() => {
    for (const s of seqs) compterInscrits(s.id).then(n => setCompte(c => ({ ...c, [s.id]: n }))).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsSeqs]);
  useEffect(() => { if (courante) setCompte(c => ({ ...c, [courante]: inscrits.length })); }, [courante, inscrits.length]);
  useEffect(() => { if (!courante) return; return ecouterInscrits(courante, setInscrits); }, [courante]);
  // Le brouillon local suit la séquence choisie, jusqu'à ce qu'on l'enregistre.
  useEffect(() => { setBrouillon(seqs.find(s => s.id === courante) || null); }, [courante, seqs]);

  // La relecture : combien de lettres de la séquence sont approuvées.
  const lettresSeq = (brouillon?.etapes || []).filter(e => e.newsletterId).map(e => lettres.find(l => l.id === e.newsletterId));
  const nbApprouvees = lettresSeq.filter(estApprouvee).length;
  const nbARelire = lettresSeq.length - nbApprouvees;

  const lettresChoisissables = useMemo(() => lettres.filter(l => l.status !== 'sending'), [lettres]);

  const maj = (patch: Partial<Sequence>) => setBrouillon(b => (b ? { ...b, ...patch } : b));
  const majEtape = (i: number, patch: Partial<Etape>) => maj({ etapes: (brouillon?.etapes || []).map((e, j) => (j === i ? { ...e, ...patch } : e)) });

  const enregistrer = async () => {
    if (!brouillon) return;
    setOccupe(true); setMessage(null);
    try {
      const etapes = (brouillon.etapes || []).map(e => ({ ...e, cle: e.cle || slug(e.titre || 'etape'), delaiHeures: Math.max(0, Number(e.delaiHeures) || 0) }));
      await enregistrerSequence(brouillon.id, { titre: brouillon.titre, actif: !!brouillon.actif, declencheur: brouillon.declencheur, etapes, strategie: brouillon.strategie || {} });
      for (const e of etapes) if (e.newsletterId) await marquerLettreSequence(e.newsletterId).catch(() => {});
      setMessage('Séquence enregistrée.');
      getNewsletters().then(setLettres);
    } catch (e: any) { setMessage(e?.message || 'Échec de l\'enregistrement.'); }
    finally { setOccupe(false); }
  };

  // « Créer la lettre » : un brouillon neuf dans le composeur, avec l'en-tête de
  // la dernière lettre générale, rattaché à l'étape et enregistré tout de suite.
  const creerLettre = async (i: number) => {
    if (!brouillon) return;
    const e = (brouillon.etapes || [])[i];
    const modele = lettres.find(l => l.status === 'sent' && l.role !== 'sequence') || lettres[0];
    setOccupe(true); setMessage(null);
    try {
      const id = await nouvelleLettreDepuis({ ...(modele || {}), subject: e.titre || '', preheader: '', blocks: [], audience: { mode: 'all' } } as any, `Séquence · ${brouillon.titre} · ${e.titre || `étape ${i + 1}`}`);
      const etapes = (brouillon.etapes || []).map((x, j) => (j === i ? { ...x, newsletterId: id, cle: x.cle || slug(x.titre || `etape-${i + 1}`) } : x));
      await enregistrerSequence(brouillon.id, { titre: brouillon.titre, actif: !!brouillon.actif, declencheur: brouillon.declencheur, etapes, strategie: brouillon.strategie || {} });
      await marquerLettreSequence(id).catch(() => {});
      maj({ etapes });
      getNewsletters().then(setLettres);
      onOpen(id);
    } catch (err: any) { setMessage(err?.message || 'La lettre n’a pas pu être créée.'); }
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

  // Les séquences rangées par programme (Krystine, 30 sept. 2026) : Vata,
  // Expérience Origine 2, puis ce qui ne dépend d'aucun programme.
  const programmeDe = (s: Sequence): string => {
    const d = s.declencheur;
    if (d?.type === 'achat') {
      if (d.formationId === 'kajabi-2148687644') return 'Vata';
      if (d.formationId === 'origine2') return 'Expérience Origine 2';
      return formations.find(f => f.id === d.formationId)?.titre || d.formationId;
    }
    if (d?.type === 'etiquette') {
      if (['interet-rythme', 'preference-autonomie'].includes(d.tag)) return 'Vata';
      if (['interet-rester-entiere', 'preference-accompagnement'].includes(d.tag)) return 'Expérience Origine 2';
    }
    return 'Accueil et général';
  };
  const ORDRE_PROGRAMMES = ['Vata', 'Expérience Origine 2'];
  const groupes = (() => {
    const m = new Map<string, Sequence[]>();
    for (const s of seqs) { const g = programmeDe(s); m.set(g, [...(m.get(g) || []), s]); }
    return [...m.entries()].sort(([a], [b]) => {
      const ia = ORDRE_PROGRAMMES.indexOf(a), ib = ORDRE_PROGRAMMES.indexOf(b);
      if (a === 'Accueil et général') return 1;
      if (b === 'Accueil et général') return -1;
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
    });
  })();
  const [groupesOuverts, setGroupesOuverts] = useState<Record<string, boolean>>({});
  const ouvertG = (g: string, liste: Sequence[]) => groupesOuverts[g] ?? liste.some(x => x.id === courante);

  const declencheurTexte = (s: Sequence) => {
    if (s.declencheur?.type === 'etiquette') return `Quand une personne coche « ${libelleTag(s.declencheur.tag)} »`;
    if (s.declencheur?.type !== 'achat') return 'À la main seulement';
    const fid = s.declencheur.formationId;
    return `À l'achat de « ${formations.find(f => f.id === fid)?.titre || fid} »`;
  };

  return (
    <div className="space-y-6">
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-serif text-xl text-[#293027] dark:text-white">La réflexion d’ensemble</h3>
        <GhostButton onClick={() => setCarteOuverte(o => !o)}>{carteOuverte ? 'Replier' : 'Déplier'}</GhostButton>
      </div>
      {carteOuverte && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-[#293027]/55 dark:text-white/55">La carte de toutes les séquences : quels motifs, quel ordre, quelles portes, et comment elles se relient à la lettre générale. Réservé à l’admin.</p>
          <Textarea rows={12} value={carte} onChange={e => setCarte(e.target.value)} />
          <div className="flex items-center gap-3"><GhostButton onClick={garderCarte}><i className="fa-solid fa-floppy-disk" /> Enregistrer la réflexion</GhostButton>{carteMsg && <span className="text-xs text-[#7d6330]">{carteMsg}</span>}</div>
        </div>
      )}
    </Card>
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-3">
        <PrimaryButton onClick={nouvelle} className="w-full"><i className="fa-solid fa-plus" /> Nouvelle séquence</PrimaryButton>
        <Card className="p-2">
          {seqs.length === 0 && <p className="px-3 py-4 text-sm text-[#293027]/60 dark:text-white/60">Aucune séquence encore.</p>}
          {groupes.map(([g, liste]) => {
            const ouvert = ouvertG(g, liste);
            const actives = liste.filter(x => x.actif).length;
            return (
              <div key={g} className="mb-1">
                <button type="button" onClick={() => setGroupesOuverts(o => ({ ...o, [g]: !ouvert }))}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left hover:bg-[#BA7B39]/10">
                  <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#8B4A2F] dark:text-[#d9a05b]">
                    <i className={`fa-solid fa-chevron-right text-[9px] transition-transform ${ouvert ? 'rotate-90' : ''}`} />{g}
                  </span>
                  <span className="text-[11px] text-[#293027]/50 dark:text-white/50">{liste.length} séquence{liste.length > 1 ? 's' : ''}{actives ? ` · ${actives} active${actives > 1 ? 's' : ''}` : ''}</span>
                </button>
                {ouvert && (
                  <div className="space-y-1 pb-2 pl-3">
                    {liste.map(s => (
                    <button key={s.id} onClick={() => setCourante(s.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-colors ${courante === s.id ? 'bg-[#141311] text-[#EEE7DB]' : 'hover:bg-[#BA7B39]/10 text-[#293027] dark:text-white'}`}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-serif text-lg">{s.titre}</span>
                        <span className={`text-[10px] uppercase tracking-widest font-bold ${s.actif ? 'text-[#e0b060]' : courante === s.id ? 'text-white/50' : 'text-[#293027]/40'}`}>{s.actif ? 'Active' : 'En pause'}</span>
                      </div>
                      <div className={`text-[11px] ${courante === s.id ? 'text-white/60' : 'text-[#293027]/50 dark:text-white/50'}`}>{(s.etapes || []).length} étape{(s.etapes || []).length > 1 ? 's' : ''} · {compte[s.id] ?? '…'} inscrite{(compte[s.id] || 0) > 1 ? 's' : ''} · {declencheurTexte(s)}</div>
                    </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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
            {lettresSeq.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="font-semibold text-[#293027] dark:text-white"><i className="fa-solid fa-envelope-circle-check mr-2 text-[#8B4A2F]" />{nbApprouvees} lettre{nbApprouvees > 1 ? 's' : ''} approuvée{nbApprouvees > 1 ? 's' : ''} sur {lettresSeq.length}</span>
                {nbARelire > 0 && <span className="text-[#8B4A2F] dark:text-[#e0b060]">{nbARelire} lettre{nbARelire > 1 ? 's ne sont' : ' n’est'} pas encore approuvée{nbARelire > 1 ? 's' : ''}{brouillon.actif ? ' et la séquence est active.' : '.'}</span>}
              </div>
            )}
            <div>
              <Label>Ce qui fait entrer une personne dans la séquence</Label>
              <select
                className="w-full rounded-xl border border-[#293027]/15 bg-white px-3 py-2 text-sm dark:bg-white/5 dark:text-white"
                value={brouillon.declencheur?.type === 'achat' ? `achat:${brouillon.declencheur.formationId}` : brouillon.declencheur?.type === 'etiquette' ? `etiquette:${brouillon.declencheur.tag}` : 'manuel'}
                onChange={e => {
                  const v = e.target.value;
                  maj({ declencheur: v === 'manuel' ? { type: 'manuel' } : v.startsWith('etiquette:') ? { type: 'etiquette', tag: v.slice(10) } : { type: 'achat', formationId: v.slice(6) } });
                }}>
                <option value="manuel">À la main seulement (bouton « Inscrire une adresse »)</option>
                <optgroup label="Quand une personne coche :">
                  {ETIQUETTES.map(t => <option key={t} value={`etiquette:${t}`}>{libelleTag(t)}</option>)}
                </optgroup>
                <optgroup label="Quand une personne achète :">
                  {formations.filter(f => f.paywall).map(f => <option key={f.id} value={`achat:${f.id}`}>L'achat de « {f.titre} »</option>)}
                </optgroup>
              </select>
              <p className="mt-1 text-[11px] text-[#293027]/50 dark:text-white/50">
                {brouillon.declencheur?.type === 'etiquette'
                  ? 'La personne qui coche ce carré (dans une lettre ou sur la page de ses choix) entre une seule fois dans la séquence. La première lettre part au plus tôt une heure après, et chaque lettre vérifie avant de partir que la personne est encore abonnée et porte encore ce choix. Jamais deux lettres à moins de 48 heures.'
                  : 'L\'achat par Stripe inscrit l\'acheteuse et envoie tout de suite ce qui est à « tout de suite ». Le reste part au fil des jours, un passage toutes les quinze minutes, jamais à moins de 48 heures d\'une autre lettre.'}
              </p>
            </div>
          </Card>

          <RelectureSequence key={brouillon.id} sequenceId={brouillon.id} etapes={brouillon.etapes || []} lettres={lettres} onOpen={onOpen} onChange={() => getNewsletters().then(setLettres)} />

          <Card className="p-5 space-y-4">
            <h3 className="font-serif text-xl text-[#293027] dark:text-white">La réflexion de cette séquence</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {CHAMPS_STRATEGIE.map(c => (
                <div key={c.cle} className={c.cle === 'notes' ? 'md:col-span-2' : ''}>
                  <Label>{c.libelle}</Label>
                  <Textarea rows={c.cle === 'notes' ? 5 : 3} value={brouillon.strategie?.[c.cle] || ''} placeholder={c.aide}
                    onChange={e => maj({ strategie: { ...(brouillon.strategie || {}), [c.cle]: e.target.value } })} />
                </div>
              ))}
            </div>
            <p className="text-xs text-[#293027]/55 dark:text-white/55">Enregistrée avec la séquence (bouton « Enregistrer » plus bas).</p>
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
                  {!e.newsletterId && <GhostButton onClick={() => creerLettre(i)} disabled={occupe} title="Créer la lettre de cette étape dans le composeur"><i className="fa-solid fa-feather" /> Créer la lettre</GhostButton>}
                  {e.newsletterId && e.cle && <GhostButton onClick={() => tester(e)} disabled={occupe} title="Envoyer cette étape tout de suite à une adresse"><i className="fa-solid fa-paper-plane" /></GhostButton>}
                  <DangerButton onClick={() => maj({ etapes: (brouillon.etapes || []).filter((_, j) => j !== i) })} title="Retirer l'étape"><i className="fa-solid fa-trash" /></DangerButton>
                </div>
                <div className="md:col-span-4">
                  <Textarea rows={2} value={e.intention || ''} placeholder="L’intention de cette lettre : ce qu’elle doit faire vivre, l’histoire ou l’épisode à y mettre." onChange={ev => majEtape(i, { intention: ev.target.value })} />
                </div>
                {e.cle && <div className="md:col-span-4 text-[11px] text-[#8B4A2F]">{brouillon.stats?.[e.cle] || 0} envoi{(brouillon.stats?.[e.cle] || 0) > 1 ? 's' : ''} jusqu'ici</div>}
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
                        <td className="py-2 pr-4 text-[#293027] dark:text-white">{p.firstName ? `${p.firstName} · ` : ''}{p.email}{p.sortie && <span className="ml-2 text-[10px] uppercase tracking-widest text-[#293027]/50 dark:text-white/50" title={p.sortie.raison === 'desabonnee' ? 'Désabonnée depuis son entrée : plus rien ne lui part.' : 'Son choix a été retiré (souvent un robot de sécurité) : plus rien ne lui part.'}>sortie</span>}</td>
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
    </div>
  );
};

export default SequencesPanel;
