// Vérification visuelle TEMPORAIRE de l'onglet Gamification (Playwright
// headless). Capture l'onglet admin (avec la preuve Badge Bleu), puis
// l'espace d'un compte client tout neuf (niskas/coffres/badges masqués).
// Script et route retirés après la capture. node scripts/qa/gamification-verif.mjs
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const BASE = 'http://localhost:5196';
const OUT = 'scripts/qa/out';
const PW = readFileSync('/Users/lesalondesinconnus/.claude/scripts/.krystine_admin_pw', 'utf8').trim();

const browser = await chromium.launch();

async function connecter(page, email, motDePasse, { creerCompte = false } = {}) {
  await page.goto(`${BASE}/compte`, { waitUntil: 'domcontentloaded' });
  const bouton = page.getByText(/se connecter|créer mon compte|compte/i).first();
  await bouton.click({ timeout: 8000 }).catch(() => {});
  await page.waitForSelector('input[type="email"]', { timeout: 8000 });
  if (creerCompte) {
    const inscription = page.getByText(/créer un compte|s'inscrire|sign up/i).first();
    if (await inscription.isVisible().catch(() => false)) await inscription.click();
  }
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', motDePasse);
  await page.locator('form').locator('button[type="submit"], button:has-text("Continuer"), button:has-text("Se connecter"), button:has-text("Créer")').first().click();
  await page.waitForTimeout(2500);
}

async function shots(page, url, nom) {
  await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: `${OUT}/${nom}-1440.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${OUT}/${nom}-390.png`, fullPage: true });
}

// 1. Admin — l'onglet Gamification + la preuve Badge Bleu.
{
  const page = await browser.newPage();
  await connecter(page, 'admin@krystinestlaurent.ca', PW);
  await shots(page, '/__gamification', 'admin-gamification');
  await page.close();
}

// 2. Un compte client tout neuf — niskas/coffres/badges doivent être absents.
{
  const page = await browser.newPage();
  const email = `qa-gamification-${Date.now()}@example.com`;
  await connecter(page, email, 'motdepasse-qa-123', { creerCompte: true });
  await shots(page, '/compte', 'client-espace');
  await page.close();
}

await browser.close();
console.log('captures dans', OUT);
