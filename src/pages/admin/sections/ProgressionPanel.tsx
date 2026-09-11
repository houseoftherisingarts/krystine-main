import React, { useEffect, useMemo, useState } from 'react';
import {
  getAcheteursDe, getProgressionsDe, getLecons,
  type Lecon,
} from '../../../firebase/formations';
import { getMember } from '../../../firebase/firestore';
import { rangDeModule, SEMAINES_VATA, FORMATION_VATA } from '../../vata/semaines';

// Qui avance, et qui tire de la patte. Krystine ouvre ce panneau sur une
// formation et voit chaque acheteuse avec son avancement, sa dernière visite
// et la semaine où elle est rendue, pour savoir qui relancer et qui féliciter
// (Alex, 10 septembre 2026).
//
// La lecture passe par la même règle collection-group que la liste des
// acheteuses : l'admin voit tout, personne d'autre ne voit rien.

interface Ligne {
  uid: string;
  nom: string;
  courriel: string;
  faites: number;
  total: number;
  semaine: number;         // le rang de la dernière semaine touchée, -1 sinon
  termineeLe?: string;
  vueLe?: Date;
  jamaisOuvert: boolean;
}

type Tri = 'avancement' | 'retard' | 'nom';

const jours = (d?: Date): number | null => {
  if (!d) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
};

const ProgressionPanel: React.FC<{ formationId: string }> = ({ formationId }) => {
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [lecons, setLecons] = useState<Lecon[]>([]);
  const [charge, setCharge] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [tri, setTri] = useState<Tri>('retard');

  useEffect(() => {
    let vivant = true;
    setCharge(true); setErreur(null);
    (async () => {
      try {
        const [acheteurs, progressions, ls] = await Promise.all([
          getAcheteursDe(formationId),
          getProgressionsDe(formationId),
          getLecons(formationId),
        ]);
        if (!vivant) return;
        setLecons(ls);
        const parUid = new Map(progressions.map(p => [p.uid, p]));
        // Une acheteuse qui n'a jamais ouvert le cours n'a pas de document de
        // progression : elle compte quand même, et c'est elle qu'il faut voir.
        const uids = new Set([...acheteurs.map(a => a.uid), ...progressions.map(p => p.uid)]);
        const fiches = await Promise.all([...uids].map(async uid => {
          const m = await getMember(uid).catch(() => null);
          const p = parUid.get(uid);
          const derniere = p?.derniereLecon ? ls.find(l => l.id === p.derniereLecon) : undefined;
          return {
            uid,
            nom: (m?.displayName as string) || (m?.nom as string) || '',
            courriel: (m?.email as string) || '',
            faites: p?.terminees ?? 0,
            total: ls.length,
            semaine: derniere ? rangDeModule(derniere.moduleNom) : -1,
            termineeLe: p?.termineeLe,
            vueLe: p?.maj?.toDate ? p.maj.toDate() : undefined,
            jamaisOuvert: !p,
          } as Ligne;
        }));
        if (vivant) setLignes(fiches);
      } catch {
        if (vivant) setErreur('La progression n’a pas pu se charger.');
      } finally {
        if (vivant) setCharge(false);
      }
    })();
    return () => { vivant = false; };
  }, [formationId]);

  const triees = useMemo(() => {
    const l = [...lignes];
    if (tri === 'nom') return l.sort((a, b) => (a.nom || a.courriel).localeCompare(b.nom || b.courriel));
    if (tri === 'avancement') return l.sort((a, b) => b.faites - a.faites);
    // « retard » : celles qui ont le moins avancé, et le plus longtemps sans venir
    return l.sort((a, b) => (a.faites - b.faites) || ((jours(b.vueLe) ?? 999) - (jours(a.vueLe) ?? 999)));
  }, [lignes, tri]);

  const finies = lignes.filter(l => l.total > 0 && l.faites >= l.total).length;
  const jamais = lignes.filter(l => l.jamaisOuvert || l.faites === 0).length;
  const moyenne = lignes.length && lecons.length
    ? Math.round((lignes.reduce((s, l) => s + l.faites, 0) / (lignes.length * lecons.length)) * 100)
    : 0;

  const estVata = formationId === FORMATION_VATA;

  if (charge) return <p className="px-1 py-4 text-sm text-[#293027]/50 dark:text-white/50">Lecture de la progression…</p>;
  if (erreur) return <p className="px-1 py-4 text-sm text-red-600">{erreur}</p>;
  if (lignes.length === 0) {
    return <p className="px-1 py-4 text-sm text-[#293027]/50 dark:text-white/50">Personne n’a encore cette formation.</p>;
  }

  return (
    <div className="mt-6 border-t border-[#293027]/10 pt-6 dark:border-white/10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8B4A2F]">Vos clientes, une par une</p>
          <p className="mt-1 text-sm leading-relaxed text-[#293027]/70 dark:text-white/70">
            {lignes.length} personne{lignes.length > 1 ? 's' : ''} inscrite{lignes.length > 1 ? 's' : ''}, dont {finies} qui {finies > 1 ? 'ont' : 'a'} terminé
            et {jamais} qui n’{jamais > 1 ? 'ont' : 'a'} pas encore commencé. Avancement moyen de {moyenne} %.
          </p>
        </div>
        <div className="flex gap-1.5">
          {([['retard', 'À relancer'], ['avancement', 'Les plus avancées'], ['nom', 'Par nom']] as [Tri, string][]).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTri(id)}
              className={`rounded-full border px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                tri === id
                  ? 'border-[#293027] bg-[#293027] text-[#d9a05b]'
                  : 'border-[#293027]/20 text-[#293027]/65 hover:border-[#BA7B39] hover:text-[#8B4A2F] dark:border-white/20 dark:text-white/65'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[46rem] text-left text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest text-[#293027]/45 dark:text-white/45">
              <th className="pb-2 pr-4 font-bold">Personne</th>
              <th className="pb-2 pr-4 font-bold">Avancement</th>
              {estVata && <th className="pb-2 pr-4 font-bold">Rendue à</th>}
              <th className="pb-2 pr-4 font-bold">Dernière visite</th>
              <th className="pb-2 font-bold">État</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#293027]/8 dark:divide-white/8">
            {triees.map(l => {
              const pct = l.total ? Math.round((l.faites / l.total) * 100) : 0;
              const sem = estVata && l.semaine >= 0 ? SEMAINES_VATA[l.semaine] : undefined;
              const depuis = jours(l.vueLe);
              const finie = l.total > 0 && l.faites >= l.total;
              const endormie = !finie && depuis !== null && depuis >= 14;
              return (
                <tr key={l.uid} className="align-middle">
                  <td className="py-3 pr-4">
                    <p className="font-medium text-[#293027] dark:text-white">{l.nom || '(sans nom)'}</p>
                    <p className="text-xs text-[#293027]/50 dark:text-white/50">{l.courriel}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2.5">
                      <span className="h-1.5 w-24 overflow-hidden rounded-full bg-[#293027]/10 dark:bg-white/10">
                        <span
                          className="block h-full rounded-full"
                          style={{ width: `${pct}%`, background: sem ? sem.couleur.vive : '#BA7B39' }}
                        />
                      </span>
                      <span className="font-mono text-xs tabular-nums text-[#293027]/70 dark:text-white/60">
                        {l.faites}/{l.total}
                      </span>
                    </div>
                  </td>
                  {estVata && (
                    <td className="py-3 pr-4 text-xs" style={{ color: sem?.couleur.encre }}>
                      {sem ? `${sem.roman} · ${sem.sens.fr}` : <span className="text-[#293027]/35 dark:text-white/35">—</span>}
                    </td>
                  )}
                  <td className="py-3 pr-4 text-xs text-[#293027]/60 dark:text-white/55">
                    {depuis === null ? 'jamais' : depuis === 0 ? "aujourd'hui" : `il y a ${depuis} jour${depuis > 1 ? 's' : ''}`}
                  </td>
                  <td className="py-3">
                    {finie ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-600/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-green-700">
                        <i className="fa-solid fa-award" /> Diplômée
                      </span>
                    ) : l.jamaisOuvert || l.faites === 0 ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#8B4A2F]/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8B4A2F]">
                        <i className="fa-solid fa-hourglass-start" /> Pas commencé
                      </span>
                    ) : endormie ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#BA7B39]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8B4A2F]">
                        <i className="fa-solid fa-moon" /> À relancer
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#293027]/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#293027]/70 dark:bg-white/10 dark:text-white/70">
                        <i className="fa-solid fa-person-walking" /> En chemin
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-[#293027]/50 dark:text-white/45">
        Une personne passe à « À relancer » après quatorze jours sans ouvrir le cours. Le mot se lui écrit depuis sa fiche,
        dans Clients, ou depuis la messagerie.
      </p>
    </div>
  );
};

export default ProgressionPanel;
