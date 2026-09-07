// Vérification visuelle ponctuelle (RÈGLE -5) : la liste « Ce que le coffre
// contient » des trois coffres, après le retrait de reb-10-boutique. Compte
// jetable, capture 1440 et 390, ménage à la fin.
import { chromium } from 'playwright';
import fs from 'node:fs';

const API_KEY = fs.readFileSync('.env.local', 'utf8').match(/VITE_FIREBASE_API_KEY=(.+)/)[1].trim();
const BASE = 'http://localhost:5199';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/78c2ade9-cdcd-4c68-ace2-f8eabac5d7f6/scratchpad/verif-coffres';
fs.mkdirSync(OUT, { recursive: true });

const rest = async (url, body) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();

const email = `qa-verif-rabais-${Date.now()}@vexel-qa.test`;
const password = 'Qa!' + Math.random().toString(36).slice(2, 12);
const u = await rest(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { email, password, returnSecureToken: true });
if (!u.localId) throw new Error('signUp: ' + JSON.stringify(u));
const uid = u.localId;

const authUser = {
  uid, email, emailVerified: false, isAnonymous: false, displayName: 'QA verif rabais',
  providerData: [{ providerId: 'password', uid: email, displayName: null, email, phoneNumber: null, photoURL: null }],
  stsTokenManager: { refreshToken: u.refreshToken, accessToken: u.idToken, expirationTime: Date.now() + Number(u.expiresIn) * 1000 },
  createdAt: String(Date.now()), lastLoginAt: String(Date.now()), apiKey: API_KEY, appName: '[DEFAULT]',
};

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1400 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/robots.txt`);
  await page.evaluate(([key, value]) => new Promise((res, rej) => {
    localStorage.setItem('krystine-jeu-vu', new Date().toISOString().slice(0, 10));
    const req = indexedDB.open('firebaseLocalStorageDb', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
    req.onsuccess = () => { const tx = req.result.transaction('firebaseLocalStorage', 'readwrite'); tx.objectStore('firebaseLocalStorage').put({ fbase_key: key, value }); tx.oncomplete = () => res(true); tx.onerror = rej; };
    req.onerror = rej;
  }), [`firebase:authUser:${API_KEY}:[DEFAULT]`, authUser]);

  await page.goto(`${BASE}/compte?onglet=telechargements`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.evaluate(() => document.querySelectorAll('div.fixed.inset-0').forEach((el) => el.remove()));
  await page.locator('#boutique-coffres').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  const ORDRE = ['bronze', 'argent', 'or'];
  const carte = (i) => page.locator('#boutique-coffres div.grid.gap-4 > div').nth(i);
  for (let i = 0; i < ORDRE.length; i++) {
    const type = ORDRE[i];
    await page.evaluate(() => document.querySelectorAll('div.fixed.inset-0').forEach((el) => el.remove()));
    await carte(i).getByRole('button', { name: /Ce que le coffre contient/ }).click();
    await page.waitForTimeout(500);
    await carte(i).scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${OUT}/${type}-1440.png`, fullPage: false, clip: await carte(i).boundingBox() });
    console.log(`  capturé ${type} @1440`);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  for (let i = 0; i < ORDRE.length; i++) {
    const type = ORDRE[i];
    await carte(i).scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const box = await carte(i).boundingBox();
    await page.screenshot({ path: `${OUT}/${type}-390.png`, clip: box });
    console.log(`  capturé ${type} @390`);
  }
  await ctx.close();
} finally {
  await browser.close();
  await rest(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`, { idToken: u.idToken });
  console.log('compte QA supprimé', uid);
}
