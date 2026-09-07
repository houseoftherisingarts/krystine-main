// Le noyau pur de la règle « accès à vie » du parrainage (aucun import
// Firebase ici exprès : se teste sans Firestore ni identifiants). La
// version qui touche Firestore vit dans parrainage.ts (verifierSeuilAccesVie).

export const SEUIL_ACCES_VIE_CENTS = 10000; // 100 $ CA, hors taxes
export const SEUIL_ACCES_VIE_FILLEULES = 20;

/** Une filleule compte quand ses vraies ventes Stripe, hors taxes, en cents,
 *  atteignent le seuil (jamais un cadeau, jamais un achat en niskas). */
export function filleuleCompte(totalCentsHT: number): boolean {
  return totalCentsHT >= SEUIL_ACCES_VIE_CENTS;
}

/** Étant donné le total hors taxes (cents) de chaque filleule d'une
 *  marraine, l'accès à vie est-il atteint ? */
export function accesVieAtteint(totauxCentsHT: number[]): boolean {
  return totauxCentsHT.filter(filleuleCompte).length >= SEUIL_ACCES_VIE_FILLEULES;
}
