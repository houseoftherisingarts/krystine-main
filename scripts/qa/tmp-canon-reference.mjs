// Captures de référence de l'espace client (Profil, Amis, Messagerie) à 1440 et 390.
// Patron : scripts/qa/bannieres-signature.mjs (compte jetable, session dans IndexedDB, Foyer ouvert par REST).
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const API_KEY = fs.readFileSync('.env.local', 'utf8').match(/VITE_FIREBASE_API_KEY=(.+)/)[1].trim();
const PROJET = 'krystinestlaurent-87566';
const BASE = process.env.BASE || 'http://localhost:5199';
const OUT = process.env.OUT;
fs.mkdirSync(OUT, { recursive: true });
const email = `qa-${Date.now()}@vexel-qa.test`; const password = 'Qa!' + Math.random().toString(36).slice(2, 12);
const rest = async (url, body) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
const gtoken = execSync('gcloud auth print-access-token').toString().trim();
const fsdoc = async (path, fields) => {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents/${path}`, { method: 'PATCH', headers: { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
  if (!r.ok) console.log('firestore', path, r.status, await r.text());
};
const fsdel = async (path) => fetch(`https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents/${path}`, { method: 'DELETE', headers: { Authorization: `Bearer ${gtoken}` } });
const u = await rest(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { email, password, returnSecureToken: true });
const uid = u.localId; console.log('compte', uid);
await fsdoc(`members/${uid}`, { uid: { stringValue: uid }, email: { stringValue: email }, displayName: { stringValue: 'Marie Référence' }, dosha: { stringValue: 'pitta' }, personnalisation: { mapValue: { fields: { banniere: { stringValue: 'defaut' } } } } });
await fsdoc(`memberPoints/${uid}`, { balance: { integerValue: '120' }, lifetime: { integerValue: '140' } });
await fsdoc(`achatsFormations/${uid}/formations/foyer`, { titre: { stringValue: "Le Foyer d'Origine" }, source: { stringValue: 'qa' } });
const authUser = { uid, email, emailVerified: false, isAnonymous: false, displayName: 'Marie Référence', providerData: [{ providerId: 'password', uid: email, displayName: null, email, phoneNumber: null, photoURL: null }],
  stsTokenManager: { refreshToken: u.refreshToken, accessToken: u.idToken, expirationTime: Date.now() + Number(u.expiresIn) * 1000 }, createdAt: String(Date.now()), lastLoginAt: String(Date.now()), apiKey: API_KEY, appName: '[DEFAULT]' };
const browser = await chromium.launch();
try {
  for (const [w, h, tag] of [[1440, 900, '1440'], [390, 844, '390']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: w < 500, hasTouch: w < 500 });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/robots.txt`);
    await page.evaluate(([key, val]) => new Promise((res, rej) => {
      localStorage.setItem('krystine-jeu-vu', new Date().toISOString().slice(0, 10));
      localStorage.setItem('krystine-banniere-flash-vu', '1');
      const req = indexedDB.open('firebaseLocalStorageDb', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
      req.onsuccess = () => { const tx = req.result.transaction('firebaseLocalStorage', 'readwrite'); tx.objectStore('firebaseLocalStorage').put({ fbase_key: key, value: val }); tx.oncomplete = () => res(true); tx.onerror = rej; };
      req.onerror = rej;
    }), [`firebase:authUser:${API_KEY}:[DEFAULT]`, authUser]);
    const fermerRoue = async () => { const r = page.locator('.fixed.inset-0.z-\\[125\\]'); if (await r.count()) { await r.first().click({ position: { x: 8, y: 8 } }); await page.waitForTimeout(500); } };
    for (const onglet of ['profile', 'amis', 'messagerie']) {
      await page.goto(`${BASE}/compte?onglet=${onglet}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[class*="h-80"] img', { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(3000); await fermerRoue(); await fermerRoue();
      await page.screenshot({ path: `${OUT}/${onglet}-${tag}.png`, fullPage: true });
      console.log('capture', onglet, tag);
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  await rest(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`, { idToken: u.idToken });
  for (const p of [`members/${uid}`, `memberPoints/${uid}`, `achatsFormations/${uid}/formations/foyer`, `achatsFormations/${uid}`]) await fsdel(p);
  console.log('fini');
}
