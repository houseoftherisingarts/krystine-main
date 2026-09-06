// QA — bannières, fonds d'écran, signature (points B1-B6). Compte jetable
// comme scripts/qa/bannieres-signature.mjs. Deux comptes : un qui possède
// nature+iris+sanslogo-nature (pour B1/B2/B3/B4/B5/B6), un vierge (pour la
// preuve de refus serveur B3).
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const API_KEY = fs.readFileSync('.env.local', 'utf8').match(/VITE_FIREBASE_API_KEY=(.+)/)[1].trim();
const PROJET = 'krystinestlaurent-87566';
const BASE = process.env.BASE || 'http://localhost:5199';
const OUT = process.env.OUT || '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/revue/bannieres-fonds-signature';
fs.mkdirSync(OUT, { recursive: true });
const rest = async (url, body) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
const gtoken = execSync('gcloud auth print-access-token').toString().trim();
const fsdoc = async (path, fields) => {
  const u = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents/${path}`;
  const r = await fetch(u, { method: 'PATCH', headers: { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
  if (!r.ok) console.log('firestore', path, r.status, await r.text());
};
const fsdel = async (path) => fetch(`https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents/${path}`, { method: 'DELETE', headers: { Authorization: `Bearer ${gtoken}` } });
const now = { timestampValue: new Date().toISOString() };

async function creerCompte(possede) {
  const email = `qa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@vexel-qa.test`;
  const password = 'Qa!' + Math.random().toString(36).slice(2, 12);
  const u = await rest(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { email, password, returnSecureToken: true });
  const uid = u.localId;
  await fsdoc(`members/${uid}`, { uid: { stringValue: uid }, email: { stringValue: email }, displayName: { stringValue: 'Test QA' }, personnalisation: { mapValue: { fields: { banniere: { stringValue: 'nature' } } } } });
  await fsdoc(`memberPoints/${uid}`, { balance: { integerValue: '120' }, lifetime: { integerValue: '120' } });
  if (possede.length) await fsdoc(`boutique/${uid}`, { possede: { mapValue: { fields: Object.fromEntries(possede.map(p => [p, now])) } } });
  return { email, password, uid, u };
}

async function injecterSession(page, u, uid) {
  await page.goto(`${BASE}/robots.txt`);
  await page.evaluate(([key, val]) => new Promise((res, rej) => {
    localStorage.setItem('krystine-jeu-vu', new Date().toISOString().slice(0, 10));
    localStorage.setItem('krystine-banniere-flash-vu', '1');
    const req = indexedDB.open('firebaseLocalStorageDb', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
    req.onsuccess = () => { const tx = req.result.transaction('firebaseLocalStorage', 'readwrite'); tx.objectStore('firebaseLocalStorage').put({ fbase_key: key, value: val }); tx.oncomplete = () => res(true); tx.onerror = rej; };
    req.onerror = rej;
  }), [`firebase:authUser:${API_KEY}:[DEFAULT]`, {
    uid, email: u.email, emailVerified: false, isAnonymous: false, displayName: 'Test QA',
    providerData: [{ providerId: 'password', uid: u.email, displayName: null, email: u.email, phoneNumber: null, photoURL: null }],
    stsTokenManager: { refreshToken: u.refreshToken, accessToken: u.idToken, expirationTime: Date.now() + Number(u.expiresIn) * 1000 },
    createdAt: String(Date.now()), lastLoginAt: String(Date.now()), apiKey: API_KEY, appName: '[DEFAULT]',
  }]);
}

const fermerRoue = async (page) => { const r = page.locator('.fixed.inset-0.z-\\[125\\]'); if (await r.count()) { await r.first().click({ position: { x: 8, y: 8 } }); await page.waitForTimeout(500); } };

const resultats = {};

let compteA, compteB;
let browser;
try {
  browser = await chromium.launch();

  // ── Compte A : possède nature + iris + sanslogo-nature. Sert à B1, B2, B4, B5, B6.
  compteA = await creerCompte(['banniere-nature', 'banniere-iris', 'sanslogo-nature']);
  console.log('compte A (possède nature/iris, sanslogo-nature)', compteA.uid);
  const ctxA = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pageA = await ctxA.newPage();
  await injecterSession(pageA, compteA.u, compteA.uid);

  // B6 + hero (B2) : le menu de l'espace, l'onglet "Niskas", et le hero signé.
  await pageA.goto(`${BASE}/compte`, { waitUntil: 'domcontentloaded' });
  await pageA.waitForSelector('#boutique, [class*="h-80"] img', { timeout: 20000 }).catch(() => {});
  await pageA.waitForTimeout(2500);
  await fermerRoue(pageA);
  await pageA.screenshot({ path: `${OUT}/b6-b2-hero-menu.png` });
  const ongletsTexte = await pageA.locator('button, a').filter({ hasText: /^\s*Niskas\s*$/ }).count();
  const ongletPointsTexte = await pageA.locator('button, a').filter({ hasText: /^\s*Points\s*$/ }).count();
  resultats.B6 = { ongletsNiskas: ongletsTexte, ongletsPoints: ongletPointsTexte };
  const heroSigImg = await pageA.locator('img[src*="signature-krystine"]').count();
  resultats.B2_hero = heroSigImg;

  // Onglet Téléchargements → section boutique-banniere (B1, B2, B3, B5).
  await pageA.goto(`${BASE}/compte?onglet=telechargements`, { waitUntil: 'domcontentloaded' });
  await pageA.waitForSelector('#boutique-banniere', { timeout: 20000 });
  await pageA.waitForTimeout(1500);
  await fermerRoue(pageA);
  const sect = pageA.locator('#boutique-banniere');
  await sect.scrollIntoViewIfNeeded();
  await pageA.waitForTimeout(600);
  await pageA.screenshot({ path: `${OUT}/b3-b5-boutique-bannieres.png`, fullPage: false });

  // B5 : la bannière "defaut" (Féminité & Ayurveda) offerte, avec ses 3 boutons.
  const carteDefaut = pageA.locator('button[aria-label*="Féminité" i]').first();
  const conteneurDefaut = carteDefaut.locator('xpath=ancestor::div[contains(@class,"rounded-[18px]")][1]');
  const texteDefaut = await conteneurDefaut.innerText().catch(() => '');
  resultats.B5 = {
    offerte: /Offerte/i.test(texteDefaut),
    telecharger: /Télécharger/i.test(texteDefaut),
    fondEcran: /Fond d.écran/i.test(texteDefaut),
    sansSignature: /Sans signature/i.test(texteDefaut),
    texte: texteDefaut.replace(/\n+/g, ' | '),
  };
  await conteneurDefaut.scrollIntoViewIfNeeded();
  await pageA.waitForTimeout(400);
  await conteneurDefaut.screenshot({ path: `${OUT}/b5-carte-defaut-offerte.png` });

  // B3 : la vignette Nature, possédée + sanslogo-nature déjà pris → pas de signature.
  const carteNature = pageA.locator('button[aria-label*="Nature" i]').first();
  const conteneurNature = carteNature.locator('xpath=ancestor::div[contains(@class,"rounded-[18px]")][1]');
  const sigDansNature = await conteneurNature.locator('img[src*="signature-krystine"]').count();
  const texteNature = await conteneurNature.innerText().catch(() => '');
  resultats.B3_vignette_nature_sans_signature = { imgSignature: sigDansNature, texte: texteNature.replace(/\n+/g, ' | '), aBoutonSansSignatureCoche: /Sans signature/i.test(texteNature) };
  await conteneurNature.scrollIntoViewIfNeeded();
  await pageA.waitForTimeout(400);
  await conteneurNature.screenshot({ path: `${OUT}/b3-carte-nature-sans-signature.png` });

  // B3 : la vignette Iris, possédée mais PAS sanslogo-iris → bouton "Sans signature (5)" visible.
  const carteIris = pageA.locator('button[aria-label*="iris" i]').first();
  const conteneurIris = carteIris.locator('xpath=ancestor::div[contains(@class,"rounded-[18px]")][1]');
  const sigDansIris = await conteneurIris.locator('img[src*="signature-krystine"]').count();
  const texteIris = await conteneurIris.innerText().catch(() => '');
  resultats.B3_bouton_sanslogo_iris = { imgSignature: sigDansIris, texte: texteIris.replace(/\n+/g, ' | ') };
  await conteneurIris.scrollIntoViewIfNeeded();
  await pageA.waitForTimeout(400);
  await conteneurIris.screenshot({ path: `${OUT}/b3-carte-iris-bouton-sanslogo.png` });

  // B4 : aperçu plein écran d'une bannière NON possédée (pivoine), bascule + Escape.
  const cartePivoine = pageA.locator('button[aria-label*="pivoine" i]').first();
  await cartePivoine.scrollIntoViewIfNeeded();
  await cartePivoine.click();
  await pageA.waitForTimeout(900);
  await pageA.screenshot({ path: `${OUT}/b4-apercu-banniere.png` });
  const boutonFondDialog = pageA.locator('[role="dialog"] button', { hasText: /Fond d.écran/ }).first();
  const bascVisible = await boutonFondDialog.count();
  if (bascVisible) { await boutonFondDialog.click(); await pageA.waitForTimeout(800); await pageA.screenshot({ path: `${OUT}/b4-apercu-fond.png` }); }
  await pageA.keyboard.press('Escape');
  await pageA.waitForTimeout(500);
  // Scopé sur la fenêtre d'aperçu (z-[140]) : [role="dialog"] tout court
  // attrape aussi le bandeau de consentement de cookies, toujours présent.
  const dialogFermeApresEscape = await pageA.locator('.fixed.inset-0.z-\\[140\\]').count();
  resultats.B4 = { bascVisible: !!bascVisible, dialogFermeApresEscape: dialogFermeApresEscape === 0 };

  // B1 + B2 : la fenêtre du fond d'écran de Nature (possédée, sanslogo-nature
  // déjà pris) → mesure du remplissage 16:9 et absence de signature.
  const boutonFondNature = conteneurNature.locator('button', { hasText: /^\s*Fond d.écran\s*$/ });
  await boutonFondNature.scrollIntoViewIfNeeded();
  await boutonFondNature.click();
  await pageA.waitForSelector('.fixed.inset-0.z-\\[130\\]', { timeout: 10000 });
  await pageA.waitForTimeout(900);
  await pageA.screenshot({ path: `${OUT}/b1-fond-ecran-nature.png` });
  const mesureFond = await pageA.evaluate(() => {
    const box = document.querySelector('.fixed.inset-0.z-\\[130\\] img');
    if (!box) return null;
    const cadre = box.closest('.rounded-\\[16px\\]');
    const bImg = box.getBoundingClientRect();
    const bCadre = cadre ? cadre.getBoundingClientRect() : null;
    return { img: { w: bImg.width, h: bImg.height }, cadre: bCadre ? { w: bCadre.width, h: bCadre.height } : null, naturalW: box.naturalWidth, naturalH: box.naturalHeight, objectFit: getComputedStyle(box).objectFit };
  });
  resultats.B1_mesure_fond = mesureFond;
  const sigDansFenetreFond = await pageA.locator('.fixed.inset-0.z-\\[130\\] img[src*="signature-krystine"]').count();
  resultats.B2_fenetre_fond = sigDansFenetreFond; // 0 attendu : sanslogo-nature déjà pris
  await pageA.locator('.fixed.inset-0.z-\\[130\\] button[aria-label="Fermer"]').click();
  await pageA.locator('.fixed.inset-0.z-\\[130\\]').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  await pageA.waitForTimeout(400);

  // Ouvrir le fond d'écran d'Iris (signature encore active) pour la preuve B2 positive.
  const boutonFondIris = conteneurIris.locator('button', { hasText: /^\s*Fond d.écran\s*$/ });
  await boutonFondIris.scrollIntoViewIfNeeded();
  await boutonFondIris.click();
  await pageA.waitForSelector('.fixed.inset-0.z-\\[130\\]', { timeout: 10000 });
  await pageA.waitForTimeout(900);
  await pageA.screenshot({ path: `${OUT}/b2-fond-ecran-iris-signe.png` });
  const sigDansFenetreFondIris = await pageA.locator('.fixed.inset-0.z-\\[130\\] img[src*="signature-krystine"]').count();
  resultats.B2_fenetre_fond_iris_signe = sigDansFenetreFondIris; // 1 attendu
  await pageA.locator('.fixed.inset-0.z-\\[130\\] button[aria-label="Fermer"]').click();
  await pageA.locator('.fixed.inset-0.z-\\[130\\]').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});

  // B2 (hero) : le hero affiche la signature quand la bannière active est
  // signée. Le compte A a "nature" en bannière active, déjà sans signature ;
  // on bascule sur Iris (encore signée) et on relit le hero.
  await fsdoc(`members/${compteA.uid}`, { personnalisation: { mapValue: { fields: { banniere: { stringValue: 'iris' } } } } });
  await pageA.goto(`${BASE}/compte`, { waitUntil: 'domcontentloaded' });
  await pageA.waitForSelector('#boutique, [class*="h-80"] img', { timeout: 20000 }).catch(() => {});
  await pageA.waitForTimeout(2000);
  await fermerRoue(pageA);
  await pageA.screenshot({ path: `${OUT}/b2-hero-iris-signe.png` });
  resultats.B2_hero_iris_signe = await pageA.locator('img[src*="signature-krystine"]').count();

  await ctxA.close();

  // ── Compte B : vierge (ne possède AUCUNE bannière payante). Sert à la
  // preuve de refus serveur B3 : sanslogo-pivoine doit être rejeté.
  compteB = await creerCompte([]);
  console.log('compte B (vierge)', compteB.uid);
  const ctxB = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pageB = await ctxB.newPage();
  await injecterSession(pageB, compteB.u, compteB.uid);
  await pageB.goto(`${BASE}/compte?onglet=telechargements`, { waitUntil: 'domcontentloaded' });
  await pageB.waitForSelector('#boutique-banniere', { timeout: 20000 });
  await pageB.waitForTimeout(1200);
  await fermerRoue(pageB);
  const refusServeur = await pageB.evaluate(async () => {
    // @ts-ignore — utilise l'app Firebase déjà initialisée par la page.
    const mod = await import('/src/firebase/points.ts');
    try {
      const r = await mod.acheterAvecNiskas('sanslogo-pivoine');
      return { rejete: false, resultat: r };
    } catch (e) {
      return { rejete: true, code: e.code, message: e.message };
    }
  });
  resultats.B3_refus_serveur = refusServeur;
  await ctxB.close();

  fs.writeFileSync(`${OUT}/resultats.json`, JSON.stringify(resultats, null, 2));
  console.log(JSON.stringify(resultats, null, 2));
} finally {
  if (browser) await browser.close();
  for (const c of [compteA, compteB]) {
    if (!c) continue;
    await rest(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`, { idToken: c.u.idToken });
    for (const p of [`members/${c.uid}`, `memberPoints/${c.uid}`, `boutique/${c.uid}`]) await fsdel(p);
  }
  console.log('comptes QA effacés');
}
