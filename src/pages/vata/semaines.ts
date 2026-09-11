// Les huit semaines de l'Expérience Ayurveda saison Vata, et une porte de la
// perception à ouvrir par semaine, du souffle jusqu'à la présence. La page se
// réchauffe à mesure que les portes s'ouvrent (plan :
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
  /** La teinte de la semaine, tirée du canon de Krystine. Le parcours va du
   *  froid de l'ardoise au laiton chaud, comme la perception qui s'éclaircit.
   *  `encre` se lit sur le crème, `vive` sert de pastille, de liseré et de
   *  barre, et se lit sur les fonds sombres. */
  couleur: { encre: string; vive: string };
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
    couleur: { encre: '#4F5C58', vive: '#7A8A85' },
    ...img(0),
  },
  {
    rang: 1, roman: 'I',
    sens: { fr: 'Le souffle', en: 'The breath' },
    promesse: {
      fr: 'L’air pour calmer l’air, et le geste invisible qui arrête le tourbillon en quelques secondes.',
      en: 'Air to calm air, the invisible gesture that stops the spin in seconds.',
    },
    couleur: { encre: '#44626D', vive: '#6E93A0' },
    ...img(1),
  },
  {
    rang: 2, roman: 'II',
    sens: { fr: 'L’ouïe', en: 'Hearing' },
    promesse: {
      fr: 'Ouvrir l’écoute au silence dont le système nerveux a soif, et faire taire le bruit qui l’envahit.',
      en: 'Open your hearing to the silence the nervous system craves, and quiet the noise that floods it.',
    },
    couleur: { encre: '#4E6349', vive: '#7A9270' },
    ...img(2),
  },
  {
    rang: 3, roman: 'III',
    sens: { fr: 'Le regard', en: 'Sight' },
    promesse: {
      fr: 'Déposer ses yeux, libérer la vision de la fatigue des écrans et retrouver la clarté.',
      en: 'Rest the eyes, free your sight from screen fatigue and recover clarity.',
    },
    couleur: { encre: '#3B4F63', vive: '#6A87A3' },
    ...img(3),
  },
  {
    rang: 4, roman: 'IV',
    sens: { fr: 'L’odorat', en: 'Smell' },
    promesse: {
      fr: 'L’accès direct : une seule inspiration suffit pour changer d’état, par les essences.',
      en: 'The direct route: one breath of essence is enough to change your state.',
    },
    couleur: { encre: '#6A6B41', vive: '#9BA067' },
    ...img(4),
  },
  {
    rang: 5, roman: 'V',
    sens: { fr: 'Le goût', en: 'Taste' },
    promesse: {
      fr: 'La chaleur intérieure, avec les aliments et les épices qui calment les turbulences.',
      en: 'Inner warmth, with the foods and spices that settle the turbulence.',
    },
    couleur: { encre: '#8F6526', vive: '#C79A52' },
    ...img(5),
  },
  {
    rang: 6, roman: 'VI',
    sens: { fr: 'Le toucher', en: 'Touch' },
    promesse: {
      fr: 'Le cocon de soie : l’huile chaude recrée une protection et vous ne vivez plus à vif.',
      en: 'The silk cocoon: warm oil rebuilds a shield so you stop living raw.',
    },
    couleur: { encre: '#8A4F2C', vive: '#BA7B39' },
    ...img(6),
  },
  {
    rang: 7, roman: 'VII',
    sens: { fr: 'La présence', en: 'Presence' },
    promesse: {
      fr: 'La force tranquille, et un système d’auto-régulation qui vous appartient pour toujours.',
      en: 'Quiet strength, and a self-regulation system that stays yours for good.',
    },
    couleur: { encre: '#7A3D26', vive: '#A9663C' },
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
