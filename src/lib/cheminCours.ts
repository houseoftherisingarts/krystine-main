// Les adresses des cours, sans jamais nommer Kajabi (Alex, 10 septembre 2026 :
// « on importe de Kajabi, mais on ne devrait pas les nommer »). Les documents
// Firestore gardent leur identifiant d'import, parce que les achats, les
// progressions et les leçons y sont rattachés; seule l'adresse change.
// Un cours sans entrée ici garde son identifiant comme adresse.

const SLUGS: Record<string, string> = {
  'kajabi-2148687644': 'vata',
  'kajabi-2149362090': 'sante-parfaite',
  'kajabi-2148698908': 'pitta-3-jours',
  'kajabi-2148727800': 'abondance-vata',
  'kajabi-2148727800-bonis': 'abondance-vata-ateliers',
  'kajabi-2148740714': 'cercle-avance-vata',
  'kajabi-2148754050': 'sante-la-vie',
  'kajabi-2148864751': 'kapha',
  'kajabi-2148879698': 'sante-parfaite-prelancement',
  'kajabi-2148886410': 'communaute',
  'kajabi-2148886464': 'sante-parfaite-essai',
  'kajabi-2148888024': 'sante-parfaite-cohorte-fevrier-mars',
  'kajabi-2148897979': 'sante-parfaite-masterclass-1',
  'kajabi-2148898635': 'sante-parfaite-masterclass',
  'kajabi-2148922546': '5-rituels',
  'kajabi-2148932239': 'vitalite-et-clarte',
  'kajabi-2148972835': 'ayurveda-boussole',
  'kajabi-2149054844': 'pitta-estivale-2025',
  'kajabi-2149150558': 'dharma',
  'kajabi-2149159228': 'revenir-a-l-essentiel',
  'kajabi-2149282046': 'grande-bibliotheque',
  'kajabi-2149348838': 'origine-fondatrice',
  'kajabi-2149362766': 'origine-musique',
  'kajabi-2149386709': 'dimanches-d-origine',
  'kajabi-2149503901': 'origine-2',
};

const IDS: Record<string, string> = Object.fromEntries(Object.entries(SLUGS).map(([id, s]) => [s, id]));

/** L'adresse publique d'un cours : /cours/vata plutôt que /cours/kajabi-… */
export const cheminCours = (id: string, suffixe = ''): string => `/cours/${SLUGS[id] || id}${suffixe}`;

/** L'identifiant Firestore derrière ce qui est écrit dans l'adresse. */
export const idDeCours = (slugOuId: string): string => IDS[slugOuId] || slugOuId;

/** Vrai quand l'adresse porte encore un identifiant d'import qui a un slug. */
export const adresseADemenager = (slugOuId: string): boolean => slugOuId in SLUGS;
