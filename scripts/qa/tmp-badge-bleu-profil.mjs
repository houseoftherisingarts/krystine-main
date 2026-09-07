// QA temporaire du LOT PROFIL (Badge Bleu) : quatre comptes jetables, captures
// de l'onglet Profil et de la section skins à 1440 et 390, un vrai téléversement,
// l'état refusé en direct, la mesure de contraste sur le skin verifie, puis tout
// est effacé. Patron : bannieres-signature.mjs. Vite dev sur 5199 obligatoire.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const API_KEY = fs.readFileSync('.env.local', 'utf8').match(/VITE_FIREBASE_API_KEY=(.+)/)[1].trim();
const PROJET = 'krystinestlaurent-87566';
const BUCKET = 'krystinestlaurent-87566.firebasestorage.app';
const BASE = process.env.BASE || 'http://localhost:5199';
const OUT = process.env.OUT || 'scripts/qa/shots';
fs.mkdirSync(OUT, { recursive: true });
const gtoken = execSync('gcloud auth print-access-token').toString().trim();
const FS = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents`;
const H = { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' };
const rest = async (url, body) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
const fsdoc = async (path, fields, mask) => {
  const u = `${FS}/${path}` + (mask ? '?' + mask.map(m => 'updateMask.fieldPaths=' + m).join('&') : '');
  const r = await fetch(u, { method: 'PATCH', headers: H, body: JSON.stringify({ fields }) });
  if (!r.ok) console.log('firestore', path, r.status, await r.text());
};
const fsdel = (path) => fetch(`${FS}/${path}`, { method: 'DELETE', headers: H });
const fsget = async (path) => { const r = await fetch(`${FS}/${path}`, { headers: H }); return r.ok ? r.json() : null; };
const fslist = async (coll) => ((await (await fetch(`${FS}/${coll}?pageSize=300`, { headers: H })).json()).documents) || [];
const fsquery = async (coll, field, value) => {
  const r = await (await fetch(`${FS}:runQuery`, { method: 'POST', headers: H, body: JSON.stringify({ structuredQuery: { from: [{ collectionId: coll }], where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: { stringValue: value } } } } }) })).json();
  return r.filter(x => x.document).map(x => x.document.name.split('/documents/')[1]);
};
const s = (v) => ({ stringValue: v }); const i = (v) => ({ integerValue: String(v) }); const b = (v) => ({ booleanValue: v });
const ts = (d = new Date()) => ({ timestampValue: d.toISOString() });
const map = (f) => ({ mapValue: { fields: f } });

// Deux vraies formations payantes hors musique.
const formations = (await fslist('formations')).filter(d => d.fields?.paywall?.booleanValue === true && d.fields?.categorie?.stringValue !== 'musique');
const deux = formations.slice(0, 2).map(d => ({ id: d.name.split('/').pop(), titre: d.fields?.titre?.stringValue || 'Formation', imageUrl: d.fields?.imageUrl?.stringValue || '' }));
if (deux.length < 2) throw new Error('Il faut deux formations paywall pour la QA.');
console.log('programmes retenus', deux.map(f => `${f.id} (${f.titre})`).join(' · '));

const comptes = [];
const creer = async (nom, seed) => {
  const email = `qa-bb-${nom}-${Date.now()}@vexel-qa.test`; const password = 'Qa!' + Math.random().toString(36).slice(2, 12);
  const u = await rest(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { email, password, returnSecureToken: true });
  const uid = u.localId; const c = { nom, uid, email, u, fids: [] };
  comptes.push(c);
  await fsdoc(`members/${uid}`, { uid: s(uid), email: s(email), displayName: s(`QA ${nom}`), ...(seed.member || {}) });
  await fsdoc(`memberPoints/${uid}`, { balance: i(120), lifetime: i(120) });
  await fsdoc(`pointsEvents/qa-seed:${uid}`, { uid: s(uid), kind: s('welcome'), amount: i(120), dedupKey: s(`qa-seed:${uid}`), createdAt: ts() });
  if (seed.achats) for (const f of deux) { c.fids.push(f.id); await fsdoc(`achatsFormations/${uid}/formations/${f.id}`, { titre: s(f.titre), imageUrl: s(f.imageUrl), source: s('qa'), acheteLe: ts() }); }
  if (seed.boutique) await fsdoc(`boutique/${uid}`, { possede: map(seed.boutique) });
  if (seed.verification) await fsdoc(`verifications/${uid}`, { uid: s(uid), ...seed.verification });
  console.log('compte', nom, uid);
  return c;
};

const hier = new Date(Date.now() - 3 * 864e5);
const A = await creer('aucun', {});
const B = await creer('deux', { achats: true });
const C = await creer('attente', { achats: true, verification: { statut: s('en_attente'), programmes: i(2), pieceChemin: s(''), demandeLe: ts(hier), decideLe: { nullValue: null }, decidePar: { nullValue: null }, motif: { nullValue: null } } });
const D = await creer('pose', {
  member: { verifie: b(true), personnalisation: map({ skin: s('verifie') }) },
  boutique: { 'skin-verifie': ts(hier) },
  verification: { statut: s('approuvee'), programmes: i(2), pieceChemin: { nullValue: null }, demandeLe: ts(new Date(Date.now() - 5 * 864e5)), decideLe: ts(hier), decidePar: s('qa'), motif: { nullValue: null } },
});

const browser = await chromium.launch();
const session = async (c, viewport) => {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const authUser = { uid: c.uid, email: c.email, emailVerified: false, isAnonymous: false, displayName: `QA ${c.nom}`, providerData: [{ providerId: 'password', uid: c.email, displayName: null, email: c.email, phoneNumber: null, photoURL: null }],
    stsTokenManager: { refreshToken: c.u.refreshToken, accessToken: c.u.idToken, expirationTime: Date.now() + Number(c.u.expiresIn) * 1000 }, createdAt: String(Date.now()), lastLoginAt: String(Date.now()), apiKey: API_KEY, appName: '[DEFAULT]' };
  await page.goto(`${BASE}/robots.txt`);
  await page.evaluate(([key, val]) => new Promise((res, rej) => {
    const jour = new Date().toISOString().slice(0, 10);
    localStorage.setItem('krystine-jeu-vu', jour); localStorage.setItem('krystine-roue-vue', jour);
    localStorage.setItem('krystine-banniere-flash-vu', '1'); localStorage.setItem('inspirata.consent.v1', 'rejected');
    const req = indexedDB.open('firebaseLocalStorageDb', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
    req.onsuccess = () => { const tx = req.result.transaction('firebaseLocalStorage', 'readwrite'); tx.objectStore('firebaseLocalStorage').put({ fbase_key: key, value: val }); tx.oncomplete = () => res(true); tx.onerror = rej; };
    req.onerror = rej;
  }), [`firebase:authUser:${API_KEY}:[DEFAULT]`, authUser]);
  const fermerRoue = async () => { const r = page.locator('.fixed.inset-0.z-\\[125\\]'); if (await r.count()) { await r.first().click({ position: { x: 8, y: 8 } }); await page.waitForTimeout(500); } };
  // Le site défile en douceur (html { scroll-behavior: smooth }) : une capture prise
  // pendant l'animation montre le fond du body au-dessus de l'en-tête. Défilement instantané pour la QA.
  page.on('load', () => page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' }).catch(() => {}));
  return { ctx, page, fermerRoue };
};
const cadrer = async (page, sel) => { await page.locator(sel).first().evaluate(el => { const y = el.getBoundingClientRect().top + window.scrollY - 84; window.scrollTo({ top: Math.max(0, y), behavior: 'instant' }); }); await page.waitForTimeout(500); };
const VIEWS = [[1440, 900, '1440'], [390, 844, '390']];
const ETAPES = (process.env.ETAPES || 'profil,boutique,demo').split(',');

// La mesure de contraste : chaque élément porteur de texte, contre le fond
// composé de ses ancêtres (les panneaux translucides s'empilent sur le fond du skin).
const mesurer = (racines) => {
  const parse = (str) => { const m = str.match(/[\d.]+/g); if (!m) return null; return { r: +m[0], g: +m[1], b: +m[2], a: m.length > 3 ? +m[3] : 1 }; };
  const lin = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
  const lum = (c) => .2126 * lin(c.r) + .7152 * lin(c.g) + .0722 * lin(c.b);
  const ratio = (a, c) => { const l1 = lum(a), l2 = lum(c); return (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05); };
  const sur = (dessus, dessous) => ({ r: dessous.r + (dessus.r - dessous.r) * dessus.a, g: dessous.g + (dessus.g - dessous.g) * dessus.a, b: dessous.b + (dessus.b - dessous.b) * dessus.a, a: 1 });
  const racine = document.querySelector('[class*="skin-"]');
  const base = (racine && parse(getComputedStyle(racine).backgroundColor)) || { r: 238, g: 231, b: 219, a: 1 };
  const fondDe = (el) => {
    const couches = []; let e = el; let opaque = false;
    while (e && e !== document.body) {
      const cs = getComputedStyle(e); const bg = parse(cs.backgroundColor);
      if (bg && bg.a > 0) { couches.push(bg); if (bg.a >= 1) { opaque = true; break; } }
      if (cs.backgroundImage.includes('gradient') && /from-\[#BA7B39\]\/15/.test(e.className)) couches.push({ r: 186, g: 123, b: 57, a: .15 });
      e = e.parentElement;
    }
    let c = opaque ? couches.pop() : base;
    for (let k = couches.length - 1; k >= 0; k--) c = sur(couches[k], c);
    return c;
  };
  const res = [];
  for (const sel of racines) for (const root of document.querySelectorAll(sel)) for (const el of root.querySelectorAll('*')) {
    if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const col = parse(cs.color); if (!col) continue;
    const fond = fondDe(el); const enc = col.a < 1 ? sur(col, fond) : col;
    let op = 1; for (let e = el; e && e !== document.body; e = e.parentElement) op *= +getComputedStyle(e).opacity;
    res.push({ texte: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 42), ratio: +ratio(enc, fond).toFixed(2), opacite: +op.toFixed(2), col: cs.color, fond: `rgb(${Math.round(fond.r)},${Math.round(fond.g)},${Math.round(fond.b)})` });
  }
  return res;
};
const rapportContraste = (nom, liste) => {
  const sous = liste.filter(x => x.ratio < 4.5 && x.opacite >= 1);
  const min = liste.reduce((m, x) => x.opacite >= 1 && x.ratio < m.ratio ? x : m, { ratio: 99 });
  console.log(`contraste ${nom} : ${liste.length} textes, minimum ${min.ratio} (« ${min.texte} », ${min.col} sur ${min.fond}), sous 4,5 : ${sous.length}`);
  for (const x of sous) console.log('   ⚠', x.ratio, x.texte, x.col, 'sur', x.fond);
  for (const x of liste.filter(x => x.opacite < 1)) console.log('   (atténué', x.opacite, ')', x.ratio, x.texte);
};

try {
  // 1. Profil, quatre états, deux largeurs.
  if (ETAPES.includes('profil')) for (const c of [A, B, C, D]) for (const [w, h, v] of VIEWS) {
    const { ctx, page, fermerRoue } = await session(c, { width: w, height: h });
    await page.goto(`${BASE}/compte?onglet=profile`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#badge-bleu', { timeout: 25000 }); await page.waitForTimeout(3000); await fermerRoue();
    await cadrer(page, '#badge-bleu');
    await page.screenshot({ path: `${OUT}/profil-${c.nom}-${v}.png` });
    if (v === '390') await page.locator('#badge-bleu').screenshot({ path: `${OUT}/profil-${c.nom}-390-bloc.png` });
    const h3 = await page.locator('#badge-bleu h3').first().evaluate(el => ({ texte: el.textContent, lignes: Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)) }));
    console.log(`profil ${c.nom} ${v} : titre « ${h3.texte} » sur ${h3.lignes} ligne(s)`);

    // 2. Le compte à deux achats : un vrai téléversement, jusqu'au statut à l'écran (le LOT SERVEUR doit être déployé).
    if (c === B && v === '1440') {
      const png = await page.screenshot({ clip: { x: 0, y: 0, width: 48, height: 48 } });
      console.log('pièce de test :', png.length, 'octets');
      await page.setInputFiles('#badge-bleu input[type=file]', { name: 'piece-qa.png', mimeType: 'image/png', buffer: png });
      await page.waitForSelector('#badge-bleu >> text=piece-qa.png', { timeout: 5000 });
      await page.screenshot({ path: `${OUT}/profil-deux-1440-fichier-choisi.png` });
      await page.locator('#badge-bleu button', { hasText: /Envoyer ma demande/ }).click();
      const issue = await Promise.race([
        page.waitForSelector('#badge-bleu >> text=/Votre demande est (chez Krystine|partie)/', { timeout: 30000 }).then(() => 'attente'),
        page.waitForSelector('#badge-bleu [role=alert]', { timeout: 30000 }).then(async el => 'erreur : ' + await el.textContent()),
      ]).catch(e => 'délai : ' + e.message.split('\n')[0]);
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${OUT}/profil-deux-1440-apres-envoi.png` });
      const doc = await fsget(`verifications/${B.uid}`);
      console.log('téléversement + demande :', issue, '| verifications/{uid} :', doc ? `${doc.fields?.statut?.stringValue} (programmes ${doc.fields?.programmes?.integerValue})` : 'absent');
    }

    // 3. Le compte en attente passe au refus en direct : le motif paraît et le formulaire rouvre.
    if (c === C) {
      await fsdoc(`verifications/${C.uid}`, { statut: s('refusee'), motif: s('La pièce envoyée était trop sombre pour que je puisse lire le nom. Une photo prise à la lumière du jour suffira.'), decideLe: ts(), decidePar: s('qa') }, ['statut', 'motif', 'decideLe', 'decidePar']);
      await page.waitForSelector('#badge-bleu >> text=cette fois-ci', { timeout: 15000 }); await page.waitForTimeout(600);
      await cadrer(page, '#badge-bleu');
      await page.screenshot({ path: `${OUT}/profil-refusee-${v}.png` });
      if (v === '390') await page.locator('#badge-bleu').screenshot({ path: `${OUT}/profil-refusee-390-bloc.png` });
      await fsdoc(`verifications/${C.uid}`, { statut: s('en_attente'), motif: { nullValue: null }, decideLe: { nullValue: null }, decidePar: { nullValue: null } }, ['statut', 'motif', 'decideLe', 'decidePar']);
    }

    // 4. Contraste du skin verifie sur le profil (compte posé).
    if (c === D && v === '1440') rapportContraste('profil (skin verifie)', await page.evaluate(mesurer, ['#badge-bleu', '#badge-bleu + div']));
    await ctx.close();
  }

  // 5. La section skins de la boutique : sans le skin (B) et avec le skin actif (D).
  if (ETAPES.includes('boutique')) for (const c of [B, D]) for (const [w, h, v] of VIEWS) {
    const { ctx, page, fermerRoue } = await session(c, { width: w, height: h });
    await page.goto(`${BASE}/compte?onglet=telechargements`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#boutique-skin', { timeout: 25000 }); await page.waitForTimeout(2500); await fermerRoue();
    const carte = page.locator('#boutique-skin .rounded-\\[18px\\]', { hasText: 'Skin Vérifié' }).first();
    await carte.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/boutique-${c.nom}-${v}.png` });
    await carte.screenshot({ path: `${OUT}/boutique-${c.nom}-${v}-carte.png` });
    console.log(`boutique ${c.nom} ${v} : carte « ${(await carte.textContent()).replace(/\s+/g, ' ').slice(0, 120)} »`);
    if (c === D && v === '1440') rapportContraste('boutique (skin verifie)', await page.evaluate(mesurer, ['#boutique-skin']));
    if (c === B && v === '1440') {
      // Le lien « Réservé au Badge Bleu » ramène à l'onglet Profil, sur le bloc.
      await carte.locator('a', { hasText: /Réservé au Badge Bleu/ }).click();
      await page.waitForSelector('#badge-bleu', { timeout: 15000 });
      console.log('lien boutique → profil :', page.url().includes('onglet=profile') ? 'ok' : 'url ' + page.url());
    }
    await ctx.close();
  }

  // 6. La maquette sans compte, pour la mesure globale du skin.
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const page = await ctx.newPage();
    await page.goto(`${BASE}/demo-skins?skin=verifie`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1500);
    rapportContraste('demo-skins verifie', await page.evaluate(mesurer, ['.skin-verifie .grid']));
    await ctx.close();
  }
} finally {
  await browser.close();
  for (const c of comptes) {
    await fetch(`https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(`verifications/${c.uid}/piece.png`)}`, { method: 'DELETE', headers: { Authorization: `Firebase ${c.u.idToken}` } }).catch(() => {});
    await rest(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`, { idToken: c.u.idToken });
    for (const fid of c.fids) await fsdel(`achatsFormations/${c.uid}/formations/${fid}`);
    for (const p of [`members/${c.uid}`, `memberPoints/${c.uid}`, `boutique/${c.uid}`, `verifications/${c.uid}`, `badges/${c.uid}`, `coffres/${c.uid}`]) await fsdel(p);
    for (const ev of await fsquery('pointsEvents', 'uid', c.uid)) await fsdel(ev);
    console.log('effacé', c.nom, c.uid);
  }
  console.log('fini');
}
