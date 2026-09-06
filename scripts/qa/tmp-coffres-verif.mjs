// QA coffres (C1 à C6, sauf C6 qui se vérifie en CLI). Compte jetable Identity
// Toolkit, 1000 niskas seedés (pointsEvents + memberPoints), session injectée
// dans IndexedDB. Patron : scripts/qa/bannieres-signature.mjs.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const API_KEY = fs.readFileSync('.env.local', 'utf8').match(/VITE_FIREBASE_API_KEY=(.+)/)[1].trim();
const PROJET = 'krystinestlaurent-87566';
const BASE = process.env.BASE || 'http://localhost:5199';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/revue/coffres';
fs.mkdirSync(OUT, { recursive: true });

const rest = async (url, body) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
const gtoken = execSync('gcloud auth print-access-token').toString().trim();
const fsBase = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents`;
const fsdoc = async (path, fields) => {
  const r = await fetch(`${fsBase}/${path}`, { method: 'PATCH', headers: { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
  if (!r.ok) console.log('firestore PATCH', path, r.status, await r.text());
};
const fsget = async (path) => {
  const r = await fetch(`${fsBase}/${path}`, { headers: { Authorization: `Bearer ${gtoken}` } });
  if (r.status === 404) return null;
  if (!r.ok) { console.log('firestore GET', path, r.status, await r.text()); return null; }
  return r.json();
};
const fsdel = (path) => fetch(`${fsBase}/${path}`, { method: 'DELETE', headers: { Authorization: `Bearer ${gtoken}` } });
const fsquery = async (collectionId, uid) => {
  const body = { structuredQuery: { from: [{ collectionId }], where: { fieldFilter: { field: { fieldPath: 'uid' }, op: 'EQUAL', value: { stringValue: uid } } } } };
  const r = await fetch(`${fsBase}:runQuery`, { method: 'POST', headers: { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return r.json();
};
const val = (v) => {
  if (v == null) return undefined;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, vv]) => [k, val(vv)]));
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(val);
  return undefined;
};
const decode = (doc) => (doc && doc.fields) ? Object.fromEntries(Object.entries(doc.fields).map(([k, v]) => [k, val(v)])) : null;
const decodeRows = (rows) => (rows || []).filter(r => r.document).map(r => ({ id: r.document.name.split('/').pop(), ...decode(r.document) }));

let echecs = 0;
const attendu = (cond, msg) => { if (cond) console.log(`  OK  ${msg}`); else { console.log(`  FAIL  ${msg}`); echecs++; } };

const comptes = [];
async function nouveauCompte(label) {
  const email = `qa-coffres-${label}-${Date.now()}@vexel-qa.test`;
  const password = 'Qa!' + Math.random().toString(36).slice(2, 12);
  const u = await rest(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { email, password, returnSecureToken: true });
  if (!u.localId) throw new Error('signUp: ' + JSON.stringify(u));
  const uid = u.localId;
  comptes.push({ uid, idToken: u.idToken });
  await fsdoc(`members/${uid}`, { uid: { stringValue: uid }, email: { stringValue: email }, displayName: { stringValue: `QA ${label}` } });
  await fsdoc(`pointsEvents/adjust:${uid}:qa`, { uid: { stringValue: uid }, kind: { stringValue: 'adjust' }, amount: { integerValue: '1000' }, dedupKey: { stringValue: `adjust:${uid}:qa` }, at: { timestampValue: new Date().toISOString() } });
  await fsdoc(`memberPoints/${uid}`, { balance: { integerValue: '1000' }, lifetime: { integerValue: '1000' } });
  return { uid, email, u };
}

async function pageAvecSession(browser, u, uid, email, label) {
  const authUser = {
    uid, email, emailVerified: false, isAnonymous: false, displayName: `QA ${label}`,
    providerData: [{ providerId: 'password', uid: email, displayName: null, email, phoneNumber: null, photoURL: null }],
    stsTokenManager: { refreshToken: u.refreshToken, accessToken: u.idToken, expirationTime: Date.now() + Number(u.expiresIn) * 1000 },
    createdAt: String(Date.now()), lastLoginAt: String(Date.now()), apiKey: API_KEY, appName: '[DEFAULT]',
  };
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const jourMontreal = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  await page.goto(`${BASE}/robots.txt`);
  await page.evaluate(([key, value, jour]) => new Promise((res, rej) => {
    localStorage.setItem('krystine-jeu-vu', new Date().toISOString().slice(0, 10));
    localStorage.setItem('krystine-roue-vue', jour);
    const req = indexedDB.open('firebaseLocalStorageDb', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
    req.onsuccess = () => { const tx = req.result.transaction('firebaseLocalStorage', 'readwrite'); tx.objectStore('firebaseLocalStorage').put({ fbase_key: key, value }); tx.oncomplete = () => res(true); tx.onerror = rej; };
    req.onerror = rej;
  }), [`firebase:authUser:${API_KEY}:[DEFAULT]`, authUser, jourMontreal]);
  return { ctx, page };
}
const fermerBienvenue = async (page) => {
  for (const t of ['Fermer', 'Plus tard', 'Commencer', 'Merci']) { const b = page.getByRole('button', { name: new RegExp(t, 'i') }).first(); if (await b.count()) { try { await b.click({ timeout: 800 }); } catch {} } }
  await page.keyboard.press('Escape');
};
const fermerRoueSiPresente = async (page) => {
  const r = page.locator('.fixed.inset-0.z-\\[125\\]');
  if (await r.count()) { await r.first().click({ position: { x: 8, y: 8 } }).catch(() => {}); await page.waitForTimeout(400); }
};
const clic = async (page, locator) => { await fermerRoueSiPresente(page); await locator.click(); };

const ORDRE = ['bronze', 'argent', 'or'];
const carte = (page, type) => page.locator('#boutique-coffres div.grid.gap-4 > div').nth(ORDRE.indexOf(type));
const boutonCle = (page) => page.getByRole('button', { name: /Acheter une clé|Buy a key/ });
const boutonCoffre = (page, type) => carte(page, type).getByRole('button', { name: /Coffre ·|Chest ·/ });
const boutonOuvrir = (page, type) => carte(page, type).locator('button').nth(1);

// ─── C1 + C4 : le bloc clé unique, aucun prix par coffre, les 3 cartes sans artefact ─
async function scenarioC1C4(browser) {
  console.log('\n=== C1 + C4 : bloc clé unique + cartes des coffres ===');
  const { uid, email, u } = await nouveauCompte('c1c4');
  const { ctx, page } = await pageAvecSession(browser, u, uid, email, 'c1c4');
  await page.goto(`${BASE}/compte?onglet=telechargements`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200); await fermerBienvenue(page); await page.waitForTimeout(500);
  await fermerRoueSiPresente(page);
  const section = page.locator('#boutique-coffres');
  await section.scrollIntoViewIfNeeded(); await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/c1-c4-01-section-entiere.png`, fullPage: false });

  const texteCle = await page.locator('#boutique-coffres p', { hasText: /^Vous avez/i }).first().textContent();
  attendu(/Vous avez\s*0\s*clé, bonne pour n.importe quel coffre/.test((texteCle || '').replace(/\s+/g, ' ')), `texte clé unique conforme (« ${(texteCle || '').trim()} »)`);
  const boutons = await page.locator('#boutique-coffres button', { hasText: /Acheter une clé/ }).count();
  attendu(boutons === 1, `un seul bouton « Acheter une clé » sur la page (trouvés: ${boutons})`);
  const prixParCoffreVisibles = await page.locator('#boutique-coffres button', { hasText: /Coffre ·/ }).allTextContents();
  console.log('  prix des coffres affichés :', prixParCoffreVisibles.map(t => t.trim().replace(/\s+/g, ' ')).join(' | '));
  attendu(!prixParCoffreVisibles.some(t => /clé/i.test(t)), `aucun prix de « clé » mélangé dans les boutons « Coffre · N »`);

  await page.locator('#boutique-coffres').boundingBox();
  await section.screenshot({ path: `${OUT}/c1-c4-02-trois-cartes-zoom.png` });

  await ctx.close();
}

// ─── C3 : chances en clair + texte du doublon ────────────────────────────────
async function scenarioC3(browser) {
  console.log('\n=== C3 : « Ce que le coffre contient » ===');
  const { uid, email, u } = await nouveauCompte('c3');
  const { ctx, page } = await pageAvecSession(browser, u, uid, email, 'c3');
  await page.goto(`${BASE}/compte?onglet=telechargements`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200); await fermerBienvenue(page); await page.waitForTimeout(500);
  await fermerRoueSiPresente(page);
  for (const type of ORDRE) {
    await carte(page, type).scrollIntoViewIfNeeded();
    const toggle = carte(page, type).getByText(/Ce que le coffre contient/i);
    await clic(page, toggle); await page.waitForTimeout(450);
    const panneau = carte(page, type);
    await panneau.screenshot({ path: `${OUT}/c3-${type}-contenu.png` });
    const texte = ((await panneau.textContent()) || '').replace(/\s+/g, ' ');
    attendu(/1 chance sur \d+/.test(texte), `${type} : « 1 chance sur N » visible`);
    attendu(/se transforme en niskas, sa valeur plus 5\s*%/.test(texte), `${type} : texte du doublon (« …se transforme en niskas, sa valeur plus 5 % ») visible`);
    await toggle.click(); await page.waitForTimeout(300); // referme avant la carte suivante
  }
  await ctx.close();
}

// ─── C5 : sans clé / sans coffre ─────────────────────────────────────────────
async function scenarioC5(browser) {
  console.log('\n=== C5 : états sans clé / sans coffre ===');
  { // a) un coffre, pas de clé
    const { uid, email, u } = await nouveauCompte('c5-sanscle');
    const { ctx, page } = await pageAvecSession(browser, u, uid, email, 'c5a');
    await page.goto(`${BASE}/compte?onglet=telechargements`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2200); await fermerBienvenue(page); await page.waitForTimeout(500);
    await carte(page, 'bronze').scrollIntoViewIfNeeded();
    await clic(page, boutonCoffre(page, 'bronze'));
    await page.getByText(/c’est fait|done\./i).first().waitFor({ timeout: 6000 });
    await page.waitForTimeout(400);
    const texte = ((await boutonOuvrir(page, 'bronze').textContent()) || '').trim();
    attendu(await boutonOuvrir(page, 'bronze').isDisabled(), `bouton inactif (coffre sans clé)`);
    attendu(/Il manque une clé/.test(texte), `texte « Il manque une clé » (« ${texte} »)`);
    await carte(page, 'bronze').screenshot({ path: `${OUT}/c5-sans-cle.png` });
    await ctx.close();
  }
  { // b) une clé, pas de coffre
    const { uid, email, u } = await nouveauCompte('c5-sanscoffre');
    const { ctx, page } = await pageAvecSession(browser, u, uid, email, 'c5b');
    await page.goto(`${BASE}/compte?onglet=telechargements`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2200); await fermerBienvenue(page); await page.waitForTimeout(500);
    await carte(page, 'argent').scrollIntoViewIfNeeded();
    await clic(page, boutonCle(page));
    await page.getByText(/c’est fait|done\./i).first().waitFor({ timeout: 6000 });
    await page.waitForTimeout(400);
    const texte = ((await boutonOuvrir(page, 'argent').textContent()) || '').trim();
    attendu(await boutonOuvrir(page, 'argent').isDisabled(), `bouton inactif (clé sans coffre)`);
    attendu(/Aucun coffre à ouvrir/.test(texte), `texte « Aucun coffre à ouvrir » (« ${texte} »)`);
    await carte(page, 'argent').screenshot({ path: `${OUT}/c5-sans-coffre.png` });
    await ctx.close();
  }
}

// ─── C2 : bout en bout, achat clé + coffre bronze + ouverture + vérif REST ──
async function scenarioC2(browser) {
  console.log('\n=== C2 : bout en bout (bronze) ===');
  const { uid, email, u } = await nouveauCompte('c2');
  const { ctx, page } = await pageAvecSession(browser, u, uid, email, 'c2');
  page.on('pageerror', e => console.log('  pageerror', e.message));
  await page.goto(`${BASE}/compte?onglet=telechargements`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200); await fermerBienvenue(page); await page.waitForTimeout(500);
  await carte(page, 'bronze').scrollIntoViewIfNeeded();

  await clic(page, boutonCle(page));
  await page.getByText(/c’est fait|done\./i).first().waitFor({ timeout: 6000 });
  await page.waitForTimeout(300);

  await clic(page, boutonCoffre(page, 'bronze'));
  await page.getByText(/c’est fait|done\./i).first().waitFor({ timeout: 6000 });
  await page.waitForTimeout(300);

  attendu(await boutonOuvrir(page, 'bronze').isEnabled(), `bouton « Ouvrir » actif (clé + coffre en main)`);

  const [reponse] = await Promise.all([
    page.waitForResponse(r => r.url().includes('ouvrirCoffre') && r.request().method() === 'POST', { timeout: 15000 }),
    clic(page, boutonOuvrir(page, 'bronze')),
  ]);
  await page.waitForTimeout(1200);
  const video = page.locator('video[src], video source[src*="ouverture-bronze.mp4"]');
  const videoPresente = await page.locator('video source[src*="ouverture-bronze.mp4"]').count();
  attendu(videoPresente > 0, `<video> avec source /compte/coffres/ouverture-bronze.mp4 présent pendant l'ouverture`);
  await page.screenshot({ path: `${OUT}/c2-01-video-en-cours.png` });

  await page.getByText(/Le coffre contenait|The chest held/).first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/c2-02-lots.png` });

  const corps = await reponse.json().catch(() => null);
  const resultat = corps?.result || corps;
  console.log('  lots reçus :', (resultat?.lots || []).map(l => l.nom).join(', ') || '(voir corps brut)');

  // Vérification REST : compteur clé plat = 0, boites.bronze = 0, un crédit coffre-gain existe.
  const inv = decode(await fsget(`coffres/${uid}`));
  attendu(Number(inv?.cles || 0) === 0, `coffres/${uid}.cles = 0 après ouverture (compteur plat)`);
  attendu(Number(inv?.boites?.bronze || 0) === 0, `coffres/${uid}.boites.bronze = 0 après ouverture`);
  const events = decodeRows(await fsquery('pointsEvents', uid));
  attendu(events.some(e => e.kind === 'coffre-gain'), `pointsEvents : un événement kind=coffre-gain existe (crédit du lot)`);
  attendu(events.filter(e => e.kind === 'coffre').length >= 2, `pointsEvents : débit clé + débit coffre présents`);

  await ctx.close();
}

const browser = await chromium.launch();
try {
  await scenarioC1C4(browser);
  await scenarioC3(browser);
  await scenarioC5(browser);
  await scenarioC2(browser);
} finally {
  await browser.close();
  for (const { uid, idToken } of comptes) {
    await rest(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`, { idToken });
    for (const p of [`members/${uid}`, `memberPoints/${uid}`, `boutique/${uid}`, `coffres/${uid}`, `pointsEvents/adjust:${uid}:qa`]) await fsdel(p);
  }
}
console.log(echecs === 0 ? `\nOK — tout passe (${comptes.length} comptes testés).` : `\nFAIL — ${echecs} échec(s).`);
process.exit(echecs === 0 ? 0 : 1);
