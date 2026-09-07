// Vérification visuelle du panneau de détail des compteurs (Krystine, 7 sept
// 2026). Connexion réelle admin@krystinestlaurent.ca par le formulaire
// EMAIL, captures 1440 et 390. Script temporaire, supprimé après usage.
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = 'http://localhost:5198';
const EMAIL = 'admin@krystinestlaurent.ca';
const PASSWORD = fs.readFileSync('/Users/lesalondesinconnus/.claude/scripts/.krystine_admin_pw', 'utf8').trim();
const OUT = 'scripts/qa/shots/detail-compteurs';
fs.mkdirSync(OUT, { recursive: true });

async function connecter(page) {
  await page.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Accès Admin', { timeout: 15000 });
  await page.click('button:has-text("Email")');
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button:has-text("Se connecter")');
  await page.waitForSelector('text=Votre communauté', { timeout: 20000 });
  await page.waitForTimeout(1500); // laisse les agrégations (getCountFromServer) revenir
}

async function capturerDesktop(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('[erreur page]', e.message));
  await connecter(page);

  // 1. Infobulle au survol de « Désabonnées »
  const carteDesab = page.locator('p:has-text("Désabonnées")').first();
  await carteDesab.scrollIntoViewIfNeeded();
  await carteDesab.hover();
  await page.waitForTimeout(700); // le délai d'intention (150ms) + la lecture Firestore
  await page.screenshot({ path: `${OUT}/1-hover-desabonnees-1440.jpg`, quality: 80 });

  // 2. Panneau ouvert sur « Actives » avec des lignes réelles
  await page.mouse.move(10, 10); // referme l'infobulle avant de cliquer ailleurs
  await page.waitForTimeout(300);
  const carteActives = page.locator('p:has-text("Actives")').first();
  await carteActives.scrollIntoViewIfNeeded();
  await carteActives.click();
  await page.waitForSelector('h3:has-text("Actives")', { timeout: 10000 });
  await page.waitForTimeout(2000); // la première page de cent
  await page.screenshot({ path: `${OUT}/2-panel-actives-1440.jpg`, quality: 80 });

  // 3. Une ligne dépliée
  const premiereLigne = page.locator('.fixed.inset-0 ul > li > button').first();
  await premiereLigne.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/3-panel-ligne-depliee-1440.jpg`, quality: 80 });

  // 4. Regroupé par langue, données réelles
  await page.selectOption('select[title="Regrouper par"]', 'langue');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/4-panel-groupe-langue-1440.jpg`, quality: 80 });

  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // 5. Profil client — les deux nouveaux champs
  await page.goto(`${BASE}/compte`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button:has-text("Profil")', { timeout: 15000 });
  await page.click('button:has-text("Profil")');
  await page.waitForSelector('text=À propos de vous', { timeout: 10000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/5-profil-client-1440.jpg`, fullPage: true, quality: 80 });

  await ctx.close();
}

async function capturerMobile(browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await connecter(page);

  const carteActives = page.locator('p:has-text("Actives")').first();
  await carteActives.scrollIntoViewIfNeeded();
  await carteActives.click();
  await page.waitForSelector('h3:has-text("Actives")', { timeout: 10000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/6-panel-actives-390.jpg`, quality: 80 });

  await page.selectOption('select[title="Regrouper par"]', 'langue');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/7-panel-groupe-langue-390.jpg`, quality: 80 });

  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  await page.goto(`${BASE}/compte`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button:has-text("Profil")', { timeout: 15000 });
  await page.click('button:has-text("Profil")');
  await page.waitForSelector('text=À propos de vous', { timeout: 10000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/8-profil-client-390.jpg`, fullPage: true, quality: 80 });

  await ctx.close();
}

const browser = await chromium.launch();
await capturerDesktop(browser);
await capturerMobile(browser);
await browser.close();
console.log('captures écrites dans', OUT);
