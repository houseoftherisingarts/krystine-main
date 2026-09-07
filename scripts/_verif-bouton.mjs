import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = 'http://localhost:3032';
const OUT = 'scripts/qa/shots-editeur';
const PW = fs.readFileSync(process.env.HOME + '/.claude/scripts/.krystine_admin_pw', 'utf8').trim();
const EMAIL = 'admin@krystinestlaurent.ca';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => {
  try { localStorage.setItem('krystine-lang', 'fr'); localStorage.setItem('consent-v1', 'accepted'); } catch {}
});
const page = await ctx.newPage();
page.on('pageerror', e => console.log('[pageerror]', e.message));

await page.goto(`${BASE}/compte`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
await page.getByText('Se connecter', { exact: true }).first().click();
await page.waitForTimeout(700);
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PW);
await page.locator('button[type="submit"]').click();
await page.waitForTimeout(3000);
console.log('url after signin:', page.url());

// 1) Bannière du compte : le bouton à côté d'Espace admin / Déconnexion
await page.waitForSelector('text=Déconnexion', { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/bouton-01-compte-banniere.png` });

const toggle = page.locator('button', { hasText: /mode éditeur/i }).first();
console.log('toggle count on /compte:', await toggle.count());
if (await toggle.count()) {
  await toggle.click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/bouton-02-compte-mode-actif.png` });
  // repasse en mode non-éditeur pour la suite
  await page.locator('button', { hasText: /quitter le mode éditeur/i }).first().click();
  await page.waitForTimeout(500);
}

// 2) La coquille du Foyer (CadreFoyer) : même bouton dans sa bannière
await page.goto(`${BASE}/foyer/fil`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
const toggleFoyer = page.locator('button', { hasText: /mode éditeur/i }).first();
console.log('toggle count on /foyer/fil:', await toggleFoyer.count());
await page.screenshot({ path: `${OUT}/bouton-03-foyer-fil-banniere.png` });

await browser.close();
