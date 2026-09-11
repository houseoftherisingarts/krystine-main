import React from 'react';
import type { Nature } from '../../lib/evenements';

// Le sticker de nature d'un rendez-vous, cousin du sticker de format des
// cours : il dit d'un coup d'œil si c'est un lancement, une retraite, une
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
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] backdrop-blur-sm ${
        ton === 'sombre'
          ? 'border-[#dcb874]/50 bg-[#16100a]/70 text-[#dcb874]'
          : 'border-[#bb9a5e]/50 bg-[#f6f3ee]/85 text-[#7d6330]'
      } ${className}`}
    >
      <i className={`fa-solid ${l.icone} text-[12px]`} aria-hidden="true" />
      {lang === 'FR' ? l.fr : l.en}
    </span>
  );
};

export default EtiquetteNature;
