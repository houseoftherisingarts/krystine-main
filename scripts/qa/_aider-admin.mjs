// QA temporaire : la section admin « Sondages répondus » avec la réponse
// reçue (formations-2026-09, simulée par _aider.mjs). Connexion réelle
// (admin@krystinestlaurent.ca) plutôt que le bypass ?unlock=... : celui-ci
// ne porte pas de vraie session Firebase Auth, donc les règles Firestore
// (isAdmin() basé sur request.auth.token.email) le refusent. Fichier jetable.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const BASE = 'http://localhost:5199';
const OUT = 'scripts/qa/shots';
const EMAIL = 'admin@krystinestlaurent.ca';
const PASSWORD = readFileSync(`${process.env.HOME}/.claude/scripts/.krystine_admin_pw`, 'utf8').trim();

async function fermerPopups(page) {
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Escape').catch(() => {});
    const nonMerci = page.getByRole('button', { name: /Non merci/i });
    if (await nonMerci.count()) await nonMerci.click({ timeout: 1000 }).catch(() => {});
    const overlay = page.locator('[data-bug-ignore="true"]');
    if (!(await overlay.count())) break;
    await page.waitForTimeout(400);
  }
}

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));

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
if (await page.getByRole('button', { name: /Se connecter/i }).count()) {
  console.error('connexion échouée — relancer');
  await browser.close();
  process.exit(1);
}
console.log('connecté (session réelle)');

await page.goto(`${BASE}/admin/sondages`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
await fermerPopups(page);
await page.screenshot({ path: `${OUT}/admin-sondages-liste-1440.png`, fullPage: true });
console.log('capture admin liste des sondages');

const ligneFormations = page.locator('tr', { hasText: 'Ce que vous voulez apprendre' });
await ligneFormations.getByRole('button', { name: /Réponses/i }).click();
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/admin-sondages-reponses-1440.png`, fullPage: true });
console.log('capture admin réponses reçues (formations-2026-09)');

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/admin-sondages-reponses-390.png`, fullPage: true });
console.log('capture admin réponses reçues (mobile)');

await browser.close();
