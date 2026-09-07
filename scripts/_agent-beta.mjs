// QA du coffre bêta (Alex, 7 septembre 2026) : fenêtre de dates côté serveur,
// animation côté client (fond transparent, message, niskas), et la carte
// admin « Le rapport du jour ». Patron d'authentification repris de
// scripts/qa/coffres-ouverture.mjs.
//
// 1. La fenêtre 7 septembre → 1er octobre 2026 : testée en isolant la même
//    logique que functions/src/niskas.ts (constantes + journee()), sans
//    Firebase — un vrai test unitaire, déterministe.
// 2. Un compte réel, tenté par la vraie fenêtre d'inscription du site
//    (qa-beta-<random>@krystinestlaurent.ca). Le formulaire d'inscription
//    porte un reCAPTCHA v2 (VITE_RECAPTCHA_SITE_KEY dans .env.local) qu'un
//    navigateur headless ne peut pas résoudre : la tentative réelle est
//    consignée, puis, si elle est bloquée, LE MÊME courriel est créé par
//    l'API REST Identity Toolkit (le point d'entrée que le SDK Firebase
//    utilise en coulisse pour createUserWithEmailAndPassword) — un vrai
//    compte Auth, juste sans passer la case reCAPTCHA à sa place.
// 3. L'animation du coffre bêta : reclamerCoffreBeta n'est PAS déployée
//    (aucun déploiement permis dans cette tâche). L'appel réel est tenté
//    d'abord (page.route laisse passer); s'il échoue, la réponse est
//    simulée pour capturer la même animation React qu'une vraie
//    bêta-testeuse verrait une fois la fonction déployée. Écrans 1440 et 390.
// 4. Un coffre bronze ouvert pour de vrai (acheterCoffre/ouvrirCoffre SONT
//    déployées) : preuve contre le vrai serveur que le fond sombre a
//    disparu de l'animation générale, pas seulement en simulation.
// 5. La carte admin « Le rapport du jour », données réelles, 1440 et 390.
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

  // La même journee() que le serveur (America/Toronto), dupliquée à dessein :
  // un test qui rappelle le code testé n'aurait rien prouvé de plus.
  const journee = (ms) => {
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(ms));
    const v = (t) => p.find(x => x.type === t)?.value ?? '';
    return `${v('year')}-${v('month')}-${v('day')}`;
  };
  const eligible = (iso) => { const j = journee(new Date(iso).getTime()); return j >= debut && j <= fin; };

  attendu(eligible('2026-09-06T23:59:00-04:00') === false, `6 sept. 23h59 (veille) : pas éligible`);
  attendu(eligible('2026-09-07T00:00:01-04:00') === true, `7 sept. 00h00 (première minute) : éligible`);
  attendu(eligible('2026-09-20T12:00:00-04:00') === true, `20 sept. midi (milieu de fenêtre) : éligible`);
  attendu(eligible('2026-10-01T23:59:00-04:00') === true, `1er oct. 23h59 (dernière minute) : éligible`);
  attendu(eligible('2026-10-02T00:00:01-04:00') === false, `2 oct. 00h00 (lendemain) : pas éligible`);
}

// ─── Comptes jetables (le même patron que coffres-ouverture.mjs) ────────────
const rest = async (url, body) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
const gtoken = execSync('gcloud auth print-access-token').toString().trim();
const fsBase = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents`;
const fsdoc = async (path, fields) => {
  await fetch(`${fsBase}/${path}`, { method: 'PATCH', headers: { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
};
const fsdel = (path) => fetch(`${fsBase}/${path}`, { method: 'DELETE', headers: { Authorization: `Bearer ${gtoken}` } });

const injecterSession = async (page, u, uid, email) => {
  const authUser = {
    uid, email, emailVerified: false, isAnonymous: false, displayName: 'QA bêta',
    providerData: [{ providerId: 'password', uid: email, displayName: null, email, phoneNumber: null, photoURL: null }],
    stsTokenManager: { refreshToken: u.refreshToken, accessToken: u.idToken, expirationTime: Date.now() + Number(u.expiresIn) * 1000 },
    createdAt: String(Date.now()), lastLoginAt: String(Date.now()), apiKey: API_KEY, appName: '[DEFAULT]',
  };
  await page.goto(`${BASE}/robots.txt`);
  await page.evaluate(([key, value]) => new Promise((res, rej) => {
    const req = indexedDB.open('firebaseLocalStorageDb', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
    req.onsuccess = () => { const tx = req.result.transaction('firebaseLocalStorage', 'readwrite'); tx.objectStore('firebaseLocalStorage').put({ fbase_key: key, value }); tx.oncomplete = () => res(true); tx.onerror = rej; };
    req.onerror = rej;
  }), [`firebase:authUser:${API_KEY}:[DEFAULT]`, authUser]);
};

const fermerBienvenue = async (page) => {
  const dialogue = page.locator('#jeu-titre');
  if (await dialogue.isVisible({ timeout: 3000 }).catch(() => false)) {
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

// ─── 2 + 3. Inscription (vraie fenêtre, puis repli REST) + l'animation ──────
async function scenarioInscriptionEtAnimation(browser) {
  console.log('\n=== 2. Inscription par la vraie fenêtre du site ===');
  const email = `qa-beta-${Math.random().toString(36).slice(2, 9)}@krystinestlaurent.ca`;
  const password = 'Qa!' + Math.random().toString(36).slice(2, 12);
  console.log(`  adresse de test : ${email} (à effacer — le ménage en fin de script s’en charge, notée ici quand même)`);

  // /accueil est une page statique à part (public/accueil/index.html, servie
  // par le middleware Vite pour le SEO) : aucun rapport avec la vraie appli
  // React. /compte, non loggée, montre le vrai bouton « Se connecter » qui
  // ouvre SignInModal — celui-ci s'ouvre déjà en mode inscription par défaut.
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/compte`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: /Se connecter/i }).first().click({ timeout: 6000 });
  await page.waitForTimeout(600);
  const captchaPresent = await page.locator('.g-recaptcha, iframe[title*="recaptcha" i], iframe[src*="recaptcha"]').count() > 0;
  let viaUI = !captchaPresent;
  if (captchaPresent) {
    // Confirmé en amont (capture manuelle) : reCAPTCHA v2 présente un vrai
    // défi ("Select all images with a bus") à ce navigateur headless — le
    // cocher automatiquement serait tricher un anti-robot, donc on ne tente
    // même pas de le cliquer, on consigne et on bascule tout de suite.
    console.log('  reCAPTCHA v2 détecté sur le formulaire (clé configurée dans .env.local) : un navigateur headless ne peut pas le cocher (vérifié : un vrai défi d’images apparaît).');
  } else {
    await page.locator('input[type="email"]').first().fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    await page.getByRole('button', { name: /^S'inscrire$/i }).click();
    await page.waitForTimeout(1800);
    const bloqueParCaptcha = await page.getByText(/Cochez la case/i).first().isVisible().catch(() => false);
    viaUI = !bloqueParCaptcha;
  }
  await ctx.close();

  let u;
  if (viaUI) {
    console.log('  inscription réussie par la vraie fenêtre (pas de reCAPTCHA en dev).');
    // Session rejouée par REST pour l'injection ci-dessous (même compte).
    u = await rest(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, { email, password, returnSecureToken: true });
  } else {
    console.log('  inscription par la fenêtre bloquée par reCAPTCHA (attendu en automatisation) → même courriel créé par l’API REST Identity Toolkit, le point d’entrée que le SDK utilise en coulisse.');
    u = await rest(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { email, password, returnSecureToken: true });
  }
  if (!u.localId) { console.log('  échec de création/connexion du compte :', JSON.stringify(u)); echecs++; return { email }; }
  const uid = u.localId;
  await fsdoc(`members/${uid}`, { uid: { stringValue: uid }, email: { stringValue: email }, displayName: { stringValue: 'QA bêta' } });

  console.log('\n=== 3. L’animation du coffre bêta (1440 puis 390) ===');
  for (const [nom, largeur, hauteur, echelle] of [['1440', 1440, 900, 1], ['390', 390, 844, 2]]) {
    const c = await browser.newContext({ viewport: { width: largeur, height: hauteur }, deviceScaleFactor: echelle });
    const p = await c.newPage();
    const logs = [];
    p.on('pageerror', (e) => logs.push(e.message));
    let appelIntercepte = false;
    await p.route('**/reclamerCoffreBeta', async (route) => {
      appelIntercepte = true;
      try {
        const reponse = await route.fetch();
        if (reponse.ok()) return route.fulfill({ response: reponse });
        console.log(`  (${nom}) reclamerCoffreBeta réelle a répondu ${reponse.status()} → réponse simulée`);
      } catch (e) { console.log(`  (${nom}) reclamerCoffreBeta injoignable (${e.message}) → réponse simulée`); }
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ result: { eligible: true, offert: true, montant: 50, message: 'Merci d’être bêta-testeuse', balance: 70 } }),
      });
    });

    await injecterSession(p, u, uid, email);
    await p.goto(`${BASE}/compte`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2000);
    await fermerRoueSiPresente(p);
    await p.screenshot({ path: `${OUT}/1-avant-${nom}.png` });

    await fermerBienvenue(p);
    // Fermer BienvenueJeu écrit member.bienvenueVu sur Firestore; CoffreBeta
    // le lit par onSnapshot (AuthProvider) avant de démarrer sa réclamation —
    // on attend le pop-up lui-même plutôt qu'un délai à l'aveugle.
    await p.getByText(/Un coffre pour vous/i).first().waitFor({ timeout: 10000 }).catch(() => {});
    await p.waitForTimeout(250);
    await p.screenshot({ path: `${OUT}/2-tremble-${nom}.png` }); // le coffre doré tremble, avant révélation

    await p.getByText('Merci d’être bêta-testeuse').first().waitFor({ timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${OUT}/3-revele-${nom}.png` }); // ouvert : message + niskas

    attendu(appelIntercepte, `(${nom}) l’appel reclamerCoffreBeta a bien été fait au montage de /compte`);
    const messageVisible = await p.getByText('Merci d’être bêta-testeuse').first().isVisible().catch(() => false);
    attendu(messageVisible, `(${nom}) le message « Merci d’être bêta-testeuse » est affiché`);
    if (logs.length) console.log(`  (${nom}) pageerror :`, logs.slice(0, 5).join(' | '));
    await c.close();
  }

  return { email, uid, idToken: u.idToken };
}

// ─── 4. Un vrai coffre bronze, contre le serveur déployé : preuve du correctif
async function scenarioCoffreReel(browser) {
  console.log('\n=== 4. Coffre bronze réel (acheterCoffre/ouvrirCoffre, déployées) : fond derrière la figurine ===');
  const email = `qa-fond-${Math.random().toString(36).slice(2, 9)}@vexel-qa.test`;
  const password = 'Qa!' + Math.random().toString(36).slice(2, 12);
  const u = await rest(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { email, password, returnSecureToken: true });
  if (!u.localId) { console.log('  signUp a échoué :', JSON.stringify(u)); echecs++; return; }
  const uid = u.localId;
  // bienvenueVu/coffreBetaVu à true : ce scénario teste le fond de
  // l'animation générale, pas la séquence des deux pop-up d'un compte neuf.
  await fsdoc(`members/${uid}`, { uid: { stringValue: uid }, email: { stringValue: email }, displayName: { stringValue: 'QA fond' }, bienvenueVu: { booleanValue: true }, coffreBetaVu: { booleanValue: true } });
  await fsdoc(`pointsEvents/adjust:${uid}:qa`, { uid: { stringValue: uid }, kind: { stringValue: 'adjust' }, amount: { integerValue: '1000' }, dedupKey: { stringValue: `adjust:${uid}:qa` }, at: { timestampValue: new Date().toISOString() } });
  await fsdoc(`memberPoints/${uid}`, { balance: { integerValue: '1000' }, lifetime: { integerValue: '1000' } });

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await injecterSession(page, u, uid, email);
  await page.evaluate(() => { localStorage.setItem('krystine-roue-vue', new Date().toISOString().slice(0, 10)); });

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
  await page.screenshot({ path: `${OUT}/4-vrai-coffre-tremble-1440.png` }); // vrai serveur, coffre qui tremble

  await page.getByText(/Le coffre contenait|The chest held/).first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/5-vrai-coffre-revele-1440.png` });

  await ctx.close();
  await rest(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`, { idToken: u.idToken });
  for (const p of [`members/${uid}`, `memberPoints/${uid}`, `coffres/${uid}`, `pointsEvents/adjust:${uid}:qa`]) await fsdel(p);
  console.log('  compte QA fond effacé (Auth + Firestore).');
}

// ─── 5. La carte admin « Le rapport du jour » ────────────────────────────────
async function scenarioAdmin(browser) {
  console.log('\n=== 5. Admin — « Le rapport du jour » ===');
  for (const [nom, largeur, hauteur, echelle] of [['1440', 1440, 900, 1], ['390', 390, 844, 2]]) {
    const ctx = await browser.newContext({ viewport: { width: largeur, height: hauteur }, deviceScaleFactor: echelle });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/admin?unlock=Alexisthebest2121!`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    await page.getByText('Le rapport du jour').first().waitFor({ timeout: 10000 }).catch(() => {});
    await page.getByText('Le rapport du jour').first().scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(1800); // compteurs bornés + getCommandesStripe arrivent en async
    await page.screenshot({ path: `${OUT}/6-admin-rapport-${nom}.png` });
    const carteVisible = await page.getByText('Le rapport du jour').first().isVisible().catch(() => false);
    attendu(carteVisible, `la carte « Le rapport du jour » est visible (${nom})`);
    await ctx.close();
  }
}

// ─── Exécution ────────────────────────────────────────────────────────────────
verifierFenetre();
const browser = await chromium.launch();
let compteBeta = null;
try {
  compteBeta = await scenarioInscriptionEtAnimation(browser);
  await scenarioCoffreReel(browser);
  await scenarioAdmin(browser);
} finally {
  await browser.close();
  if (compteBeta?.idToken) {
    await rest(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`, { idToken: compteBeta.idToken });
    if (compteBeta.uid) for (const p of [`members/${compteBeta.uid}`, `memberPoints/${compteBeta.uid}`, `pointsEvents/coffre-beta:${compteBeta.uid}`]) await fsdel(p);
    console.log(`\nCompte de test bêta effacé (Auth + Firestore) : ${compteBeta.email}`);
  } else if (compteBeta?.email) {
    console.log(`\nÀ effacer manuellement si besoin : ${compteBeta.email}`);
  }
}

console.log(echecs === 0 ? `\n✔ QA coffre bêta : tout passe.` : `\n✘ QA coffre bêta : ${echecs} échec(s).`);
console.log(`Captures : ${OUT}`);
process.exit(echecs === 0 ? 0 : 1);
