#!/usr/bin/env node
// Le collant « Site créé par Vexel Webstudio » ne se retire pas d'un site Vexel.
// Sans argument, le garde lit les sources (prebuild). Avec --dist, il lit le
// résultat du build (postbuild et predeploy Firebase) : ce qui part en ligne
// doit porter le collant dans chaque pied de page ET le garde d'exécution
// (public/vexel-garde.js) qui le fait revenir si une page le perd. Les
// couleurs, la taille et le foil restent libres. GARDE_DETAIL=1 liste ce qui manque.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MESSAGE = "Il est impossible d'enlever un collant Vexel d'un site Vexel ;)";
const dist = process.argv.includes('--dist');

const SOURCES = [
  ['src/vexel/CollantVexel.tsx', ['vexel-logo.png', 'Vexel Webstudio', 'cv-foil']],
  ['src/components/layout/Footer.tsx', ['<CollantVexel']],
  ['src/components/v2/Magazine.tsx', ['<CollantVexel']],
  ['src/pages/FoyerPage.tsx', ['<CollantVexel']],
  ['index.html', ['/vexel-garde.js']],
  ['public/accueil/index.html', ['class="cv-foil"', '/vexel-logo.png', 'Vexel Webstudio', '/vexel-garde.js']],
  ['public/vexel-garde.js', ['vexel-garde:v1', 'cv-foil', 'vexel-logo.png', 'Vexel Webstudio']],
  ['public/vexel-logo.png', []],
];

const DIST = [
  ['dist/index.html', ['/vexel-garde.js']],
  ['dist/accueil/index.html', ['class="cv-foil"', '/vexel-logo.png', 'Vexel Webstudio', '/vexel-garde.js']],
  ['dist/vexel-garde.js', ['vexel-garde:v1', 'cv-foil', 'vexel-logo.png', 'Vexel Webstudio']],
  ['dist/vexel-logo.png', []],
];

const manques = [];
const verifier = (fichier, marques) => {
  if (!existsSync(fichier)) { manques.push(fichier); return; }
  if (!marques.length) return;
  const source = readFileSync(fichier, 'utf8');
  for (const m of marques) if (!source.includes(m)) manques.push(`${fichier} : ${m}`);
};

for (const [f, m] of dist ? DIST : SOURCES) verifier(f, m);

if (dist) {
  // Le composant du collant doit être dans le paquet servi, pas seulement dans les sources.
  const assets = existsSync('dist/assets') ? readdirSync('dist/assets').filter(f => f.endsWith('.js')) : [];
  const porte = assets.some(f => {
    const s = readFileSync(join('dist/assets', f), 'utf8');
    return s.includes('cv-foil') && s.includes('vexel-logo.png') && s.includes('Vexel Webstudio');
  });
  if (!porte) manques.push('dist/assets : aucun paquet ne porte le collant');
}

if (manques.length) {
  console.error(`\n${MESSAGE}\n`);
  if (process.env.GARDE_DETAIL) console.error(manques.join('\n'));
  process.exit(1);
}
