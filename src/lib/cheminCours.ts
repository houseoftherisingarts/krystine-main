// Les adresses des cours, sans jamais nommer Kajabi (Alex, 10 septembre 2026 :
// « on importe de Kajabi, mais on ne devrait pas les nommer »). Les documents
// Firestore gardent leur identifiant d'import, parce que les achats, les
// progressions et les leçons y sont rattachés; seule l'adresse change.
// Un cours sans entrée ici garde son identifiant comme adresse.

const SLUGS: Record<string, string> = {
  'kajabi-2148687644': 'vata',
  'kajabi-2149362090': 'sante-parfaite',
};

const IDS: Record<string, string> = Object.fromEntries(Object.entries(SLUGS).map(([id, s]) => [s, id]));

/** L'adresse publique d'un cours : /cours/vata plutôt que /cours/kajabi-… */
export const cheminCours = (id: string, suffixe = ''): string => `/cours/${SLUGS[id] || id}${suffixe}`;

/** L'identifiant Firestore derrière ce qui est écrit dans l'adresse. */
export const idDeCours = (slugOuId: string): string => IDS[slugOuId] || slugOuId;

/** Vrai quand l'adresse porte encore un identifiant d'import qui a un slug. */
export const adresseADemenager = (slugOuId: string): boolean => slugOuId in SLUGS;
