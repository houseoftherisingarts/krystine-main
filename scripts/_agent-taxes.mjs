// Script temporaire de vérification visuelle (RÈGLE -5) — supprimé après usage.
// Capture le tableau de bord admin (nouvelle carte Ventes Stripe) à 1440 et 390.
import { chromium } from 'playwright';

const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/78c2ade9-cdcd-4c68-ace2-f8eabac5d7f6/scratchpad';
const URL = 'http://localhost:3023/admin?unlock=Alexisthebest2121!';

const browser = await chromium.launch();

for (const [label, width] of [['1440', 1440], ['390', 390]]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(URL, { waitUntil: 'load', timeout: 30000 });
  // Le dashboard est la vue par défaut de /admin ; laisser le temps aux
  // requêtes Firestore (achatsFormations, pointsEvents, pourboires) de finir.
  // Les listeners temps réel de Firestore empêchent networkidle d'arriver.
  await page.waitForTimeout(6000);
  await page.screenshot({ path: `${OUT}/dashboard-${label}-full.png`, fullPage: true });
  console.log(`[${label}] erreurs console:`, errors.length ? errors : 'aucune');
  await page.close();
}

await browser.close();
console.log('captures écrites dans', OUT);
