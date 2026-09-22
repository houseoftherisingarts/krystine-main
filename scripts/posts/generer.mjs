#!/usr/bin/env node
// ─── Les posts préfaits de Krystine : rendu des cartes ────────────────
//   npm run posts:generer
//
// Lit scripts/posts/file.json (les cartes, en français, tirées du vrai
// contenu du site) et rend chacune dans le gabarit magazine crème
// (scripts/posts/gabarit.html) en deux formats, portrait 1080 x 1350 et
// carré 1080 x 1080, vers public/pubs/posts/. Une vignette WebP de 540 px
// (cwebp) accompagne chaque carte pour la grille de l'admin. L'état
// (publiée ou non, date) vient de scripts/posts/etat.json et se recopie
// dans public/pubs/posts/manifest.json pour que la section admin n'ait
// qu'un fichier à lire.
//
// Contrairement au kit de presse Vexel, ce module ne dépose rien sur le
// Bureau : les images restent uniquement dans public/pubs/posts/, prêtes
// à être téléchargées depuis l'admin.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.join(HERE, '..', '..');
const PUBLIC = path.join(RACINE, 'public');
const SORTIE = path.join(PUBLIC, 'pubs', 'posts');
const FICHIER_DONNEES = path.join(HERE, 'file.json');
const FICHIER_ETAT = path.join(HERE, 'etat.json');
const GABARIT = pathToFileURL(path.join(HERE, 'gabarit.html')).href;

const FORMATS = {
  portrait: { largeur: 1080, hauteur: 1350 },
  carre: { largeur: 1080, hauteur: 1080 },
};

// Une carte dont le champ image commence par « http » pointe une source
// distante (les couvertures de livres, hébergées sur Cloud Storage) et se
// charge telle quelle. Sinon, le champ vaut un chemin public (« /vata/… »)
// qui se résout vers public/ puis se passe en file:// au gabarit.
function resoudreImage(image) {
  if (/^https?:\/\//.test(image)) return image;
  const chemin = path.join(PUBLIC, image.replace(/^\//, ''));
  if (!fs.existsSync(chemin)) throw new Error(`Image introuvable pour une carte : ${chemin}`);
  return pathToFileURL(chemin).href;
}

function lireJson(chemin, repli) {
  if (!fs.existsSync(chemin)) return repli;
  return JSON.parse(fs.readFileSync(chemin, 'utf8'));
}

async function rendreCarte(navigateur, carte, format, dimensions) {
  const contexte = await navigateur.newContext({
    viewport: { width: dimensions.largeur, height: dimensions.hauteur },
    deviceScaleFactor: 1,
  });
  const page = await contexte.newPage();
  const donnees = { ...carte, image: resoudreImage(carte.image), format };
  await page.addInitScript((c) => { window.__CARTE = c; }, donnees);
  await page.goto(GABARIT, { waitUntil: 'load' });
  await page.waitForFunction(() => document.body.dataset.pret === '1', { timeout: 15000 });
  await page.waitForTimeout(120);

  const lignes = await page.evaluate(() => Number(document.body.dataset.titreLignes || '0'));
  if (lignes > 2) {
    console.warn(`  ! ${carte.id} (${format}) : le titre tient sur ${lignes} lignes, au-delà de la limite de deux. Raccourcir « ${carte.titre} ».`);
  }

  const fichier = path.join(SORTIE, `${carte.id}-${format}.png`);
  const cadre = page.locator('#carte');
  await cadre.screenshot({ path: fichier });
  await contexte.close();
  return { fichier, lignesTitreEnTrop: lignes > 2 };
}

function fabriquerVignette(carte) {
  const source = path.join(SORTIE, `${carte.id}-carre.png`);
  const cible = path.join(SORTIE, `${carte.id}-vignette.webp`);
  execFileSync('cwebp', ['-quiet', '-resize', '540', '540', source, '-o', cible]);
  return cible;
}

async function main() {
  const cartes = lireJson(FICHIER_DONNEES, []);
  if (!cartes.length) {
    console.error('Aucune carte dans scripts/posts/file.json.');
    process.exitCode = 1;
    return;
  }
  const etat = lireJson(FICHIER_ETAT, { publiees: [], dernierePublicationLe: null });
  const publieesParId = new Map((etat.publiees || []).map((p) => [p.id, p]));

  fs.mkdirSync(SORTIE, { recursive: true });

  console.log(`Rendu de ${cartes.length} cartes, deux formats chacune…`);
  const navigateur = await chromium.launch();
  let enTrop = 0;
  const manifeste = [];

  for (const carte of cartes) {
    const fichiers = {};
    for (const [format, dimensions] of Object.entries(FORMATS)) {
      const { fichier, lignesTitreEnTrop } = await rendreCarte(navigateur, carte, format, dimensions);
      fichiers[format] = `/pubs/posts/${path.basename(fichier)}`;
      if (lignesTitreEnTrop) enTrop += 1;
    }
    const vignette = fabriquerVignette(carte);
    const publiee = publieesParId.get(carte.id);
    manifeste.push({
      id: carte.id,
      serie: carte.serie,
      titre: carte.titre,
      legende: carte.legende,
      lien: carte.lien,
      fichiers,
      vignette: `/pubs/posts/${path.basename(vignette)}`,
      etat: publiee ? 'publiee' : 'a_publier',
      publieeLe: publiee ? publiee.publieeLe : null,
    });
    console.log(`  ${carte.id} (série ${carte.serie}) rendue.`);
  }

  await navigateur.close();

  const chemin = path.join(SORTIE, 'manifest.json');
  fs.writeFileSync(chemin, JSON.stringify(manifeste, null, 2) + '\n', 'utf8');
  console.log(`Manifeste écrit : ${chemin}`);

  if (enTrop > 0) {
    console.warn(`\n${enTrop} rendu(s) avec un titre sur plus de deux lignes : voir les avertissements ci-dessus.`);
    process.exitCode = 1;
  } else {
    console.log('\nToutes les cartes tiennent en deux lignes de titre au plus.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
