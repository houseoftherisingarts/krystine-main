// Compile le tracker VexelHotjar en script autonome pour les pages HTML
// statiques (public/accueil, /speaking, /communaute, /liste-attente-origine) :
// public/vh/vexelhotjar.js, avec le module d'enregistrement rrweb dans un
// morceau à part qui ne se charge que pour les visites filmées. Lancé par
// prebuild, donc toujours au niveau du code du site.
import { build } from 'esbuild';
import { rm, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SORTIE = resolve(ROOT, 'public/vh');
await rm(SORTIE, { recursive: true, force: true });
await mkdir(SORTIE, { recursive: true });
await build({
  entryPoints: [resolve(ROOT, 'src/vexelhotjar/statique.ts')],
  bundle: true, format: 'esm', splitting: true, minify: true, target: 'es2020',
  outdir: SORTIE, entryNames: 'vexelhotjar', chunkNames: 'replay-[hash]',
  logLevel: 'warning',
});
console.log('VexelHotjar statique : public/vh/vexelhotjar.js');
