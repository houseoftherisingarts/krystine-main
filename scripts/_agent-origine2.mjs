import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = 'http://localhost:3033';
const OUT = 'scripts/qa/shots';
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();

// 1) La carte sur /cours, 1440 et 390.
for (const w of [1440, 390]) {
  const c = await b.newContext({ viewport: { width: w, height: 1200 }, isMobile: w < 600, hasTouch: w < 600, deviceScaleFactor: w < 600 ? 2 : 1 });
  const p = await c.newPage();
  await p.goto(BASE + '/cours', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/origine2-carte-${w}.png`, fullPage: true });
  console.log('capturé origine2-carte-' + w);
  await c.close();
}

// 2) La redirection : /cours/kajabi-2149503901 (déconnecté) doit atterrir sur /origine, sans liste de leçons.
for (const w of [1440, 390]) {
  const c = await b.newContext({ viewport: { width: w, height: 1200 }, isMobile: w < 600, hasTouch: w < 600, deviceScaleFactor: w < 600 ? 2 : 1 });
  const p = await c.newPage();
  await p.goto(BASE + '/cours/kajabi-2149503901', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2000);
  console.log('URL finale ' + w + ':', p.url());
  await p.screenshot({ path: `${OUT}/origine2-redirection-${w}.png`, fullPage: true });
  console.log('capturé origine2-redirection-' + w);
  await c.close();
}

await b.close();
