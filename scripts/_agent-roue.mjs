// Capture de la roue du jour et de l'onglet Niskas, sans les fenêtres de
// bienvenue. Jetable, se supprime avec _agent-foyer.mjs.
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = 'http://localhost:3021';
const SORTIE = process.env.SORTIE || '/tmp/foyer-captures';
const pw = fs.readFileSync(`${process.env.HOME}/.claude/scripts/.krystine_admin_pw`, 'utf8').trim();
const dodo = (ms) => new Promise((r) => setTimeout(r, ms));

for (const [nom, viewport] of [['1440', { width: 1440, height: 1200 }], ['390', { width: 390, height: 900 }]]) {
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/compte`, { waitUntil: 'domcontentloaded' });
  await dodo(2500);
  const consent = page.getByRole('button', { name: /j'accepte/i }).first();
  if (await consent.count()) await consent.click().catch(() => {});
  await page.getByRole('button', { name: /se connecter|sign in/i }).first().click();
  await dodo(1200);
  const vers = page.getByRole('button', { name: /déjà un compte/i }).first();
  if (await vers.count()) await vers.click();
  await dodo(600);
  await page.locator('input[type="email"]').first().fill('admin@krystinestlaurent.ca');
  await page.locator('input[type="password"]').first().fill(pw);
  await page.locator('form button[type="submit"]').first().click();
  await dodo(6000);
  // Les deux fenêtres du jour sont déjà vues : on les met de côté.
  await page.evaluate(() => {
    const j = new Date().toISOString().slice(0, 10);
    localStorage.setItem('krystine-jeu-vu', j);
    localStorage.setItem('krystine-roue-vue', j);
  });
  await page.goto(`${BASE}/compte?onglet=loyalty`, { waitUntil: 'domcontentloaded' });
  await dodo(5000);
  await page.screenshot({ path: `${SORTIE}/niskas-${nom}.png` });
  // Puis on rouvre la roue à la main pour la regarder.
  await page.evaluate(() => window.dispatchEvent(new Event('krystine:ouvrir-roue')));
  await dodo(1500);
  await page.screenshot({ path: `${SORTIE}/roue-${nom}.png` });
  console.log(`roue ${nom} : ${SORTIE}/roue-${nom}.png · niskas : ${SORTIE}/niskas-${nom}.png`);
  await nav.close();
}
