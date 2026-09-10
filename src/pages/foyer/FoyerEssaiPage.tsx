import React, { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import app from '../../firebase';
import { subscribeToAuthState, isAdminUser } from '../../firebase/auth';
import { PORTES, type Porte } from './portesData';
import TexteLecon from '../../lib/texteLecon';
import {
  chargerToutesLecons, chargerLeconsPorte, creerLeconEssai, majLeconEssai, setLeconEssaiOrdre,
  supprimerLeconEssai, televerserPiece, enregistrerPiece, retirerPieceLecon, poids,
  type LeconEssai, type PieceEssai, type PieceType,
} from '../../firebase/foyerEssai';

// ─────────────────────────────────────────────────────────────────────────
// FOYER D'ORIGINE, PAGE D'ESSAI (bac à sable, hors page de vente réelle)
// Demande d'Alex, 10 septembre 2026 : Krystine veut s'entraîner à bâtir ses
// modules là où elle travaillera vraiment, dans l'espace tel qu'une membre
// le voit, avant l'ouverture du vrai Foyer. Cette page vit à /foyer-essai,
// réservée aux administratrices, jamais liée nulle part.
//
// Une porte est un module au sens Kajabi (help.kajabi.com/articles/products/
// courses/courses-overview : « Categories »/modules qui contiennent des
// « Posts »/leçons, chaque leçon pouvant porter média, texte et fichiers à
// télécharger) : un titre et une intro fixes (portesData.ts, inchangés) et
// une liste ordonnée de leçons. Chaque leçon porte son propre titre, son
// propre texte, et autant de pièces jointes qu'il faut, chacune avec sa
// propre barre de progression et son propre retrait (src/firebase/foyerEssai.ts).
//
// CLOISONNEMENT TOTAL : les fichiers vivent dans le dossier Storage
// `foyer-essai/`, distinct de `formations-contenu/`, et les documents dans
// la collection Firestore `foyerEssai`, distincte de `formations`. Rien de
// ce qui est déposé ici ne touche le vrai Foyer, et Krystine peut tout
// supprimer sans conséquence.
// ─────────────────────────────────────────────────────────────────────────

const ICONE_PIECE: Record<PieceType, string> = {
  video: 'fa-circle-play', audio: 'fa-music', pdf: 'fa-file-pdf', image: 'fa-image', fichier: 'fa-file',
};

const champ = 'w-full rounded-xl border border-brass/30 bg-cream px-3 py-2 font-sans text-sm text-espresso outline-none focus:border-brassInk';
const boutonPastille = 'inline-flex cursor-pointer items-center gap-2 rounded-full border border-brass/50 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-brassInk transition-colors hover:border-brassInk hover:text-espresso';

interface EnCoursPiece { pct: number; nom: string; taille: number; task: { cancel: () => void } }

// ─── Une pièce jointe : lecteur en vue cliente, barre de progrès + retrait en édition ───
const PieceRow: React.FC<{
  piece?: PieceEssai; enCours?: EnCoursPiece; vueCliente: boolean; onRetirer?: () => void;
}> = ({ piece, enCours, vueCliente, onRetirer }) => {
  if (enCours) {
    return (
      <div className="rounded-[10px] border border-brass/25 bg-cream px-3 py-2">
        <p className="truncate text-[11px] uppercase tracking-wide text-brassInk" title={enCours.nom}>{enCours.nom} · {poids(enCours.taille)}</p>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-brass/20">
          <div className="h-full rounded-full bg-brass transition-[width] duration-300" style={{ width: `${Math.max(4, enCours.pct)}%` }} />
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-brassInk">
          <span>Envoi {Math.round(enCours.pct)} %</span>
          <button type="button" onClick={() => enCours.task.cancel()} className="underline hover:text-espresso">Annuler</button>
        </div>
      </div>
    );
  }
  if (!piece) return null;

  if (vueCliente) {
    if (piece.type === 'video') return <video controls preload="metadata" src={piece.url} className="w-full rounded-[10px] bg-espressoDeep" />;
    if (piece.type === 'audio') return <audio controls src={piece.url} className="w-full" />;
    if (piece.type === 'image') return <img src={piece.url} alt={piece.nom} className="w-full rounded-[10px] object-cover" />;
    return (
      <a href={piece.url} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-brass/40 px-4 py-2 text-sm text-brassInk transition-colors hover:bg-brass/10">
        <i className={`fa-solid ${ICONE_PIECE[piece.type]}`} /> {piece.nom}
      </a>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-[10px] bg-cream px-3 py-2 text-sm">
      <i className={`fa-solid ${ICONE_PIECE[piece.type]} shrink-0 text-brassInk`} />
      <span className="min-w-0 flex-1 truncate text-espresso" title={piece.nom}>{piece.nom}</span>
      <span className="shrink-0 text-[10px] text-espresso/40">{poids(piece.taille)}</span>
      {onRetirer && (
        <button type="button" onClick={onRetirer} aria-label={`Retirer ${piece.nom}`} className="shrink-0 text-espresso/30 hover:text-red-700">
          <i className="fa-solid fa-trash text-xs" />
        </button>
      )}
    </div>
  );
};

// ─── Une leçon : ligne repliée + panneau d'édition, ou lecture pleine en vue cliente ───
const LeconCard: React.FC<{
  porteId: string; lecon: LeconEssai; index: number; total: number; vueCliente: boolean;
  onMonter: () => void; onDescendre: () => void; onSupprimer: () => void; onMaj: () => void;
}> = ({ porteId, lecon, index, total, vueCliente, onMonter, onDescendre, onSupprimer, onMaj }) => {
  const [ouverte, setOuverte] = useState(false);
  const [titre, setTitre] = useState(lecon.titre);
  const [texte, setTexte] = useState(lecon.texte || '');
  const [occupe, setOccupe] = useState(false);
  const [enregistre, setEnregistre] = useState(false);
  const [enCours, setEnCours] = useState<Record<string, EnCoursPiece>>({});
  const fichierRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTitre(lecon.titre); setTexte(lecon.texte || ''); }, [lecon.titre, lecon.texte]);

  const enregistrer = async () => {
    setOccupe(true);
    try {
      await majLeconEssai(porteId, lecon.id, { titre: titre.trim() || lecon.titre, texte });
      setEnregistre(true); setTimeout(() => setEnregistre(false), 2000);
      onMaj();
    } finally { setOccupe(false); }
  };

  const deposer = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichiers = Array.from(e.target.files || []);
    if (fichierRef.current) fichierRef.current.value = '';
    fichiers.forEach(file => {
      const tempId = `${Date.now()}_${file.name}`;
      const { task, done } = televerserPiece(porteId, lecon.id, file, pct => {
        setEnCours(c => (c[tempId] ? { ...c, [tempId]: { ...c[tempId], pct } } : c));
      });
      setEnCours(c => ({ ...c, [tempId]: { pct: 0, nom: file.name, taille: file.size, task } }));
      done.then(async piece => {
        await enregistrerPiece(porteId, lecon.id, piece);
        setEnCours(c => { const n = { ...c }; delete n[tempId]; return n; });
        onMaj();
      }).catch(() => {
        setEnCours(c => { const n = { ...c }; delete n[tempId]; return n; });
      });
    });
  };

  const retirerPiece = async (piece: PieceEssai) => {
    await retirerPieceLecon(porteId, lecon.id, piece);
    onMaj();
  };

  // ── Vue cliente : lecture seule, jamais de geste d'édition ──
  if (vueCliente) {
    return (
      <div className="rounded-[15px] border border-brass/25 bg-cream2 p-5">
        <p className="font-serif text-lg leading-snug text-espresso">{index + 1}. {lecon.titre}</p>
        {lecon.texte?.trim() && <TexteLecon texte={lecon.texte} className="mt-3 max-w-[68ch] font-sans text-sm leading-relaxed text-ink/80" />}
        {lecon.pieces.length > 0 ? (
          <div className="mt-4 space-y-3">
            {lecon.pieces.map(p => <PieceRow key={p.id} piece={p} vueCliente onRetirer={undefined} />)}
          </div>
        ) : !lecon.texte?.trim() && (
          <p className="mt-3 text-sm text-ink/40">Cette leçon s'ouvrira bientôt.</p>
        )}
      </div>
    );
  }

  // ── Édition : ligne repliée, puis le panneau si ouverte ──
  return (
    <div className="rounded-[15px] border border-brass/25 bg-cream2">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="min-w-0 flex-1 truncate font-sans text-sm text-espresso">
          {index + 1}. {lecon.titre}
          {lecon.pieces.length > 0 && (
            <span className="ml-2 rounded-full bg-brass/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brassInk">
              {lecon.pieces.length} pièce{lecon.pieces.length > 1 ? 's' : ''}
            </span>
          )}
        </span>
        <button type="button" onClick={() => setOuverte(o => !o)} title="Éditer la leçon" className="text-espresso/40 hover:text-brassInk"><i className="fa-solid fa-pen" /></button>
        <button type="button" onClick={onMonter} disabled={index === 0} title="Monter" className="text-espresso/40 hover:text-brassInk disabled:opacity-20"><i className="fa-solid fa-chevron-up" /></button>
        <button type="button" onClick={onDescendre} disabled={index === total - 1} title="Descendre" className="text-espresso/40 hover:text-brassInk disabled:opacity-20"><i className="fa-solid fa-chevron-down" /></button>
        <button type="button" onClick={onSupprimer} title="Supprimer la leçon" className="text-red-400 hover:text-red-700"><i className="fa-solid fa-trash" /></button>
      </div>

      {ouverte && (
        <div className="space-y-3 border-t border-brass/20 p-4">
          <input value={titre} onChange={e => setTitre(e.target.value)} placeholder="Titre de la leçon" className={champ} />
          <textarea value={texte} onChange={e => setTexte(e.target.value)} rows={5}
            placeholder="Le texte qui accompagne la leçon : la consigne, l'exercice, ce que dit la vidéo…"
            className={`${champ} resize-y`} />

          <div className="rounded-xl bg-cream/60 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-brassInk">Pièces jointes ({lecon.pieces.length})</p>
              <label className={boutonPastille}>
                <i className="fa-solid fa-paperclip" /> Ajouter une pièce
                <input ref={fichierRef} type="file" multiple accept="video/*,audio/*,application/pdf,image/*" className="hidden" onChange={deposer} />
              </label>
            </div>
            <div className="mt-2 space-y-2">
              {lecon.pieces.map(p => <PieceRow key={p.id} piece={p} vueCliente={false} onRetirer={() => retirerPiece(p)} />)}
              {Object.entries(enCours).map(([tempId, e]) => <PieceRow key={tempId} enCours={e} vueCliente={false} />)}
              {lecon.pieces.length === 0 && Object.keys(enCours).length === 0 && (
                <p className="text-xs text-espresso/40">Aucune pièce déposée pour l'instant. Une leçon vide peut attendre son contenu.</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            {enregistre && <span className="mr-auto text-xs text-green-700">Enregistré.</span>}
            <button type="button" onClick={() => setOuverte(false)} className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-espresso/50">Fermer</button>
            <button type="button" onClick={enregistrer} disabled={occupe}
              className="rounded-full bg-brass px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-espresso disabled:opacity-50">
              {occupe ? 'Un instant…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Le module d'une porte : intro fixe + liste ordonnée de leçons ──────────
const ModuleView: React.FC<{
  porte: Porte; lecons: LeconEssai[]; vueCliente: boolean; onRetour: () => void;
  onMaj: (lecons: LeconEssai[]) => void;
}> = ({ porte, lecons, vueCliente, onRetour, onMaj }) => {
  const [nouvelleTitre, setNouvelleTitre] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const refresh = () => chargerLeconsPorte(porte.n).then(onMaj);

  const creer = async () => {
    const titre = (nouvelleTitre || '').trim();
    if (!titre) return;
    setErreur(null);
    try { await creerLeconEssai(porte.n, titre, lecons.length); setNouvelleTitre(null); await refresh(); }
    catch (err: any) { setErreur(err?.message || "La leçon n'a pas pu être créée."); }
  };

  const bouger = async (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= lecons.length) return;
    await Promise.all([setLeconEssaiOrdre(porte.n, lecons[i].id, j), setLeconEssaiOrdre(porte.n, lecons[j].id, i)]);
    await refresh();
  };

  const supprimer = async (lecon: LeconEssai) => {
    if (!confirm(`Supprimer la leçon « ${lecon.titre} » ?`)) return;
    await supprimerLeconEssai(porte.n, lecon);
    await refresh();
  };

  return (
    <div>
      <button type="button" onClick={onRetour} className="mb-6 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-brassInk hover:text-espresso">
        <i className="fa-solid fa-arrow-left" /> Les douze portes
      </button>

      <div className="flex flex-col gap-6 rounded-[15px] border border-brass/25 bg-cream2 p-6 md:flex-row md:items-center">
        <img src={`/foyer/${porte.src}.webp`} alt="" className="h-40 w-full shrink-0 rounded-[10px] object-cover object-bottom md:h-32 md:w-56" />
        <div className="min-w-0">
          <p className="font-sans text-fyLabel uppercase text-brassInk">{porte.mouvement}</p>
          <h2 className="mt-1 max-w-2xl font-serif text-fyH3 leading-[1.1] text-espresso">{porte.theme}</h2>
          <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-ink/70">{porte.question}</p>
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-brassInk">Leçons ({lecons.length})</p>
          {!vueCliente && (
            <button type="button" onClick={() => setNouvelleTitre(t => t === null ? '' : null)}
              className="inline-flex items-center gap-2 rounded-full bg-brass px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-espresso transition-colors hover:bg-brassBright">
              <i className="fa-solid fa-plus" /> Ajouter une leçon
            </button>
          )}
        </div>

        {!vueCliente && nouvelleTitre !== null && (
          <div className="mb-4 flex gap-2">
            <input autoFocus value={nouvelleTitre} onChange={e => setNouvelleTitre(e.target.value)} placeholder="Titre de la leçon (ex. Introduction, Exercice de la semaine)"
              onKeyDown={e => { if (e.key === 'Enter') void creer(); if (e.key === 'Escape') setNouvelleTitre(null); }}
              className={`flex-1 ${champ}`} />
            <button type="button" onClick={creer} disabled={!nouvelleTitre.trim()}
              className="rounded-full bg-brass px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-espresso disabled:opacity-50">Créer</button>
          </div>
        )}
        {erreur && <p className="mb-3 text-xs text-red-600">{erreur}</p>}

        {lecons.length === 0 ? (
          <p className="text-sm text-ink/50">
            {vueCliente ? 'Cette porte ne contient encore aucune leçon.' : "Aucune leçon pour l'instant. Ajoutez-en une : elle peut rester vide, vous la remplirez plus tard."}
          </p>
        ) : (
          <div className="space-y-3">
            {lecons.map((l, i) => (
              <LeconCard
                key={l.id} porteId={porte.n} lecon={l} index={i} total={lecons.length} vueCliente={vueCliente}
                onMonter={() => bouger(i, -1)} onDescendre={() => bouger(i, 1)} onSupprimer={() => supprimer(l)} onMaj={refresh}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const FoyerEssaiPage: React.FC = () => {
  // Sa propre vérification d'authentification, sur le même patron que
  // AdminDashboard.tsx : cette page ne vit derrière aucun lien du site, donc
  // chaque visite est un chargement à froid (URL tapée, favori). Le drapeau
  // `isAdmin` du contexte partagé (AppContext) part à `false` et ne se
  // confirme qu'une fois Firebase Auth revenu, de façon asynchrone; le juger
  // dès le premier rendu renvoyait une vraie administratrice vers l'accueil
  // avant même que sa session ait eu la chance de se confirmer. `pretAuth`
  // distingue « pas encore su » de « confirmée non admin ».
  const [pretAuth, setPretAuth] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    const unsub = subscribeToAuthState((u) => { setIsAdmin(isAdminUser(u)); setPretAuth(true); });
    return unsub;
  }, []);
  const [leconsParPorte, setLeconsParPorte] = useState<Record<string, LeconEssai[]>>({});
  const [charge, setCharge] = useState(true);
  const [vueCliente, setVueCliente] = useState(false);
  const [porteOuverte, setPorteOuverte] = useState<string | null>(null);

  // La page ne doit jamais s'indexer et porte son propre titre d'onglet, sur
  // le même patron que FoyerPage.tsx (document.title restauré au départ).
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Essai de dépôt · Foyer d'Origine | Krystine St-Laurent";
    let meta = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const metaCree = !meta;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      document.head.appendChild(meta);
    }
    const contenuPrecedent = meta.getAttribute('content');
    meta.setAttribute('content', 'noindex, nofollow');
    return () => {
      document.title = prevTitle;
      if (metaCree) meta?.remove();
      else if (contenuPrecedent) meta?.setAttribute('content', contenuPrecedent);
    };
  }, []);

  useEffect(() => {
    if (!pretAuth || !isAdmin) return;
    chargerToutesLecons().then(setLeconsParPorte).finally(() => setCharge(false));
  }, [pretAuth, isAdmin]);

  // Tant que Firebase Auth n'a pas encore répondu, ne rien juger : un écran
  // vide le temps d'un instant vaut mieux qu'un aller-retour vers l'accueil.
  if (!pretAuth) return null;
  // Réservée aux administratrices : quiconque d'autre repart vers l'accueil,
  // sans qu'aucun lien du site ne mène jamais ici.
  if (!isAdmin) return <Navigate to="/accueil" replace />;

  const porteActive = porteOuverte ? PORTES.find(p => p.n === porteOuverte) : null;

  return (
    <div className="min-h-screen bg-cream pb-24 pt-40">
      <div className="mx-auto max-w-[1400px] px-5 md:px-10">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-brass/30 pb-8">
          <div>
            <p className="font-sans text-fyLabel uppercase text-brassInk">Essai · réservé à l'administratrice</p>
            <h1 className="mt-2 max-w-xl font-serif text-fyH2 leading-[1.05] text-espresso">Les douze portes</h1>
            <p className="mt-3 max-w-xl font-sans text-fyBody text-ink/80">
              Un bac à sable pour bâtir chaque module exactement là où vous travaillerez une fois le
              Foyer ouvert : une porte, plusieurs leçons, et dans chaque leçon autant de vidéos, de
              PDF ou d'audios qu'il en faut. Rien de ce qui est déposé ici ne touche le vrai Foyer.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setVueCliente(v => !v)}
            aria-pressed={vueCliente}
            className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-5 font-sans text-[11px] font-bold uppercase tracking-widest transition-colors ${
              vueCliente ? 'border-espresso bg-espresso text-cream' : 'border-brass/50 bg-cream2 text-brassInk hover:border-brassInk'
            }`}
          >
            <i className={`fa-solid ${vueCliente ? 'fa-eye' : 'fa-eye-slash'}`} />
            {vueCliente ? 'Vue d’une cliente' : 'Voir comme une cliente'}
          </button>
        </header>

        {charge ? (
          <p className="mt-10 text-sm text-ink/50">Chargement…</p>
        ) : porteActive ? (
          <div className="mt-10">
            <ModuleView
              porte={porteActive}
              lecons={leconsParPorte[porteActive.n] || []}
              vueCliente={vueCliente}
              onRetour={() => setPorteOuverte(null)}
              onMaj={lecons => setLeconsParPorte(m => ({ ...m, [porteActive.n]: lecons }))}
            />
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {PORTES.map(porte => {
              const lecons = leconsParPorte[porte.n] || [];
              const pieces = lecons.reduce((n, l) => n + l.pieces.length, 0);
              return (
                <button
                  key={porte.n}
                  type="button"
                  onClick={() => setPorteOuverte(porte.n)}
                  className="flex flex-col overflow-hidden rounded-[15px] border border-brass/30 bg-cream2 text-left transition-colors hover:border-brassInk"
                >
                  {/* Le nom du mois est gravé dans l'image même de la porte (pas un
                      texte séparé) : on ne montre que la poignée et la matière, en
                      recadrant sur la moitié basse. Vérifié à l'œil sur les douze
                      portes, aucune lettre ne dépasse jamais de ce cadrage. */}
                  <img src={`/foyer/${porte.src}.webp`} alt="" loading="lazy" className="aspect-[2/1] w-full object-cover object-bottom" />
                  <div className="flex flex-1 flex-col p-5">
                    <p className="text-center font-serif text-lg leading-snug text-espresso">{porte.theme}</p>
                    <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-widest text-brassInk">
                      {lecons.length === 0 ? 'Aucune leçon' : `${lecons.length} leçon${lecons.length > 1 ? 's' : ''}${pieces > 0 ? ` · ${pieces} pièce${pieces > 1 ? 's' : ''}` : ''}`}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FoyerEssaiPage;
