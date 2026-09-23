// Vérifie le fabricant de zip de src/lib/zip.ts : une archive de trois fichiers (texte, nom
// accentué, binaire), validée par unzip -t, puis relue pour comparer le contenu octet pour octet.
//
// Node 24 sait importer un .ts directement (dépouille les types au vol) : contrairement à MapChef,
// ce dépôt n'a pas esbuild d'installé, alors ce test importe la source telle quelle plutôt que de
// la transformer d'abord.
//   node scripts/qa/zip.test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { zipper } from '../../src/lib/zip.ts';

const fichiers = [
  { nom: 'bonjour.txt', data: new TextEncoder().encode('Bonjour, Krystine.\n') },
  { nom: 'textes/accent-é.txt', data: new TextEncoder().encode('Un accent aigu, pour le nom en UTF-8.') },
  { nom: 'binaire.bin', data: Uint8Array.from({ length: 5000 }, (_, i) => (i * 37) % 256) },
];

const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'zip-'));
const archive = path.join(dossier, 'kit.zip');
fs.writeFileSync(archive, Buffer.from(await zipper(fichiers).arrayBuffer()));

// unzip -t valide les empreintes CRC et la structure, comme le fera le journaliste.
execFileSync('unzip', ['-tqq', archive]);
// La relecture passe par Python : l'unzip livré avec macOS ignore le drapeau UTF-8 et abîme les
// noms accentués à l'extraction, alors qu'il lit l'archive elle-même sans broncher.
const relu = JSON.parse(
  execFileSync('python3', ['-c', `
import json, sys, zipfile
with zipfile.ZipFile(sys.argv[1]) as z:
    print(json.dumps({n: list(z.read(n)) for n in z.namelist()}))
`, archive]).toString()
);
for (const f of fichiers) {
  assert.deepEqual(Uint8Array.from(relu[f.nom] ?? []), f.data, `${f.nom} ne revient pas identique`);
}
fs.rmSync(dossier, { recursive: true, force: true });
console.log(`zip : ${fichiers.length} fichiers, archive valide et identique au retour`);
