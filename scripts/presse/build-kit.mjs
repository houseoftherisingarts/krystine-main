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
// ne vaut plus rien pour une journaliste qui l'imprime. Deux sorties
// existent quand une source est trop étroite pour remplir un 16:9, et
// aucune des deux ne rétrécit la photo dans une colonne, parce que la
// formule Prisket veut le cadre plein : une carte reçoit un lit flou de
// la même image sous son voile de texte, une planche accepte d'être
// agrandie un peu plus fort pour que les six sortent au même format.

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
async function recadrer(spec, l, h, max = AGRANDISSEMENT_MAX) {
  const chemin = source(spec);
  const meta = await sharp(chemin).metadata();
  const format = l / h;
  let cw = meta.width;
  let ch = Math.round(cw / format);
  if (ch > meta.height) { ch = meta.height; cw = Math.round(ch * format); }
  const gauche = Math.round(borne((spec.focusX ?? 0.5) * meta.width - cw / 2, 0, meta.width - cw));
  const haut = Math.round(borne((spec.focus ?? 0.5) * meta.height - ch / 2, 0, meta.height - ch));
  const facteur = l / cw;
  if (facteur > max) {
    throw new Error(`${spec.fichier || spec.capture} : il faudrait l'agrandir ${facteur.toFixed(2)} fois pour un ${l} × ${h}`);
  }
  return sharp(chemin)
    .extract({ left: gauche, top: haut, width: cw, height: ch })
    .resize(l, h, { kernel: 'lanczos3' })
    .flatten({ background: C.fond });
}

/** La largeur du fondu qui noie le bord de la photo dans le lit flou. */
const FONDU = 220;

/**
 * Un masque blanc qui s'efface sur un bord, sur les deux, ou sur aucun.
 * Sharp le pose en `dest-in` : la photo garde son opacité là où le masque
 * est blanc et disparaît là où il est transparent.
 */
function masqueFondu(l, h, aGauche, aDroite) {
  const p = FONDU / l;
  const arrets = [`<stop offset="0" stop-color="#fff" stop-opacity="${aGauche ? 0 : 1}"/>`];
  if (aGauche) arrets.push(`<stop offset="${p.toFixed(4)}" stop-color="#fff" stop-opacity="1"/>`);
  if (aDroite) arrets.push(`<stop offset="${(1 - p).toFixed(4)}" stop-color="#fff" stop-opacity="1"/>`);
  arrets.push(`<stop offset="1" stop-color="#fff" stop-opacity="${aDroite ? 0 : 1}"/>`);
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${l}" height="${h}">` +
    `<defs><linearGradient id="f" x1="0" y1="0" x2="1" y2="0">${arrets.join('')}</linearGradient></defs>` +
    `<rect width="${l}" height="${h}" fill="url(#f)"/></svg>`,
  );
}

/**
 * Le fond plein cadre d'une carte ou d'une planche, en l × h.
 *
 * Quand la source est assez large, c'est le recadrage net et rien
 * d'autre : la photo occupe le cadre d'un bord à l'autre, comme le veut
 * la formule Prisket. Quand elle est trop étroite pour ça, un portrait
 * debout par exemple, on ne la rétrécit pas dans une colonne avec un bloc
 * de texte à côté, parce que c'est justement la construction que Krystine
 * a écartée : la photo garde sa hauteur et sa netteté, et le reste du
 * cadre reçoit la même image agrandie puis floutée, si bien que le cadre
 * reste photographique d'un bout à l'autre. Le bord de la photo nette se
 * perd dans un fondu d'opacité, sans quoi l'œil attrape la couture.
 *
 * `ancrage` dit où se pose la photo nette : au centre pour une planche,
 * du côté laissé libre par le voile de texte pour une carte.
 */
async function fondPleinCadre(spec, l, h, ancrage = 'centre') {
  const chemin = source(spec);
  const meta = await sharp(chemin).metadata();
  const format = l / h;
  let cw = meta.width;
  let ch = Math.round(cw / format);
  if (ch > meta.height) { ch = meta.height; cw = Math.round(ch * format); }
  if (l / cw <= AGRANDISSEMENT_MAX) return recadrer(spec, l, h);

  const lit = await sharp(chemin)
    .resize(l, h, { fit: 'cover', position: 'center', kernel: 'lanczos3' })
    .blur(44)
    .modulate({ brightness: 0.74 })
    .flatten({ background: C.fond })
    .toBuffer();

  const nl = Math.min(l, Math.round(meta.width * (h / meta.height)));
  const gauche = ancrage === 'gauche' ? 0 : ancrage === 'droite' ? l - nl : Math.round((l - nl) / 2);
  const nette = await sharp(chemin)
    .resize(nl, h, { fit: 'cover', position: 'center', kernel: 'lanczos3' })
    .flatten({ background: C.fond })
    .ensureAlpha()
    .composite([{ input: masqueFondu(nl, h, gauche > 0, gauche + nl < l), blend: 'dest-in' }])
    .png()
    .toBuffer();

  return sharp(lit).composite([{ input: nette, left: gauche, top: 0 }]);
}

async function dataUri(spec, l, h, ancrage) {
  const buf = await (await fondPleinCadre(spec, l, h, ancrage)).jpeg({ quality: 94, mozjpeg: true }).toBuffer();
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
  .ombre{text-shadow:0 1px 2px rgba(0,0,0,.92),0 0 6px rgba(0,0,0,.78),0 0 20px rgba(0,0,0,.5)}
  ${css}
</style></head><body>${corps}</body></html>`;
}

/* ════════════════════════ La carte plein cadre ════════════════════════ */

/**
 * Le voile brun qui porte le texte d'une carte. Une rampe droite laisse
 * une arête verticale en travers de la photo, parce que l'œil attrape la
 * cassure de pente même quand l'opacité passe par plusieurs paliers. Le
 * lissage de Perlin (6t⁵ − 15t⁴ + 10t³) a une dérivée nulle aux deux
 * bouts, donc le voile naît et meurt sans bord. La couleur est l'encre
 * presque noire du canon, jamais un brun de terre posé sur la photo, et
 * la photo garde ses couleurs d'origine dessous.
 */
const VOILE_LARGEUR = 58;
// Le voile reste plein jusqu'au bord du texte, et ne s'éteint qu'au-delà,
// sur les quatre cents pixels qui le séparent de la photo. Un voile qui
// s'allégeait déjà sous la première colonne de mots laissait le crème
// tomber sur du crème dès que la photo était claire à cet endroit, et la
// carte des trois livres, posés sur un fond de papier, le montrait sans
// discussion. La fraction se calcule sur la géométrie ci-dessous : le
// texte commence à 420 px du bord intérieur d'un bandeau de 1114 px.
const VOILE_PLEIN = 0.62;
function voile(sens, a0 = 0.9, paliers = 18) {
  const lisse = (x) => x * x * x * (x * (x * 6 - 15) + 10);
  const arrets = [];
  for (let i = 0; i <= paliers; i += 1) {
    const t = i / paliers;
    const a = t <= VOILE_PLEIN ? a0 : a0 * (1 - lisse((t - VOILE_PLEIN) / (1 - VOILE_PLEIN)));
    arrets.push(`rgba(28,23,18,${a.toFixed(4)}) ${(t * 100).toFixed(2)}%`);
  }
  return `linear-gradient(to ${sens}, ${arrets.join(', ')})`;
}

/**
 * Le socle assombrit le bas du cadre sur toute la largeur. Sans lui, les
 * deux lignes de pied et le mot-symbole se perdent dès que la photo est
 * claire à cet endroit, et la page des livres posés sur un fond crème le
 * montrait sans discussion. L'ombre portée du texte ne suffit pas sur du
 * blanc : il faut abaisser la valeur du fond lui-même, ce que fait ce
 * dégradé plein en bas puis éteint en courbe douce, comme le voile.
 */
const SOCLE_HAUTEUR = 300;
const SOCLE_PLEIN = 0.3;
function socle(a0 = 0.72, paliers = 16) {
  const lisse = (x) => x * x * x * (x * (x * 6 - 15) + 10);
  const arrets = [];
  for (let i = 0; i <= paliers; i += 1) {
    const t = i / paliers;
    const a = t <= SOCLE_PLEIN ? a0 : a0 * (1 - lisse((t - SOCLE_PLEIN) / (1 - SOCLE_PLEIN)));
    arrets.push(`rgba(28,23,18,${a.toFixed(4)}) ${(t * 100).toFixed(2)}%`);
  }
  return `<div style="position:absolute;left:0;right:0;bottom:0;height:${SOCLE_HAUTEUR}px;background:linear-gradient(to top, ${arrets.join(', ')})"></div>`;
}

/** Le coin bas gauche : le code QR quand il y en a un, puis les deux lignes de pied. */
const coin = (qrImg, adresse) => `
  <div style="position:absolute;left:78px;bottom:52px;display:flex;align-items:flex-end;gap:26px">
    ${qrImg ? `<img class="qr" src="${qrImg}" style="width:150px;height:150px;display:block;padding:10px;background:${C.carte};box-shadow:0 2px 14px rgba(0,0,0,.5)">` : ''}
    <div>
      <p class="ombre" style="font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:.3em;color:rgba(244,239,230,.8)">Inspira Nature · Québec · MMXXVI</p>
      <p class="ombre" style="margin-top:10px;font-size:13px;font-weight:500;text-transform:uppercase;letter-spacing:.3em;color:#BA7B39">${adresse}</p>
    </div>
  </div>`;

/** Le mot-symbole en bas à droite, la seule signature que le site possède. */
const signature = `
  <div style="position:absolute;right:78px;bottom:52px;text-align:right">
    <p class="mot ombre" style="font-size:26px;color:rgba(244,239,230,.94)">Krystine St-Laurent</p>
  </div>`;

/** La hauteur du coin, pour que le texte du voile s'arrête au-dessus. */
const hauteurCoin = (qrImg) => (qrImg ? 170 : 52);

function carteHtml({ carte, lang, qr, photo, qrImg }) {
  const t = carte[lang];
  // `cote` dit où se tient la photo : le voile de texte prend l'autre moitié.
  const voileCote = carte.cote === 'gauche' ? 'droite' : 'gauche';
  // Le coin bas gauche et la signature bas droite mangent le pied du voile
  // quand ils tombent du même côté : le texte remonte pour leur laisser la place.
  const bas = voileCote === 'gauche' ? 52 + hauteurCoin(qrImg) + 44 : 158;
  const css = `
  .voile{position:absolute;top:0;bottom:0;width:${VOILE_LARGEUR}%;display:flex;flex-direction:column;justify-content:center}
  .voile.gauche{left:0;padding:104px 420px ${bas}px 92px;background:${voile('right')}}
  .voile.droite{right:0;padding:104px 92px ${bas}px 420px;background:${voile('left')}}
  .v-kicker{font-size:14px;font-weight:500;text-transform:uppercase;letter-spacing:.42em;color:${C.laiton}}
  .v-titre{font-family:Fraunces,Georgia,serif;font-weight:300;font-size:74px;line-height:1.08;letter-spacing:-.014em;color:${C.fond};margin-top:30px}
  .v-filet{width:76px;height:1px;background:${C.laiton};opacity:.85;margin:34px 0 30px}
  .v-corps{font-size:29px;font-weight:300;line-height:1.56;color:rgba(244,239,230,.84);text-wrap:pretty}
  .v-meta{margin-top:42px;font-size:13px;font-weight:500;text-transform:uppercase;letter-spacing:.3em;color:rgba(186,123,57,.95);text-wrap:pretty}`;
  return shell(`
    <img src="${photo}" style="position:absolute;inset:0;width:${W}px;height:${H}px;object-fit:cover">
    ${socle()}
    <div class="voile ${voileCote}">
      <p class="v-kicker ombre">${t.kicker}</p>
      <h1 class="v-titre ombre" id="titre">${t.titre}</h1>
      <span class="v-filet"></span>
      <p class="v-corps ombre">${t.corps}</p>
      <p class="v-meta ombre">${t.meta}</p>
    </div>
    ${coin(qr ? qrImg : null, 'krystinestlaurent.ca/presse')}
    ${signature}
  `, css);
}

/**
 * La pastille crème du code QR, posée sur la photo au-dessus du bandeau.
 * Elle sert aux variantes « Version QR » des planches et des pages, comme
 * elle sert déjà à la photo seule des cartes.
 */
const pastille = (qrImg, bas) => (qrImg ? `
  <div style="position:absolute;right:56px;bottom:${bas}px;background:${C.carte};padding:20px 20px 14px;border:1px solid rgba(156,122,68,.5);text-align:center">
    <img class="qr" src="${qrImg}" style="width:126px;height:126px;display:block">
    <p class="pied" style="margin-top:11px;font-size:9.5px;letter-spacing:.24em">krystinestlaurent.ca</p>
  </div>` : '');

/** La planche photo pleine page : photo au bord, bandeau crème en bas. */
function photoPleineHtml(p, uri, qrImg) {
  return shell(`
    <img src="${uri}" style="position:absolute;inset:0;width:${W}px;height:${H}px;object-fit:cover">
    ${pastille(qrImg, 176 + 40)}
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

/** Une page du site, pleine toile, sous un bandeau crème. */
function shotHtml(s, uri, qrImg) {
  return shell(`
    <img src="${uri}" style="position:absolute;inset:0;width:${W}px;height:${H}px;object-fit:cover">
    ${pastille(qrImg, 136 + 40)}
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

/** La photo seule : le cadre plein et rien d'autre, sans un mot dessus. */
function nuHtml(uri) {
  return shell(`<img src="${uri}" style="position:absolute;inset:0;width:${W}px;height:${H}px;object-fit:cover">`);
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
    // police d'un pixel à la fois, et si elle descend sous 42 px sans y
    // arriver, c'est la copie qu'il faut raccourcir.
    const reste = await page.evaluate(() => {
      const el = document.getElementById('titre');
      if (!el) return 0;
      const lignes = () => Math.round(el.offsetHeight / parseFloat(getComputedStyle(el).lineHeight));
      for (let taille = parseFloat(getComputedStyle(el).fontSize); taille >= 42; taille -= 1) {
        el.style.fontSize = `${taille}px`;
        if (lignes() <= 2) return lignes();
      }
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
  // La photo tient tout le cadre, et le voile de texte se pose du côté
  // opposé : c'est elle qui décide où la photo nette s'ancre quand la
  // source est trop étroite pour remplir le 16:9 toute seule.
  const photo = await dataUri(carte.fond || carte.nu || carte.src, W, H, carte.cote);
  for (const lang of ['fr', 'en']) {
    for (const qr of [false, true]) {
      const qrImg = qr ? await qrUri(carte.qr[lang], 150) : null;
      const nom = `${carte.key}-${lang}-texte${qr ? '-qr' : ''}.png`;
      await shoot(carteHtml({ carte, lang, qr, photo, qrImg }), nom, { ajusterTitre: true });
    }
  }
  if (carte.nu) {
    const nu = await fondPleinCadre(carte.nu, W, H);
    await nu.jpeg({ quality: 92, mozjpeg: true }).toFile(path.join(OUT, `${carte.key}-nu.jpg`));
    rendus.push(`${carte.key}-nu.jpg`);
    const uri = await dataUri(carte.nu, W, H);
    await shoot(nuQrHtml(uri, await qrUri(carte.qr.fr, 132)), `${carte.key}-nu-qr.jpg`, { jpeg: true });
  }
  console.log(`  carte ${carte.n} · ${carte.key}`);
}

// ─── Les planches photo, légendées en français et en anglais ─────────
// Les quatre gestes de la formule veulent quatre fichiers par planche :
// la photo légendée, la même avec son code QR, la photo seule et la photo
// seule à code QR. Toutes partent du même cadre plein, si bien que « Photo
// seule » montre bien la même image, le texte en moins.
for (const p of PHOTOS) {
  if (!retenue(p.key)) continue;
  const spec = { fichier: p.fichier, focus: p.focus, focusX: p.focusX };
  // Une planche est la photographie brute, plein cadre, et rien d'autre :
  // pas de lit flou sur les côtés comme en portent les cartes, puisqu'ici
  // aucun voile de texte ne viendrait le couvrir. Deux des six sources
  // sont des portraits debout qu'il faut donc agrandir davantage, jusqu'à
  // deux fois et un peu, et `focus` sert à garder le visage dans la
  // fenêtre plutôt qu'à sauver des pixels. La planche reste utilisable à
  // la reproduction où une photo de presse se publie, et c'est le prix à
  // payer pour que les six planches sortent toutes au même format.
  const uri = 'data:image/jpeg;base64,' + (await (await recadrer(spec, W, H, 2.2))
    .jpeg({ quality: 94, mozjpeg: true }).toBuffer()).toString('base64');
  const qrImg = await qrUri(p.chemin, 126);
  await shoot(photoPleineHtml(p, uri), `photo-${p.key}.jpg`, { jpeg: true });
  await shoot(photoPleineHtml(p, uri, qrImg), `photo-${p.key}-qr.jpg`, { jpeg: true });
  await shoot(nuHtml(uri), `photo-${p.key}-nu.jpg`, { jpeg: true });
  await shoot(nuQrHtml(uri, await qrUri(p.chemin, 132)), `photo-${p.key}-nu-qr.jpg`, { jpeg: true });
  console.log(`  photo ${p.n} · ${p.key}`);
}

// ─── Les pages du site ───────────────────────────────────────────────
for (const s of SHOTS) {
  if (!retenue(s.key)) continue;
  const buf = fs.readFileSync(path.join(CAPTURES, s.capture));
  const uri = 'data:image/jpeg;base64,' + (await sharp(buf).jpeg({ quality: 92, mozjpeg: true }).toBuffer()).toString('base64');
  const qrImg = await qrUri(s.chemin, 126);
  await shoot(shotHtml(s, uri), `${s.key}.jpg`, { jpeg: true });
  await shoot(shotHtml(s, uri, qrImg), `${s.key}-qr.jpg`, { jpeg: true });
  await shoot(nuHtml(uri), `${s.key}-nu.jpg`, { jpeg: true });
  await shoot(nuQrHtml(uri, await qrUri(s.chemin, 132)), `${s.key}-nu-qr.jpg`, { jpeg: true });
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
