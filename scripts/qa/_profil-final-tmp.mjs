import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = 'http://localhost:5198';
const EMAIL = 'admin@krystinestlaurent.ca';
const PASSWORD = fs.readFileSync('/Users/lesalondesinconnus/.claude/scripts/.krystine_admin_pw', 'utf8').trim();
const OUT = 'scripts/qa/shots/detail-compteurs';

async function capturer(browser, w, h, isMobile, tag) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile, hasTouch: isMobile, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Accès Admin', { timeout: 15000 });
  await page.click('button:has-text("Email")');
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button:has-text("Se connecter")');
  await page.waitForSelector('text=Votre communauté', { timeout: 20000 });
  await page.goto(`${BASE}/compte`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button:has-text("Profil")', { timeout: 15000 });
  await page.click('button:has-text("Profil")');

  // Deux pop-up possibles avant le bloc « À propos de vous » : le cadeau du
  // jour (RoueQuotidienne) et le bandeau de consentement (Loi 25) — se
  // ferment au clic sur leur fond, ne font pas partie de ce qu'on livre ici.
  await page.waitForTimeout(1000);
  const roue = page.locator('text=Cadeau du jour');
  if (await roue.count() > 0) { await page.mouse.click(5, 5); await page.waitForTimeout(400); }
  const nonMerci = page.locator('button:has-text("Non merci")');
  if (await nonMerci.count() > 0) await nonMerci.click().catch(() => {});
  await page.waitForTimeout(300);

  await page.waitForSelector('text=À propos de vous', { timeout: 10000 });
  await page.screenshot({ path: `${OUT}/full-profil-${tag}.jpg`, fullPage: true, quality: 80 });
  const bloc = page.locator('text=À propos de vous').locator('xpath=ancestor::div[contains(@class,"rounded-[24px]")][1]');
  await bloc.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await bloc.screenshot({ path: `${OUT}/bloc-profil-${tag}.png` });
  await ctx.close();
}

const b = await chromium.launch();
await capturer(b, 1440, 900, false, '1440');
await capturer(b, 390, 844, true, '390');
await b.close();
console.log('ok');
