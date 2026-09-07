// QA revue : L1 (visiteur), L2 (connectée), G2 (badge vedette). Compte
// jetable, patron de scripts/qa/bannieres-signature.mjs.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const API_KEY = fs.readFileSync('.env.local', 'utf8').match(/VITE_FIREBASE_API_KEY=(.+)/)[1].trim();
const PROJET = 'krystinestlaurent-87566';
const BASE = process.env.BASE || 'http://localhost:5199';
const OUT = process.env.OUT || '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/revue';
const email = `qa-liste-${Date.now()}@vexel-qa.test`; const password = 'Qa!' + Math.random().toString(36).slice(2, 12);
const rest = async (url, body) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
const gtoken = execSync('gcloud auth print-access-token').toString().trim();
const fsdoc = async (path, fields) => {
  const u = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents/${path}`;
  const r = await fetch(u, { method: 'PATCH', headers: { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
  if (!r.ok) console.log('firestore', path, r.status, await r.text());
};
const fsget = async (path) => {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents/${path}`, { headers: { Authorization: `Bearer ${gtoken}` } });
  return r.ok ? r.json() : { status: r.status, text: await r.text() };
};
const fsdel = async (path) => fetch(`https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents/${path}`, { method: 'DELETE', headers: { Authorization: `Bearer ${gtoken}` } });
const fsquery = async (collectionId, whereField, whereVal) => {
  const body = {
    structuredQuery: {
      from: [{ collectionId }],
      where: { fieldFilter: { field: { fieldPath: whereField }, op: 'EQUAL', value: { stringValue: whereVal } } },
    },
  };
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents:runQuery`, { method: 'POST', headers: { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return r.ok ? r.json() : { status: r.status, text: await r.text() };
};

const u = await rest(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { email, password, returnSecureToken: true, displayName: 'Test QA Liste' });
const uid = u.localId; console.log('compte', uid, email);
const now = { timestampValue: new Date().toISOString() };
await fsdoc(`members/${uid}`, { uid: { stringValue: uid }, email: { stringValue: email }, displayName: { stringValue: 'Test QA Liste' } });

const authUser = { uid, email, emailVerified: false, isAnonymous: false, displayName: 'Test QA Liste', providerData: [{ providerId: 'password', uid: email, displayName: 'Test QA Liste', email, phoneNumber: null, photoURL: null }],
  stsTokenManager: { refreshToken: u.refreshToken, accessToken: u.idToken, expirationTime: Date.now() + Number(u.expiresIn) * 1000 }, createdAt: String(Date.now()), lastLoginAt: String(Date.now()), apiKey: API_KEY, appName: '[DEFAULT]' };

const browser = await chromium.launch();
// Ferme dans l'ordre : le bandeau de consentement (coin, pas un backdrop),
// puis les fenêtres plein écran empilées, de la plus haute z-index à la
// plus basse (BienvenueJeu/Coffres/FondEcran/ProblemeTechnique = z-130,
// RoueQuotidienne = z-125) — la z-130 intercepte les clics sur la z-125.
const fermerPopups = async (page) => {
  const nonMerci = page.locator('button', { hasText: /Non merci/i });
  if (await nonMerci.count()) { await nonMerci.first().click().catch(() => {}); await page.waitForTimeout(300); }
  for (let pass = 0; pass < 3; pass++) {
    let ferme = false;
    for (const z of ['z-\\[130\\]', 'z-\\[125\\]']) {
      const r = page.locator(`.fixed.inset-0.${z}`);
      if (await r.count()) {
        await r.first().click({ position: { x: 8, y: 8 } }).catch(() => {});
        await page.waitForTimeout(400);
        ferme = true;
      }
    }
    if (!ferme) break;
  }
};

try {
  // ── L1 : visiteur anonyme sur la production ──
  const ctxAnon = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const pageAnon = await ctxAnon.newPage();
  await pageAnon.goto('https://krystinestlaurent.ca/liste-attente?programme=pitta', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await pageAnon.waitForTimeout(2500);
  await fermerPopups(pageAnon);
  await pageAnon.screenshot({ path: `${OUT}/liste-attente/L1-visiteur.png`, fullPage: false });
  // Zoom sur le bouton + la phrase d'aide
  const compteBtn = pageAnon.locator('button', { hasText: /Créer mon compte et m.inscrire/i }).first();
  await compteBtn.scrollIntoViewIfNeeded().catch(() => {});
  await pageAnon.waitForTimeout(400);
  await pageAnon.screenshot({ path: `${OUT}/liste-attente/L1-visiteur-full.png`, fullPage: true });
  const btnTxt = await compteBtn.textContent().catch(() => null);
  console.log('L1 bouton texte:', btnTxt);
  await ctxAnon.close();

  // ── L2 : connectée sur localhost:5199 ──
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/robots.txt`);
  await page.evaluate(([key, val]) => new Promise((res, rej) => {
    const req = indexedDB.open('firebaseLocalStorageDb', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
    req.onsuccess = () => { const tx = req.result.transaction('firebaseLocalStorage', 'readwrite'); tx.objectStore('firebaseLocalStorage').put({ fbase_key: key, value: val }); tx.oncomplete = () => res(true); tx.onerror = rej; };
    req.onerror = rej;
  }), [`firebase:authUser:${API_KEY}:[DEFAULT]`, authUser]);

  await page.goto(`${BASE}/liste-attente?programme=pitta`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2000);
  await fermerPopups(page);
  // Le formulaire à champs doit avoir disparu; la case unique doit être visible.
  const champPrenom = page.locator('input[placeholder="Prénom" i], input[autocomplete="given-name"]');
  const nbChampPrenom = await champPrenom.count();
  const caseUnique = page.locator('input[type="checkbox"]');
  const nbCase = await caseUnique.count();
  const boutonInscrire = page.locator('button', { hasText: /^M.inscrire$/i });
  const nbBoutonInscrire = await boutonInscrire.count();
  console.log('L2 — champs prénom présents:', nbChampPrenom, '| case à cocher présente:', nbCase, '| bouton "M\'inscrire" présent:', nbBoutonInscrire);
  const disabledAvant = await boutonInscrire.first().isDisabled().catch(() => null);
  console.log('L2 — bouton M\'inscrire désactivé avant coche:', disabledAvant);
  await page.locator('#inscription').scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/liste-attente/L2-connectee-avant-coche.png`, fullPage: true });

  await caseUnique.first().check();
  await page.waitForTimeout(300);
  const disabledApres = await boutonInscrire.first().isDisabled().catch(() => null);
  console.log('L2 — bouton M\'inscrire désactivé après coche:', disabledApres);
  await page.screenshot({ path: `${OUT}/liste-attente/L2-connectee-coche.png`, fullPage: true });

  await boutonInscrire.first().click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/liste-attente/L2-connectee-apres-envoi.png`, fullPage: true });

  // Vérification Firestore : un document newsletter avec source 'compte' et consentement true
  const q = await fsquery('newsletter', 'uid', uid);
  fs.writeFileSync(`${OUT}/liste-attente/L2-firestore-query.json`, JSON.stringify(q, null, 2));
  console.log('L2 — requête Firestore newsletter uid=' + uid + ' → ', JSON.stringify(q).slice(0, 800));

  // ── G2 : badge vedette ──
  await fsdoc(`badges/${uid}`, { obtenus: { mapValue: { fields: { 'voix-du-cercle': now } } }, vedette: { stringValue: 'voix-du-cercle' } });
  await page.goto(`${BASE}/membre/${uid}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2000);
  await fermerPopups(page);
  await page.screenshot({ path: `${OUT}/badges/G2-membre-profil.png`, fullPage: true });
  const badgeVisible = await page.locator('text=Voix du cercle').count();
  console.log('G2 — pastille "Voix du cercle" visible sur /membre/{uid}:', badgeVisible);

  // Onglet Profil de l'espace client : choisir le badge en vedette + Badges à gagner
  await page.goto(`${BASE}/compte?onglet=profile`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2000);
  await fermerPopups(page);
  const ongletProfil = page.locator('button, a', { hasText: /^Profil$/i });
  if (await ongletProfil.count()) { await ongletProfil.first().click().catch(() => {}); await page.waitForTimeout(600); }
  await page.screenshot({ path: `${OUT}/badges/G2-compte-defaut.png`, fullPage: true });
  const badgesSection = page.locator('p', { hasText: /^Badges$/i }).first();
  await badgesSection.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/badges/G2-compte-profil-badges.png`, fullPage: true });
  const boutonVedette = page.locator('button', { hasText: /Voix du cercle/i });
  const nbBoutonVedette = await boutonVedette.count();
  console.log('G2 — bouton pour choisir "Voix du cercle" en vedette trouvé:', nbBoutonVedette);
  const aGagnerDetails = page.locator('summary', { hasText: /Badges à gagner/i });
  const nbAGagner = await aGagnerDetails.count();
  if (nbAGagner) { await aGagnerDetails.first().click(); await page.waitForTimeout(400); }
  await page.screenshot({ path: `${OUT}/badges/G2-compte-badges-a-gagner-ouvert.png`, fullPage: true });
  console.log('G2 — détail "Badges à gagner" trouvé:', nbAGagner);

  await ctx.close();
} finally {
  await browser.close();
  await rest(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`, { idToken: u.idToken });
  const q2 = await fsquery('newsletter', 'uid', uid);
  const docs = (q2 || []).filter(r => r.document).map(r => r.document.name.split('/documents/')[1]);
  for (const p of [`members/${uid}`, `badges/${uid}`, ...docs]) await fsdel(p);
  console.log('nettoyage fini');
}
