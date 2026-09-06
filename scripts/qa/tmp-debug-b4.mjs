import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const API_KEY = fs.readFileSync('.env.local', 'utf8').match(/VITE_FIREBASE_API_KEY=(.+)/)[1].trim();
const PROJET = 'krystinestlaurent-87566';
const BASE = 'http://localhost:5199';
const rest = async (url, body) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
const gtoken = execSync('gcloud auth print-access-token').toString().trim();
const fsdoc = async (path, fields) => { const u = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents/${path}`; await fetch(u, { method: 'PATCH', headers: { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) }); };
const fsdel = async (path) => fetch(`https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents/${path}`, { method: 'DELETE', headers: { Authorization: `Bearer ${gtoken}` } });
const email = `qa-dbg-${Date.now()}@vexel-qa.test`; const password = 'Qa!' + Math.random().toString(36).slice(2, 12);
const u = await rest(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { email, password, returnSecureToken: true });
const uid = u.localId;
await fsdoc(`members/${uid}`, { uid: { stringValue: uid }, email: { stringValue: email }, displayName: { stringValue: 'Test QA' } });
await fsdoc(`memberPoints/${uid}`, { balance: { integerValue: '20' }, lifetime: { integerValue: '20' } });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('console', m => console.log('CONSOLE', m.type(), m.text()));
page.on('pageerror', e => console.log('PAGEERROR', e.message));
await page.goto(`${BASE}/robots.txt`);
await page.evaluate(([key, val]) => new Promise((res, rej) => {
  localStorage.setItem('krystine-jeu-vu', new Date().toISOString().slice(0, 10));
  localStorage.setItem('krystine-banniere-flash-vu', '1');
  const req = indexedDB.open('firebaseLocalStorageDb', 1);
  req.onupgradeneeded = () => req.result.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
  req.onsuccess = () => { const tx = req.result.transaction('firebaseLocalStorage', 'readwrite'); tx.objectStore('firebaseLocalStorage').put({ fbase_key: key, value: val }); tx.oncomplete = () => res(true); tx.onerror = rej; };
  req.onerror = rej;
}), [`firebase:authUser:${API_KEY}:[DEFAULT]`, { uid, email, emailVerified: false, isAnonymous: false, displayName: 'Test QA', providerData: [{ providerId: 'password', uid: email, displayName: null, email, phoneNumber: null, photoURL: null }], stsTokenManager: { refreshToken: u.refreshToken, accessToken: u.idToken, expirationTime: Date.now() + Number(u.expiresIn) * 1000 }, createdAt: String(Date.now()), lastLoginAt: String(Date.now()), apiKey: API_KEY, appName: '[DEFAULT]' }]);
try {
  await page.goto(`${BASE}/compte?onglet=telechargements`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#boutique-banniere', { timeout: 20000 });
  await page.waitForTimeout(1500);
  const roue = page.locator('.fixed.inset-0.z-\\[125\\]');
  if (await roue.count()) { await roue.first().click({ position: { x: 8, y: 8 } }); await page.waitForTimeout(500); }
  const cartePivoine = page.locator('button[aria-label*="pivoine" i]').first();
  await cartePivoine.scrollIntoViewIfNeeded();
  await cartePivoine.click();
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  console.log('dialog open, count=', await page.locator('[role="dialog"]').count());
  await page.waitForTimeout(600);
  console.log('pressing Escape now');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);
  console.log('after escape, dialog count=', await page.locator('[role="dialog"]').count());
  const html = await page.locator('body').innerHTML();
  fs.writeFileSync('/tmp/after-escape.html', html);
} finally {
  await browser.close();
  await rest(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`, { idToken: u.idToken });
  for (const p of [`members/${uid}`, `memberPoints/${uid}`, `boutique/${uid}`]) await fsdel(p);
}
