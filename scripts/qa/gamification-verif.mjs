// Vérification visuelle TEMPORAIRE de l'onglet Gamification (Playwright
// headless). Capture l'onglet admin (avec la preuve Badge Bleu), puis
// l'espace d'un compte client tout neuf (niskas/coffres/badges masqués).
// Script, route et harnais retirés après la capture.
//   node scripts/qa/gamification-verif.mjs
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const BASE = 'http://localhost:5196';
const OUT = 'scripts/qa/out';
const PW = readFileSync('/Users/lesalondesinconnus/.claude/scripts/.krystine_admin_pw', 'utf8').trim();
const FIREBASE_CFG = {
  apiKey: 'AIzaSyCjxu7l0ZNpbLa5LJdTe5WdjlTmLhoNUNk',
  authDomain: 'krystinestlaurent-87566.firebaseapp.com',
  projectId: 'krystinestlaurent-87566',
};

const browser = await chromium.launch();

async function shots(page, url, nom) {
  await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: `${OUT}/${nom}-1440.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${OUT}/${nom}-390.png`, fullPage: true });
}

// 1. Admin — un vrai login (bouton EMAIL, courriel + mot de passe), l'onglet
// Gamification et la preuve Badge Bleu.
{
  const page = await browser.newPage();
  await page.goto(`${BASE}/compte`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const accepte = page.getByText(/j'accepte/i).first();
  if (await accepte.isVisible().catch(() => false)) await accepte.click();
  await page.waitForTimeout(300);
  await page.getByText(/se connecter/i).first().click();
  await page.waitForSelector('input[type="email"]', { timeout: 8000 });
  const bascule = page.getByText(/déjà un compte/i).first(); // le modal ouvre en signup par défaut
  if (await bascule.isVisible().catch(() => false)) await bascule.click();
  await page.waitForTimeout(300);
  await page.fill('input[type="email"]', 'admin@krystinestlaurent.ca');
  await page.fill('input[type="password"]', PW);
  await page.locator('form button[type="submit"]').click();
  await page.waitForTimeout(3000);
  await shots(page, '/__gamification', 'admin-gamification');
  await page.close();
}

// 2. Un compte client tout neuf : createUserWithEmailAndPassword posé
// directement par le SDK Firebase (CDN) dans la page — le formulaire du site
// exige un reCAPTCHA qu'un navigateur headless ne peut pas cocher; la
// session posée ici est un VRAI compte Firebase Auth, la même persistance
// (browserLocalPersistence) que le vrai formulaire écrit.
{
  const page = await browser.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  const email = `qa-gamification-${Date.now()}@example.com`;
  await page.evaluate(async ({ cfg, email, password }) => {
    const appMod = await import('https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js');
    const authMod = await import('https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js');
    const app = appMod.initializeApp(cfg);
    const auth = authMod.getAuth(app);
    await authMod.setPersistence(auth, authMod.browserLocalPersistence);
    await authMod.createUserWithEmailAndPassword(auth, email, password);
  }, { cfg: FIREBASE_CFG, email, password: 'motdepasse-qa-123' });

  await shots(page, '/compte', 'client-espace-formations');
  await shots(page, '/compte?onglet=telechargements', 'client-espace-telechargements');
  await shots(page, '/compte?onglet=loyalty', 'client-espace-niskas');
  await shots(page, '/compte?onglet=profile', 'client-espace-profil');
  await shots(page, '/compte?onglet=amis', 'client-espace-amis');
  await page.close();
}

await browser.close();
console.log('captures dans', OUT);
