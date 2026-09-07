// QA sceptique — page /origine, section musique, volet MEMBRE CONNECTÉ (O4).
// Patron de bannieres-signature.mjs : compte jetable, session injectée, nettoyé à la fin.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const API_KEY = fs.readFileSync('.env.local', 'utf8').match(/VITE_FIREBASE_API_KEY=(.+)/)[1].trim();
const PROJET = 'krystinestlaurent-87566';
const BASE = process.env.BASE || 'http://localhost:5199';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/revue/origine';
const email = `qa-${Date.now()}@vexel-qa.test`; const password = 'Qa!' + Math.random().toString(36).slice(2, 12);
const rest = async (url, body) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
const gtoken = execSync('gcloud auth print-access-token').toString().trim();
const fsdoc = async (path, fields) => {
  const u = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents/${path}`;
  const r = await fetch(u, { method: 'PATCH', headers: { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
  if (!r.ok) console.log('firestore', path, r.status, await r.text());
};
const fsdel = async (path) => fetch(`https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents/${path}`, { method: 'DELETE', headers: { Authorization: `Bearer ${gtoken}` } });

const u = await rest(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { email, password, returnSecureToken: true });
if (!u.localId) { console.log('signUp failed', u); process.exit(1); }
const uid = u.localId; console.log('compte', uid);
const now = { timestampValue: new Date().toISOString() };
await fsdoc(`members/${uid}`, { uid: { stringValue: uid }, email: { stringValue: email }, displayName: { stringValue: 'Test QA' } });
// Solde dans memberPoints ET un événement dans pointsEvents (patron demandé par Alex).
await fsdoc(`memberPoints/${uid}`, { balance: { integerValue: '20' }, lifetime: { integerValue: '20' } });
await fsdoc(`pointsEvents/${uid}-qa-seed`, {
  uid: { stringValue: uid }, delta: { integerValue: '20' }, solde: { integerValue: '20' },
  raison: { stringValue: 'qa-seed' }, createdAt: now,
});

const authUser = {
  uid, email, emailVerified: false, isAnonymous: false, displayName: 'Test QA',
  providerData: [{ providerId: 'password', uid: email, displayName: null, email, phoneNumber: null, photoURL: null }],
  stsTokenManager: { refreshToken: u.refreshToken, accessToken: u.idToken, expirationTime: Date.now() + Number(u.expiresIn) * 1000 },
  createdAt: String(Date.now()), lastLoginAt: String(Date.now()), apiKey: API_KEY, appName: '[DEFAULT]',
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
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

try {
  await page.goto(`${BASE}/origine`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#curriculum', { timeout: 20000 });
  await page.waitForTimeout(2500);
  await fermerRoue();

  const connecte = await page.evaluate(() => !!document.querySelector('a[href*="onglet=telechargements"]'));
  console.log('O4 (connecté) — lien boutique présent dans le DOM :', connecte);

  const el = await page.evaluate(() => {
    const a = [...document.querySelectorAll('a')].find(x => x.textContent.includes('niskas'));
    return a ? { texte: a.textContent.trim(), href: a.getAttribute('href') } : null;
  });
  console.log('O4 (connecté) — lien "obtenir/niskas" :', JSON.stringify(el));

  await page.evaluate(() => {
    const h = [...document.querySelectorAll('h2')].find(x => x.textContent.includes('Fréquence'));
    if (h) h.scrollIntoView({ block: 'center', behavior: 'instant' });
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/o4-connecte-musique.png` });

  // Vérifie que le bouton non-connecté n'apparaît plus
  const boutonCompteEncorePresent = await page.locator('text=Créer mon compte pour l\'obtenir').count();
  console.log('O4 (connecté) — bouton "Créer mon compte" encore présent (devrait être 0) :', boutonCompteEncorePresent);

  // Clic réel sur le lien pour confirmer la destination
  const lien = page.locator('a', { hasText: /ma boutique/i }).first();
  await lien.scrollIntoViewIfNeeded();
  await lien.click();
  await page.waitForTimeout(1500);
  console.log('O4 (connecté) — URL après clic :', page.url());
  await page.screenshot({ path: `${OUT}/o4-connecte-apres-clic.png` });
} finally {
  await browser.close();
  await rest(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`, { idToken: u.idToken });
  for (const p of [`members/${uid}`, `memberPoints/${uid}`, `pointsEvents/${uid}-qa-seed`]) await fsdel(p);
  console.log('fini, compte supprimé');
}
