import { chromium } from 'playwright';
const BASE = 'http://localhost:5199';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/b888b2c7-f098-4036-8a5d-c76540f05b53/scratchpad';
const b = await chromium.launch();
for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'mobile']]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 600, hasTouch: w < 600, deviceScaleFactor: 2 });
  const p = await c.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(`${BASE}/admin?unlock=Alexisthebest2121!`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await p.goto(`${BASE}/admin/habitudes`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3000);
  await p.screenshot({ path: `${OUT}/habitudes-${tag}.png`, fullPage: true });
  if (tag === 'desktop') {
    // Exercise the search box with something harmless to see the results list render.
    const input = p.locator('input[type="search"]');
    if (await input.count() > 0) {
      await input.fill('a');
      await p.waitForTimeout(500);
      await p.screenshot({ path: `${OUT}/habitudes-${tag}-recherche.png`, fullPage: true });
    }
  }
  console.log(`[${tag}] console/page errors:`, JSON.stringify(errs.slice(0, 20)));
  await c.close();
}
await b.close();
