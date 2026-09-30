import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNewsletters, nouvelleLettreDepuis } from '../../../firebase/firestore';
import {
  ecouterSequences, enregistrerSequence, marquerLettreSequence, compterInscrits,
  type Sequence, type Etape,
} from '../../../firebase/sequences';
import { FORMATION_VATA, SEMAINES_VATA } from '../../vata/semaines';

// La séquence d'une formation, vue depuis sa fiche (Krystine, 29 sept. 2026) :
// les courriels qui partent tout seuls après l'achat, étape par étape, avec la
// lettre de chacune. Le réglage fin (stratégie, tests, inscrites) reste dans
// Infolettre › Séquences; ici, on voit la série et on écrit ses lettres.

const JOUR = 24;
const delaiLisible = (h: number) => (h === 0 ? 'Le jour de l’achat' : `Jour ${Math.round(h / JOUR)}`);

// La série de Vata suit le goutte-à-goutte : une lettre par semaine qui s'ouvre.
const serieVata = (): Etape[] => {
  const [seuil, ...semaines] = SEMAINES_VATA;
  return [
    {
      cle: 'bienvenue', delaiHeures: 0, newsletterId: '',
      titre: `Bienvenue · ${seuil.sens.fr} et la semaine 1`,
      intention: `L'accès est prêt. ${seuil.promesse.fr} Puis la semaine 1, ${semaines[0].sens.fr.toLowerCase()} : ${semaines[0].promesse.fr}`,
    },
    ...semaines.slice(1).map(s => ({
      cle: `semaine-${s.rang}`, delaiHeures: (s.rang - 1) * 7 * JOUR, newsletterId: '',
      titre: `Semaine ${s.rang} · ${s.sens.fr}`,
      intention: `La semaine ${s.rang} vient de s'ouvrir. ${s.promesse.fr}`,
    })),
    {
      cle: 'fin-de-saison', delaiHeures: SEMAINES_VATA.length * 7 * JOUR - 7 * JOUR, newsletterId: '',
      titre: 'La fin de la saison',
      intention: 'Les sept semaines sont traversées : ce qu’elle a vécu, et la suite.',
    },
  ];
};

const bouton = 'rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-40';

const SequenceFormationPanel: React.FC<{ formationId: string; titre: string }> = ({ formationId, titre }) => {
  const navigate = useNavigate();
  const [seqs, setSeqs] = useState<Sequence[]>([]);
  const [compte, setCompte] = useState<Record<string, number>>({});
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => ecouterSequences(all => setSeqs(all.filter(s => s.declencheur?.type === 'achat' && s.declencheur.formationId === formationId))), [formationId]);
  const ids = seqs.map(s => s.id).join(',');
  useEffect(() => {
    for (const s of seqs) compterInscrits(s.id).then(n => setCompte(c => ({ ...c, [s.id]: n }))).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  const ouvrirLettre = (id: string) => navigate(`/admin/infolettre?lettre=${encodeURIComponent(id)}`);

  const garder = (s: Sequence, patch: Partial<Sequence>) =>
    enregistrerSequence(s.id, { titre: s.titre, actif: !!s.actif, declencheur: s.declencheur, etapes: s.etapes || [], ...patch });

  const creer = async () => {
    setOccupe(true); setMessage(null);
    try {
      const id = formationId === FORMATION_VATA ? 'accueil-vata' : `accueil-${formationId}`;
      await enregistrerSequence(id, {
        titre: `Accueil · ${titre}`, actif: false,
        declencheur: { type: 'achat', formationId },
        etapes: formationId === FORMATION_VATA ? serieVata() : [],
      });
    } catch (err: any) { setMessage(err?.message || 'La séquence n’a pas pu être créée.'); }
    finally { setOccupe(false); }
  };

  const preparerVata = async (s: Sequence) => {
    setOccupe(true); setMessage(null);
    try { await garder(s, { etapes: serieVata() }); }
    catch (err: any) { setMessage(err?.message || 'La série n’a pas pu être préparée.'); }
    finally { setOccupe(false); }
  };

  const basculer = async (s: Sequence) => {
    const manquantes = (s.etapes || []).filter(e => !e.newsletterId).length;
    if (!s.actif && manquantes > 0 && !confirm(`${manquantes} étape(s) n’ont pas encore de lettre et seront sautées. Allumer quand même ?`)) return;
    setOccupe(true);
    try { await garder(s, { actif: !s.actif }); } finally { setOccupe(false); }
  };

  // Une lettre neuve pour l'étape, avec l'en-tête de la dernière lettre générale.
  const ecrire = async (s: Sequence, i: number) => {
    const e = (s.etapes || [])[i];
    setOccupe(true); setMessage(null);
    try {
      const lettres = await getNewsletters();
      const modele = lettres.find(l => l.status === 'sent' && l.role !== 'sequence') || lettres[0];
      const id = await nouvelleLettreDepuis({ ...(modele || {}), subject: e.titre || '', preheader: '', blocks: [], audience: { mode: 'all' } } as any, `Séquence · ${s.titre} · ${e.titre || `étape ${i + 1}`}`);
      const etapes = (s.etapes || []).map((x, j) => (j === i ? { ...x, newsletterId: id } : x));
      await garder(s, { etapes });
      await marquerLettreSequence(id).catch(() => {});
      ouvrirLettre(id);
    } catch (err: any) { setMessage(err?.message || 'La lettre n’a pas pu être créée.'); }
    finally { setOccupe(false); }
  };

  return (
    <div className="mt-5 rounded-[15px] border border-[#BA7B39]/25 bg-[#BA7B39]/[0.04] p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h4 className="text-xs font-bold uppercase tracking-widest text-[#8B4A2F]">Séquence de courriels</h4>
        <button type="button" onClick={() => navigate('/admin/infolettre?onglet=sequences')} className="text-[11px] text-[#293027]/60 underline hover:text-[#8B4A2F] dark:text-white/60">
          Stratégie, tests et inscrites dans Infolettre › Courriels automatisés
        </button>
      </div>

      {seqs.length === 0 && (
        <div className="space-y-3">
          <p className="text-sm text-[#293027]/60 dark:text-white/60">Aucune séquence ne part encore après l’achat de cette formation.</p>
          <button type="button" disabled={occupe} onClick={creer} className={`${bouton} border-[#BA7B39] text-[#8B4A2F] hover:bg-[#BA7B39] hover:text-[#293027]`}>
            Créer la séquence de cette formation
          </button>
        </div>
      )}

      {seqs.map(s => {
        const etapes = s.etapes || [];
        const pretes = etapes.filter(e => e.newsletterId).length;
        return (
          <div key={s.id} className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-medium text-[#293027] dark:text-white">{s.titre}</p>
              <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${s.actif ? 'bg-[#BA7B39] text-[#293027]' : 'bg-[#293027]/10 text-[#293027]/60 dark:bg-white/10 dark:text-white/60'}`}>
                {s.actif ? 'Allumée' : 'Éteinte'}
              </span>
              <span className="text-xs text-[#293027]/50 dark:text-white/50">
                {pretes}/{etapes.length} lettre{etapes.length > 1 ? 's' : ''} écrite{pretes > 1 ? 's' : ''} · {compte[s.id] ?? 0} personne{(compte[s.id] ?? 0) > 1 ? 's' : ''} dans la séquence
              </span>
              <button type="button" disabled={occupe} onClick={() => basculer(s)} className={`${bouton} ml-auto ${s.actif ? 'border-[#293027]/30 text-[#293027]/70 dark:text-white/70' : 'border-[#BA7B39] text-[#8B4A2F] hover:bg-[#BA7B39] hover:text-[#293027]'}`}>
                {s.actif ? 'Éteindre' : 'Allumer'}
              </button>
            </div>

            {etapes.length === 0 && formationId === FORMATION_VATA && (
              <button type="button" disabled={occupe} onClick={() => preparerVata(s)} className={`${bouton} border-[#BA7B39] text-[#8B4A2F] hover:bg-[#BA7B39] hover:text-[#293027]`}>
                Préparer la série semaine par semaine
              </button>
            )}
            {etapes.length === 0 && formationId !== FORMATION_VATA && (
              <p className="text-sm text-[#293027]/60 dark:text-white/60">Aucune étape encore. Elles s’ajoutent dans Infolettre › Courriels automatisés.</p>
            )}

            <ol className="space-y-2">
              {etapes.map((e, i) => (
                <li key={e.cle || i} className="flex flex-wrap items-center gap-3 rounded-xl border border-[#293027]/10 bg-white/60 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                  <span className="w-32 shrink-0 text-[10px] font-bold uppercase tracking-widest text-[#8B4A2F]">{delaiLisible(e.delaiHeures)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#293027] dark:text-white">{e.titre || e.cle}</p>
                    {e.intention && <p className="mt-0.5 text-xs leading-relaxed text-[#293027]/55 dark:text-white/55">{e.intention}</p>}
                  </div>
                  {e.newsletterId ? (
                    <button type="button" onClick={() => ouvrirLettre(e.newsletterId)} className={`${bouton} border-[#293027]/20 text-[#293027]/70 hover:border-[#BA7B39] hover:text-[#8B4A2F] dark:border-white/20 dark:text-white/70`}>
                      <i className="fa-solid fa-pen mr-1" /> Ouvrir la lettre
                    </button>
                  ) : (
                    <button type="button" disabled={occupe} onClick={() => ecrire(s, i)} className={`${bouton} border-[#BA7B39] text-[#8B4A2F] hover:bg-[#BA7B39] hover:text-[#293027]`}>
                      Écrire la lettre
                    </button>
                  )}
                </li>
              ))}
            </ol>
          </div>
        );
      })}
      {message && <p className="mt-3 text-sm text-red-600">{message}</p>}
    </div>
  );
};

export default SequenceFormationPanel;
