import React, { useEffect, useRef, useState } from 'react';
import Portail from '../Portail';
import { premierePage, premierePageEnCache, telechargerFichier, toutesLesPages } from '../../lib/pdfApercu';

// Les documents d'une leçon (Krystine, 8 octobre 2026) : à droite de la
// leçon sur ordinateur, sous son titre sur téléphone. Chaque document montre
// sa première page et deux gestes nets : le voir en grand dans la page, ou
// télécharger la version imprimable. L'adresse du fichier passe toujours par
// la garde serveur (une semaine fermée ne sert rien).

export interface DocLecon {
  /** Le chemin du fichier dans Storage : il sert aussi de clé à l'aperçu gardé. */
  cle: string;
  nom: string;
  pdf: boolean;
  /** Le nom du fichier téléchargé quand il diffère du nom affiché (une chanson : « Krystine St-Laurent · Vata.mp3 »). */
  fichier?: string;
  obtenirUrl: () => Promise<string>;
}

export interface Palette {
  encre: string;
  doux: string;
  accent: string;
  /** Le texte posé sur un bouton cuivre. */
  surAccent: string;
  fond: string;
  bord: string;
}

export const PALETTE_ORIGINE: Palette = { encre: '#1c2420', doux: '#3c4a42', accent: '#BA7B39', surAccent: '#1c2420', fond: '#efe6d7', bord: 'rgba(60,74,66,0.2)' };
export const PALETTE_COURS: Palette = { encre: '#293027', doux: '#8B4A2F', accent: '#BA7B39', surAccent: '#293027', fond: '#EEE7DB', bord: 'rgba(186,123,57,0.3)' };

/** Le nom de fichier proposé au téléchargement : le nom lisible, avec son extension. */
const nomDeFichier = (d: DocLecon) => d.fichier || (/\.[a-z0-9]{2,4}$/i.test(d.nom) ? d.nom : `${d.nom}${d.pdf ? '.pdf' : ''}`);

/** La première page d'un PDF, dessinée seulement quand elle devient visible. */
export const PremierePage: React.FC<{ doc: DocLecon; className?: string; icone?: string; naturel?: boolean }> = ({ doc, className = '', icone = 'fa-file-lines', naturel }) => {
  const [image, setImage] = useState<string | null>(() => premierePageEnCache(doc.cle));
  const [rate, setRate] = useState(false);
  const boite = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (image || !doc.pdf) return;
    const el = boite.current;
    if (!el) return;
    let vivant = true;
    const io = new IntersectionObserver(entrees => {
      if (!entrees.some(e => e.isIntersecting)) return;
      io.disconnect();
      premierePage(doc.cle, doc.obtenirUrl).then(i => { if (vivant) setImage(i); }, () => { if (vivant) setRate(true); });
    }, { rootMargin: '120px' });
    io.observe(el);
    return () => { vivant = false; io.disconnect(); };
  }, [doc, image]);

  // « naturel » : la page garde ses proportions (un tableau à l'italienne reste à l'italienne).
  if (naturel && image) return <img src={image} alt="" className={`block h-auto w-full bg-white ${className}`} />;
  return (
    <span ref={boite} className={`relative block overflow-hidden bg-[#fbf8f2] ${naturel ? 'aspect-[4/5]' : ''} ${className}`}>
      {image ? (
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-contain" />
      ) : (
        <span className={`absolute inset-0 flex items-center justify-center text-[#3c4a42]/45 ${!rate && doc.pdf ? 'animate-pulse' : ''}`}>
          <i className={`fa-solid ${doc.pdf ? icone : 'fa-file'} text-lg`} />
        </span>
      )}
    </span>
  );
};

interface PanneauProps {
  documents: DocLecon[];
  lang: 'FR' | 'EN';
  palette?: Palette;
  onVoir: (d: DocLecon) => void;
  className?: string;
}

/** Le panneau « Documents de la leçon ». */
export const DocumentsLecon: React.FC<PanneauProps> = ({ documents, lang, palette = PALETTE_ORIGINE, onVoir, className = '' }) => {
  const fr = lang === 'FR';
  const [occupe, setOccupe] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  if (!documents.length) return null;

  const telecharger = async (d: DocLecon) => {
    setOccupe(d.cle); setErreur(null);
    try { await telechargerFichier(await d.obtenirUrl(), nomDeFichier(d)); }
    catch { setErreur(fr ? 'Le document n’a pas pu se charger. Réessayez dans un instant.' : 'The document could not load. Try again in a moment.'); }
    finally { setOccupe(null); }
  };

  return (
    <section aria-label={fr ? 'Documents de la leçon' : 'Lesson documents'} className={`rounded-[15px] border p-4 ${className}`} style={{ borderColor: palette.bord, background: palette.fond }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: palette.doux }}>
        <i className="fa-solid fa-file-arrow-down mr-2" />{fr ? 'Documents de la leçon' : 'Lesson documents'}
        {documents.length > 1 && <span className="ml-1 normal-case tracking-normal opacity-60">{documents.length}</span>}
      </p>
      <ul className="mt-3 space-y-5">
        {documents.map(d => (
          <li key={d.cle}>
            {/* Un fichier qui n'est pas un PDF (une chanson) n'a pas de page à montrer : son nom et le bouton Télécharger suffisent. */}
            {d.pdf && (
              <button type="button" onClick={() => onVoir(d)} aria-label={`${fr ? 'Voir' : 'View'} ${d.nom}`}
                className="group block w-full overflow-hidden rounded-[12px] border shadow-[0_14px_30px_-22px_rgba(28,36,32,0.55)] transition-transform duration-500 hover:-translate-y-0.5" style={{ borderColor: palette.bord }}>
                <PremierePage doc={d} naturel className="w-full" />
              </button>
            )}
            <div className="min-w-0">
            <p className={`${d.pdf ? 'mt-3' : ''} text-[14px] leading-snug`} style={{ color: palette.encre }}>{d.nom}</p>
            <div className="mt-3 grid gap-2">
              {d.pdf && (
              <button type="button" onClick={() => onVoir(d)}
                className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] transition-[filter] hover:brightness-110" style={{ background: palette.accent, color: palette.surAccent }}>
                <i className="fa-solid fa-eye" />{fr ? 'Voir' : 'View'}
              </button>
              )}
              <button type="button" onClick={() => { void telecharger(d); }} disabled={occupe === d.cle}
                className="inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors hover:bg-[#1c2420]/5 disabled:opacity-60" style={{ borderColor: `${palette.accent}99`, color: palette.encre }}>
                <i className={`fa-solid ${occupe === d.cle ? 'fa-circle-notch fa-spin' : 'fa-download'}`} />
                {d.pdf ? (fr ? 'Télécharger la version imprimable' : 'Download the printable version') : (fr ? 'Télécharger' : 'Download')}
              </button>
            </div>
            </div>
          </li>
        ))}
      </ul>
      {erreur && <p className="mt-3 text-[12px] text-red-700">{erreur}</p>}
    </section>
  );
};

interface FenetreProps {
  doc: { nom: string; url: string } | null;
  lang: 'FR' | 'EN';
  onFermer: () => void;
}

/** Le document en grand, dans la page : chaque page dessinée l'une sous l'autre. */
export const FenetreDocument: React.FC<FenetreProps> = ({ doc, lang, onFermer }) => {
  const fr = lang === 'FR';
  const [pages, setPages] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [rate, setRate] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const corps = useRef<HTMLDivElement>(null);
  const fermer = useRef(onFermer);
  fermer.current = onFermer;

  useEffect(() => {
    if (!doc) return;
    setPages([]); setTotal(0); setRate(false);
    let annule = false;
    const largeur = Math.min(1600, Math.round((corps.current?.clientWidth || 800) * Math.min(2, window.devicePixelRatio || 1)));
    toutesLesPages(doc.url, largeur, (_n, t, image) => { setTotal(t); setPages(p => [...p, image]); }, () => annule).catch(() => { if (!annule) setRate(true); });
    const touche = (e: KeyboardEvent) => { if (e.key === 'Escape') fermer.current(); };
    window.addEventListener('keydown', touche);
    const avant = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { annule = true; window.removeEventListener('keydown', touche); document.body.style.overflow = avant; };
  }, [doc]);

  if (!doc) return null;
  const nom = /\.pdf$/i.test(doc.nom) ? doc.nom : `${doc.nom}.pdf`;
  return (
    <Portail>
      <div className="fixed inset-0 z-[135] flex items-stretch justify-center bg-[#151d19]/75 p-0 md:p-6" onClick={onFermer} role="dialog" aria-modal="true" aria-label={doc.nom}>
        <div className="flex w-full max-w-4xl flex-col overflow-hidden bg-[#f4efe6] md:rounded-[15px]" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-3 border-b px-4 py-3 md:px-5" style={{ borderColor: 'rgba(60,74,66,0.18)' }}>
            <p className="min-w-0 flex-1 truncate text-sm text-[#1c2420]"><i className="fa-solid fa-file-lines mr-2 text-[#3c4a42]" />{doc.nom}</p>
            <button type="button" disabled={occupe} onClick={async () => { setOccupe(true); await telechargerFichier(doc.url, nom); setOccupe(false); }}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#BA7B39] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#1c2420] hover:brightness-110 disabled:opacity-60">
              <i className={`fa-solid ${occupe ? 'fa-circle-notch fa-spin' : 'fa-download'}`} />
              <span className="hidden sm:inline">{fr ? 'Télécharger la version imprimable' : 'Download the printable version'}</span>
              <span className="sm:hidden">{fr ? 'Télécharger' : 'Download'}</span>
            </button>
            <button type="button" onClick={onFermer} aria-label={fr ? 'Fermer' : 'Close'} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#3c4a42] hover:bg-[#1c2420]/6">
              <i className="fa-solid fa-xmark text-lg" />
            </button>
          </div>
          <div ref={corps} className="flex-1 space-y-4 overflow-y-auto overscroll-contain bg-[#e9e1d3] p-3 md:p-6">
            {pages.map((p, i) => <img key={i} src={p} alt={`${fr ? 'Page' : 'Page'} ${i + 1}`} className="mx-auto block w-full max-w-[860px] rounded-[6px] bg-white shadow-[0_10px_30px_-18px_rgba(0,0,0,0.5)]" />)}
            {!rate && (!total || pages.length < total) && (
              <p className="py-10 text-center text-sm text-[#3c4a42]"><i className="fa-solid fa-circle-notch fa-spin mr-2" />{fr ? 'Le document s’ouvre…' : 'Opening the document…'}</p>
            )}
            {rate && (
              <div className="py-10 text-center text-sm text-[#3c4a42]">
                <p>{fr ? 'L’aperçu ne s’affiche pas dans ce navigateur.' : 'The preview does not show in this browser.'}</p>
                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block underline">{fr ? 'Ouvrir le document' : 'Open the document'}</a>
              </div>
            )}
          </div>
        </div>
      </div>
    </Portail>
  );
};
