// Vérification (lecture seule sur le code) : messagerie d'origine, groupe,
// navigation /compte → Foyer, retour, skins, italiques, titres, pop-ups.
// Deux comptes jetables membres du Foyer; tout est effacé à la fin.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const API_KEY = fs.readFileSync('.env.local', 'utf8').match(/VITE_FIREBASE_API_KEY=(.+)/)[1].trim();
const PROJET = 'krystinestlaurent-87566';
const BASE = process.env.BASE || 'http://localhost:5199';
const OUT = process.env.OUT;
fs.mkdirSync(OUT, { recursive: true });
const rest = async (url, body) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
const gtoken = execSync('gcloud auth print-access-token').toString().trim();
const FS = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents`;
const fsdoc = async (path, fields, mask) => {
  const u = `${FS}/${path}` + (mask ? '?' + mask.map(m => 'updateMask.fieldPaths=' + m).join('&') : '');
  const r = await fetch(u, { method: 'PATCH', headers: { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
  if (!r.ok) console.log('firestore', path, r.status, await r.text());
};
const fsdel = async (path) => fetch(`${FS}/${path}`, { method: 'DELETE', headers: { Authorization: `Bearer ${gtoken}` } });
const fslist = async (path) => { const r = await fetch(`${FS}/${path}?pageSize=300`, { headers: { Authorization: `Bearer ${gtoken}` } }); const j = await r.json(); return (j.documents || []).map(d => d.name.split('/documents/')[1]); };
const fsquery = async (coll, field, value) => {
  const r = await fetch(`${FS}:runQuery`, { method: 'POST', headers: { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: coll }], where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: { stringValue: value } } } } }) });
  const j = await r.json(); return j.filter(x => x.document).map(x => x.document.name.split('/documents/')[1]);
};

const rapport = { comptes: {}, mesures: {}, evenements: [] };
const log = (...a) => { console.log(...a); rapport.evenements.push(a.join(' ')); };
const now = { timestampValue: new Date().toISOString() };

async function creerCompte(nom, banniere) {
  const email = `qa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@vexel-qa.test`; const password = 'Qa!' + Math.random().toString(36).slice(2, 12);
  const u = await rest(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { email, password, returnSecureToken: true });
  const uid = u.localId;
  await fsdoc(`members/${uid}`, { uid: { stringValue: uid }, email: { stringValue: email }, displayName: { stringValue: nom }, dosha: { stringValue: 'pitta' }, personnalisation: { mapValue: { fields: { banniere: { stringValue: banniere } } } } });
  await fsdoc(`memberPoints/${uid}`, { balance: { integerValue: '120' }, lifetime: { integerValue: '120' } });
  await fsdoc(`achatsFormations/${uid}/formations/foyer`, { titre: { stringValue: 'Le Foyer d’Origine' }, source: { stringValue: 'qa' }, acheteLe: now });
  log('compte', nom, uid);
  return { uid, email, nom, idToken: u.idToken, refreshToken: u.refreshToken, expiresIn: u.expiresIn };
}
const authUser = (c) => ({ uid: c.uid, email: c.email, emailVerified: false, isAnonymous: false, displayName: c.nom, providerData: [{ providerId: 'password', uid: c.email, displayName: null, email: c.email, phoneNumber: null, photoURL: null }],
  stsTokenManager: { refreshToken: c.refreshToken, accessToken: c.idToken, expirationTime: Date.now() + Number(c.expiresIn) * 1000 }, createdAt: String(Date.now()), lastLoginAt: String(Date.now()), apiKey: API_KEY, appName: '[DEFAULT]' });

async function ouvrir(browser, compte, viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: viewport.width < 500, hasTouch: viewport.width < 500 });
  const page = await ctx.newPage();
  page.on('pageerror', e => log('PAGEERROR', viewport.width, e.message));
  await page.goto(`${BASE}/robots.txt`);
  await page.evaluate(([key, val]) => new Promise((res, rej) => {
    localStorage.setItem('krystine-jeu-vu', new Date().toISOString().slice(0, 10));
    localStorage.setItem('krystine-banniere-flash-vu', '1');
    localStorage.setItem('inspirata.consent.v1', 'rejected');
    const req = indexedDB.open('firebaseLocalStorageDb', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
    req.onsuccess = () => { const tx = req.result.transaction('firebaseLocalStorage', 'readwrite'); tx.objectStore('firebaseLocalStorage').put({ fbase_key: key, value: val }); tx.oncomplete = () => res(true); tx.onerror = rej; };
    req.onerror = rej;
  }), [`firebase:authUser:${API_KEY}:[DEFAULT]`, authUser(compte)]);
  return { ctx, page };
}
const fermerRoue = async (page) => { for (let i = 0; i < 3; i++) { const r = page.locator('.fixed.inset-0.z-\\[125\\]'); if (await r.count()) { await r.first().click({ position: { x: 8, y: 8 } }).catch(() => {}); await page.waitForTimeout(500); } else break; } };
const attendreCoquille = async (page) => { await page.waitForSelector('.relative.h-80.w-full', { timeout: 25000 }); await page.waitForTimeout(2500); };

// ─── La mesure en page ──────────────────────────────────────────────────────
const MESURE = () => {
  const vw = window.innerWidth;
  const q = (s, r = document) => r.querySelector(s);
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y + window.scrollY), w: Math.round(r.width), h: Math.round(r.height) }; };
  const cs = (el, p) => el ? getComputedStyle(el).getPropertyValue(p) : null;
  const visible = (el) => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; let n = el; while (n) { const s = getComputedStyle(n); if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false; n = n.parentElement; } return true; };
  const banniere = q('.relative.h-80.w-full');
  const avatar = q('a[title="Mon profil"], a[title="My profile"], button[title="Modifier mon profil"], button[title="Edit my profile"]');
  const rangee = q('.flex.flex-nowrap.gap-1.overflow-x-auto');
  const onglets = rangee ? [...rangee.querySelectorAll('a, button')].map(e => e.textContent.trim()) : [];
  const pastille = banniere && [...banniere.querySelectorAll('span')].find(s => /Foyer d.Origine|Origine Hearth/.test(s.textContent) && s.className.includes('bg-[#BA7B39]'));
  const filet = q('.h-0\\.5.w-full.bg-\\[\\#BA7B39\\]');
  const grille = q('.mt-8.grid');
  const gtc = grille ? getComputedStyle(grille).gridTemplateColumns : null;
  const pistes = gtc && gtc !== 'none' ? gtc.split(' ').filter(Boolean).length : null;
  const enfants = grille ? [...grille.children].map(c => ({ tag: c.tagName, ...box(c) })) : [];
  const main = q('main') || (grille ? grille.children[0] : null);
  // La carte de la page (CarteSociale) ou le panneau de /compte
  const carte = main ? (main.querySelector('section') || main) : null;
  const panneauCompte = grille ? grille.children[0] : null;
  const petitesCap = q('p.tracking-\\[0\\.25em\\]');
  const h1 = q('h1');
  const boutonLaiton = [...document.querySelectorAll('button.bg-\\[\\#BA7B39\\], a.bg-\\[\\#BA7B39\\]')].find(visible);
  const boutonEncre = [...document.querySelectorAll('button.bg-\\[\\#293027\\], a.bg-\\[\\#293027\\]')].find(visible);
  const racine = q('.relative.isolate.min-h-screen');
  // Italiques
  const italiques = [...document.querySelectorAll('body *')].filter(e => visible(e) && getComputedStyle(e).fontStyle === 'italic' && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())).map(e => e.textContent.trim().slice(0, 60));
  // Titres sur plus de deux lignes
  const titres = [...document.querySelectorAll('h1, h2, h3, .font-serif')].filter(visible).map(e => { const r = e.getBoundingClientRect(); const lh = parseFloat(getComputedStyle(e).lineHeight) || parseFloat(getComputedStyle(e).fontSize) * 1.2; return { t: e.textContent.trim().slice(0, 50), lignes: Math.round(r.height / lh), font: getComputedStyle(e).fontFamily.split(',')[0] }; });
  // Pop-ups
  const popups = [...document.querySelectorAll('.fixed.inset-0')].filter(visible).map(e => ({ z: getComputedStyle(e).zIndex, ...box(e), scrollY: window.scrollY }));
  // Contraste
  const parse = (c) => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[\s,\/]+/).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const blend = (top, under) => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a) });
  const fond = (el) => { const couches = []; let n = el; let image = false; while (n && n !== document.documentElement) { const s = getComputedStyle(n); const bg = parse(s.backgroundColor); if (bg && bg.a > 0) couches.push(bg); if (s.backgroundImage !== 'none') image = true; if (n.tagName === 'CANVAS' || n.tagName === 'IMG') image = true; n = n.parentElement; } let base = parse(getComputedStyle(document.body).backgroundColor); if (!base || base.a === 0) base = { r: 255, g: 255, b: 255, a: 1 }; let col = { r: base.r, g: base.g, b: base.b }; for (const c of couches.reverse()) col = blend(c, col); return { col, image }; };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const textes = [...document.querySelectorAll('body *')].filter(e => visible(e) && !e.closest('.h-80, .fixed, footer, [aria-hidden="true"], canvas, svg') && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()));
  const contrastes = [];
  for (const e of textes) {
    const s = getComputedStyle(e); const fg0 = parse(s.color); if (!fg0) continue; const { col: bg, image } = fond(e); if (image) continue;
    const fg = fg0.a < 1 ? blend(fg0, bg) : fg0;
    const bouton = !!e.closest('button, a.rounded-full, [role="button"]') || e.tagName === 'BUTTON';
    contrastes.push({ t: e.textContent.trim().slice(0, 40), fg: `rgb(${Math.round(fg.r)},${Math.round(fg.g)},${Math.round(fg.b)})`, bg: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})`, ratio: Math.round(ratio(fg, bg) * 100) / 100, bouton, taille: parseFloat(s.fontSize), gras: Number(s.fontWeight) >= 700 });
  }
  const corps = contrastes.filter(c => !c.bouton); const boutons = contrastes.filter(c => c.bouton);
  const pires = (l, seuil) => l.filter(c => c.ratio < seuil).sort((a, b) => a.ratio - b.ratio).slice(0, 8);
  return {
    url: location.pathname + location.search, vw, scrollW: document.documentElement.scrollWidth,
    banniere: box(banniere), avatar: box(avatar), avatarChevauche: banniere && avatar ? (avatar.getBoundingClientRect().bottom > banniere.getBoundingClientRect().bottom && avatar.getBoundingClientRect().top < banniere.getBoundingClientRect().bottom) : null,
    onglets, pastilleFoyer: !!pastille, filet: !!filet,
    gtc, pistes, enfants, grilleBox: box(grille), mainBox: box(main),
    carte: carte ? { bg: cs(carte, 'background-color'), radius: cs(carte, 'border-radius'), border: cs(carte, 'border-color'), classe: carte.className.slice(0, 120) } : null,
    panneau: panneauCompte ? { bg: cs(panneauCompte, 'background-color'), radius: cs(panneauCompte, 'border-radius'), classe: panneauCompte.className.slice(0, 120) } : null,
    petitesCap: petitesCap ? { font: cs(petitesCap, 'font-family').split(',')[0], size: cs(petitesCap, 'font-size'), ls: cs(petitesCap, 'letter-spacing'), color: cs(petitesCap, 'color') } : null,
    h1: h1 ? { font: cs(h1, 'font-family').split(',')[0], size: cs(h1, 'font-size'), t: h1.textContent.trim().slice(0, 40) } : null,
    boutonLaiton: boutonLaiton ? { bg: cs(boutonLaiton, 'background-color'), color: cs(boutonLaiton, 'color'), radius: cs(boutonLaiton, 'border-radius'), font: cs(boutonLaiton, 'font-family').split(',')[0], t: boutonLaiton.textContent.trim().slice(0, 30) } : null,
    boutonEncre: boutonEncre ? { bg: cs(boutonEncre, 'background-color'), color: cs(boutonEncre, 'color'), t: boutonEncre.textContent.trim().slice(0, 30) } : null,
    racine: racine ? { classe: racine.className, bg: cs(racine, 'background-color') } : null,
    italiques, titresTropLongs: titres.filter(t => t.lignes > 2), nbTitres: titres.length, popups,
    contraste: { nCorps: corps.length, minCorps: Math.min(...corps.map(c => c.ratio)), sousCorps: pires(corps, 4.5), nBoutons: boutons.length, minBoutons: Math.min(...boutons.map(c => c.ratio)), sousBoutons: pires(boutons, 3) },
  };
};
async function mesurer(page, cle) { const m = await page.evaluate(MESURE); rapport.mesures[cle] = m; return m; }
async function capture(page, nom, fullPage = true) { await page.screenshot({ path: `${OUT}/${nom}.png`, fullPage }); }

const browser = await chromium.launch();
let A, B, postIds = [];
try {
  A = await creerCompte('Aline Vérif', 'iris');
  B = await creerCompte('Béa Témoin', 'nature');
  rapport.comptes = { A: A.uid, B: B.uid };
  await new Promise(r => setTimeout(r, 4000)); // le miroir groupes/foyer/membres (fonction) a le temps d'écrire

  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const v = vp.width;
    const { ctx, page } = await ouvrir(browser, A, vp);
    // 1. L'espace client (référence en direct)
    await page.goto(`${BASE}/compte`, { waitUntil: 'domcontentloaded' }); await attendreCoquille(page); await fermerRoue(page);
    await mesurer(page, `compte-${v}`); await capture(page, `compte-${v}`);
    // 2. /compte onglet Amis → lien vers le Foyer
    await page.goto(`${BASE}/compte?onglet=amis`, { waitUntil: 'domcontentloaded' }); await attendreCoquille(page); await fermerRoue(page);
    await page.waitForTimeout(1500); await capture(page, `compte-amis-${v}`);
    const lienAmis = page.locator('a', { hasText: /Ouvrir le cercle au Foyer/ });
    log(v, 'lien Amis → Foyer présent :', await lienAmis.count());
    if (await lienAmis.count()) { await lienAmis.first().scrollIntoViewIfNeeded(); await lienAmis.first().click(); await page.waitForURL(/\/membres/, { timeout: 15000 }).catch(e => log(v, 'ERREUR nav amis', e.message)); await attendreCoquille(page); await mesurer(page, `nav-amis-foyer-${v}`); await capture(page, `nav-amis-foyer-${v}`); log(v, 'après Amis →', page.url()); }
    // 3. /compte onglet Messagerie → lien vers le Foyer
    await page.goto(`${BASE}/compte?onglet=messagerie`, { waitUntil: 'domcontentloaded' }); await attendreCoquille(page); await fermerRoue(page);
    await page.waitForTimeout(1500); await mesurer(page, `compte-messagerie-${v}`); await capture(page, `compte-messagerie-${v}`);
    const lienMsg = page.locator('a', { hasText: /Ouvrir dans le Foyer/ });
    log(v, 'lien Messagerie → Foyer présent :', await lienMsg.count());
    if (await lienMsg.count()) { await lienMsg.first().scrollIntoViewIfNeeded(); await lienMsg.first().click(); await page.waitForURL(/\/messages/, { timeout: 15000 }).catch(e => log(v, 'ERREUR nav messagerie', e.message)); await attendreCoquille(page); await mesurer(page, `nav-messagerie-foyer-${v}`); await capture(page, `nav-messagerie-foyer-${v}`); log(v, 'après Messagerie →', page.url()); }
    // 4. /messages
    await page.goto(`${BASE}/messages`, { waitUntil: 'domcontentloaded' }); await attendreCoquille(page);
    await mesurer(page, `messages-${v}`); await capture(page, `messages-${v}`); await capture(page, `messages-${v}-ecran`, false);
    // 5. /messages/{B} : écrire à Béa
    await page.goto(`${BASE}/messages/${B.uid}`, { waitUntil: 'domcontentloaded' }); await attendreCoquille(page);
    const zone = page.locator('textarea[placeholder^="Écrire à"]');
    await zone.waitFor({ timeout: 20000 }).catch(e => log(v, 'ERREUR zone message absente', e.message));
    if (await zone.count()) {
      const texte = `Bonjour Béa, message de vérification ${v} ${Date.now()}`;
      await zone.fill(texte); await page.keyboard.press('Enter');
      const bulle = page.locator('p.whitespace-pre-wrap', { hasText: texte });
      await bulle.waitFor({ timeout: 15000 }).then(() => log(v, 'message envoyé et affiché')).catch(e => log(v, 'ERREUR message non affiché', e.message));
      await page.waitForTimeout(800);
    }
    await mesurer(page, `conversation-${v}`); await capture(page, `conversation-${v}`); await capture(page, `conversation-${v}-ecran`, false);
    // 6. /groupes : publier, voter
    await page.goto(`${BASE}/groupes`, { waitUntil: 'domcontentloaded' }); await attendreCoquille(page);
    const compo = page.locator('textarea[placeholder^="Quoi de neuf"]');
    await compo.waitFor({ timeout: 20000 }).catch(e => log(v, 'ERREUR composeur absent', e.message));
    await mesurer(page, `groupe-${v}`); await capture(page, `groupe-${v}`); await capture(page, `groupe-${v}-ecran`, false);
    if (await compo.count()) {
      const billet = `Billet de vérification ${v} ${Date.now()}`;
      await compo.fill(billet);
      await page.locator('button', { hasText: /^\s*Publier\s*$/ }).first().click();
      const carteBillet = page.locator('article, section, div').filter({ hasText: billet }).locator('[aria-label="Voter pour"]').first();
      await carteBillet.waitFor({ timeout: 15000 }).then(() => log(v, 'billet publié et affiché')).catch(e => log(v, 'ERREUR billet non affiché', e.message));
      if (await carteBillet.count()) {
        await carteBillet.click(); await page.waitForTimeout(1200);
        log(v, 'vote aria-pressed =', await carteBillet.getAttribute('aria-pressed'));
      }
      await page.waitForTimeout(800);
      await capture(page, `groupe-vote-${v}`); await capture(page, `groupe-vote-${v}-ecran`, false);
    }
    // 7. Retour à mon espace
    const retour = page.locator('a', { hasText: /Retour à mon espace/ });
    log(v, 'bouton Retour présent :', await retour.count());
    if (await retour.count()) { await retour.first().scrollIntoViewIfNeeded(); await retour.first().click(); await page.waitForURL(/\/compte/, { timeout: 15000 }).catch(e => log(v, 'ERREUR retour', e.message)); await attendreCoquille(page); await fermerRoue(page); log(v, 'après Retour →', page.url()); await capture(page, `retour-compte-${v}`); }
    await ctx.close();
  }

  // 8. Béa reçoit
  { const { ctx, page } = await ouvrir(browser, B, { width: 1440, height: 900 });
    await page.goto(`${BASE}/messages`, { waitUntil: 'domcontentloaded' }); await attendreCoquille(page);
    const filA = page.locator('button', { hasText: /Aline/ }).first();
    await filA.waitFor({ timeout: 15000 }).then(() => log('B voit le fil d’Aline')).catch(e => log('ERREUR B ne voit pas le fil', e.message));
    if (await filA.count()) { await filA.click(); await page.locator('p.whitespace-pre-wrap', { hasText: /Bonjour Béa/ }).first().waitFor({ timeout: 10000 }).then(() => log('B lit le message d’Aline')).catch(e => log('ERREUR B ne lit pas', e.message)); }
    await page.waitForTimeout(800); await capture(page, `conversation-B-1440`); await ctx.close(); }

  // 9. Skins : nuit puis feminite, écrits par REST
  for (const skin of ['nuit', 'feminite']) {
    await fsdoc(`members/${A.uid}`, { personnalisation: { mapValue: { fields: { banniere: { stringValue: 'iris' }, skin: { stringValue: skin } } } } }, ['personnalisation']);
    for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      const v = vp.width; const { ctx, page } = await ouvrir(browser, A, vp);
      await page.goto(`${BASE}/compte`, { waitUntil: 'domcontentloaded' }); await attendreCoquille(page); await fermerRoue(page); await mesurer(page, `skin-${skin}-compte-${v}`); await capture(page, `skin-${skin}-compte-${v}`, false);
      await page.goto(`${BASE}/messages/${B.uid}`, { waitUntil: 'domcontentloaded' }); await attendreCoquille(page); await page.waitForTimeout(1500); await mesurer(page, `skin-${skin}-messages-${v}`); await capture(page, `skin-${skin}-messages-${v}`); await capture(page, `skin-${skin}-messages-${v}-ecran`, false);
      await page.goto(`${BASE}/groupes`, { waitUntil: 'domcontentloaded' }); await attendreCoquille(page); await page.waitForTimeout(1500); await mesurer(page, `skin-${skin}-groupe-${v}`); await capture(page, `skin-${skin}-groupe-${v}`); await capture(page, `skin-${skin}-groupe-${v}-ecran`, false);
      await ctx.close();
    }
  }
} catch (e) {
  log('ERREUR GLOBALE', e.stack || e.message);
} finally {
  await browser.close();
  // Nettoyage : comptes, documents, fil de messages, billets et votes
  for (const c of [A, B].filter(Boolean)) {
    await rest(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`, { idToken: c.idToken }).catch(() => {});
    for (const id of await fsquery('mur', 'uid', c.uid).catch(() => [])) { for (const s of await fslist(`${id}/votes`).catch(() => [])) await fsdel(s); for (const s of await fslist(`${id}/commentaires`).catch(() => [])) await fsdel(s); await fsdel(id); postIds.push(id); }
    for (const p of [`members/${c.uid}`, `memberPoints/${c.uid}`, `boutique/${c.uid}`, `badges/${c.uid}`, `achatsFormations/${c.uid}/formations/foyer`, `groupes/foyer/membres/${c.uid}`, `blocages/${c.uid}`]) await fsdel(p);
    for (const s of await fslist(`members/${c.uid}/sauvegardes`).catch(() => [])) await fsdel(s);
  }
  if (A && B) { const fil = [A.uid, B.uid].sort().join('__'); for (const s of await fslist(`dms/${fil}/messages`).catch(() => [])) await fsdel(s); await fsdel(`dms/${fil}`); }
  log('nettoyé, billets effacés :', postIds.join(',') || 'aucun');
  fs.writeFileSync(`${OUT}/rapport.json`, JSON.stringify(rapport, null, 2));
  console.log('fini');
}
