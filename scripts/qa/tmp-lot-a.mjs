// QA LOT A : le fil du Foyer (/fil) dans la coquille CadreFoyer. Un compte
// jetable membre du Foyer publie deux billets par le Composeur (un texte, un
// texte avec photo), vote et commente le premier; un second compte sans le
// Foyer montre le garde-fou. Tout est effacé à la fin. Vite dev sur 5199.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const env = fs.readFileSync('.env.local', 'utf8');
const API_KEY = env.match(/VITE_FIREBASE_API_KEY=(.+)/)[1].trim();
const BUCKET = env.match(/VITE_FIREBASE_STORAGE_BUCKET=(.+)/)[1].trim();
const PROJET = 'krystinestlaurent-87566';
const BASE = process.env.BASE || 'http://localhost:5199';
const OUT = process.env.OUT || '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/foyer-social/lot-A';
fs.mkdirSync(OUT, { recursive: true });
const PHOTO = path.resolve('public/origine-square.jpg');

const gtoken = execSync('gcloud auth print-access-token').toString().trim();
const H = { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' };
const FS = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents`;
const rest = async (url, body) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
const fsdoc = async (p, fields, mask) => {
  const u = `${FS}/${p}` + (mask ? '?' + mask.map(m => 'updateMask.fieldPaths=' + m).join('&') : '');
  const r = await fetch(u, { method: 'PATCH', headers: H, body: JSON.stringify({ fields }) });
  if (!r.ok) console.log('firestore', p, r.status, await r.text());
};
const fsdel = async (p) => { const r = await fetch(`${FS}/${p}`, { method: 'DELETE', headers: H }); if (!r.ok && r.status !== 404) console.log('del', p, r.status); };
const fslist = async (p) => { const j = await (await fetch(`${FS}/${p}?pageSize=300`, { headers: H })).json(); return (j.documents || []).map(d => d.name.split('/documents/')[1]); };
const fsquery = async (col, champ, val) => {
  const j = await (await fetch(`${FS}:runQuery`, { method: 'POST', headers: H, body: JSON.stringify({ structuredQuery: { from: [{ collectionId: col }], where: { fieldFilter: { field: { fieldPath: champ }, op: 'EQUAL', value: { stringValue: val } } } } }) })).json();
  return (Array.isArray(j) ? j : []).filter(x => x.document).map(x => x.document.name.split('/documents/')[1]);
};
const now = () => ({ timestampValue: new Date().toISOString() });

async function creerCompte(nom, foyer) {
  const email = `qa-lot-a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@vexel-qa.test`;
  const password = 'Qa!' + Math.random().toString(36).slice(2, 12);
  const u = await rest(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { email, password, returnSecureToken: true });
  const uid = u.localId; console.log('compte', nom, uid, foyer ? '(Foyer)' : '(sans Foyer)');
  await fsdoc(`members/${uid}`, { uid: { stringValue: uid }, email: { stringValue: email }, displayName: { stringValue: nom }, dosha: { stringValue: 'pitta' }, lastSeenAt: now(), joinedAt: now() });
  await fsdoc(`memberPoints/${uid}`, { balance: { integerValue: '120' }, lifetime: { integerValue: '120' } });
  if (foyer) {
    await fsdoc(`achatsFormations/${uid}/formations/foyer`, { titre: { stringValue: 'Le Foyer d’Origine' }, source: { stringValue: 'qa' } });
    await fsdoc(`groupes/foyer/membres/${uid}`, { ajouteLe: now() });
  }
  const authUser = { uid, email, emailVerified: false, isAnonymous: false, displayName: nom, providerData: [{ providerId: 'password', uid: email, displayName: null, email, phoneNumber: null, photoURL: null }],
    stsTokenManager: { refreshToken: u.refreshToken, accessToken: u.idToken, expirationTime: Date.now() + Number(u.expiresIn) * 1000 }, createdAt: String(Date.now()), lastLoginAt: String(Date.now()), apiKey: API_KEY, appName: '[DEFAULT]' };
  return { uid, email, idToken: u.idToken, authUser };
}

async function effacerCompte(c) {
  for (const p of await fsquery('mur', 'uid', c.uid)) {
    for (const sub of ['commentaires', 'votes']) for (const d of await fslist(`${p}/${sub}`)) await fsdel(d);
    await fsdel(p); console.log('billet effacé', p);
  }
  try {
    const j = await (await fetch(`https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o?prefix=${encodeURIComponent('mur/' + c.uid + '/')}`, { headers: H })).json();
    for (const it of j.items || []) { const d = await fetch(`https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(it.name)}`, { method: 'DELETE', headers: H }); console.log('photo effacée', it.name, d.status); }
  } catch (e) { console.log('storage', e.message); }
  for (const p of [`achatsFormations/${c.uid}/formations/foyer`, `groupes/foyer/membres/${c.uid}`, `members/${c.uid}`, `memberPoints/${c.uid}`, `boutique/${c.uid}`]) await fsdel(p);
  await rest(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`, { idToken: c.idToken });
}

async function ouvrir(browser, c, mobile) {
  const ctx = await browser.newContext(mobile
    ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
    : { viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('CONSOLE', m.type(), m.text().slice(0, 300)); });
  await page.goto(`${BASE}/robots.txt`);
  await page.evaluate(([key, val]) => new Promise((res, rej) => {
    localStorage.setItem('krystine-jeu-vu', new Date().toISOString().slice(0, 10));
    localStorage.setItem('krystine-banniere-flash-vu', '1');
    localStorage.setItem('inspirata.consent.v1', 'rejected');
    const req = indexedDB.open('firebaseLocalStorageDb', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
    req.onsuccess = () => { const tx = req.result.transaction('firebaseLocalStorage', 'readwrite'); tx.objectStore('firebaseLocalStorage').put({ fbase_key: key, value: val }); tx.oncomplete = () => res(true); tx.onerror = rej; };
    req.onerror = rej;
  }), [`firebase:authUser:${API_KEY}:[DEFAULT]`, c.authUser]);
  return { ctx, page };
}
const fermerRoue = async (page) => { const r = page.locator('.fixed.inset-0.z-\\[125\\]'); if (await r.count()) { await r.first().click({ position: { x: 8, y: 8 } }); await page.waitForTimeout(500); } };
async function aller(page, url) {
  await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('main', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await fermerRoue(page);
}
async function capturer(page, nom) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${nom}.png`, fullPage: true });
  const m = await page.evaluate(() => {
    const h = document.querySelector('h1'); const main = document.querySelector('main');
    const rh = h?.getBoundingClientRect(); const lh = h ? parseFloat(getComputedStyle(h).lineHeight) : 0;
    const rm = main?.getBoundingClientRect();
    return { scrollWidth: document.documentElement.scrollWidth, innerWidth, h1: h ? { lignes: Math.round(rh.height / lh), texte: h.textContent.trim().slice(0, 30) } : null, main: rm ? { x: Math.round(rm.x), w: Math.round(rm.width) } : null, italiques: document.querySelectorAll('main .italic, main i:not(.fa-solid):not(.fa-regular):not(.fa-brands)').length };
  });
  console.log('capture', nom, JSON.stringify(m));
}

const A = await creerCompte('Marie Référence', true);
const B = await creerCompte('Nathalie Sans-Foyer', false);
const browser = await chromium.launch();
try {
  let { ctx, page } = await ouvrir(browser, A, false);
  await aller(page, '/fil');
  const zone = page.locator('textarea[placeholder^="Quoi de neuf"]');
  await zone.waitFor({ timeout: 20000 });
  // Billet 1 : texte
  await zone.click();
  await zone.fill('Premier feu de la saison : je me lève avec le soleil depuis une semaine et le corps suit. Qui d’autre a repris le rituel du matin ?');
  await page.getByRole('button', { name: /Publier/ }).click();
  const b1 = page.locator('article', { hasText: 'Premier feu de la saison' });
  await b1.waitFor({ timeout: 20000 }); await page.waitForTimeout(800);
  // Billet 2 : texte + photo
  await zone.click();
  await zone.fill('La lumière de ce matin dans l’atelier. Une photo pour celles qui aiment les débuts de journée.');
  await page.locator('input[type="file"][accept^="image"]').setInputFiles(PHOTO);
  const composeur = page.locator('section', { has: zone });
  await composeur.locator('img').first().waitFor({ timeout: 60000 });
  await page.getByRole('button', { name: /Publier/ }).click();
  const b2 = page.locator('article', { hasText: 'La lumi' });
  await b2.waitFor({ timeout: 20000 });
  await b2.locator('img').first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(800);
  // Vote et commentaire sur le premier billet
  await b1.getByRole('button', { name: 'Voter pour' }).click();
  await b1.getByRole('button', { name: /Commenter/ }).click();
  await b1.locator('textarea[placeholder*="commentaire"]').fill('Oui ! Depuis lundi, et le café attend maintenant la fin de la respiration.');
  await b1.getByRole('button', { name: 'Envoyer' }).click();
  await b1.locator('text=Depuis lundi').waitFor({ timeout: 20000 });
  await page.waitForTimeout(2500);
  await capturer(page, 'fil-foyer-1440');

  await aller(page, '/fil?fil=krystine'); await capturer(page, 'fil-krystine-1440');
  await aller(page, '/fil?fil=communaute'); await capturer(page, 'fil-communaute-1440');

  await fsdoc(`members/${A.uid}`, { personnalisation: { mapValue: { fields: { skin: { stringValue: 'nuit' } } } } }, ['personnalisation.skin']);
  await aller(page, '/fil'); await capturer(page, 'fil-nuit-1440');
  await fsdoc(`members/${A.uid}`, { personnalisation: { mapValue: { fields: {} } } }, ['personnalisation']);
  await ctx.close();

  ({ ctx, page } = await ouvrir(browser, A, true));
  await aller(page, '/fil');
  const b1m = page.locator('article', { hasText: 'Premier feu de la saison' });
  await b1m.waitFor({ timeout: 20000 });
  await b1m.getByRole('button', { name: /Commenter/ }).click();
  await b1m.locator('text=Depuis lundi').waitFor({ timeout: 20000 });
  await page.waitForTimeout(1200);
  await capturer(page, 'fil-foyer-390');
  await ctx.close();

  ({ ctx, page } = await ouvrir(browser, B, false));
  await aller(page, '/fil'); await capturer(page, 'fil-garde-1440');
  await ctx.close();
} catch (e) {
  console.log('ERREUR', e.message.split('\n')[0]);
  for (const c of browser.contexts()) for (const p of c.pages()) {
    await p.screenshot({ path: `${OUT}/_erreur.png`, fullPage: true }).catch(() => {});
    console.log('état', await p.evaluate(() => ({ url: location.href, articles: document.querySelectorAll('article').length, main: document.querySelector('main')?.innerText.slice(0, 400) })).catch(() => null));
  }
} finally {
  await browser.close();
  await effacerCompte(A); await effacerCompte(B);
  console.log('fini');
}
