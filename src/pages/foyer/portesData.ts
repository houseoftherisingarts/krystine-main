// ─── Les douze portes du Foyer ───────────────────────────────────────────────
// Une porte par mois, du septembre au août du cycle. Données partagées entre
// la page de vente (BodySections) et l'espace exclusif (CoursDetailPage).

export interface Porte {
  n: string;
  mois: string;
  b: [number, number, number, number];
  src: string;
  mouvement: string;
  theme: string;
  question: string;
}

// Les cases de l'image se lisent de haut en bas; octobre occupe la première
// depuis le 6 septembre 2026, septembre la dernière (ordre d'Alex).
export const PORTES: Porte[] = [
  { n: 'octobre', mois: 'Octobre', b: [88, 143, 334, 404], src: 'porte-octobre-cutout', mouvement: 'La nature se dépouille', theme: 'Élaguer pour voir', question: 'Certaines choses prennent de la place longtemps après avoir cessé de nous nourrir.' },
  { n: 'novembre', mois: 'Novembre', b: [333, 128, 577, 404], src: 'porte-novembre-cutout', mouvement: 'La lumière diminue', theme: 'Nourrir ce qui compte', question: 'Tout ce qui nous réchauffe ne nous nourrit pas forcément de la même façon.' },
  { n: 'decembre', mois: 'Décembre', b: [88, 406, 334, 662], src: 'porte-decembre-cutout', mouvement: 'Fin de cycle', theme: 'Choisir ce que l’on emporte', question: 'Tout ne mérite pas de nous suivre dans l’année qui vient.' },
  { n: 'janvier', mois: 'Janvier', b: [333, 406, 577, 662], src: 'porte-janvier-cutout', mouvement: 'Après le trop-plein', theme: 'Recommencer sans se trahir', question: 'Et si recommencer ne demandait pas de devenir quelqu’un d’autre?' },
  { n: 'fevrier', mois: 'Février', b: [88, 641, 334, 907], src: 'porte-fevrier-cutout', mouvement: 'L’hiver est encore là', theme: 'Habiter ce qui est déjà là', question: 'Ce qui nous soutient le plus devient parfois invisible simplement parce qu’il est familier.' },
  { n: 'mars', mois: 'Mars', b: [333, 638, 577, 907], src: 'porte-mars-cutout', mouvement: 'La saison recommence à bouger', theme: 'Réveiller sans brusquer', question: 'Le retour de l’élan n’est pas toujours une invitation à accélérer.' },
  { n: 'avril', mois: 'Avril', b: [1086, 128, 1330, 404], src: 'porte-avril-cutout', mouvement: 'La poussée reprend', theme: 'Choisir ce qui mérite de grandir', question: 'Tout ce qui peut grandir ne mérite pas forcément que nous le nourrissions.' },
  { n: 'mai', mois: 'Mai', b: [1328, 143, 1572, 404], src: 'porte-mai-cutout', mouvement: 'Tout s’ouvre autour de nous', theme: 'Ouvrir sans se disperser', question: 'Quand tout nous attire en même temps, comment reconnaître ce qui mérite réellement notre attention?' },
  { n: 'juin', mois: 'Juin', b: [1086, 408, 1330, 662], src: 'porte-juin-cutout', mouvement: 'La lumière s’étire', theme: 'Recevoir ce qui est là', question: 'Et si, parfois, ce qui est là n’avait besoin de rien de plus?' },
  { n: 'juillet', mois: 'Juillet', b: [1328, 406, 1572, 662], src: 'porte-juillet-cutout', mouvement: 'La saison est abondante', theme: 'Habiter la pleine saison', question: 'Pourquoi avons-nous parfois tant de mal à simplement profiter de ce qui est là?' },
  { n: 'aout', mois: 'Août', b: [1086, 641, 1330, 907], src: 'porte-aout-cutout', mouvement: 'La lumière change déjà', theme: 'Savoir ce que l’on laisse', question: 'Et si avancer demandait parfois moins de décider où aller que de reconnaître ce qui est terminé?' },
  { n: 'septembre', mois: 'Septembre', b: [1328, 638, 1572, 907], src: 'porte-sept-cutout', mouvement: 'Le rythme change', theme: 'Revenir à son propre rythme', question: 'Et si le premier signe que nous allons trop vite n’était pas celui que nous croyons?' },
];

// La porte du mois en cours (0 = janvier … 11 = décembre).
const ORDRE_CIVIL = ['janvier','fevrier','mars','avril','mai','juin','juillet','aout','septembre','octobre','novembre','decembre'];
export function porteDuMois(date = new Date()): Porte {
  // Le cycle ouvre en octobre 2026 (ordre d'Alex du 6 septembre) : avant
  // cette date, la première porte (octobre) est celle qui accueille, et
  // septembre ferme le cycle en 2027.
  if (date < new Date(2026, 9, 1)) return PORTES[0];
  const n = ORDRE_CIVIL[date.getMonth()];
  return PORTES.find(p => p.n === n) || PORTES[0];
}
