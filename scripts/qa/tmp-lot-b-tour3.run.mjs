// QA temporaire du LOT B (membres, fiche, groupes) : deux comptes jetables,
// A au Foyer, B sans le Foyer avec une demande d'amitié envoyée à A.
// Captures 1440 et 390 dans scratchpad/foyer-social/lot-B/. Tout est effacé à la fin.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const API_KEY = fs.readFileSync('.env.local', 'utf8').match(/VITE_FIREBASE_API_KEY=(.+)/)[1].trim();
const PROJET = 'krystinestlaurent-87566';
const BASE = process.env.BASE || 'http://localhost:5199';
const OUT = process.env.OUT || '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/foyer-social/lot-B';
const rest = async (url, body) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
const gtoken = execSync('gcloud auth print-access-token').toString().trim();
const DOCS = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents/`;
const fsdoc = async (path, fields, mask) => {
  const u = DOCS + path + (mask ? '?' + mask.map(m => 'updateMask.fieldPaths=' + m).join('&') : '');
  const r = await fetch(u, { method: 'PATCH', headers: { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
  if (!r.ok) console.log('firestore', path, r.status, await r.text());
};
const fsdel = async (path) => fetch(DOCS + path, { method: 'DELETE', headers: { Authorization: `Bearer ${gtoken}` } });
const S = v => ({ stringValue: v }); const I = v => ({ integerValue: String(v) }); const T = d => ({ timestampValue: d.toISOString() });
const now = new Date(); const ilYaUnAn = new Date(Date.now() - 365 * 864e5);

const creer = async (nom) => {
  const email = `qa-${nom}-${Date.now()}@vexel-qa.test`; const password = 'Qa!' + Math.random().toString(36).slice(2, 12);
  const u = await rest(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { email, password, returnSecureToken: true });
  return { uid: u.localId, email, u };
};
const A = await creer('a'); const B = await creer('b');
console.log('A', A.uid, 'B', B.uid);
const ecrits = [];
const doc = async (path, fields) => { ecrits.push(path); await fsdoc(path, fields); };
await doc(`members/${A.uid}`, { uid: S(A.uid), email: S(A.email), displayName: S('Marie Référence'), dosha: S('pitta'), joinedAt: T(ilYaUnAn), lastSeenAt: T(now), personnalisation: { mapValue: { fields: { banniere: S('iris') } } } });
await doc(`memberPoints/${A.uid}`, { balance: I(120), lifetime: I(140) });
await doc(`achatsFormations/${A.uid}/formations/foyer`, { titre: S("Le Foyer d'Origine"), source: S('qa') });
await doc(`groupes/foyer/membres/${A.uid}`, { ajouteLe: T(now) });
await doc(`badges/${A.uid}`, { obtenus: { mapValue: { fields: { 'premiere-flamme': T(ilYaUnAn), 'voix-du-cercle': T(now) } } }, vedette: S('voix-du-cercle') });
await doc(`members/${B.uid}`, { uid: S(B.uid), email: S(B.email), displayName: S('Nathalie Landreville'), dosha: S('vata'), joinedAt: T(now), lastSeenAt: T(now) });
const paire = [A.uid, B.uid].sort();
await doc(`amities/${paire.join('__')}`, { paire: { arrayValue: { values: paire.map(S) } }, de: S(B.uid), statut: S('demande'), maj: T(now) });
const post = (id, fil, texte, extra = {}) => doc(`mur/${id}`, { uid: S(A.uid), nom: S('Marie Référence'), texte: S(texte), fil: S(fil), pour: I(3), contre: I(0), score: I(3), nbCommentaires: I(0), chaleur: { doubleValue: 0 }, officiel: { booleanValue: false }, creeLe: T(now), ...extra });
await post(`qa-lotb-perso-${Date.now()}`, 'perso', 'Premier matin d’automne au jardin : la sauge a survécu à la nuit froide et le thé de gingembre a fait le reste.');
await post(`qa-lotb-foyer-${Date.now()}`, 'formation:foyer', 'Qui a déjà essayé l’huile de sésame chaude avant la douche ? Je cherche le bon moment dans la journée.', { formationId: S('foyer') });

const authUser = (c, nom) => ({ uid: c.uid, email: c.email, emailVerified: false, isAnonymous: false, displayName: nom, providerData: [{ providerId: 'password', uid: c.email, displayName: null, email: c.email, phoneNumber: null, photoURL: null }],
  stsTokenManager: { refreshToken: c.u.refreshToken, accessToken: c.u.idToken, expirationTime: Date.now() + Number(c.u.expiresIn) * 1000 }, createdAt: String(Date.now()), lastLoginAt: String(Date.now()), apiKey: API_KEY, appName: '[DEFAULT]' });
const browser = await chromium.launch();
const ouvrir = async (compte, nom, mobile) => {
  const ctx = await browser.newContext(mobile
    ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
    : { viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/robots.txt`);
  await page.evaluate(([key, val]) => new Promise((res, rej) => {
    localStorage.setItem('krystine-jeu-vu', new Date().toISOString().slice(0, 10));
    localStorage.setItem('krystine-banniere-flash-vu', '1');
    localStorage.setItem('inspirata.consent.v1', 'rejected');
    const req = indexedDB.open('firebaseLocalStorageDb', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
    req.onsuccess = () => { const tx = req.result.transaction('firebaseLocalStorage', 'readwrite'); tx.objectStore('firebaseLocalStorage').put({ fbase_key: key, value: val }); tx.oncomplete = () => res(true); tx.onerror = rej; };
    req.onerror = rej;
  }), [`firebase:authUser:${API_KEY}:[DEFAULT]`, authUser(compte, nom)]);
  return page;
};
const fermerRoue = async (page) => { const r = page.locator('.fixed.inset-0.z-\\[125\\]'); if (await r.count()) { await r.first().click({ position: { x: 8, y: 8 } }); await page.waitForTimeout(500); } };
const aller = async (page, chemin, attendre) => {
  await page.goto(`${BASE}${chemin}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector(attendre || 'main', { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(2500); await fermerRoue(page);
};
const mesurer = async (page, nom) => {
  const m = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth,
    main: (() => { const el = document.querySelector('main'); if (!el) return null; const r = el.getBoundingClientRect(); return { left: Math.round(r.left), width: Math.round(r.width) }; })(),
    h1: (() => { const el = document.querySelector('h1'); if (!el) return null; const r = el.getBoundingClientRect(); return { lignes: Math.round(r.height / parseFloat(getComputedStyle(el).lineHeight)), texte: el.textContent.trim().slice(0, 40) }; })(),
    italiques: [...document.querySelectorAll('main *')].filter(e => getComputedStyle(e).fontStyle === 'italic').length,
  }));
  console.log(nom, JSON.stringify(m));
};
const shot = async (page, nom, full = true) => { await page.screenshot({ path: `${OUT}/${nom}.png`, fullPage: full }); await mesurer(page, nom); };


try {
  const m = await ouvrir(A, 'Marie Référence', true);
  await aller(m, '/membres'); await shot(m, 'membres-toutes-390');
  await aller(m, '/membres?vue=demandes'); await shot(m, 'membres-demandes-390');
  await aller(m, `/membre/${B.uid}`); await shot(m, 'membre-autre-390');
  await aller(m, '/cours/foyer', 'h2');
  await m.evaluate(() => { const p = [...document.querySelectorAll('p')].find(e => /^Membres · \d+/.test(e.textContent.trim())); if (p) window.scrollTo(0, p.getBoundingClientRect().top + window.scrollY - 140); });
  await m.waitForTimeout(800);
  await m.screenshot({ path: `${OUT}/cours-foyer-groupe-membres-390.png`, fullPage: false });
  console.log('cours-foyer-groupe-membres-390', JSON.stringify(await m.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth, contenu: document.body.scrollWidth }))));
  await m.context().close();
  const a = await ouvrir(A, 'Marie Référence', false);
  await aller(a, '/cours/foyer', 'h2');
  await a.evaluate(() => { const p = [...document.querySelectorAll('p')].find(e => /^Membres · \d+/.test(e.textContent.trim())); if (p) window.scrollTo(0, p.getBoundingClientRect().top + window.scrollY - 260); });
  await a.waitForTimeout(800);
  await a.screenshot({ path: `${OUT}/cours-foyer-groupe-1440.png`, fullPage: false });
  await a.context().close();
} finally {
  await browser.close();
  for (const c of [A, B]) await rest(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`, { idToken: c.u.idToken });
  for (const p of ecrits) await fsdel(p);
  console.log('fini, effacé', ecrits.length, 'documents');
}
