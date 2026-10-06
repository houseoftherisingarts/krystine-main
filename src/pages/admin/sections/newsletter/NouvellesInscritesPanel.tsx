import React, { useMemo } from 'react';
import { Card } from '../../primitives';
import { useNouvellesInscrites, type DonneesInscrites } from './nouvellesInscrites';

// ─── « Les nouvelles inscrites », en tête de l'onglet Infolettres ───────────
// Lisible sur un portable : texte de 15 px au moins, contraste fort, trois
// couleurs seulement (vert pour les vraies nouvelles, gris pour les déjà
// connues, cuivre pour les désabonnées). Le graphique est dessiné à la main
// (barres en HTML, ligne en SVG) : aucune bibliothèque à charger.

const VERT = '#28352F';
const GRIS = '#A7ADA6';
const CUIVRE = '#BA7B39';
const ENCRE = 'text-[#1c241e] dark:text-white';
const DOUX = 'text-[#1c241e]/75 dark:text-white/75';

const signe = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
const jourCourt = (jour: string) => new Date(`${jour}T12:00:00`).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });

const Chiffre: React.FC<{ titre: string; valeur: string; avant: string; ecart?: number }> = ({ titre, valeur, avant, ecart }) => (
  <div className="rounded-2xl border border-[#28352F]/15 dark:border-white/15 bg-white/70 dark:bg-white/5 px-5 py-4">
    <div className={`text-[15px] font-semibold ${DOUX}`}>{titre}</div>
    <div className="mt-1 font-serif text-[3.2rem] leading-none" style={{ color: VERT }}>{valeur}</div>
    <div className={`mt-2 text-[15px] ${DOUX}`}>
      {avant}
      {ecart !== undefined && ecart !== 0 && (
        <span className="ml-2 font-bold" style={{ color: ecart > 0 ? VERT : CUIVRE }}>
          <i className={`fa-solid ${ecart > 0 ? 'fa-arrow-up' : 'fa-arrow-down'} mr-1`} />{signe(ecart)}
        </span>
      )}
    </div>
  </div>
);

export const NouvellesInscritesVue: React.FC<{ donnees: DonneesInscrites }> = ({ donnees }) => {
  const { jours, dernieres } = donnees;
  const t = useMemo(() => {
    const somme = (de: number, a: number, f: (j: typeof jours[number]) => number) => jours.slice(de, a).reduce((s, j) => s + f(j), 0);
    const n = jours.length;
    const sem = somme(n - 7, n, j => j.nouvelles), semAvant = somme(n - 14, n - 7, j => j.nouvelles);
    const net = sem - somme(n - 7, n, j => j.desabonnees), netAvant = semAvant - somme(n - 14, n - 7, j => j.desabonnees);
    const max = Math.max(4, ...jours.map(j => Math.max(j.nouvelles + j.connues, j.desabonnees)));
    const pas = max <= 8 ? 2 : max <= 20 ? 5 : max <= 50 ? 10 : 20;
    return {
      auj: jours[n - 1].nouvelles, hier: jours[n - 2]?.nouvelles ?? 0, sem, semAvant, net, netAvant,
      haut: Math.ceil(max / pas) * pas, pas,
      total: somme(0, n, j => j.nouvelles), connues: somme(0, n, j => j.connues), desab: somme(0, n, j => j.desabonnees),
    };
  }, [jours]);

  const pct = (v: number) => `${(v / t.haut) * 100}%`;
  const graduations = Array.from({ length: t.haut / t.pas + 1 }, (_, i) => i * t.pas);
  const ligne = jours.map((j, i) => `${((i + 0.5) / jours.length) * 100},${100 - (j.desabonnees / t.haut) * 100}`).join(' ');

  return (
    <Card className="p-6 md:p-8 space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className={`font-serif text-3xl ${ENCRE}`}>Les nouvelles inscrites</h2>
          <p className={`mt-1 text-[15px] ${DOUX}`}>Les 30 derniers jours, mis à jour en direct.</p>
        </div>
        <p className={`text-[15px] ${DOUX}`}>
          Sur 30 jours : <b style={{ color: VERT }}>{t.total} vraies nouvelles</b> · {t.connues} déjà connues · <b style={{ color: CUIVRE }}>{t.desab} désabonnées</b>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Chiffre titre="Vraies nouvelles aujourd’hui" valeur={String(t.auj)} avant={`Hier : ${t.hier}`} />
        <Chiffre titre="Vraies nouvelles, 7 derniers jours" valeur={String(t.sem)} avant={`Semaine d’avant : ${t.semAvant}`} ecart={t.sem - t.semAvant} />
        <Chiffre titre="Solde de la semaine (nouvelles moins désabonnées)" valeur={signe(t.net)} avant={`Semaine d’avant : ${signe(t.netAvant)}`} ecart={t.net - t.netAvant} />
      </div>

      <div>
        <div className={`flex flex-wrap gap-x-6 gap-y-2 text-[15px] ${ENCRE}`}>
          <span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded-sm" style={{ background: VERT }} />Vraies nouvelles (adresse jamais vue avant)</span>
          <span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded-sm" style={{ background: GRIS }} />Déjà connues qui reviennent</span>
          <span className="inline-flex items-center gap-2"><span className="h-[3px] w-6 rounded" style={{ background: CUIVRE }} /><span className="-ml-4 mr-2 h-2.5 w-2.5 rounded-full" style={{ background: CUIVRE }} />Désabonnées</span>
        </div>

        <div className="mt-4 flex gap-2">
          {/* L'échelle à gauche */}
          <div className={`relative h-[260px] w-8 shrink-0 text-right text-[15px] ${DOUX}`}>
            {graduations.map(g => <span key={g} className="absolute right-0 translate-y-1/2 leading-none" style={{ bottom: pct(g) }}>{g}</span>)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="relative h-[260px] border-b-2 border-[#1c241e]/60 dark:border-white/50">
              {graduations.slice(1).map(g => <div key={g} className="absolute inset-x-0 border-t border-dashed border-[#1c241e]/15 dark:border-white/15" style={{ bottom: pct(g) }} />)}
              <div className="absolute inset-0 flex">
                {jours.map((j, i) => (
                  <div key={j.jour} className="group relative flex h-full flex-1 items-end justify-center px-[2px]"
                    title={`${jourCourt(j.jour)} : ${j.nouvelles} vraies nouvelles, ${j.connues} déjà connues, ${j.desabonnees} désabonnées`}>
                    {i === jours.length - 1 && <div className="absolute inset-0 rounded-t-md bg-[#BA7B39]/10" />}
                    <div className="relative flex w-full max-w-[26px] flex-col justify-end" style={{ height: pct(j.nouvelles + j.connues) }}>
                      {j.connues > 0 && <div className="w-full rounded-t-[3px]" style={{ height: `${(j.connues / (j.nouvelles + j.connues)) * 100}%`, background: GRIS }} />}
                      {j.nouvelles > 0 && <div className={`w-full ${j.connues ? '' : 'rounded-t-[3px]'}`} style={{ height: `${(j.nouvelles / (j.nouvelles + j.connues)) * 100}%`, background: VERT }} />}
                    </div>
                    {j.desabonnees > 0 && <span className="absolute z-10 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-[#293027] box-content" style={{ background: CUIVRE, bottom: `calc(${pct(j.desabonnees)} - 7px)` }} />}
                    {j.nouvelles > 0 && <span className="absolute z-10 rounded bg-[#f6f3ee] px-1 py-0.5 text-[15px] font-bold leading-none dark:bg-[#293027]" style={{ color: VERT, bottom: `calc(${pct(j.nouvelles + j.connues)} + 4px)` }}>{j.nouvelles}</span>}
                  </div>
                ))}
              </div>
              <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                <polyline points={ligne} fill="none" stroke={CUIVRE} strokeWidth={2.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
              </svg>
            </div>
            {/* Les dates, puis le solde de chaque jour */}
            <div className="mt-2 flex">
              {jours.map((j, i) => (
                <div key={j.jour} className={`flex-1 text-center text-[15px] leading-tight ${i === jours.length - 1 ? 'font-bold ' + ENCRE : DOUX}`}>
                  {i === jours.length - 1 ? 'auj.' : (jours.length - 1 - i) % 5 === 0 ? jourCourt(j.jour) : ''}
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center border-t border-[#1c241e]/10 dark:border-white/10 pt-2">
              {jours.map(j => {
                const n = j.nouvelles - j.desabonnees;
                return <div key={j.jour} className="flex-1 text-center text-[15px] font-semibold tabular-nums" style={{ color: n > 0 ? VERT : n < 0 ? CUIVRE : '#8a908a' }}>{n === 0 ? '·' : signe(n)}</div>;
              })}
            </div>
          </div>
        </div>
        <p className={`mt-1 pl-10 text-[15px] ${DOUX}`}>Rangée du bas : le solde de chaque jour (vraies nouvelles moins désabonnées).</p>
      </div>

      <div>
        <h3 className={`font-serif text-2xl ${ENCRE}`}>Les 20 dernières vraies nouvelles</h3>
        {dernieres.length === 0 ? (
          <p className={`mt-3 text-[15px] ${DOUX}`}>Aucune vraie nouvelle depuis 30 jours.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-[#28352F]/15 dark:border-white/15">
            <table className="w-full text-[15px]">
              <thead className="bg-[#EEE7DB] dark:bg-white/5">
                <tr className={`text-left ${ENCRE}`}>
                  <th className="px-4 py-3 font-semibold">Prénom</th>
                  <th className="px-4 py-3 font-semibold">Courriel</th>
                  <th className="px-4 py-3 font-semibold">Arrivée</th>
                  <th className="px-4 py-3 font-semibold">Provenance</th>
                  <th className="px-4 py-3 font-semibold">Résultat du quiz</th>
                </tr>
              </thead>
              <tbody>
                {dernieres.map(p => (
                  <tr key={p.email} className="border-t border-[#1c241e]/10 dark:border-white/10 align-top">
                    <td className={`px-4 py-3 font-semibold ${ENCRE}`}>{p.prenom || <span className={DOUX}>(sans prénom)</span>}</td>
                    <td className={`px-4 py-3 break-all ${ENCRE}`}>{p.email}</td>
                    <td className={`px-4 py-3 whitespace-nowrap ${DOUX}`}>{p.le.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' })} · {p.le.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className={`px-4 py-3 ${ENCRE}`}>{p.provenance}</td>
                    <td className={`px-4 py-3 ${p.quiz ? ENCRE : DOUX}`}>{p.quiz || '·'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
};

const NouvellesInscritesPanel: React.FC = () => {
  const { donnees, erreur } = useNouvellesInscrites();
  if (erreur) return <Card className="p-6"><p className="text-[15px] text-[#8B4A2F]">{erreur}</p></Card>;
  if (!donnees) return <Card className="p-6"><p className={`text-[15px] ${DOUX}`}>Les nouvelles inscrites se chargent…</p></Card>;
  return <NouvellesInscritesVue donnees={donnees} />;
};

export default NouvellesInscritesPanel;
