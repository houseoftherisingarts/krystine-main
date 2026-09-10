import { chromium } from 'playwright';
const vues = [
  ['/evenements', 1440, 900, 0],
  ['/evenements', 390, 844, 0],
  ['/evenement/essai-billetterie', 1440, 900, 0],
  ['/evenement/essai-billetterie', 1440, 900, 1600],
  ['/evenement/essai-billetterie', 390, 844, 0],
];
const b = await chromium.launch();
for (const [route, w, h, y] of vues) {
  const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 600, hasTouch: w < 600 });
  await c.addInitScript(() => { try { localStorage.setItem('__devAdmin','1'); localStorage.setItem('krystine-lang','fr'); } catch {} });
  const p = await c.newPage();
  p.on('pageerror', e => console.log('ERREUR', route, String(e).slice(0,160)));
  await p.goto('http://localhost:5199' + route, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(4200);
  if (y) { await p.evaluate(v => window.scrollTo(0, v), y); await p.waitForTimeout(1400); }
  const nom = `/tmp/bil-${route.replace(/\//g,'_')}-${w}-${y}.png`;
  await p.screenshot({ path: nom });
  console.log(nom);
  await c.close();
}
await b.close();
