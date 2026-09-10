import { chromium } from 'playwright';

const BASE = 'http://localhost:5199';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/b888b2c7-f098-4036-8a5d-c76540f05b53/scratchpad/shots';

const targets = [
  { idx: 7, name: 'semaines' },
  { idx: 9, name: 'frequence' },
  { idx: 10, name: 'cloture' },
];

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
  await p.waitForTimeout(2000);
  for (const t of targets) {
    await p.locator('section').nth(t.idx).scrollIntoViewIfNeeded();
    await p.waitForTimeout(700);
    await p.screenshot({ path: `${OUT}/${vp.name}-${t.name}.png` });
  }
  await c.close();
}
await b.close();
console.log('done');
