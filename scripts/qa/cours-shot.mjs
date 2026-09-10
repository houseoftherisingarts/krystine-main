import { chromium } from 'playwright';
import fs from 'node:fs';
const [,, route, prefixe] = process.argv;
const BASE = process.env.BASE || 'http://localhost:5200';
const token = fs.readFileSync(process.env.JETON, 'utf8').trim();
const b = await chromium.launch();
for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'mobile']]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 600, hasTouch: w < 600, deviceScaleFactor: 1 });
  const p = await c.newPage();
  await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  await p.evaluate(async (t) => {
    const src = await fetch('/src/firebase/auth.ts').then((r) => r.text());
    const url = src.match(/"([^"]*firebase_auth\.js[^"]*)"/)[1];
    const a = await import(url);
    const { auth } = await import('/src/firebase.ts');
    await a.signInWithCustomToken(auth, t);
  }, token);
  await p.waitForTimeout(1500);
  await p.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(4000);
  // Faire défiler toute la page : les sections se révèlent au scroll
  // (whileInView), et une capture fullPage seule ne les déclenche jamais.
  await p.evaluate(async () => {
    const pas = window.innerHeight * 0.6;
    for (let y = 0; y < document.body.scrollHeight; y += pas) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 260));
    }
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 700));
  });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${prefixe}-${tag}.jpg`, fullPage: true, quality: 72 });
  console.log(`${prefixe}-${tag}.jpg`);
  await c.close();
}
await b.close();
