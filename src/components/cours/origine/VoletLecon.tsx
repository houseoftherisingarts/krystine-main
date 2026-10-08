import React, { useRef, useState } from 'react';
import type { Lecon } from '../../../firebase/formations';
import TexteLecon from '../../../lib/texteLecon';
import { nettoyerKajabi } from '../../../pages/cours/nettoyerKajabi';
import LecteurAudioCours from '../LecteurAudioCours';
import VideoLecon from '../VideoLecon';
import VignetteComposee, { type Composition } from '../VignetteComposee';
import { DocumentsLecon, PremierePage, type DocLecon } from '../DocumentsLecon';
import { ORIGINE, documentManquant, pilierDeSemaine, semaineDeLecon, titreDeLecon, titreDeModule } from '../../../pages/origine2/piliers';

// Le volet de droite de l'Expérience Origine : la vignette de la leçon en
// tête (celle déposée par Krystine, sinon le vrai visuel d'Origine, sinon une
// vignette composée), le lecteur, le texte, et les documents à droite (sous
// le titre sur téléphone). Krystine change la vignette et dépose un document
// depuis ce même volet.

const ICONES: Record<string, string> = { video: 'fa-circle-play', audio: 'fa-music', pdf: 'fa-file-pdf', fichier: 'fa-file', texte: 'fa-align-left' };

interface Props {
  lecon: Lecon;
  formationTitre?: string;
  /** Les titres des autres leçons : Kajabi les listait dans le décor de chaque page. */
  autresTitres?: string[];
  vignette?: string;
  /** La vignette composée, quand la leçon n'a pas d'image. */
  composition: Composition;
  position: string;
  url: string;
  chargement: boolean;
  erreur: string | null;
  terminee: boolean;
  isAdmin: boolean;
  lang: 'FR' | 'EN';
  onTerminee: () => void;
  onSuivante?: () => void;
  /** Les documents de la leçon (les siens et ceux qu'elle emprunte). */
  documents: DocLecon[];
  /** Un lien qui remplace un document resté sur l'ancien site (ex. le quiz). */
  lien?: { fr: string; en: string; href: string };
  /** Un bloc propre à la leçon (le certificat). */
  extra?: React.ReactNode;
  onVoirDocument: (d: DocLecon) => void;
  onVignette: (file: File) => Promise<void>;
  onDocument: (file: File) => Promise<void>;
}

/** Un visuel en entier dans un cadre 16:9 : l'image posée au centre, son propre fond étiré et flouté derrière (les visuels d'Origine sont carrés). */
const Visuel: React.FC<{ src: string; couvrir?: boolean; libelle?: string }> = ({ src, couvrir, libelle }) => (
  <span aria-hidden className="absolute inset-0 overflow-hidden">
    {couvrir ? <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" /> : (
      <>
        <img src={src} alt="" className="absolute inset-0 h-full w-full scale-125 object-cover blur-2xl" />
        <img src={src} alt="" className="absolute inset-0 h-full w-full object-contain" />
      </>
    )}
    {/* Le libellé de la leçon sur un visuel partagé (« Méditation · Om Shanti ») : chaque leçon reste reconnaissable. */}
    {libelle && <span className="absolute left-3 top-3 rounded-full bg-[#1c2420]/75 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[#EEE7DB] md:left-6 md:top-5 md:px-3 md:py-1.5 md:text-[10px]">{libelle}</span>}
  </span>
);

const VoletLecon: React.FC<Props> = ({ lecon, formationTitre, autresTitres = [], vignette, composition, position, url, chargement, erreur, terminee, isAdmin, lang, onTerminee, onSuivante, documents, lien, extra, onVoirDocument, onVignette, onDocument }) => {
  const fr = lang === 'FR';
  const n = semaineDeLecon(lecon);
  const pilier = n >= 1 ? pilierDeSemaine(n) : undefined;
  const [envoi, setEnvoi] = useState<'vignette' | 'document' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const champVignette = useRef<HTMLInputElement>(null);
  const champDocument = useRef<HTMLInputElement>(null);

  const envoyer = async (quoi: 'vignette' | 'document', file?: File) => {
    if (!file) return;
    setEnvoi(quoi); setMessage(null);
    try {
      await (quoi === 'vignette' ? onVignette(file) : onDocument(file));
      setMessage(quoi === 'vignette' ? (fr ? 'Vignette changée.' : 'Thumbnail changed.') : (fr ? 'Document déposé.' : 'Document uploaded.'));
    } catch (e) {
      setMessage((e as Error)?.message || (fr ? 'Le dépôt n’a pas fonctionné.' : 'Upload failed.'));
    } finally { setEnvoi(null); }
  };

  const manque = documentManquant(lecon) && !documents.length && !lien && !extra;
  const texte = lecon.texte?.trim() ? nettoyerKajabi(lecon.texte, lecon.titre, formationTitre, lecon.moduleNom, autresTitres) : '';
  // Une vidéo prête à jouer prend la place : la vignette devient son affiche et
  // la tête se réduit à une bande, pour que le lecteur tienne dans l'écran.
  const videoPrete = lecon.type === 'video' && !!url && !chargement && !erreur;
  // Une leçon-document : une bannière basse et commune, le document prend la place (Krystine, 8 oct. 2026).
  const estDocument = lecon.type === 'texte' && !lecon.chemin && documents.length > 0;
  const visuel = vignette ? <Visuel src={vignette} couvrir={estDocument} libelle={estDocument ? undefined : composition.libelle} /> : <VignetteComposee c={composition} taille="banniere" />;

  return (
    <article className="overflow-hidden rounded-[15px] border" style={{ borderColor: `${ORIGINE.olive}33`, background: '#f8f4ec' }}>
      <div className={`relative w-full overflow-hidden ${videoPrete ? 'h-16' : estDocument ? 'aspect-[2.6/1] max-h-[300px]' : 'aspect-video max-h-[480px]'}`} style={{ background: pilier?.fond || ORIGINE.olive }}>
        {!videoPrete && visuel}
        {(vignette || videoPrete) && <span aria-hidden className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(28,36,32,0.88) 0%, rgba(28,36,32,0.25) 40%, transparent 70%)' }} />}
        <div className={`absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 px-6 md:px-8 ${videoPrete ? 'pb-5' : 'pb-4'}`}>
          <p className="text-[10px] font-bold uppercase tracking-[0.26em]" style={{ color: vignette || videoPrete ? 'rgba(238,231,219,0.85)' : composition.accent }}>{position}</p>
          {isAdmin && (
            <>
              <input ref={champVignette} type="file" accept="image/*" className="hidden" onChange={e => { void envoyer('vignette', e.target.files?.[0]); e.target.value = ''; }} />
              <button type="button" onClick={() => champVignette.current?.click()} disabled={envoi === 'vignette'}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#EEE7DB]/40 bg-[#1c2420]/55 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#EEE7DB] backdrop-blur-sm transition-colors hover:bg-[#1c2420]/80 disabled:opacity-50">
                <i className={`fa-solid ${envoi === 'vignette' ? 'fa-circle-notch fa-spin' : 'fa-image'}`} />
                {fr ? 'Changer la vignette' : 'Change thumbnail'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="px-6 py-6 md:px-8 md:py-7">
        <h2 className="font-serif text-[clamp(1.5rem,2.4vw,2rem)] leading-[1.15]" style={{ color: ORIGINE.encre }}>{titreDeLecon(lecon.titre)}</h2>
        {lecon.moduleNom && n < 1 && <p className="mt-1 text-[12px]" style={{ color: ORIGINE.olive }}>{titreDeModule(lecon.moduleNom)}</p>}

        <div className={documents.length ? 'mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start xl:grid-cols-[minmax(0,1fr)_290px]' : ''}>
          {documents.length > 0 && (
            <DocumentsLecon documents={documents} lang={lang} onVoir={onVoirDocument} className="lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1" />
          )}
          <div className="min-w-0 lg:col-start-1 lg:row-start-1">
            <div className="mt-5">
              {chargement ? (
                <p className="text-sm" style={{ color: ORIGINE.olive }}>{fr ? 'Chargement…' : 'Loading…'}</p>
              ) : erreur ? (
                <p className="text-sm text-red-700">{erreur}</p>
              ) : url ? (
                lecon.type === 'video' ? (
                  <VideoLecon url={url} affiche={vignette || ''} afficheNode={visuel} lang={lang} className="mx-auto block max-h-[calc(100vh-9rem)] w-auto max-w-full rounded-[15px] bg-black" />
                ) : lecon.type === 'audio' ? (
                  <LecteurAudioCours key={lecon.id} url={url} titre={titreDeLecon(lecon.titre)} soustitre={position} pochette={vignette} lang={lang}
                    onFin={() => { if (!terminee) onTerminee(); }} onSuivante={onSuivante} />
                ) : (
                  <a href={url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs font-bold uppercase tracking-widest" style={{ background: ORIGINE.or, color: ORIGINE.encre }}>
                    <i className={`fa-solid ${ICONES[lecon.type]}`} /> {fr ? 'Ouvrir le document' : 'Open the document'}
                  </a>
                )
              ) : null}
            </div>

            {/* Une leçon dont tout le contenu est le document : sa première page, en grand, dans la leçon (ordinateur). */}
            {estDocument && !texte && documents[0]?.pdf && (
              <button type="button" onClick={() => onVoirDocument(documents[0])} aria-label={`${fr ? 'Voir' : 'View'} ${documents[0].nom}`}
                className="hidden w-full overflow-hidden rounded-[15px] border shadow-[0_24px_50px_-34px_rgba(28,36,32,0.6)] transition-transform duration-500 hover:-translate-y-0.5 lg:block" style={{ borderColor: `${ORIGINE.olive}33` }}>
                <PremierePage doc={documents[0]} naturel className="w-full" />
              </button>
            )}

            {texte && <TexteLecon texte={texte} className={`${lecon.chemin ? 'mt-6' : 'mt-3'} max-w-[68ch] text-[#3a2f23]`} />}

            {extra}

            {lien && (
              <a href={lien.href} className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs font-bold uppercase tracking-widest" style={{ background: ORIGINE.or, color: ORIGINE.encre }}>
                <i className="fa-solid fa-arrow-up-right-from-square" /> {fr ? lien.fr : lien.en}
              </a>
            )}

            {manque && (
              <p className="mt-6 rounded-[12px] px-4 py-3 text-sm" style={{ background: `${ORIGINE.or}1f`, color: ORIGINE.encre }}>
                {fr ? 'Le document de cette leçon n’est pas encore déposé. Il apparaîtra ici dès que Krystine l’aura ajouté.' : 'This lesson’s document is not uploaded yet. It will appear here once Krystine adds it.'}
              </p>
            )}

            {isAdmin && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <input ref={champDocument} type="file" accept="application/pdf,image/*,audio/*,video/*" className="hidden" onChange={e => { void envoyer('document', e.target.files?.[0]); e.target.value = ''; }} />
                <button type="button" onClick={() => champDocument.current?.click()} disabled={envoi === 'document'}
                  className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors hover:bg-[#1c2420]/6 disabled:opacity-50" style={{ borderColor: `${ORIGINE.olive}66`, color: ORIGINE.olive }}>
                  <i className={`fa-solid ${envoi === 'document' ? 'fa-circle-notch fa-spin' : 'fa-file-arrow-up'}`} />
                  {fr ? 'Déposer un document' : 'Upload a document'}
                </button>
                {message && <span className="text-xs" style={{ color: ORIGINE.olive }}>{message}</span>}
              </div>
            )}
          </div>
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-3 border-t pt-5" style={{ borderColor: `${ORIGINE.olive}26` }}>
          <button type="button" onClick={onTerminee}
            className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-colors"
            style={terminee ? { borderColor: ORIGINE.olive, background: `${ORIGINE.olive}1a`, color: ORIGINE.oliveProfond } : { borderColor: ORIGINE.or, color: ORIGINE.encre }}>
            <i className="fa-solid fa-check" />
            {terminee ? (fr ? 'Leçon terminée' : 'Lesson complete') : (fr ? 'Marquer comme terminée' : 'Mark as complete')}
          </button>
          {onSuivante && (
            <button type="button" onClick={onSuivante}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-colors hover:brightness-110" style={{ background: ORIGINE.or, color: ORIGINE.encre }}>
              {fr ? 'Leçon suivante' : 'Next lesson'} <i className="fa-solid fa-arrow-right" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

export default VoletLecon;
