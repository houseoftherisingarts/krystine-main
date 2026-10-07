// « Mes formations » rangé en rayons, dans l'ordre de priorité choisi par
// Krystine (7 oct. 2026) : Origine au cœur, puis les saisons, les parcours
// courts, la bibliothèque. Les cohortes passées, doublons, essais et le Foyer
// en dormance vont aux archives, que seule une administratrice voit.
// L'ordre des ids dans chaque rayon est l'ordre d'affichage. Un id absent
// de toutes les listes tombe dans « Masterclass et parcours courts », à la fin.

export type CleRayon = 'origine' | 'saisons' | 'parcours' | 'bibliotheque' | 'archives';

export const RAYONS: { cle: CleRayon; fr: string; en: string; ids: string[] }[] = [
  { cle: 'origine', fr: 'Expérience Origine', en: 'Expérience Origine', ids: [
    'origine2', 'kajabi-2149503901', 'kajabi-2149348838', 'kajabi-2149386709', 'kajabi-2149362766',
  ] },
  { cle: 'saisons', fr: 'Les saisons de l’Ayurveda', en: 'The seasons of Ayurveda', ids: [
    'kajabi-2148687644', 'kajabi-2148727800', 'kajabi-2148727800-bonis', 'kajabi-2148740714',
    'kajabi-2148698908', 'kajabi-2149054844', 'kajabi-2148864751',
  ] },
  { cle: 'parcours', fr: 'Masterclass et parcours courts', en: 'Masterclasses and short paths', ids: [
    'rituels-vivants', 'kajabi-2149362090', 'kajabi-2148932239', 'kajabi-2148922546', 'kajabi-2148972835',
    'kajabi-2149150558', 'kajabi-2149159228', 'masterclass-gestion-stress', 'calendrier-avent',
  ] },
  { cle: 'bibliotheque', fr: 'La bibliothèque', en: 'The library', ids: [
    'extrait-5-elements', 'kajabi-2149282046', 'kajabi-2148754050',
  ] },
  { cle: 'archives', fr: 'Archives', en: 'Archives', ids: [
    'kajabi-2148879698', 'kajabi-2148888024', 'kajabi-2148897979', 'kajabi-2148898635', 'kajabi-2148886464',
    'foyer', 'kajabi-2148886410',
  ] },
];

/** Le rayon d'une formation et son rang dans ce rayon. */
export function placeDe(id: string): { cle: CleRayon; rang: number } {
  for (const r of RAYONS) {
    const i = r.ids.indexOf(id);
    if (i >= 0) return { cle: r.cle, rang: i };
  }
  return { cle: 'parcours', rang: 999 };
}
