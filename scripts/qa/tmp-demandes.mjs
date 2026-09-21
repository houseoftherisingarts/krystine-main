import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = 'http://localhost:5199';
const token = fs.readFileSync('/tmp/jeton-krystine.txt', 'utf8').trim();
const b = await chromium.launch();
for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'mobile']]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 600, hasTouch: w < 600, deviceScaleFactor: 1 });
  const p = await c.newPage();
  await p.goto(`${BASE}/admin/demander-un-changement`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  await p.evaluate(async (t) => {
    const src = await fetch('/src/firebase/auth.ts').then((r) => r.text());
    const url = src.match(/"([^"]*firebase_auth\.js[^"]*)"/)[1];
    const a = await import(url);
    const { auth } = await import('/src/firebase.ts');
    await a.signInWithCustomToken(auth, t);
  }, token);
  await p.waitForSelector('text=Vos demandes', { timeout: 30000 });
  await p.waitForTimeout(3000);
  const carte = p.locator('h3:has-text("Vos demandes")').locator('xpath=ancestor::div[contains(@class,"rounded-[20px]")][1]');
  await carte.scrollIntoViewIfNeeded();
  await carte.screenshot({ path: `/tmp/claude-shots/demandes-${tag}-carte.png` });
  // Une demande dépliée, pour vérifier le repli.
  await carte.locator('button.line-clamp-3').nth(2).click();
  await p.waitForTimeout(300);
  await carte.screenshot({ path: `/tmp/claude-shots/demandes-${tag}-depliee.png` });
  await c.close();
}
await b.close();
console.log('ok');
