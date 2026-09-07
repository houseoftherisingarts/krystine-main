// Capture d'une section de l'admin avec le vrai compte admin et les vraies
// données (1440 et 390). Le jeton vient de admin-jeton.mjs. Le serveur Vite
// doit tourner (npx vite --port 5199) : la connexion passe par les modules
// que Vite sert, donc la même instance Firebase que l'application.
//   JETON=/tmp/jeton.txt node scripts/qa/admin-shot.mjs /admin "Nouveaux membres par jour" scripts/qa/shots/membres
import { chromium } from 'playwright';
import fs from 'node:fs';
const [,, route = '/admin', titre = '', prefixe = 'scripts/qa/shots/admin'] = process.argv;
const BASE = process.env.BASE || 'http://localhost:5199';
const token = fs.readFileSync(process.env.JETON, 'utf8').trim();
const b = await chromium.launch();
for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'mobile']]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 600, hasTouch: w < 600, deviceScaleFactor: 2 });
  const p = await c.newPage();
  p.on('response', (r) => { if (r.status() >= 400 && r.url().includes('googleapis')) console.log(`[${tag}] ${r.status()} ${r.url().slice(0, 120)}`); });
  await p.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2000);
  await p.evaluate(async (t) => {
    const src = await fetch('/src/firebase/auth.ts').then((r) => r.text());
    const url = src.match(/"([^"]*firebase_auth\.js[^"]*)"/)[1];
    const a = await import(url);
    const { auth } = await import('/src/firebase.ts');
    await a.signInWithCustomToken(auth, t);
  }, token);
  if (titre) await p.waitForSelector(`text=${titre}`, { timeout: 30000 });
  await p.waitForTimeout(4000);
  await p.screenshot({ path: `${prefixe}-${tag}-page.jpg`, fullPage: true, quality: 70 });
  if (titre) {
    const carte = p.locator(`h3:has-text("${titre}")`).locator('xpath=ancestor::div[contains(@class,"rounded-[20px]")][1]');
    await carte.scrollIntoViewIfNeeded();
    await carte.screenshot({ path: `${prefixe}-${tag}-carte.png` });
  }
  await c.close();
}
await b.close();
