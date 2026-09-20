#!/usr/bin/env node
// Le collant « Site créé par Vexel Webstudio » ne se retire pas d'un site Vexel.
// Ce garde tourne avant chaque build (prebuild) : les couleurs, la taille et le
// foil du collant restent libres, seule sa présence dans chaque pied de page est
// tenue. GARDE_DETAIL=1 liste ce qui manque.
import { existsSync, readFileSync } from 'node:fs';

const MESSAGE = "Il est impossible d'enlever un collant Vexel d'un site Vexel ;)";

const ATTENDUS = [
  ['src/vexel/CollantVexel.tsx', ['vexel-logo.png', 'Vexel Webstudio']],
  ['src/components/layout/Footer.tsx', ['<CollantVexel']],
  ['src/components/v2/Magazine.tsx', ['<CollantVexel']],
  ['src/pages/FoyerPage.tsx', ['<CollantVexel']],
  ['public/accueil/index.html', ['class="cv-foil"', '/vexel-logo.png', 'Vexel Webstudio']],
];

const manques = [];
for (const [fichier, marques] of ATTENDUS) {
  if (!existsSync(fichier)) { manques.push(fichier); continue; }
  const source = readFileSync(fichier, 'utf8');
  for (const m of marques) if (!source.includes(m)) manques.push(`${fichier} : ${m}`);
}

if (manques.length) {
  console.error(`\n${MESSAGE}\n`);
  if (process.env.GARDE_DETAIL) console.error(manques.join('\n'));
  process.exit(1);
}
