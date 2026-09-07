import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const API_KEY = fs.readFileSync('.env.local', 'utf8').match(/VITE_FIREBASE_API_KEY=(.+)/)[1].trim();
const PROJET = 'krystinestlaurent-87566'; const BASE = 'http://localhost:5199'; const OUT = process.env.OUT;
const gtoken = execSync('gcloud auth print-access-token').toString().trim();
const FS = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents`;
const H = { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' };
const rest = async (url, body) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
const fsdoc = async (path, fields) => { const r = await fetch(`${FS}/${path}`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields }) }); if (!r.ok) console.log(path, r.status); };
const fsdel = (path) => fetch(`${FS}/${path}`, { method: 'DELETE', headers: H });
const email = `qa-bb-dbg-${Date.now()}@vexel-qa.test`; const password = 'Qa!' + Math.random().toString(36).slice(2, 12);
const u = await rest(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { email, password, returnSecureToken: true });
const uid = u.localId;
await fsdoc(`members/${uid}`, { uid: { stringValue: uid }, email: { stringValue: email }, displayName: { stringValue: 'QA dbg' } });
await fsdoc(`memberPoints/${uid}`, { balance: { integerValue: '120' }, lifetime: { integerValue: '120' } });
const authUser = { uid, email, emailVerified: false, isAnonymous: false, displayName: 'QA dbg', providerData: [], stsTokenManager: { refreshToken: u.refreshToken, accessToken: u.idToken, expirationTime: Date.now() + Number(u.expiresIn) * 1000 }, createdAt: String(Date.now()), lastLoginAt: String(Date.now()), apiKey: API_KEY, appName: '[DEFAULT]' };
const browser = await chromium.launch();
try {
  for (const [w, h, v] of [[1440, 900, '1440'], [390, 844, '390']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } }); const page = await ctx.newPage();
    await page.goto(`${BASE}/robots.txt`);
    await page.evaluate(([key, val]) => new Promise((res, rej) => {
      const jour = new Date().toISOString().slice(0, 10);
      localStorage.setItem('krystine-jeu-vu', jour); localStorage.setItem('krystine-roue-vue', jour); localStorage.setItem('krystine-banniere-flash-vu', '1'); localStorage.setItem('inspirata.consent.v1', 'rejected');
      const req = indexedDB.open('firebaseLocalStorageDb', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
      req.onsuccess = () => { const tx = req.result.transaction('firebaseLocalStorage', 'readwrite'); tx.objectStore('firebaseLocalStorage').put({ fbase_key: key, value: val }); tx.oncomplete = () => res(true); tx.onerror = rej; };
      req.onerror = rej;
    }), [`firebase:authUser:${API_KEY}:[DEFAULT]`, authUser]);
    await page.goto(`${BASE}/compte?onglet=telechargements`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#boutique-skin', { timeout: 25000 }); await page.waitForTimeout(2500);
    const r = page.locator('.fixed.inset-0.z-\\[125\\]'); if (await r.count()) { await r.first().click({ position: { x: 8, y: 8 } }); await page.waitForTimeout(500); }
    const carte = page.locator('#boutique-skin .rounded-\\[18px\\]', { hasText: 'Skin Vérifié' }).first();
    await carte.evaluate(el => el.scrollIntoView({ block: 'center' })); await page.waitForTimeout(700);
    const m = await page.evaluate(() => ({ scrollY: window.scrollY, sh: document.documentElement.scrollHeight, ih: window.innerHeight, vvTop: visualViewport.offsetTop, vvPageTop: visualViewport.pageTop, vvH: visualViewport.height, htmlBg: getComputedStyle(document.documentElement).backgroundColor, bodyBg: getComputedStyle(document.body).backgroundColor, bodyH: document.body.getBoundingClientRect().height }));
    console.log(v, JSON.stringify(m));
    await page.screenshot({ path: `${OUT}/dbg-boutique-${v}-a.png` });
    await page.evaluate(() => window.scrollBy(0, 1)); await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/dbg-boutique-${v}-b.png` });
    await ctx.close();
  }
} finally {
  await browser.close();
  await rest(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`, { idToken: u.idToken });
  for (const p of [`members/${uid}`, `memberPoints/${uid}`, `badges/${uid}`, `boutique/${uid}`]) await fsdel(p);
  const q = await (await fetch(`${FS}:runQuery`, { method: 'POST', headers: H, body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'pointsEvents' }], where: { fieldFilter: { field: { fieldPath: 'uid' }, op: 'EQUAL', value: { stringValue: uid } } } } }) })).json();
  for (const x of q.filter(x => x.document)) await fsdel(x.document.name.split('/documents/')[1]);
  console.log('fini');
}
