import { chromium } from 'playwright';
const [,, url, prefixe] = process.argv;
const b = await chromium.launch();
for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'mobile']]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 600, hasTouch: w < 600 });
  const p = await c.newPage();
  await p.goto(url, { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  for (const t of ["J'ACCEPTE", "J'accepte"]) { const btn = p.locator(`button:has-text("${t}")`).first(); if (await btn.count().catch(() => 0)) await btn.click({ timeout: 1500 }).catch(() => {}); }
  await p.evaluate(async () => { const pas = window.innerHeight * 0.6; for (let y = 0; y < document.body.scrollHeight; y += pas) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 220)); } window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 600)); });
  await p.screenshot({ path: `${prefixe}-${tag}.jpg`, fullPage: true, quality: 72 });
  console.log(`${prefixe}-${tag}.jpg`);
  await c.close();
}
await b.close();
