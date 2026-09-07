// Vérification sceptique du Foyer social (fil, membres, fiche, messages) contre
// l'espace client. Deux comptes jetables (A membre du Foyer, B destinataire),
// captures 1440 et 390, mesures DOM, contraste, fonctions vivantes, skins,
// pop-ups. Tout est effacé à la fin. Patron : bannieres-signature.mjs.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const API_KEY = fs.readFileSync('.env.local', 'utf8').match(/VITE_FIREBASE_API_KEY=(.+)/)[1].trim();
const PROJET = 'krystinestlaurent-87566';
const BASE = process.env.BASE || 'http://localhost:5199';
const OUT = process.env.OUT || '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/foyer-social/verif-fil-membres';
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(`${OUT}/run.log`, '');
const log = (...a) => { const s = a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); console.log(s); fs.appendFileSync(`${OUT}/run.log`, s + '\n'); };

const rest = async (url, body) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
const gtoken = execSync('gcloud auth print-access-token').toString().trim();
const FS = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents`;
const H = { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' };
const fsdoc = async (path, fields, mask) => {
  const u = `${FS}/${path}` + (mask ? '?' + mask.map(m => 'updateMask.fieldPaths=' + encodeURIComponent(m)).join('&') : '');
  const r = await fetch(u, { method: 'PATCH', headers: H, body: JSON.stringify({ fields }) });
  if (!r.ok) log('firestore PATCH', path, r.status, await r.text());
};
const fsget = async (path) => { const r = await fetch(`${FS}/${path}`, { headers: H }); return r.ok ? r.json() : null; };
const fsdel = async (path) => fetch(`${FS}/${path}`, { method: 'DELETE', headers: H });
const fsquery = async (collectionId, field, value) => {
  const r = await fetch(`${FS}:runQuery`, { method: 'POST', headers: H, body: JSON.stringify({ structuredQuery: { from: [{ collectionId }], where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: { stringValue: value } } } } }) });
  const j = await r.json();
  return (Array.isArray(j) ? j : []).filter(x => x.document).map(x => x.document);
};
const idDe = (doc) => doc.name.split('/').pop();

// ── Les deux comptes ─────────────────────────────────────────────────────────
const creer = async (nom) => {
  const email = `qa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@vexel-qa.test`;
  const password = 'Qa!' + Math.random().toString(36).slice(2, 12);
  const u = await rest(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { email, password, returnSecureToken: true });
  if (!u.localId) throw new Error('signUp: ' + JSON.stringify(u));
  return { ...u, email, nom };
};
const A = await creer('Vérif Foyer');
const B = await creer('Amie Jetable');
const uidA = A.localId, uidB = B.localId;
log('comptes', uidA, uidB);
const now = { timestampValue: new Date().toISOString() };
const str = (s) => ({ stringValue: s });
await fsdoc(`members/${uidA}`, { uid: str(uidA), email: str(A.email), displayName: str(A.nom), dosha: str('pitta'), joinedAt: now, lastSeenAt: now });
await fsdoc(`members/${uidB}`, { uid: str(uidB), email: str(B.email), displayName: str(B.nom), dosha: str('vata'), joinedAt: now, lastSeenAt: now });
await fsdoc(`memberPoints/${uidA}`, { balance: { integerValue: '120' }, lifetime: { integerValue: '120' } });
for (const uid of [uidA, uidB]) {
  await fsdoc(`achatsFormations/${uid}/formations/foyer`, { titre: str('Le Foyer d’Origine'), source: str('qa') });
  await fsdoc(`groupes/foyer/membres/${uid}`, { uid: str(uid), depuis: now });
}

const sessionDe = (u) => ({ uid: u.localId, email: u.email, emailVerified: false, isAnonymous: false, displayName: u.nom,
  providerData: [{ providerId: 'password', uid: u.email, displayName: null, email: u.email, phoneNumber: null, photoURL: null }],
  stsTokenManager: { refreshToken: u.refreshToken, accessToken: u.idToken, expirationTime: Date.now() + Number(u.expiresIn) * 1000 },
  createdAt: String(Date.now()), lastLoginAt: String(Date.now()), apiKey: API_KEY, appName: '[DEFAULT]' });

const browser = await chromium.launch();
const erreursConsole = [];
const ouvrir = async (vue, u) => {
  const ctx = await browser.newContext({ viewport: vue, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') erreursConsole.push(`${vue.width} ${page.url().replace(BASE, '')} ${m.text().slice(0, 160)}`); });
  await page.goto(`${BASE}/robots.txt`);
  if (u) {
    await page.evaluate(([key, val]) => new Promise((res, rej) => {
      localStorage.setItem('krystine-jeu-vu', new Date().toISOString().slice(0, 10));
      localStorage.setItem('krystine-banniere-flash-vu', '1');
      localStorage.setItem('inspirata.consent.v1', 'accepted');
      const req = indexedDB.open('firebaseLocalStorageDb', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
      req.onsuccess = () => { const tx = req.result.transaction('firebaseLocalStorage', 'readwrite'); tx.objectStore('firebaseLocalStorage').put({ fbase_key: key, value: val }); tx.oncomplete = () => res(true); tx.onerror = rej; };
      req.onerror = rej;
    }), [`firebase:authUser:${API_KEY}:[DEFAULT]`, sessionDe(u)]);
  } else {
    await page.evaluate(() => { localStorage.setItem('krystine-jeu-vu', new Date().toISOString().slice(0, 10)); localStorage.setItem('inspirata.consent.v1', 'accepted'); });
  }
  return { ctx, page };
};
const fermerRoue = async (page) => { const r = page.locator('.fixed.inset-0.z-\\[125\\]'); if (await r.count()) { await r.first().click({ position: { x: 8, y: 8 } }); await page.waitForTimeout(500); } };
const aller = async (page, url, attendre) => {
  await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector(attendre, { timeout: 25000 }).catch(e => log('attente échouée', url, attendre, String(e).slice(0, 80)));
  await page.waitForTimeout(2500);
  await fermerRoue(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
};

// ── La mesure d'une page (DOM + styles calculés + contraste) ────────────────
const mesurer = (page) => page.evaluate(() => {
  const q = (s, r = document) => r.querySelector(s);
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) }; };
  const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
  const styles = (el, props) => { if (!el) return null; const c = getComputedStyle(el); return Object.fromEntries(props.map(p => [p, c[p]])); };
  const root = q('.min-h-screen.bg-\\[\\#EEE7DB\\]') || q('[class*="min-h-screen"]');
  const banniere = q('.relative.h-80.w-full');
  const avatar = banniere && banniere.querySelector('.rounded-full.border-4');
  const rangeeOnglets = banniere && banniere.nextElementSibling;
  const onglets = rangeeOnglets ? [...rangeeOnglets.querySelectorAll('a,button')].map(e => (e.textContent || '').trim()) : [];
  const filet = rangeeOnglets && rangeeOnglets.nextElementSibling;
  const pastille = [...document.querySelectorAll('span')].find(s => /Foyer d.Origine|Origine Hearth/.test(s.textContent || '') && s.querySelector('.fa-fire'));
  const grille = q('.mt-8.grid');
  const colonnes = grille ? [...grille.children].map(c => ({ tag: c.tagName.toLowerCase(), ...box(c) })) : [];
  const gcs = grille && getComputedStyle(grille);
  const contenu = grille ? Math.round(grille.getBoundingClientRect().width - parseFloat(gcs.paddingLeft) - parseFloat(gcs.paddingRight)) : null;
  const main = q('main') || (grille && grille.children[0]);
  const carte = main && (main.querySelector('section') || main.querySelector(':scope > div'));
  const carteExterieure = grille && grille.children[grille.children.length === 3 ? 1 : 0];
  const titrePetitesCap = (main || document).querySelector('p[class*="tracking-[0.25em]"]');
  const h1 = banniere && banniere.querySelector('h1');
  const boutonEcrire = [...document.querySelectorAll('a,button')].find(e => /^\s*Écrire\s*$/.test((e.textContent || '').trim()) || /Écrire à la modération|Publier|Envoyer/.test((e.textContent || '').trim()));
  const boutonLaiton = [...(main || document).querySelectorAll('a,button')].find(e => /bg-\[#BA7B39\]/.test(e.className.toString()) && visible(e));
  const corps = (main || document).querySelector('p.text-sm, dd, p[class*="text-sm"], p[class*="text-[13px]"]');
  const italiques = [...document.querySelectorAll('body *')].filter(e => getComputedStyle(e).fontStyle === 'italic' && visible(e) && (e.textContent || '').trim()).map(e => ({ tag: e.tagName.toLowerCase(), cls: e.className.toString().slice(0, 60), txt: (e.textContent || '').trim().slice(0, 40) }));
  const titres = [...document.querySelectorAll('h1,h2,h3')].filter(visible).map(e => { const c = getComputedStyle(e); const lh = parseFloat(c.lineHeight) || parseFloat(c.fontSize) * 1.2; const r = e.getBoundingClientRect(); return { txt: (e.textContent || '').trim().slice(0, 50), lignes: Math.round(r.height / lh), police: c.fontFamily.split(',')[0] }; });
  const etroits = root ? [...root.querySelectorAll('[class*="mx-auto"]')].filter(e => { const r = e.getBoundingClientRect(); return r.height > 80 && r.width > 0 && r.width < innerWidth * 0.6; }).map(e => ({ cls: e.className.toString().slice(0, 80), w: Math.round(e.getBoundingClientRect().width) })) : [];
  // Contraste : composition des fonds en remontant les ancêtres.
  const parse = (c) => { const m = (c || '').match(/[\d.]+/g) || []; return { r: +m[0] || 0, g: +m[1] || 0, b: +m[2] || 0, a: m.length > 3 ? +m[3] : (m.length ? 1 : 0) }; };
  const over = (t, b) => { const a = t.a + b.a * (1 - t.a); if (!a) return { r: 0, g: 0, b: 0, a: 0 }; const f = (k) => (t[k] * t.a + b[k] * b.a * (1 - t.a)) / a; return { r: f('r'), g: f('g'), b: f('b'), a }; };
  const lum = ({ r, g, b }) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const ratio = (a, b) => { const L1 = lum(a), L2 = lum(b); return (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05); };
  const fondRoot = root ? parse(getComputedStyle(root).backgroundColor) : { r: 238, g: 231, b: 219, a: 1 };
  const fondDe = (el) => {
    let acc = null; let e = el;
    while (e && e !== document.documentElement) {
      const c = getComputedStyle(e);
      if (c.backgroundImage && c.backgroundImage !== 'none') return null;
      const bg = parse(c.backgroundColor);
      if (bg.a > 0) { acc = acc ? over(acc, bg) : bg; if (acc.a >= 0.99) return acc; }
      e = e.parentElement;
    }
    return acc ? over(acc, { ...fondRoot, a: 1 }) : { ...fondRoot, a: 1 };
  };
  const hex = (c) => '#' + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  const dansBanniere = (el) => banniere && banniere.contains(el);
  const echantillon = (root || document.body);
  const textes = [...echantillon.querySelectorAll('p,span,a,button,h1,h2,h3,dt,dd,label,li,textarea,input')].filter(e => visible(e) && !dansBanniere(e) && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && getComputedStyle(e).opacity !== '0');
  const mesures = [];
  for (const e of textes) {
    const c = getComputedStyle(e);
    const fond = fondDe(e);
    if (!fond) continue;
    let fg = parse(c.color); if (fg.a < 1) fg = over(fg, fond);
    const r = ratio(fg, fond);
    const bouton = e.closest('a,button');
    const estBouton = !!bouton && parse(getComputedStyle(bouton).backgroundColor).a > 0.5;
    const fs = parseFloat(c.fontSize);
    mesures.push({ txt: (e.textContent || '').trim().slice(0, 36), fg: hex(fg), bg: hex(fond), ratio: +r.toFixed(2), bouton: estBouton, taille: fs });
  }
  const corpsM = mesures.filter(m => !m.bouton && m.taille >= 12).sort((a, b) => a.ratio - b.ratio);
  const boutonsM = mesures.filter(m => m.bouton).sort((a, b) => a.ratio - b.ratio);
  const petitsM = mesures.filter(m => !m.bouton && m.taille < 12).sort((a, b) => a.ratio - b.ratio);
  return {
    largeurFenetre: innerWidth,
    fondRoot: hex(fondRoot),
    banniere: box(banniere), avatar: box(avatar), rangeeOnglets: box(rangeeOnglets), onglets, filetLaiton: filet ? styles(filet, ['height', 'backgroundColor']) : null,
    pastilleFoyer: pastille ? { ...box(pastille), ...styles(pastille, ['backgroundColor', 'color']) } : null,
    grille: box(grille), colonnesGrille: gcs ? gcs.gridTemplateColumns : null, colonnes, contenu, ratioContenu: contenu ? +(contenu / innerWidth).toFixed(3) : null,
    carte: carte ? { cls: carte.className.toString().slice(0, 90), ...styles(carte, ['backgroundColor', 'borderRadius', 'borderColor', 'padding']) } : null,
    carteExterieure: carteExterieure ? { cls: carteExterieure.className.toString().slice(0, 90), ...styles(carteExterieure, ['backgroundColor', 'borderRadius', 'borderColor']) } : null,
    titrePetitesCap: titrePetitesCap ? { txt: (titrePetitesCap.textContent || '').trim().slice(0, 30), ...styles(titrePetitesCap, ['fontFamily', 'fontSize', 'letterSpacing', 'color', 'textTransform', 'fontWeight']) } : null,
    h1: h1 ? { txt: (h1.textContent || '').trim().slice(0, 30), ...styles(h1, ['fontFamily', 'fontSize', 'color']) } : null,
    corps: corps ? styles(corps, ['fontFamily', 'fontSize', 'color', 'lineHeight']) : null,
    boutonEcrire: boutonEcrire ? { txt: (boutonEcrire.textContent || '').trim().slice(0, 30), ...styles(boutonEcrire, ['backgroundColor', 'color', 'borderRadius', 'fontSize', 'fontFamily', 'borderColor', 'textTransform', 'letterSpacing']) } : null,
    boutonLaiton: boutonLaiton ? { txt: (boutonLaiton.textContent || '').trim().slice(0, 30), ...styles(boutonLaiton, ['backgroundColor', 'color', 'borderRadius', 'fontSize']) } : null,
    italiques, titres, etroits,
    contraste: { corpsMin: corpsM[0] || null, corpsPires: corpsM.slice(0, 4), corpsSous45: corpsM.filter(m => m.ratio < 4.5).length, corpsTotal: corpsM.length, boutonsMin: boutonsM[0] || null, boutonsSous3: boutonsM.filter(m => m.ratio < 3).length, boutonsTotal: boutonsM.length, petitsMin: petitsM[0] || null, petitsSous45: petitsM.filter(m => m.ratio < 4.5).length },
  };
});

const PAGES = [
  { nom: 'compte', url: '/compte', attendre: '.relative.h-80' },
  { nom: 'fil', url: '/fil', attendre: 'textarea' },
  { nom: 'membres', url: '/membres', attendre: 'input[type="search"]' },
  { nom: 'membre-autre', url: `/membre/${uidB}`, attendre: 'dl' },
  { nom: 'membre-soi', url: `/membre/${uidA}`, attendre: 'textarea' },
  { nom: 'messages', url: `/messages/${uidB}`, attendre: 'textarea' },
];
const VUES = [{ width: 1440, height: 900 }, { width: 390, height: 844 }];
const resultats = { mesures: {}, skins: {}, fonctions: {}, popups: {}, grilles: {} };
const stamp = Date.now().toString(36);

try {
  // ── V1 à V4, V7 : captures et mesures des six pages aux deux largeurs ─────
  for (const vue of VUES) {
    const { ctx, page } = await ouvrir(vue, A);
    resultats.mesures[vue.width] = {};
    for (const p of PAGES) {
      await aller(page, p.url, p.attendre);
      await page.screenshot({ path: `${OUT}/${p.nom}-${vue.width}.png`, fullPage: true });
      const m = await mesurer(page);
      resultats.mesures[vue.width][p.nom] = m;
      log(`mesure ${p.nom} ${vue.width}`, { banniere: m.banniere, avatar: m.avatar, onglets: m.onglets, pastille: !!m.pastilleFoyer, grille: m.colonnesGrille, colonnes: m.colonnes.map(c => [c.x, c.w]), contenu: m.contenu, ratio: m.ratioContenu, carte: m.carte, titre: m.titrePetitesCap, italiques: m.italiques.length, titres: m.titres, etroits: m.etroits, contraste: m.contraste.corpsMin, boutonsMin: m.contraste.boutonsMin });
    }
    await ctx.close();
  }
  // Les colonnes aux largeurs intermédiaires (V3)
  for (const w of [1280, 1024, 900, 768]) {
    const { ctx, page } = await ouvrir({ width: w, height: 900 }, A);
    await aller(page, '/fil', 'textarea');
    const m = await mesurer(page);
    resultats.grilles[w] = { colonnesGrille: m.colonnesGrille, colonnes: m.colonnes.map(c => [c.tag, c.x, c.w]), ratio: m.ratioContenu };
    log(`grille ${w}`, resultats.grilles[w]);
    if (w === 1024 || w === 768) await page.screenshot({ path: `${OUT}/fil-${w}.png`, fullPage: false });
    await ctx.close();
  }

  // ── V5 : fonctions vivantes à 1440 ────────────────────────────────────────
  {
    const { ctx, page } = await ouvrir(VUES[0], A);
    // Publier un billet dans le fil du Foyer
    await aller(page, '/fil', 'textarea');
    const texteBillet = `Billet de vérification ${stamp}`;
    await page.locator('textarea').first().click();
    await page.locator('textarea').first().fill(texteBillet);
    await page.getByRole('button', { name: /Publier|Publish/ }).click();
    const billet = page.locator('p', { hasText: texteBillet });
    const publie = await billet.first().waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
    const erreurBillet = await page.locator('p.text-red-500').first().textContent().catch(() => null);
    await page.waitForTimeout(800);
    if (publie) await billet.first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${OUT}/v5-billet-publie-1440.png` });
    const docsMur = await fsquery('mur', 'uid', uidA);
    resultats.fonctions.billet = { publie, erreur: erreurBillet, docsFirestore: docsMur.map(d => ({ id: idDe(d), fil: d.fields?.fil?.stringValue, texte: d.fields?.texte?.stringValue?.slice(0, 40) })) };
    log('V5 billet', resultats.fonctions.billet);
    // Voter pour ce billet
    let vote = { clique: false };
    if (publie) {
      const bouton = await page.evaluateHandle((t) => {
        const p = [...document.querySelectorAll('p')].find(e => (e.textContent || '').includes(t));
        let e = p; while (e && !e.querySelector('button[aria-label="Voter pour"]')) e = e.parentElement;
        return e ? e.querySelector('button[aria-label="Voter pour"]') : null;
      }, texteBillet);
      if (bouton && await bouton.evaluate(b => !!b)) {
        await bouton.asElement().click();
        await page.waitForTimeout(1500);
        const presse = await bouton.asElement().getAttribute('aria-pressed');
        const postId = docsMur[0] ? idDe(docsMur[0]) : null;
        const docVote = postId ? await fsget(`mur/${postId}/votes/${uidA}`) : null;
        vote = { clique: true, ariaPressed: presse, docVote: docVote ? { valeur: docVote.fields?.valeur?.integerValue ?? docVote.fields?.valeur, cles: Object.keys(docVote.fields || {}) } : null };
        await page.screenshot({ path: `${OUT}/v5-vote-1440.png` });
      }
    }
    resultats.fonctions.vote = vote;
    log('V5 vote', vote);
    // Écrire un message à B
    await aller(page, `/messages/${uidB}`, 'textarea');
    const texteMsg = `Bonjour Amie, message de vérification ${stamp}`;
    const zone = page.locator('textarea[placeholder*="Écrire à"], textarea[placeholder*="Write to"]').first();
    const zonePrete = await zone.waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
    let message = { zonePrete };
    if (zonePrete) {
      await zone.fill(texteMsg);
      await zone.press('Enter');
      const bulle = page.locator('div[class*="max-w-[78%]"]', { hasText: texteMsg });
      const recu = await bulle.first().waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
      const avis = await page.locator('form p, [class*="text-red"]').first().textContent().catch(() => null);
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${OUT}/v5-message-envoye-1440.png` });
      const filId = [uidA, uidB].sort().join('__');
      const msgs = await fsget(`dms/${filId}/messages`);
      message = { zonePrete, bulleAffichee: recu, avis, filId, messagesFirestore: (msgs?.documents || []).map(d => ({ de: d.fields?.senderUid?.stringValue === uidA ? 'A' : 'B', body: d.fields?.body?.stringValue?.slice(0, 40) })) };
    }
    resultats.fonctions.message = message;
    log('V5 message', message);
    // B le reçoit-elle ?
    {
      const { ctx: ctxB, page: pageB } = await ouvrir(VUES[0], B);
      await aller(pageB, `/messages/${uidA}`, 'textarea');
      const recuB = await pageB.locator('div[class*="max-w-[78%]"]', { hasText: texteMsg }).first().waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
      await pageB.screenshot({ path: `${OUT}/v5-message-recu-B-1440.png` });
      resultats.fonctions.messageRecuParB = recuB;
      log('V5 message reçu par B', recuB);
      await ctxB.close();
    }
    // Retour à /compte
    await aller(page, `/messages/${uidB}`, 'textarea');
    const lienRetour = page.getByRole('link', { name: /Retour à mon espace|Back to my space/ });
    const aLien = await lienRetour.count();
    if (aLien) {
      await lienRetour.first().click();
      await page.waitForURL(/\/compte/, { timeout: 10000 }).catch(() => {});
      await page.waitForSelector('.relative.h-80', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1500); await fermerRoue(page);
    }
    resultats.fonctions.retour = { lienPresent: !!aLien, url: page.url().replace(BASE, ''), banniere: await page.locator('.relative.h-80').count() };
    await page.screenshot({ path: `${OUT}/v5-retour-compte-1440.png` });
    log('V5 retour', resultats.fonctions.retour);
    // Le composeur de la fiche personnelle (fil perso)
    await aller(page, `/membre/${uidA}`, 'textarea');
    const texteMur = `Mot sur mon mur ${stamp}`;
    await page.locator('textarea').first().click();
    await page.locator('textarea').first().fill(texteMur);
    await page.getByRole('button', { name: /Publier|Publish/ }).click();
    const surMur = await page.locator('p', { hasText: texteMur }).first().waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
    const erreurMur = await page.locator('p.text-red-500').first().textContent().catch(() => null);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/v5-billet-mur-perso-1440.png` });
    resultats.fonctions.murPerso = { publie: surMur, erreur: erreurMur };
    log('V5 mur perso', resultats.fonctions.murPerso);
    await ctx.close();
  }

  // ── V6 : les skins ────────────────────────────────────────────────────────
  for (const skin of ['nuit', 'feminite']) {
    await fsdoc(`members/${uidA}`, { personnalisation: { mapValue: { fields: { skin: str(skin) } } } }, ['personnalisation.skin']);
    resultats.skins[skin] = {};
    for (const vue of VUES) {
      const { ctx, page } = await ouvrir(vue, A);
      resultats.skins[skin][vue.width] = {};
      for (const p of PAGES.filter(x => x.nom !== 'membre-soi')) {
        await aller(page, p.url, p.attendre);
        const aSkin = await page.evaluate((s) => !!document.querySelector(`.skin-${s}`), skin);
        await page.screenshot({ path: `${OUT}/skin-${skin}-${p.nom}-${vue.width}.png`, fullPage: true });
        const m = await mesurer(page);
        resultats.skins[skin][vue.width][p.nom] = { classeSkin: aSkin, fondRoot: m.fondRoot, carte: m.carte && m.carte.backgroundColor, carteExterieure: m.carteExterieure && m.carteExterieure.backgroundColor, titre: m.titrePetitesCap && m.titrePetitesCap.color, corps: m.corps && m.corps.color, contraste: m.contraste };
        log(`skin ${skin} ${p.nom} ${vue.width}`, { classeSkin: aSkin, fondRoot: m.fondRoot, carte: m.carte && m.carte.backgroundColor, corpsMin: m.contraste.corpsMin, corpsSous45: `${m.contraste.corpsSous45}/${m.contraste.corpsTotal}`, boutonsMin: m.contraste.boutonsMin, boutonsSous3: `${m.contraste.boutonsSous3}/${m.contraste.boutonsTotal}`, petitsMin: m.contraste.petitsMin, pires: m.contraste.corpsPires });
      }
      await ctx.close();
    }
  }
  await fsdoc(`members/${uidA}`, { personnalisation: { mapValue: { fields: {} } } }, ['personnalisation']);

  // ── V7 : les pop-ups devant les yeux ──────────────────────────────────────
  for (const vue of VUES) {
    const { ctx, page } = await ouvrir(vue, A);
    await aller(page, '/fil', 'textarea');
    await page.evaluate(() => window.scrollTo(0, 700)); await page.waitForTimeout(400);
    const cloche = page.locator('button[aria-label^="Notifications"]').first();
    let popCloche = { present: await cloche.count() };
    if (popCloche.present) {
      await cloche.click({ timeout: 5000 }).catch(e => { popCloche.erreur = String(e).slice(0, 80); });
      await page.waitForTimeout(700);
      popCloche = { ...popCloche, ...(await page.evaluate(() => { const p = document.querySelector('.absolute.right-0[class*="top-[calc(100%+10px)]"]'); if (!p) return { panneau: null }; const r = p.getBoundingClientRect(); return { panneau: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, dansFenetre: r.top >= 0 && r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, scrollY }; })) };
      await page.screenshot({ path: `${OUT}/v7-popup-cloche-${vue.width}.png` });
      await page.keyboard.press('Escape');
    }
    resultats.popups[`cloche-${vue.width}`] = popCloche;
    log(`V7 cloche ${vue.width}`, popCloche);
    // Les commentaires d'un billet (le panneau s'ouvre-t-il là où on clique ?)
    await page.evaluate(() => window.scrollTo(0, 0));
    const btnComment = page.locator('button', { hasText: /Commenter|Commentaire|Comment/ }).first();
    if (await btnComment.count()) {
      await btnComment.scrollIntoViewIfNeeded(); await btnComment.click(); await page.waitForTimeout(600);
      await page.screenshot({ path: `${OUT}/v7-commentaires-${vue.width}.png` });
    }
    await ctx.close();
    // La fenêtre de connexion depuis le Foyer (compte déconnecté)
    const { ctx: ctx2, page: page2 } = await ouvrir(vue, null);
    await page2.goto(`${BASE}/fil`, { waitUntil: 'domcontentloaded' });
    const seConnecter = page2.getByRole('button', { name: /Se connecter|Sign in/ }).first();
    const ok = await seConnecter.waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
    let popConn = { carte: ok };
    if (ok) {
      await page2.waitForTimeout(800);
      await page2.screenshot({ path: `${OUT}/v7-garde-deconnecte-${vue.width}.png` });
      await seConnecter.click(); await page2.waitForTimeout(900);
      popConn = { ...popConn, ...(await page2.evaluate(() => { const d = document.querySelector('[role="dialog"]') || [...document.querySelectorAll('.fixed.inset-0')].pop(); if (!d) return { dialogue: null }; const inner = d.querySelector('form') || d.firstElementChild || d; const r = inner.getBoundingClientRect(); return { dialogue: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, dansFenetre: r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1, parentBody: d.parentElement === document.body }; })) };
      await page2.screenshot({ path: `${OUT}/v7-popup-connexion-${vue.width}.png` });
    }
    resultats.popups[`connexion-${vue.width}`] = popConn;
    log(`V7 connexion ${vue.width}`, popConn);
    await ctx2.close();
  }
} catch (e) {
  log('ERREUR', String(e && e.stack || e));
} finally {
  await browser.close();
  // ── Nettoyage ─────────────────────────────────────────────────────────────
  for (const d of await fsquery('mur', 'uid', uidA)) { const id = idDe(d); await fsdel(`mur/${id}/votes/${uidA}`); await fsdel(`mur/${id}`); }
  const filId = [uidA, uidB].sort().join('__');
  const msgs = await fsget(`dms/${filId}/messages`);
  for (const d of (msgs?.documents || [])) await fsdel(`dms/${filId}/messages/${idDe(d)}`);
  await fsdel(`dms/${filId}`);
  for (const col of ['pointsEvents', 'notifications']) for (const uid of [uidA, uidB]) for (const d of await fsquery(col, 'uid', uid)) await fsdel(`${col}/${idDe(d)}`);
  for (const uid of [uidA, uidB]) {
    for (const p of [`achatsFormations/${uid}/formations/foyer`, `groupes/foyer/membres/${uid}`, `memberPoints/${uid}`, `boutique/${uid}`, `badges/${uid}`, `members/${uid}`]) await fsdel(p);
  }
  for (const u of [A, B]) await rest(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`, { idToken: u.idToken });
  fs.writeFileSync(`${OUT}/resume.json`, JSON.stringify({ ...resultats, erreursConsole: erreursConsole.slice(0, 40) }, null, 1));
  log('erreurs console', erreursConsole.length, erreursConsole.slice(0, 12));
  log('fini, nettoyé');
}
