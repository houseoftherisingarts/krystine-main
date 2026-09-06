// QA ciblé : vidéos de fond (S2) et couleurs réelles (S3) des skins riches.
// Sceptique : sample les VRAIS pixels rendus (decodage PNG natif du navigateur
// via <img> + canvas), jamais la palette déclarée dans le code.
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.argv[2] || process.env.BASE || 'http://localhost:5199';
const OUT = process.argv[3] || 'scripts/qa/out-video-couleur';
fs.mkdirSync(OUT, { recursive: true });

const rgbToHsl = (r, g, b) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
};

// Seaux de couleur nommés par plage de teinte/saturation/luminosité.
const seau = (h, s, l) => {
  if (l < 0.06 || l > 0.97) return 'neutre'; // quasi noir/blanc, pas de teinte fiable
  if (s < 0.12) return 'neutre';
  if (h >= 70 && h < 170) return 'vert';
  if (h >= 170 && h < 210) return 'sarcelle';
  if (h >= 35 && h < 55 && s > 0.45 && l > 0.35) return 'or';
  if (h >= 15 && h < 45 && s >= 0.25 && s <= 0.6 && l >= 0.12 && l <= 0.38) return 'brun';
  if (h >= 8 && h < 35) return 'orange';
  if ((h >= 300 && h <= 360) || (h >= 0 && h < 20)) return 'rose';
  return 'autre';
};

const histogramme = async (page) => page.evaluate(() => new Promise((resolve) => {
  const img = document.querySelector('#qa-sample-img');
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  resolve(Array.from(d));
}));

const analyserCapture = async (page, buffer) => {
  const b64 = buffer.toString('base64');
  await page.evaluate((b64) => new Promise((res, rej) => {
    let img = document.getElementById('qa-sample-img');
    if (!img) { img = document.createElement('img'); img.id = 'qa-sample-img'; document.body.appendChild(img); }
    img.onload = res; img.onerror = rej;
    img.src = 'data:image/png;base64,' + b64;
  }), b64);
  const pixels = await histogramme(page);
  const comptes = {};
  let total = 0;
  for (let i = 0; i < pixels.length; i += 4 * 7) { // échantillon 1 pixel sur 7
    const [h, s, l] = rgbToHsl(pixels[i], pixels[i + 1], pixels[i + 2]);
    total++;
    // inline seau since function above is node-scope; recompute here
  }
  return pixels;
};

const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { try { localStorage.setItem('inspirata.consent.v1', 'rejected'); } catch {} });
const page = await ctx.newPage();

const rapport = {};

// ── S2 : les cinq skins vidéo ────────────────────────────────────────────────
const VIDEO_SKINS = ['vata', 'pitta', 'kapha', 'golden-hour', 'aurore'];
for (const skin of VIDEO_SKINS) {
  const requetesMp4 = [];
  const onResp = (resp) => { if (/\/compte\/skins\/.+\.mp4/.test(resp.url())) requetesMp4.push({ url: resp.url(), status: resp.status() }); };
  page.on('response', onResp);
  await page.goto(`${BASE}/demo-skins?skin=${skin}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  const etatVideo = await page.evaluate(() => {
    const v = document.querySelector('video.skin-video');
    if (!v) return null;
    return { readyState: v.readyState, paused: v.paused, currentTime: v.currentTime, src: v.currentSrc, videoWidth: v.videoWidth, videoHeight: v.videoHeight };
  });
  page.off('response', onResp);
  rapport[skin] = { requetesMp4, etatVideo };
  console.log(skin, JSON.stringify({ requetesMp4, etatVideo }));
}

// ── S3 : couleurs réelles (golden-hour, teal-orange, feminite) ──────────────
const seauCompte = (buf) => {
  const c = {};
  for (let i = 0; i < buf.length; i += 4 * 5) {
    const [h, s, l] = rgbToHsl(buf[i], buf[i + 1], buf[i + 2]);
    const k = seau(h, s, l);
    c[k] = (c[k] || 0) + 1;
  }
  return c;
};

for (const skin of ['golden-hour', 'teal-orange', 'feminite']) {
  await page.goto(`${BASE}/demo-skins?skin=${skin}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  const buf = await page.screenshot();
  fs.writeFileSync(`${OUT}/${skin}-couleur.png`, buf);
  const pixels = await analyserCapture(page, buf);
  const comptes = seauCompte(pixels);
  const total = Object.values(comptes).reduce((a, b) => a + b, 0);
  const pct = Object.fromEntries(Object.entries(comptes).map(([k, v]) => [k, +((v / total) * 100).toFixed(1)]));
  rapport[`couleur-${skin}`] = pct;
  console.log(skin, 'couleurs %:', JSON.stringify(pct));
}

// ── S3 : aurore ondulante, deux captures 2s d'écart ─────────────────────────
await page.goto(`${BASE}/demo-skins?skin=aurore`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
const a = await page.screenshot();
fs.writeFileSync(`${OUT}/aurore-t1.png`, a);
await page.waitForTimeout(2000);
const b = await page.screenshot();
fs.writeFileSync(`${OUT}/aurore-t2.png`, b);
const pxA = await analyserCapture(page, a);
const pxB = await analyserCapture(page, b);
let diffSum = 0, n = 0;
for (let i = 0; i < Math.min(pxA.length, pxB.length); i += 4 * 11) {
  diffSum += Math.abs(pxA[i] - pxB[i]) + Math.abs(pxA[i + 1] - pxB[i + 1]) + Math.abs(pxA[i + 2] - pxB[i + 2]);
  n++;
}
const diffMoyen = diffSum / (n * 3);
rapport['aurore-diff'] = diffMoyen;
console.log('aurore diff moyen par canal (0-255):', diffMoyen.toFixed(2));

fs.writeFileSync(`${OUT}/rapport.json`, JSON.stringify(rapport, null, 2));
await nav.close();
