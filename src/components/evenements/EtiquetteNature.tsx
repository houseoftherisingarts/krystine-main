import React from 'react';
import type { Nature } from '../../lib/evenements';

// Le sticker de nature d'un rendez-vous, dans le langage des pages V2 (chip
// carrée, filet d'or), cousin du sticker de format des cours : il dit d'un coup d'œil si c'est un lancement, une retraite, une
// conférence ou un rendez-vous en ligne.

const LIBELLES: Record<Nature, { fr: string; en: string; icone: string }> = {
  lancement:  { fr: 'Lancement',      en: 'Launch',        icone: 'fa-book-open' },
  livre:      { fr: 'Parution',       en: 'Release',       icone: 'fa-book' },
  retraite:   { fr: 'Retraite',       en: 'Retreat',       icone: 'fa-mountain-sun' },
  conference: { fr: 'Conférence',     en: 'Talk',          icone: 'fa-microphone-lines' },
  enLigne:    { fr: 'En ligne',       en: 'Online',        icone: 'fa-video' },
  programme:  { fr: 'Programme',      en: 'Program',       icone: 'fa-compass' },
  tournee:    { fr: 'Tournée',        en: 'Tour',          icone: 'fa-route' },
  scene:      { fr: 'Sur scène',      en: 'On stage',      icone: 'fa-microphone' },
  rencontre:  { fr: 'Rencontre',      en: 'Gathering',     icone: 'fa-calendar-check' },
};

const EtiquetteNature: React.FC<{
  nature: Nature;
  lang: 'FR' | 'EN';
  ton?: 'clair' | 'sombre';
  className?: string;
}> = ({ nature, lang, ton = 'clair', className = '' }) => {
  const l = LIBELLES[nature];
  return (
    <span
      className={`inline-flex items-center gap-2 border px-3 py-1.5 text-[0.58rem] uppercase tracking-[0.2em] ${
        ton === 'sombre'
          ? 'border-[#BA7B39]/50 text-[#d9a05b]'
          : 'border-[#9c7a44]/35 bg-[#faf6ee]/85 text-[#7d6330]'
      } ${className}`}
    >
      <i className={`fa-solid ${l.icone} text-[12px]`} aria-hidden="true" />
      {lang === 'FR' ? l.fr : l.en}
    </span>
  );
};

export default EtiquetteNature;
