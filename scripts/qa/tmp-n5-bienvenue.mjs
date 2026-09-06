// QA N5 : niskas de bienvenue (20), création de compte par l'interface réelle
// (pas d'injection IndexedDB : bootstrapMember() ne se déclenche que sur un
// vrai signUpWithEmail/loginWithGoogle). Compte jetable, effacé à la fin.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const PROJET = 'krystinestlaurent-87566';
const BASE = process.env.BASE || 'http://localhost:5199';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/revue/paquets-niskas';
const email = `qa-n5-${Date.now()}@vexel-qa.test`;
const password = 'Qa!' + Math.random().toString(36).slice(2, 12);
const gtoken = execSync('gcloud auth print-access-token').toString().trim();
const fsget = async (path) => {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents/${path}`, { headers: { Authorization: `Bearer ${gtoken}` } });
  return r.status === 200 ? r.json() : { status: r.status };
};
const fsdel = async (path) => fetch(`https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents/${path}`, { method: 'DELETE', headers: { Authorization: `Bearer ${gtoken}` } });
const identDel = async (idToken) => fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${fs.readFileSync('.env.local', 'utf8').match(/VITE_FIREBASE_API_KEY=(.+)/)[1].trim()}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const consoleErr = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErr.push(m.text()); });

let uid = null; let idToken = null;
try {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  // Ouvrir la fenêtre d'inscription : bouton "Créer mon compte" / icône compte de la nav.
  const btnNav = page.getByRole('button', { name: /Créer mon compte/i }).first();
  await btnNav.click();
  await page.waitForTimeout(1200);
  console.log('url après clic nav:', page.url());
  await page.screenshot({ path: `${OUT}/n5-01-fenetre.png` });
  const champEmail = page.locator('input[type=email]').first();
  await champEmail.waitFor({ timeout: 10000 });
  await champEmail.fill(email);
  await page.locator('input[type=password]').first().fill(password);
  const champNom = page.locator('input[placeholder="Nom"], input[placeholder="Name"]').first();
  if (await champNom.count()) await champNom.fill('Test QA Bienvenue');

  // La case reCAPTCHA (si rendue) : tenter le clic sur l'ancre.
  await page.waitForTimeout(1500);
  const recaptchaFrame = page.frameLocator('iframe[title="reCAPTCHA"]').first();
  const anchor = recaptchaFrame.locator('#recaptcha-anchor');
  let captchaCoche = false;
  if (await anchor.count().catch(() => 0)) {
    await anchor.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(2500);
    captchaCoche = await anchor.getAttribute('aria-checked').then((v) => v === 'true').catch(() => false);
  }
  await page.screenshot({ path: `${OUT}/n5-02-formulaire-rempli.png` });
  console.log('captcha coché:', captchaCoche);

  const btnSubmit = page.locator('button[type=submit]').first();
  await btnSubmit.click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/n5-03-apres-submit.png` });

  const erreur = await page.locator('p.text-red-500').first().textContent().catch(() => null);
  console.log('erreur affichée:', erreur);

  // Récupérer l'UID depuis IndexedDB (posé par le SDK après signUpWithEmail).
  const authState = await page.evaluate(() => new Promise((res) => {
    const req = indexedDB.open('firebaseLocalStorageDb', 1);
    req.onsuccess = () => {
      try {
        const tx = req.result.transaction('firebaseLocalStorage', 'readonly');
        const cur = tx.objectStore('firebaseLocalStorage').getAll();
        cur.onsuccess = () => res(cur.result);
        cur.onerror = () => res(null);
      } catch { res(null); }
    };
    req.onerror = () => res(null);
  }));
  const entry = (authState || []).find((e) => e.fbase_key?.includes('authUser'));
  uid = entry?.value?.uid || null;
  idToken = entry?.value?.stsTokenManager?.accessToken || null;
  console.log('uid obtenu:', uid, 'erreur console:', consoleErr.slice(0, 5));

  if (uid) {
    await page.waitForTimeout(10000); // laisser le temps au cloud function reclamerBienvenue
    const mp = await fsget(`memberPoints/${uid}`);
    console.log('memberPoints après 10s:', JSON.stringify(mp));
    const evt = await fsget(`pointsEvents/welcome-claim:${uid}`);
    console.log('pointsEvents welcome-claim:', JSON.stringify(evt));
  } else {
    console.log('AUCUN UID — le compte ne semble pas avoir été créé (probablement bloqué par reCAPTCHA ou erreur de formulaire).');
  }
} finally {
  await browser.close();
  if (uid) {
    for (const p of [`members/${uid}`, `memberPoints/${uid}`, `pointsEvents/welcome-claim:${uid}`]) await fsdel(p);
    if (idToken) await identDel(idToken);
    console.log('compte de test effacé:', uid);
  }
}
