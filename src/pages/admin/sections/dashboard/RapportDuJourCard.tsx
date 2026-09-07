import React, { useEffect, useMemo, useState } from 'react';
import { getCommandesStripe, type CommandeStripe } from '../../../../firebase/commandes';
import { getRapportBornes, ventesDuJour, journee, veilleDe, type RapportBornes } from '../../../../firebase/rapportDuJour';
import type { RequeteCompteur } from '../../../../firebase/detailsCompteurs';
import { Card, GhostButton } from '../../primitives';
import CompteurCliquable from './DetailCompteur';

// Le rapport du jour : nouveaux contacts, comptes, désabonnements, ventes
// Stripe, billets du mur et coffres bêta, pour aujourd'hui, hier ou une date
// choisie (Alex, 7 septembre 2026). Chaque chiffre vient d'une requête
// bornée par date; voir firebase/rapportDuJour.ts pour le détail et pour ce
// qui manque volontairement (les messages à l'Équipe KSL).

const argent = (cents: number) => (cents / 100).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' });

const RapportDuJourCard: React.FC = () => {
  const [jour, setJour] = useState(journee());
  const [bornes, setBornes] = useState<RapportBornes | null>(null);
  const [commandes, setCommandes] = useState<CommandeStripe[]>([]);
  const [copie, setCopie] = useState(false);

  // Les ventes Stripe se lisent une seule fois; changer de date ne fait que
  // refiltrer la même liste (ventesDuJour), jamais une nouvelle lecture.
  useEffect(() => { getCommandesStripe().then(setCommandes).catch(() => {}); }, []);
  useEffect(() => { setBornes(null); getRapportBornes(jour).then(setBornes).catch(() => {}); }, [jour]);

  const ventes = useMemo(() => ventesDuJour(commandes, jour), [commandes, jour]);
  const dateLisible = useMemo(
    () => new Date(`${jour}T12:00:00-04:00`).toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    [jour],
  );

  const lignes: { label: string; value: number | string }[] = bornes ? [
    { label: 'Nouveaux abonnés à l’infolettre', value: bornes.nouveauxAbonnes },
    { label: 'Nouveaux comptes', value: bornes.nouveauxComptes },
    { label: 'Désabonnements', value: bornes.desabonnements },
    { label: 'Ventes Stripe', value: `${ventes.n} · ${argent(ventes.total)}` },
    { label: 'Nouveaux billets du mur', value: bornes.nouveauxBillets },
    { label: 'Coffres bêta déposés', value: bornes.coffresBeta },
  ] : [];

  const copier = async () => {
    if (!bornes) return;
    const texte = [
      `Rapport du jour — ${dateLisible}`,
      `Nouveaux abonnés à l’infolettre : ${bornes.nouveauxAbonnes}`,
      `Nouveaux comptes : ${bornes.nouveauxComptes}`,
      `Désabonnements : ${bornes.desabonnements}`,
      `Ventes Stripe : ${ventes.n} commande${ventes.n > 1 ? 's' : ''}, ${argent(ventes.total)}`,
      `Nouveaux billets du mur : ${bornes.nouveauxBillets}`,
      `Coffres bêta déposés : ${bornes.coffresBeta}`,
    ].join('\n');
    try { await navigator.clipboard.writeText(texte); setCopie(true); setTimeout(() => setCopie(false), 2000); } catch { /* noop */ }
  };

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-5">
        <h3 className="text-sm font-bold uppercase tracking-widest text-[#293027]/60 dark:text-white/60">Le rapport du jour</h3>
        <GhostButton onClick={copier} disabled={!bornes}>
          <i className={`fa-solid ${copie ? 'fa-check' : 'fa-copy'}`} /> {copie ? 'Copié' : 'Copier le rapport'}
        </GhostButton>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button
          type="button" onClick={() => setJour(journee())}
          className={`rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${jour === journee() ? 'bg-[#293027] text-[#EEE7DB] dark:bg-[#BA7B39] dark:text-[#293027]' : 'border border-[#293027]/15 text-[#293027]/70 hover:border-[#BA7B39] dark:border-white/15 dark:text-white/70'}`}
        >Aujourd’hui</button>
        <button
          type="button" onClick={() => setJour(veilleDe(journee()))}
          className={`rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${jour === veilleDe(journee()) ? 'bg-[#293027] text-[#EEE7DB] dark:bg-[#BA7B39] dark:text-[#293027]' : 'border border-[#293027]/15 text-[#293027]/70 hover:border-[#BA7B39] dark:border-white/15 dark:text-white/70'}`}
        >Hier</button>
        <input
          type="date" value={jour} max={journee()} onChange={(e) => e.target.value && setJour(e.target.value)}
          className="rounded-full border border-[#293027]/15 bg-transparent px-4 py-2 text-[11px] font-bold text-[#293027] dark:border-white/15 dark:text-white"
        />
        <span className="text-xs capitalize text-[#293027]/50 dark:text-white/50">{dateLisible}</span>
      </div>

      {!bornes ? (
        <i className="fa-solid fa-circle-notch fa-spin text-[#8B4A2F]" />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {lignes.map((l) => (
            <div key={l.label} className="rounded-[15px] border border-[#293027]/10 p-4 dark:border-white/10">
              <p className="text-2xl font-serif text-[#293027] dark:text-white">{l.value}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[#BA7B39]">{l.label}</p>
            </div>
          ))}
        </div>
      )}
      <p className="mt-4 text-[11px] text-[#293027]/50 dark:text-white/50">
        Les messages à l’Équipe KSL n’y sont pas : ils ne se comptent pas sans lire chaque fil un par un.
      </p>
    </Card>
  );
};

export default RapportDuJourCard;
