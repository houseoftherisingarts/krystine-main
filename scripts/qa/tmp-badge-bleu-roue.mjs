// La roue du jour vue par une membre du Foyer, avec la session du SDK client
// dans le navigateur (patron bannieres-signature.mjs) : le serveur déployé
// double le montant du jour 7 (10 niskas) et dépose le cadeau de la semaine.
// Un compte par largeur (une réclamation par jour et par compte). Vite sur 5199.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const API_KEY = fs.readFileSync('.env.local', 'utf8').match(/VITE_FIREBASE_API_KEY=(.+)/)[1].trim();
const PROJET = 'krystinestlaurent-87566';
const BASE = process.env.BASE || 'http://localhost:5199';
const OUT = process.env.OUT || 'scripts/qa/shots';
const MUSIQUE = 'kajabi-2149362766';
const rest = async (url, body) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
const gtoken = execSync('gcloud auth print-access-token').toString().trim();
const FS = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents`;
const fsdoc = async (path, fields) => { const r = await fetch(`${FS}/${path}`, { method: 'PATCH', headers: { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) }); if (!r.ok) console.log('firestore', path, r.status, await r.text()); };
const fsdel = async (path) => fetch(`${FS}/${path}`, { method: 'DELETE', headers: { Authorization: `Bearer ${gtoken}` } });
const fslist = async (p) => { const r = await fetch(`${FS}/${p}?pageSize=300`, { headers: { Authorization: `Bearer ${gtoken}` } }); const j = await r.json(); return (j.documents || []).map((d) => d.name.split('/').pop()); };
const fsquery = async (collection, field, value) => { const r = await fetch(`${FS}:runQuery`, { method: 'POST', headers: { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ structuredQuery: { from: [{ collectionId: collection }], where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: { stringValue: value } } } } }) }); const j = await r.json(); return (Array.isArray(j) ? j : []).filter((x) => x.document).map((x) => x.document.name.split('/').pop()); };
const journee = (ms = Date.now()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
const aujourdhui = journee(); const veille = journee(Date.now() - 86_400_000);
const krystineUid = (await fsquery('members', 'email', 'krystine@inspiratanature.com'))[0];

const browser = await chromium.launch();
const comptes = [];
try {
  const tailles = [[1440, 900, '1440'], [390, 844, '390']].filter(([, , n]) => (process.env.LARGEURS || '1440,390').split(',').includes(n));
  for (const [largeur, hauteur, nom] of tailles) {
    const email = `qa-roue-${nom}-${Date.now()}@vexel-qa.test`; const password = 'Qa!' + Math.random().toString(36).slice(2, 12);
    const u = await rest(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { email, password, returnSecureToken: true });
    const uid = u.localId; comptes.push({ uid, idToken: u.idToken }); console.log('compte', nom, uid);
    await fsdoc(`members/${uid}`, { uid: { stringValue: uid }, email: { stringValue: email }, displayName: { stringValue: 'Test Foyer' } });
    await fsdoc(`achatsFormations/${uid}/formations/foyer`, { titre: { stringValue: "Le Foyer d'Origine" }, source: { stringValue: 'qa' } });
    await fsdoc(`memberPoints/${uid}`, { balance: { integerValue: '0' }, lifetime: { integerValue: '0' }, dernierJour: { stringValue: veille }, serie: { integerValue: '6' } });
    const authUser = { uid, email, emailVerified: false, isAnonymous: false, displayName: 'Test Foyer', providerData: [{ providerId: 'password', uid: email, displayName: null, email, phoneNumber: null, photoURL: null }],
      stsTokenManager: { refreshToken: u.refreshToken, accessToken: u.idToken, expirationTime: Date.now() + Number(u.expiresIn) * 1000 }, createdAt: String(Date.now()), lastLoginAt: String(Date.now()), apiKey: API_KEY, appName: '[DEFAULT]' };
    const ctx = await browser.newContext({ viewport: { width: largeur, height: hauteur }, deviceScaleFactor: 1, isMobile: largeur < 500 });
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
    await page.goto(`${BASE}/compte`, { waitUntil: 'domcontentloaded' });
    const roue = page.locator('.fixed.inset-0.z-\\[125\\]');
    await roue.first().waitFor({ timeout: 30000 });
    await page.waitForTimeout(1800);
    const texte = (await roue.first().innerText()).replace(/\s+/g, ' ');
    console.log(`[${nom}] roue :`, texte.slice(0, 400));
    console.log(`[${nom}] 10 niskas visibles :`, /10 niskas/.test(texte), '· ×2 :', /×2|x2/i.test(texte), '· cadeau :', /semaine complète|musique d’Origine/i.test(texte));
    await page.screenshot({ path: `${OUT}/roue-foyer-${nom}.png` });
    await ctx.close();
  }
} finally {
  await browser.close();
  await new Promise((r) => setTimeout(r, 3000));
  for (const c of comptes) {
    await rest(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`, { idToken: c.idToken });
    for (const id of await fslist(`achatsFormations/${c.uid}/formations`)) await fsdel(`achatsFormations/${c.uid}/formations/${id}`);
    for (const id of await fsquery('pointsEvents', 'uid', c.uid)) await fsdel(`pointsEvents/${id}`);
    if (krystineUid) { const fil = `dms/${krystineUid}__${c.uid}`; for (const m of await fslist(`${fil}/messages`)) await fsdel(`${fil}/messages/${m}`); await fsdel(fil); }
    for (const p of [`members/${c.uid}`, `memberPoints/${c.uid}`, `boutique/${c.uid}`, `badges/${c.uid}`, `coffres/${c.uid}`, `coffresDons/roue:${c.uid}:${aujourdhui}`, `achatsFormations/${c.uid}/formations/${MUSIQUE}`]) await fsdel(p);
  }
  console.log('fini,', comptes.length, 'comptes effacés');
}
