// QA temporaire du LOT FOYER (docs/badge-bleu-plan.md, 5.4). Deux comptes
// jetables : une membre du Foyer d'Origine à la veille de son 7e jour, une
// membre ordinaire au même point. Captures de la roue et de l'onglet Niskas à
// 1440 et 390, puis une passe sur un skin sombre pour la lisibilité. Tout est
// effacé à la fin. Patron : scripts/qa/bannieres-signature.mjs.
//
// Sonde du serveur : si `reclamerQuotidien` déployé ne renvoie pas encore
// `foyer` (LOT SERVEUR pas encore en ligne), la réponse de la fonction est
// interceptée par Playwright pour le compte Foyer (mode SIMULÉ), et les
// événements du journal sont semés à la main. Le mode employé s'imprime.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const API_KEY = fs.readFileSync('.env.local', 'utf8').match(/VITE_FIREBASE_API_KEY=(.+)/)[1].trim();
const PROJET = 'krystinestlaurent-87566';
const BASE = process.env.BASE || 'http://localhost:5199';
const OUT = process.env.OUT || '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/badge-bleu/lot-foyer';
fs.mkdirSync(OUT, { recursive: true });
const FN = `https://us-central1-${PROJET}.cloudfunctions.net/reclamerQuotidien`;

const rest = async (url, body) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
const gtoken = execSync('gcloud auth print-access-token').toString().trim();
const fsBase = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents`;
const H = { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' };
const fsdoc = async (path, fields, mask) => {
  const u = `${fsBase}/${path}` + (mask ? '?' + mask.map(m => 'updateMask.fieldPaths=' + m).join('&') : '');
  const r = await fetch(u, { method: 'PATCH', headers: H, body: JSON.stringify({ fields }) });
  if (!r.ok) console.log('firestore PATCH', path, r.status, await r.text());
};
const fsget = async (path) => { const r = await fetch(`${fsBase}/${path}`, { headers: H }); return r.ok ? r.json() : null; };
const fsdel = (path) => fetch(`${fsBase}/${path}`, { method: 'DELETE', headers: H });
const fslist = async (path) => { const r = await fetch(`${fsBase}/${path}?pageSize=300`, { headers: H }); const j = r.ok ? await r.json() : {}; return (j.documents || []).map(d => d.name.split('/documents/')[1]); };
const fsquery = async (collectionId, field, op, value) => {
  const body = { structuredQuery: { from: [{ collectionId }], where: { fieldFilter: { field: { fieldPath: field }, op, value } } } };
  const r = await fetch(`${fsBase}:runQuery`, { method: 'POST', headers: H, body: JSON.stringify(body) });
  return ((await r.json()) || []).filter(x => x.document).map(x => x.document.name.split('/documents/')[1]);
};
const s = (v) => ({ stringValue: v }); const n = (v) => ({ integerValue: String(v) }); const b = (v) => ({ booleanValue: v });
const ts = () => ({ timestampValue: new Date().toISOString() });

const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit' });
const AUJOURDHUI = fmt.format(new Date());
const VEILLE = fmt.format(new Date(new Date(`${AUJOURDHUI}T12:00:00-04:00`).getTime() - 86_400_000));
console.log('journée de Montréal', AUJOURDHUI, 'veille', VEILLE);

let echecs = 0;
const attendu = (cond, msg) => { if (cond) console.log(`  ok    ${msg}`); else { console.log(`  FAIL  ${msg}`); echecs++; } };

// ─── Comptes jetables ────────────────────────────────────────────────────────
const comptes = [];
async function nouveauCompte(label, { foyer, serie, skin } = {}) {
  const email = `qa-foyer-${label}-${Date.now()}@vexel-qa.test`;
  const password = 'Qa!' + Math.random().toString(36).slice(2, 12);
  const u = await rest(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { email, password, returnSecureToken: true });
  if (!u.localId) throw new Error('signUp: ' + JSON.stringify(u));
  const uid = u.localId;
  comptes.push({ uid, idToken: u.idToken, label });
  const perso = skin ? { personnalisation: { mapValue: { fields: { skin: s(skin) } } } } : {};
  await fsdoc(`members/${uid}`, { uid: s(uid), email: s(email), displayName: s(`QA ${label}`), ...perso });
  // 120 niskas semés dans le journal ET le solde (le serveur recalcule depuis le journal).
  await fsdoc(`pointsEvents/adjust:${uid}:qa`, { uid: s(uid), kind: s('adjust'), amount: n(120), dedupKey: s(`adjust:${uid}:qa`), at: ts() });
  const bal = { balance: n(120), lifetime: n(120) };
  if (serie != null) { bal.dernierJour = s(VEILLE); bal.serie = n(serie); }
  await fsdoc(`memberPoints/${uid}`, bal);
  if (foyer) await fsdoc(`achatsFormations/${uid}/formations/foyer`, { titre: s("Le Foyer d'Origine"), source: s('qa') });
  console.log(`compte ${label}`, uid);
  return { uid, email, u };
}

async function contexteAvecSession(browser, c, viewport) {
  const authUser = {
    uid: c.uid, email: c.email, emailVerified: false, isAnonymous: false, displayName: 'QA',
    providerData: [{ providerId: 'password', uid: c.email, displayName: null, email: c.email, phoneNumber: null, photoURL: null }],
    stsTokenManager: { refreshToken: c.u.refreshToken, accessToken: c.u.idToken, expirationTime: Date.now() + Number(c.u.expiresIn) * 1000 },
    createdAt: String(Date.now()), lastLoginAt: String(Date.now()), apiKey: API_KEY, appName: '[DEFAULT]',
  };
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const logs = [];
  page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
  page.on('console', m => { if (/requires an index|listPointsEvents/.test(m.text())) logs.push(`[console] ${m.text().slice(0, 160)}`); });
  await page.goto(`${BASE}/robots.txt`);
  await page.evaluate(([key, value]) => new Promise((res, rej) => {
    localStorage.setItem('krystine-jeu-vu', new Date().toISOString().slice(0, 10));
    localStorage.setItem('krystine-banniere-flash-vu', '1');
    const req = indexedDB.open('firebaseLocalStorageDb', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
    req.onsuccess = () => { const tx = req.result.transaction('firebaseLocalStorage', 'readwrite'); tx.objectStore('firebaseLocalStorage').put({ fbase_key: key, value }); tx.oncomplete = () => res(true); tx.onerror = rej; };
    req.onerror = rej;
  }), [`firebase:authUser:${API_KEY}:[DEFAULT]`, authUser]);
  return { ctx, page, logs };
}

const roue = (page) => page.locator('.fixed.inset-0.z-\\[125\\]');
const fermerRoue = async (page) => { const r = roue(page); if (await r.count()) { await r.first().click({ position: { x: 8, y: 8 } }); await page.waitForTimeout(400); } };
const fermerBienvenue = async (page) => {
  for (const t of ['Plus tard', 'Fermer']) { const bt = page.getByRole('button', { name: new RegExp(`^${t}`, 'i') }).first(); if (await bt.count()) { try { await bt.click({ timeout: 800 }); } catch {} } }
};

// ─── 0. Sonde : le serveur connaît-il la couche Foyer ? ──────────────────────
const sonde = await nouveauCompte('sonde', { foyer: true, serie: 6 });
const rSonde = await rest(FN, { data: {} }).catch(() => ({}));
// (sans jeton : on n'apprend rien; on rappelle avec le jeton de la sonde)
const rep = await (await fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sonde.u.idToken}` }, body: JSON.stringify({ data: {} }) })).json();
const resultatSonde = rep?.result || {};
const SERVEUR_FOYER = typeof resultatSonde.foyer === 'boolean';
console.log('sonde reclamerQuotidien →', JSON.stringify(resultatSonde));
console.log(SERVEUR_FOYER ? 'MODE RÉEL : le serveur renvoie la couche Foyer.' : 'MODE SIMULÉ : le serveur déployé ne renvoie pas encore `foyer`; la réponse du compte Foyer sera interceptée.');
void rSonde;

// ─── 1. Les deux comptes ─────────────────────────────────────────────────────
const foyer = await nouveauCompte('foyer', { foyer: true, serie: 6 });
const ordinaire = await nouveauCompte('ordinaire', { foyer: false, serie: 6 });

const REPONSE_SIMULEE = { deja: false, jour: 7, montant: 10, serie: 7, balance: 130, coffre: true, foyer: true, cadeauHebdo: { genre: 'musique' }, cadeauMois: null };
async function rejouerPremierAppel(page) {
  let cache = null;
  await page.route('**/reclamerQuotidien', async route => {
    if (cache) return route.fulfill({ status: 200, contentType: 'application/json', body: cache });
    const r = await route.fetch(); cache = await r.text();
    return route.fulfill({ status: r.status(), contentType: 'application/json', body: cache });
  });
}
async function brancherSimulation(page, uid) {
  if (SERVEUR_FOYER) return rejouerPremierAppel(page);
  await page.route('**/reclamerQuotidien', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: REPONSE_SIMULEE }) }));
  // Ce que le serveur écrirait : l'événement du jour (doublé), le cadeau hebdo à 0 (musique), la suite à 7.
  await fsdoc(`pointsEvents/quotidien:${uid}:${AUJOURDHUI}`, { uid: s(uid), kind: s('quotidien'), amount: n(10), dedupKey: s(`quotidien:${uid}:${AUJOURDHUI}`), meta: { mapValue: { fields: { jour: n(7), serie: n(7), foyer: b(true) } } }, at: ts() });
  await fsdoc(`pointsEvents/foyer-hebdo:${uid}:${AUJOURDHUI}`, { uid: s(uid), kind: s('foyer-hebdo'), amount: n(0), dedupKey: s(`foyer-hebdo:${uid}:${AUJOURDHUI}`), meta: { mapValue: { fields: { cadeau: s('musique') } } }, at: ts() });
  await fsdoc(`memberPoints/${uid}`, { dernierJour: s(AUJOURDHUI), serie: n(7), balance: n(130), lifetime: n(130) }, ['dernierJour', 'serie', 'balance', 'lifetime']);
}

const browser = await chromium.launch();
const VUES = [{ nom: '1440', viewport: { width: 1440, height: 900 } }, { nom: '390', viewport: { width: 390, height: 844 } }];
try {
  // ─── 2. Le compte Foyer : la roue puis l'onglet Niskas, aux deux largeurs ──
  let premierPassage = true;
  for (const v of VUES) {
    const { ctx, page, logs } = await contexteAvecSession(browser, foyer, v.viewport);
    await brancherSimulation(page, foyer.uid);
    let reponse = null;
    page.on('response', async r => { if (r.url().includes('reclamerQuotidien')) { try { reponse = (await r.json()).result; } catch {} } });
    await page.goto(`${BASE}/compte`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#roue-titre', { timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await fermerBienvenue(page);
    if (!(await roue(page).count())) { await page.evaluate(() => window.dispatchEvent(new Event('krystine:ouvrir-roue'))); await page.waitForTimeout(600); }
    const dlg = page.locator('[role="dialog"][aria-labelledby="roue-titre"]');
    await dlg.first().waitFor({ timeout: 10000 }).catch(() => {});
    const texteRoue = (await dlg.first().innerText().catch(() => '')).replace(/\s+/g, ' ');
    console.log(`\n=== Roue Foyer ${v.nom} ===`);
    if (premierPassage) console.log('réponse serveur →', JSON.stringify(reponse));
    attendu(/×2 Foyer d.Origine/i.test(texteRoue), 'pastille « ×2 Foyer d’Origine » visible');
    attendu(/\+10\b/.test(texteRoue) && /\+2\b/.test(texteRoue) && !/\+5\b/.test(texteRoue.replace(/\+10/g, '')), 'cases doublées (+2 … +10, aucun +5)');
    attendu(/chaque jour compte double/.test(texteRoue), 'texte explicatif du Foyer');
    attendu(/Prochain cadeau de semaine dans/.test(texteRoue), 'ligne de progression');
    if (premierPassage || !SERVEUR_FOYER) attendu(/Une semaine complète : la musique d.Origine est à vous/.test(texteRoue) || (SERVEUR_FOYER && !premierPassage), 'phrase du cadeau hebdo');
    const titre = dlg.locator('#roue-titre').first();
    const boxT = await titre.boundingBox(); const lh = await titre.evaluate(el => parseFloat(getComputedStyle(el).lineHeight));
    attendu(boxT && boxT.height <= lh * 2 + 2, `titre sur ${boxT ? Math.round(boxT.height / lh) : '?'} ligne(s) au plus deux`);
    await page.screenshot({ path: `${OUT}/roue-foyer-${v.nom}.png` });
    await fermerRoue(page);

    // L'onglet Niskas : l'encart du Foyer puis l'historique.
    await page.goto(`${BASE}/compte?onglet=loyalty`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Le Foyer double vos jours', { timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(1200); await fermerBienvenue(page); await fermerRoue(page);
    const encart = page.locator('section', { hasText: 'Le Foyer double vos jours' }).first();
    attendu(await encart.count() > 0, 'encart « Le Foyer double vos jours » présent');
    const texteEncart = (await encart.innerText().catch(() => '')).replace(/\s+/g, ' ');
    attendu(/Suite en cours\s*7\s*jours d.affilée/i.test(texteEncart), `suite en cours à 7 (lu : ${texteEncart.match(/Suite en cours\s*\d+[^.]*/)?.[0] ?? '?'})`);
    attendu(/Prochain cadeau de semaine dans 7 jours, prochain cadeau de mois dans 23 jours/.test(texteEncart), 'progression 7 / 23 jours');
    attendu(/Mois 1 · 30 jours · le prochain/i.test(texteEncart), 'le mois 1 est marqué « le prochain »');
    attendu(/Le cycle repart ensuite à la musique/i.test(texteEncart), 'mention du cycle');
    const boxE = await encart.boundingBox(); const largeurPanneau = await page.evaluate(() => document.querySelector('section')?.parentElement?.getBoundingClientRect().width || 0);
    console.log(`  encart : largeur ${Math.round(boxE?.width ?? 0)} px sur ${Math.round(largeurPanneau)} px de panneau`);
    await encart.scrollIntoViewIfNeeded(); await page.evaluate(() => window.scrollBy(0, -80)); await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/points-foyer-${v.nom}.png` });
    const histo = page.locator('h3', { hasText: /Activité récente/ }).first();
    await histo.scrollIntoViewIfNeeded(); await page.evaluate(() => window.scrollBy(0, -60)); await page.waitForTimeout(300);
    const texteHisto = (await page.locator('section', { hasText: 'Activité récente' }).last().innerText().catch(() => '')).replace(/\s+/g, ' ');
    const indexManquant = logs.some(l => /requires an index/.test(l));
    if (indexManquant) console.log('  BLOQUÉ  historique vide : la requête pointsEvents (uid, at desc) exige un index composite absent en production (préexistant, hors lot)');
    else { attendu(/Semaine complète au Foyer/.test(texteHisto), 'historique : « Semaine complète au Foyer »'); attendu(/Cadeau du jour\s*\S*\s*\+10/.test(texteHisto), 'historique : cadeau du jour à +10'); }
    await page.screenshot({ path: `${OUT}/points-foyer-historique-${v.nom}.png` });
    if (logs.length) console.log('  erreurs de page :', logs.join(' | '));
    await ctx.close();
    premierPassage = false;
  }

  // ─── 3. Le compte ordinaire : rien ne change ─────────────────────────────
  for (const v of VUES) {
    const { ctx, page } = await contexteAvecSession(browser, ordinaire, v.viewport);
    await rejouerPremierAppel(page);
    await page.goto(`${BASE}/compte`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#roue-titre', { timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(1200); await fermerBienvenue(page);
    const dlg = page.locator('[role="dialog"][aria-labelledby="roue-titre"]');
    const texteRoue = (await dlg.first().innerText().catch(() => '')).replace(/\s+/g, ' ');
    console.log(`\n=== Roue ordinaire ${v.nom} ===`);
    attendu(!/Foyer/.test(texteRoue), 'aucune mention du Foyer');
    attendu(/\+5\b/.test(texteRoue) && !/\+10\b/.test(texteRoue), 'cases de base (+5 au jour 7)');
    attendu(/5 niskas tombent dans votre bourse/.test(texteRoue), 'titre à 5 niskas');
    await page.screenshot({ path: `${OUT}/roue-sans-foyer-${v.nom}.png` });
    await fermerRoue(page);
    if (v.nom === '1440') {
      await page.goto(`${BASE}/compte?onglet=loyalty`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('text=Vos niskas', { timeout: 25000 }).catch(() => {});
      await page.waitForTimeout(1500); await fermerBienvenue(page); await fermerRoue(page);
      attendu((await page.locator('text=Le Foyer double vos jours').count()) === 0, 'aucun encart Foyer pour une membre ordinaire');
      await page.screenshot({ path: `${OUT}/points-sans-foyer-${v.nom}.png` });
    }
    await ctx.close();
  }

  // ─── 4. Lisibilité sur un skin sombre (nuit) : même compte Foyer ─────────
  await fsdoc(`members/${foyer.uid}`, { personnalisation: { mapValue: { fields: { skin: s('nuit') } } } }, ['personnalisation']);
  {
    const { ctx, page } = await contexteAvecSession(browser, foyer, VUES[0].viewport);
    await brancherSimulation(page, foyer.uid);
    await page.goto(`${BASE}/compte?onglet=loyalty`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Le Foyer double vos jours', { timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(1500); await fermerBienvenue(page); await fermerRoue(page);
    const encart = page.locator('section', { hasText: 'Le Foyer double vos jours' }).first();
    await encart.scrollIntoViewIfNeeded(); await page.evaluate(() => window.scrollBy(0, -80)); await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/points-foyer-nuit-1440.png` });
    await page.evaluate(() => window.dispatchEvent(new Event('krystine:ouvrir-roue'))); await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/roue-foyer-nuit-1440.png` });
    await ctx.close();
  }
  console.log(`\n${echecs === 0 ? 'Tout passe.' : echecs + ' échec(s).'}`);
} finally {
  await browser.close();
  // ─── 5. Ménage : comptes et tout ce qui a été semé ou écrit par le serveur ─
  for (const c of comptes) {
    await rest(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`, { idToken: c.idToken });
    const uid = c.uid;
    for (const p of [`members/${uid}`, `memberPoints/${uid}`, `boutique/${uid}`, `coffres/${uid}`, `badges/${uid}`, `coffresDons/roue:${uid}:${AUJOURDHUI}`,
      `achatsFormations/${uid}/formations/foyer`, `achatsFormations/${uid}/formations/kajabi-2149362766`, `achatsFormations/${uid}`]) await fsdel(p);
    for (const p of await fsquery('pointsEvents', 'uid', 'EQUAL', s(uid))) await fsdel(p);
    for (const p of await fsquery('rewardRedemptions', 'uid', 'EQUAL', s(uid))) await fsdel(p);
    for (const fil of await fsquery('dms', 'participantUids', 'ARRAY_CONTAINS', s(uid))) { for (const m of await fslist(`${fil}/messages`)) await fsdel(m); await fsdel(fil); }
  }
  console.log('ménage fait pour', comptes.map(c => c.label).join(', '));
}
process.exit(echecs ? 1 : 0);
