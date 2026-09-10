import { chromium } from 'playwright';
const vues = [[1440, 900, 0], [1440, 900, 900], [1440, 900, 3200], [390, 844, 0], [390, 844, 1400]];
const b = await chromium.launch();
for (const [w, h, y] of vues) {
  const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 600, hasTouch: w < 600 });
  await c.addInitScript(() => { try { localStorage.setItem('__devAdmin','1'); localStorage.setItem('krystine-lang','fr'); } catch {} });
  const p = await c.newPage();
  p.on('pageerror', e => console.log('ERREUR', String(e).slice(0,150)));
  await p.goto('http://localhost:5199/origine-2', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(5200);
  if (y) { await p.evaluate(v => window.scrollTo(0, v), y); await p.waitForTimeout(1600); }
  const nom = `/tmp/o2-${w}-${y}.png`;
  await p.screenshot({ path: nom });
  console.log(nom);
  await c.close();
}
await b.close();
