import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = 'http://localhost:5199';
const token = fs.readFileSync('/tmp/jeton-krystine.txt', 'utf8').trim();
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const p = await c.newPage();
p.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text().slice(0, 160)); });
await p.goto(`${BASE}/admin/demander-un-changement`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2500);
const r = await p.evaluate(async (t) => {
  try {
    const src = await fetch('/src/firebase/auth.ts').then((r) => r.text());
    const url = src.match(/"([^"]*firebase_auth\.js[^"]*)"/)[1];
    const a = await import(url);
    const { auth } = await import('/src/firebase.ts');
    const u = await a.signInWithCustomToken(auth, t);
    return 'ok ' + u.user.uid;
  } catch (e) { return 'err ' + (e && e.message); }
}, token);
console.log('signin:', r);
await p.waitForTimeout(6000);
console.log('url:', p.url());
console.log('texte:', (await p.locator('body').innerText()).slice(0, 600).replace(/\n+/g, ' | '));
await p.screenshot({ path: '/tmp/claude-shots/debug.jpg', quality: 60 });
await b.close();
