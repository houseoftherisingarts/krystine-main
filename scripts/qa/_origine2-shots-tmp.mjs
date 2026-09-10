import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:5199';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/b888b2c7-f098-4036-8a5d-c76540f05b53/scratchpad/shots';
mkdirSync(OUT, { recursive: true });

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

const b = await chromium.launch();
for (const vp of viewports) {
  const c = await b.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.width < 600,
    hasTouch: vp.width < 600,
    deviceScaleFactor: 2,
  });
  await c.addInitScript(() => { try { localStorage.setItem('__devAdmin', '1'); } catch {} });
  const p = await c.newPage();
  await p.goto(BASE + '/origine-2', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);

  await p.screenshot({ path: `${OUT}/${vp.name}-full.png`, fullPage: true });

  const total = await p.evaluate(() => document.body.scrollHeight);
  const steps = 6;
  for (let i = 0; i < steps; i++) {
    const y = Math.round((total - vp.height) * (i / (steps - 1)));
    await p.evaluate((yy) => window.scrollTo(0, yy), y);
    await p.waitForTimeout(600);
    await p.screenshot({ path: `${OUT}/${vp.name}-scroll-${i}.png` });
  }
  await c.close();
}
await b.close();
console.log('done');
