import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const BASE = 'http://localhost:5199';
const EMAIL = 'admin@krystinestlaurent.ca';
const PASSWORD = readFileSync(`${process.env.HOME}/.claude/scripts/.krystine_admin_pw`, 'utf8').trim();
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await page.goto(`${BASE}/compte`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);
await page.getByRole('button', { name: /Se connecter/i }).first().click();
await page.waitForTimeout(500);
await page.getByRole('button', { name: /Déjà un compte/i }).click();
await page.waitForTimeout(300);
await page.getByPlaceholder('Courriel').fill(EMAIL);
await page.getByPlaceholder('Mot de passe').fill(PASSWORD);
await page.locator('form button[type="submit"]').click();
await page.waitForTimeout(3000);
// Une seule navigation pleine page après la connexion (les popups sitewide,
// consentement + roue quotidienne, se referment juste après, sans autre
// goto qui les remonterait).
await page.goto(`${BASE}/compte?onglet=aider`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
const nonMerci = page.getByRole('button', { name: /Non merci/i });
if (await nonMerci.count()) await nonMerci.click().catch(() => {});
await page.waitForTimeout(300);
await page.keyboard.press('Escape').catch(() => {});
await page.waitForTimeout(300);
await page.getByRole('button', { name: /Répondre/i }).first().click();
await page.waitForTimeout(600);
await page.locator('button', { hasText: 'Téléphone' }).first().click().catch(() => {});
await page.waitForTimeout(300);
await page.screenshot({ path: 'scripts/qa/shots/aider-formulaire-390.png', fullPage: true });
console.log('capture formulaire mobile (propre)');
await browser.close();
