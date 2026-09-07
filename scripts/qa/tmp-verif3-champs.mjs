// Troisième passage : les champs de saisie sous les skins (invite ::placeholder,
// texte tapé, fond du champ) sur /fil, /membres et /messages, et une capture
// fenêtre (pas pleine page) à scrollY 700 pour la couture vue sous Nuit.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const API_KEY = fs.readFileSync('.env.local', 'utf8').match(/VITE_FIREBASE_API_KEY=(.+)/)[1].trim();
const PROJET = 'krystinestlaurent-87566';
const BASE = 'http://localhost:5199';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/foyer-social/verif-fil-membres';
fs.writeFileSync(`${OUT}/run3.log`, '');
const log = (...a) => { const s = a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); console.log(s); fs.appendFileSync(`${OUT}/run3.log`, s + '\n'); };
const rest = async (url, body) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
const gtoken = execSync('gcloud auth print-access-token').toString().trim();
const FS = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents`;
const H = { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' };
const fsdoc = async (path, fields, mask) => { const u = `${FS}/${path}` + (mask ? '?' + mask.map(m => 'updateMask.fieldPaths=' + encodeURIComponent(m)).join('&') : ''); const r = await fetch(u, { method: 'PATCH', headers: H, body: JSON.stringify({ fields }) }); if (!r.ok) log('PATCH', path, r.status); };
const fsdel = async (path) => fetch(`${FS}/${path}`, { method: 'DELETE', headers: H });
const str = (s) => ({ stringValue: s });
const creer = async (nom) => { const email = `qa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@vexel-qa.test`; const u = await rest(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { email, password: 'Qa!' + Math.random().toString(36).slice(2, 12), returnSecureToken: true }); return { ...u, email, nom }; };
const A = await creer('Vérif Foyer'); const B = await creer('Amie Jetable');
const uidA = A.localId, uidB = B.localId;
const now = { timestampValue: new Date().toISOString() };
await fsdoc(`members/${uidA}`, { uid: str(uidA), email: str(A.email), displayName: str(A.nom), joinedAt: now, lastSeenAt: now });
await fsdoc(`members/${uidB}`, { uid: str(uidB), email: str(B.email), displayName: str(B.nom), joinedAt: now, lastSeenAt: now });
for (const uid of [uidA, uidB]) await fsdoc(`achatsFormations/${uid}/formations/foyer`, { titre: str('Le Foyer d’Origine'), source: str('qa') });
const browser = await chromium.launch();
const res = {};
try {
  for (const skin of ['', 'nuit', 'feminite']) {
    if (skin) await fsdoc(`members/${uidA}`, { personnalisation: { mapValue: { fields: { skin: str(skin) } } } }, ['personnalisation.skin']);
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/robots.txt`);
    const authUser = { uid: uidA, email: A.email, emailVerified: false, isAnonymous: false, displayName: A.nom, providerData: [{ providerId: 'password', uid: A.email, displayName: null, email: A.email, phoneNumber: null, photoURL: null }], stsTokenManager: { refreshToken: A.refreshToken, accessToken: A.idToken, expirationTime: Date.now() + Number(A.expiresIn) * 1000 }, createdAt: String(Date.now()), lastLoginAt: String(Date.now()), apiKey: API_KEY, appName: '[DEFAULT]' };
    await page.evaluate(([key, val]) => new Promise((res, rej) => {
      localStorage.setItem('krystine-jeu-vu', new Date().toISOString().slice(0, 10)); localStorage.setItem('krystine-banniere-flash-vu', '1'); localStorage.setItem('inspirata.consent.v1', 'accepted');
      const req = indexedDB.open('firebaseLocalStorageDb', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
      req.onsuccess = () => { const tx = req.result.transaction('firebaseLocalStorage', 'readwrite'); tx.objectStore('firebaseLocalStorage').put({ fbase_key: key, value: val }); tx.oncomplete = () => res(true); tx.onerror = rej; };
      req.onerror = rej;
    }), [`firebase:authUser:${API_KEY}:[DEFAULT]`, authUser]);
    const mesureChamps = () => page.evaluate(() => {
      const parse = (c) => { const m = (c || '').match(/[\d.]+/g) || []; return { r: +m[0] || 0, g: +m[1] || 0, b: +m[2] || 0, a: m.length > 3 ? +m[3] : (m.length ? 1 : 0) }; };
      const over = (t, b) => { const a = t.a + b.a * (1 - t.a); const f = (k) => a ? (t[k] * t.a + b[k] * b.a * (1 - t.a)) / a : 0; return { r: f('r'), g: f('g'), b: f('b'), a }; };
      const lum = ({ r, g, b }) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
      const ratio = (a, b) => +(((Math.max(lum(a), lum(b)) + .05) / (Math.min(lum(a), lum(b)) + .05)).toFixed(2));
      const hex = (c) => '#' + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
      const root = document.querySelector('[class*="min-h-screen"]');
      const fondRoot = { ...parse(getComputedStyle(root).backgroundColor), a: 1 };
      const fondDe = (el) => { let acc = null; let e = el; while (e && e !== document.documentElement) { const c = getComputedStyle(e); const bg = parse(c.backgroundColor); if (bg.a > 0) { acc = acc ? over(acc, bg) : bg; if (acc.a >= .99) return acc; } e = e.parentElement; } return acc ? over(acc, fondRoot) : fondRoot; };
      return [...document.querySelectorAll('textarea, input[type="search"], input[type="text"]')].filter(el => el.getBoundingClientRect().width > 0).map(el => {
        const cs = getComputedStyle(el), ph = getComputedStyle(el, '::placeholder');
        const fond = fondDe(el);
        let invite = parse(ph.color); if (invite.a < 1) invite = over(invite, fond);
        let texte = parse(cs.color); if (texte.a < 1) texte = over(texte, fond);
        return { champ: el.getAttribute('placeholder') || el.getAttribute('aria-label') || el.tagName, fond: hex(fond), invite: hex(invite), ratioInvite: ratio(invite, fond), texte: hex(texte), ratioTexte: ratio(texte, fond) };
      });
    });
    res[skin || 'defaut'] = {};
    for (const [nom, url, attendre] of [['fil', '/fil', 'textarea'], ['membres', '/membres', 'input[type="search"]'], ['messages', `/messages/${uidB}`, 'textarea']]) {
      await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector(attendre, { timeout: 20000 }).catch(() => {}); await page.waitForTimeout(2500);
      const skinOk = skin ? await page.evaluate((s) => !!document.querySelector(`.skin-${s}`), skin) : true;
      const champs = await mesureChamps();
      res[skin || 'defaut'][nom] = { skinOk, champs };
      log(`champs ${skin || 'defaut'} ${nom}`, skinOk, champs);
      if (nom === 'fil' && skin) {
        // Le champ avec du texte tapé, en gros plan
        await page.locator('textarea').first().click(); await page.locator('textarea').first().fill('Texte tapé pour la lisibilité');
        await page.waitForTimeout(300);
        const boite = await page.locator('main').first().boundingBox();
        await page.screenshot({ path: `${OUT}/v6-champ-tape-${skin}-1440.png`, clip: { x: Math.max(0, boite.x - 10), y: Math.max(0, boite.y - 10), width: Math.min(1440, boite.width + 20), height: 320 } });
        // La couture : capture fenêtre à scrollY 700 (le calque des effets est fixe)
        await page.evaluate(() => window.scrollTo(0, 700)); await page.waitForTimeout(500);
        await page.screenshot({ path: `${OUT}/v6-couture-${skin}-scroll700-1440.png` });
      }
    }
    await ctx.close();
  }
} catch (e) { log('ERREUR', String(e && e.stack || e)); }
finally {
  await browser.close();
  const filId = [uidA, uidB].sort().join('__');
  const msgs = await fetch(`${FS}/dms/${filId}/messages`, { headers: H }).then(r => r.json()).catch(() => ({}));
  for (const d of (msgs.documents || [])) await fsdel(`dms/${filId}/messages/${d.name.split('/').pop()}`);
  await fsdel(`dms/${filId}`);
  for (const uid of [uidA, uidB]) for (const p of [`achatsFormations/${uid}/formations/foyer`, `memberPoints/${uid}`, `badges/${uid}`, `members/${uid}`]) await fsdel(p);
  for (const u of [A, B]) await rest(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`, { idToken: u.idToken });
  fs.writeFileSync(`${OUT}/resume3.json`, JSON.stringify(res, null, 1));
  log('fini, nettoyé');
}
