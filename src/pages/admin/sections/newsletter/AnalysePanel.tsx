import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app, { db } from '../../../../firebase';
import { Card, EmptyState, GhostButton, PrimaryButton, Textarea } from '../../primitives';

// ─── L'analyse des envois (Krystine, 27 septembre 2026) ─────────────────────
// D'envoi en envoi : les vraies ouvertures, les délais, les heures, les clics
// des vraies personnes, les désabonnements et leurs raisons, les robots de
// sécurité (et ceux à prévoir), avec les conclusions écrites au fil des envois.
// Les chiffres viennent de la fonction analyserInfolettres, rangés dans
// analyseInfolettre/{id} (réservé à l'admin).

interface Analyse {
  envoyeeLe?: { toDate: () => Date };
  calculeLe?: { toDate: () => Date };
  destinataires: number; livrees: number; rebonds: number;
  ouverturesHumaines: number; ouverturesAutomatiques: number; tauxOuverture: number;
  delais: { moinsUneHeure: number; uneASixHeures: number; sixAVingtQuatre: number; plusDUnJour: number };
  heures: Record<string, number>;
  personnesQuiCliquent: number; clicsParLien: Record<string, number>;
  robots: number; domainesRobots: Record<string, number>;
  desabonnements: number; raisonsDepart: Record<string, number>; choixEnvoyes: number;
}
interface Fiche { id: string; subject: string; analyse?: Analyse; conclusions?: string }
interface Robots { robotsDomaines?: Record<string, number>; prevision?: Record<string, number>; calculeLe?: { toDate: () => Date } }

const LIENS: Record<string, string> = {
  'carre:choisir': 'Carré · Choisir', 'carre:rythme': 'Carré · Retrouver mon rythme', 'carre:rester-entiere': 'Carré · Rester entière', 'carre:relier': 'Carré · Relier',
  'facon:autonomie': 'Façon · Avancer à ma façon', 'facon:accompagnement': 'Façon · Être accompagnée',
  '/podcast': 'Le podcast', '/': 'Le site (en-tête)', '/mes-choix': 'Page de choix', '/politique-de-confidentialite': 'Politique de confidentialité', '/foyer': 'Le Foyer', '/formations': 'Formations', '/vata': 'Programme Vata', '/medias': 'Médias et livres',
};
const RAISONS: Record<string, string> = { 'trop-de-courriels': 'Trop de courriels', contenu: 'Le contenu ne parle plus', 'pas-inscrite': 'Ne se souvient pas de s’être inscrite', autrement: 'Préfère suivre autrement', autre: 'Autre' };
const pct = (a: number, b: number) => (b ? `${Math.round((1000 * a) / b) / 10} %` : '—');
const date = (d?: Date) => d ? `${d.toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' })} à ${d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}` : '—';

const Barres: React.FC<{ valeurs: [string, number][]; total?: number }> = ({ valeurs, total }) => {
  const max = Math.max(1, ...valeurs.map(v => v[1]));
  return (
    <div className="space-y-1.5">
      {valeurs.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[minmax(0,13rem)_1fr_3.5rem] items-center gap-3 text-xs">
          <span className="truncate text-[#293027]/75 dark:text-white/75">{k}</span>
          <span className="h-2 rounded-full bg-[#293027]/8 dark:bg-white/10 overflow-hidden"><span className="block h-full rounded-full bg-[#BA7B39]" style={{ width: `${(100 * v) / max}%` }} /></span>
          <span className="text-right tabular-nums text-[#293027] dark:text-white">{v}{total ? <span className="text-[#293027]/45 dark:text-white/45"> · {pct(v, total)}</span> : null}</span>
        </div>
      ))}
    </div>
  );
};

const AnalysePanel: React.FC = () => {
  const [fiches, setFiches] = useState<Fiche[]>([]);
  const [robots, setRobots] = useState<Robots>({});
  const [etat, setEtat] = useState<'charge' | 'pret' | 'calcul' | 'erreur'>('charge');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [enregistre, setEnregistre] = useState<string | null>(null);

  const charger = async () => {
    if (!db) return;
    const snap = await getDocs(collection(db, 'analyseInfolettre'));
    const liste: Fiche[] = []; let r: Robots = {};
    snap.forEach(d => { if (d.id === '_robots') r = d.data() as Robots; else liste.push({ id: d.id, ...(d.data() as Omit<Fiche, 'id'>) }); });
    liste.sort((a, b) => (b.analyse?.envoyeeLe?.toDate().getTime() || 0) - (a.analyse?.envoyeeLe?.toDate().getTime() || 0));
    setFiches(liste); setRobots(r);
    setNotes(Object.fromEntries(liste.map(f => [f.id, f.conclusions || ''])));
    setEtat('pret');
  };
  useEffect(() => { charger().catch(() => setEtat('erreur')); }, []);

  const actualiser = async () => {
    if (!app) return;
    setEtat('calcul');
    try { await httpsCallable(getFunctions(app, 'us-central1'), 'analyserInfolettres')({}); await charger(); }
    catch { setEtat('erreur'); }
  };
  const garder = async (id: string) => {
    if (!db) return;
    await setDoc(doc(db, 'analyseInfolettre', id), { conclusions: notes[id] || '', conclusionsLe: serverTimestamp() }, { merge: true });
    setEnregistre(id); window.setTimeout(() => setEnregistre(null), 2000);
  };

  // Les pistes pour le prochain envoi, déduites des chiffres.
  const pistes = useMemo(() => {
    const a = fiches.filter(f => f.analyse).map(f => f.analyse as Analyse);
    if (!a.length) return [] as string[];
    const out: string[] = [];
    const [der, prec] = a;
    if (prec) out.push(`Vraies ouvertures : ${der.tauxOuverture} % pour la dernière lettre, contre ${prec.tauxOuverture} % pour la précédente.`);
    const heures: Record<string, number> = {};
    a.forEach(x => Object.entries(x.heures || {}).forEach(([h, n]) => { heures[h] = (heures[h] || 0) + n; }));
    const meilleures = Object.entries(heures).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([h]) => `${h} h`);
    if (meilleures.length) out.push(`Les vraies lectures arrivent surtout vers ${meilleures.join(', ')} (heure du Québec), toutes lettres confondues.`);
    const rapides = der.delais.moinsUneHeure + der.delais.uneASixHeures;
    if (der.ouverturesHumaines) out.push(`${pct(rapides, der.ouverturesHumaines)} des vraies lectures de la dernière lettre sont arrivées dans les six heures.`);
    if (der.livrees && der.desabonnements / der.livrees > 0.005) out.push(`Attention : ${pct(der.desabonnements, der.livrees)} de désabonnements sur la dernière lettre, au-dessus du seuil de 0,5 %. Espacer les envois ou mieux cibler.`);
    else out.push(`Désabonnements sous le seuil de 0,5 % (${pct(der.desabonnements, der.livrees)}).`);
    if (der.destinataires && der.rebonds / der.destinataires > 0.02) out.push(`Rebonds à ${pct(der.rebonds, der.destinataires)} : nettoyer les adresses mortes avant le prochain envoi.`);
    if (der.robots) out.push(`${der.robots} robots de sécurité ont cliqué tous les liens : ils sont écartés des clics et des étiquettes d’intérêt.`);
    return out;
  }, [fiches]);

  const prevision = Object.entries(robots.prevision || {}).sort((a, b) => b[1] - a[1]);
  const totalPrevision = prevision.reduce((s, [, n]) => s + n, 0);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl text-[#293027] dark:text-white">Analyse des envois</h2>
            <p className="text-xs text-[#293027]/55 dark:text-white/55 mt-1">
              D’envoi en envoi : ce qui touche, quand, et ce qu’il faut ajuster. {fiches[0]?.analyse?.calculeLe ? `Chiffres calculés le ${date(fiches[0].analyse.calculeLe.toDate())}.` : ''}
            </p>
          </div>
          <PrimaryButton onClick={actualiser} disabled={etat === 'calcul'}>{etat === 'calcul' ? 'Calcul en cours…' : 'Actualiser les chiffres'}</PrimaryButton>
        </div>
        {etat === 'erreur' && <p className="mt-3 text-sm text-red-600">Le calcul n’a pas abouti. Réessayez dans un instant.</p>}
      </Card>

      {etat === 'charge' ? <p className="text-sm text-[#293027]/60">Chargement…</p> : !fiches.length ? (
        <EmptyState icon="fa-chart-line">Aucune analyse pour l’instant. Cliquez sur « Actualiser les chiffres ».</EmptyState>
      ) : (
        <>
          <Card className="p-6">
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#293027]/60 dark:text-white/60 mb-4">D’envoi en envoi</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-widest text-[#293027]/55 dark:text-white/55">
                  <tr><th className="text-left py-2 pr-4">Lettre</th><th className="text-right px-2">Livrées</th><th className="text-right px-2">Vraies lectures</th><th className="text-right px-2">Personnes qui cliquent</th><th className="text-right px-2">Désabonnements</th><th className="text-right px-2">Rebonds</th><th className="text-right pl-2">Robots</th></tr>
                </thead>
                <tbody>
                  {fiches.filter(f => f.analyse).map(f => { const a = f.analyse as Analyse; return (
                    <tr key={f.id} className="border-t border-[#293027]/8 dark:border-white/10">
                      <td className="py-2 pr-4"><div className="font-serif text-[#293027] dark:text-white">{f.subject}</div><div className="text-[11px] text-[#293027]/50 dark:text-white/50">{date(a.envoyeeLe?.toDate())}</div></td>
                      <td className="text-right px-2 tabular-nums">{a.livrees}</td>
                      <td className="text-right px-2 tabular-nums">{a.ouverturesHumaines} <span className="text-[#293027]/45">· {a.tauxOuverture} %</span></td>
                      <td className="text-right px-2 tabular-nums">{a.personnesQuiCliquent} <span className="text-[#293027]/45">· {pct(a.personnesQuiCliquent, a.livrees)}</span></td>
                      <td className="text-right px-2 tabular-nums">{a.desabonnements} <span className="text-[#293027]/45">· {pct(a.desabonnements, a.livrees)}</span></td>
                      <td className="text-right px-2 tabular-nums">{a.rebonds}</td>
                      <td className="text-right pl-2 tabular-nums">{a.robots}</td>
                    </tr>
                  ); })}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#293027]/60 dark:text-white/60 mb-3">Pistes pour le prochain envoi</h3>
              <ul className="space-y-2 text-sm text-[#293027] dark:text-white">{pistes.map((p, i) => <li key={i} className="flex gap-2"><span className="text-[#BA7B39]">•</span><span>{p}</span></li>)}</ul>
            </Card>
            <Card className="p-6">
              <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#293027]/60 dark:text-white/60 mb-1">Robots à prévoir</h3>
              <p className="text-xs text-[#293027]/55 dark:text-white/55 mb-3">
                {totalPrevision} abonnées actives reçoivent vos lettres sur des domaines où un robot de sécurité a déjà cliqué tous les liens (banques, universités, organisations). Leurs clics sont écartés d’office s’ils arrivent trop vite.
              </p>
              {prevision.length ? <Barres valeurs={prevision.slice(0, 12)} /> : <p className="text-sm text-[#293027]/55">Aucun domaine repéré pour l’instant.</p>}
            </Card>
          </div>

          {fiches.filter(f => f.analyse).map(f => { const a = f.analyse as Analyse; return (
            <Card key={f.id} className="p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-5">
                <h3 className="font-serif text-xl text-[#293027] dark:text-white">{f.subject}</h3>
                <span className="text-xs text-[#293027]/55 dark:text-white/55">Envoyée {date(a.envoyeeLe?.toDate())}</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                  ['Livrées', `${a.livrees} / ${a.destinataires}`],
                  ['Vraies lectures', `${a.ouverturesHumaines} · ${a.tauxOuverture} %`],
                  ['Personnes qui cliquent', `${a.personnesQuiCliquent}`],
                  ['Choix envoyés', `${a.choixEnvoyes}`],
                  ['Désabonnements', `${a.desabonnements}`],
                  ['Rebonds', `${a.rebonds}`],
                  ['Ouvertures automatiques', `${a.ouverturesAutomatiques}`],
                  ['Robots écartés', `${a.robots}`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-[#293027]/8 dark:border-white/10 px-4 py-3">
                    <div className="text-[10px] uppercase tracking-widest text-[#293027]/50 dark:text-white/50">{k}</div>
                    <div className="font-serif text-xl text-[#293027] dark:text-white mt-1 tabular-nums">{v}</div>
                  </div>
                ))}
              </div>
              <div className="grid lg:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-[10px] uppercase tracking-widest font-bold text-[#293027]/60 dark:text-white/60 mb-3">Où cliquent les vraies personnes</h4>
                  {Object.keys(a.clicsParLien || {}).length
                    ? <Barres valeurs={Object.entries(a.clicsParLien).sort((x, y) => y[1] - x[1]).map(([k, v]) => [LIENS[k] || k, v] as [string, number])} total={a.personnesQuiCliquent} />
                    : <p className="text-sm text-[#293027]/55">Aucun clic suivi pour cette lettre.</p>}
                </div>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] uppercase tracking-widest font-bold text-[#293027]/60 dark:text-white/60 mb-3">Quand elles lisent, après l’envoi</h4>
                    <Barres valeurs={[['Moins d’une heure', a.delais.moinsUneHeure], ['1 à 6 heures', a.delais.uneASixHeures], ['6 à 24 heures', a.delais.sixAVingtQuatre], ['Plus d’un jour', a.delais.plusDUnJour]]} total={a.ouverturesHumaines} />
                  </div>
                  {Object.keys(a.raisonsDepart || {}).length > 0 && (
                    <div>
                      <h4 className="text-[10px] uppercase tracking-widest font-bold text-[#293027]/60 dark:text-white/60 mb-3">Raisons des départs</h4>
                      <Barres valeurs={Object.entries(a.raisonsDepart).sort((x, y) => y[1] - x[1]).map(([k, v]) => [RAISONS[k] || k, v] as [string, number])} />
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-6">
                <h4 className="text-[10px] uppercase tracking-widest font-bold text-[#293027]/60 dark:text-white/60 mb-2">Conclusions</h4>
                <Textarea rows={6} value={notes[f.id] || ''} onChange={e => setNotes(n => ({ ...n, [f.id]: e.target.value }))} placeholder="Ce que cet envoi nous apprend, et ce que nous changerons au prochain." />
                <div className="mt-2 flex items-center gap-3">
                  <GhostButton onClick={() => garder(f.id)}><i className="fa-solid fa-floppy-disk" /> Enregistrer les conclusions</GhostButton>
                  {enregistre === f.id && <span className="text-xs text-[#7d6330]">Enregistré.</span>}
                </div>
              </div>
            </Card>
          ); })}
        </>
      )}
    </div>
  );
};

export default AnalysePanel;
