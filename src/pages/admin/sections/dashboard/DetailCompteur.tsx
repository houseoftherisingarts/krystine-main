import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import Portail from '../../../../components/Portail';
import AdminClientView from '../../AdminClientView';
import { GhostButton, downloadCsv } from '../../primitives';
import { libelleTag } from '../../../../lib/paliers';
import { sourceLabel } from '../newsletter/SubscribersPanel';
import {
  chargerApercu, chargerPage, regrouperPar, trancheAge, AXES,
  type RequeteCompteur, type PersonneLigne, type AxeRegroupement,
} from '../../../../firebase/detailsCompteurs';

// Le détail derrière un nombre du tableau de bord (Krystine, 7 septembre
// 2026) : survol = aperçu des cinq plus récentes, clic = panneau complet
// (recherche, regroupement, pagination par cent, export CSV, fiche membre
// dépliée). Un seul composant, `<CompteurCliquable>`, enveloppe le chiffre
// déjà dessiné par la carte appelante — RapportDuJourCard et la carte
// « Votre communauté » de DashboardSection n'ont qu'à s'en envelopper.

const dateFR = (t?: { toDate(): Date }) =>
  t ? t.toDate().toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' }) : 'inconnue';
const nomDe = (l: PersonneLigne) => [l.prenom, l.nom].filter(Boolean).join(' ').trim() || 'Sans nom';
const langueDe = (lang?: string) => lang === 'en' ? 'Anglais' : lang === 'fr' ? 'Français' : 'inconnue';

// Traduit la clé brute d'un groupe (voir regrouperPar) en libellé lisible.
const libelleGroupe = (axe: AxeRegroupement, cle: string): string => {
  if (!cle) return 'Inconnu';
  if (axe === 'palier') return libelleTag(cle);
  if (axe === 'source') return sourceLabel(cle);
  if (axe === 'langue') return langueDe(cle);
  return cle;
};

// ─── Infobulle au survol ─────────────────────────────────────────────────
const Apercu: React.FC<{ requete: RequeteCompteur; onVoirTout: () => void }> = ({ requete, onVoirTout }) => {
  const [lignes, setLignes] = useState<PersonneLigne[] | null>(null);
  const clef = JSON.stringify(requete);
  useEffect(() => {
    let vivant = true;
    chargerApercu(requete).then(l => { if (vivant) setLignes(l); });
    return () => { vivant = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clef]);

  return (
    <div
      className="absolute z-40 top-full left-0 mt-2 w-72 rounded-[15px] border border-[#293027]/10 bg-[#F7F2E9] p-4 text-left shadow-[0_18px_40px_-16px_rgba(41,48,39,0.35)] dark:border-white/10 dark:bg-[#293027]"
      onClick={e => e.stopPropagation()}
    >
      {!lignes ? (
        <i className="fa-solid fa-circle-notch fa-spin text-[#8B4A2F]" />
      ) : lignes.length === 0 ? (
        <p className="text-xs text-[#293027]/50 dark:text-white/50">Personne ici pour l’instant.</p>
      ) : (
        <ul className="space-y-2">
          {lignes.map(l => (
            <li key={l.id} className="text-xs leading-tight">
              <span className="block font-bold text-[#293027] dark:text-white">{nomDe(l)}</span>
              <span className="block truncate text-[#293027]/50 dark:text-white/50">{l.email || 'courriel inconnu'} · {dateFR(l.dateInscription)}</span>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={onVoirTout}
        className="mt-3 text-[10px] font-bold uppercase tracking-widest text-[#BA7B39] hover:underline"
      >
        Voir tout
      </button>
    </div>
  );
};

// ─── Panneau complet ─────────────────────────────────────────────────────
const PanneauDetail: React.FC<{ requete: RequeteCompteur; titre: string; definition: string; onFermer: () => void }> = ({
  requete, titre, definition, onFermer,
}) => {
  const [lignes, setLignes] = useState<PersonneLigne[]>([]);
  const [curseur, setCurseur] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [fin, setFin] = useState(false);
  const [charge, setCharge] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [recherche, setRecherche] = useState('');
  const [axe, setAxe] = useState<AxeRegroupement>('aucun');
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [ficheUid, setFicheUid] = useState<string | null>(null);
  const [repliees, setReplies] = useState<Set<string>>(new Set());
  const clef = JSON.stringify(requete);
  const basculerGroupe = (cle: string) => setReplies((s) => {
    const n = new Set(s);
    if (n.has(cle)) n.delete(cle); else n.add(cle);
    return n;
  });

  const chargerSuite = async (premiere: boolean, curseurActuel: QueryDocumentSnapshot<DocumentData> | null) => {
    setCharge(true); setErreur(null);
    try {
      const r = await chargerPage(requete, premiere ? null : curseurActuel);
      setLignes(p => premiere ? r.lignes : [...p, ...r.lignes]);
      setCurseur(r.dernier);
      setFin(r.fin);
    } catch {
      setErreur('La lecture a échoué — un index Firestore manque peut-être encore pour cette requête.');
      setFin(true);
    } finally {
      setCharge(false);
    }
  };

  useEffect(() => {
    setLignes([]); setCurseur(null); setFin(false); setOuverte(null);
    chargerSuite(true, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clef]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onFermer(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onFermer]);

  const filtrees = useMemo(() => {
    if (!recherche) return lignes;
    const f = recherche.toLowerCase();
    return lignes.filter(l => l.email?.toLowerCase().includes(f) || l.prenom?.toLowerCase().includes(f) || l.nom?.toLowerCase().includes(f));
  }, [lignes, recherche]);

  const groupes = useMemo(() => regrouperPar(filtrees, axe), [filtrees, axe]);
  const plusGrand = Math.max(1, ...groupes.map(g => g.lignes.length));
  const rienNeSePrecise = axe !== 'aucun' && filtrees.length > 0 && groupes.every(g => g.cle === '');

  const exporter = () => {
    const rows = groupes.flatMap(g => g.lignes.map(l => ({
      prenom: l.prenom || '', nom: l.nom || '', email: l.email || '',
      dateInscription: l.dateInscription?.toDate().toISOString() || '',
      source: l.source || '', langue: l.lang || '', statut: l.statut || '',
      palier: l.palier ? libelleTag(l.palier) : '',
      pays: l.pays || '', region: l.region || '',
      desabonneeLe: l.unsubscribedAt?.toDate().toISOString() || '',
      ...(axe !== 'aucun' ? { groupe: libelleGroupe(axe, g.cle) } : {}),
    })));
    const slug = titre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    downloadCsv(`${slug}_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  return (
    <Portail>
      <div className="fixed inset-0 z-[130] flex justify-end bg-[#293027]/60 backdrop-blur-sm" onClick={onFermer}>
        <div
          className="relative flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-[#F7F2E9] shadow-2xl dark:bg-[#293027]"
          onClick={e => e.stopPropagation()}
        >
          <div className="sticky top-0 z-10 border-b border-[#293027]/10 bg-[#F7F2E9]/95 px-6 py-5 backdrop-blur dark:border-white/10 dark:bg-[#293027]/95">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-serif text-2xl text-[#293027] dark:text-white">{titre}</h3>
                <p className="mt-1 text-sm text-[#293027]/60 dark:text-white/60">{definition}</p>
              </div>
              <button type="button" onClick={onFermer} aria-label="Fermer" className="w-9 h-9 shrink-0 rounded-full text-[#293027]/40 hover:text-[#293027] dark:text-white/40 dark:hover:text-white">
                <i className="fa-solid fa-times text-lg" />
              </button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <input
                type="search"
                placeholder="Rechercher (prénom, courriel)…"
                value={recherche}
                onChange={e => setRecherche(e.target.value)}
                className="min-w-[200px] flex-1 rounded-full border border-[#293027]/15 bg-white/70 px-4 py-2 text-sm text-[#293027] outline-none focus:border-[#BA7B39] dark:border-white/15 dark:bg-white/5 dark:text-white"
              />
              <select
                value={axe}
                onChange={e => setAxe(e.target.value as AxeRegroupement)}
                title="Regrouper par"
                className="rounded-full border border-[#293027]/15 bg-white/70 px-4 py-2 text-sm text-[#293027] outline-none focus:border-[#BA7B39] dark:border-white/15 dark:bg-white/5 dark:text-white"
              >
                {AXES.map(a => <option key={a.valeur} value={a.valeur}>{a.valeur === 'aucun' ? 'Regrouper par…' : `Regrouper par ${a.libelle.toLowerCase()}`}</option>)}
              </select>
              <GhostButton onClick={exporter} disabled={lignes.length === 0}>
                <i className="fa-solid fa-file-csv" /> Exporter CSV
              </GhostButton>
            </div>
            <p className="mt-2 text-[11px] text-[#293027]/45 dark:text-white/45">
              {filtrees.length.toLocaleString('fr-CA')} sur {lignes.length.toLocaleString('fr-CA')} fiche{lignes.length > 1 ? 's' : ''} chargée{lignes.length > 1 ? 's' : ''}
              {!fin && ' · d’autres restent à charger'}
              {axe !== 'aucun' && ' · le regroupement porte sur ce qui est chargé ici'}
            </p>
            {rienNeSePrecise && (
              <p className="mt-1 text-[11px] italic text-[#293027]/40 dark:text-white/40">Cette donnée n’est pas encore recueillie pour les personnes affichées ici.</p>
            )}
          </div>

          <div className="flex-1 px-6 py-5">
            {erreur && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{erreur}</p>}
            {lignes.length === 0 && charge ? (
              <div className="flex justify-center py-12"><i className="fa-solid fa-circle-notch fa-spin text-2xl text-[#8B4A2F]" /></div>
            ) : filtrees.length === 0 ? (
              <p className="py-12 text-center text-sm text-[#293027]/40 dark:text-white/40">Personne à afficher ici.</p>
            ) : (
              <div className="space-y-6">
                {groupes.map(g => (
                  <div key={g.cle || '_'}>
                    {axe !== 'aucun' && (
                      <div className="mb-2">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="font-serif text-base text-[#293027] dark:text-white">{libelleGroupe(axe, g.cle)}</span>
                          <span className="text-xs font-bold tabular-nums text-[#BA7B39]">{g.lignes.length}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#293027]/8 dark:bg-white/10">
                          <div className="h-full rounded-full bg-[#BA7B39]" style={{ width: `${(g.lignes.length / plusGrand) * 100}%` }} />
                        </div>
                      </div>
                    )}
                    <ul className="divide-y divide-[#293027]/8 overflow-hidden rounded-[15px] border border-[#293027]/10 dark:divide-white/10 dark:border-white/10">
                      {g.lignes.map(l => (
                        <li key={l.id}>
                          <button
                            type="button"
                            onClick={() => setOuverte(ouverte === l.id ? null : l.id)}
                            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#BA7B39]/5"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-bold text-[#293027] dark:text-white">{nomDe(l)}</span>
                              <span className="block truncate text-xs text-[#293027]/50 dark:text-white/50">{l.email || 'Courriel inconnu'}</span>
                            </span>
                            <span className="shrink-0 text-xs text-[#293027]/50 dark:text-white/50">{dateFR(l.dateInscription)}</span>
                          </button>
                          {ouverte === l.id && (
                            <div className="space-y-1.5 border-t border-[#293027]/8 bg-[#BA7B39]/5 px-4 py-4 text-xs text-[#293027] dark:border-white/10 dark:text-white">
                              <p><strong>Source d’inscription :</strong> {l.source ? sourceLabel(l.source) : 'inconnue'}</p>
                              <p><strong>Langue :</strong> {langueDe(l.lang)}</p>
                              <p><strong>Statut :</strong> {l.statut || 'inconnu'}</p>
                              <p><strong>Palier :</strong> {l.palier ? libelleTag(l.palier) : 'inconnu'}</p>
                              <p><strong>Pays :</strong> {l.pays || 'inconnu'}{l.region ? ` · ${l.region}` : ''}</p>
                              {l.anneeNaissance && <p><strong>Tranche d’âge :</strong> {trancheAge(l.anneeNaissance)}</p>}
                              {l.unsubscribedAt && <p><strong>Désabonnée le :</strong> {dateFR(l.unsubscribedAt)} · raison inconnue (le champ n’existe pas encore)</p>}
                              {l.uid ? (
                                <button
                                  type="button"
                                  onClick={() => setFicheUid(l.uid!)}
                                  className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#BA7B39] px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-[#293027] hover:bg-[#293027] hover:text-[#8B4A2F]"
                                >
                                  <i className="fa-solid fa-user" /> Voir la fiche membre
                                </button>
                              ) : (
                                <p className="text-[#293027]/40 dark:text-white/40">Pas de compte lié.</p>
                              )}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {!fin && lignes.length > 0 && (
              <div className="mt-5 flex justify-center">
                <GhostButton onClick={() => chargerSuite(false, curseur)} disabled={charge}>
                  {charge ? <i className="fa-solid fa-circle-notch fa-spin" /> : <i className="fa-solid fa-chevron-down" />} Charger 100 de plus
                </GhostButton>
              </div>
            )}
          </div>
        </div>
      </div>
      {ficheUid && <AdminClientView uid={ficheUid} onClose={() => setFicheUid(null)} />}
    </Portail>
  );
};

// ─── L'enveloppe que les cartes appelantes posent sur un chiffre ─────────
export interface CompteurCliquableProps {
  children: React.ReactNode;
  requete: RequeteCompteur;
  titre: string;
  definition: string;
  className?: string;
}

const CompteurCliquable: React.FC<CompteurCliquableProps> = ({ children, requete, titre, definition, className }) => {
  const [survole, setSurvole] = useState(false);
  const [ouvert, setOuvert] = useState(false);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  const entrer = () => { minuteur.current = setTimeout(() => setSurvole(true), 150); };
  const sortir = () => { if (minuteur.current) clearTimeout(minuteur.current); setSurvole(false); };

  return (
    <div className={`relative ${className || ''}`} onMouseEnter={entrer} onMouseLeave={sortir}>
      <button type="button" onClick={() => { setSurvole(false); setOuvert(true); }} className="block w-full text-left">
        {children}
      </button>
      {survole && !ouvert && <Apercu requete={requete} onVoirTout={() => { setSurvole(false); setOuvert(true); }} />}
      {ouvert && <PanneauDetail requete={requete} titre={titre} definition={definition} onFermer={() => setOuvert(false)} />}
    </div>
  );
};

export default CompteurCliquable;
