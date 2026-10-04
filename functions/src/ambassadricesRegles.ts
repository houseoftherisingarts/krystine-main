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

// ─── Les gardes du programme (4 oct. 2026) ──────────────────────────────────
// Un compte plus vieux que ça au moment du rattachement n'est pas une
// inscription par le code : ni rabais ni commission (même règle que le
// parrainage, mais vérifiée ici, que le module Parrainage soit ouvert ou non).
export const COMPTE_NEUF_MS = 48 * 60 * 60 * 1000;
// La garantie cœur léger : remboursée dans les 15 jours suivant l'achat. La
// commission reste « en-attente » jusque-là, puis devient « due ».
export const GARANTIE_JOURS = 15;
// La cadence de versement par défaut (settings/ambassadrices.cadenceJours).
// Affichage seulement : rien n'est versé automatiquement.
export const CADENCE_DEFAUT_JOURS = 60;
const JOUR_MS = 24 * 60 * 60 * 1000;

/** Une filiation tient si le compte avait au plus 48 h au rattachement et
 *  qu'aucune vraie vente ne l'a précédé. */
export function filiationRecevable(compteCreeMs: number, filiationMs: number, achatAvant: boolean): boolean {
  return !achatAvant && Number.isFinite(compteCreeMs) && filiationMs - compteCreeMs <= COMPTE_NEUF_MS;
}

/** Une adresse ramenée à sa personne : minuscules, sans « +étiquette », et
 *  sans les points d'une adresse Gmail (Gmail les ignore). */
export function courrielNormalise(adresse: string | null | undefined): string {
  const [local = '', domaine = ''] = String(adresse || '').trim().toLowerCase().split('@');
  if (!local || !domaine) return '';
  const base = local.split('+')[0];
  const gmail = domaine === 'gmail.com' || domaine === 'googlemail.com';
  return `${gmail ? base.replace(/\./g, '') : base}@${gmail ? 'gmail.com' : domaine}`;
}

/** Le moment où une commission devient due : jamais avant la fin de la
 *  garantie de l'achat, jamais avant que le paiement soit reçu. */
export function echeanceCommission(payeLeMs: number, debutAchatMs: number): number {
  return Math.max(payeLeMs, debutAchatMs + GARANTIE_JOURS * JOUR_MS);
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
  const h = 60 * 60 * 1000;
  assert.equal(filiationRecevable(0, 47 * h, false), true);
  assert.equal(filiationRecevable(0, 49 * h, false), false);   // compte trop ancien
  assert.equal(filiationRecevable(0, 1 * h, true), false);     // un achat avant le rattachement
  assert.equal(filiationRecevable(NaN, 0, false), false);
  assert.equal(courrielNormalise('Ma.Rie+vata@GMail.com'), 'marie@gmail.com');
  assert.equal(courrielNormalise('ma.rie+x@exemple.ca'), 'ma.rie@exemple.ca');
  assert.equal(courrielNormalise(''), '');
  assert.equal(echeanceCommission(0, 0), 15 * 24 * h);
  assert.equal(echeanceCommission(40 * 24 * h, 0), 40 * 24 * h);
  console.log('ambassadricesRegles : tout passe');
}
