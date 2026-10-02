// La règle des versements (décision de Krystine, 30 septembre 2026).
// Source unique : ce fichier a une copie identique côté serveur,
// functions/src/versements.ts. Toute retouche se fait dans les deux.
//
// - moins de 200 $ : un seul paiement;
// - de 200 $ à 499 $ : un paiement, ou trois versements (+10 %);
// - 500 $ et plus : un paiement, trois versements (+10 %) ou six (+15 %).
// Chaque versement est arrondi au dollar supérieur.

export const FORMATION_VATA_ID = 'kajabi-2148687644';

/** Le prix en vigueur d'une formation, en dollars entiers. Vata : le tarif de
 *  lancement (prix de la fiche) tient jusqu'au 1er novembre 2026 inclus, puis
 *  le prix régulier de 497 $ s'applique tout seul. */
export function prixEnVigueur(formationId: string, prixFiche: number, maintenant = Date.now()): number {
  if (formationId === FORMATION_VATA_ID && maintenant >= Date.parse('2026-11-02T04:00:00Z')) return 497;
  return prixFiche;
}

/** L'interrupteur : fermé tant que les événements Stripe (invoice.paid,
 *  customer.subscription.updated et .deleted) ne sont pas cochés sur le webhook
 *  et qu'un achat test en 3 versements n'a pas réussi. Sinon l'abonnement ne
 *  s'arrêterait jamais. À ouvrir dans les DEUX fichiers. */
export const VERSEMENTS_OUVERTS = true; // ouvert le 2 oct. 2026 : webhook à 4 événements vérifié avec Krystine

/** Les nombres de versements permis pour ce prix. */
export function versementsPermis(prix: number): number[] {
  if (!VERSEMENTS_OUVERTS) return [1];
  // ACHAT TEST (2 oct. 2026) : à un prix symbolique (5 $ ou moins), les trois
  // versements restent offerts pour vérifier l'abonnement. À retirer avec le test.
  if (prix > 0 && prix <= 5) return [1, 3];
  if (prix >= 500) return [1, 3, 6];
  if (prix >= 200) return [1, 3];
  return [1];
}

/** Le montant d'un versement, en dollars entiers (le prix entier quand n = 1). */
export function montantVersement(prix: number, n: number): number {
  // En entiers (110/300, 115/600) : 300 × 1,10 en virgule flottante donne
  // 330,00000000000006, qui s'arrondirait à tort au dollar suivant.
  if (n === 3) return Math.ceil((prix * 110) / 300);
  if (n === 6) return Math.ceil((prix * 115) / 600);
  return prix;
}
