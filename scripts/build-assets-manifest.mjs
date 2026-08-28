// Écrit public/assets-manifest.json : la liste des fichiers téléchargeables de
// public/, pour la section « Assets et téléchargements » de l'admin. Tourne
// avant chaque build (npm run build) et se relance à la main au besoin :
//   node scripts/build-assets-manifest.mjs
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, extname, relative } from 'node:path';

// fileURLToPath, pas .pathname : le dépôt vit dans « Krystine Main », et
// l'espace du chemin arrive encodé en %20 dans une URL.
const PUBLIC = fileURLToPath(new URL('../public/', import.meta.url));
const SKIP_DIRS = new Set(['i18n', 'draco']);
const KIND = {
  image: ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.svg'],
  video: ['.mp4', '.webm', '.mov'],
  audio: ['.mp3', '.m4a', '.wav'],
  modele: ['.glb', '.gltf'],
  document: ['.pdf'],
};

function kindOf(ext) {
  for (const [kind, exts] of Object.entries(KIND)) if (exts.includes(ext)) return kind;
  return null;
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, out);
      continue;
    }
    const ext = extname(entry.name).toLowerCase();
    const kind = kindOf(ext);
    if (!kind) continue;
    const rel = relative(PUBLIC, full);
    out.push({
      path: `/${rel}`,
      name: entry.name,
      folder: rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : 'racine',
      kind,
      size: statSync(full).size,
    });
  }
  return out;
}

const files = walk(PUBLIC).sort((a, b) =>
  a.folder === b.folder ? a.name.localeCompare(b.name, 'fr') : a.folder.localeCompare(b.folder, 'fr'),
);
writeFileSync(join(PUBLIC, 'assets-manifest.json'), JSON.stringify({ generatedAt: new Date().toISOString(), files }, null, 2));
console.log(`assets-manifest.json : ${files.length} fichiers`);
