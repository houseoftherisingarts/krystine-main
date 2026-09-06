// QA : ouverture de coffre de bout en bout. Compte jetable Identity Toolkit,
// niskas seedés via pointsEvents (le serveur recalcule le solde), session
// injectée dans IndexedDB (même patron que scripts/qa/skins-coffres.mjs).
//
// 0. Vérifie que CONTENUS/PRIX_COFFRES (functions/src/coffres.ts) et
//    COFFRES/PRIX_CLE (src/lib/coffresConfig.ts) portent les mêmes chances.
// 1-3. Achète clé + coffre par de vrais clics, ouvre, vérifie dans Firestore
//    que tout a été débité, crédité, et que la clé est bien consommée.
// 4. Bouton inactif quand il manque la clé.
// 5. Bouton inactif quand il manque le coffre.
// 6. Un lot déjà possédé se change en niskas (valeur × 1,05).
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const API_KEY = fs.readFileSync('.env.local', 'utf8').match(/VITE_FIREBASE_API_KEY=(.+)/)[1].trim();
const PROJET = 'krystinestlaurent-87566';
const BASE = process.env.BASE || 'http://localhost:5199';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/coffres';
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
const attendu = (cond, msg) => { if (cond) console.log(`  ok  ${msg}`); else { console.log(`  FAIL  ${msg}`); echecs++; } };

// ─── 0. Le miroir des chances ────────────────────────────────────────────────
async function verifierMiroir() {
  console.log('\n=== 0. Miroir des chances (CONTENUS vs COFFRES) ===');
  const src = fs.readFileSync(new URL('../../functions/src/coffres.ts', import.meta.url), 'utf8');
  const mC = src.match(/export const CONTENUS: Record<TypeCoffre, Contenu> = (\{[\s\S]*?\n\});/);
  const mP = src.match(/export const PRIX_COFFRES: Record<TypeCoffre, \{[^}]*\}> = (\{[\s\S]*?\n\});/);
  const mK = src.match(/export const PRIX_CLE = (\d+);/);
  const mV = src.match(/const VALEUR_COSMETIQUE: Record<string, number> = (\{[\s\S]*?\n\});/);
  if (!mC || !mP || !mK || !mV) throw new Error('Extraction des tables serveur : un motif est introuvable.');
  const CONTENUS = new Function(`return ${mC[1]}`)();
  const PRIX_COFFRES = new Function(`return ${mP[1]}`)();
  const PRIX_CLE_SERVEUR = Number(mK[1]);
  const VALEUR_COSMETIQUE = new Function(`return ${mV[1]}`)();

  const { COFFRES, PRIX_CLE } = await import(new URL('../../src/lib/coffresConfig.ts', import.meta.url));

  attendu(PRIX_CLE === PRIX_CLE_SERVEUR, `PRIX_CLE identique (${PRIX_CLE})`);
  for (const type of ['bronze', 'argent', 'or']) {
    const s = CONTENUS[type], c = COFFRES[type].contenu;
    attendu(PRIX_COFFRES[type].boite === COFFRES[type].boite, `${type}.boite identique (${COFFRES[type].boite})`);
    attendu(s.legendaire === c.legendaire, `${type}.legendaire identique (${c.legendaire}%)`);
    attendu(JSON.stringify(s.niskas) === JSON.stringify(c.niskas), `${type}.niskas identique`);
    attendu(s.rabais.length === c.rabais.length && s.rabais.every((r, i) => r.unSur === c.rabais[i].unSur), `${type}.rabais (chances) identiques`);
    attendu((s.grandLot?.unSur ?? null) === (c.grandLot?.unSur ?? null), `${type}.grandLot (chance) identique`);
  }
  return { VALEUR_COSMETIQUE };
}

// ─── Comptes jetables ─────────────────────────────────────────────────────────
const comptes = [];
async function nouveauCompte(label) {
  const email = `qa-coffres-${label}-${Date.now()}@vexel-qa.test`;
  const password = 'Qa!' + Math.random().toString(36).slice(2, 12);
  const u = await rest(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { email, password, returnSecureToken: true });
  if (!u.localId) throw new Error('signUp: ' + JSON.stringify(u));
  const uid = u.localId;
  comptes.push({ uid, idToken: u.idToken });
  await fsdoc(`members/${uid}`, { uid: { stringValue: uid }, email: { stringValue: email }, displayName: { stringValue: `QA ${label}` } });
  // 1000 niskas, seedés via un événement du journal (le serveur recalcule le solde à chaque appel).
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
  const logs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[console:${m.type()}] ${m.text()}`); });
  page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
  const jourMontreal = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  await page.goto(`${BASE}/robots.txt`);
  await page.evaluate(([key, value, jour]) => new Promise((res, rej) => {
    localStorage.setItem('krystine-jeu-vu', new Date().toISOString().slice(0, 10));
    localStorage.setItem('krystine-roue-vue', jour); // la roue du jour ne doit pas bloquer les clics du QA
    const req = indexedDB.open('firebaseLocalStorageDb', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
    req.onsuccess = () => { const tx = req.result.transaction('firebaseLocalStorage', 'readwrite'); tx.objectStore('firebaseLocalStorage').put({ fbase_key: key, value }); tx.oncomplete = () => res(true); tx.onerror = rej; };
    req.onerror = rej;
  }), [`firebase:authUser:${API_KEY}:[DEFAULT]`, authUser, jourMontreal]);
  return { ctx, page, logs };
}

const fermerBienvenue = async (page) => {
  for (const t of ['Fermer', 'Plus tard', 'Commencer', 'Merci']) { const b = page.getByRole('button', { name: new RegExp(t, 'i') }).first(); if (await b.count()) { try { await b.click({ timeout: 800 }); } catch {} } }
  await page.keyboard.press('Escape');
};

const ORDRE = ['bronze', 'argent', 'or'];
const carte = (page, type) => page.locator('#boutique-coffres div.grid.gap-4 > div').nth(ORDRE.indexOf(type));
const boutonCle = (page) => page.getByRole('button', { name: /Acheter une clé|Buy a key/ });
const boutonCoffre = (page, type) => carte(page, type).getByRole('button', { name: /Coffre ·|Chest ·/ });
const boutonOuvrir = (page, type) => carte(page, type).locator('button').nth(1);

// ─── 1-3. Un cycle complet d'achat + ouverture, sur un coffre donné ──────────
async function scenarioOuverture(browser, type) {
  console.log(`\n=== Ouverture — ${type} ===`);
  const { uid, email, u } = await nouveauCompte(type);
  const { ctx, page, logs } = await pageAvecSession(browser, u, uid, email, type);
  await page.goto(`${BASE}/compte?onglet=telechargements`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200); await fermerBienvenue(page); await page.waitForTimeout(500);
  await carte(page, type).scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${type}-1-avant.png` });

  await boutonCle(page).click();
  await page.getByText(/c’est fait|done\./i).first().waitFor({ timeout: 6000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${type}-2-apres-cle.png` });

  await boutonCoffre(page, type).click();
  await page.getByText(/c’est fait|done\./i).first().waitFor({ timeout: 6000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${type}-3-apres-coffre.png` });

  attendu(await boutonOuvrir(page, type).isEnabled(), `bouton « Ouvrir » actif (coffre + clé en main)`);

  const [reponse] = await Promise.all([
    page.waitForResponse(r => r.url().includes('ouvrirCoffre') && r.request().method() === 'POST', { timeout: 15000 }),
    boutonOuvrir(page, type).click(),
  ]);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${type}-4-video.png` }); // pendant la vidéo d'ouverture, avant la révélation

  await page.getByText(/Le coffre contenait|The chest held/).first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${type}-5-resultat.png` });

  const corps = await reponse.json().catch(() => null);
  const resultat = corps?.result || corps;
  console.log('  lots reçus :', (resultat?.lots || []).map(l => l.nom).join(', ') || '(aucun — voir corps brut)');
  if (!resultat?.lots) console.log('  corps RPC brut :', JSON.stringify(corps).slice(0, 400));

  const grandVisible = await page.getByText(/question d’habileté|skill-testing/i).count();
  if (!grandVisible) {
    const fermer = page.getByRole('button', { name: /Fermer|Close/ }).first();
    if (await fermer.count()) { await fermer.click().catch(() => {}); await page.waitForTimeout(300); }
  }
  await page.screenshot({ path: `${OUT}/${type}-6-ferme.png` });

  // Vérifications Firestore : coffre + clé débités, lots crédités, jour = chaîne.
  const inv = decode(await fsget(`coffres/${uid}`));
  attendu(Number(inv?.boites?.[type] || 0) === 0, `coffres/${uid}.boites.${type} = 0 après ouverture`);
  attendu(Number(inv?.cles || 0) === 0, `coffres/${uid}.cles = 0 après ouverture (clé consommée)`);

  const events = decodeRows(await fsquery('pointsEvents', uid));
  const kinds = events.map(e => e.kind);
  attendu(kinds.filter(k => k === 'coffre').length >= 2, `pointsEvents : débit coffre + débit clé présents (${kinds.filter(k => k === 'coffre').length})`);
  attendu(kinds.includes('coffre-gain'), `pointsEvents : crédit coffre-gain présent`);
  const solde = decode(await fsget(`memberPoints/${uid}`));
  const sommeEvts = events.reduce((a, e) => a + Number(e.amount || 0), 0);
  attendu(Number(solde?.balance) === sommeEvts, `memberPoints.balance (${solde?.balance}) = somme du journal (${sommeEvts})`);

  const ouvertures = decodeRows(await fsquery('coffresOuvertures', uid));
  const derniere = ouvertures[ouvertures.length - 1];
  attendu(!!derniere && typeof derniere.jour === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(derniere.jour), `coffresOuvertures.jour est une chaîne « AAAA-MM-JJ » (${derniere?.jour}) — confirme le correctif du bogue`);
  attendu(Array.isArray(derniere?.lots) && derniere.lots.length > 0, `coffresOuvertures.lots contient des lots (${derniere?.lots?.length})`);

  if (logs.length) console.log('  console/pageerror :', logs.slice(0, 5).join(' | '));
  await ctx.close();
}

// ─── 4. Pas de clé : le bouton reste inactif ─────────────────────────────────
async function scenarioSansCle(browser, type) {
  console.log(`\n=== Pas de clé — ${type} ===`);
  const { uid, email, u } = await nouveauCompte(`sanscle-${type}`);
  const { ctx, page } = await pageAvecSession(browser, u, uid, email, 'sanscle');
  await page.goto(`${BASE}/compte?onglet=telechargements`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200); await fermerBienvenue(page); await page.waitForTimeout(500);
  await carte(page, type).scrollIntoViewIfNeeded();
  await boutonCoffre(page, type).click();
  await page.getByText(/c’est fait|done\./i).first().waitFor({ timeout: 6000 });
  await page.waitForTimeout(400);
  attendu(await boutonOuvrir(page, type).isDisabled(), `bouton « Ouvrir » inactif sans clé`);
  const texte = (await boutonOuvrir(page, type).textContent()) || '';
  attendu(/manque une clé|Key missing/.test(texte), `message « il manque une clé » affiché (« ${texte.trim()} »)`);
  await page.screenshot({ path: `${OUT}/edge-sans-cle.png` });
  await ctx.close();
}

// ─── 5. Clé mais pas le coffre : le bouton reste inactif ─────────────────────
async function scenarioSansCoffre(browser, type) {
  console.log(`\n=== Clé sans coffre — ${type} ===`);
  const { uid, email, u } = await nouveauCompte(`sanscoffre-${type}`);
  const { ctx, page } = await pageAvecSession(browser, u, uid, email, 'sanscoffre');
  await page.goto(`${BASE}/compte?onglet=telechargements`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200); await fermerBienvenue(page); await page.waitForTimeout(500);
  await carte(page, type).scrollIntoViewIfNeeded();
  await boutonCle(page).click();
  await page.getByText(/c’est fait|done\./i).first().waitFor({ timeout: 6000 });
  await page.waitForTimeout(400);
  attendu(await boutonOuvrir(page, type).isDisabled(), `bouton « Ouvrir » inactif sans coffre`);
  const texte = (await boutonOuvrir(page, type).textContent()) || '';
  attendu(/Aucun coffre|No chest/.test(texte), `message « aucun coffre à ouvrir » affiché (« ${texte.trim()} »)`);
  await page.screenshot({ path: `${OUT}/edge-sans-coffre.png` });
  await ctx.close();
}

// ─── 6. Un lot déjà possédé se change en niskas (valeur × 1,05) ─────────────
async function scenarioDejaPossede(browser, VALEUR_COSMETIQUE) {
  console.log(`\n=== Lot déjà possédé (bronze, tout le bassin déjà à vous) ===`);
  const { uid, email, u } = await nouveauCompte('deja-possede');
  // Bronze pioche dans LEGENDAIRES (50 %) ou COMMUNS (50 %) : posséder les deux
  // bassins au complet garantit un doublon, quel que soit le tirage.
  const bassin = ['skin-vata', 'skin-pitta', 'skin-kapha', 'skin-medzo', 'skin-nuit', 'skin-coffee', 'skin-aube', 'skin-terre', 'skin-foret', 'skin-ocean', 'skin-encre', 'banniere-nature', 'banniere-iris', 'banniere-pivoine', 'banniere-huiles', 'banniere-jardin', 'banniere-soir'];
  const champs = Object.fromEntries(bassin.map(c => [c, { timestampValue: new Date().toISOString() }]));
  await fsdoc(`boutique/${uid}`, { possede: { mapValue: { fields: champs } } });
  const { ctx, page } = await pageAvecSession(browser, u, uid, email, 'deja-possede');
  await page.goto(`${BASE}/compte?onglet=telechargements`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200); await fermerBienvenue(page); await page.waitForTimeout(500);
  await carte(page, 'bronze').scrollIntoViewIfNeeded();
  await boutonCle(page).click();
  await page.getByText(/c’est fait|done\./i).first().waitFor({ timeout: 6000 });
  await boutonCoffre(page, 'bronze').click();
  await page.getByText(/c’est fait|done\./i).first().waitFor({ timeout: 6000 });
  await page.waitForTimeout(300);

  const [reponse] = await Promise.all([
    page.waitForResponse(r => r.url().includes('ouvrirCoffre') && r.request().method() === 'POST', { timeout: 15000 }),
    boutonOuvrir(page, 'bronze').click(),
  ]);
  await page.getByText(/Le coffre contenait|The chest held/).first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/deja-possede-resultat.png` });

  const corps = await reponse.json().catch(() => null);
  const resultat = corps?.result || corps;
  const lotDoublon = (resultat?.lots || []).find(l => l.genre === 'niskas' && l.article);
  attendu(!!lotDoublon, `un lot « déjà possédé » a été renvoyé par le serveur`);
  if (lotDoublon) {
    const attenduMontant = Math.ceil((VALEUR_COSMETIQUE[lotDoublon.article] || 5) * 1.05);
    attendu(lotDoublon.montant === attenduMontant, `montant crédité (${lotDoublon.montant}) = valeur × 1,05 arrondi (${attenduMontant}) pour ${lotDoublon.article}`);
    attendu(/Vous aviez déjà/.test(lotDoublon.note || ''), `note « Vous aviez déjà … » présente (« ${lotDoublon.note} »)`);
  }
  await ctx.close();
}

// ─── Exécution ────────────────────────────────────────────────────────────────
const { VALEUR_COSMETIQUE } = await verifierMiroir();
const browser = await chromium.launch();
try {
  for (const type of ORDRE) await scenarioOuverture(browser, type);
  await scenarioSansCle(browser, 'bronze');
  await scenarioSansCoffre(browser, 'argent');
  await scenarioDejaPossede(browser, VALEUR_COSMETIQUE);
} finally {
  await browser.close();
  // Ménage : tous les comptes de test et leurs documents.
  for (const { uid, idToken } of comptes) {
    await rest(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`, { idToken });
    for (const p of [`members/${uid}`, `memberPoints/${uid}`, `boutique/${uid}`, `coffres/${uid}`, `pointsEvents/adjust:${uid}:qa`]) await fsdel(p);
  }
}

console.log(echecs === 0 ? `\n✔ QA coffres : tout passe (${comptes.length} comptes testés).` : `\n✘ QA coffres : ${echecs} échec(s).`);
process.exit(echecs === 0 ? 0 : 1);
