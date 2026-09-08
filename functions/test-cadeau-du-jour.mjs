// Test unitaire local, sans réseau ni serveur, de la mécanique pure du
// cadeau du jour (functions/src/badgeBleuConfig.ts, compilé dans lib/).
// `node test-cadeau-du-jour.mjs`.
import assert from 'node:assert/strict';
import { calculerCadeauDuJour, verifierCadeauDuJour, CADEAUX_JOUR_BANNIERES, NISKAS_CADEAU_JOUR, NISKAS_CADEAU_JOUR_TARDIF } from './lib/badgeBleuConfig.js';

// L'auto-test du module ne lève pas.
verifierCadeauDuJour();

// Le jeu de tests exact d'Alex : jours 1, 6, 7, 14, 49, 50, 56.
const c1 = calculerCadeauDuJour(1);
assert.equal(c1.type, 'niskas'); assert.equal(c1.montant, NISKAS_CADEAU_JOUR); assert.equal(c1.position, 1);

const c6 = calculerCadeauDuJour(6);
assert.equal(c6.type, 'niskas'); assert.equal(c6.montant, NISKAS_CADEAU_JOUR); assert.equal(c6.position, 6);

const c7 = calculerCadeauDuJour(7);
assert.equal(c7.type, 'banniere'); assert.equal(c7.cle, 'aube'); assert.equal(c7.position, 7);

const c14 = calculerCadeauDuJour(14);
assert.equal(c14.type, 'banniere'); assert.equal(c14.cle, 'sousbois'); assert.equal(c14.position, 7);

const c49 = calculerCadeauDuJour(49);
assert.equal(c49.type, 'banniere'); assert.equal(c49.cle, 'neige'); assert.equal(c49.position, 7);

const c50 = calculerCadeauDuJour(50);
assert.equal(c50.type, 'niskas'); assert.equal(c50.montant, NISKAS_CADEAU_JOUR); assert.equal(c50.position, 1);

const c56 = calculerCadeauDuJour(56);
assert.equal(c56.type, 'niskas'); assert.equal(c56.montant, NISKAS_CADEAU_JOUR_TARDIF); assert.equal(c56.position, 7);

// Les sept bannières, dans l'ordre exact, une seule fois chacune sur les
// sept premiers cycles.
assert.deepEqual(CADEAUX_JOUR_BANNIERES, ['aube', 'sousbois', 'lavande', 'rivage', 'erables', 'verger', 'neige']);
for (let cycle = 1; cycle <= 7; cycle++) {
  const c = calculerCadeauDuJour(cycle * 7);
  assert.equal(c.type, 'banniere');
  assert.equal(c.cle, CADEAUX_JOUR_BANNIERES[cycle - 1]);
}
// Le huitième cycle (jour 56) ne pointe plus vers une bannière : quinze niskas.
for (const jour of [56, 63, 70]) {
  const c = calculerCadeauDuJour(jour);
  assert.equal(c.type, 'niskas');
  assert.equal(c.montant, NISKAS_CADEAU_JOUR_TARDIF);
}

console.log('OK — test-cadeau-du-jour : 26 assertions passées.');
