// Vérification du lecteur de CSV des acheteuses :
//   node src/firebase/acheteusesKajabi.test.mjs
// Il échoue si un export de Kajabi cesse d'être compris, ce qui enverrait un
// mot de Krystine aux mauvaises personnes ou à personne.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Le module est en TypeScript : esbuild, déjà présent avec Vite, le transpile
// à la volée pour que le contrôle porte sur le vrai code plutôt que sur une
// copie qui pourrait diverger.
const fichier = fileURLToPath(new URL('./acheteusesKajabi.ts', import.meta.url));
const js = execFileSync('node_modules/.bin/esbuild', [fichier, '--format=esm'], { encoding: 'utf8' })
  .replace(/import[^;]+from\s+["'][^"']+["'];/g, '');   // Firestore n'est pas requis par les fonctions pures
const { lireCsvKajabi, personnaliser, cleCourriel } =
  await import(`data:text/javascript,${encodeURIComponent(js)}`);

const csv = `﻿First Name,Last Name,Email 1,Purchase Date
Marie,Tremblay,Marie.Tremblay@Example.COM ,2026-01-04
"Anne, dite Annie",Roy,annie@example.com,2026-02-11
,,pas-une-adresse,
Luc,Gagnon,annie@example.com,2026-03-01
`;

const r = lireCsvKajabi(csv, 'origine-1');
assert.equal(r.length, 2, 'deux acheteuses valables, la ligne sans adresse et le doublon sont écartés');
assert.equal(r[0].email, 'marie.tremblay@example.com', 'le courriel se normalise en minuscules et se dégraisse');
assert.equal(r[0].prenom, 'Marie');
assert.equal(r[1].prenom, 'Anne, dite Annie', 'une virgule entre guillemets ne casse pas la colonne');
assert.equal(r[0].offre, 'origine-1');
assert.equal(r[0].acheteLe, '2026-01-04');

// Un export sans entête reconnaissable : la colonne du courriel se devine.
const brut = 'a,b,c\nJeanne,jeanne@example.com,x\n';
assert.equal(lireCsvKajabi(brut, 'o')[0].email, 'jeanne@example.com');

assert.equal(personnaliser('Bonjour {prenom}, ça va ?', { email: 'x', offre: 'o', prenom: 'Marie' }), 'Bonjour Marie, ça va ?');
assert.equal(personnaliser('Bonjour {prenom}, ça va ?', { email: 'x', offre: 'o' }), 'Bonjour, ça va ?',
  'sans prénom, la phrase se referme au lieu de laisser un trou');
assert.equal(cleCourriel('  Un.Truc+tag@Site.CA '), 'un.truc+tag@site.ca');

console.log('lecteur de CSV des acheteuses : 9 vérifications passées.');
