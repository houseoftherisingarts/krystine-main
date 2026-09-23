#!/usr/bin/env node
// ─── Les pièces fixes du kit de presse de Krystine St-Laurent ───
//   node scripts/presse/build-kit.mjs
//
// Jusqu'au 23 septembre 2026, ce script fabriquait tout le kit : il lisait cards.mjs/photos.mjs/
// shots.mjs, composait les cartes 1920 × 1080 dans Chromium avec sharp pour le recadrage, et en
// tirait un zip figé sur disque. Krystine édite maintenant son kit depuis Admin › Kit de presse, et
// la page /presse rend chaque carte et chaque planche elle-même (components/presse/VisuelPresse.tsx)
// à partir de settings/presse dans Firestore, si bien qu'un texte corrigé ou une photo changée se
// voit aussitôt, dans la page comme dans l'image téléchargée. Le zip se fabrique au clic, dans le
// navigateur (src/lib/zip.ts). Garder ici un second gabarit des visuels aurait fait diverger les deux.
//
// Restent les pièces qui ne dépendent pas du contenu éditable : les quatre mots-symboles (logos/) et
// les codes QR de chaque carte, planche et page (qr/), lus par urlQrCarte/urlQrPlanche/urlQrPage dans
// src/content/presse.ts. Elles se refont seulement quand le logo change ou qu'une adresse cible
// change ; les cibles sont recopiées ici en dur plutôt qu'importées de content/presse.ts parce que ce
// module tire sur firebase.ts (donc sur les variables Vite), que ce script hors-navigateur n'a pas.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';
import QRCode from 'qrcode';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.resolve(HERE, '..', '..');
const PUBLIC = path.join(RACINE, 'public');
const OUT = path.join(PUBLIC, 'presse');
const LOGOS = path.join(OUT, 'logos');
const QR = path.join(OUT, 'qr');
const SITE = 'https://www.krystinestlaurent.ca';

const W = 1920;
const C = { fond: '#f4efe6', carte: '#faf6ee', encre: '#1c1712', pied: '#34241a' };

// Le même grain de papier très léger que portaient les visuels d'origine, pour que le mot-symbole
// crème ne sorte pas plat en PNG. Reste sous 3,5 % d'opacité.
const GRAIN = 'data:image/svg+xml;base64,' + Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220">' +
  '<filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3"/>' +
  '<feColorMatrix type="saturate" values="0"/></filter>' +
  '<rect width="220" height="220" filter="url(#g)"/></svg>',
).toString('base64');

for (const d of [LOGOS, QR]) fs.mkdirSync(d, { recursive: true });

function shell(corps, css = '', hauteur = 640) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${W}px;height:${hauteur}px;overflow:hidden}
  body{font-family:Inter,sans-serif;color:${C.encre}}
  .mot{font-family:"Cormorant Garamond",serif;font-weight:600;text-transform:uppercase;letter-spacing:.17em}
  .grain{position:absolute;inset:0;background-image:url(${GRAIN});opacity:.035;pointer-events:none;mix-blend-mode:multiply}
  ${css}
</style></head><body>${corps}</body></html>`;
}

function motSymboleHtml({ encre, fond }) {
  return shell(`
    ${fond === 'transparent' ? '' : '<div class="grain"></div>'}
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px">
      <span class="mot" style="font-size:112px;letter-spacing:.11em;color:${encre};line-height:1">Krystine St-Laurent</span>
      <div style="width:520px;height:1px;background:${encre};opacity:.4"></div>
      <span style="font-size:22px;font-weight:500;text-transform:uppercase;letter-spacing:.42em;color:${encre};opacity:.72">Inspira Nature</span>
    </div>`, `body{background:${fond === 'transparent' ? 'transparent' : fond}}`, 640);
}

/* ════════════════════════ Les mots-symboles ════════════════════════ */

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: 640 }, deviceScaleFactor: 1 });

for (const [nom, encre, fond, transparent] of [
  ['mot-symbole-encre-sur-creme.png', C.encre, C.fond, false],
  ['mot-symbole-creme-sur-encre.png', C.carte, C.pied, false],
  ['mot-symbole-encre-transparent.png', C.encre, 'transparent', true],
  ['mot-symbole-creme-transparent.png', C.carte, 'transparent', true],
]) {
  await page.setContent(motSymboleHtml({ encre, fond }), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const brut = await page.screenshot({ animations: 'disabled', omitBackground: transparent });
  const img = sharp(brut);
  if (transparent) await img.png({ compressionLevel: 9, effort: 9 }).toFile(path.join(LOGOS, nom));
  else await img.removeAlpha().png({ compressionLevel: 9, effort: 9 }).toFile(path.join(LOGOS, nom));
  console.log(`  logos/${nom}`);
}
await browser.close();

/* ════════════════════════ Les codes QR ════════════════════════ */
// Une cible par carte (huit cartes), une cible partagée par les six planches (toutes pointent vers
// la salle de presse elle-même), une cible par page du site. Copié de KIT_DEFAUT dans
// src/content/presse.ts au 23 septembre 2026 : une cible que Krystine change dans l'admin n'ouvrira
// plus le même code tant que ce script n'aura pas régénéré le fichier correspondant.

const qr = (cible, dest) => {
  const url = cible.startsWith('http') ? cible : SITE + cible;
  return QRCode.toFile(dest, url, { errorCorrectionLevel: 'M', margin: 0, width: 420, color: { dark: C.encre, light: C.carte } });
};

const CIBLES_CARTES = {
  portrait: '/krystine',
  conferenciere: '/conferenciere',
  livres: '/medias',
  origine: '/origine',
  podcast: 'https://open.spotify.com/show/0cHEVMLF92tJxiO7MwyOKD',
  medias: '/medias',
  boutique: '/boutique',
  contact: '/presse',
};
for (const [key, cible] of Object.entries(CIBLES_CARTES)) await qr(cible, path.join(QR, `${key}.png`));
console.log(`  qr/*.png · ${Object.keys(CIBLES_CARTES).length} cartes`);

await qr('/presse', path.join(QR, 'presse.png'));
console.log('  qr/presse.png · les six planches');

const CIBLES_PAGES = {
  'site-accueil': '/',
  'site-krystine': '/krystine',
  'site-conferenciere': '/conferenciere',
  'site-medias': '/medias',
  'site-formations': '/formations',
  'site-boutique': '/boutique',
};
for (const [key, cible] of Object.entries(CIBLES_PAGES)) await qr(cible, path.join(QR, `page-${key}.png`));
console.log(`  qr/page-*.png · ${Object.keys(CIBLES_PAGES).length} pages`);
