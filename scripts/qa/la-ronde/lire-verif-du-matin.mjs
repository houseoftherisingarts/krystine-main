// Lit le résultat de la vérification du matin (lecture seule) pour servir de point de départ à la Ronde.
import { readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
const dossier = join(homedir(), 'Library/Application Support/iris-verif');
const dernier = readdirSync(dossier).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().pop();
const b = JSON.parse(readFileSync(join(dossier, dernier), 'utf8'));
console.log(dernier, b.pages, 'pages,', b.anomalies.length, 'anomalies');
console.log(b.listeDesPages.join(' '));
for (const a of b.anomalies) console.log('-', a.page, '|', a.appareil, '|', a.probleme);
for (const p of b.parcours) console.log(p.ok ? 'OK ' : 'KO ', p.nom, '|', p.appareil, '|', p.detail);
