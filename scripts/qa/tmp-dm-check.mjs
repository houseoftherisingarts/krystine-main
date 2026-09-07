// QA temporaire : l'envoi d'un premier message depuis /messages/:uid laisse-t-il une trace ?
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const API_KEY = fs.readFileSync('.env.local', 'utf8').match(/VITE_FIREBASE_API_KEY=(.+)/)[1].trim();
const PROJET = 'krystinestlaurent-87566';
const BASE = 'http://localhost:5199';
const rest = async (url, body) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
const gtoken = execSync('gcloud auth print-access-token').toString().trim();
const FS = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents`;
const fsdoc = async (path, fields) => fetch(`${FS}/${path}`, { method: 'PATCH', headers: { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
const fsget = async (path) => (await fetch(`${FS}/${path}`, { headers: { Authorization: `Bearer ${gtoken}` } })).json();
const fsdel = async (path) => fetch(`${FS}/${path}`, { method: 'DELETE', headers: { Authorization: `Bearer ${gtoken}` } });
const creer = async (nom) => { const email = `qa-${nom}-${Date.now()}@vexel-qa.test`; const u = await rest(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { email, password: 'Qa!' + Math.random().toString(36).slice(2, 12), returnSecureToken: true }); return { ...u, email, uid: u.localId }; };
const q1 = await creer('dm1'); const q2 = await creer('dm2');
const now = { timestampValue: new Date().toISOString() };
await fsdoc(`members/${q1.uid}`, { uid: { stringValue: q1.uid }, email: { stringValue: q1.email }, displayName: { stringValue: 'DM Un' } });
await fsdoc(`members/${q2.uid}`, { uid: { stringValue: q2.uid }, email: { stringValue: q2.email }, displayName: { stringValue: 'DM Deux' } });
await fsdoc(`achatsFormations/${q1.uid}/formations/foyer`, { titre: { stringValue: "Le Foyer d'Origine" }, source: { stringValue: 'qa' }, creeLe: now });
const session = { uid: q1.uid, email: q1.email, emailVerified: false, isAnonymous: false, displayName: 'DM Un', providerData: [], stsTokenManager: { refreshToken: q1.refreshToken, accessToken: q1.idToken, expirationTime: Date.now() + 3600e3 }, createdAt: String(Date.now()), lastLoginAt: String(Date.now()), apiKey: API_KEY, appName: '[DEFAULT]' };
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const erreurs = []; page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') erreurs.push(m.text().slice(0, 200)); });
  await page.goto(`${BASE}/robots.txt`);
  await page.evaluate(([key, val]) => new Promise((res, rej) => { localStorage.setItem('krystine-jeu-vu', '2099-01-01'); localStorage.setItem('krystine-roue-vue', '2099-01-01'); const req = indexedDB.open('firebaseLocalStorageDb', 1); req.onupgradeneeded = () => req.result.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' }); req.onsuccess = () => { const tx = req.result.transaction('firebaseLocalStorage', 'readwrite'); tx.objectStore('firebaseLocalStorage').put({ fbase_key: key, value: val }); tx.oncomplete = () => res(true); }; req.onerror = rej; }), [`firebase:authUser:${API_KEY}:[DEFAULT]`, session]);
  await page.goto(`${BASE}/messages/${q2.uid}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  console.log('fil doc avant envoi :', JSON.stringify(await fsget(`dms/${[q1.uid, q2.uid].sort().join('__')}`)).slice(0, 160));
  await page.fill('#mot-prive', 'Premier mot de test.');
  const bouton = page.locator('button[aria-label="Envoyer"]');
  console.log('boutons Envoyer :', await bouton.count(), 'désactivé :', await bouton.first().isDisabled());
  await bouton.first().click(); await page.waitForTimeout(2500);
  const texte = await page.evaluate(() => document.querySelector('section')?.innerText.slice(0, 400));
  console.log('section après envoi :', JSON.stringify(texte));
  console.log('fil doc après envoi :', JSON.stringify(await fsget(`dms/${[q1.uid, q2.uid].sort().join('__')}`)).slice(0, 300));
  console.log('console :', erreurs.slice(0, 6));
} finally {
  await browser.close();
  const fil = [q1.uid, q2.uid].sort().join('__');
  const msgs = await fsget(`dms/${fil}/messages`); for (const d of msgs.documents || []) await fsdel(d.name.split('/documents/')[1]);
  for (const p of [`dms/${fil}`, `achatsFormations/${q1.uid}/formations/foyer`, `members/${q1.uid}`, `members/${q2.uid}`]) await fsdel(p);
  for (const u of [q1, q2]) await rest(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`, { idToken: u.idToken });
  console.log('nettoyé');
}
