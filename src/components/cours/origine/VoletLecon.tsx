import React, { useRef, useState } from 'react';
import type { Lecon } from '../../../firebase/formations';
import TexteLecon from '../../../lib/texteLecon';
import { nettoyerKajabi } from '../../../pages/cours/nettoyerKajabi';
import LecteurAudioCours from '../LecteurAudioCours';
import { ORIGINE, documentManquant, pilierDeSemaine, semaineDeLecon, titreDeLecon, titreDeModule } from '../../../pages/origine2/piliers';

// Le volet de droite de l'Expérience Origine : la vignette de la leçon en
// tête (celle déposée par Krystine, sinon celle venue de Kajabi, sinon la
// couverture), le lecteur, le texte, les documents. Krystine change la
// vignette et dépose un document depuis ce même volet.

const ICONES: Record<string, string> = { video: 'fa-circle-play', audio: 'fa-music', pdf: 'fa-file-pdf', fichier: 'fa-file', texte: 'fa-align-left' };

interface Props {
  lecon: Lecon;
  formationTitre?: string;
  /** Les titres des autres leçons : Kajabi les listait dans le décor de chaque page. */
  autresTitres?: string[];
  vignette?: string;
  position: string;
  url: string;
  chargement: boolean;
  erreur: string | null;
  terminee: boolean;
  isAdmin: boolean;
  lang: 'FR' | 'EN';
  onTerminee: () => void;
  onSuivante?: () => void;
  onOuvrirDocument: (index: number) => void;
  onVignette: (file: File) => Promise<void>;
  onDocument: (file: File) => Promise<void>;
}

const VoletLecon: React.FC<Props> = ({ lecon, formationTitre, autresTitres = [], vignette, position, url, chargement, erreur, terminee, isAdmin, lang, onTerminee, onSuivante, onOuvrirDocument, onVignette, onDocument }) => {
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

  const manque = documentManquant(lecon);
  const texte = lecon.texte?.trim() ? nettoyerKajabi(lecon.texte, lecon.titre, formationTitre, lecon.moduleNom, autresTitres) : '';
  // Une vidéo prête à jouer prend la place : la vignette devient son affiche et
  // la tête se réduit à une bande, pour que le lecteur tienne dans l'écran.
  const videoPrete = lecon.type === 'video' && !!url && !chargement && !erreur;

  return (
    <article className="overflow-hidden rounded-[15px] border" style={{ borderColor: `${ORIGINE.olive}33`, background: '#fbf4e4' }}>
      <div className={`relative w-full overflow-hidden ${videoPrete ? 'h-16' : 'aspect-video max-h-[480px]'}`} style={{ background: pilier?.fond || ORIGINE.olive }}>
        {vignette && !videoPrete && <img src={vignette} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <span aria-hidden className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(38,41,15,0.88) 0%, rgba(38,41,15,0.25) 55%, transparent 100%)' }} />
        <div className={`absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 px-6 md:px-8 ${videoPrete ? 'pb-5' : 'pb-4'}`}>
          <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#f3ead2]/85">{position}</p>
          {isAdmin && (
            <>
              <input ref={champVignette} type="file" accept="image/*" className="hidden" onChange={e => { void envoyer('vignette', e.target.files?.[0]); e.target.value = ''; }} />
              <button type="button" onClick={() => champVignette.current?.click()} disabled={envoi === 'vignette'}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#f3ead2]/40 bg-[#26290f]/55 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#f3ead2] backdrop-blur-sm transition-colors hover:bg-[#26290f]/80 disabled:opacity-50">
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

        <div className="mt-5">
          {chargement ? (
            <p className="text-sm" style={{ color: ORIGINE.olive }}>{fr ? 'Chargement…' : 'Loading…'}</p>
          ) : erreur ? (
            <p className="text-sm text-red-700">{erreur}</p>
          ) : url ? (
            lecon.type === 'video' ? (
              <video src={url} controls playsInline poster={vignette} className="mx-auto block max-h-[calc(100vh-9rem)] w-auto max-w-full rounded-[15px] bg-black" />
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

        {texte && <TexteLecon texte={texte} className={`${lecon.chemin ? 'mt-6' : 'mt-3'} max-w-[68ch] text-[#3a2f23]`} />}

        {(lecon.docs?.length ?? 0) > 0 && (
          <div className="mt-6">
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: ORIGINE.olive }}>{fr ? 'Documents de la leçon' : 'Lesson documents'}</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {lecon.docs!.map((d, i) => (
                <li key={d.chemin}>
                  <button type="button" onClick={() => onOuvrirDocument(i)}
                    className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors hover:bg-[#b8923a]/12" style={{ borderColor: `${ORIGINE.or}80`, color: ORIGINE.encre }}>
                    <i className={`fa-solid ${/\.pdf$/i.test(d.nom) ? 'fa-file-pdf' : 'fa-file-arrow-down'}`} /> {d.nom}
                  </button>
                </li>
              ))}
            </ul>
          </div>
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
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors hover:bg-[#26290f]/6 disabled:opacity-50" style={{ borderColor: `${ORIGINE.olive}66`, color: ORIGINE.olive }}>
              <i className={`fa-solid ${envoi === 'document' ? 'fa-circle-notch fa-spin' : 'fa-file-arrow-up'}`} />
              {fr ? 'Déposer un document' : 'Upload a document'}
            </button>
            {message && <span className="text-xs" style={{ color: ORIGINE.olive }}>{message}</span>}
          </div>
        )}

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
