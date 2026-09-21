import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import DemandeVexel, { VEXEL_CLE, VEXEL_CLIENT, VEXEL_FONCTIONS } from '../../../components/admin/DemandeVexel';
import { Card, EmptyState } from '../primitives';

// La liste des demandes vient de la fonction listerDemandes du studio, avec le
// même couple client + clé que la fenêtre de demande. Elle se recharge à
// l'ouverture de l'onglet et quelques instants après chaque envoi (la page
// distante change de hauteur quand la demande part).
type Statut = 'nouvelle' | 'a_appliquer' | 'en_cours' | 'appliquee' | 'reglee' | 'refusee' | 'echec';

interface Demande {
  id: string;
  texte: string;
  statut: Statut;
  type: 'changement' | 'bug' | 'contact';
  recu: string | null;
  fin: string | null;
}

const ETATS: Record<Statut, { libelle: string; fait: boolean }> = {
  nouvelle: { libelle: 'reçue', fait: false },
  a_appliquer: { libelle: 'dans la file', fait: false },
  en_cours: { libelle: 'en cours', fait: false },
  echec: { libelle: 'en traitement', fait: false },
  appliquee: { libelle: 'en ligne', fait: true },
  reglee: { libelle: 'réglée', fait: true },
  refusee: { libelle: 'non retenue', fait: false },
};

const jour = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  const memeAnnee = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', ...(memeAnnee ? {} : { year: 'numeric' }) });
};

const Crochet: React.FC<{ statut: Statut }> = ({ statut }) => {
  const base = 'shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5';
  if (ETATS[statut].fait) {
    return (
      <span className={`${base} bg-[#BA7B39] text-[#293027] shadow-[0_6px_14px_-8px_rgba(186,123,57,0.9)]`} aria-label="Fait">
        <i className="fa-solid fa-check text-xs" />
      </span>
    );
  }
  if (statut === 'refusee') {
    return (
      <span className={`${base} border border-[#293027]/20 dark:border-white/20 text-[#293027]/40 dark:text-white/40`} aria-label="Non retenue">
        <i className="fa-solid fa-minus text-[10px]" />
      </span>
    );
  }
  return (
    <span className={`${base} border-2 ${statut === 'en_cours' ? 'border-[#BA7B39]' : 'border-[#293027]/20 dark:border-white/25'}`} aria-label={ETATS[statut].libelle}>
      {statut === 'en_cours' && <span className="w-2 h-2 rounded-full bg-[#BA7B39] animate-pulse" />}
    </span>
  );
};

const DemandeSection: React.FC<{ user: User }> = ({ user }) => {
  const [demandes, setDemandes] = useState<Demande[] | null>(null);
  const [erreur, setErreur] = useState(false);
  const [ouvertes, setOuvertes] = useState<Set<string>>(new Set());
  const minuterie = useRef<number>(0);

  const charger = useCallback(async () => {
    try {
      const r = await fetch(`${VEXEL_FONCTIONS}/listerDemandes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client: VEXEL_CLIENT, cle: VEXEL_CLE }),
      });
      if (!r.ok) throw new Error(String(r.status));
      const d = (await r.json()) as { demandes: Demande[] };
      setDemandes(d.demandes.filter((x) => ETATS[x.statut]));
      setErreur(false);
    } catch {
      setErreur(true);
    }
  }, []);

  useEffect(() => { void charger(); }, [charger]);

  // Un envoi fait changer la hauteur de la fenêtre : on relit la liste un peu après.
  const surSignal = useCallback(() => {
    window.clearTimeout(minuterie.current);
    minuterie.current = window.setTimeout(() => void charger(), 1500);
  }, [charger]);
  useEffect(() => () => window.clearTimeout(minuterie.current), []);

  const basculer = (id: string) =>
    setOuvertes((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const faites = demandes?.filter((d) => ETATS[d.statut].fait).length ?? 0;
  const enAttente = demandes?.filter((d) => !ETATS[d.statut].fait && d.statut !== 'refusee').length ?? 0;

  return (
    <div className="space-y-6">
      <Card className="p-6 md:p-8">
        <h2 className="font-serif text-2xl text-[#293027] dark:text-white mb-2">Demander un changement</h2>
        <p className="text-sm text-[#293027]/70 dark:text-white/70 mb-6 max-w-xl">
          Ce que vous voulez voir changer sur votre site, écrit ou dicté. La demande arrive au studio à l’instant et vous suivez ce que nous en avons compris.
        </p>
        <DemandeVexel nom={user.displayName || ''} courriel={user.email || ''} ton="clair" onSignal={surSignal} />
      </Card>

      <Card className="p-6 md:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 mb-2">
          <h3 className="font-serif text-2xl text-[#293027] dark:text-white">Vos demandes</h3>
          {demandes && demandes.length > 0 && (
            <span className="text-[10px] uppercase tracking-widest font-bold text-[#293027]/50 dark:text-white/50">
              {faites} en ligne · {enAttente} en attente
            </span>
          )}
        </div>
        <p className="text-sm text-[#293027]/70 dark:text-white/70 mb-6 max-w-xl">
          Chaque demande reste ici avec son état, et le crochet apparaît dès que le changement est en ligne.
        </p>

        {erreur && <EmptyState icon="fa-plug-circle-xmark">La liste ne répond pas pour le moment. Elle reviendra à la prochaine ouverture.</EmptyState>}
        {!erreur && demandes === null && <EmptyState icon="fa-hourglass-half">Chargement de vos demandes.</EmptyState>}
        {!erreur && demandes && demandes.length === 0 && <EmptyState icon="fa-bolt">Aucune demande pour l’instant. La première apparaîtra ici dès son envoi.</EmptyState>}

        {!erreur && demandes && demandes.length > 0 && (
          <ul className="divide-y divide-[#293027]/10 dark:divide-white/10">
            {demandes.map((d) => {
              const etat = ETATS[d.statut];
              const ouverte = ouvertes.has(d.id);
              return (
                <li key={d.id} className={`flex items-start gap-4 py-4 ${etat.fait ? 'opacity-75' : ''}`}>
                  <Crochet statut={d.statut} />
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => basculer(d.id)}
                      className={`text-left text-sm leading-relaxed text-[#293027] dark:text-white whitespace-pre-line ${ouverte ? '' : 'line-clamp-3'}`}
                      title={ouverte ? 'Replier' : 'Lire en entier'}
                    >
                      {d.texte}
                    </button>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-widest font-bold text-[#293027]/50 dark:text-white/50">
                      <span className={etat.fait ? 'text-[#8B4A2F] dark:text-[#BA7B39]' : ''}>{etat.libelle}</span>
                      {d.type === 'bug' && <span><i className="fa-solid fa-bug mr-1" />problème technique</span>}
                      {d.recu && <span>reçue le {jour(d.recu)}</span>}
                      {etat.fait && d.fin && <span>en ligne le {jour(d.fin)}</span>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default DemandeSection;
