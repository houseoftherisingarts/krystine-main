// Vérification du code de billet, à lancer après un changement du générateur :
//   node scripts/verif-code-billet.mjs
// Elle échoue si le format bouge, si une lettre ambiguë se glisse dans
// l'alphabet, ou si l'entropie s'effondre au point de produire des doublons.
import assert from 'node:assert/strict';
import { genererCodeBillet } from '../functions/lib/billetterie.js';

const FORME = /^KSL-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/;
const vus = new Set();
const compte = new Map();

for (let i = 0; i < 20000; i++) {
  const code = genererCodeBillet();
  assert.match(code, FORME, `code hors format : ${code}`);
  assert.equal(vus.has(code), false, `deux fois le même code en 20 000 tirages : ${code}`);
  vus.add(code);
  for (const c of code.replace(/^KSL-|-/g, '')) compte.set(c, (compte.get(c) || 0) + 1);
}

// Trente-deux symboles sur 240 000 tirages : environ 7 500 chacun. Un écart de
// plus de vingt pour cent trahirait un biais de modulo.
const attendu = 20000 * 12 / 32;
for (const [symbole, n] of compte) {
  assert.ok(Math.abs(n - attendu) < attendu * 0.2, `symbole ${symbole} tiré ${n} fois, attendu environ ${attendu}`);
}
assert.equal(compte.size, 32, `l'alphabet devrait compter 32 symboles, il en sort ${compte.size}`);
console.log('code de billet : format, unicité et répartition vérifiés sur 20 000 tirages.');
