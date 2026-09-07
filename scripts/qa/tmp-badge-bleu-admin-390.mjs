// Reprise des deux captures à 390 après correction de la colonne du nom (session admin, compte D laissé en attente).
import { chromium } from 'playwright';
import fs from 'node:fs';
const API_KEY = fs.readFileSync('.env.local', 'utf8').match(/VITE_FIREBASE_API_KEY=(.+)/)[1].trim();
const BASE = 'http://localhost:5199'; const OUT = process.env.OUT; const EMAIL = process.env.EMAIL_D;
const SESSION = JSON.parse(fs.readFileSync(process.env.ADMIN_SESSION, 'utf8'));
const authUser = { uid: 'IzH35eAu5JTMAXjaGjRmaZSaQlu2', email: 'houseoftherisingarts@gmail.com', emailVerified: true, isAnonymous: false, displayName: 'Alex', providerData: [{ providerId: 'google.com', uid: 'houseoftherisingarts@gmail.com', displayName: 'Alex', email: 'houseoftherisingarts@gmail.com', phoneNumber: null, photoURL: null }],
  stsTokenManager: { refreshToken: SESSION.refreshToken, accessToken: SESSION.idToken, expirationTime: Date.now() + 30 * 60e3 }, createdAt: String(Date.now()), lastLoginAt: String(Date.now()), apiKey: API_KEY, appName: '[DEFAULT]' };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const page = await ctx.newPage();
await page.goto(`${BASE}/robots.txt`);
await page.evaluate(([key, val]) => new Promise((res, rej) => {
  localStorage.setItem('admin.nav.ouverts', JSON.stringify(['communaute']));
  const req = indexedDB.open('firebaseLocalStorageDb', 1);
  req.onupgradeneeded = () => req.result.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
  req.onsuccess = () => { const tx = req.result.transaction('firebaseLocalStorage', 'readwrite'); tx.objectStore('firebaseLocalStorage').put({ fbase_key: key, value: val }); tx.oncomplete = () => res(true); tx.onerror = rej; };
  req.onerror = rej;
}), [`firebase:authUser:${API_KEY}:[DEFAULT]`, authUser]);
try {
  await page.goto(`${BASE}/admin/badge-bleu`, { waitUntil: 'domcontentloaded' });
  await page.getByText(EMAIL).waitFor({ timeout: 45000 }); await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/05-section-390.png`, fullPage: true });
  await page.goto(`${BASE}/admin/clients`, { waitUntil: 'domcontentloaded' });
  const champ = page.locator('input[type="search"]'); await champ.waitFor({ timeout: 45000 });
  await champ.fill(EMAIL); await page.waitForTimeout(600);
  await page.locator('tr[title="Ouvrir l\'espace client"]').first().click();
  await page.getByText(/Badge Bleu : /).waitFor({ timeout: 20000 }); await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/09-fiche-attente-390.png` });
} finally { await browser.close(); }
console.log('captures 390 reprises');
