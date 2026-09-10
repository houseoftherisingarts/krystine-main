// Les huit semaines de l'Expérience Ayurveda saison Vata, et le sens que
// chacune apprend à refermer. Le programme va du souffle jusqu'à la présence,
// et la page se réchauffe à mesure que les portes se ferment (plan :
// docs/vata-plan-visuel.md).
//
// Le rattachement se fait sur le numéro écrit dans le nom du module Kajabi
// (« SEMAINE 3: APAISER VATA VIA NOS YEUX »), jamais sur le libellé complet :
// la ponctuation change d'un module à l'autre.

export const FORMATION_VATA = 'kajabi-2148687644';

export interface SemaineVata {
  rang: number;          // 0 = la semaine d'introduction
  roman: string;
  sens: { fr: string; en: string };
  promesse: { fr: string; en: string };
  image: string;         // carte portrait 3:4
  bandeau: string;       // tête de chapitre 16:7
  vignette: string;      // 480 px, pour les listes
}

const img = (n: number) => ({
  image: `/vata/semaines/s${n}.webp`,
  bandeau: `/vata/semaines/s${n}-large.webp`,
  vignette: `/vata/semaines/s${n}-thumb.webp`,
});

export const SEMAINES_VATA: SemaineVata[] = [
  {
    rang: 0, roman: '0',
    sens: { fr: 'Le seuil', en: 'The threshold' },
    promesse: {
      fr: 'Poser le sanctuaire avant de ralentir, pour que le corps s’autorise à déposer les armes.',
      en: 'Set the sanctuary before slowing down, so the body finally lets go.',
    },
    ...img(0),
  },
  {
    rang: 1, roman: 'I',
    sens: { fr: 'Le souffle', en: 'The breath' },
    promesse: {
      fr: 'L’air pour calmer l’air, et le geste invisible qui arrête le tourbillon en quelques secondes.',
      en: 'Air to calm air, the invisible gesture that stops the spin in seconds.',
    },
    ...img(1),
  },
  {
    rang: 2, roman: 'II',
    sens: { fr: 'L’ouïe', en: 'Hearing' },
    promesse: {
      fr: 'Fermer les portes de l’écoute pour offrir au système nerveux le silence dont il a soif.',
      en: 'Close the doors of hearing to give the nervous system the silence it craves.',
    },
    ...img(2),
  },
  {
    rang: 3, roman: 'III',
    sens: { fr: 'Le regard', en: 'Sight' },
    promesse: {
      fr: 'Déposer ses yeux, libérer la vision de la fatigue des écrans et retrouver la clarté.',
      en: 'Rest the eyes, free your sight from screen fatigue and recover clarity.',
    },
    ...img(3),
  },
  {
    rang: 4, roman: 'IV',
    sens: { fr: 'L’odorat', en: 'Smell' },
    promesse: {
      fr: 'L’accès direct : une seule inspiration suffit pour changer d’état, par les essences.',
      en: 'The direct route: one breath of essence is enough to change your state.',
    },
    ...img(4),
  },
  {
    rang: 5, roman: 'V',
    sens: { fr: 'Le goût', en: 'Taste' },
    promesse: {
      fr: 'La chaleur intérieure, avec les aliments et les épices qui calment les turbulences.',
      en: 'Inner warmth, with the foods and spices that settle the turbulence.',
    },
    ...img(5),
  },
  {
    rang: 6, roman: 'VI',
    sens: { fr: 'Le toucher', en: 'Touch' },
    promesse: {
      fr: 'Le cocon de soie : l’huile chaude recrée une protection et vous ne vivez plus à vif.',
      en: 'The silk cocoon: warm oil rebuilds a shield so you stop living raw.',
    },
    ...img(6),
  },
  {
    rang: 7, roman: 'VII',
    sens: { fr: 'La présence', en: 'Presence' },
    promesse: {
      fr: 'La force tranquille, et un système d’auto-régulation qui vous appartient pour toujours.',
      en: 'Quiet strength, and a self-regulation system that stays yours for good.',
    },
    ...img(7),
  },
];

/** Le rang de semaine écrit dans un nom de module Kajabi, ou -1. */
export function rangDeModule(nom?: string): number {
  if (!nom) return -1;
  const m = nom.match(/semaine\s*:?\s*(\d+)/i);
  if (!m) return -1;
  const n = Number(m[1]);
  return n >= 0 && n < SEMAINES_VATA.length ? n : -1;
}

export const semaineDeModule = (nom?: string): SemaineVata | undefined =>
  SEMAINES_VATA[rangDeModule(nom)];
