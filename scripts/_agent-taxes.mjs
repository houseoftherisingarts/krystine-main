// Script temporaire de vérification visuelle (RÈGLE -5) — supprimé après usage.
// Connexion admin réelle (courriel + mot de passe), puis capture du tableau
// de bord (nouvelle carte Ventes Stripe) à 1440 et 390.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';

const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/78c2ade9-cdcd-4c68-ace2-f8eabac5d7f6/scratchpad';
const PASSWORD = readFileSync(`${homedir()}/.claude/scripts/.krystine_admin_pw`, 'utf8').trim();
const EMAIL = 'admin@krystinestlaurent.ca';

const browser = await chromium.launch();

for (const [label, width] of [['1440', 1440], ['390', 390]]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));

  await page.goto('http://localhost:3023/admin', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1000);
  // Bascule sur l'onglet Email de la connexion admin, puis se connecte.
  await page.getByRole('button', { name: 'Email' }).click();
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  // Laisser Firebase Auth + les requêtes Firestore (achatsFormations,
  // pointsEvents, pourboires) du dashboard se terminer.
  await page.waitForTimeout(6000);
  await page.screenshot({ path: `${OUT}/dashboard-${label}-full.png`, fullPage: true });
  console.log(`[${label}] url:`, page.url());
  console.log(`[${label}] erreurs console:`, errors.length ? errors.slice(0, 8) : 'aucune');
  await page.close();
}

await browser.close();
console.log('captures écrites dans', OUT);
