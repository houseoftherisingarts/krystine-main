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
await page.locator('button', { hasText: 'Se connecter' }).first().click();
await page.waitForTimeout(700);
// La modale ouvre en mode inscription par défaut — basculer sur connexion.
await page.locator('button', { hasText: 'Se connecter' }).last().click();
await page.waitForTimeout(400);
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PW);
await page.locator('button[type="submit"]').click();
await page.waitForTimeout(3000);
console.log('url after signin:', page.url());

// Ferme toute pop-up d'accueil (cadeau du jour, roue, etc.) : ce sont des
// popups d'engagement sans rapport avec le mode éditeur, hors de portée ici.
async function fermerPopups() {
  for (let i = 0; i < 4; i++) {
    const overlay = page.locator('[class*="z-[125]"], [role="dialog"]').first();
    if (!(await overlay.count())) break;
    const bouton = overlay.locator('button', { hasText: /merci|fermer|continuer|plus tard/i }).first();
    if (await bouton.count()) {
      await bouton.click({ force: true }).catch(() => {});
    } else {
      await page.keyboard.press('Escape').catch(() => {});
    }
    await page.waitForTimeout(500);
  }
}

// 1) Bannière du compte : le bouton à côté d'Espace admin / Déconnexion
await page.waitForSelector('text=Déconnexion', { timeout: 15000 }).catch(() => {});
await fermerPopups();
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/bouton-01-compte-banniere.png` });

const toggle = page.locator('button', { hasText: /mode éditeur/i }).first();
console.log('toggle count on /compte:', await toggle.count());
if (await toggle.count()) {
  await toggle.click({ force: true });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/bouton-02-compte-mode-actif.png` });
  // repasse en mode non-éditeur pour la suite
  await page.locator('button', { hasText: /quitter le mode éditeur/i }).first().click({ force: true });
  await page.waitForTimeout(500);
}

// 2) La coquille du Foyer (CadreFoyer) : même bouton dans sa bannière
await page.goto(`${BASE}/foyer/fil`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
await fermerPopups();
const toggleFoyer = page.locator('button', { hasText: /mode éditeur/i }).first();
console.log('toggle count on /foyer/fil:', await toggleFoyer.count());
await page.screenshot({ path: `${OUT}/bouton-03-foyer-fil-banniere.png` });

await browser.close();
