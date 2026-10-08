import React from 'react';
import type { Lecon } from '../../firebase/formations';

// La vignette composée par le code, pour une leçon qui n'a pas de vrai visuel
// (Krystine, 8 octobre 2026) : jamais la même image partout, jamais une image
// générée. Le fond, le libellé et le titre viennent de la leçon elle-même :
// si le titre change, la vignette suit. Une vraie image déposée avec
// « Changer la vignette » la remplace toujours.

export type Genre = 'meditation' | 'rediffusion' | 'audio' | 'video' | 'document' | 'questions' | 'podcast' | 'certificat' | 'echange' | 'texte';

const ICONES: Record<Genre, string> = {
  meditation: 'fa-spa',
  rediffusion: 'fa-tower-broadcast',
  audio: 'fa-headphones',
  video: 'fa-circle-play',
  document: 'fa-file-lines',
  questions: 'fa-comments',
  podcast: 'fa-microphone-lines',
  certificat: 'fa-award',
  echange: 'fa-comment-dots',
  texte: 'fa-align-left',
};

type LeconLue = Pick<Lecon, 'titre' | 'type'> & { docs?: Lecon['docs']; chemin?: string };

/** Ce qu'est la leçon, lu dans son type et son titre. */
export function genreDeLecon(l: LeconLue): Genre {
  const t = l.titre || '';
  if (/certificat/i.test(t)) return 'certificat';
  if (/m[ée]ditation/i.test(t)) return 'meditation';
  if (/questions?\s*(?:&|et|,)\s*r[ée]ponses|\bq\s*&\s*a\b|\bqna\b/i.test(t)) return 'questions';
  if (/\bchat\b|discussion/i.test(t)) return 'echange';
  if (/rediffusion|replay|\blive\b|\bdirect\b|dimanche/i.test(t)) return 'rediffusion';
  if (/podcast|[ée]pisode/i.test(t)) return 'podcast';
  if (l.type === 'pdf' || l.type === 'fichier' || (l.type === 'texte' && !l.chemin && (l.docs?.length ?? 0) > 0)) return 'document';
  if (l.type === 'audio' || /\baudio\b/i.test(t)) return 'audio';
  if (l.type === 'video') return 'video';
  return 'texte';
}

const MANTRAS = ['Om Moksha Ritam', 'Sat Chit Ananda', 'Ananda Hum', 'Om Shanti', 'So Hum', 'Om Siddaye Namah', 'Tat vam Asi', 'Ahum Brahmasmi'];
const MOIS = 'janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre';

/** Le nom du mantra d'une méditation, sinon ce qui suit le dernier deux-points du titre. */
function mantraDe(titre: string): string {
  const connu = MANTRAS.find(m => new RegExp(m.replace(/\s+/g, '\\s*'), 'i').test(titre));
  if (connu) return connu;
  const fin = titre.split(/[:.]/).pop()?.trim() || '';
  if (!fin || fin.length > 38 || /m[ée]ditation/i.test(fin)) return '';
  return fin.charAt(0).toUpperCase() + fin.slice(1).toLowerCase();
}

/** Le libellé de la vignette : « Méditation · Om Shanti », « Rediffusion audio · 17 mai »… */
export function libelleDeLecon(l: LeconLue, semaine: number, fr = true): string {
  const g = genreDeLecon(l);
  const t = l.titre || '';
  const sem = semaine >= 1 ? `${fr ? 'Semaine' : 'Week'} ${semaine}` : '';
  const avec = (a: string, b: string) => (b ? `${a} · ${b}` : a);
  switch (g) {
    case 'meditation': return avec(fr ? 'Méditation' : 'Meditation', mantraDe(t));
    case 'rediffusion': {
      const date = new RegExp(`(\\d{1,2})\\s*(${MOIS})`, 'i').exec(t);
      const dimanche = /dimanche\s*#?\s*(\d+)/i.exec(t);
      const quoi = /\baudio\b/i.test(t) ? (fr ? 'Rediffusion audio' : 'Audio replay') : /vid[ée]o/i.test(t) ? (fr ? 'Rediffusion vidéo' : 'Video replay') : (fr ? 'Rediffusion' : 'Replay');
      return avec(quoi, date ? `${date[1]} ${date[2].toLowerCase()}` : dimanche ? `${fr ? 'Dimanche' : 'Sunday'} ${dimanche[1]}` : sem);
    }
    case 'audio': return avec('Audio', sem);
    case 'video': return avec(fr ? 'Vidéo' : 'Video', sem);
    case 'document': return avec('Document', sem);
    case 'questions': return avec(fr ? 'Questions et réponses' : 'Questions and answers', sem);
    case 'podcast': return 'Podcast';
    case 'certificat': return fr ? 'Certificat' : 'Certificate';
    case 'echange': return avec(fr ? 'Échange' : 'Exchange', sem);
    default: return avec(fr ? 'Lecture' : 'Reading', sem);
  }
}

export interface Composition {
  titre: string;
  libelle: string;
  genre: Genre;
  /** Le fond (le pilier de la semaine, sinon la crème), l'encre qui s'y lit, l'accent cuivre. */
  fond: string;
  encre: string;
  accent: string;
}

/** La composition d'une leçon des autres cours : la crème du site, l'encre vert profond, le cuivre lisible. */
export const compositionCours = (l: LeconLue, fr = true): Composition => ({
  titre: (l.titre || '').replace(/\s+/g, ' ').trim(),
  libelle: libelleDeLecon(l, -1, fr),
  genre: genreDeLecon(l),
  fond: '#EEE7DB',
  encre: '#293027',
  accent: '#8B4A2F',
});

interface Props {
  c: Composition;
  taille: 'banniere' | 'pastille';
  className?: string;
  /** La taille de la pastille (classes Tailwind). */
  cote?: string;
}

const VignetteComposee: React.FC<Props> = ({ c, taille, className = '', cote = 'h-10 w-10' }) => {
  if (taille === 'pastille') {
    return (
      <span aria-hidden className={`relative flex ${cote} shrink-0 items-center justify-center overflow-hidden rounded-[8px] ${className}`} style={{ background: c.fond, color: c.accent, boxShadow: `inset 0 0 0 1px ${c.accent}40` }}>
        <span className="absolute -right-3 -top-3 h-9 w-9 rounded-full border" style={{ borderColor: `${c.accent}55` }} />
        <i className={`fa-solid ${ICONES[c.genre]} relative text-[13px]`} />
      </span>
    );
  }
  return (
    <div aria-hidden className={`absolute inset-0 overflow-hidden ${className}`} style={{ background: c.fond, color: c.encre }}>
      {/* Le disque partagé en deux, le motif des visuels d'Origine, réduit à deux filets. */}
      <span className="absolute right-[6%] top-1/2 aspect-square h-[78%] -translate-y-1/2 rounded-full border" style={{ borderColor: `${c.accent}66` }}>
        <span className="absolute inset-[9%] overflow-hidden rounded-full border" style={{ borderColor: `${c.accent}40` }}>
          <span className="absolute inset-y-0 right-0 w-1/2" style={{ background: `${c.accent}14` }} />
        </span>
        <span className="absolute left-1/2 top-1/2 flex h-[26%] w-[26%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border" style={{ borderColor: c.accent, background: c.fond, color: c.accent }}>
          <i className={`fa-solid ${ICONES[c.genre]} text-[clamp(0.9rem,2.2vw,1.6rem)]`} />
        </span>
      </span>
      <div className="absolute left-[6%] top-[14%] max-w-[46%] text-left">
        <p className="text-[clamp(0.55rem,1vw,0.68rem)] font-bold uppercase tracking-[0.2em]" style={{ color: c.accent }}>{c.libelle}</p>
        <p className="mt-3 line-clamp-2 hidden font-serif sm:block text-[clamp(1.25rem,2.6vw,2.2rem)] font-medium leading-[1.08]">{c.titre}</p>
        <span className="mt-4 hidden h-px w-12 sm:block" style={{ background: c.accent }} />
      </div>
    </div>
  );
};

export default VignetteComposee;
