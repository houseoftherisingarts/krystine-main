// QA P2 : pop-ups devant les yeux après un long scroll — Fond d'écran,
// aperçu plein écran, ouverture d'un coffre. Compte jetable, patron de
// scripts/qa/bannieres-signature.mjs. Lancer avec un vite dev sur 5199.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const API_KEY = fs.readFileSync('.env.local', 'utf8').match(/VITE_FIREBASE_API_KEY=(.+)/)[1].trim();
const PROJET = 'krystinestlaurent-87566';
const BASE = process.env.BASE || 'http://localhost:5199';
const OUT = process.env.OUT || '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/revue/popups-portail';
fs.mkdirSync(OUT, { recursive: true });
const email = `qa-popup-${Date.now()}@vexel-qa.test`; const password = 'Qa!' + Math.random().toString(36).slice(2, 12);
const rest = async (url, body) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
const gtoken = execSync('gcloud auth print-access-token').toString().trim();
const fsdoc = async (path, fields) => {
  const u = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents/${path}`;
  const r = await fetch(u, { method: 'PATCH', headers: { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
  if (!r.ok) console.log('firestore', path, r.status, await r.text());
};
const fsdel = async (path) => fetch(`https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents/${path}`, { method: 'DELETE', headers: { Authorization: `Bearer ${gtoken}` } });
const u = await rest(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { email, password, returnSecureToken: true });
const uid = u.localId; console.log('compte', uid);
const now = { timestampValue: new Date().toISOString() };
await fsdoc(`members/${uid}`, { uid: { stringValue: uid }, email: { stringValue: email }, displayName: { stringValue: 'Test QA Popup' }, personnalisation: { mapValue: { fields: { banniere: { stringValue: 'iris' } } } } });
await fsdoc(`memberPoints/${uid}`, { balance: { integerValue: '200' }, lifetime: { integerValue: '200' } });
await fsdoc(`boutique/${uid}`, { possede: { mapValue: { fields: { 'banniere-iris': now } } } });
const authUser = { uid, email, emailVerified: false, isAnonymous: false, displayName: 'Test QA Popup', providerData: [{ providerId: 'password', uid: email, displayName: null, email, phoneNumber: null, photoURL: null }],
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
const rapport = [];
const mesurer = async (selecteur, nom, fichier) => {
  const boite = await page.locator(selecteur).first().boundingBox();
  const vp = page.viewportSize();
  const scrollY = await page.evaluate(() => window.scrollY);
  await page.screenshot({ path: `${OUT}/${fichier}` });
  const ok = boite && boite.x === 0 && boite.y === 0 && Math.round(boite.width) === vp.width && Math.round(boite.height) === vp.height;
  console.log(nom, '→ boîte', JSON.stringify(boite), 'viewport', JSON.stringify(vp), 'scrollY', scrollY, ok ? 'OK plein viewport' : 'PROBLÈME');
  rapport.push({ nom, boite, viewport: vp, scrollY, ok });
};
try {
  await page.goto(`${BASE}/compte?onglet=telechargements`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#boutique', { timeout: 20000 });
  await page.waitForTimeout(1500);
  await fermerRoue();
  // Scroll de 1500px demandé par la revue.
  await page.evaluate(() => window.scrollTo(0, 1500));
  await page.waitForTimeout(600);
  console.log('scrollY après scrollTo(1500) :', await page.evaluate(() => window.scrollY));
  await page.screenshot({ path: `${OUT}/00-apres-scroll-1500.png` });

  // 1. Fenêtre « Fond d'écran » (bannière iris, possédée, seedée avec un fond)
  const boutonFond = page.locator('button', { hasText: /^\s*Fond d.écran\s*$/ }).first();
  await boutonFond.scrollIntoViewIfNeeded();
  await boutonFond.click();
  await page.waitForTimeout(700);
  await mesurer('.fixed.inset-0.z-\\[130\\]', 'Fond d’écran', '01-fond-ecran.png');
  await page.locator('.fixed.inset-0.z-\\[130\\] button[aria-label*="Fermer" i]').first().click();
  await page.waitForTimeout(500);

  // 2. Aperçu plein écran de la même bannière (clic sur l'image)
  const carteApercu = page.locator('button[aria-label*="iris" i]').first();
  await carteApercu.scrollIntoViewIfNeeded();
  await carteApercu.click();
  await page.waitForTimeout(700);
  await mesurer('.fixed.inset-0.z-\\[140\\]', 'Aperçu plein écran', '02-apercu-image.png');
  await page.locator('.fixed.inset-0.z-\\[140\\]').first().click({ position: { x: 8, y: 8 } });
  await page.waitForTimeout(500);

  // 3. Achat d'un coffre (200 niskas seedés : une clé à 10, un coffre de bronze à 60) puis ouverture
  const coffresSection = page.locator('#boutique-coffres');
  await coffresSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/03-avant-achat-coffre.png` });
  const boutonCle = page.getByRole('button', { name: /Acheter une clé/i });
  await boutonCle.click();
  await page.waitForTimeout(1200);
  const boutonCoffreBronze = page.getByRole('button', { name: /^Coffre ·/i }).first();
  await boutonCoffreBronze.click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/04-apres-achats.png` });
  const boutonOuvrir = page.getByRole('button', { name: /Ouvrir le coffre/i }).first();
  await boutonOuvrir.scrollIntoViewIfNeeded();
  await boutonOuvrir.click();
  await page.waitForTimeout(600);
  await mesurer('.fixed.inset-0.z-\\[130\\]', 'Ouverture du coffre (juste après clic)', '05-coffre-ouverture-debut.png');
  // Laisse la révélation des lots se faire (vidéo ~4.5s max avant repli).
  await page.waitForTimeout(5200);
  await mesurer('.fixed.inset-0.z-\\[130\\]', 'Ouverture du coffre (lots révélés)', '06-coffre-ouverture-lots.png');

  console.log('\n=== RAPPORT ===');
  console.log(JSON.stringify(rapport, null, 2));
} catch (e) {
  console.error('ERREUR', e);
  await page.screenshot({ path: `${OUT}/erreur.png` }).catch(() => {});
} finally {
  await browser.close();
  await rest(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`, { idToken: u.idToken });
  for (const p of [`members/${uid}`, `memberPoints/${uid}`, `boutique/${uid}`]) await fsdel(p);
  console.log('fini, compte supprimé');
}
