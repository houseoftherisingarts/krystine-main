import React from 'react';

// Le petit sticker qui dit ce qu'on va consommer : une expérience audio, une
// expérience vidéo, une lecture. Partout où un programme se montre (Alex, 11
// septembre 2026 : « c'est important de bien identifier quel genre de
// contenu est-ce qu'on va se consommer »).

export type FormatCours = 'audio' | 'video' | 'texte' | 'mixte';

/** Le format déclaré d'un programme quand ses leçons ne sont pas chargées. */
const DECLARES: Record<string, FormatCours> = {
  'kajabi-2148687644': 'audio',   // Vata : seize capsules audio
  'kajabi-2149362090': 'video',   // Santé Parfaite : masterclass filmée
  origine2: 'mixte',
};

/** Le format dominant, compté sur les leçons quand elles sont là. */
export function formatDe(id: string, lecons?: { type?: string }[]): FormatCours {
  if (lecons && lecons.length) {
    const n = { audio: 0, video: 0, texte: 0 };
    for (const l of lecons) if (l.type === 'audio' || l.type === 'video' || l.type === 'texte') n[l.type]++;
    const media = n.audio + n.video;
    if (media === 0) return 'texte';
    if (n.audio && n.video && Math.min(n.audio, n.video) / media > 0.3) return 'mixte';
    return n.audio >= n.video ? 'audio' : 'video';
  }
  return DECLARES[id] || 'mixte';
}

const LIBELLES: Record<FormatCours, { fr: string; en: string; icone: string }> = {
  audio: { fr: 'Expérience audio', en: 'Audio experience', icone: 'fa-headphones' },
  video: { fr: 'Expérience vidéo', en: 'Video experience', icone: 'fa-circle-play' },
  texte: { fr: 'Lecture guidée', en: 'Guided reading', icone: 'fa-book-open' },
  mixte: { fr: 'Audio et vidéo', en: 'Audio and video', icone: 'fa-photo-film' },
};

const StickerFormat: React.FC<{
  format: FormatCours;
  lang: 'FR' | 'EN';
  /** clair : sur crème; sombre : sur image ou fond vert. */
  ton?: 'clair' | 'sombre';
  className?: string;
}> = ({ format, lang, ton = 'clair', className = '' }) => {
  const l = LIBELLES[format];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] backdrop-blur-sm ${
        ton === 'sombre'
          ? 'border-[#d9a05b]/50 bg-[#151d19]/70 text-[#d9a05b]'
          : 'border-[#BA7B39]/45 bg-[#F7F3EA]/85 text-[#8B4A2F]'
      } ${className}`}
    >
      <i className={`fa-solid ${l.icone} text-[12px]`} aria-hidden="true" />
      {lang === 'FR' ? l.fr : l.en}
    </span>
  );
};

export default StickerFormat;
