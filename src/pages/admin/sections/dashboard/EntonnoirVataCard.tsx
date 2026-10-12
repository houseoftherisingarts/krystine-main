import React, { useEffect, useState } from 'react';
import { doc, getDoc, type Timestamp } from 'firebase/firestore';
import { httpsCallable, getFunctions } from 'firebase/functions';
import app, { db } from '../../../../firebase';
import { Card, GhostButton } from '../../primitives';

// Le chemin vers VATA Essentiel (Krystine, 12 oct. 2026) : du quiz jusqu'à
// l'achat, une marche par étape, avec la part de personnes qui passent à la
// suivante. Calculé chaque matin à 6 h 20 dans sante/entonnoirVata
// (functions/src/entonnoirVata.ts); « Refaire maintenant » le recalcule.

interface Lettre { cle: string; titre: string; envoyees: number; ouvertes: number; cliquees: number }
interface Serie { nom: string; entrees: number; sorties: number; lettres: Lettre[]; visites: number; ventes: number }
interface Periode {
  de: string; a: string;
  quizCommences: number; resultatsVus: number; resultatsEnregistres: number;
  entreesSeries: number; series: Serie[];
  visitesDepuisLettres: number; vuesVata: number; luesJusquAuBas: number;
  vuesPaiement: number; formulairesPaiement: number; departsVersLaCaisse: number;
  ventes: { n: number; montant: number; detail: { le: string; prenom: string; chemin: string; montant: number }[] };
}
interface Entonnoir { le?: Timestamp; septJours?: Periode; trenteJours?: Periode }

const argent = (d: number) => d.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' });
const jourCourt = (j: string) => new Date(`${j}T12:00:00`).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' });
const COULEUR: Record<string, string> = { Vent: '#4F7A55', Feu: '#B5523B', Terre: '#3F6489' };

const Marche: React.FC<{ nom: string; n: number; avant?: number; note?: string; max: number }> = ({ nom, n, avant, note, max }) => {
  const part = avant ? Math.round((n / avant) * 100) : null;
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-2">
      <div className="min-w-0">
        <p className="text-[13px] text-[#293027] dark:text-white">{nom}</p>
        {note && <p className="text-[11px] text-[#293027]/55 dark:text-white/50">{note}</p>}
        <div className="mt-1.5 h-1.5 rounded-full bg-[#293027]/[0.06] dark:bg-white/[0.08]">
          <div className="h-1.5 rounded-full bg-[#BA7B39]" style={{ width: `${max ? Math.max(2, Math.round((n / max) * 100)) : 0}%` }} />
        </div>
      </div>
      <div className="text-right">
        <p className="font-serif text-xl leading-none text-[#293027] dark:text-white">{n}</p>
        {part !== null && <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[#BA7B39]">{part} % passent</p>}
      </div>
    </li>
  );
};

const EntonnoirVataCard: React.FC = () => {
  const [data, setData] = useState<Entonnoir | null | undefined>(undefined);
  const [periode, setPeriode] = useState<'septJours' | 'trenteJours'>('septJours');
  const [occupe, setOccupe] = useState(false);

  const lire = () => {
    if (!db) { setData(null); return; }
    getDoc(doc(db, 'sante', 'entonnoirVata')).then(s => setData(s.exists() ? (s.data() as Entonnoir) : null)).catch(() => setData(null));
  };
  useEffect(lire, []);

  const refaire = async () => {
    if (!app) return;
    setOccupe(true);
    try { await httpsCallable(getFunctions(app, 'us-central1'), 'lancerEntonnoirVata', { timeout: 300_000 })({}); lire(); }
    catch { /* le calcul précédent reste affiché */ }
    finally { setOccupe(false); }
  };

  const p = data?.[periode];
  const quand = data?.le?.toDate?.().toLocaleString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  const lettresEnvoyees = p ? p.series.reduce((n, s) => n + s.lettres.reduce((m, l) => m + l.envoyees, 0), 0) : 0;
  const lettresOuvertes = p ? p.series.reduce((n, s) => n + s.lettres.reduce((m, l) => m + l.ouvertes, 0), 0) : 0;
  const lettresCliquees = p ? p.series.reduce((n, s) => n + s.lettres.reduce((m, l) => m + l.cliquees, 0), 0) : 0;

  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#293027]/60 dark:text-white/60">Le chemin vers VATA Essentiel</h3>
          <p className="text-[12px] text-[#38403a]/60 dark:text-white/50">
            {data === undefined ? 'Lecture…' : p ? `Du ${jourCourt(p.de)} au ${jourCourt(p.a)}. Calculé le ${quand}, puis chaque matin vers 6 h 20.` : 'Pas encore calculé : cliquez sur « Refaire maintenant ».'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['septJours', 'trenteJours'] as const).map(k => (
            <GhostButton key={k} onClick={() => setPeriode(k)} disabled={periode === k}>{k === 'septJours' ? '7 jours' : '30 jours'}</GhostButton>
          ))}
          <GhostButton onClick={refaire} disabled={occupe}>
            <i className={`fa-solid ${occupe ? 'fa-spinner fa-spin' : 'fa-rotate'}`} /> {occupe ? 'Calcul en cours' : 'Refaire maintenant'}
          </GhostButton>
        </div>
      </div>

      {p && (
        <div className="grid gap-8 lg:grid-cols-2">
          <ol className="divide-y divide-[#293027]/[0.06] dark:divide-white/[0.06]">
            <Marche nom="Quiz commencés" n={p.quizCommences} max={p.quizCommences} />
            <Marche nom="Résultats vus" n={p.resultatsVus} avant={p.quizCommences} max={p.quizCommences} />
            <Marche nom="Résultats enregistrés (courriel laissé)" n={p.resultatsEnregistres} max={p.quizCommences} />
            <Marche nom="Entrées dans une série de lettres" n={p.entreesSeries} avant={p.resultatsEnregistres} max={p.quizCommences} note="Vent, Feu ou Terre, selon le résultat" />
            <Marche nom="Lettres envoyées" n={lettresEnvoyees} max={Math.max(p.quizCommences, lettresEnvoyees)} />
            <Marche nom="Lettres ouvertes" n={lettresOuvertes} avant={lettresEnvoyees} max={Math.max(p.quizCommences, lettresEnvoyees)} note="Lectures réelles, robots exclus; comptées depuis le 11 octobre" />
            <Marche nom="Lettres cliquées" n={lettresCliquees} avant={lettresOuvertes} max={Math.max(p.quizCommences, lettresEnvoyees)} note="Comptées depuis le 12 octobre" />
            <Marche nom="Visites venues des lettres" n={p.visitesDepuisLettres} max={Math.max(p.quizCommences, lettresEnvoyees)} />
            <Marche nom="Vues de la page /vata" n={p.vuesVata} max={Math.max(p.quizCommences, lettresEnvoyees)} note={`${p.luesJusquAuBas} lue(s) jusqu'en bas`} />
            <Marche nom="Vues de la page de paiement" n={p.vuesPaiement} avant={p.vuesVata} max={Math.max(p.quizCommences, lettresEnvoyees)} />
            <Marche nom="Départs vers la caisse Stripe" n={p.departsVersLaCaisse} avant={p.vuesPaiement} max={Math.max(p.quizCommences, lettresEnvoyees)} />
            <Marche nom="Achats de VATA Essentiel" n={p.ventes.n} avant={p.departsVersLaCaisse || undefined} max={Math.max(p.quizCommences, lettresEnvoyees)} note={p.ventes.n ? argent(p.ventes.montant) + ', taxes comprises' : undefined} />
          </ol>

          <div className="space-y-6">
            {p.ventes.detail.length > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#BA7B39]">Les achats</p>
                <ul className="space-y-1.5">
                  {p.ventes.detail.map((v, i) => (
                    <li key={i} className="text-[13px] text-[#293027] dark:text-white/85">{jourCourt(v.le)} · {v.prenom} · {v.chemin} · {argent(v.montant)}</li>
                  ))}
                </ul>
              </div>
            )}
            {p.series.map(s => (
              <div key={s.nom}>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: COULEUR[s.nom] }}>
                  Série {s.nom} · {s.entrees} entrée{s.entrees > 1 ? 's' : ''} · {s.visites} visite{s.visites > 1 ? 's' : ''} · {s.ventes} achat{s.ventes > 1 ? 's' : ''}
                </p>
                <table className="w-full text-[12px] text-[#293027] dark:text-white/80">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-[0.1em] text-[#293027]/50 dark:text-white/50">
                      <th className="py-1 text-left font-normal">Lettre</th><th className="text-right font-normal">Envoyées</th><th className="text-right font-normal">Ouvertes</th><th className="text-right font-normal">Cliquées</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.lettres.map(l => (
                      <tr key={l.cle} className="border-t border-[#293027]/[0.06] dark:border-white/[0.06]">
                        <td className="py-1 pr-2">{l.titre}</td><td className="text-right">{l.envoyees}</td><td className="text-right">{l.ouvertes}</td><td className="text-right">{l.cliquees}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default EntonnoirVataCard;
