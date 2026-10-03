// Le noyau pur du programme des ambassadrices (aucun import Firebase ici
// exprès : se teste sans Firestore, voir le bas du fichier). La version qui
// touche Firestore vit dans ambassadrices.ts.
//
// Le modèle est celui du programme partenaire de Vexel : chaque ambassadrice
// dispose d'une PART (en % du prix), qu'elle répartit elle-même entre le
// rabais de sa cliente et sa propre commission. Rabais = part entière : elle
// donne tout à sa cliente et ne touche rien.

export const PART_DEFAUT = 20;          // 10 % de commission + 10 % de rabais
export const PART_PREMIUM_DEFAUT = 30;  // 20 % de commission + 10 % de rabais
export const RABAIS_DEFAUT = 10;
export const PAS = 5;
export const PART_MAX = 60;

export interface Ambassadrice { premium?: boolean; part?: number | null; rabaisClient?: number | null; actif?: boolean }

const borner = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const auPas = (n: number) => Math.round(n / PAS) * PAS;

/** La part totale d'une ambassadrice : son réglage personnel s'il existe
 *  (posé par l'admin), sinon le défaut de son rang. */
export function partDe(a: Ambassadrice, partPremium: number = PART_PREMIUM_DEFAUT): number {
  const brut = typeof a.part === 'number' ? a.part : a.premium ? partPremium : PART_DEFAUT;
  return borner(auPas(Number(brut) || 0), 0, PART_MAX);
}

/** Le rabais offert à la cliente, ramené au pas et jamais au-dessus de la part. */
export function rabaisDe(a: Ambassadrice, partPremium?: number): number {
  const part = partDe(a, partPremium);
  const voulu = typeof a.rabaisClient === 'number' ? a.rabaisClient : RABAIS_DEFAUT;
  return borner(auPas(Number(voulu) || 0), 0, part);
}

/** Ce qui reste à l'ambassadrice une fois le rabais donné. */
export function commissionDe(a: Ambassadrice, partPremium?: number): number {
  return partDe(a, partPremium) - rabaisDe(a, partPremium);
}

/** Le prix après rabais, en cents (jamais sous le minimum de 50 cents de Stripe). */
export function prixReduitCents(prixCents: number, rabaisPct: number): number {
  return Math.max(50, Math.round(prixCents * (100 - rabaisPct) / 100));
}

/** La commission, en cents, sur le montant réellement payé hors taxes. */
export function commissionCents(payeHTCents: number, commissionPct: number): number {
  return Math.max(0, Math.round(payeHTCents * commissionPct / 100));
}

// Vérification : npm --prefix functions run build && node functions/lib/ambassadricesRegles.js
if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const assert = require('assert');
  assert.equal(partDe({}), 20);
  assert.equal(rabaisDe({}), 10);
  assert.equal(commissionDe({}), 10);
  assert.equal(commissionDe({ premium: true }), 20);
  assert.equal(commissionDe({ premium: true }, 40), 30);
  assert.equal(commissionDe({ premium: true, part: 25 }), 15);
  assert.equal(commissionDe({ rabaisClient: 20 }), 0);          // tout à la cliente
  assert.equal(rabaisDe({ rabaisClient: 95 }), 20);             // jamais plus que la part
  assert.equal(rabaisDe({ rabaisClient: -5 }), 0);
  assert.equal(rabaisDe({ rabaisClient: 12 }), 10);             // ramené au pas
  assert.equal(partDe({ part: 500 }), PART_MAX);
  assert.equal(prixReduitCents(9700, 10), 8730);
  assert.equal(prixReduitCents(100, 60), 50);
  assert.equal(commissionCents(8730, 10), 873);
  assert.equal(commissionCents(8730, 0), 0);
  console.log('ambassadricesRegles : tout passe');
}
