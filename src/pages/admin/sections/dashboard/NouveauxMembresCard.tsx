import React, { useEffect, useState } from 'react';
import { getNouveauxMembresParJour, journee, type JourMembres } from '../../../../firebase/rapportDuJour';
import { Card } from '../../primitives';

// Les nouveaux membres (comptes créés) par jour civil, sur 14, 30 ou 90
// jours (Krystine, 7 septembre 2026). Une seule requête bornée sur
// members.joinedAt, voir firebase/rapportDuJour.ts. Les jours sans
// inscription restent à zéro sur l'axe : un creux se voit, il ne se cache pas.

const FENETRES = [14, 30, 90] as const;
type Fenetre = (typeof FENETRES)[number];

const pastille = (actif: boolean) =>
  `rounded-full px-2.5 sm:px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${actif ? 'bg-[#293027] text-[#EEE7DB] dark:bg-[#BA7B39] dark:text-[#293027]' : 'border border-[#293027]/15 text-[#293027]/70 hover:border-[#BA7B39] dark:border-white/15 dark:text-white/70'}`;
const date = (jour: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${jour}T12:00:00-04:00`).toLocaleDateString('fr-CA', opts);
const phrase = (n: number) => `${n} ${n === 1 ? 'nouveau membre' : 'nouveaux membres'}`;

const NouveauxMembresCard: React.FC = () => {
  const [nbJours, setNbJours] = useState<Fenetre>(30);
  const [jours, setJours] = useState<JourMembres[] | null>(null);

  useEffect(() => {
    setJours(null);
    getNouveauxMembresParJour(nbJours).then(setJours).catch(() => setJours([]));
  }, [nbJours]);

  const ns = (jours ?? []).map((j) => j.n);
  const total = ns.reduce((s, n) => s + n, 0);
  const max = Math.max(...ns, 0);
  // Graduations rondes : chaque entier tant que ça tient, sinon quatre pas.
  const pas = max <= 6 ? 1 : Math.ceil(max / 4);
  const plafond = Math.max(pas, Math.ceil(max / pas) * pas);
  const graduations = Array.from({ length: plafond / pas + 1 }, (_, i) => i * pas);
  const meilleur = max > 0 ? (jours ?? []).find((j) => j.n === max) : undefined;
  const aujourdhui = journee();
  // Une date sous l'axe tous les N jours, comptée à rebours depuis aujourd'hui;
  // une sur deux se cache sur mobile pour que les dates ne se touchent pas.
  const tousLes = nbJours === 14 ? 2 : nbJours === 30 ? 5 : 15;

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-5">
        <h3 className="text-sm font-bold uppercase tracking-widest text-[#293027]/60 dark:text-white/60">Nouveaux membres par jour</h3>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {FENETRES.map((n) => (
            <button key={n} type="button" onClick={() => setNbJours(n)} className={pastille(n === nbJours)}>{n} jours</button>
          ))}
        </div>
      </div>

      {!jours ? (
        <i className="fa-solid fa-circle-notch fa-spin text-[#8B4A2F]" />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
            {[
              { valeur: total, label: `Sur ${nbJours} jours`, large: true, detail: undefined as string | undefined },
              { valeur: jours[jours.length - 1]?.n ?? 0, label: 'Aujourd’hui', detail: undefined },
              { valeur: max, label: 'Meilleur jour', detail: meilleur && date(meilleur.jour, { weekday: 'long', day: 'numeric', month: 'long' }) },
            ].map((t) => (
              <div key={t.label} className={`rounded-[15px] border border-[#293027]/10 p-4 dark:border-white/10 ${t.large ? 'col-span-2 sm:col-span-1' : ''}`}>
                <p className="text-2xl font-serif text-[#293027] dark:text-white">{t.valeur}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[#BA7B39]">{t.label}</p>
                {t.detail && <p className="mt-1 text-[11px] text-[#293027]/50 dark:text-white/50 first-letter:uppercase">{t.detail}</p>}
              </div>
            ))}
          </div>

          {total === 0 ? (
            <p className="text-sm text-[#293027]/50 dark:text-white/50">Aucun nouveau membre sur cette période.</p>
          ) : (
            <>
              <div className="relative ml-7 h-40">
                {graduations.map((g) => (
                  <div key={g} className="absolute inset-x-0 h-0" style={{ bottom: `${(g / plafond) * 100}%` }}>
                    <span className="absolute right-full top-0 mr-2 -translate-y-1/2 text-[10px] tabular-nums text-[#293027]/40 dark:text-white/40">{g}</span>
                    <span className="block h-px w-full bg-[#293027]/10 dark:bg-white/10" />
                  </div>
                ))}
                <div className="absolute inset-0 flex items-end gap-px sm:gap-[2px]">
                  {jours.map((j, i) => (
                    <div
                      key={j.jour} tabIndex={0} aria-label={`${phrase(j.n)} · ${date(j.jour, { weekday: 'long', day: 'numeric', month: 'long' })}`}
                      className="group relative flex h-full flex-1 items-end justify-center outline-none"
                    >
                      <div
                        className="relative w-full max-w-[24px] rounded-t-[4px] bg-[#BA7B39] transition-opacity group-hover:opacity-75 group-focus:opacity-75"
                        style={{ height: `${(j.n / plafond) * 100}%`, minHeight: j.n > 0 ? 2 : 0 }}
                      >
                        {j.n > 0 && (j === meilleur || j.jour === aujourdhui) && (
                          <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] font-bold tabular-nums text-[#293027]/70 dark:text-white/70">{j.n}</span>
                        )}
                      </div>
                      <div className={`pointer-events-none absolute bottom-full z-10 mb-5 hidden whitespace-nowrap rounded bg-[#293027] px-2 py-1 text-[10px] text-white group-hover:block group-focus:block ${i < jours.length / 3 ? 'left-0' : i > (jours.length * 2) / 3 ? 'right-0' : 'left-1/2 -translate-x-1/2'}`}>
                        <strong>{phrase(j.n)}</strong> · {date(j.jour, { weekday: 'long', day: 'numeric', month: 'long' })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="ml-7 mt-2 flex gap-px sm:gap-[2px]">
                {jours.map((j, i) => (
                  <span key={j.jour} className="relative h-4 flex-1">
                    {(jours.length - 1 - i) % tousLes === 0 && (
                      <span className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-[#293027]/50 dark:text-white/50 ${((jours.length - 1 - i) / tousLes) % 2 ? 'hidden sm:block' : ''}`}>{date(j.jour, { day: 'numeric', month: 'short' })}</span>
                    )}
                  </span>
                ))}
              </div>

              <details className="mt-5">
                <summary className="cursor-pointer text-xs font-bold uppercase tracking-widest text-[#BA7B39]">Voir en tableau</summary>
                <table className="mt-3 w-full max-w-sm text-sm text-[#293027] dark:text-white">
                  <tbody>
                    {jours.filter((j) => j.n > 0).reverse().map((j) => (
                      <tr key={j.jour} className="border-t border-[#293027]/10 dark:border-white/10">
                        <td className="py-1.5 first-letter:uppercase">{date(j.jour, { weekday: 'long', day: 'numeric', month: 'long' })}</td>
                        <td className="py-1.5 text-right font-bold tabular-nums">{j.n}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </>
          )}
          <p className="mt-4 text-[11px] text-[#293027]/50 dark:text-white/50">
            Un membre compte le jour où son compte est créé. Les fiches importées sans date d’inscription n’y figurent pas.
          </p>
        </>
      )}
    </Card>
  );
};

export default NouveauxMembresCard;
