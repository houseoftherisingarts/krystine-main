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
  /** La carte « Par où commencer », au-dessus des modules. */
  accueil?: { titre: { fr: string; en: string }; texte: { fr: string; en: string } };
  /** Sous chaque leçon (par identifiant) : ce qu'elle apprend et le geste du jour. */
  resumes?: Record<string, { apprend: string; geste?: string }>;
  /** La porte vers la suite, sous les leçons nommées. */
  suite?: { lecons: string[]; titre: string; texte: string; bouton: string; lien: string };
}

/** « Module 1 », « Bonus », « Introduction », « Semaine 3 » : la pastille d'un chapitre. */
export function pastilleDe(s: Chapitre, programme: Programme, fr: boolean): string {
  if (s.pastille) return fr ? s.pastille.fr : s.pastille.en;
  if (s.etiquette) return fr ? s.etiquette.fr : s.etiquette.en;
  if (s.rang === 0) return 'Introduction';
  return `${fr ? programme.prefixe.fr : programme.prefixe.en} ${s.rang}`;
}

// ── Rituels essentiels · l'intérieur calqué sur VATA (Krystine, 15 oct. 2026) ──
// Chaque carte porte le picto de la promesse que la cliente a lue en achetant. Les lignes
// sous les capsules sont tirées des transcriptions (coffre, 20_formations).
// Les visuels attendent la maquette de Krystine (15 oct. 2026) : d'ici là, la teinte et le picto.
const RE_CH = { image: '', bandeau: '', vignette: '' };
const RE: Chapitre[] = [
  { rang: 0, roman: 'I', pastille: { fr: 'Module 1', en: 'Module 1' }, picto: 'boussole', sens: { fr: 'L’Ayurveda en bref', en: 'Ayurveda in brief' }, promesse: { fr: 'Retrouver un cap clair grâce à une sagesse ancienne, rendue simple aujourd’hui.', en: 'Find a clear course through an ancient wisdom made simple.' }, couleur: { encre: '#28352F', vive: '#4E6349' }, ...RE_CH },
  { rang: 1, roman: 'II', pastille: { fr: 'Module 2', en: 'Module 2' }, picto: 'coeur', sens: { fr: 'L’automassage', en: 'Self-massage' }, promesse: { fr: 'Apaiser le système nerveux.', en: 'Soothe the nervous system.' }, couleur: { encre: '#8F6526', vive: '#C79A52' }, ...RE_CH },
  { rang: 2, roman: 'III', pastille: { fr: 'Module 3', en: 'Module 3' }, picto: 'souffle', sens: { fr: 'Le nez et la bouche', en: 'Nose and mouth' }, promesse: { fr: 'Respirer mieux et clarifier vos pensées.', en: 'Breathe better and clear your thoughts.' }, couleur: { encre: '#44626D', vive: '#6E93A0' }, ...RE_CH },
  { rang: 3, roman: 'IV', pastille: { fr: 'Module 4', en: 'Module 4' }, picto: 'main', sens: { fr: 'Les mains et les pieds', en: 'Hands and feet' }, promesse: { fr: 'Libérer les tensions accumulées dans les mains et les pieds.', en: 'Release the tension held in hands and feet.' }, couleur: { encre: '#8A4F2C', vive: '#BA7B39' }, ...RE_CH },
  { rang: 4, roman: 'V', etiquette: { fr: 'Bonus', en: 'Bonus' }, picto: 'feuille', sens: { fr: 'Plantes, stress et sagesse', en: 'Plants, stress and wisdom' }, promesse: { fr: 'Le stress, l’insomnie et l’anxiété vus par l’Ayurveda, et les plantes qui apaisent le Vent.', en: 'Stress, insomnia and anxiety through Ayurveda, and the plants that calm the Wind.' }, couleur: { encre: '#4E6349', vive: '#7A9270' }, ...RE_CH },
  { rang: 5, roman: 'VI', etiquette: { fr: 'À télécharger', en: 'Downloads' }, picto: 'livre', sens: { fr: 'Le guide des Rituels essentiels', en: 'The Essential rituals guide' }, promesse: { fr: '14 pages tirées de Nature & Ayurveda, pour garder les gestes sous la main.', en: '14 pages from Nature & Ayurveda, to keep the gestures at hand.' }, couleur: { encre: '#8F6526', vive: '#C79A52' }, ...RE_CH },
];
const RE_CLES: [RegExp, number][] = [[/ayurveda/i, 0], [/automassage/i, 1], [/nez|bouche/i, 2], [/mains|pieds/i, 3], [/plus loin/i, 4], [/t[ée]l[ée]charger/i, 5]];


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
  ['0', { fr: 'Bienvenue', en: 'Welcome' }, { fr: 'Votre espace s’ouvre, et le parcours commence par une tasse chaude et un moment à soi.', en: 'Your space opens, and the journey starts with a warm cup and a moment for yourself.' }],
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
  'rituels-vivants': {
    id: 'rituels-vivants',
    surtitre: { fr: 'Inspirés de l’Ayurveda', en: 'Inspired by Ayurveda' },
    titre: { fr: 'Rituels\nessentiels', en: 'Essential\nrituals' },
    couverture: '/rituels-vivants/seuil.webp',
    duree: { fr: '10 capsules et un bonus', en: '10 capsules and a bonus' },
    chemin: { etiquette: { fr: 'Le parcours', en: 'The path' }, titre: { fr: 'Moins de 5 minutes par jour', en: 'Less than 5 minutes a day' } },
    unite: { fr: ['étape', 'étapes'], en: ['step', 'steps'] },
    prefixe: { fr: 'Module', en: 'Module' },
    chapitres: RE,
    rangDeModule: (nom?: string) => {
      if (!nom) return -1;
      for (const [re, rang] of RE_CLES) if (re.test(nom)) return rang;
      return -1;
    },
    accueil: {
      titre: { fr: 'Par où commencer', en: 'Where to begin' },
      texte: {
        fr: 'Suivez les modules dans l’ordre, à votre rythme. Les trois capsules sur l’Ayurveda posent les bases, puis viennent les gestes, chacun en moins de 5 minutes par jour. Sous chaque capsule, une ligne vous dit ce qu’elle vous apprend et le geste à essayer aujourd’hui.',
        en: 'Follow the modules in order, at your own pace. The three Ayurveda capsules lay the ground, then come the gestures, each in less than 5 minutes a day. Under each capsule, a line tells you what it teaches and the gesture to try today.',
      },
    },
    resumes: {
      '001': { apprend: 'Le parcours de Krystine, des soins intensifs aux plantes médicinales, et ce que veut dire Ayurveda : la science, la sagesse de la vie. Vous êtes unique, et non une moyenne.', geste: 'Observez une journée : ce qui vous fait du bien, et ce qui vous en fait moins.' },
      '002': { apprend: 'La tête, le cœur, le corps et l’esprit ne se séparent pas. Nous portons les mêmes éléments que la nature, et les quatre portes du débalancement : le corps, les émotions, la déconnexion et la surstimulation des sens.', geste: 'Repérez laquelle des quatre portes est la plus ouverte chez vous en ce moment.' },
      '003': { apprend: 'Les cinq éléments, dehors et dedans, et les trois doshas : Vata (Vent et Espace), Pitta (Feu et Eau), Kapha (Eau et Terre). Les saisons de la vie, et pourquoi le corps sait.', geste: 'Faites le quiz du site pour voir quels éléments sont les plus présents en ce moment.' },
      '004': { apprend: 'L’huile se dit sneha, un mot qui veut dire aussi amour. Le bâton sec casse, le bâton huilé plie : ce que l’automassage quotidien fait aux tissus et au système nerveux.', geste: 'Massez-vous les mains et les pieds avec un peu d’huile, quelques minutes.' },
      '005': { apprend: 'En vidéo, le rituel du matin : le brossage à sec, l’huile mêlée à l’eau sous la douche, un massage vigoureux, puis l’eau fraîche. Le rituel du soir est écrit sous la vidéo.', geste: 'Demain matin, essayez le massage vigoureux sous la douche.' },
      '006': { apprend: 'Le massage de la poitrine, pour activer la circulation et éviter la stagnation, avec plein d’amour.', geste: 'Deux à cinq minutes de massage de la poitrine, le matin sous la douche ou le soir.' },
      '007': { apprend: 'L’huile comme lien : le massage à deux, ou l’espace sacré que vous vous créez seule.', geste: 'Massez les mains ou les épaules d’une personne proche, ou les vôtres.' },
      '008': { apprend: 'Le nez, porte du souffle : de 20 000 à 25 000 respirations par jour, l’huile au bout du doigt et la respiration alternée.', geste: 'Deux minutes de respiration alternée, cinq secondes pour inspirer, cinq pour expirer.' },
      '009': { apprend: 'La bouche, porte de la digestion : la langue comme miroir du matin, le gratte-langue en cuivre et le gargarisme à l’huile.', geste: 'Au réveil, regardez la langue dans le miroir, puis grattez-la de cinq à sept fois.' },
      '010': { apprend: 'Masser les mains et les pieds pour déloger les tensions, puis s’enraciner.', geste: 'Ce soir, massez les pieds et gardez des bas de laine pour la nuit.' },
      '011': { apprend: 'Le stress, l’insomnie et l’anxiété vus par l’Ayurveda : trop de Vent, et les plantes qui l’apaisent.' },
      '012': { apprend: 'Le guide de 14 pages, tiré de Nature & Ayurveda : les gestes des capsules, à garder sous la main.' },
    },
    suite: {
      lecons: ['011', '012'],
      titre: 'Pour aller plus loin',
      texte: 'Lorsque le Vent prend trop de place, le mental s’emballe et les nuits se fragmentent. VATA Essentiel prolonge ces gestes, semaine après semaine.',
      bouton: 'Découvrir VATA Essentiel',
      lien: '/vata?via=cours-rituels',
    },
  },
  'kajabi-2148687644': {
    id: 'kajabi-2148687644',
    surtitre: { fr: 'L’Expérience Ayurveda', en: 'The Ayurveda Experience' },
    titre: { fr: 'VATA\nEssentiel', en: 'VATA\nEssential' },
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
    // Aucun dossier d'images pour un programme importé : les cartes se peignent de leur teinte.
    image: '', bandeau: '', vignette: '',
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
