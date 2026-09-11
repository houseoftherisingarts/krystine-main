// Vues à l'écran (pas de pleine page) à plusieurs positions de défilement,
// assemblées en une planche par appareil. node _vues.mjs <url> <prefixe> [jeton]
import { chromium } from 'playwright';
import fs from 'node:fs';
const [,, url, prefixe, jetonPath] = process.argv;
const b = await chromium.launch();
for (const [w, h, tag, pas] of [[1440, 900, 'desktop', [0, 800, 1700, 2600, 3500, 4400]], [390, 844, 'mobile', [0, 700, 1400, 2100, 2800, 3500, 4200, 4900]]]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 600, hasTouch: w < 600, deviceScaleFactor: 1 });
  const p = await c.newPage();
  if (jetonPath) {
    const token = fs.readFileSync(jetonPath, 'utf8').trim();
    const base = new URL(url).origin;
    await p.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2000);
    await p.evaluate(async (t) => {
      const src = await fetch('/src/firebase/auth.ts').then((r) => r.text());
      const u = src.match(/"([^"]*firebase_auth\.js[^"]*)"/)[1];
      const a = await import(u);
      const { auth } = await import('/src/firebase.ts');
      await a.signInWithCustomToken(auth, t);
    }, token);
    await p.waitForTimeout(1200);
  }
  await p.goto(url, { waitUntil: 'load' });
  await p.waitForTimeout(3500);
  for (const t of ["J'ACCEPTE", "J'accepte"]) { const btn = p.locator(`button:has-text("${t}")`).first(); if (await btn.count().catch(() => 0)) await btn.click({ timeout: 1500 }).catch(() => {}); }
  const buf = [];
  for (const y of pas) {
    await p.evaluate((yy) => window.scrollTo({ top: yy, behavior: 'instant' }), y);
    await p.waitForTimeout(1300);
    buf.push(await p.screenshot({ type: 'jpeg', quality: 70 }));
  }
  fs.mkdirSync(`${prefixe}-${tag}`, { recursive: true });
  buf.forEach((bf, i) => fs.writeFileSync(`${prefixe}-${tag}/${String(i).padStart(2, '0')}.jpg`, bf));
  console.log(`${prefixe}-${tag}/ (${buf.length} vues)`);
  await c.close();
}
await b.close();
