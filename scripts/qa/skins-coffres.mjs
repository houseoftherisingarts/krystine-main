// QA : un compte de test jetable, connecté par IndexedDB (jeton REST), qui
// porte le skin Dark Coffee, une plante au stade Lotus et un coffre de bronze.
// Captures : boutique (skins + coffres), Points (bureau + mobile), Amis.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const API_KEY = fs.readFileSync('.env.local', 'utf8').match(/VITE_FIREBASE_API_KEY=(.+)/)[1].trim();
const PROJET = 'krystinestlaurent-87566';
const BASE = process.env.BASE || 'http://localhost:5199';
const email = `qa-${Date.now()}@vexel-qa.test`;
const password = 'Qa!' + Math.random().toString(36).slice(2, 12);
const OUT = 'scripts/qa/shots';

const rest = async (url, body) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
const gtoken = execSync('gcloud auth print-access-token').toString().trim();
const fsdoc = async (path, fields, mask) => {
  const u = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents/${path}` + (mask ? '?' + mask.map(m => 'updateMask.fieldPaths=' + m).join('&') : '');
  const r = await fetch(u, { method: 'PATCH', headers: { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
  if (!r.ok) console.log('firestore', path, r.status, await r.text());
};
const fsdel = async (path) => fetch(`https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents/${path}`, { method: 'DELETE', headers: { Authorization: `Bearer ${gtoken}` } });

const u = await rest(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { email, password, returnSecureToken: true });
if (!u.localId) { console.log(u); process.exit(1); }
const uid = u.localId;
console.log('compte', uid);

// Le profil, les niskas (Lotus = 1500 gagnés), le skin Dark Coffee, un coffre.
await fsdoc(`members/${uid}`, { uid: { stringValue: uid }, email: { stringValue: email }, displayName: { stringValue: 'Test QA' }, personnalisation: { mapValue: { fields: { skin: { stringValue: 'coffee' } } } } });
const jour = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
await fsdoc(`pointsEvents/adjust:${uid}:qa`, { uid: { stringValue: uid }, kind: { stringValue: 'adjust' }, amount: { integerValue: '50000' }, dedupKey: { stringValue: `adjust:${uid}:qa` }, at: { timestampValue: new Date().toISOString() } });
await fsdoc(`pointsEvents/redeem:${uid}:qa`, { uid: { stringValue: uid }, kind: { stringValue: 'redeem' }, amount: { integerValue: '-48788' }, dedupKey: { stringValue: `redeem:${uid}:qa` }, at: { timestampValue: new Date().toISOString() } });
await fsdoc(`memberPoints/${uid}`, { balance: { integerValue: '1212' }, lifetime: { integerValue: '50000' }, dernierJour: { stringValue: jour }, serie: { integerValue: '3' } });
await fsdoc(`boutique/${uid}`, { possede: { mapValue: { fields: { 'skin-coffee': { timestampValue: new Date().toISOString() }, 'banniere-iris': { timestampValue: new Date().toISOString() } } } } });
await fsdoc(`coffres/${uid}`, { boites: { mapValue: { fields: { bronze: { integerValue: '1' }, argent: { integerValue: '0' }, or: { integerValue: '0' } } } }, cles: { mapValue: { fields: { bronze: { integerValue: '1' }, argent: { integerValue: '0' }, or: { integerValue: '0' } } } } });

const authUser = {
  uid, email, emailVerified: false, isAnonymous: false, displayName: 'Test QA',
  providerData: [{ providerId: 'password', uid: email, displayName: null, email, phoneNumber: null, photoURL: null }],
  stsTokenManager: { refreshToken: u.refreshToken, accessToken: u.idToken, expirationTime: Date.now() + Number(u.expiresIn) * 1000 },
  createdAt: String(Date.now()), lastLoginAt: String(Date.now()), apiKey: API_KEY, appName: '[DEFAULT]',
};

const browser = await chromium.launch();
const shoot = async (largeur, hauteur, suffixe) => {
  const ctx = await browser.newContext({ viewport: { width: largeur, height: hauteur }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/robots.txt`);
  await page.evaluate(([key, val]) => new Promise((res, rej) => {
    localStorage.setItem('krystine-jeu-vu', new Date().toISOString().slice(0, 10));
    const req = indexedDB.open('firebaseLocalStorageDb', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
    req.onsuccess = () => { const tx = req.result.transaction('firebaseLocalStorage', 'readwrite'); tx.objectStore('firebaseLocalStorage').put({ fbase_key: key, value: val }); tx.oncomplete = () => res(true); tx.onerror = rej; };
    req.onerror = rej;
  }), [`firebase:authUser:${API_KEY}:[DEFAULT]`, authUser]);
  page.on('pageerror', e => console.log('pageerror', e.message));

  const fermerBienvenue = async () => {
    for (const t of ['Fermer', 'Plus tard', 'Commencer', 'Merci']) { const b = page.getByRole('button', { name: new RegExp(t, 'i') }).first(); if (await b.count()) { try { await b.click({ timeout: 800 }); } catch {} } }
    await page.keyboard.press('Escape');
  };

  await page.goto(`${BASE}/compte?onglet=telechargements`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500); await fermerBienvenue(); await page.waitForTimeout(600);
  const skins = page.locator('#boutique-skin');
  if (await skins.count()) { await skins.scrollIntoViewIfNeeded(); await page.waitForTimeout(500); await page.screenshot({ path: `${OUT}/qa-skins-coffee-${suffixe}.png` }); }
  else await page.screenshot({ path: `${OUT}/qa-skins-coffee-${suffixe}.png`, fullPage: false });
  const ban = page.locator('#boutique-banniere');
  if (await ban.count()) { await ban.scrollIntoViewIfNeeded(); await page.waitForTimeout(400); await page.screenshot({ path: `${OUT}/qa-bannieres-${suffixe}.png` });
    const fond = page.getByRole('button', { name: /Fond d’écran|Wallpaper/ }).first(); if (await fond.count()) { await fond.click({ force: true }).catch(() => {}); await page.waitForTimeout(700); await page.screenshot({ path: `${OUT}/qa-fond-${suffixe}.png` }); await page.keyboard.press('Escape'); await page.mouse.click(5, 5); await page.waitForTimeout(300); } }
  const coffres = page.locator('#boutique-coffres');
  if (await coffres.count()) {
    await coffres.scrollIntoViewIfNeeded(); await page.waitForTimeout(400);
    const chances = page.getByRole('button', { name: /chances/i }).first(); if (await chances.count()) await chances.click({ force: true, timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(500); await page.screenshot({ path: `${OUT}/qa-coffres-${suffixe}.png` });
  }
  await page.goto(`${BASE}/compte?onglet=loyalty`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000); await fermerBienvenue(); await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/qa-points-${suffixe}.png` });
  const guide = page.getByText(/Comment gagner|How to earn/i).first();
  if (await guide.count()) { await guide.scrollIntoViewIfNeeded(); await guide.click({ force: true }).catch(() => {}); await page.waitForTimeout(600); await page.screenshot({ path: `${OUT}/qa-points-guide-${suffixe}.png` }); }
  await page.goto(`${BASE}/compte?onglet=amis`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800); await fermerBienvenue(); await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/qa-amis-${suffixe}.png` });
  await ctx.close();
};
await shoot(1440, 900, 'desk');
await shoot(390, 844, 'mobile');
await browser.close();

// Ménage : le compte et ses documents.
await rest(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`, { idToken: u.idToken });
for (const p of [`members/${uid}`, `memberPoints/${uid}`, `boutique/${uid}`, `pointsEvents/adjust:${uid}:qa`, `pointsEvents/redeem:${uid}:qa`, `coffres/${uid}`]) await fsdel(p);
console.log('fini');
