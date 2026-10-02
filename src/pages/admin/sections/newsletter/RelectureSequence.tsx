import React, { useEffect, useRef, useState } from 'react';
import { doc, updateDoc, serverTimestamp, deleteField } from 'firebase/firestore';
import app, { db, auth } from '../../../../firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { NewsletterDoc } from '../../../../firebase/firestore';
import type { Etape } from '../../../../firebase/sequences';
import PreviewFrame from './PreviewFrame';
import { Card, PrimaryButton, GhostButton } from '../../primitives';

// La relecture d'une séquence (Krystine, 2 oct. 2026) : chaque lettre lue
// telle qu'elle arrivera dans la boîte courriel (le même rendu serveur que
// l'aperçu des infolettres), puis approuvée ou modifiée, une à une.

export const estApprouvee = (l?: NewsletterDoc) => !!l?.approuvee;

const jourLisible = (h: number) => (h <= 0 ? 'Tout de suite' : h % 24 === 0 ? `Jour ${h / 24}` : h < 24 ? `${h} h après` : `Jour ${Math.round((h / 24) * 10) / 10}`);

// La lettre ouverte se garde le temps d'un aller-retour au composeur
// (le parent monte ce composant avec key={sequenceId}).
let derniereOuverte: Record<string, number> = {};

const pastille = (ok: boolean) => (
  <span className={`inline-block mt-0.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${ok ? 'bg-[#2f5a3a]/10 text-[#2f5a3a] dark:text-[#9fd0a8]' : 'bg-[#BA7B39]/15 text-[#8B4A2F] dark:text-[#e0b060]'}`}>
    {ok ? <><i className="fa-solid fa-check mr-1" />Approuvée</> : 'À relire'}
  </span>
);

// Sur un écran étroit, la lettre (640 px) se réduit d'un bloc, comme le fait
// l'application courriel d'un téléphone, au lieu d'être coupée à droite.
const LARGEUR_LETTRE = 640;
const AjusteLargeur: React.FC<{ hauteur: number; children: React.ReactNode }> = ({ hauteur, children }) => {
  const boite = useRef<HTMLDivElement>(null);
  const [echelle, setEchelle] = useState(1);
  useEffect(() => {
    const el = boite.current; if (!el) return;
    // On ne suit que la largeur, et on ignore les variations de quelques
    // pixels : sinon la barre de défilement qui apparaît puis disparaît
    // relance le calcul sans fin et la page tremble.
    let derniere = -1;
    const mesurer = () => {
      const w = Math.round(el.getBoundingClientRect().width);
      if (Math.abs(w - derniere) < 4) return;
      derniere = w;
      setEchelle(Math.min(1, w / LARGEUR_LETTRE));
    };
    mesurer();
    const ro = new ResizeObserver(mesurer);
    ro.observe(el); return () => ro.disconnect();
  }, []);
  return (
    <div ref={boite} style={{ width: '100%', overflow: 'hidden', height: hauteur * echelle }}>
      <div style={{ width: LARGEUR_LETTRE, maxWidth: echelle < 1 ? undefined : '100%', margin: echelle < 1 ? undefined : '0 auto', transform: echelle < 1 ? `scale(${echelle})` : undefined, transformOrigin: 'top left' }}>{children}</div>
    </div>
  );
};

const RelectureSequence: React.FC<{
  sequenceId: string;
  etapes: Etape[];
  lettres: NewsletterDoc[];
  onOpen: (id: string) => void;
  onChange: () => void;
}> = ({ sequenceId, etapes, lettres, onOpen, onChange }) => {
  const rangs = etapes.map((e, i) => ({ e, i, l: lettres.find(x => x.id === e.newsletterId) })).filter(r => r.e.newsletterId);
  const [ouverte, setOuverte] = useState<number | null>(derniereOuverte[sequenceId] ?? null);
  const [occupe, setOccupe] = useState(false);
  // Le test d'une lettre part d'un clic à l'adresse de la personne connectée
  // (Krystine, 2 oct. 2026), par la même fonction que le test d'une infolettre.
  const [test, setTest] = useState<{ id: string; etat: 'envoi' | 'ok' | 'erreur'; mot?: string } | null>(null);
  const envoyerTest = async (id: string) => {
    const courriel = auth?.currentUser?.email;
    if (!courriel || !app) { setTest({ id, etat: 'erreur', mot: 'Connectez-vous pour recevoir le test.' }); return; }
    setTest({ id, etat: 'envoi' });
    try {
      await httpsCallable(getFunctions(app, 'us-central1'), 'sendNewsletter')({ newsletterId: id, testEmail: courriel });
      setTest({ id, etat: 'ok', mot: `Test envoyé à ${courriel}.` });
    } catch (e: any) {
      setTest({ id, etat: 'erreur', mot: e?.message || 'Le test n’a pas pu partir.' });
    }
  };
  const [erreur, setErreur] = useState<string | null>(null);
  const apercu = useRef<HTMLDivElement>(null);
  useEffect(() => { derniereOuverte = { ...derniereOuverte, [sequenceId]: ouverte as number }; }, [sequenceId, ouverte]);

  const ouvrir = (k: number) => {
    setOuverte(k); setErreur(null);
    window.setTimeout(() => apercu.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const courant = ouverte !== null ? rangs[ouverte] : undefined;
  const l = courant?.l;

  const basculer = async () => {
    if (!db || !l?.id) return;
    setOccupe(true); setErreur(null);
    try {
      await updateDoc(doc(db, 'newsletters', l.id), estApprouvee(l)
        ? { approuvee: deleteField() }
        : { approuvee: { le: serverTimestamp(), par: auth?.currentUser?.email || '' } });
      onChange();
    } catch (err: any) { setErreur(err?.message || 'L’approbation n’a pas pu être enregistrée.'); }
    finally { setOccupe(false); }
  };

  if (!rangs.length) return null;
  const hauteurApercu = Math.max(900, window.innerHeight - 120);

  return (
    <Card className="p-5 space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-serif text-xl text-[#293027] dark:text-white">Relire les lettres</h3>
        <span className="text-xs text-[#293027]/60 dark:text-white/60">Cliquez une lettre pour la lire telle qu’elle arrivera dans la boîte courriel.</span>
      </div>

      <ol className="divide-y divide-[#293027]/10 dark:divide-white/10 rounded-xl border border-[#293027]/10 dark:border-white/10 overflow-hidden">
        {rangs.map((r, k) => {
          const ok = estApprouvee(r.l);
          const actif = k === ouverte;
          return (
            <li key={r.e.newsletterId + k}>
              <button type="button" onClick={() => ouvrir(k)} aria-current={actif}
                className={`grid w-full grid-cols-[1.5rem_1fr] sm:grid-cols-[2rem_1fr_auto] items-start gap-3 px-4 py-3 text-left transition-colors ${actif ? 'bg-[#BA7B39]/15' : 'hover:bg-[#BA7B39]/5'}`}>
                <span className="font-serif text-2xl leading-none text-[#8B4A2F] dark:text-[#d9a05b]">{k + 1}</span>
                <span className="min-w-0">
                  <span className="mb-1.5 block sm:hidden">{pastille(ok)}</span>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#293027]/55 dark:text-white/55">{jourLisible(Number(r.e.delaiHeures) || 0)}</span>
                  <span className="block text-[15px] leading-snug sm:truncate font-semibold text-[#293027] dark:text-white">{r.l?.subject || r.e.titre || 'Sans objet'}</span>
                  {r.l?.preheader && <span className="block text-[13px] leading-snug sm:truncate text-[#293027]/60 dark:text-white/60">{r.l.preheader}</span>}
                  {!r.l && <span className="block text-[13px] text-red-600">Lettre introuvable.</span>}
                </span>
                <span className="hidden sm:inline-block">{pastille(ok)}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {courant && (
        <div ref={apercu} className="scroll-mt-4 space-y-4 pt-2">
          <div className="flex items-center justify-between gap-2">
            <GhostButton className="!px-3 sm:!px-5" onClick={() => ouvrir(ouverte! - 1)} disabled={ouverte === 0}><i className="fa-solid fa-arrow-left" /> <span className="hidden sm:inline">Lettre</span> précédente</GhostButton>
            <span className="whitespace-nowrap text-center text-xs font-bold uppercase tracking-widest text-[#293027]/60 dark:text-white/60"><span className="sm:hidden">{ouverte! + 1}/{rangs.length}</span><span className="hidden sm:inline">Lettre {ouverte! + 1} sur {rangs.length}</span></span>
            <GhostButton className="!px-3 sm:!px-5" onClick={() => ouvrir(ouverte! + 1)} disabled={ouverte === rangs.length - 1}><span className="hidden sm:inline">Lettre</span> suivante <i className="fa-solid fa-arrow-right" /></GhostButton>
          </div>

          {l ? (
            <>
              <div className="rounded-xl bg-[#e7e2d9] dark:bg-black/30 px-2 py-5 sm:px-8 sm:py-8">
                <div className="mx-auto max-w-[640px] space-y-3">
                  <div className="rounded-xl bg-white/80 dark:bg-white/10 px-4 py-3 text-sm">
                    <div className="text-[#293027]/55 dark:text-white/55 text-[11px] uppercase tracking-widest font-bold">Objet</div>
                    <div className="font-semibold text-[#293027] dark:text-white">{l.subject || 'Sans objet'}</div>
                    {l.preheader && <div className="text-[#293027]/60 dark:text-white/60">{l.preheader}</div>}
                  </div>
                  <AjusteLargeur hauteur={hauteurApercu}><PreviewFrame blocks={l.blocks} subject={l.subject} preheader={l.preheader} couverture={l.couverture} couvertureUrl={l.couvertureUrl} entete={l.couverture === 'titre' ? l.entete : null} signature={l.signature} lang={l.lang} bandeau={l.bandeau} fond={l.fond} tailleLecture={l.tailleLecture} height={hauteurApercu} /></AjusteLargeur>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {estApprouvee(l)
                  ? <GhostButton onClick={basculer} disabled={occupe}><i className="fa-solid fa-rotate-left" /> Retirer l’approbation</GhostButton>
                  : <PrimaryButton onClick={basculer} disabled={occupe}><i className="fa-solid fa-check" /> Approuver cette lettre</PrimaryButton>}
                <GhostButton onClick={() => onOpen(l.id!)}><i className="fa-solid fa-pen" /> Modifier cette lettre</GhostButton>
                <GhostButton onClick={() => envoyerTest(l.id!)} disabled={test?.id === l.id && test.etat === 'envoi'}><i className={`fa-solid ${test?.id === l.id && test.etat === 'envoi' ? 'fa-circle-notch fa-spin' : 'fa-paper-plane'}`} /> M’envoyer un test</GhostButton>
                {test?.id === l.id && test.mot && <span className={`text-xs ${test.etat === 'erreur' ? 'text-red-600' : 'text-[#7d6330]'}`}>{test.mot}</span>}
                <span className="text-xs text-[#293027]/55 dark:text-white/55">
                  {estApprouvee(l)
                    ? `Approuvée${l.approuvee?.le ? ` le ${l.approuvee.le.toDate().toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' })}` : ''}${l.approuvee?.par ? ` par ${l.approuvee.par}` : ''}.`
                    : 'Toute modification dans le composeur remet la lettre à relire.'}
                </span>
              </div>
            </>
          ) : <p className="text-sm text-red-600">Cette étape pointe vers une lettre introuvable.</p>}
          {erreur && <p className="text-sm text-red-600">{erreur}</p>}
        </div>
      )}
    </Card>
  );
};

export default RelectureSequence;
