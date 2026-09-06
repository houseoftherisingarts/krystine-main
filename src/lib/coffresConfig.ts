// Les coffres : miroir exact de functions/src/coffres.ts (PRIX_COFFRES et
// TABLES). Le serveur seul tire au sort et débite; ceci sert à afficher les
// prix et, surtout, les chances de chaque lot, noir sur blanc, avant l'achat.
export type TypeCoffre = 'bronze' | 'argent' | 'or';

export interface LotAffiche { poids: number; fr: string; en: string; genre: 'niskas' | 'cosmetique' | 'recompense' | 'grand' }

export const COFFRES: Record<TypeCoffre, { boite: number; cle: number; nomFR: string; nomEN: string; cleFR: string; cleEN: string; teinte: string; teinteClaire: string; teinteSombre: string; lots: LotAffiche[] }> = {
  bronze: {
    boite: 60, cle: 10, nomFR: 'Coffre de bronze', nomEN: 'Bronze chest', cleFR: 'Clé de bronze', cleEN: 'Bronze key',
    teinte: '#B0703F', teinteClaire: '#DCA678', teinteSombre: '#5E3A1E',
    lots: [
      { poids: 50, genre: 'niskas', fr: '20 niskas', en: '20 niskas' },
      { poids: 30, genre: 'niskas', fr: '40 niskas', en: '40 niskas' },
      { poids: 12, genre: 'cosmetique', fr: 'Un skin ou une bannière', en: 'A skin or a banner' },
      { poids: 7,  genre: 'niskas', fr: '100 niskas', en: '100 niskas' },
      { poids: 1,  genre: 'recompense', fr: '10 % sur la boutique', en: '10% off the shop' },
    ],
  },
  argent: {
    boite: 160, cle: 20, nomFR: 'Coffre d’argent', nomEN: 'Silver chest', cleFR: 'Clé d’argent', cleEN: 'Silver key',
    teinte: '#9AA3AD', teinteClaire: '#DDE3E8', teinteSombre: '#4B535B',
    lots: [
      { poids: 40, genre: 'niskas', fr: '60 niskas', en: '60 niskas' },
      { poids: 28, genre: 'niskas', fr: '120 niskas', en: '120 niskas' },
      { poids: 14, genre: 'recompense', fr: '15 % sur les Huiles Corporelles', en: '15% off the Body Oils' },
      { poids: 9,  genre: 'niskas', fr: '300 niskas', en: '300 niskas' },
      { poids: 8,  genre: 'cosmetique', fr: 'Le skin Lotus (rare, ici seulement)', en: 'The Lotus skin (rare, here only)' },
      { poids: 1,  genre: 'recompense', fr: '10 % sur la boutique', en: '10% off the shop' },
    ],
  },
  or: {
    boite: 420, cle: 30, nomFR: 'Coffre d’or', nomEN: 'Gold chest', cleFR: 'Clé d’or', cleEN: 'Gold key',
    teinte: '#C9A052', teinteClaire: '#F3DFA2', teinteSombre: '#7A5C22',
    lots: [
      { poids: 36, genre: 'niskas', fr: '150 niskas', en: '150 niskas' },
      { poids: 28, genre: 'niskas', fr: '300 niskas', en: '300 niskas' },
      { poids: 16, genre: 'recompense', fr: '50 $ sur une formation', en: '$50 off a program' },
      { poids: 10, genre: 'niskas', fr: '750 niskas', en: '750 niskas' },
      { poids: 6,  genre: 'cosmetique', fr: 'Le skin Aurore (rare, ici seulement)', en: 'The Aurora skin (rare, here only)' },
      { poids: 2,  genre: 'cosmetique', fr: 'Le skin Or pur (légendaire)', en: 'The Pure Gold skin (legendary)' },
      { poids: 2,  genre: 'grand', fr: 'Le Foyer d’Origine, offert (497 $)', en: 'The Origine Hearth, on us ($497)' },
    ],
  },
};

export const ORDRE_COFFRES: TypeCoffre[] = ['bronze', 'argent', 'or'];
export const OUVERTURES_PAR_JOUR = 5;

/** « 1 chance sur 50 » pour 2 %, « 12 % » sinon. */
export function chanceLisible(poids: number, lang: 'FR' | 'EN' | string = 'FR'): string {
  if (poids <= 5 && 100 % poids === 0) return lang === 'EN' ? `1 in ${100 / poids}` : `1 chance sur ${100 / poids}`;
  return `${poids} %`;
}
