import { chromium } from 'playwright';
const BASE = 'http://localhost:5211';
const OUT = '/tmp/claude-501/-Users-lesalondesinconnus/f1ba3356-af94-4af8-a872-ab355b8df665/scratchpad';
const b = await chromium.launch();
for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'mobile']]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 600, hasTouch: w < 600, deviceScaleFactor: 2 });
  const p = await c.newPage();
  const err = [];
  p.on('pageerror', e => err.push(String(e).slice(0, 140)));
  await p.goto(`${BASE}/?unlock=Alexisthebest2121!`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  await p.goto(`${BASE}/admin/droit-international`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(4000);
  await p.screenshot({ path: `${OUT}/droit-${tag}-1.jpg`, fullPage: true, quality: 70 });
  // déplier chaque dossier, un par un, avec scroll
  const cartes = p.locator('div.rounded-\\[20px\\] button[aria-expanded]');
  const n = await cartes.count();
  for (let i = 0; i < n; i++) {
    const btn = cartes.nth(i);
    if ((await btn.getAttribute('aria-expanded')) === 'false') {
      await btn.scrollIntoViewIfNeeded();
      await btn.click({ timeout: 8000 });
      await p.waitForTimeout(200);
    }
  }
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${OUT}/droit-${tag}-2.jpg`, fullPage: true, quality: 70 });
  const m = await p.evaluate(() => {
    const de = document.documentElement;
    const trop = [...document.querySelectorAll('h3,h4')].filter(e => e.getBoundingClientRect().height > parseFloat(getComputedStyle(e).lineHeight) * 2.2).map(e => e.textContent.slice(0, 50));
    return { debordement: de.scrollWidth - de.clientWidth, hauteur: de.scrollHeight, titresTropLongs: trop };
  });
  console.log(JSON.stringify({ tag, cartes: n, ...m, err }));
  await c.close();
}
await b.close();
