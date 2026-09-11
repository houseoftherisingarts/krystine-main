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
  // Écarter les fenêtres qui couvrent la page (témoins, mot de bienvenue du
  // jeu) : elles cachent ce qu'on vient justement regarder.
  for (const texte of ["J'ACCEPTE", "J'accepte", 'Commencer', 'Fermer', 'Compris']) {
    const b = p.locator(`button:has-text("${texte}")`).first();
    if (await b.count().catch(() => 0)) { await b.click({ timeout: 1500 }).catch(() => {}); await p.waitForTimeout(400); }
  }
  await p.keyboard.press('Escape').catch(() => {});
  // Ce qui couvre encore l'écran se retire du DOM le temps de la capture :
  // c'est un geste de photographe, le site n'est pas modifié.
  await p.evaluate(() => {
    for (const el of document.querySelectorAll('body *')) {
      const s = getComputedStyle(el);
      if (s.position !== 'fixed') continue;
      const r = el.getBoundingClientRect();
      if (r.width > window.innerWidth * 0.55 && r.height > window.innerHeight * 0.45) el.remove();
    }
  });
  await p.waitForTimeout(800);
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
