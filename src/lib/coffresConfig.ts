// Les coffres : miroir exact de functions/src/coffres.ts (PRIX_COFFRES et
// CONTENUS). Le serveur seul tire au sort et débite; ceci sert à afficher les
// prix et, surtout, ce que chaque coffre contient et les chances de chaque lot,
// noir sur blanc, avant l'achat.
export type TypeCoffre = 'bronze' | 'argent' | 'or';

export interface Chance { unSur: number; fr: string; en: string }
export interface ContenuCoffre {
  legendaire: number;                                   // pour cent des cosmétiques qui sont un skin légendaire
  raresFR: string; raresEN: string;                     // les skins rares propres à ce coffre, en mots
  niskas: Array<{ montant: number; poids: number }>;    // toujours un montant (poids en pour cent)
  rabais: Chance[];
  grandLot: Chance | null;
}

export const COFFRES: Record<TypeCoffre, {
  boite: number; nomFR: string; nomEN: string;
  image: string; teinte: string; teinteClaire: string; teinteSombre: string; contenu: ContenuCoffre;
}> = {
  bronze: {
    boite: 60, nomFR: 'Coffre de bronze', nomEN: 'Bronze chest',
    image: '/compte/coffres/bronze.webp', teinte: '#B0703F', teinteClaire: '#DCA678', teinteSombre: '#5E3A1E',
    contenu: {
      legendaire: 50, raresFR: 'aucun skin rare propre à ce coffre', raresEN: 'no rare skin of its own',
      niskas: [{ montant: 10, poids: 55 }, { montant: 25, poids: 30 }, { montant: 60, poids: 12 }, { montant: 120, poids: 3 }],
      rabais: [
        { unSur: 50, fr: '10 % sur la boutique', en: '10% off the shop' },
        { unSur: 100, fr: '20 % sur la boutique', en: '20% off the shop' },
        { unSur: 500, fr: '50 % sur la boutique', en: '50% off the shop' },
      ],
      grandLot: null,
    },
  },
  argent: {
    boite: 160, cle: 20, nomFR: 'Coffre d’argent', nomEN: 'Silver chest', cleFR: 'Clé d’argent', cleEN: 'Silver key',
    image: '/compte/coffres/argent.webp', teinte: '#9AA3AD', teinteClaire: '#DDE3E8', teinteSombre: '#4B535B',
    contenu: {
      legendaire: 65, raresFR: 'les skins Lotus, Féminité et Nature', raresEN: 'the Lotus, Féminité and Nature skins',
      niskas: [{ montant: 30, poids: 50 }, { montant: 70, poids: 30 }, { montant: 150, poids: 15 }, { montant: 300, poids: 5 }],
      rabais: [
        { unSur: 20, fr: '10 % sur la boutique', en: '10% off the shop' },
        { unSur: 40, fr: '20 % sur la boutique', en: '20% off the shop' },
        { unSur: 200, fr: '50 % sur la boutique', en: '50% off the shop' },
        { unSur: 25, fr: '15 % sur les Huiles Corporelles', en: '15% off the Body Oils' },
      ],
      grandLot: { unSur: 400, fr: 'Le Foyer d’Origine, offert (497 $)', en: 'The Origine Hearth, on us ($497)' },
    },
  },
  or: {
    boite: 420, cle: 30, nomFR: 'Coffre d’or', nomEN: 'Gold chest', cleFR: 'Clé d’or', cleEN: 'Gold key',
    image: '/compte/coffres/or.webp', teinte: '#C9A052', teinteClaire: '#F3DFA2', teinteSombre: '#7A5C22',
    contenu: {
      legendaire: 80, raresFR: 'les skins Aurore et Or pur', raresEN: 'the Aurora and Pure Gold skins',
      niskas: [{ montant: 80, poids: 45 }, { montant: 180, poids: 30 }, { montant: 400, poids: 18 }, { montant: 800, poids: 7 }],
      rabais: [
        { unSur: 8, fr: '10 % sur la boutique', en: '10% off the shop' },
        { unSur: 15, fr: '20 % sur la boutique', en: '20% off the shop' },
        { unSur: 60, fr: '50 % sur la boutique', en: '50% off the shop' },
        { unSur: 12, fr: '50 $ sur une formation', en: '$50 off a program' },
      ],
      grandLot: { unSur: 89, fr: 'Le Foyer d’Origine, offert (497 $)', en: 'The Origine Hearth, on us ($497)' },
    },
  },
};

export const ORDRE_COFFRES: TypeCoffre[] = ['bronze', 'argent', 'or'];
export const OUVERTURES_PAR_JOUR = 5;
export const NISKAS_MUSIQUE_DEJA = 10;

/** « 1 chance sur 50 ». */
export const chanceLisible = (unSur: number, lang: 'FR' | 'EN' | string = 'FR'): string =>
  lang === 'EN' ? `1 in ${unSur}` : `1 chance sur ${unSur}`;
