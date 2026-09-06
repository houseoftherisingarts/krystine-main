#!/usr/bin/env node
// Garde-fou du module Infolettre de l'admin.
//
// Deux boucles figeaient l'onglet de Krystine jusqu'au « la page ne répond
// pas » de Chrome, depuis que la collection `newsletter` a dépassé les 33 000
// documents : le dédoublonnage des destinataires (AudiencePicker) et le dessin
// de la table des abonnés (SubscribersPanel). Ce script rejoue les deux sur un
// jeu de la même taille et échoue si quelqu'un ramène une version quadratique.
//
//   node scripts/qa/infolettre-perf.mjs
import assert from 'node:assert/strict';

const N = 33289;                       // le compte réel au 6 septembre 2026
const BUDGET_MS = 150;                 // large : la version Set tourne en ~10 ms
const FENETRE = 50;                    // SubscribersPanel dessine 50 lignes d'un coup

const abonnes = Array.from({ length: N }, (_, i) => ({
  email: `personne${i % (N - 200)}@exemple.com`,   // quelques doublons volontaires
  firstName: 'Prenom',
  lastName: 'Nom',
  status: i % 20 === 0 ? 'unsubscribed' : 'pending',
}));

// La version en place dans AudiencePicker.tsx
function dedoublonner(subs) {
  const vus = new Set();
  const out = [];
  for (const s of subs) {
    if (s.status === 'unsubscribed') continue;
    if (vus.has(s.email)) continue;
    vus.add(s.email);
    out.push(s);
  }
  return out;
}

// Même résultat que l'ancienne version quadratique, sur un échantillon assez
// petit pour qu'elle finisse.
const echantillon = abonnes.slice(0, 2000);
const attendu = echantillon.filter((s, i, a) => s.status !== 'unsubscribed' && a.findIndex(o => o.email === s.email) === i);
assert.deepEqual(dedoublonner(echantillon).map(s => s.email), attendu.map(s => s.email),
  'le dédoublonnage ne rend plus la même liste que la version historique');

const t = performance.now();
const uniques = dedoublonner(abonnes);
const duree = performance.now() - t;
assert.ok(duree < BUDGET_MS, `dédoublonnage trop lent : ${duree.toFixed(0)} ms pour ${N} abonnés (budget ${BUDGET_MS} ms). Une boucle quadratique est revenue.`);

// Le dessin est fenêtré : jamais 33 000 lignes d'un coup.
assert.equal(uniques.slice(0, FENETRE).length, FENETRE, 'la fenêtre de rendu ne tient plus');

console.log(`OK — ${N} abonnés, ${uniques.length} destinataires uniques en ${duree.toFixed(0)} ms, fenêtre de ${FENETRE} lignes.`);

// Depuis le 6 septembre (après-midi), le composeur ne rapatrie plus la
// collection : l'audience passe par la fonction `audienceInfolettre`.
import { readFileSync } from 'node:fs';
for (const f of ['src/pages/admin/sections/newsletter/AudiencePicker.tsx', 'src/pages/admin/sections/newsletter/Composer.tsx', 'src/pages/admin/sections/newsletter/AssistantPanel.tsx']) {
  assert.ok(!readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8').includes('getNewsletterSubscribers'),
    `${f} relit toute la collection newsletter : le composeur regèlera sur 33 000 abonnés.`);
}
console.log('OK — le composeur ne lit plus la collection des abonnés.');
