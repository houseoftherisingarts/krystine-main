// Capture temporaire pour vérifier : Expérience Origine 2 en liste d'attente,
// « Formations à découvrir », la nouvelle masterclass. Supprimé après usage.
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = 'http://localhost:3033';
const OUT = 'scripts/qa/shots';
fs.mkdirSync(OUT, { recursive: true });

const views = [
  { route: '/formations', w: 1440, h: 1400, name: 'formations-1440' },
  { route: '/formations', w: 390, h: 1600, name: 'formations-390' },
  { route: '/cours', w: 1440, h: 1400, name: 'cours-1440' },
  { route: '/cours', w: 390, h: 1600, name: 'cours-390' },
  { route: '/cours/masterclass-gestion-stress', w: 1440, h: 1400, name: 'masterclass-1440' },
  { route: '/cours/masterclass-gestion-stress', w: 390, h: 1600, name: 'masterclass-390' },
];

const browser = await chromium.launch();
for (const v of views) {
  const ctx = await browser.newContext({
    viewport: { width: v.w, height: v.h },
    isMobile: v.w < 600,
    hasTouch: v.w < 600,
    deviceScaleFactor: v.w < 600 ? 2 : 1,
  });
  const page = await ctx.newPage();
  await page.goto(BASE + v.route, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/${v.name}.png`, fullPage: true });
  await ctx.close();
  console.log('capturé', v.name);
}
await browser.close();
