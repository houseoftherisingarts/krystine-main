import { chromium } from 'playwright';
const [,, base = 'https://krystinestlaurent.ca', tag = 'avant'] = process.argv;
const b = await chromium.launch();
for (const [w, h, dev] of [[1440, 900, 'desktop'], [390, 844, 'mobile']]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 600, hasTouch: w < 600, deviceScaleFactor: 2 });
  await c.addInitScript(() => { try { localStorage.setItem('krystine-lang', 'fr'); } catch {} });
  const p = await c.newPage();
  await p.goto(base + '/medias', { waitUntil: 'load' });
  await p.waitForTimeout(3500);
  const accepte = p.locator('button:has-text("J\'accepte")').first(); if (await accepte.count()) { await accepte.click({ timeout: 2000 }).catch(() => {}); }
  await p.evaluate(async () => { const pas = window.innerHeight * 0.7; for (let y = 0; y < document.body.scrollHeight; y += pas) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } });
  const el = p.locator('a.cv-foil').first();
  await el.scrollIntoViewIfNeeded();
  await p.waitForTimeout(1200);
  const m = await el.evaluate(a => { const r = a.getBoundingClientRect(); const img = a.querySelector('img').getBoundingClientRect(); const txt = a.querySelector('span[style*="column"]').getBoundingClientRect(); return { collant: [Math.round(r.width), Math.round(r.height)], logo: [Math.round(img.width), Math.round(img.height)], texte: [Math.round(txt.width), Math.round(txt.height)] }; });
  console.log(dev, JSON.stringify(m));
  const r = await el.boundingBox();
  await p.screenshot({ path: `/tmp/lives-verif/collant-${tag}-${dev}.png`, clip: { x: Math.max(0, r.x - 40), y: Math.max(0, r.y - 40), width: Math.min(w, r.width + 80), height: r.height + 80 } });
  await p.screenshot({ path: `/tmp/lives-verif/footer-${tag}-${dev}.jpg`, quality: 75 });
  await c.close();
}
await b.close();
