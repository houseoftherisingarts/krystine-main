// L'offre VATA Essentiel, en un seul endroit : la page de vente /vata et la
// carte de /formations lisent le même prix et la même date de lancement.

// Le tarif de lancement tient jusqu'au 1er novembre 2026 inclus (Krystine,
// 30 sept. 2026), puis la page affiche 497 $ sans prix barré. La fonction de
// paiement bascule à la même minute (functions/src/paiements.ts).
export const FIN_LANCEMENT = new Date('2026-11-02T04:00:00Z');
export const enLancement = () => Date.now() < FIN_LANCEMENT.getTime();

export const TIERS = [
  {
    name: 'VATA Essentiel', price: '497 $', promo: '397 $', plan: '',
    intro: 'Un chemin clair, semaine après semaine, pour apaiser le mental, un sens à la fois.',
    features: [
      '16 capsules audio, 4 h 12 min d\'écoute avec Krystine · valeur 800 $',
      '7 méditations guidées · valeur 210 $',
      'Le chemin des cinq sens : une introduction et 7 semaines qui s\'ouvrent une à une',
      '19 soins pour apaiser Vata, fruits d\'années de recherche',
      'Le journal de bord et d\'observation, et un petit boni d\'observation chaque semaine',
      'Les capsules plantes, épices et aliments de saison',
      'Le guide complet de 204 pages, offert à la fin du parcours · valeur 150 $',
      'Un accès d\'au moins trois ans à tout ce qui s\'est ouvert',
    ],
    recommended: false,
  },
];
