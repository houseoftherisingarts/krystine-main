// Passe ciblée : liste complète des textes sous 4,5 (corps) et 3 (boutons)
// par skin (aucun, nuit, feminite) sur /compte, /messages, /groupes; position
// du bouton « Retour à mon espace » à 390. Un compte jetable, effacé à la fin.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const API_KEY = fs.readFileSync('.env.local', 'utf8').match(/VITE_FIREBASE_API_KEY=(.+)/)[1].trim();
const PROJET = 'krystinestlaurent-87566';
const BASE = 'http://localhost:5199';
const OUT = process.env.OUT;
const rest = async (url, body) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
const gtoken = execSync('gcloud auth print-access-token').toString().trim();
const FS = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents`;
const fsdoc = async (path, fields, mask) => { const u = `${FS}/${path}` + (mask ? '?' + mask.map(m => 'updateMask.fieldPaths=' + m).join('&') : ''); const r = await fetch(u, { method: 'PATCH', headers: { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) }); if (!r.ok) console.log('firestore', path, r.status, await r.text()); };
const fsdel = async (path) => fetch(`${FS}/${path}`, { method: 'DELETE', headers: { Authorization: `Bearer ${gtoken}` } });
const email = `qa-${Date.now()}@vexel-qa.test`; const password = 'Qa!' + Math.random().toString(36).slice(2, 12);
const u = await rest(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { email, password, returnSecureToken: true });
const uid = u.localId; console.log('compte', uid);
await fsdoc(`members/${uid}`, { uid: { stringValue: uid }, email: { stringValue: email }, displayName: { stringValue: 'Aline Vérif' }, dosha: { stringValue: 'pitta' }, personnalisation: { mapValue: { fields: { banniere: { stringValue: 'iris' } } } } });
await fsdoc(`memberPoints/${uid}`, { balance: { integerValue: '120' }, lifetime: { integerValue: '120' } });
await fsdoc(`achatsFormations/${uid}/formations/foyer`, { titre: { stringValue: 'Le Foyer d’Origine' }, source: { stringValue: 'qa' } });
const authUser = { uid, email, emailVerified: false, isAnonymous: false, displayName: 'Aline Vérif', providerData: [{ providerId: 'password', uid: email, displayName: null, email, phoneNumber: null, photoURL: null }],
  stsTokenManager: { refreshToken: u.refreshToken, accessToken: u.idToken, expirationTime: Date.now() + Number(u.expiresIn) * 1000 }, createdAt: String(Date.now()), lastLoginAt: String(Date.now()), apiKey: API_KEY, appName: '[DEFAULT]' };
const browser = await chromium.launch();
async function ouvrir(vp) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 }); const page = await ctx.newPage();
  await page.goto(`${BASE}/robots.txt`);
  await page.evaluate(([key, val]) => new Promise((res, rej) => {
    localStorage.setItem('krystine-jeu-vu', new Date().toISOString().slice(0, 10)); localStorage.setItem('krystine-banniere-flash-vu', '1'); localStorage.setItem('inspirata.consent.v1', 'rejected');
    const req = indexedDB.open('firebaseLocalStorageDb', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
    req.onsuccess = () => { const tx = req.result.transaction('firebaseLocalStorage', 'readwrite'); tx.objectStore('firebaseLocalStorage').put({ fbase_key: key, value: val }); tx.oncomplete = () => res(true); tx.onerror = rej; };
    req.onerror = rej;
  }), [`firebase:authUser:${API_KEY}:[DEFAULT]`, authUser]);
  return { ctx, page };
}
const fermerRoue = async (page) => { for (let i = 0; i < 3; i++) { const r = page.locator('.fixed.inset-0.z-\\[125\\]'); if (await r.count()) { await r.first().click({ position: { x: 8, y: 8 } }).catch(() => {}); await page.waitForTimeout(500); } else break; } };
const CONTRASTE = () => {
  const visible = (el) => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; let n = el; while (n) { const s = getComputedStyle(n); if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false; n = n.parentElement; } return true; };
  const parse = (c) => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[\s,\/]+/).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const blend = (t, u) => ({ r: t.r * t.a + u.r * (1 - t.a), g: t.g * t.a + u.g * (1 - t.a), b: t.b * t.a + u.b * (1 - t.a) });
  const fond = (el) => { const couches = []; let n = el; let image = false; while (n && n !== document.documentElement) { const s = getComputedStyle(n); const bg = parse(s.backgroundColor); if (bg && bg.a > 0) couches.push(bg); if (s.backgroundImage !== 'none' || n.tagName === 'CANVAS' || n.tagName === 'IMG') image = true; n = n.parentElement; } let base = parse(getComputedStyle(document.body).backgroundColor); if (!base || base.a === 0) base = { r: 255, g: 255, b: 255, a: 1 }; let col = { r: base.r, g: base.g, b: base.b }; for (const c of couches.reverse()) col = blend(c, col); return { col, image }; };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const zone = (e) => e.closest('aside') ? (e.closest('aside').querySelector('nav') ? 'raccourcis' : 'rail-droit') : e.closest('main') ? 'centre' : e.closest('.overflow-x-auto') ? 'onglets' : 'autre';
  const textes = [...document.querySelectorAll('body *')].filter(e => visible(e) && !e.closest('.h-80, .fixed, footer, [aria-hidden="true"]') && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()));
  const out = [];
  for (const e of textes) { const s = getComputedStyle(e); const fg0 = parse(s.color); if (!fg0) continue; const { col: bg, image } = fond(e); if (image) continue; const fg = fg0.a < 1 ? blend(fg0, bg) : fg0; const bouton = !!e.closest('button, a.rounded-full, [role="button"]') || e.tagName === 'BUTTON'; const r = Math.round(ratio(fg, bg) * 100) / 100; if ((bouton && r < 3) || (!bouton && r < 4.5)) out.push({ zone: zone(e), t: e.textContent.trim().slice(0, 36), ratio: r, bouton, taille: parseFloat(s.fontSize), fg: `rgb(${Math.round(fg.r)},${Math.round(fg.g)},${Math.round(fg.b)})`, bg: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})` }); }
  const retour = [...document.querySelectorAll('a')].find(a => /Retour à mon espace/.test(a.textContent)); const rb = retour && retour.getBoundingClientRect();
  return { n: textes.length, sous: out, retour: rb ? { x: Math.round(rb.x), droite: Math.round(rb.right), visibleSansDefiler: rb.right <= window.innerWidth } : null };
};
const res = {};
try {
  for (const skin of ['', 'nuit', 'feminite']) {
    if (skin) await fsdoc(`members/${uid}`, { personnalisation: { mapValue: { fields: { banniere: { stringValue: 'iris' }, skin: { stringValue: skin } } } } }, ['personnalisation']);
    for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      const { ctx, page } = await ouvrir(vp);
      for (const chemin of ['/compte', '/messages', '/groupes']) {
        await page.goto(`${BASE}${chemin}`, { waitUntil: 'domcontentloaded' }); await page.waitForSelector('.relative.h-80.w-full', { timeout: 25000 }); await page.waitForTimeout(2500); await fermerRoue(page);
        const r = await page.evaluate(CONTRASTE); const cle = `${skin || 'base'}|${vp.width}|${chemin}`; res[cle] = r;
        const parZone = {}; for (const s of r.sous) { const k = `${s.zone}${s.bouton ? '/bouton' : ''}`; (parZone[k] ||= new Map()).set(`${s.t}@${s.ratio}`, s); }
        console.log(`\n== ${cle} textes:${r.n} sous-seuil:${r.sous.length} retour:${JSON.stringify(r.retour)}`);
        for (const [k, m] of Object.entries(parZone)) console.log(`  ${k}: ${[...m.values()].slice(0, 6).map(s => `« ${s.t} » ${s.ratio} (${s.fg} sur ${s.bg})`).join(' · ')}${m.size > 6 ? ` … +${m.size - 6}` : ''}`);
      }
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  await rest(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`, { idToken: u.idToken });
  for (const p of [`members/${uid}`, `memberPoints/${uid}`, `boutique/${uid}`, `badges/${uid}`, `achatsFormations/${uid}/formations/foyer`, `groupes/foyer/membres/${uid}`]) await fsdel(p);
  fs.writeFileSync(`${OUT}/rapport-contraste.json`, JSON.stringify(res, null, 2));
  console.log('fini, nettoyé');
}
