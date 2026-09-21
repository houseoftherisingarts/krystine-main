// Les règles de la collection `newsletter`, vérifiées contre l'émulateur.
//
// Lancer :
//   firebase emulators:exec --only firestore "node functions/test/regles-newsletter.mjs"
//
// Ce que le test tient : depuis le 21 septembre 2026, aucun navigateur n'écrit
// dans `newsletter`. Un visiteur anonyme ne peut plus créer de fiche (c'était
// la porte qu'un robot poussait en parlant directement à l'API), une membre
// connectée non plus, et personne d'autre que l'admin ne lit la liste. L'admin
// garde ses quatre droits, parce que l'import CSV, les étiquettes de groupe et
// la quarantaine passent par son navigateur.

import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import {
  initializeTestEnvironment, assertFails, assertSucceeds,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';

const env = await initializeTestEnvironment({
  projectId: 'regles-newsletter',
  firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8') },
});

const anonyme = env.unauthenticatedContext().firestore();
const membre = env.authenticatedContext('membre-1', { email: 'lectrice@example.com' }).firestore();
const admin = env.authenticatedContext('admin-1', { email: 'krystine@inspiratanature.com' }).firestore();

const FICHE = { email: 'test@example.com', status: 'active', source: 'infolettre', tags: ['infolettre'] };

let reussis = 0, rates = 0;
async function cas(nom, fn) {
  try { await fn(); reussis++; console.log(`  ✓ ${nom}`); }
  catch (e) { rates++; console.error(`  ✗ ${nom}\n      ${e.message}`); }
}

// Une fiche déjà en place, posée avec les règles désactivées, pour les
// lectures et les mises à jour.
await env.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), 'newsletter/existante'), { ...FICHE, email: 'deja@example.com' });
});

console.log('\nnewsletter — création');
await cas('un visiteur anonyme ne peut PLUS créer une fiche', () =>
  assertFails(setDoc(doc(anonyme, 'newsletter/robot'), FICHE)));
await cas('un visiteur anonyme ne peut pas créer même avec tous les champs', () =>
  assertFails(setDoc(doc(anonyme, 'newsletter/robot2'), { ...FICHE, unsubscribeToken: 'abc', firstName: 'Bot' })));
await cas('une membre connectée ne peut pas créer une fiche', () =>
  assertFails(setDoc(doc(membre, 'newsletter/membre-essai'), FICHE)));
await cas("l'admin crée une fiche (import CSV, étiquettes de groupe)", () =>
  assertSucceeds(setDoc(doc(admin, 'newsletter/import-1'), FICHE)));

console.log('\nnewsletter — modification et suppression');
await cas('un visiteur anonyme ne peut pas modifier une fiche', () =>
  assertFails(updateDoc(doc(anonyme, 'newsletter/existante'), { status: 'unsubscribed' })));
await cas('une membre connectée ne peut pas modifier une fiche', () =>
  assertFails(updateDoc(doc(membre, 'newsletter/existante'), { status: 'unsubscribed' })));
await cas('un visiteur anonyme ne peut pas supprimer une fiche', () =>
  assertFails(deleteDoc(doc(anonyme, 'newsletter/existante'))));
await cas("l'admin modifie une fiche (quarantaine, désabonnement)", () =>
  assertSucceeds(updateDoc(doc(admin, 'newsletter/existante'), { status: 'suspect' })));
await cas("l'admin supprime une fiche", () =>
  assertSucceeds(deleteDoc(doc(admin, 'newsletter/import-1'))));

console.log('\nnewsletter — lecture (inchangée)');
await cas('un visiteur anonyme ne lit pas une fiche', () =>
  assertFails(getDoc(doc(anonyme, 'newsletter/existante'))));
await cas('un visiteur anonyme ne liste pas la collection', () =>
  assertFails(getDocs(collection(anonyme, 'newsletter'))));
await cas('une membre connectée ne lit pas une fiche', () =>
  assertFails(getDoc(doc(membre, 'newsletter/existante'))));
await cas("l'admin lit une fiche", () =>
  assertSucceeds(getDoc(doc(admin, 'newsletter/existante'))));
await cas("l'admin liste la collection", () =>
  assertSucceeds(getDocs(collection(admin, 'newsletter'))));

console.log('\nnewsletter/{id}/reponses — inchangé (fonctions seulement)');
await cas('personne n\'écrit une réponse depuis le navigateur, pas même l\'admin', () =>
  assertFails(setDoc(doc(admin, 'newsletter/existante/reponses/r1'), { texte: 'bonjour' })));
await cas("l'admin relit les réponses", () =>
  assertSucceeds(getDocs(collection(admin, 'newsletter/existante/reponses'))));

// Un témoin que les autres formulaires publics n'ont PAS été refermés par
// mégarde : le quiz des doshas et les demandes de réservation écrivent encore
// depuis le navigateur, chacun avec sa propre règle.
console.log('\ntémoin — les autres formulaires publics restent ouverts');
await cas('doshaResults : un visiteur anonyme crée encore son résultat', () =>
  assertSucceeds(setDoc(doc(anonyme, 'doshaResults/essai'), {
    email: 'quiz@example.com', dominant: 'vata', createdAt: new Date(),
  })));

await env.cleanup();
console.log(`\n${reussis} réussis · ${rates} ratés`);
assert.equal(rates, 0, `${rates} test(s) de règles en échec`);
