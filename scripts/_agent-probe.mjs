import { chromium } from 'playwright';
import fs from 'node:fs';
const API_KEY = fs.readFileSync('.env.local', 'utf8').match(/VITE_FIREBASE_API_KEY=(.+)/)[1].trim();
const BASE = 'http://localhost:3034';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/78c2ade9-cdcd-4c68-ace2-f8eabac5d7f6/scratchpad/coffre-beta';
const rest = async (url, body) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();

const email = `qa-loyalty-${Math.random().toString(36).slice(2, 9)}@vexel-qa.test`;
const password = 'Qa!' + Math.random().toString(36).slice(2, 12);
const u = await rest(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { email, password, returnSecureToken: true });
const uid = u.localId;

const gtoken = (await import('node:child_process')).execSync('gcloud auth print-access-token').toString().trim();
const fsBase = `https://firestore.googleapis.com/v1/projects/krystinestlaurent-87566/databases/(default)/documents`;
await fetch(`${fsBase}/members/${uid}`, { method: 'PATCH', headers: { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { uid: { stringValue: uid }, email: { stringValue: email }, displayName: { stringValue: 'QA loyalty' }, bienvenueVu: { booleanValue: true }, coffreBetaVu: { booleanValue: true } } }) });

const browser = await chromium.launch();
for (const [nom, largeur, hauteur, echelle] of [['1440', 1440, 900, 1], ['390', 390, 844, 2]]) {
  const ctx = await browser.newContext({ viewport: { width: largeur, height: hauteur }, deviceScaleFactor: echelle });
  const page = await ctx.newPage();
  const authUser = {
    uid, email, emailVerified: false, isAnonymous: false, displayName: 'QA loyalty',
    providerData: [{ providerId: 'password', uid: email, displayName: null, email, phoneNumber: null, photoURL: null }],
    stsTokenManager: { refreshToken: u.refreshToken, accessToken: u.idToken, expirationTime: Date.now() + Number(u.expiresIn) * 1000 },
    createdAt: String(Date.now()), lastLoginAt: String(Date.now()), apiKey: API_KEY, appName: '[DEFAULT]',
  };
  await page.goto(`${BASE}/robots.txt`);
  await page.evaluate(([key, value]) => new Promise((res, rej) => {
    const req = indexedDB.open('firebaseLocalStorageDb', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
    req.onsuccess = () => { const tx = req.result.transaction('firebaseLocalStorage', 'readwrite'); tx.objectStore('firebaseLocalStorage').put({ fbase_key: key, value }); tx.oncomplete = () => res(true); tx.onerror = rej; };
    req.onerror = rej;
  }), [`firebase:authUser:${API_KEY}:[DEFAULT]`, authUser]);
  await page.goto(`${BASE}/compte?onglet=loyalty`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200);
  const roue = page.locator('[aria-labelledby="roue-titre"]');
  if (await roue.isVisible().catch(() => false)) { await page.getByRole('button', { name: /Merci|Thanks/ }).first().click({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(400); }
  await page.screenshot({ path: `${OUT}/7-loyalty-bouton-${nom}.png` });
  await page.getByRole('button', { name: /Les niskas, c.est quoi/i }).first().click({ timeout: 5000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/8-loyalty-panneau-${nom}.png` });
  await ctx.close();
}
await browser.close();
await rest(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`, { idToken: u.idToken });
await fetch(`${fsBase}/members/${uid}`, { method: 'DELETE', headers: { Authorization: `Bearer ${gtoken}` } });
console.log('fait, compte QA loyalty effacé :', email);
