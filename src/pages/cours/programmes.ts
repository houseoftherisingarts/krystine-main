// Les programmes qui ont droit à l'espace de cours refait : le seuil plein
// cadre, le chemin des chapitres en grandes cartes, le lecteur maison, les
// boîtes colorées, le mot de bravo et le diplôme. Vata a ouvert la voie le
// 10 septembre 2026; Santé Parfaite suit le 11. Un programme s'ajoute ici en
// une entrée : son identifiant Firestore, sa couverture, ses chapitres et la
// façon de rattacher un nom de module importé à un chapitre.

import { SEMAINES_VATA, rangDeModule as rangVata, type SemaineVata } from '../vata/semaines';

export type Chapitre = SemaineVata;

export interface Programme {
  id: string;
  /** Le surtitre et le titre display du seuil, en Cormorant. */
  surtitre: { fr: string; en: string };
  titre: { fr: string; en: string };
  couverture: string;
  duree: { fr: string; en: string };
  /** Le chemin : son étiquette, son titre de section, et le mot pour une étape. */
  chemin: { etiquette: { fr: string; en: string }; titre: { fr: string; en: string } };
  unite: { fr: [string, string]; en: [string, string] };   // singulier, pluriel
  /** Le mot devant le numéro d'un chapitre : « Semaine 3 », « Étape 3 ». */
  prefixe: { fr: string; en: string };
  chapitres: Chapitre[];
  rangDeModule: (nom?: string) => number;
}

// Les teintes, du froid au chaud, comme la perception qui s'éclaircit.
const T = [
  ['#4F5C58', '#7A8A85'], ['#44626D', '#6E93A0'], ['#4E6349', '#7A9270'], ['#3B4F63', '#6A87A3'],
  ['#6A6B41', '#9BA067'], ['#8F6526', '#C79A52'], ['#8A4F2C', '#BA7B39'], ['#7A3D26', '#A9663C'],
  ['#5C4A2E', '#9C7E4E'], ['#6B4A3A', '#B08262'],
];

const img = (dossier: string, n: number) => ({
  image: `/${dossier}/chapitres/c${n}.webp`,
  bandeau: `/${dossier}/chapitres/c${n}-large.webp`,
  vignette: `/${dossier}/chapitres/c${n}-thumb.webp`,
});

// ── Santé Parfaite · Masterclass Énergie et Clarté ──────────────────────────
// Dix modules importés, rattachés par un mot-clé de leur nom, dans l'ordre.
const SP_CLES: [RegExp, number][] = [
  [/bienvenue/i, 0], [/parcours de f/i, 1], [/observer/i, 2], [/stabiliser/i, 3], [/percoler/i, 4],
  [/rituels/i, 5], [/prana/i, 6], [/tejas/i, 7], [/ojas/i, 8], [/ancrer/i, 9],
];
const SP: Chapitre[] = ([
  ['0', { fr: 'Le seuil', en: 'The threshold' }, { fr: 'Votre espace s’ouvre, et le parcours commence par une tasse chaude et un moment à soi.', en: 'Your space opens, and the journey starts with a warm cup and a moment for yourself.' }],
  ['I', { fr: 'Le parcours de février', en: 'The February path' }, { fr: 'Le mois où l’énergie remonte doucement, et où le corps demande à être écouté.', en: 'The month energy slowly rises, and the body asks to be heard.' }],
  ['II', { fr: 'Observer', en: 'Observe' }, { fr: 'Comprendre ce qui draine et ce qui nourrit votre énergie, jour après jour.', en: 'Understand what drains and what feeds your energy, day after day.' }],
  ['III', { fr: 'Stabiliser', en: 'Stabilize' }, { fr: 'Poser des appuis simples pour que l’énergie tienne et que l’alignement revienne.', en: 'Set simple anchors so energy holds and alignment returns.' }],
  ['IV', { fr: 'Laisser percoler', en: 'Let it steep' }, { fr: 'Le temps de laisser descendre ce qui a été appris, sans rien forcer.', en: 'Time to let what was learned settle, without forcing anything.' }],
  ['V', { fr: 'L’art des rituels', en: 'The art of rituals' }, { fr: 'Des gestes courts et répétés, qui font plus que les grandes résolutions.', en: 'Short, repeated gestures that do more than grand resolutions.' }],
  ['VI', { fr: 'Prana', en: 'Prana' }, { fr: 'Le souffle de vie : le faire circuler pour que l’énergie revienne d’elle-même.', en: 'The breath of life: let it flow so energy returns on its own.' }],
  ['VII', { fr: 'Tejas', en: 'Tejas' }, { fr: 'Le feu intérieur : le nourrir sans le brûler, pour la clarté et la digestion.', en: 'The inner fire: feed it without burning out, for clarity and digestion.' }],
  ['VIII', { fr: 'Ojas', en: 'Ojas' }, { fr: 'La vitalité profonde : ce qui reste quand le souffle et le feu sont en paix.', en: 'Deep vitality: what remains when breath and fire are at peace.' }],
  ['IX', { fr: 'Ancrer', en: 'Anchor' }, { fr: 'Installer l’énergie dans la clarté et la durée, pour que ça tienne après le parcours.', en: 'Settle energy into clarity and duration, so it lasts beyond the course.' }],
] as [string, { fr: string; en: string }, { fr: string; en: string }][]).map(([roman, sens, promesse], rang) => ({
  rang, roman, sens, promesse,
  couleur: { encre: T[rang][0], vive: T[rang][1] },
  ...img('sante-parfaite', rang),
}));

export const PROGRAMMES: Record<string, Programme> = {
  'kajabi-2148687644': {
    id: 'kajabi-2148687644',
    surtitre: { fr: 'Expérience Ayurveda', en: 'Ayurveda Experience' },
    titre: { fr: 'Saison\nVata', en: 'Vata\nSeason' },
    couverture: '/vata/couverture.webp',
    duree: { fr: '7 semaines', en: '7 weeks' },
    chemin: { etiquette: { fr: 'Le chemin des sens', en: 'The path of the senses' }, titre: { fr: 'Une porte s’ouvre à la fois', en: 'One door opens at a time' } },
    unite: { fr: ['porte', 'portes'], en: ['door', 'doors'] },
    prefixe: { fr: 'Semaine', en: 'Week' },
    chapitres: SEMAINES_VATA,
    rangDeModule: rangVata,
  },
  'kajabi-2149362090': {
    id: 'kajabi-2149362090',
    surtitre: { fr: 'Parcours Santé Parfaite', en: 'Perfect Health Path' },
    titre: { fr: 'Énergie\net clarté', en: 'Energy\nand clarity' },
    couverture: '/sante-parfaite/couverture.webp',
    duree: { fr: 'Masterclass · 10 étapes', en: 'Masterclass · 10 steps' },
    chemin: { etiquette: { fr: 'Le parcours', en: 'The path' }, titre: { fr: 'Une étape à la fois', en: 'One step at a time' } },
    unite: { fr: ['étape', 'étapes'], en: ['step', 'steps'] },
    prefixe: { fr: 'Étape', en: 'Step' },
    chapitres: SP,
    rangDeModule: (nom?: string) => {
      if (!nom) return -1;
      for (const [re, rang] of SP_CLES) if (re.test(nom)) return rang;
      return -1;
    },
  },
};

// Tout programme de Krystine porte cette signature visuelle, sauf le Foyer
// d'Origine qui a la sienne (Alex, 11 septembre 2026). Un cours sans entrée
// dédiée ci-dessus reçoit un programme construit sur ses modules importés,
// dans leur ordre d'apparition, avec les dix teintes et les dix natures
// mortes génériques au canon. Une entrée dédiée n'apporte que la couverture,
// les noms de chapitres et leurs images propres.
export const SANS_SIGNATURE = new Set(['foyer']);

const deuxLignes = (titre: string): string => {
  // « Expérience Ayurveda : saison Vata » → surtitre « Expérience Ayurveda », titre « saison Vata »
  const mots = titre.replace(/\s+/g, ' ').trim().split(' ');
  if (mots.length <= 3) return mots.join('\n');
  const coupe = Math.ceil(mots.length / 2);
  return mots.slice(0, coupe).join(' ') + '\n' + mots.slice(coupe).join(' ');
};

const ROMAINS = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI'];

export function programmeGenerique(
  formation: { id: string; titre: string; imageUrl?: string },
  modules: string[],
): Programme {
  const [surtitre, ...reste] = formation.titre.split(/\s*[:·]\s*/);
  const titre = reste.length ? reste.join(' ') : formation.titre;
  const chapitres: Chapitre[] = modules.map((nom, rang) => ({
    rang,
    roman: ROMAINS[rang] ?? String(rang),
    sens: { fr: nom.replace(/^[^:]*\d+\s*:\s*/i, '').trim() || nom, en: nom },
    promesse: { fr: '', en: '' },
    couleur: { encre: T[rang % T.length][0], vive: T[rang % T.length][1] },
    ...img('cours', rang % 10),
  }));
  return {
    id: formation.id,
    surtitre: { fr: reste.length ? surtitre : 'Formation', en: reste.length ? surtitre : 'Course' },
    titre: { fr: deuxLignes(titre), en: deuxLignes(titre) },
    couverture: formation.imageUrl || '/cours/couverture.webp',
    duree: { fr: `${modules.length} modules`, en: `${modules.length} modules` },
    chemin: { etiquette: { fr: 'Le parcours', en: 'The path' }, titre: { fr: 'Une étape à la fois', en: 'One step at a time' } },
    unite: { fr: ['étape', 'étapes'], en: ['step', 'steps'] },
    prefixe: { fr: 'Module', en: 'Module' },
    chapitres,
    rangDeModule: (nom?: string) => (nom ? modules.indexOf(nom) : -1),
  };
}

/** Le programme d'un cours : l'entrée dédiée, sinon le générique, sinon rien (Foyer). */
export function programmeDe(
  formation: { id: string; titre: string; imageUrl?: string } | null | undefined,
  lecons: { moduleNom?: string }[],
): Programme | undefined {
  if (!formation || SANS_SIGNATURE.has(formation.id)) return undefined;
  if (PROGRAMMES[formation.id]) return PROGRAMMES[formation.id];
  const modules: string[] = [];
  for (const l of lecons) {
    const nom = l.moduleNom || '';
    if (nom && !modules.includes(nom)) modules.push(nom);
  }
  return programmeGenerique(formation, modules);
}
