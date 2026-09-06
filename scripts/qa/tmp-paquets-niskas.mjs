// QA sceptique — paquets/achats/boutique de niskas (N1-N5). Compte jetable,
// patron de bannieres-signature.mjs. Rien n'est corrigé ici, seulement observé.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const API_KEY = fs.readFileSync('.env.local', 'utf8').match(/VITE_FIREBASE_API_KEY=(.+)/)[1].trim();
const PROJET = 'krystinestlaurent-87566';
const BASE = process.env.BASE || 'http://localhost:5199';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/revue/paquets-niskas';
const email = `qa-${Date.now()}@vexel-qa.test`;
const password = 'Qa!' + Math.random().toString(36).slice(2, 12);

const rest = async (url, body) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
const gtoken = execSync('gcloud auth print-access-token').toString().trim();
const fsdoc = async (path, fields) => {
  const u = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents/${path}`;
  const r = await fetch(u, { method: 'PATCH', headers: { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
  if (!r.ok) console.log('firestore', path, r.status, await r.text());
};
const fsdel = async (path) => fetch(`https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents/${path}`, { method: 'DELETE', headers: { Authorization: `Bearer ${gtoken}` } });

const u = await rest(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { email, password, returnSecureToken: true });
if (!u.localId) { console.log('signUp failed', u); process.exit(1); }
const uid = u.localId;
console.log('compte', uid);

// Solde confortable pour voir tous les boutons actifs (pas grisés) : 400 niskas.
await fsdoc(`members/${uid}`, { uid: { stringValue: uid }, email: { stringValue: email }, displayName: { stringValue: 'Test QA' } });
await fsdoc(`memberPoints/${uid}`, { balance: { integerValue: '400' }, lifetime: { integerValue: '400' } });

const authUser = {
  uid, email, emailVerified: false, isAnonymous: false, displayName: 'Test QA',
  providerData: [{ providerId: 'password', uid: email, displayName: null, email, phoneNumber: null, photoURL: null }],
  stsTokenManager: { refreshToken: u.refreshToken, accessToken: u.idToken, expirationTime: Date.now() + Number(u.expiresIn) * 1000 },
  createdAt: String(Date.now()), lastLoginAt: String(Date.now()), apiKey: API_KEY, appName: '[DEFAULT]',
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const netErrors = [];
page.on('response', (r) => { if (r.status() >= 400) netErrors.push(`${r.status()} ${r.url()}`); });

await page.goto(`${BASE}/robots.txt`);
await page.evaluate(([key, val]) => new Promise((res, rej) => {
  localStorage.setItem('krystine-jeu-vu', new Date().toISOString().slice(0, 10));
  localStorage.setItem('krystine-banniere-flash-vu', '1');
  const req = indexedDB.open('firebaseLocalStorageDb', 1);
  req.onupgradeneeded = () => req.result.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
  req.onsuccess = () => { const tx = req.result.transaction('firebaseLocalStorage', 'readwrite'); tx.objectStore('firebaseLocalStorage').put({ fbase_key: key, value: val }); tx.oncomplete = () => res(true); tx.onerror = rej; };
  req.onerror = rej;
}), [`firebase:authUser:${API_KEY}:[DEFAULT]`, authUser]);

const fermerRoue = async () => { const r = page.locator('.fixed.inset-0.z-\\[125\\]'); if (await r.count()) { await r.first().click({ position: { x: 8, y: 8 } }); await page.waitForTimeout(500); } };

const resultats = {};

try {
  // ── N2 chemin A : onglet Niskas → bouton « Acheter des niskas » ──
  await page.goto(`${BASE}/compte?onglet=loyalty`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500); await fermerRoue();
  const btnLoyalty = page.locator('button', { hasText: /^\s*Acheter des niskas\s*$/i }).first();
  await btnLoyalty.waitFor({ timeout: 15000 });
  await btnLoyalty.click();
  await page.waitForTimeout(1200);
  const panneauApresLoyalty = await page.locator('#paquets-niskas').count();
  const tabApresLoyalty = new URL(page.url()).pathname;
  await page.screenshot({ path: `${OUT}/n2-a-apres-clic-loyalty.png`, fullPage: false });
  resultats.n2_chemin_niskas = { panneauOuvert: panneauApresLoyalty > 0, url: page.url() };
  console.log('N2 chemin Niskas → panneau #paquets-niskas présent après 1 clic:', panneauApresLoyalty > 0);

  // ── N2 chemin B : profil → bouton « La petite boutique » ──
  await page.goto(`${BASE}/compte?onglet=profile`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000); await fermerRoue();
  const btnProfil = page.locator('button', { hasText: /petite boutique/i }).first();
  await btnProfil.waitFor({ timeout: 15000 });
  await btnProfil.click();
  await page.waitForTimeout(1200);
  const panneauApresProfil = await page.locator('#paquets-niskas').count();
  await page.screenshot({ path: `${OUT}/n2-b-apres-clic-profil.png`, fullPage: false });
  resultats.n2_chemin_profil = { panneauOuvert: panneauApresProfil > 0 };
  console.log('N2 chemin Profil → panneau #paquets-niskas présent après 1 clic:', panneauApresProfil > 0);

  // ── N1 : ouvrir le panneau directement par le bouton de la boutique elle-même, capturer, mesurer la grille ──
  const btnBoutique = page.locator('button', { hasText: /Acheter des niskas/i }).first();
  if (await btnBoutique.count() && panneauApresProfil === 0) {
    await btnBoutique.click();
    await page.waitForTimeout(800);
  }
  const panneau = page.locator('#paquets-niskas');
  await panneau.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/n1-panneau-paquets.png`, fullPage: false });
  // Mesure de la grille (2x4) et des images
  const grille = await page.evaluate(() => {
    const ul = document.querySelector('#paquets-niskas ul');
    if (!ul) return null;
    const lis = Array.from(ul.querySelectorAll('li'));
    const rect = ul.getBoundingClientRect();
    const cols = getComputedStyle(ul).gridTemplateColumns.split(' ').length;
    return {
      nbArticles: lis.length,
      colonnesCss: cols,
      largeursImages: lis.map((li) => {
        const img = li.querySelector('img');
        return img ? Math.round(img.getBoundingClientRect().width) : null;
      }),
      prix: lis.map((li) => li.querySelector('button')?.textContent?.trim()),
    };
  });
  resultats.n1_grille = grille;
  console.log('N1 grille:', JSON.stringify(grille));

  // Vérifier les 8 images 200 OK + gradation de taille (classes w-24/28/32/36 déjà lues en CSS, on vérifie ici les tailles réelles rendues)
  const imgChecks = [];
  for (const pq of ['p100', 'p180', 'p400', 'p750', 'p1600', 'p2800', 'p4500', 'p10000']) {
    const r = await page.request.get(`${BASE}/compte/paquets/${pq}.webp`);
    imgChecks.push({ id: pq, status: r.status() });
  }
  resultats.n1_images = imgChecks;
  console.log('N1 images:', JSON.stringify(imgChecks));

  // ── N3 : boutons "Toute la saison" en or (bouton-compte) pour saison 1 ET 2 ──
  const santeLaVie = page.locator('h3', { hasText: 'Santé la vie' }).first();
  await santeLaVie.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/n3-sante-la-vie.png`, fullPage: false });
  const boutonsOr = await page.evaluate(() => {
    const boutons = Array.from(document.querySelectorAll('.bouton-compte'));
    return boutons.map((b) => ({ texte: b.closest('li, div')?.previousElementSibling?.textContent?.trim() || b.textContent.trim(), classe: b.className }));
  });
  const positionSanteLaVie = await santeLaVie.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  resultats.n3_boutons_or = boutonsOr;
  console.log('N3 boutons or métallique (bouton-compte):', JSON.stringify(boutonsOr));

  // ── N4 : section « Les vidéos publiques de Krystine », position, coût 30 ──
  const videosHeading = page.locator('p', { hasText: 'Les vidéos publiques de Krystine' }).first();
  const existeVideos = await videosHeading.count();
  let positionVideos = null;
  if (existeVideos) {
    positionVideos = await videosHeading.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    await videosHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/n4-videos-publiques.png`, fullPage: false });
  }
  const coutTexte = await page.locator('text=/Ouvrir la section/i').first().textContent().catch(() => null);
  resultats.n4 = { existe: !!existeVideos, positionVideos, positionSanteLaVie, sousLaSante: positionVideos !== null && positionSanteLaVie !== null ? positionVideos > positionSanteLaVie : null, coutTexte };
  console.log('N4:', JSON.stringify(resultats.n4));

  // Full page screenshot for overview grid check (N1 spacing)
  await page.goto(`${BASE}/compte?onglet=telechargements`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500); await fermerRoue();
  const btnBoutique2 = page.locator('button', { hasText: /Acheter des niskas/i }).first();
  await btnBoutique2.click().catch(() => {});
  await page.waitForTimeout(800);
  await page.locator('#paquets-niskas').scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/n1-panneau-fullwidth.png`, fullPage: false });

} finally {
  await browser.close();
  fs.writeFileSync(`${OUT}/resultats.json`, JSON.stringify(resultats, null, 2));
  console.log('erreurs réseau (>=400):', JSON.stringify(netErrors));
  await rest(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`, { idToken: u.idToken });
  for (const p of [`members/${uid}`, `memberPoints/${uid}`]) await fsdel(p);
  console.log('fini, compte effacé');
}
