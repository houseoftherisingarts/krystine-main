import React, { useEffect, useState } from 'react';
import { CIBLE, DEBUT_CIBLE, FIN_CIBLE, getEtatCible, type EtatCible } from '../../../../firebase/nouvellesPersonnes';
import { journee } from '../../../../firebase/rapportDuJour';
import { Card } from '../../primitives';

// La cible de Krystine du 28 septembre 2026 : 3 000 nouvelles personnes avant
// le 15 décembre. La carte dit où nous en sommes, le rythme qu'il faut tenir
// chaque semaine pour y arriver, les semaines une à une, et les voies d'arrivée
// (lien marqué utm_source ou via, sinon le formulaire). Définition exacte dans
// src/firebase/nouvellesPersonnes.ts.

const JOUR_MS = 864e5;
const jours = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / JOUR_MS);
const date = (jour: string) => new Date(`${jour}T12:00:00-04:00`).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });
const nombre = (n: number) => n.toLocaleString('fr-CA');

const CibleNouvellesPersonnesCard: React.FC = () => {
  const [etat, setEtat] = useState<EtatCible | null>(null);
  const [erreur, setErreur] = useState(false);

  useEffect(() => { getEtatCible().then(setEtat).catch(() => setErreur(true)); }, []);

  const aujourdhui = journee();
  const total = etat?.personnes.length ?? 0;
  const reste = Math.max(0, CIBLE - total);
  const joursRestants = Math.max(0, jours(aujourdhui, FIN_CIBLE));
  const semainesRestantes = Math.max(1, joursRestants / 7);
  const parSemaine = Math.ceil(reste / semainesRestantes);
  // Où il faudrait être aujourd'hui sur une ligne droite du 28 sept. au 15 déc.
  const duree = jours(DEBUT_CIBLE, FIN_CIBLE);
  const attendu = Math.round(CIBLE * Math.min(1, Math.max(0, jours(DEBUT_CIBLE, aujourdhui) + 1) / duree));
  const ecart = total - attendu;
  const maxSemaine = Math.max(1, ...(etat?.semaines ?? []).map((s) => s.n), Math.ceil(CIBLE / (duree / 7)));
  const rythmeCible = Math.ceil(CIBLE / (duree / 7));

  return (
    <Card className="p-6">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-sm font-bold uppercase tracking-widest text-[#293027]/60 dark:text-white/60">Nouvelles personnes · cible {nombre(CIBLE)} avant le 15 décembre</h3>
        <span className="text-[11px] text-[#293027]/50 dark:text-white/50">Depuis le 28 septembre 2026</span>
      </div>

      {erreur ? (
        <p className="text-sm text-[#8B4A2F]">Le compteur n'a pas pu se charger. Rafraîchissez la page.</p>
      ) : !etat ? (
        <i className="fa-solid fa-circle-notch fa-spin text-[#8B4A2F]" />
      ) : (
        <>
          <div className="mb-3 h-3 w-full overflow-hidden rounded-full bg-[#293027]/10 dark:bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={CIBLE} aria-valuenow={total}>
            <div className="h-full rounded-full bg-[#BA7B39]" style={{ width: `${Math.min(100, (total / CIBLE) * 100)}%` }} />
          </div>
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { valeur: nombre(total), label: 'Entrées jusqu’ici' },
              { valeur: nombre(reste), label: 'Il en reste' },
              { valeur: nombre(parSemaine), label: 'À faire entrer par semaine', detail: `${Math.round(joursRestants / 7)} semaines restantes` },
              { valeur: `${ecart >= 0 ? '+' : ''}${nombre(ecart)}`, label: ecart >= 0 ? 'En avance sur le rythme' : 'En retard sur le rythme', detail: `Rythme visé : ${nombre(attendu)} à ce jour` },
            ].map((t) => (
              <div key={t.label} className="rounded-[15px] border border-[#293027]/10 p-4 dark:border-white/10">
                <p className="font-serif text-2xl text-[#293027] dark:text-white">{t.valeur}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[#BA7B39]">{t.label}</p>
                {t.detail && <p className="mt-1 text-[11px] text-[#293027]/50 dark:text-white/50">{t.detail}</p>}
              </div>
            ))}
          </div>

          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#293027]/50 dark:text-white/50">Par semaine (la ligne marque le rythme de {nombre(rythmeCible)} par semaine)</p>
          <div className="relative mb-2 h-32">
            <div className="absolute inset-x-0 border-t border-dashed border-[#8B4A2F]/60" style={{ bottom: `${(rythmeCible / maxSemaine) * 100}%` }} />
            <div className="absolute inset-0 flex items-end gap-1">
              {etat.semaines.map((s) => (
                <div key={s.lundi} className="flex h-full flex-1 flex-col items-center justify-end" title={`Semaine du ${date(s.lundi)} : ${s.n}`}>
                  <span className="mb-1 text-[10px] font-bold tabular-nums text-[#293027]/70 dark:text-white/70">{s.n}</span>
                  <div className="w-full max-w-[36px] rounded-t-[4px] bg-[#BA7B39]" style={{ height: `${(s.n / maxSemaine) * 100}%`, minHeight: s.n > 0 ? 2 : 0 }} />
                </div>
              ))}
            </div>
          </div>
          <div className="mb-8 flex gap-1">
            {etat.semaines.map((s) => (
              <span key={s.lundi} className="flex-1 text-center text-[10px] text-[#293027]/50 dark:text-white/50">{date(s.lundi)}</span>
            ))}
          </div>

          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#293027]/50 dark:text-white/50">D'où elles arrivent</p>
          {etat.voies.length === 0 ? (
            <p className="text-sm text-[#293027]/50 dark:text-white/50">Aucune nouvelle personne encore depuis le 28 septembre.</p>
          ) : (
            <table className="w-full max-w-md text-sm text-[#293027] dark:text-white">
              <tbody>
                {etat.voies.slice(0, 12).map((v) => (
                  <tr key={v.voie} className="border-t border-[#293027]/10 dark:border-white/10">
                    <td className="py-1.5">{v.voie}</td>
                    <td className="py-1.5 text-right font-bold tabular-nums">{nombre(v.n)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-4 text-[11px] leading-relaxed text-[#293027]/50 dark:text-white/50">
            Pour qu'une voie se compte à part, le lien partagé porte son nom : krystinestlaurent.ca/?via=metamorphose, ou utm_source=… pour une publicité. Les imports et les adresses déjà connues ne comptent pas.
          </p>
        </>
      )}
    </Card>
  );
};

export default CibleNouvellesPersonnesCard;
