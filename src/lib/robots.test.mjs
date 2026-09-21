// Contrôle de la garde anti-robots, à la main, sans cadre de test, comme
// offres.test.mjs. Lance avec : node src/lib/robots.test.mjs
//
// Ce qu'il protège : la liste des domaines d'alias est doublée (navigateur et
// fonctions), parce que les formulaires publics écrivent encore dans Firestore
// depuis le client. Si quelqu'un ajoute un domaine d'un seul côté, les
// inscriptions passent par le trou. Ce test casse alors.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DOMAINES_ALIAS, domaineAlias, raisonAlias } from './robots.ts';

const ici = dirname(fileURLToPath(import.meta.url));
const COTE_FONCTIONS = join(ici, '../../functions/src/newsletter/robots.ts');

let n = 0;
function cas(nom, fn) {
  n++;
  fn();
  console.log(`ok ${n} - ${nom}`);
}

// ── 1. Les deux listes sont identiques, domaine par domaine et service par
// service. On lit le fichier des fonctions comme du texte : il importe
// firebase-admin, que node ne saurait pas résoudre ici.
cas('la liste des fonctions et celle du navigateur sont identiques', () => {
  const source = readFileSync(COTE_FONCTIONS, 'utf8');
  const bloc = source.match(/DOMAINES_ALIAS[^=]*=\s*\{([\s\S]*?)\n\};/);
  assert.ok(bloc, 'DOMAINES_ALIAS introuvable dans functions/src/newsletter/robots.ts');
  const cote = {};
  for (const m of bloc[1].matchAll(/'([^']+)':\s*'([^']+)'/g)) cote[m[1]] = m[2];

  const ici = Object.keys(DOMAINES_ALIAS).sort();
  const la = Object.keys(cote).sort();
  assert.deepEqual(la, ici, `domaines qui diffèrent : ${
    [...ici.filter(d => !la.includes(d)).map(d => `+client ${d}`),
     ...la.filter(d => !ici.includes(d)).map(d => `+fonctions ${d}`)].join(', ')
  }`);
  for (const d of ici) assert.equal(cote[d], DOMAINES_ALIAS[d], `service différent pour ${d}`);
});

// ── 2. Une boîte ordinaire n'est jamais prise pour un alias. Proton est le cas
// qui compte : proton.me est une vraie adresse, passmail.com est un alias.
cas('les boîtes ordinaires passent', () => {
  for (const e of [
    'krystine@inspiratanature.com',
    'quelquun@proton.me',
    'quelquun@protonmail.com',
    'quelquun@gmail.com',
    'quelquun@duckduckgo.com',
    'quelquun@firefox.com',
  ]) assert.equal(domaineAlias(e), null, `${e} ne devrait pas être un alias`);
});

// ── 3. Les alias sont attrapés, y compris celui qui a déclenché le chantier.
cas('les alias jetables sont attrapés', () => {
  assert.equal(domaineAlias('inspiratanature.casualty800@passmail.com'), 'passmail.com');
  assert.equal(domaineAlias('QuelquUn@YOPMAIL.com'), 'yopmail.com');
  assert.equal(domaineAlias('  bidule@mailinator.com  '), 'mailinator.com');
});

// ── 4. Firefox Relay pose ses alias sur un sous-domaine : le parent compte.
cas('les sous-domaines de Firefox Relay comptent', () => {
  assert.equal(domaineAlias('abc123@xyz.mozmail.com'), 'mozmail.com');
  assert.equal(domaineAlias('abc123@mozmail.com'), 'mozmail.com');
  // mais un domaine qui finit par le même mot sans être le nôtre ne compte pas
  assert.equal(domaineAlias('abc@pasmozmail.com'), null);
});

// ── 5. Une saisie abîmée ne fait pas tomber la garde.
cas('les adresses abîmées ne cassent rien', () => {
  for (const e of ['', '   ', 'sansarobase', '@', 'a@', undefined, null]) {
    assert.equal(domaineAlias(e), null);
  }
});

// ── 6. Le motif écrit sur la fiche garde le format posé à la main.
cas('le motif reprend le format du 21 septembre 2026', () => {
  assert.equal(raisonAlias('passmail.com'), 'alias jetable passmail.com (Proton Pass)');
});

console.log(`\n${n} contrôles passés.`);
