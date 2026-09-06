import React, { useEffect } from 'react';
import Portail from './Portail';

// Lecteur YouTube partagé pour tout le site public : la vidéo joue toujours
// dans la page, jamais dans un nouvel onglet (Alex, 6 septembre 2026). Un
// embed standard youtube.com compte la vue normalement.

/** Extrait l'id à 11 caractères depuis watch?v=, youtu.be/, /live/ ou /embed/. */
export function extraireIdYouTube(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/|\/live\/|\/embed\/)([\w-]{11})/);
  return m ? m[1] : null;
}

interface Props {
  videoId?: string | null;
  url?: string | null;
  titre?: string;
  autoplay?: boolean;
  className?: string;
}

/** L'iframe embarquée, à poser dans un conteneur `relative aspect-video` (ou équivalent). */
const LecteurVideoEmbarque: React.FC<Props> = ({ videoId, url, titre = 'YouTube', autoplay = true, className }) => {
  const id = videoId || extraireIdYouTube(url);
  if (!id) return null;
  return (
    <iframe
      title={titre}
      src={`https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1${autoplay ? '&autoplay=1' : ''}`}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      className={className || 'absolute inset-0 h-full w-full'}
    />
  );
};

export default LecteurVideoEmbarque;

/** La même vidéo, en fenêtre plein écran par-dessus tout le site. Échap ou le fond ferment. */
export const LecteurVideoPleinEcran: React.FC<Props & { onFermer: () => void }> = ({ onFermer, titre, ...props }) => {
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => { if (e.key === 'Escape') onFermer(); };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [onFermer]);

  return (
    <Portail>
      <div
        className="fixed inset-0 z-[300] flex items-center justify-center overscroll-contain bg-black/90 p-4 backdrop-blur-sm"
        onClick={onFermer}
      >
        <button
          type="button"
          onClick={onFermer}
          aria-label="Fermer"
          className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <i className="fa-solid fa-times text-lg" />
        </button>
        <div
          className="relative aspect-video w-full max-w-5xl overflow-hidden rounded-[15px] bg-black shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <LecteurVideoEmbarque titre={titre} {...props} />
        </div>
      </div>
    </Portail>
  );
};
