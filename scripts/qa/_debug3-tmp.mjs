import { chromium } from 'playwright';
const BASE = 'http://localhost:5195';
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 2400 }, deviceScaleFactor: 1.5 });
await c.addInitScript(() => { window.__KRYSTINE_FN_EMULATOR__ = true; });
const page = await c.newPage();
await page.goto(`${BASE}/compte`, { waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: /se connecter/i }).first().click();
await page.waitForTimeout(500);
const lien = page.getByRole('button', { name: /déjà un compte/i });
if (await lien.count()) { await lien.click(); await page.waitForTimeout(300); }
await page.getByPlaceholder(/courriel/i).fill('admin@krystinestlaurent.ca');
await page.getByPlaceholder(/mot de passe/i).fill(process.env.KRYSTINE_ADMIN_PW);
await page.getByRole('button', { name: /^se connecter$/i }).last().click();
await page.waitForTimeout(3500);
// Fermer le cadeau du jour s'il s'affiche (jour undefined possible sur ce compte propre)
const fermer = page.getByRole('button', { name: /fermer/i });
if (await fermer.count()) { await fermer.first().click(); await page.waitForTimeout(300); }
await page.getByRole('button', { name: /changer la bannière/i }).click();
await page.waitForTimeout(600);
await page.screenshot({ path: 'scripts/qa/shots/cadeau-choix-banniere-plein-1440.png' });
await b.close();
