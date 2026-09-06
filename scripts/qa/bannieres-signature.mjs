// QA : la signature sur les bannières, l'aperçu plein écran avant achat, la
// fenêtre du fond d'écran (devant les yeux) et l'état « sans signature ».
// Compte jetable, comme skins-tous.mjs. Lancer avec un vite dev sur 5199.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const API_KEY = fs.readFileSync('.env.local', 'utf8').match(/VITE_FIREBASE_API_KEY=(.+)/)[1].trim();
const PROJET = 'krystinestlaurent-87566';
const BASE = process.env.BASE || 'http://localhost:5199';
const OUT = process.env.OUT || 'scripts/qa/shots';
const email = `qa-${Date.now()}@vexel-qa.test`; const password = 'Qa!' + Math.random().toString(36).slice(2, 12);
const rest = async (url, body) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
const gtoken = execSync('gcloud auth print-access-token').toString().trim();
const fsdoc = async (path, fields, mask) => {
  const u = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents/${path}` + (mask ? '?' + mask.map(m => 'updateMask.fieldPaths=' + m).join('&') : '');
  const r = await fetch(u, { method: 'PATCH', headers: { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
  if (!r.ok) console.log('firestore', path, r.status, await r.text());
};
const fsdel = async (path) => fetch(`https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents/${path}`, { method: 'DELETE', headers: { Authorization: `Bearer ${gtoken}` } });
const u = await rest(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { email, password, returnSecureToken: true });
const uid = u.localId; console.log('compte', uid);
const now = { timestampValue: new Date().toISOString() };
await fsdoc(`members/${uid}`, { uid: { stringValue: uid }, email: { stringValue: email }, displayName: { stringValue: 'Test QA' }, personnalisation: { mapValue: { fields: { banniere: { stringValue: 'iris' } } } } });
await fsdoc(`memberPoints/${uid}`, { balance: { integerValue: '120' }, lifetime: { integerValue: '120' } });
await fsdoc(`boutique/${uid}`, { possede: { mapValue: { fields: { 'banniere-iris': now, 'banniere-nature': now, 'sanslogo-nature': now } } } });
const authUser = { uid, email, emailVerified: false, isAnonymous: false, displayName: 'Test QA', providerData: [{ providerId: 'password', uid: email, displayName: null, email, phoneNumber: null, photoURL: null }],
  stsTokenManager: { refreshToken: u.refreshToken, accessToken: u.idToken, expirationTime: Date.now() + Number(u.expiresIn) * 1000 }, createdAt: String(Date.now()), lastLoginAt: String(Date.now()), apiKey: API_KEY, appName: '[DEFAULT]' };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
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
  // 1. Le hero avec la signature (bannière iris possédée, signée)
  await page.goto(`${BASE}/compte`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#boutique, [class*="h-80"] img', { timeout: 20000 }).catch(() => {}); await page.waitForTimeout(2500); await fermerRoue();
  await page.screenshot({ path: `${OUT}/sig-01-hero.png` });
  // 2. La section bannières de la boutique
  await page.goto(`${BASE}/compte?onglet=telechargements`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#boutique-banniere', { timeout: 20000 }); await page.waitForTimeout(1500); await fermerRoue();
  const sect = page.locator('#boutique-banniere');
  await sect.scrollIntoViewIfNeeded(); await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/sig-02-boutique.png` });
  // 3. Aperçu plein écran d'une bannière NON possédée (pivoine) : clic sur l'image
  const cartePivoine = page.locator('button[aria-label*="pivoine" i]').first();
  await cartePivoine.scrollIntoViewIfNeeded();
  await cartePivoine.click(); await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/sig-03-apercu-banniere.png` });
  const boutonFond = page.locator('[role="dialog"] button', { hasText: /Fond d.écran/ }).first();
  if (await boutonFond.count()) { await boutonFond.click(); await page.waitForTimeout(800); await page.screenshot({ path: `${OUT}/sig-04-apercu-fond.png` }); }
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  // 4. La fenêtre du fond d'écran d'une bannière possédée, ouverte depuis le bas de page : doit être devant les yeux
  const boutonsFond = page.locator('button', { hasText: /^\s*Fond d.écran\s*$/ });
  await boutonsFond.first().scrollIntoViewIfNeeded();
  await boutonsFond.first().click(); await page.waitForTimeout(900);
  const boite = await page.locator('.fixed.inset-0.z-\\[130\\]').first().boundingBox();
  console.log('fenêtre fond d’écran : boîte', JSON.stringify(boite), 'scrollY', await page.evaluate(() => window.scrollY));
  await page.screenshot({ path: `${OUT}/sig-05-fond-ecran.png` });
  await page.keyboard.press('Escape');
} finally {
  await browser.close();
  await rest(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`, { idToken: u.idToken });
  for (const p of [`members/${uid}`, `memberPoints/${uid}`, `boutique/${uid}`]) await fsdel(p);
  console.log('fini');
}
