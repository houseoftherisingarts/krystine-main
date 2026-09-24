// Captures pleine page de /origine-2 et /cours/origine2 (admin dev), 1440 et 390.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const OUT = process.argv[2] || 'scripts/qa/out/origine2';
mkdirSync(OUT, { recursive: true });
const pages = [['fondatrice', '/cours/origine-fondatrice?apercu']];
const b = await chromium.launch();
for (const [nom, route] of pages) {
  for (const w of [1440, 390]) {
    const c = await b.newContext({ viewport: { width: w, height: w > 600 ? 900 : 844 }, isMobile: w < 600, hasTouch: w < 600, deviceScaleFactor: 1 });
    await c.addInitScript(() => { try { localStorage.setItem('__devAdmin', '1'); localStorage.setItem('krystine-lang', 'fr'); } catch {} });
    const p = await c.newPage();
    p.on('pageerror', e => console.log('ERREUR', nom, String(e).slice(0, 150)));
    await p.goto('http://localhost:5199' + route, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(5000);
    // réveiller les reveals au scroll
    const h = await p.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < h; y += 700) { await p.evaluate(v => window.scrollTo(0, v), y); await p.waitForTimeout(220); }
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.waitForTimeout(800);
    const f = `${OUT}/${nom}-${w}.png`;
    await p.screenshot({ path: `${OUT}/${nom}-${w}-ecran.png` });
    await p.screenshot({ path: f, fullPage: true });
    console.log(f, 'url finale :', p.url(), 'hauteur :', await p.evaluate(() => document.body.scrollHeight));
    await c.close();
  }
}
await b.close();
