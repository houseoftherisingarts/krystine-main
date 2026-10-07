import React, { useState } from 'react';

// Le lecteur vidéo de toutes les leçons. Règle de Krystine (7 octobre 2026) :
// jamais d'arrêt sur image tiré d'une vidéo comme visuel. Avant la lecture, on
// montre une vraie image (vignette posée par l'admin, sinon la couverture du
// cours, sinon un visuel de marque), cadrée en 16:9; la balise <video> n'existe
// qu'après le clic, donc le navigateur n'a aucune image de la vidéo à montrer.

// Les vignettes fabriquées en prenant une image de la vidéo : Wistia, derrière
// les leçons venues de Kajabi. On les ignore partout.
const ARRET_SUR_IMAGE = /(^|\/\/|\.)wistia\.(com|net)\//i;

/** La vignette propre d'une leçon (déposée par l'admin ou dessinée), jamais un arrêt sur image. */
export const vignetteDeLecon = (l: { imageUrl?: string; vignette?: string; image?: string } | null | undefined): string | undefined =>
  [l?.imageUrl, l?.vignette, l?.image].find(u => !!u && !ARRET_SUR_IMAGE.test(u)) || undefined;

interface Props {
  url: string;
  affiche: string;
  lang: 'FR' | 'EN' | string;
  /** Classes du lecteur une fois lancé. */
  className?: string;
}

const VideoLecon: React.FC<Props> = ({ url, affiche, lang, className }) => {
  const [lancee, setLancee] = useState(false);
  const fr = lang === 'FR';

  if (lancee) {
    return <video src={url} poster={affiche} controls autoPlay playsInline preload="auto" className={className} />;
  }
  return (
    <button
      type="button"
      onClick={() => setLancee(true)}
      aria-label={fr ? 'Lancer la vidéo' : 'Play the video'}
      className="group relative block aspect-video w-full overflow-hidden rounded-[15px] bg-[#1c1712]"
    >
      <img src={affiche} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
      <span aria-hidden className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#EEE7DB]/90 text-[#28352F] shadow-[0_12px_30px_-10px_rgba(0,0,0,0.6)] transition-transform duration-300 group-hover:scale-105 md:h-20 md:w-20">
        <i className="fa-solid fa-play ml-1 text-xl md:text-2xl" />
      </span>
    </button>
  );
};

export default VideoLecon;
