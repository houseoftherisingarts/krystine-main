import React, { useEffect, useState } from 'react';
import { getMember, type MemberDoc } from '../../../firebase/firestore';
import { deciderBadgeBleu, getVerification, listerVerifications, urlPiece, type Verification } from '../../../firebase/verificationAdmin';
import { NISKAS_BADGE_BLEU, SEUIL_PROGRAMMES } from '../../../lib/badgeBleu';
import { Card, EmptyState, GhostButton } from '../primitives';
import Portail from '../../../components/Portail';

// Les demandes de Badge Bleu (verifications/{uid}). Krystine regarde la pièce
// d'identité, puis approuve ou refuse : la fonction deciderBadgeBleu
// (functions/src/verification.ts) supprime la pièce du Storage à l'instant,
// pose la coche, verse les niskas, ouvre le Skin Vérifié et écrit à la membre.
// Le patron des gestes (garde anti double clic, phrase après coup, erreur
// reprise de l'exception) est celui de CoffreAdmin dans AdminClientView.tsx.

const dateFR = (t?: { toDate(): Date } | null) =>
  t ? t.toDate().toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' }) : '…';

interface Piece { nom: string; url: string; genre: 'image' | 'pdf' | 'fichier' }

const BadgeBleuSection: React.FC = () => {
  const [demandes, setDemandes] = useState<Verification[]>([]);
  const [membres, setMembres] = useState<Record<string, MemberDoc | null>>({});
  const [charge, setCharge] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [motifs, setMotifs] = useState<Record<string, string>>({});
  const [occupe, setOccupe] = useState<string | null>(null);
  const [dits, setDits] = useState<Record<string, string>>({});
  const [piece, setPiece] = useState<Piece | null>(null);

  useEffect(() => {
    listerVerifications()
      .then(async l => {
        setDemandes(l);
        const fiches = await Promise.all(l.map(v => getMember(v.uid).catch(() => null)));
        setMembres(Object.fromEntries(l.map((v, i) => [v.uid, fiches[i]])));
      })
      .catch(e => setErreur((e as { message?: string }).message || 'La liste des demandes ne s’est pas chargée.'))
      .finally(() => setCharge(false));
  }, []);

  // Échap ferme la pièce.
  useEffect(() => {
    if (!piece) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPiece(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [piece]);

  const nomDe = (uid: string) => { const m = membres[uid]; return m?.displayName || m?.email?.split('@')[0] || uid.slice(0, 8); };
  const dire = (uid: string, texte: string) => setDits(d => ({ ...d, [uid]: texte }));

  const voirPiece = async (v: Verification) => {
    if (!v.pieceChemin) return;
    try {
      const url = await urlPiece(v.pieceChemin);
      const ext = v.pieceChemin.split('.').pop() || '';
      setPiece({ nom: nomDe(v.uid), url, genre: ext === 'pdf' ? 'pdf' : ext === 'heic' ? 'fichier' : 'image' });
    } catch (e) { dire(v.uid, (e as { message?: string }).message || 'La pièce ne s’est pas ouverte.'); }
  };

  const decider = async (v: Verification, decision: 'approuvee' | 'refusee') => {
    if (occupe) return;
    const nom = nomDe(v.uid);
    const motif = (motifs[v.uid] || '').trim();
    if (decision === 'refusee' && !motif) { dire(v.uid, 'Écrivez un motif avant de refuser : elle le lira dans sa messagerie.'); return; }
    const question = decision === 'approuvee'
      ? `Poser le Badge Bleu de ${nom} ? Elle reçoit ${NISKAS_BADGE_BLEU} niskas et le Skin Vérifié, et sa pièce est supprimée à l’instant.`
      : `Refuser la demande de ${nom} ? Elle lira votre motif dans sa messagerie, et sa pièce est supprimée à l’instant.`;
    if (!window.confirm(question)) return;
    setOccupe(v.uid); dire(v.uid, '');
    try {
      await deciderBadgeBleu(v.uid, decision, motif);
      const relue = await getVerification(v.uid);
      setDemandes(l => l.map(x => (x.uid === v.uid ? relue || { ...x, statut: decision, motif, pieceChemin: null } : x)));
      dire(v.uid, decision === 'approuvee'
        ? `Badge Bleu posé pour ${nom}. Les niskas et le Skin Vérifié sont chez elle, et sa pièce est supprimée.`
        : `Demande de ${nom} refusée. Elle a reçu votre motif, et sa pièce est supprimée.`);
    } catch (e) { dire(v.uid, (e as { message?: string }).message || 'La décision n’a pas été enregistrée.'); }
    finally { setOccupe(null); }
  };

  const attente = demandes.filter(v => v.statut === 'en_attente');
  const decidees = demandes.filter(v => v.statut !== 'en_attente');
  const champ = 'rounded-[12px] border border-[#293027]/15 bg-white px-3 py-2 text-sm text-[#293027] outline-none focus:border-[#BA7B39] dark:border-white/15 dark:bg-[#293027] dark:text-white';

  const ligne = (v: Verification) => {
    const m = membres[v.uid];
    const enAttente = v.statut === 'en_attente';
    const assez = v.programmes >= SEUIL_PROGRAMMES;
    return (
      <li key={v.uid} className="rounded-2xl border border-[#293027]/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-full min-w-0 sm:w-auto sm:flex-1">
            <p className="flex items-center gap-2 font-serif text-lg text-[#293027] dark:text-white">
              <span className="truncate">{nomDe(v.uid)}</span>
              {m?.verifie && <i className="fa-solid fa-circle-check shrink-0 text-sm text-[#3b82f6]" title="Badge Bleu posé" />}
            </p>
            <p className="truncate text-xs text-[#293027]/55 dark:text-white/55">{m?.email || v.uid}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${assez ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300'}`}>
            <i className={`fa-solid ${assez ? 'fa-check' : 'fa-xmark'}`} /> {v.programmes} programme{v.programmes > 1 ? 's' : ''} sur {SEUIL_PROGRAMMES}
          </span>
          <span className="text-xs text-[#293027]/55 dark:text-white/55">Demandé le {dateFR(v.demandeLe)}</span>
          {enAttente ? (
            v.pieceChemin
              ? <GhostButton onClick={() => voirPiece(v)}><i className="fa-solid fa-id-card" /> Voir la pièce</GhostButton>
              : <span className="text-xs text-[#8B4A2F]">Pièce déjà supprimée</span>
          ) : (
            <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${v.statut === 'approuvee' ? 'bg-[#3b82f6]/10 text-[#2559b8] dark:text-[#8fb8ff]' : 'bg-[#293027]/5 text-[#293027]/60 dark:bg-white/10 dark:text-white/60'}`}>
              {v.statut === 'approuvee' ? 'Approuvée' : 'Refusée'} le {dateFR(v.decideLe)}
            </span>
          )}
        </div>
        {enAttente ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              value={motifs[v.uid] || ''} onChange={e => setMotifs(d => ({ ...d, [v.uid]: e.target.value }))} maxLength={600}
              placeholder="Motif (nécessaire pour refuser : elle le lira dans sa messagerie)" className={`${champ} min-w-[240px] flex-1`}
            />
            <button type="button" onClick={() => decider(v, 'approuvee')} disabled={occupe !== null} className="rounded-full bg-[#3b82f6] px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-[#2f6fd6] disabled:opacity-50">
              <i className="fa-solid fa-circle-check mr-1" /> {occupe === v.uid ? 'Un instant…' : 'Approuver'}
            </button>
            <button type="button" onClick={() => decider(v, 'refusee')} disabled={occupe !== null} className="rounded-full border border-[#293027]/15 px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-[#293027]/70 hover:border-red-400 hover:text-red-600 disabled:opacity-50 dark:border-white/15 dark:text-white/70">
              Refuser
            </button>
          </div>
        ) : (
          <p className="mt-2 text-xs text-[#293027]/60 dark:text-white/60">
            {v.decidePar ? `Par ${v.decidePar}. ` : ''}{v.statut === 'refusee' && v.motif ? `Motif : ${v.motif}` : ''}
          </p>
        )}
        {dits[v.uid] && <p className="mt-3 text-sm text-[#293027] dark:text-white">{dits[v.uid]}</p>}
      </li>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-3xl text-[#293027] dark:text-white">Badge Bleu</h2>
        <p className="mt-1 max-w-2xl text-sm text-[#293027]/60 dark:text-white/60">
          Les membres qui ont suivi {SEUIL_PROGRAMMES} de vos programmes et qui vous montrent une pièce d’identité. Approuver pose la coche bleue, verse {NISKAS_BADGE_BLEU} niskas et ouvre le Skin Vérifié; refuser envoie votre motif dans sa messagerie.
        </p>
      </div>
      <p className="rounded-2xl border border-[#3b82f6]/30 bg-[#3b82f6]/10 px-4 py-3 text-sm text-[#293027] dark:text-white">
        <i className="fa-solid fa-shield-halved mr-2 text-[#3b82f6]" /> La pièce est supprimée de nos serveurs à l’instant où vous décidez.
      </p>
      {erreur && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{erreur}</p>}
      {charge ? (
        <div className="flex justify-center py-12"><i className="fa-solid fa-circle-notch fa-spin text-2xl text-[#8B4A2F]" /></div>
      ) : (
        <>
          <Card className="p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">À décider{attente.length ? ` · ${attente.length}` : ''}</p>
            {attente.length === 0
              ? <EmptyState icon="fa-circle-check">Aucune demande en attente.</EmptyState>
              : <ul className="mt-4 space-y-3">{attente.map(ligne)}</ul>}
          </Card>
          {decidees.length > 0 && (
            <Card className="p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#293027]/50 dark:text-white/50">Décidées</p>
              <ul className="mt-4 space-y-3">{decidees.map(ligne)}</ul>
            </Card>
          )}
        </>
      )}
      {piece && (
        <Portail>
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-[#293027]/70 p-4 backdrop-blur-md" onClick={() => setPiece(null)}>
            <div className="relative flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-[24px] border border-[#BA7B39]/20 bg-[#EEE7DB] shadow-2xl dark:bg-[#151d19]" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 border-b border-[#293027]/10 px-5 py-3 dark:border-white/10">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]"><i className="fa-solid fa-id-card mr-1" /> Pièce d’identité de {piece.nom}</p>
                <button type="button" onClick={() => setPiece(null)} aria-label="Fermer" className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-[#293027] hover:bg-[#BA7B39] hover:text-white dark:bg-[#293027]/80 dark:text-white">
                  <i className="fa-solid fa-times" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-auto bg-[#293027]/5 p-3">
                {piece.genre === 'image' && <img src={piece.url} alt={`Pièce d’identité de ${piece.nom}`} className="mx-auto max-h-[78vh] w-auto rounded-[12px]" />}
                {piece.genre === 'pdf' && <iframe src={piece.url} title={`Pièce d’identité de ${piece.nom}`} className="h-[78vh] w-full rounded-[12px] bg-white" />}
                {piece.genre === 'fichier' && (
                  <p className="py-10 text-center text-sm text-[#293027] dark:text-white">
                    Ce format (HEIC) ne s’affiche pas dans le navigateur.{' '}
                    <a href={piece.url} target="_blank" rel="noopener noreferrer" className="font-bold text-[#8B4A2F] underline">Ouvrir le fichier</a>
                  </p>
                )}
              </div>
            </div>
          </div>
        </Portail>
      )}
    </div>
  );
};

export default BadgeBleuSection;
