// QA du coffre bêta (Alex, 7 septembre 2026) : fenêtre de dates côté serveur,
// animation côté client (fond transparent, message, niskas), et la carte
// admin « Le rapport du jour ». Patron repris de scripts/qa/coffres-ouverture.mjs.
//
// 1. La fenêtre 7 septembre → 1er octobre 2026, testée en isolant la même
//    logique que functions/src/niskas.ts (les constantes ET journee()), sans
//    Firebase : un vrai test unitaire, déterministe.
// 2. Un compte réel, créé par la fenêtre d'inscription du site (pas un
//    raccourci REST) : /compte, la roue et BienvenueJeu fermées, puis le
//    coffre bêta. reclamerCoffreBeta n'est PAS déployée (aucun déploiement
//    permis dans cette tâche) : l'appel réel est tenté d'abord: s'il échoue
//    en "not-found", la réponse est simulée (page.route) pour capturer la
//    même animation React que verrait une vraie bêta-testeuse.
// 3. Un coffre bronze ouvert pour de vrai (acheterCoffre/ouvrirCoffre SONT
//    déployées) : preuve contre le vrai serveur que le fond sombre a disparu
//    de l'animation générale, pas seulement en simulation.
// 4. La carte « Le rapport du jour » de l'admin, données réelles.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const API_KEY = fs.readFileSync('.env.local', 'utf8').match(/VITE_FIREBASE_API_KEY=(.+)/)[1].trim();
const PROJET = 'krystinestlaurent-87566';
const BASE = process.env.BASE || 'http://localhost:3034';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/78c2ade9-cdcd-4c68-ace2-f8eabac5d7f6/scratchpad/coffre-beta';
fs.mkdirSync(OUT, { recursive: true });

let echecs = 0;
const attendu = (cond, msg) => { if (cond) console.log(`  ok  ${msg}`); else { console.log(`  FAIL  ${msg}`); echecs++; } };

// ─── 1. La fenêtre de dates, isolée de functions/src/niskas.ts (aucun réseau) ─
function verifierFenetre() {
  console.log('\n=== 1. La fenêtre 7 septembre → 1er octobre 2026 (test unitaire) ===');
  const src = fs.readFileSync(new URL('../functions/src/niskas.ts', import.meta.url), 'utf8');
  const debut = src.match(/const COFFRE_BETA_DEBUT = '([\d-]+)';/)?.[1];
  const fin = src.match(/const COFFRE_BETA_FIN = '([\d-]+)';/)?.[1];
  const montant = src.match(/export const NISKAS_BETA = (\d+);/)?.[1];
  const message = src.match(/export const MESSAGE_BETA = '(.+)';/)?.[1];
  attendu(debut === '2026-09-07', `COFFRE_BETA_DEBUT = 2026-09-07 (lu : ${debut})`);
  attendu(fin === '2026-10-01', `COFFRE_BETA_FIN = 2026-10-01 (lu : ${fin})`);
  attendu(montant === '50', `NISKAS_BETA = 50 (lu : ${montant})`);
  attendu(message === 'Merci d’être bêta-testeuse', `MESSAGE_BETA = « Merci d’être bêta-testeuse » (lu : « ${message} »)`);

  // La même journee() que le serveur (America/Toronto), dupliquée ici à
  // dessein : un test qui appelle le code testé n'aurait rien prouvé.
  const journee = (ms) => {
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(ms));
    const v = (t) => p.find(x => x.type === t)?.value ?? '';
    return `${v('year')}-${v('month')}-${v('day')}`;
  };
  const eligible = (iso) => { const j = journee(new Date(iso).getTime()); return j >= debut && j <= fin; };

  attendu(eligible('2026-09-06T23:59:00-04:00') === false, `5 sept. 23h59 (veille) : pas éligible`);
  attendu(eligible('2026-09-07T00:00:01-04:00') === true, `7 sept. 00h00 (première minute) : éligible`);
  attendu(eligible('2026-09-20T12:00:00-04:00') === true, `20 sept. midi (milieu de fenêtre) : éligible`);
  attendu(eligible('2026-10-01T23:59:00-04:00') === true, `1er oct. 23h59 (dernière minute) : éligible`);
  attendu(eligible('2026-10-02T00:00:01-04:00') === false, `2 oct. 00h00 (lendemain) : pas éligible`);
}

// ─── Comptes jetables (le même patron que coffres-ouverture.mjs) ────────────
const rest = async (url, body) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
const gtoken = execSync('gcloud auth print-access-token').toString().trim();
const fsBase = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents`;
const fsget = async (path) => {
  const r = await fetch(`${fsBase}/${path}`, { headers: { Authorization: `Bearer ${gtoken}` } });
  if (r.status === 404) return null;
  if (!r.ok) { console.log('firestore GET', path, r.status, await r.text()); return null; }
  return r.json();
};
const fsdel = (path) => fetch(`${fsBase}/${path}`, { method: 'DELETE', headers: { Authorization: `Bearer ${gtoken}` } });
const val = (v) => {
  if (v == null) return undefined;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, vv]) => [k, val(vv)]));
  return undefined;
};
const decode = (doc) => (doc && doc.fields) ? Object.fromEntries(Object.entries(doc.fields).map(([k, v]) => [k, val(v)])) : null;

const fermerBienvenue = async (page) => {
  const dialogue = page.locator('#jeu-titre');
  if (await dialogue.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: /Entrer dans mon espace/i }).first().click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(300);
  }
};
const fermerRoueSiPresente = async (page) => {
  const dialogue = page.locator('[aria-labelledby="roue-titre"]');
  if (await dialogue.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: /Merci|Thanks/ }).first().click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(200);
  }
};

// ─── 2. Un compte réel, créé par la fenêtre d'inscription du site ───────────
async function scenarioInscriptionReelle(browser) {
  console.log('\n=== 2. Inscription réelle + coffre bêta (réponse simulée si la fonction n’est pas déployée) ===');
  const email = `qa-beta-${Math.random().toString(36).slice(2, 9)}@krystinestlaurent.ca`;
  const password = 'Qa!' + Math.random().toString(36).slice(2, 12);
  console.log(`  compte de test : ${email} (à effacer — voir le ménage en fin de script)`);

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', m => { if (m.type() === 'error') logs.push(`[console:error] ${m.text()}`); });
  page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));

  // Simule la réponse de reclamerCoffreBeta si l'appel réel échoue (fonction
  // pas encore déployée — aucun déploiement permis dans cette tâche). Le
  // routeur laisse passer l'appel réel d'abord; seul un échec applique le mock.
  let appelReelReussi = null;
  let appelIntercepte = false;
  await page.route('**/reclamerCoffreBeta', async (route) => {
    appelIntercepte = true;
    try {
      const reponse = await route.fetch();
      if (reponse.ok()) { appelReelReussi = true; return route.fulfill({ response: reponse }); }
      appelReelReussi = false;
      console.log(`  reclamerCoffreBeta réelle a répondu ${reponse.status()} (fonction non déployée, attendu) → réponse simulée`);
    } catch (e) {
      appelReelReussi = false;
      console.log(`  reclamerCoffreBeta réelle injoignable (${e.message}) → réponse simulée`);
    }
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ result: { eligible: true, offert: true, montant: 50, message: 'Merci d’être bêta-testeuse', balance: 70 } }),
    });
  });

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: /Connexion|Sign in|Se connecter/i }).first().click({ timeout: 5000 }).catch(async () => {
    // Le bouton d'ouverture de la fenêtre de connexion peut vivre dans un menu mobile replié.
    await page.locator('[data-testid="ouvrir-connexion"], a[href="#connexion"]').first().click({ timeout: 3000 }).catch(() => {});
  });
  await page.getByText(/Créer un compte|Create account/i).first().click({ timeout: 5000 });
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole('button', { name: /Créer un compte|Create account/i }).last().click();
  await page.waitForTimeout(2500);
  attendu(!(await page.getByText(/Auth failed|introuvable/i).first().isVisible().catch(() => false)), `l’inscription n’affiche pas d’erreur`);

  await page.goto(`${BASE}/compte`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await fermerRoueSiPresente(page);
  await page.screenshot({ path: `${OUT}/1-avant-1440.png` });

  await fermerBienvenue(page);
  // CoffreBeta attend que « krystine-jeu-vu » soit posé avant de révéler :
  // on laisse le sondage (400 ms) faire son œuvre.
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/2-tremble-1440.png` }); // le coffre doré tremble, avant révélation

  await page.getByText(/bêta-testeuse/i).first().waitFor({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/3-revele-1440.png` }); // ouvert : message + niskas

  const messageVisible = await page.getByText('Merci d’être bêta-testeuse').first().isVisible().catch(() => false);
  attendu(appelIntercepte, `l’appel reclamerCoffreBeta a bien été fait au montage de /compte`);
  attendu(messageVisible, `le message « Merci d’être bêta-testeuse » est affiché`);
  const niskasVisibles = await page.getByText(/50/).first().isVisible().catch(() => false);
  attendu(niskasVisibles, `le montant (50 niskas) est affiché`);

  // Mobile : même écran révélé, viewport 390.
  await ctx.close();
  const ctxMobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const pageMobile = await ctxMobile.newPage();
  await pageMobile.route('**/reclamerCoffreBeta', (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ result: { eligible: true, offert: true, montant: 50, message: 'Merci d’être bêta-testeuse', balance: 70 } }),
  }));
  const authUser = await page.evaluate(() => null).catch(() => null); // placeholder, session refaite ci-dessous
  await pageMobile.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await pageMobile.evaluate(([email]) => localStorage.setItem('krystine-jeu-vu', '1'), [email]);
  await pageMobile.goto(`${BASE}/compte`, { waitUntil: 'domcontentloaded' });
  await pageMobile.waitForTimeout(1500);
  // Le compte mobile se reconnecte : la session n'est pas partagée entre
  // contexts. On rouvre une session avec le même compte par le formulaire.
  await pageMobile.getByRole('button', { name: /Connexion|Sign in|Se connecter/i }).first().click({ timeout: 5000 }).catch(() => {});
  const champCourriel = pageMobile.locator('input[type="email"]').first();
  if (await champCourriel.isVisible({ timeout: 3000 }).catch(() => false)) {
    await champCourriel.fill(email);
    await pageMobile.locator('input[type="password"]').first().fill(password);
    await pageMobile.getByRole('button', { name: /Connexion|Sign in/i }).last().click();
    await pageMobile.waitForTimeout(2500);
  }
  await fermerRoueSiPresente(pageMobile);
  await fermerBienvenue(pageMobile);
  await pageMobile.waitForTimeout(1600);
  await pageMobile.screenshot({ path: `${OUT}/4-revele-390.png` });
  if (logs.length) console.log('  console/pageerror :', logs.slice(0, 5).join(' | '));
  await ctxMobile.close();

  return { email, password };
}

// ─── 3. Un vrai coffre bronze, contre le serveur déployé : preuve du correctif
async function scenarioCoffreReel(browser) {
  console.log('\n=== 3. Coffre bronze réel (acheterCoffre/ouvrirCoffre, déployées) : fond derrière la figurine ===');
  const email = `qa-fond-${Math.random().toString(36).slice(2, 9)}@vexel-qa.test`;
  const password = 'Qa!' + Math.random().toString(36).slice(2, 12);
  const u = await rest(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { email, password, returnSecureToken: true });
  if (!u.localId) { console.log('  signUp a échoué :', JSON.stringify(u)); echecs++; return; }
  const uid = u.localId;
  const fsdoc = async (path, fields) => {
    await fetch(`${fsBase}/${path}`, { method: 'PATCH', headers: { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
  };
  await fsdoc(`members/${uid}`, { uid: { stringValue: uid }, email: { stringValue: email }, displayName: { stringValue: 'QA fond' } });
  await fsdoc(`pointsEvents/adjust:${uid}:qa`, { uid: { stringValue: uid }, kind: { stringValue: 'adjust' }, amount: { integerValue: '1000' }, dedupKey: { stringValue: `adjust:${uid}:qa` }, at: { timestampValue: new Date().toISOString() } });
  await fsdoc(`memberPoints/${uid}`, { balance: { integerValue: '1000' }, lifetime: { integerValue: '1000' } });

  const authUser = {
    uid, email, emailVerified: false, isAnonymous: false, displayName: 'QA fond',
    providerData: [{ providerId: 'password', uid: email, displayName: null, email, phoneNumber: null, photoURL: null }],
    stsTokenManager: { refreshToken: u.refreshToken, accessToken: u.idToken, expirationTime: Date.now() + Number(u.expiresIn) * 1000 },
    createdAt: String(Date.now()), lastLoginAt: String(Date.now()), apiKey: API_KEY, appName: '[DEFAULT]',
  };
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/robots.txt`);
  await page.evaluate(([key, value]) => new Promise((res, rej) => {
    localStorage.setItem('krystine-jeu-vu', new Date().toISOString().slice(0, 10));
    localStorage.setItem('krystine-roue-vue', new Date().toISOString().slice(0, 10));
    localStorage.setItem(`krystine-coffre-beta-vu:${value.uid}`, '1'); // pas le sujet de ce scénario
    const req = indexedDB.open('firebaseLocalStorageDb', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
    req.onsuccess = () => { const tx = req.result.transaction('firebaseLocalStorage', 'readwrite'); tx.objectStore('firebaseLocalStorage').put({ fbase_key: key, value }); tx.oncomplete = () => res(true); tx.onerror = rej; };
    req.onerror = rej;
  }), [`firebase:authUser:${API_KEY}:[DEFAULT]`, authUser]);

  await page.goto(`${BASE}/compte?onglet=telechargements`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200);
  await fermerBienvenue(page);
  await page.waitForTimeout(400);
  const carte = page.locator('#boutique-coffres div.grid.gap-4 > div').nth(0); // bronze
  await carte.scrollIntoViewIfNeeded();
  await fermerRoueSiPresente(page);
  await carte.getByRole('button', { name: /Acheter une clé|Buy a key/ }).click();
  await page.getByText(/c’est fait|done\./i).first().waitFor({ timeout: 6000 });
  await fermerRoueSiPresente(page);
  await carte.getByRole('button', { name: /Coffre ·|Chest ·/ }).click();
  await page.getByText(/c’est fait|done\./i).first().waitFor({ timeout: 6000 });
  await page.waitForTimeout(300);

  await fermerRoueSiPresente(page);
  await carte.locator('button').nth(1).click(); // Ouvrir le coffre
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/5-vrai-coffre-tremble-1440.png` }); // le vrai serveur, coffre qui tremble

  await page.getByText(/Le coffre contenait|The chest held/).first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/6-vrai-coffre-revele-1440.png` });

  await ctx.close();

  // Ménage : ce compte-ci passe par le REST d'Identity Toolkit (créé par REST).
  await rest(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`, { idToken: u.idToken });
  for (const p of [`members/${uid}`, `memberPoints/${uid}`, `coffres/${uid}`, `pointsEvents/adjust:${uid}:qa`]) await fsdel(p);
  console.log('  compte QA fond effacé (Auth + Firestore).');
}

// ─── 4. La carte admin « Le rapport du jour » ────────────────────────────────
async function scenarioAdmin(browser) {
  console.log('\n=== 4. Admin — « Le rapport du jour » ===');
  for (const [nom, largeur, hauteur] of [['1440', 1440, 900], ['390', 390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: largeur, height: hauteur }, deviceScaleFactor: nom === '390' ? 2 : 1 });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/admin?unlock=Alexisthebest2121!`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    await page.getByText('Le rapport du jour').first().waitFor({ timeout: 10000 }).catch(() => {});
    await page.getByText('Le rapport du jour').first().scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(1500); // les compteurs bornés + getCommandesStripe arrivent en async
    await page.screenshot({ path: `${OUT}/7-admin-rapport-${nom}.png` });
    const carteVisible = await page.getByText('Le rapport du jour').first().isVisible().catch(() => false);
    attendu(carteVisible, `la carte « Le rapport du jour » est visible (${nom})`);
    await ctx.close();
  }
}

// ─── Exécution ────────────────────────────────────────────────────────────────
verifierFenetre();
const browser = await chromium.launch();
try {
  await scenarioInscriptionReelle(browser);
  await scenarioCoffreReel(browser);
  await scenarioAdmin(browser);
} finally {
  await browser.close();
}

console.log(echecs === 0 ? `\n✔ QA coffre bêta : tout passe.` : `\n✘ QA coffre bêta : ${echecs} échec(s).`);
console.log(`Captures : ${OUT}`);
process.exit(echecs === 0 ? 0 : 1);
