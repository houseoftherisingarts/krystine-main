// Test unitaire local, sans Firestore, du noyau pur de la règle « accès à
// vie » (functions/src/parrainageRegles.ts, compilé dans lib/). Exemples
// donnés par Alex le 7 septembre 2026. `node test-parrainage-acces-vie.mjs`.
import assert from 'node:assert/strict';
import { accesVieAtteint, filleuleCompte, SEUIL_ACCES_VIE_CENTS, SEUIL_ACCES_VIE_FILLEULES } from './lib/parrainageRegles.js';

assert.equal(SEUIL_ACCES_VIE_CENTS, 10000, 'le seuil est cent dollars, en cents');
assert.equal(SEUIL_ACCES_VIE_FILLEULES, 20, 'vingt filleules');

// 19 filleules à 120 $ chacune : toutes comptent, mais il en manque une.
assert.equal(accesVieAtteint(Array(19).fill(12000)), false, '19 filleules à 120 $ ne donne pas accès');

// 20 filleules à exactement 100 $ chacune : accès.
assert.equal(accesVieAtteint(Array(20).fill(10000)), true, '20 filleules à 100 $ donne accès');

// 20 filleules, dont une à seulement 90 $ : cette filleule-là ne compte pas,
// donc il n'y en a que 19 qui comptent réellement : pas d'accès.
assert.equal(accesVieAtteint([...Array(19).fill(10000), 9000]), false, '20 filleules dont une à 90 $ ne donne pas accès (19 qui comptent)');

// filleuleCompte, à la frontière exacte du seuil.
assert.equal(filleuleCompte(9999), false, '99,99 $ ne compte pas');
assert.equal(filleuleCompte(10000), true, '100,00 $ compte');

console.log('OK — test-parrainage-acces-vie : 6 assertions passées.');
