import React, { useEffect, useMemo, useRef, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc, type Timestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app, { db } from '../../../firebase';
import { Card, DangerButton, EmptyState, GhostButton, PrimaryButton } from '../primitives';
import Portail from '../../../components/Portail';

// Les problèmes techniques signalés depuis l'espace client (bouton « Problème
// technique »). Chaque rapport porte le texte, la page, l'écran, le navigateur
// et la capture; Krystine le règle d'un clic. La même fiche existe dans
// l'onglet Demandes de l'admin Vexel, sous « Krystine ».

type Statut = 'nouveau' | 'en_cours' | 'regle';

interface Bug {
  id: string;
  uid: string;
  nom: string;
  courriel: string;
  texte: string;
  page: string;
  capture: string;
  agent: string;
  ecran: string;
  statut: Statut;
  vexel: 'transmis' | 'echec';
  type?: 'aime' | 'idee' | 'technique' | 'introuvable';
  cree?: Timestamp;
  reponses?: { texte: string; le?: Timestamp; par?: string }[];
}

// Le type choisi en tête du formulaire (6 oct. 2026). Une fiche sans type
// vient du bouton « Problème technique » de l'espace client : c'est un blocage.
const TYPES: Record<string, { label: string; color: string }> = {
  aime:        { label: 'J\'aime ce que je vois', color: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  idee:        { label: 'Une idée', color: 'bg-[#BA7B39]/10 text-[#7d6330] dark:text-[#d9a05b]' },
  technique:   { label: 'Quelque chose bloque', color: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  introuvable: { label: 'Ne trouve pas ce qu\'elle cherche', color: 'bg-[#38403a]/10 text-[#293027] dark:bg-white/10 dark:text-white' },
};

const STATUTS: { id: Statut; label: string; color: string }[] = [
  { id: 'nouveau',  label: 'Nouveau',  color: 'bg-[#BA7B39]/10 text-[#8B4A2F] dark:text-[#d9a05b]' },
  { id: 'en_cours', label: 'En cours', color: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  { id: 'regle',    label: 'Réglé',    color: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
];

/** Le navigateur et l'appareil, en deux mots, à partir du user agent. */
function navigateur(agent: string): string {
  const os = /iPhone|iPad/.test(agent) ? 'iOS' : /Android/.test(agent) ? 'Android' : /Mac OS/.test(agent) ? 'Mac' : /Windows/.test(agent) ? 'Windows' : /Linux/.test(agent) ? 'Linux' : '';
  const nav = /Edg\//.test(agent) ? 'Edge' : /OPR\//.test(agent) ? 'Opera' : /Chrome\//.test(agent) ? 'Chrome' : /Firefox\//.test(agent) ? 'Firefox' : /Safari\//.test(agent) ? 'Safari' : '';
  return [nav, os].filter(Boolean).join(' · ');
}

// ─── Répondre à la visiteuse (7 oct. 2026) ──────────────────────────────────
// La réponse part par la fonction `repondreCommentaire` (admins seulement) :
// courriel à la visiteuse, ajout au tableau `reponses` de la fiche, statut Réglé.

const EMOJIS = ['🌿', '🙏', '💛', '✨', '😊', '🌸', '🔥', '🍂', '☀️', '🤍', '👏', '🫶'];

function texteDeDepart(nom: string): string {
  const prenom = nom.trim().split(/\s+/)[0] || '';
  return `Bonjour${prenom ? ` ${prenom}` : ''},\n\nMerci… \n\nL'équipe bienveillante TeamKsl`;
}

const Repondre: React.FC<{ bug: Bug; onEnvoye?: () => void }> = ({ bug, onEnvoye }) => {
  const [texte, setTexte] = useState(() => texteDeDepart(bug.nom || ''));
  const [ouvert, setOuvert] = useState(false);
  const [confirmer, setConfirmer] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState('');
  const zone = useRef<HTMLTextAreaElement>(null);
  const reponses = bug.reponses ?? [];

  const inserer = (e: string) => {
    const t = zone.current;
    const debut = t?.selectionStart ?? texte.length;
    const fin = t?.selectionEnd ?? texte.length;
    setTexte(texte.slice(0, debut) + e + texte.slice(fin));
    setConfirmer(false);
    requestAnimationFrame(() => {
      if (!t) return;
      t.focus();
      t.selectionStart = t.selectionEnd = debut + e.length;
    });
  };

  const envoyer = async () => {
    if (envoi || !app) return;
    setEnvoi(true);
    setErreur('');
    try {
      const call = httpsCallable<{ id: string; message: string }, { ok: boolean }>(getFunctions(app, 'us-central1'), 'repondreCommentaire');
      await call({ id: bug.id, message: texte.trim() });
      setEnvoye(true);
      onEnvoye?.();
      setOuvert(false);
      setConfirmer(false);
      setTexte(texteDeDepart(bug.nom || ''));
    } catch (err) {
      setErreur((err as Error).message || 'Envoi impossible.');
      setConfirmer(false);
    } finally {
      setEnvoi(false);
    }
  };

  const historique = reponses.length > 0 && (
    <div className="mt-4 space-y-2">
      {reponses.map((r, i) => (
        <div key={i} className="rounded-xl border-l-2 border-[#BA7B39]/60 bg-[#BA7B39]/5 px-4 py-3 dark:bg-white/5">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#7d6330] dark:text-[#d9a05b]">
            Réponse envoyée{r.le?.toDate ? ` · ${r.le.toDate().toLocaleString('fr-CA', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}{r.par ? ` · ${r.par}` : ''}
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#293027]/85 dark:text-white/85">{r.texte}</p>
        </div>
      ))}
    </div>
  );

  if (!bug.courriel) {
    return (
      <>
        {historique}
        <p className="mt-4 text-xs text-[#293027]/50 dark:text-white/50">Pas de courriel : réponse impossible.</p>
      </>
    );
  }

  const trop = texte.trim().length > 5000;
  const vide = texte.trim().length === 0;

  return (
    <>
      {historique}
      {envoye && !ouvert && (
        <p className="mt-3 text-xs font-semibold text-green-700 dark:text-green-300"><i className="fa-solid fa-check mr-1" />Réponse envoyée à {bug.courriel}</p>
      )}
      {!ouvert ? (
        <div className="mt-4">
          <GhostButton onClick={() => { setOuvert(true); setEnvoye(false); }}><i className="fa-solid fa-reply" /> Répondre</GhostButton>
        </div>
      ) : (
        <div className="mt-4 rounded-[14px] border border-[#38403a]/10 bg-white/40 p-4 dark:border-white/10 dark:bg-white/5">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#293027]/60 dark:text-white/60">Répondre à {bug.courriel}</p>
          <textarea
            ref={zone}
            value={texte}
            onChange={(e) => { setTexte(e.target.value); setConfirmer(false); }}
            rows={7}
            maxLength={5200}
            className="w-full resize-y rounded-xl border border-[#38403a]/10 bg-white/60 px-4 py-3 text-sm leading-relaxed text-[#293027] outline-none transition-colors focus:border-[#BA7B39] dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          <div className="mt-2 flex flex-wrap gap-1" aria-label="Ajouter un émoji">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => inserer(e)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-lg transition-colors hover:bg-[#BA7B39]/10 dark:hover:bg-white/10"
                title={`Ajouter ${e}`}
              >
                {e}
              </button>
            ))}
          </div>
          {trop && <p className="mt-2 text-xs text-red-600 dark:text-red-300">La réponse dépasse 5000 caractères.</p>}
          {erreur && <p className="mt-2 text-xs text-red-600 dark:text-red-300">{erreur}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {!confirmer ? (
              <PrimaryButton type="button" disabled={vide || trop || envoi} onClick={() => setConfirmer(true)}>
                <i className="fa-solid fa-paper-plane" /> Envoyer la réponse
              </PrimaryButton>
            ) : (
              <>
                <PrimaryButton type="button" disabled={envoi} onClick={envoyer}>
                  {envoi ? 'Envoi…' : 'Confirmer l\'envoi'}
                </PrimaryButton>
                <span className="text-xs text-[#293027]/60 dark:text-white/60">Le courriel part à {bug.courriel}.</span>
              </>
            )}
            <GhostButton type="button" disabled={envoi} onClick={() => { setOuvert(false); setConfirmer(false); setErreur(''); }}>Annuler</GhostButton>
          </div>
        </div>
      )}
    </>
  );
};

const BugsSection: React.FC = () => {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [filtre, setFiltre] = useState<'ouverts' | 'regles' | 'tous'>('ouverts');
  const [grande, setGrande] = useState('');
  // Une fiche à laquelle on vient de répondre passe à Réglé; elle reste visible
  // jusqu'au prochain chargement pour que l'on voie « Réponse envoyée ».
  const [repondus, setRepondus] = useState<string[]>([]);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'bugs'), orderBy('cree', 'desc'));
    return onSnapshot(q, (snap) => setBugs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Bug, 'id'>) }))));
  }, []);

  const liste = useMemo(() => {
    if (filtre === 'ouverts') return bugs.filter((b) => b.statut !== 'regle' || repondus.includes(b.id));
    if (filtre === 'regles') return bugs.filter((b) => b.statut === 'regle');
    return bugs;
  }, [bugs, filtre, repondus]);

  const poser = (id: string, statut: Statut) => db && updateDoc(doc(db, 'bugs', id), { statut });
  const retirer = (id: string) => db && window.confirm('Retirer ce rapport ?') && deleteDoc(doc(db, 'bugs', id));

  const ouverts = bugs.filter((b) => b.statut !== 'regle').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl text-[#293027] dark:text-white">Commentaires des visiteuses</h2>
          <p className="mt-1 max-w-xl text-sm text-[#293027]/70 dark:text-white/70">
            Ce que vos membres et visiteuses vous écrivent depuis la pastille « Un commentaire ? Écrivez-nous » du site (ce qu'elles aiment, leurs idées, ce qui bloque) ou le bouton « Problème technique » de leur espace. Le studio reçoit la même fiche et s'occupe de ce qui bloque.
          </p>
        </div>
        <div className="flex gap-1 rounded-full border border-[#38403a]/10 bg-white/40 p-1 dark:border-white/10 dark:bg-white/5">
          {([['ouverts', `À régler${ouverts ? ` · ${ouverts}` : ''}`], ['regles', 'Réglés'], ['tous', 'Tous']] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFiltre(id)}
              className={`rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-colors ${filtre === id ? 'bg-[#293027] text-[#EEE7DB] dark:bg-[#BA7B39] dark:text-[#293027]' : 'text-[#38403a]/60 hover:text-[#293027] dark:text-white/60 dark:hover:text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {liste.length === 0 ? (
        <Card><EmptyState icon="fa-bug">Aucun commentaire{filtre === 'ouverts' ? ' à traiter en ce moment' : ''}.</EmptyState></Card>
      ) : (
        <div className="grid gap-4">
          {liste.map((b) => {
            const etat = STATUTS.find((s) => s.id === b.statut) ?? STATUTS[0];
            return (
              <Card key={b.id} className="p-5 md:p-6">
                <div className="grid gap-5 md:grid-cols-[1fr_220px]">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${etat.color}`}>{etat.label}</span>
                      {(() => { const ty = TYPES[b.type || 'technique']; return ty && (
                        <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${ty.color}`}>{ty.label}</span>
                      ); })()}
                      {b.vexel === 'echec' && (
                        <span className="rounded-full bg-red-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-red-600 dark:bg-red-900/30 dark:text-red-300" title="La porte du studio n'a pas répondu au moment de l'envoi.">
                          Pas reçu par le studio
                        </span>
                      )}
                      <span className="text-xs text-[#293027]/50 dark:text-white/50">
                        {b.cree?.toDate ? b.cree.toDate().toLocaleString('fr-CA', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-[#293027] dark:text-white">
                      {b.nom || b.courriel || 'Membre'}
                      {b.nom && b.courriel && <span className="ml-2 font-normal text-[#293027]/50 dark:text-white/50">{b.courriel}</span>}
                    </p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#293027]/85 dark:text-white/85">{b.texte}</p>
                    <p className="mt-3 text-xs text-[#293027]/50 dark:text-white/50">
                      <a href={`https://krystinestlaurent.ca${b.page}`} target="_blank" rel="noreferrer" className="underline decoration-[#BA7B39]/50 hover:text-[#8B4A2F]">{b.page}</a>
                      {b.ecran ? ` · ${b.ecran}` : ''}
                      {b.agent ? ` · ${navigateur(b.agent)}` : ''}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {b.statut !== 'regle' && <GhostButton onClick={() => poser(b.id, 'regle')}><i className="fa-solid fa-check" /> Marquer réglé</GhostButton>}
                      {b.statut === 'nouveau' && <GhostButton onClick={() => poser(b.id, 'en_cours')}>En cours</GhostButton>}
                      {b.statut === 'regle' && <GhostButton onClick={() => poser(b.id, 'nouveau')}>Rouvrir</GhostButton>}
                      <DangerButton onClick={() => retirer(b.id)}><i className="fa-solid fa-trash" /></DangerButton>
                    </div>
                    <Repondre bug={b} onEnvoye={() => setRepondus((r) => [...r, b.id])} />
                  </div>
                  <div>
                    {b.capture ? (
                      <button type="button" onClick={() => setGrande(b.capture)} className="block w-full overflow-hidden rounded-[14px] border border-white/70 bg-white/40 dark:border-white/10 dark:bg-white/5" title="Agrandir la capture">
                        <img src={b.capture} alt="Capture d'écran du problème" className="h-40 w-full object-cover object-top" loading="lazy" />
                      </button>
                    ) : (
                      <div className="flex h-40 items-center justify-center rounded-[14px] border border-dashed border-[#38403a]/15 text-xs text-[#293027]/40 dark:border-white/15 dark:text-white/40">
                        Sans capture
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {grande && (
        <Portail>
        <div className="fixed inset-0 z-[150] flex items-center justify-center overflow-y-auto overscroll-contain bg-[#151d19]/85 p-4" onClick={() => setGrande('')}>
          <img src={grande} alt="" className="max-h-full max-w-full rounded-[12px] shadow-2xl" />
          <a href={grande} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="absolute bottom-6 right-6 rounded-full bg-white/15 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-white backdrop-blur hover:bg-white/25">
            <i className="fa-solid fa-arrow-up-right-from-square mr-2" />Ouvrir en grand
          </a>
        </div>
        </Portail>
      )}
    </div>
  );
};

export default BugsSection;
