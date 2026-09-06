// QA : chaque skin, à tour de rôle, sur la carte des skins de la boutique et
// l'en-tête de l'onglet Points. Une planche par skin, pour juger la lisibilité.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const API_KEY = fs.readFileSync('.env.local', 'utf8').match(/VITE_FIREBASE_API_KEY=(.+)/)[1].trim();
const PROJET = 'krystinestlaurent-87566';
const BASE = process.env.BASE || 'http://localhost:5199';
const SKINS = ['medzo','nuit','coffee','aube','terre','foret','ocean','encre','lotus','feminite','nature','aurore','or-pur'];
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
const possede = {}; for (const k of SKINS) possede[`skin-${k}`] = { timestampValue: new Date().toISOString() };
await fsdoc(`members/${uid}`, { uid: { stringValue: uid }, email: { stringValue: email }, displayName: { stringValue: 'Test QA' } });
const jour = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
await fsdoc(`pointsEvents/adjust:${uid}:qa`, { uid: { stringValue: uid }, kind: { stringValue: 'adjust' }, amount: { integerValue: '3600' }, dedupKey: { stringValue: `adjust:${uid}:qa` }, at: { timestampValue: new Date().toISOString() } });
await fsdoc(`pointsEvents/redeem:${uid}:qa`, { uid: { stringValue: uid }, kind: { stringValue: 'redeem' }, amount: { integerValue: '-2788' }, dedupKey: { stringValue: `redeem:${uid}:qa` }, at: { timestampValue: new Date().toISOString() } });
await fsdoc(`memberPoints/${uid}`, { balance: { integerValue: '812' }, lifetime: { integerValue: '3600' }, dernierJour: { stringValue: jour }, serie: { integerValue: '3' } });
await fsdoc(`boutique/${uid}`, { possede: { mapValue: { fields: possede } } });
const authUser = { uid, email, emailVerified: false, isAnonymous: false, displayName: 'Test QA', providerData: [{ providerId: 'password', uid: email, displayName: null, email, phoneNumber: null, photoURL: null }],
  stsTokenManager: { refreshToken: u.refreshToken, accessToken: u.idToken, expirationTime: Date.now() + Number(u.expiresIn) * 1000 }, createdAt: String(Date.now()), lastLoginAt: String(Date.now()), apiKey: API_KEY, appName: '[DEFAULT]' };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/robots.txt`);
await page.evaluate(([key, val]) => new Promise((res, rej) => {
  localStorage.setItem('krystine-jeu-vu', new Date().toISOString().slice(0, 10));
  const req = indexedDB.open('firebaseLocalStorageDb', 1);
  req.onupgradeneeded = () => req.result.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
  req.onsuccess = () => { const tx = req.result.transaction('firebaseLocalStorage', 'readwrite'); tx.objectStore('firebaseLocalStorage').put({ fbase_key: key, value: val }); tx.oncomplete = () => res(true); tx.onerror = rej; };
  req.onerror = rej;
}), [`firebase:authUser:${API_KEY}:[DEFAULT]`, authUser]);
for (const k of SKINS) {
  await fsdoc(`members/${uid}`, { personnalisation: { mapValue: { fields: { skin: { stringValue: k } } } } }, ['personnalisation']);
  await page.goto(`${BASE}/compte?onglet=telechargements`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600);
  const skins = page.locator('#boutique-skin');
  await skins.scrollIntoViewIfNeeded(); await page.waitForTimeout(500);
  await page.screenshot({ path: `scripts/qa/shots/skin-${k}-boutique.png` });
  await page.goto(`${BASE}/compte?onglet=loyalty`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `scripts/qa/shots/skin-${k}-points.png` });
}
await browser.close();
await rest(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`, { idToken: u.idToken });
for (const p of [`members/${uid}`, `memberPoints/${uid}`, `boutique/${uid}`, `pointsEvents/adjust:${uid}:qa`, `pointsEvents/redeem:${uid}:qa`]) await fsdel(p);
console.log('fini');
