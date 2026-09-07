// Les coffres : miroir exact de functions/src/coffres.ts (PRIX_COFFRES et
// CONTENUS). Le serveur seul tire au sort et débite; ceci sert à afficher les
// prix et, surtout, ce que chaque coffre contient et les chances de chaque lot,
// noir sur blanc, avant l'achat.
export type TypeCoffre = 'bronze' | 'argent' | 'or';

export interface Chance { unSur: number; fr: string; en: string }
export interface ContenuCoffre {
  legendaire: number;                                   // pour cent des cosmétiques qui sont un skin légendaire
  rares: string[];                                      // les skins rares propres à ce coffre (miroir de functions/src/coffres.ts)
  raresFR: string; raresEN: string;                     // les skins rares propres à ce coffre, en mots (tous en circulation)
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
      legendaire: 50, rares: [], raresFR: 'aucun skin rare propre à ce coffre', raresEN: 'no rare skin of its own',
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
    boite: 160, nomFR: 'Coffre d’argent', nomEN: 'Silver chest',
    image: '/compte/coffres/argent.webp', teinte: '#9AA3AD', teinteClaire: '#DDE3E8', teinteSombre: '#4B535B',
    contenu: {
      legendaire: 65, rares: ['skin-lotus', 'skin-feminite', 'skin-nature', 'skin-teal-orange'],
      raresFR: 'les skins Lotus, Féminité, Nature et Sarcelle & Orange', raresEN: 'the Lotus, Féminité, Nature and Teal & Orange skins',
      niskas: [{ montant: 30, poids: 50 }, { montant: 70, poids: 30 }, { montant: 150, poids: 15 }, { montant: 300, poids: 5 }],
      rabais: [
        { unSur: 20, fr: '10 % sur la boutique', en: '10% off the shop' },
        { unSur: 40, fr: '20 % sur la boutique', en: '20% off the shop' },
        { unSur: 200, fr: '50 % sur la boutique', en: '50% off the shop' },
        // Le rabais huile a été retiré (Alex, 7 septembre 2026) : voir
        // functions/src/coffres.ts, le miroir exact de ce fichier.
      ],
      grandLot: { unSur: 400, fr: 'Le Foyer d’Origine, offert (497 $)', en: 'The Origine Hearth, on us ($497)' },
    },
  },
  or: {
    boite: 420, nomFR: 'Coffre d’or', nomEN: 'Gold chest',
    image: '/compte/coffres/or.webp', teinte: '#C9A052', teinteClaire: '#F3DFA2', teinteSombre: '#7A5C22',
    contenu: {
      legendaire: 80, rares: ['skin-aurore', 'skin-or-pur', 'skin-golden-hour'],
      raresFR: 'les skins Aurore, Or pur et Heure dorée', raresEN: 'the Aurora, Pure Gold and Golden Hour skins',
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
export const NISKAS_MUSIQUE_DEJA = 6; // la musique vaut 5 niskas : valeur plus 5 %, arrondie au niska supérieur
// La clé est unique, un seul prix, elle ouvre n'importe quel coffre.
export const PRIX_CLE = 10;

/** « 1 chance sur 50 ». */
export const chanceLisible = (unSur: number, lang: 'FR' | 'EN' | string = 'FR'): string =>
  lang === 'EN' ? `1 in ${unSur}` : `1 chance sur ${unSur}`;

// ─── Ce que la ligne « Ce que le coffre contient » raconte, honnêtement ──────
// `raresFR`/`raresEN` ci-dessus décrivent le coffre à pleine circulation.
// Une skin en travail (settings/skins, pointsConfig.ts) ne s'y tire plus : le
// texte se recalcule donc à partir de ce qui reste vraiment disponible.
export const LEGENDAIRES_IDS = ['skin-vata', 'skin-pitta', 'skin-kapha'];
const NOMS_COURTS: Record<string, { fr: string; en: string }> = {
  'skin-vata': { fr: 'Vata', en: 'Vata' }, 'skin-pitta': { fr: 'Pitta', en: 'Pitta' }, 'skin-kapha': { fr: 'Kapha', en: 'Kapha' },
  'skin-lotus': { fr: 'Lotus', en: 'Lotus' }, 'skin-feminite': { fr: 'Féminité', en: 'Féminité' }, 'skin-nature': { fr: 'Nature', en: 'Nature' },
  'skin-teal-orange': { fr: 'Sarcelle & Orange', en: 'Teal & Orange' },
  'skin-aurore': { fr: 'Aurore', en: 'Aurora' }, 'skin-or-pur': { fr: 'Or pur', en: 'Pure Gold' }, 'skin-golden-hour': { fr: 'Heure dorée', en: 'Golden Hour' },
};
const listeMots = (mots: string[], lang: 'FR' | 'EN', conjonction: 'et' | 'ou' = 'et'): string => {
  if (mots.length <= 1) return mots[0] || '';
  const sep = lang === 'EN' ? (conjonction === 'ou' ? ' or ' : ' and ') : (conjonction === 'ou' ? ' ou ' : ' et ');
  return `${mots.slice(0, -1).join(', ')}${sep}${mots[mots.length - 1]}`;
};

/** La phrase « Un skin ou une bannière que vous n'avez pas encore, dont X %... », les skins en travail retirées. */
export function texteCosmetique(type: TypeCoffre, enTravail: ReadonlySet<string>, lang: 'FR' | 'EN' = 'FR'): string {
  const c = COFFRES[type].contenu;
  const legendaires = LEGENDAIRES_IDS.filter((id) => !enTravail.has(id));
  const rares = c.rares.filter((id) => !enTravail.has(id));
  const nom = (id: string) => NOMS_COURTS[id]?.[lang === 'EN' ? 'en' : 'fr'] || id;
  const clauseLegendaire = legendaires.length
    ? (lang === 'EN' ? `, with a ${c.legendaire}% chance it is legendary (${listeMots(legendaires.map(nom), 'EN', 'ou')})`
                      : `, dont ${c.legendaire} % de chances qu’il soit légendaire (${listeMots(legendaires.map(nom), 'FR', 'ou')})`)
    : '';
  const nomsRares = rares.map(nom);
  const texteRares = rares.length
    ? (lang === 'EN' ? `otherwise the ${listeMots(nomsRares, 'EN')} skin${rares.length > 1 ? 's' : ''}, then the common ones.`
                      : `sinon ${rares.length > 1 ? 'les skins' : 'le skin'} ${listeMots(nomsRares, 'FR')}, puis les communs.`)
    : (lang === 'EN' ? 'otherwise a common one.' : 'sinon un commun.');
  return lang === 'EN'
    ? `A skin or banner you do not own yet${clauseLegendaire}; ${texteRares}`
    : `Un skin ou une bannière que vous n’avez pas encore${clauseLegendaire}; ${texteRares}`;
}
