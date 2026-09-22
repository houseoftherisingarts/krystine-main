#!/usr/bin/env node
// ─── Le kit de presse de Krystine St-Laurent, d'une seule commande ───
//   node scripts/presse/build-kit.mjs
//   node scripts/presse/build-kit.mjs --only=portrait,livres
//
// Tout sort dans public/presse/ : les visuels 1920 × 1080, leurs
// vignettes, les mots-symboles, les textes et le zip du kit complet.
//
// Les cartes se rendent dans Chromium par Playwright, avec les vraies
// fontes du site (Fraunces, Cormorant Garamond, Inter) chargées depuis
// Google Fonts, parce qu'une carte composée par sharp aurait rendu une
// typographie approximative. Les photos voyagent en data URI : Chromium
// refuse les images file:// d'une page posée par setContent, et passer
// par un fichier de scène sur disque rendait le script illisible.
//
// Le recadrage garde toujours le plus grand rectangle du bon format à
// l'intérieur de la source, centré sur le point d'intérêt, et refuse
// d'agrandir au-delà de 1,6 fois : au-delà, la photo devient molle et
// ne vaut plus rien pour une journaliste qui l'imprime.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';
import QRCode from 'qrcode';
import { CARTES, SITE } from './cards.mjs';
import { PHOTOS } from './photos.mjs';
import { SHOTS } from './shots.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.resolve(HERE, '..', '..');
const PUBLIC = path.join(RACINE, 'public');
const CAPTURES = path.join(HERE, 'captures');
const OUT = path.join(PUBLIC, 'presse');
const THUMBS = path.join(OUT, 'thumbs');
const LOGOS = path.join(OUT, 'logos');
const TEXTES = path.join(OUT, 'textes');
const ZIP = 'kit-presse-krystine-st-laurent.zip';

const W = 1920;
const H = 1080;
const AGRANDISSEMENT_MAX = 1.6;

const SEUL = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);

// ─── Le canon crème, repris des jetons de src/components/v2/Magazine.tsx
const C = {
  fond: '#f4efe6',
  panneau: '#efe6d7',
  carte: '#faf6ee',
  encre: '#1c1712',
  encreDouce: '#3a2f23',
  laiton: '#9c7a44',
  laitonEncre: '#7d6330',
  pied: '#34241a',
};

// Un grain de papier très léger, pour que le crème ne sorte pas plat en
// PNG. Il reste sous 3,5 % d'opacité : au-delà, il se voit à l'écran.
const GRAIN = 'data:image/svg+xml;base64,' + Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220">' +
  '<filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3"/>' +
  '<feColorMatrix type="saturate" values="0"/></filter>' +
  '<rect width="220" height="220" filter="url(#g)"/></svg>',
).toString('base64');

for (const d of [OUT, THUMBS, LOGOS, TEXTES]) fs.mkdirSync(d, { recursive: true });

/* ════════════════════════ Recadrage ════════════════════════ */

const borne = (v, min, max) => Math.max(min, Math.min(max, v));

function source(spec) {
  if (spec.capture) return path.join(CAPTURES, spec.capture);
  return path.join(PUBLIC, spec.fichier);
}

/**
 * Le plus grand rectangle de format `l/h` tenant dans la source, centré
 * sur (focusX, focus), redimensionné en l × h. Lève quand la source est
 * trop petite pour tenir sans mollir.
 */
async function recadrer(spec, l, h) {
  const chemin = source(spec);
  const meta = await sharp(chemin).metadata();
  const format = l / h;
  let cw = meta.width;
  let ch = Math.round(cw / format);
  if (ch > meta.height) { ch = meta.height; cw = Math.round(ch * format); }
  const gauche = Math.round(borne((spec.focusX ?? 0.5) * meta.width - cw / 2, 0, meta.width - cw));
  const haut = Math.round(borne((spec.focus ?? 0.5) * meta.height - ch / 2, 0, meta.height - ch));
  const facteur = l / cw;
  if (facteur > AGRANDISSEMENT_MAX) {
    throw new Error(`${spec.fichier || spec.capture} : il faudrait l'agrandir ${facteur.toFixed(2)} fois pour un ${l} × ${h}`);
  }
  return sharp(chemin)
    .extract({ left: gauche, top: haut, width: cw, height: ch })
    .resize(l, h, { kernel: 'lanczos3' })
    .flatten({ background: C.fond });
}

/** Vrai quand la source supporte un 1920 × 1080 sans agrandissement excessif. */
async function supportePleinePage(spec) {
  const meta = await sharp(source(spec)).metadata();
  let cw = meta.width;
  const format = W / (H - 176);
  let ch = Math.round(cw / format);
  if (ch > meta.height) { ch = meta.height; cw = Math.round(ch * format); }
  return W / cw <= AGRANDISSEMENT_MAX;
}

async function dataUri(spec, l, h) {
  const buf = await (await recadrer(spec, l, h)).jpeg({ quality: 94, mozjpeg: true }).toBuffer();
  return 'data:image/jpeg;base64,' + buf.toString('base64');
}

/* ════════════════════════ Codes QR ════════════════════════ */

async function qrUri(cible, px = 140) {
  const url = cible.startsWith('http') ? cible : SITE + cible;
  // La correction « M » suffit à un code imprimé sur du papier propre, et
  // elle garde la trame assez lâche pour rester lisible à 140 px.
  const buf = await QRCode.toBuffer(url, {
    errorCorrectionLevel: 'M',
    margin: 0,
    width: px * 3,
    color: { dark: C.encre, light: C.carte },
  });
  return 'data:image/png;base64,' + buf.toString('base64');
}

/* ════════════════════════ Gabarit HTML ════════════════════════ */

function shell(corps, css = '', hauteur = H) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400&family=Cormorant+Garamond:wght@500;600&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${W}px;height:${hauteur}px;overflow:hidden}
  body{font-family:Inter,sans-serif;background:${C.fond};color:${C.encre};-webkit-font-smoothing:antialiased}
  .serif{font-family:Fraunces,Georgia,serif;font-weight:300}
  .mot{font-family:"Cormorant Garamond",serif;font-weight:600;text-transform:uppercase;letter-spacing:.17em}
  .kicker{font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:.34em;color:${C.laitonEncre}}
  .pied{font-size:10.5px;font-weight:500;text-transform:uppercase;letter-spacing:.3em;color:rgba(28,23,18,.45)}
  .filet{height:1px;background:rgba(156,122,68,.42)}
  .qr{image-rendering:pixelated}
  .grain{position:absolute;inset:0;background-image:url(${GRAIN});opacity:.035;pointer-events:none;mix-blend-mode:multiply}
  ${css}
</style></head><body>${corps}</body></html>`;
}

const masthead = (numero, lang) => `
  <div style="position:absolute;left:92px;right:92px;top:58px;display:flex;align-items:baseline;justify-content:space-between">
    <span class="mot" style="font-size:23px">Krystine St-Laurent</span>
    <span class="kicker" style="font-size:11.5px">N° ${numero} · ${lang === 'en' ? 'Press room' : 'Salle de presse'}</span>
  </div>
  <div class="filet" style="position:absolute;left:92px;right:92px;top:118px"></div>`;

const pied = (droite) => `
  <div class="filet" style="position:absolute;left:92px;right:92px;top:978px"></div>
  <div style="position:absolute;left:92px;right:92px;top:1004px;display:flex;justify-content:space-between">
    <span class="pied">Inspira Nature · Québec · MMXXVI</span>
    <span class="pied">${droite}</span>
  </div>`;

/** Le cadre fileté et son étiquette noire, repris du langage du site. */
const planche = (x, uri, etiquette) => `
  <div style="position:absolute;left:${x - 18}px;top:142px;width:736px;height:816px;border:1px solid rgba(156,122,68,.5)"></div>
  <img src="${uri}" style="position:absolute;left:${x}px;top:160px;width:700px;height:780px;object-fit:cover">
  <div style="position:absolute;left:${x + 28}px;top:920px;background:${C.encre};color:${C.carte};height:40px;display:flex;align-items:center;padding:0 22px;font-size:10.5px;font-weight:500;text-transform:uppercase;letter-spacing:.3em">${etiquette}</div>`;

function carteHtml({ carte, lang, qr, photo, qrImg }) {
  const t = carte[lang];
  const aGauche = carte.cote === 'gauche';
  const xPhoto = aGauche ? 92 : 1128;
  const xTexte = aGauche ? 880 : 92;
  const blocQr = qr ? `
    <div style="display:flex;align-items:center;gap:20px;margin-top:44px">
      <img class="qr" src="${qrImg}" style="width:140px;height:140px;border:1px solid rgba(156,122,68,.45);padding:9px;background:${C.carte}">
      <div>
        <p class="kicker" style="font-size:11px">${lang === 'en' ? 'Scan to open' : 'Scannez pour ouvrir'}</p>
        <p style="margin-top:9px;font-size:15px;font-weight:400;color:${C.encreDouce}">${t.meta}</p>
      </div>
    </div>` : '';
  return shell(`
    <div class="grain"></div>
    ${masthead(carte.n, lang)}
    ${planche(xPhoto, photo, carte.etiquette[lang])}
    <div style="position:absolute;left:${xTexte}px;top:118px;width:948px;height:860px;display:flex;flex-direction:column;justify-content:center">
      <p class="kicker">${t.kicker}</p>
      <h1 class="serif" id="titre" style="margin-top:26px;font-size:88px;line-height:.96;letter-spacing:-.012em;max-width:13ch;color:${C.encre}">${t.titre}</h1>
      <div style="width:76px;height:1px;background:${C.laiton};margin-top:34px"></div>
      <p style="margin-top:30px;font-size:21px;font-weight:300;line-height:1.78;color:${C.encreDouce};max-width:47ch">${t.corps}</p>
      ${qr ? '' : `<p style="margin-top:38px;font-size:11.5px;font-weight:500;text-transform:uppercase;letter-spacing:.26em;color:rgba(28,23,18,.55)">${t.meta}</p>`}
      ${blocQr}
    </div>
    ${pied('krystinestlaurent.ca/presse')}
  `);
}

/** La planche photo pleine page : photo au bord, bandeau crème en bas. */
function photoPleineHtml(p, uri) {
  return shell(`
    <img src="${uri}" style="position:absolute;inset:0;width:${W}px;height:${H}px;object-fit:cover">
    <div style="position:absolute;left:0;right:0;bottom:0;height:176px;background:${C.fond};display:flex;align-items:center;padding:0 92px">
      <div class="grain"></div>
      <div style="flex:1">
        <p style="font-size:20px;font-weight:300;line-height:1.5;color:${C.encre};max-width:62ch">${p.fr}</p>
        <p style="margin-top:8px;font-size:15px;font-weight:300;line-height:1.5;color:rgba(28,23,18,.55);max-width:62ch">${p.en}</p>
      </div>
      <div style="text-align:right;padding-left:48px">
        <span class="mot" style="font-size:19px">Krystine St-Laurent</span>
        <p class="pied" style="margin-top:9px">Photo n° ${p.n} · krystinestlaurent.ca/presse</p>
      </div>
    </div>`);
}

/** La planche photo verticale : photo collée à gauche, légende à droite. */
function photoDebouteHtml(p, uri) {
  return shell(`
    <div class="grain"></div>
    <img src="${uri}" style="position:absolute;left:0;top:0;width:900px;height:${H}px;object-fit:cover">
    <div style="position:absolute;left:900px;top:0;width:1020px;height:${H}px;padding:96px 92px;display:flex;flex-direction:column;justify-content:space-between">
      <div>
        <span class="mot" style="font-size:23px">Krystine St-Laurent</span>
        <div class="filet" style="margin-top:26px"></div>
        <p class="kicker" style="margin-top:38px">Photo n° ${p.n}</p>
        <p class="serif" style="margin-top:24px;font-size:34px;line-height:1.3;color:${C.encre};max-width:22ch">${p.fr}</p>
        <p style="margin-top:22px;font-size:17px;font-weight:300;line-height:1.6;color:rgba(28,23,18,.55);max-width:40ch">${p.en}</p>
      </div>
      <div>
        <div class="filet"></div>
        <p class="pied" style="margin-top:22px">Inspira Nature · Québec · krystinestlaurent.ca/presse</p>
      </div>
    </div>`);
}

/** Une page du site, pleine toile, sous un bandeau crème. */
function shotHtml(s, uri) {
  return shell(`
    <img src="${uri}" style="position:absolute;inset:0;width:${W}px;height:${H}px;object-fit:cover">
    <div style="position:absolute;left:0;right:0;bottom:0;height:136px;background:${C.fond};display:flex;align-items:center;padding:0 92px">
      <div class="grain"></div>
      <div style="flex:1">
        <p style="font-size:19px;font-weight:300;color:${C.encre}">${s.fr}</p>
        <p style="margin-top:6px;font-size:15px;font-weight:300;color:rgba(28,23,18,.55)">${s.en}</p>
      </div>
      <div style="text-align:right;padding-left:48px">
        <span class="mot" style="font-size:18px">Krystine St-Laurent</span>
        <p class="pied" style="margin-top:8px">${s.adresse}</p>
      </div>
    </div>`);
}

/** La photo seule, avec la pastille crème qui porte le code QR. */
function nuQrHtml(uri, qrImg) {
  return shell(`
    <img src="${uri}" style="position:absolute;inset:0;width:${W}px;height:${H}px;object-fit:cover">
    <div style="position:absolute;right:56px;bottom:56px;background:${C.carte};padding:22px 22px 16px;border:1px solid rgba(156,122,68,.5);text-align:center">
      <img class="qr" src="${qrImg}" style="width:132px;height:132px;display:block">
      <p class="pied" style="margin-top:12px;font-size:9.5px;letter-spacing:.24em">krystinestlaurent.ca</p>
    </div>`);
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

/* ════════════════════════ Rendu ════════════════════════ */

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const rendus = [];

async function shoot(html, nom, { jpeg = false, transparent = false, hauteur = H, ajusterTitre = false } = {}) {
  await page.setViewportSize({ width: W, height: hauteur });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  if (ajusterTitre) {
    // Un titre de carte ne dépasse jamais deux lignes : on rapetisse la
    // police par paliers de quatre pixels, et si elle descend sous 52 px
    // sans y arriver, c'est la copie qu'il faut raccourcir.
    const reste = await page.evaluate(() => {
      const el = document.getElementById('titre');
      if (!el) return 0;
      let taille = parseFloat(getComputedStyle(el).fontSize);
      const lignes = () => Math.round(el.getBoundingClientRect().height / (taille * 0.96));
      while (lignes() > 2 && taille > 52) { taille -= 4; el.style.fontSize = taille + 'px'; }
      return lignes();
    });
    if (reste > 2) console.log(`     ! ${nom} : le titre tient sur ${reste} lignes`);
  }
  const brut = await page.screenshot({ animations: 'disabled', omitBackground: transparent });
  const dest = path.join(OUT, nom);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const img = sharp(brut);
  if (jpeg) await img.flatten({ background: C.fond }).jpeg({ quality: 92, mozjpeg: true }).toFile(dest);
  else if (transparent) await img.png({ compressionLevel: 9, effort: 9 }).toFile(dest);
  else await img.removeAlpha().png({ compressionLevel: 9, effort: 9 }).toFile(dest);
  rendus.push(nom);
  return dest;
}

const retenue = (k) => !SEUL.length || SEUL.includes(k);

// ─── Les cartes, six variantes par sujet quand la photo le permet ────
for (const carte of CARTES) {
  if (!retenue(carte.key)) continue;
  const photo = await dataUri(carte.src, 700, 780);
  for (const lang of ['fr', 'en']) {
    for (const qr of [false, true]) {
      const qrImg = qr ? await qrUri(carte.qr[lang]) : null;
      const nom = `${carte.key}-${lang}-texte${qr ? '-qr' : ''}.png`;
      await shoot(carteHtml({ carte, lang, qr, photo, qrImg }), nom, { ajusterTitre: true });
    }
  }
  if (carte.nu) {
    const nu = await recadrer(carte.nu, W, H);
    await nu.jpeg({ quality: 92, mozjpeg: true }).toFile(path.join(OUT, `${carte.key}-nu.jpg`));
    rendus.push(`${carte.key}-nu.jpg`);
    const uri = await dataUri(carte.nu, W, H);
    await shoot(nuQrHtml(uri, await qrUri(carte.qr.fr, 132)), `${carte.key}-nu-qr.jpg`, { jpeg: true });
  }
  console.log(`  carte ${carte.n} · ${carte.key}`);
}

// ─── Les planches photo, légendées en français et en anglais ─────────
for (const p of PHOTOS) {
  if (!retenue(p.key)) continue;
  const spec = { fichier: p.fichier, focus: p.focus, focusX: p.focusX };
  const pleine = await supportePleinePage(spec);
  const uri = pleine ? await dataUri(spec, W, H - 176) : await dataUri(spec, 900, H);
  const html = pleine ? photoPleineHtml(p, uri) : photoDebouteHtml(p, uri);
  await shoot(html, `photo-${p.key}.jpg`, { jpeg: true });
  console.log(`  photo ${p.n} · ${p.key}${pleine ? '' : ' (format debout)'}`);
}

// ─── Les pages du site ───────────────────────────────────────────────
for (const s of SHOTS) {
  if (!retenue(s.key)) continue;
  const buf = fs.readFileSync(path.join(CAPTURES, s.capture));
  const uri = 'data:image/jpeg;base64,' + (await sharp(buf).jpeg({ quality: 92, mozjpeg: true }).toBuffer()).toString('base64');
  await shoot(shotHtml(s, uri), `${s.key}.jpg`, { jpeg: true });
  console.log(`  page ${s.n} · ${s.key}`);
}

// ─── Les mots-symboles ──────────────────────────────────────────────
if (!SEUL.length || SEUL.includes('logos')) {
  const variantes = [
    ['logos/mot-symbole-encre-sur-creme.png', { encre: C.encre, fond: C.fond }, false],
    ['logos/mot-symbole-creme-sur-encre.png', { encre: C.carte, fond: C.pied }, false],
    ['logos/mot-symbole-encre-transparent.png', { encre: C.encre, fond: 'transparent' }, true],
    ['logos/mot-symbole-creme-transparent.png', { encre: C.carte, fond: 'transparent' }, true],
  ];
  for (const [nom, opts, transparent] of variantes) {
    await shoot(motSymboleHtml(opts), nom, { transparent, hauteur: 640 });
  }
  console.log('  mots-symboles · 4 fichiers');
}

await browser.close();

/* ════════════════════════ Vignettes ════════════════════════ */

for (const nom of rendus) {
  if (nom.startsWith('logos/')) continue;
  const base = nom.replace(/\.(png|jpg)$/, '');
  await sharp(path.join(OUT, nom)).resize(640).webp({ quality: 78 }).toFile(path.join(THUMBS, `${base}.webp`));
}
console.log(`  vignettes · ${rendus.filter(n => !n.startsWith('logos/')).length} fichiers`);

/* ════════════════════════ Les textes du kit ════════════════════════ */

const T = {
  'bio-courte-fr.txt': `KRYSTINE ST-LAURENT · BIOGRAPHIE COURTE (FR)

Krystine St-Laurent est auteure, conférencière et praticienne en ayurveda.
Après dix années aux soins critiques comme infirmière d'urgence, elle a
choisi les plantes et l'ayurveda, puis l'aromathérapie, et elle consacre
depuis près de quarante ans sa pratique à l'art de vivre conscient.

Ses livres Nature & Ayurveda et Féminité & Ayurveda, parus aux Éditions de
l'Homme, ont tous deux été consacrés best-sellers en francophonie. Un
troisième titre paraît en février 2027.

krystinestlaurent.ca
`,
  'bio-courte-en.txt': `KRYSTINE ST-LAURENT · SHORT BIOGRAPHY (EN)

Krystine St-Laurent is an author, speaker and Ayurveda practitioner. After
ten years in critical care as an emergency nurse, she turned to plants,
Ayurveda and aromatherapy, and she has spent close to forty years since
then on the art of conscious living.

Her books Nature & Ayurveda and Féminité & Ayurveda, both published by
Éditions de l'Homme, became best-sellers across the French-speaking world.
A third title comes out in February 2027.

krystinestlaurent.ca
`,
  'bio-longue-fr.txt': `KRYSTINE ST-LAURENT · BIOGRAPHIE LONGUE (FR)

Krystine St-Laurent a passé dix ans aux soins critiques, comme infirmière
d'urgence, avant de quitter le système de santé conventionnel pour les
plantes et l'ayurveda, puis l'aromathérapie. Elle avait vu les coulisses,
la recherche clinique et l'urgence, et c'est de là qu'elle est partie.

Depuis près de quarante ans, elle tisse des rituels enracinés dans
l'ayurveda, les plantes, la respiration et l'écoute intérieure. Ce travail
ne suit pas les tendances : il s'inscrit dans un art de vivre conscient,
qu'elle enseigne autant sur scène que dans ses livres.

Elle a publié Nature & Ayurveda et Féminité & Ayurveda aux Éditions de
l'Homme, tous deux best-sellers en francophonie, et son troisième titre
paraît en février 2027. Elle a animé trois saisons de Santé la vie à la
télévision, et les entrevues qui ont suivi se retrouvent sur son site.

Son podcast Au-delà des tendances compte deux saisons sur Spotify. Elle
monte sur scène au Canada, aux États-Unis et en Europe avec trois
conférences signature, dont L'Ayurveda comme boussole intérieure. Elle
dirige aussi l'Expérience Origine, un parcours de douze semaines, et la
boutique Inspirata Ayurveda, dont les huiles corporelles sont formulées
pour chacun des trois doshas.

Contact : equipe@inspiratanature.com
krystinestlaurent.ca
`,
  'bio-longue-en.txt': `KRYSTINE ST-LAURENT · LONG BIOGRAPHY (EN)

Krystine St-Laurent spent ten years in critical care as an emergency nurse
before leaving conventional healthcare for plants, Ayurveda and
aromatherapy. She saw the back rooms, the clinical research and the
emergency floor, and that is where she started from.

For close to forty years she has been weaving rituals rooted in Ayurveda,
plants, breathing and inner listening. The work does not follow trends: it
belongs to an art of conscious living that she teaches on stage as much as
in her books.

She published Nature & Ayurveda and Féminité & Ayurveda with Éditions de
l'Homme, both best-sellers across the French-speaking world, and her third
title arrives in February 2027. She hosted three television seasons of
Santé la vie, and the interviews that followed are gathered on her site.

Her podcast, Beyond Trends, runs to two seasons on Spotify. She speaks
across Canada, the United States and Europe with three signature talks,
among them Ayurveda as an Inner Compass. She also leads the Origin
Experience, a twelve-week programme, and the Inspirata Ayurveda shop,
whose body oils are formulated for each of the three doshas.

Contact: equipe@inspiratanature.com
krystinestlaurent.ca
`,
  'faits-fr.txt': `KRYSTINE ST-LAURENT · LES FAITS

Métier          Auteure, conférencière et praticienne en ayurveda
Pratique        Près de quarante ans en santé holistique
Avant           Dix ans aux soins critiques, infirmière d'urgence
Livres          Nature & Ayurveda (34,99 $ CA)
                Féminité & Ayurveda (39,99 $ CA)
                Troisième titre à paraître en février 2027
Éditeur         Éditions de l'Homme
Télévision      Santé la vie, trois saisons
Podcast         Au-delà des tendances, deux saisons sur Spotify
Conférences     Au-delà des tendances
                L'Ayurveda comme boussole intérieure
                La femme et ses saisons
Formats         De soixante minutes à une demi-journée
                Présentiel, virtuel ou hybride
Scènes          Canada, États-Unis, Europe
Parcours        L'Expérience Origine, douze semaines
Boutique        Inspirata Ayurveda, huiles Vata, Pitta et Kapha
Site            krystinestlaurent.ca
Contact         equipe@inspiratanature.com
`,
  'facts-en.txt': `KRYSTINE ST-LAURENT · THE FACTS

Role            Author, speaker and Ayurveda practitioner
Practice        Close to forty years in holistic health
Before          Ten years in critical care as an emergency nurse
Books           Nature & Ayurveda (CAD 34.99)
                Féminité & Ayurveda (CAD 39.99)
                Third title due February 2027
Publisher       Éditions de l'Homme
Television      Santé la vie, three seasons
Podcast         Beyond Trends, two seasons on Spotify
Talks           Beyond Trends
                Ayurveda as an Inner Compass
                A Woman and Her Seasons
Formats         Sixty minutes to a half day
                In person, online or hybrid
Stages          Canada, United States, Europe
Programme       The Origin Experience, twelve weeks
Shop            Inspirata Ayurveda, Vata, Pitta and Kapha oils
Site            krystinestlaurent.ca
Contact         equipe@inspiratanature.com
`,
  'LISEZ-MOI.txt': `KIT DE PRESSE · KRYSTINE ST-LAURENT

Ce dossier rassemble tout ce qu'il faut pour parler de Krystine
St-Laurent : les visuels en 1920 × 1080, les planches photo, les pages du
site, les mots-symboles et les textes.

CE QUE VOUS POUVEZ FAIRE
Tout se télécharge et se publie librement, dans la presse écrite, en
ligne, à la télévision et sur les réseaux sociaux, à la seule condition de
créditer Krystine St-Laurent.

CE QU'IL VAUT MIEUX ÉVITER
Les visuels ne se recadrent pas au point de couper le nom, et les photos
gardent leurs couleurs d'origine. Si un format particulier vous manque,
écrivez-nous et nous le préparons.

COMMENT LIRE LES NOMS DE FICHIERS
  sujet-fr-texte.png        la carte en français
  sujet-fr-texte-qr.png     la même, avec son code QR
  sujet-en-texte.png        la carte en anglais
  sujet-en-texte-qr.png     la même, avec son code QR
  sujet-nu.jpg              la photo seule, sans texte
  sujet-nu-qr.jpg           la photo seule, avec le code QR
  photo-sujet.jpg           une planche photo légendée
  site-page.jpg             une page du site
  logos/                    les mots-symboles, sur crème, sur brun
                            et sur fond transparent
  textes/                   les biographies et la fiche des faits

CONTACT
equipe@inspiratanature.com
krystinestlaurent.ca/presse
`,
  'READ-ME.txt': `PRESS KIT · KRYSTINE ST-LAURENT

This folder holds everything you need to write about Krystine St-Laurent:
the 1920 × 1080 visuals, the photo plates, the pages of the site, the
wordmarks and the texts.

WHAT YOU MAY DO
Everything downloads and publishes freely, in print, online, on television
and on social media, on the single condition that Krystine St-Laurent is
credited.

WHAT TO AVOID
Please do not crop a visual so tightly that the name disappears, and
please keep the photographs in their original colours. If you need a
format that is missing here, write to us and we will prepare it.

HOW THE FILE NAMES WORK
  subject-fr-texte.png      the card in French
  subject-fr-texte-qr.png   the same, with its QR code
  subject-en-texte.png      the card in English
  subject-en-texte-qr.png   the same, with its QR code
  subject-nu.jpg            the photograph alone, no text
  subject-nu-qr.jpg         the photograph alone, with the QR code
  photo-subject.jpg         a captioned photo plate
  site-page.jpg             a page of the website
  logos/                    the wordmarks, on cream, on brown
                            and on a transparent ground
  textes/                   the biographies and the fact sheet

CONTACT
equipe@inspiratanature.com
krystinestlaurent.ca/presse
`,
  'credits.txt': `CRÉDITS · KIT DE PRESSE KRYSTINE ST-LAURENT

Photographies et visuels : Inspira Nature.
Mise en page des cartes : Vexel Webstudio.
Mention demandée : Krystine St-Laurent.

Les captures de pages montrent le site krystinestlaurent.ca tel qu'il se
présentait au moment de la fabrication de ce kit.

Toute question sur les droits : equipe@inspiratanature.com
`,
};

for (const [nom, texte] of Object.entries(T)) fs.writeFileSync(path.join(TEXTES, nom), texte, 'utf8');
console.log(`  textes · ${Object.keys(T).length} fichiers`);

/* ════════════════════════ Le zip ════════════════════════ */

fs.rmSync(path.join(OUT, ZIP), { force: true });
execFileSync('zip', ['-r', '-q', ZIP, '.', '-i', '*.png', '*.jpg', 'logos/*', 'textes/*', '-x', 'thumbs/*'], { cwd: OUT });
const poids = fs.statSync(path.join(OUT, ZIP)).size;
console.log(`\n  ${rendus.length} visuels · zip ${(poids / 1048576).toFixed(1)} Mo · public/presse/${ZIP}`);
