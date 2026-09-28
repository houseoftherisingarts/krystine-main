// « Où en est la migration » (Krystine, 28 sept. 2026) : en haut des codes de
// l'ancien système, formation par formation, combien de personnes attendent
// encore leur accès, la cible de rythme par semaine, la date de fin qu'elle
// donne, et la courbe des lundis (analyseInfolettre/_migration, photographié
// par analyseHebdomadaire).
import React, { useEffect, useState } from 'react';
import { getEtatMigration, getSuiviMigration, setCibleMigration, type EtatMigration, type PointMigration } from '../../../firebase/kajabi';
import { Card, Input, GhostButton } from '../primitives';

const nombre = (n: number) => n.toLocaleString('fr-CA');
const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);
const dateLongue = (d: Date) => d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' });
const dansSemaines = (semaines: number) => new Date(Date.now() + semaines * 7 * 86400e3);

// La courbe des accès restaurés, semaine par semaine.
const Courbe: React.FC<{ points: PointMigration[] }> = ({ points }) => {
  const L = 560, H = 120, M = 24;
  const max = Math.max(1, ...points.map(p => p.personnes));
  const x = (i: number) => M + (points.length === 1 ? (L - 2 * M) / 2 : (i * (L - 2 * M)) / (points.length - 1));
  const y = (v: number) => H - M - ((H - 2 * M) * v) / max;
  const trace = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.restaures).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${L} ${H}`} className="w-full max-w-[560px]" role="img" aria-label="Accès restaurés, semaine par semaine">
      <line x1={M} x2={L - M} y1={y(max)} y2={y(max)} stroke="#293027" strokeOpacity=".12" strokeDasharray="3 4" />
      <text x={M} y={y(max) - 6} fontSize="10" fill="#293027" fillOpacity=".5">{nombre(max)} au registre</text>
      <line x1={M} x2={L - M} y1={H - M} y2={H - M} stroke="#293027" strokeOpacity=".2" />
      {points.length > 1 && <path d={trace} fill="none" stroke="#BA7B39" strokeWidth="2" />}
      {points.map((p, i) => (
        <g key={p.semaine}>
          <circle cx={x(i)} cy={y(p.restaures)} r="3.5" fill="#8B4A2F"><title>{`${p.semaine} : ${p.restaures} accès restaurés, ${p.reste} à faire`}</title></circle>
          {(i === 0 || i === points.length - 1) && <text x={x(i)} y={H - 8} fontSize="10" textAnchor="middle" fill="#293027" fillOpacity=".55">{p.semaine.slice(5)}</text>}
        </g>
      ))}
    </svg>
  );
};

const KajabiMigrationPanel: React.FC = () => {
  const [etat, setEtat] = useState<EtatMigration | null>(null);
  const [historique, setHistorique] = useState<PointMigration[]>([]);
  const [cible, setCible] = useState<number | null>(null);
  const [saisie, setSaisie] = useState('');
  const [erreur, setErreur] = useState('');
  const [enregistre, setEnregistre] = useState('');

  useEffect(() => {
    getSuiviMigration().then(s => { setHistorique(s.historique); setCible(s.cibleParSemaine); setSaisie(s.cibleParSemaine ? String(s.cibleParSemaine) : ''); }).catch(() => undefined);
    getEtatMigration().then(setEtat).catch(() => setErreur("Les chiffres de la migration n'ont pas pu être calculés. Rechargez la page dans un instant."));
  }, []);

  const enregistrer = async () => {
    const n = Math.round(Number(saisie));
    if (!Number.isFinite(n) || n <= 0) { setEnregistre('Entrez un nombre de personnes plus grand que zéro.'); return; }
    await setCibleMigration(n);
    setCible(n); setEnregistre('Cible enregistrée.');
  };

  const t = etat?.total;
  // Le rythme réel : les accès restaurés gagnés entre le premier et le dernier lundi photographiés.
  const premier = historique[0], dernier = historique[historique.length - 1];
  const semainesEcoulees = premier && dernier ? (new Date(dernier.semaine).getTime() - new Date(premier.semaine).getTime()) / (7 * 86400e3) : 0;
  const rythmeReel = semainesEcoulees >= 1 ? (dernier.restaures - premier.restaures) / semainesEcoulees : null;

  return (
    <Card>
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">Où en est la migration</p>
      <p className="mt-2 text-sm text-[#293027]/70">Pour chaque formation, les personnes de l'ancien système qui y ont droit, les codes partis et les accès déjà retrouvés sur le site. Une personne compte une fois par formation.</p>

      {erreur && <p className="mt-4 text-sm text-[#8B4A2F]">{erreur}</p>}
      {!etat && !erreur && <p className="mt-4 text-sm text-[#293027]/50">Calcul des chiffres de la migration…</p>}

      {etat && t && (
        <>
          <div className="mt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm text-[#293027]">
              <span><strong className="text-2xl font-semibold">{t.pourcentage.toLocaleString('fr-CA')} %</strong> des accès sont retrouvés</span>
              <span className="text-[#293027]/60">{nombre(t.restaures)} sur {nombre(t.personnes)} · il en reste {nombre(t.reste)}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#293027]/10">
              <div className="h-full rounded-full bg-[#BA7B39]" style={{ width: `${Math.min(100, t.pourcentage)}%` }} />
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-[#293027]/50">
                  <th className="py-2 pr-4">Formation</th><th className="py-2 pr-3 text-right">Au registre</th><th className="py-2 pr-3 text-right">Codes émis</th>
                  <th className="py-2 pr-3 text-right">Codes envoyés</th><th className="py-2 pr-3 text-right">Accès restaurés</th><th className="py-2 pr-3 text-right">Reste à faire</th><th className="py-2 text-right">Fait</th>
                </tr>
              </thead>
              <tbody>
                {etat.formations.map(l => (
                  <tr key={l.formationId} className="border-t border-[#293027]/10">
                    <td className="py-2 pr-4 text-[#293027]">{l.titre}</td>
                    <td className="py-2 pr-3 text-right">{nombre(l.personnes)}</td>
                    <td className="py-2 pr-3 text-right">{nombre(l.codesEmis)}</td>
                    <td className="py-2 pr-3 text-right">{nombre(l.codesEnvoyes)}</td>
                    <td className="py-2 pr-3 text-right">{nombre(l.restaures)}</td>
                    <td className="py-2 pr-3 text-right font-medium">{nombre(l.reste)}</td>
                    <td className="py-2 text-right text-[#293027]/60">{pct(l.restaures, l.personnes)} %</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-[#293027]/25 font-semibold text-[#293027]">
                  <td className="py-2 pr-4">Total</td>
                  <td className="py-2 pr-3 text-right">{nombre(t.personnes)}</td>
                  <td className="py-2 pr-3 text-right">{nombre(t.codesEmis)}</td>
                  <td className="py-2 pr-3 text-right">{nombre(t.codesEnvoyes)}</td>
                  <td className="py-2 pr-3 text-right">{nombre(t.restaures)}</td>
                  <td className="py-2 pr-3 text-right">{nombre(t.reste)}</td>
                  <td className="py-2 text-right">{t.pourcentage.toLocaleString('fr-CA')} %</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-[#293027]/50">
            {nombre(t.personnesDistinctes)} personnes différentes en tout.
            {etat.nonReliees > 0 && ` ${nombre(etat.nonReliees)} autres ont un achat qui n'est encore relié à aucune formation du site (tableau du bas) : elles ne sont pas comptées ici.`}
            {' '}Un code n'est créé qu'au moment où son courriel part : les colonnes « émis » et « envoyés » avancent donc ensemble.
          </p>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold text-[#293027]/70">Le rythme visé</p>
              <div className="mt-2 flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-xs text-[#293027]/60">
                  Personnes à migrer par semaine
                  <Input type="number" min={1} value={saisie} onChange={e => { setSaisie(e.target.value); setEnregistre(''); }} className="w-32" />
                </label>
                <GhostButton onClick={enregistrer}>Enregistrer</GhostButton>
              </div>
              {enregistre && <p className="mt-2 text-xs text-[#8B4A2F]">{enregistre}</p>}
              <div className="mt-3 space-y-1 text-sm text-[#293027]">
                {t.reste === 0 && <p>La migration est terminée.</p>}
                {t.reste > 0 && cible && <p>À ce rythme, fin de la migration le <strong>{dateLongue(dansSemaines(Math.ceil(t.reste / cible)))}</strong> ({Math.ceil(t.reste / cible)} semaines).</p>}
                {t.reste > 0 && !cible && <p className="text-[#293027]/60">Entrez une cible pour voir la date de fin.</p>}
                {rythmeReel !== null && (
                  <p className="text-[#293027]/70">
                    Rythme réel depuis le {premier.semaine} : {Math.round(rythmeReel)} par semaine
                    {cible ? (rythmeReel >= cible ? ', au-dessus de la cible.' : `, soit ${Math.round(cible - rythmeReel)} de moins que la cible.`) : '.'}
                    {rythmeReel > 0 && t.reste > 0 && ` À ce rythme réel, la fin tomberait le ${dateLongue(dansSemaines(Math.ceil(t.reste / rythmeReel)))}.`}
                  </p>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#293027]/70">Accès restaurés, lundi après lundi</p>
              {historique.length ? <Courbe points={historique} /> : <p className="mt-2 text-sm text-[#293027]/50">La première photo sera prise lundi à 7 h; la courbe se dessine à partir de là.</p>}
            </div>
          </div>
        </>
      )}
    </Card>
  );
};

export default KajabiMigrationPanel;
