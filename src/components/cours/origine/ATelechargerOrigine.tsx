import React, { useState } from 'react';
import { telechargerMusiqueOrigine } from '../../../firebase/musique';
import { ORIGINE } from '../../../pages/origine2/piliers';

// « À télécharger » de l'Expérience Origine : tous les documents du cours,
// une seule fois chacun, et la musique du Souffle d'Origine (Krystine,
// 6 octobre 2026). Chaque fichier reste protégé : il s'ouvre par le même
// chemin serveur que sous sa leçon (obtenirLecon, docIndex).

export interface DocAffiche {
  nom: string;
  pdf: boolean;
  chemin: string;
  /** La leçon qui porte le fichier, et sa place dans ses documents. */
  source: string;
  index: number;
}

interface Props {
  documents: DocAffiche[];
  lang: 'FR' | 'EN';
  onOuvrir: (d: DocAffiche) => void;
}

const ATelechargerOrigine: React.FC<Props> = ({ documents, lang, onOuvrir }) => {
  const fr = lang === 'FR';
  const [ouvert, setOuvert] = useState(false);
  const [souffle, setSouffle] = useState<{ etat: '' | 'charge' | 'pret' | 'erreur'; url: string }>({ etat: '', url: '' });

  const ecouter = async () => {
    if (souffle.etat === 'charge' || souffle.etat === 'pret') return;
    setSouffle({ etat: 'charge', url: '' });
    try { setSouffle({ etat: 'pret', url: await telechargerMusiqueOrigine() }); }
    catch { setSouffle({ etat: 'erreur', url: '' }); }
  };

  const ligne = 'grid w-full grid-cols-[40px_minmax(0,1fr)] items-center gap-3 rounded-[10px] px-2 py-1.5 text-left text-[13px] leading-snug text-[#26290f]/85 transition-colors hover:bg-[#26290f]/6';
  const pastille = 'flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#26290f]/8';

  return (
    <div className="rounded-[15px] border" style={{ borderColor: `${ORIGINE.olive}33`, background: ORIGINE.cremeSombre }}>
      <button type="button" onClick={() => setOuvert(o => !o)} aria-expanded={ouvert}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: ORIGINE.olive }}>
        <span><i className="fa-solid fa-file-arrow-down mr-2" />{fr ? 'À télécharger' : 'Downloads'} <span className="ml-1 normal-case tracking-normal opacity-60">{documents.length + 1}</span></span>
        <i className={`fa-solid fa-chevron-down shrink-0 text-[11px] transition-transform ${ouvert ? '' : '-rotate-90'}`} aria-hidden />
      </button>
      <div className="grid transition-[grid-template-rows] duration-300 ease-out" style={{ gridTemplateRows: ouvert ? '1fr' : '0fr' }}>
        <div className="min-h-0 overflow-hidden">
          <ul className="space-y-0.5 px-2 pb-3">
            {documents.map(d => (
              <li key={d.chemin}>
                <button type="button" onClick={() => onOuvrir(d)} className={ligne}>
                  <span className={pastille}><i className={`fa-solid ${d.pdf ? 'fa-file-pdf' : 'fa-file'} text-[13px]`} /></span>
                  <span className="min-w-0 truncate">{d.nom}</span>
                </button>
              </li>
            ))}
            <li>
              <button type="button" onClick={() => { void ecouter(); }} className={ligne}>
                <span className={pastille}><i className={`fa-solid ${souffle.etat === 'charge' ? 'fa-circle-notch fa-spin' : 'fa-music'} text-[13px]`} /></span>
                <span className="min-w-0 truncate">{fr ? 'Le Souffle d’Origine (musique)' : 'Le Souffle d’Origine (music)'}</span>
              </button>
              {souffle.etat === 'pret' && (
                <div className="px-2 pb-1 pt-1">
                  <audio src={souffle.url} controls autoPlay className="w-full" />
                  <a href={souffle.url} className="mt-1 inline-block text-[11px] underline" style={{ color: ORIGINE.olive }}>{fr ? 'Télécharger le fichier' : 'Download the file'}</a>
                </div>
              )}
              {souffle.etat === 'erreur' && <p className="px-2 text-[11px] text-red-700">{fr ? 'La musique n’a pas pu se charger. Réessayez dans un instant.' : 'The music could not load. Try again in a moment.'}</p>}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ATelechargerOrigine;
