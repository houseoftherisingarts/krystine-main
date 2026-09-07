// Script temporaire de vérification visuelle (RÈGLE -5) — supprimé après usage.
// Capture /formations et la fiche de la masterclass republiée, à 1440 et 390.
import { chromium } from 'playwright';

const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/78c2ade9-cdcd-4c68-ace2-f8eabac5d7f6/scratchpad';
const PAGES = [
  ['formations', 'http://localhost:3023/formations'],
  ['cours-santeparfaite', 'http://localhost:3023/cours/kajabi-2149362090'],
];

const browser = await chromium.launch();

for (const [name, url] of PAGES) {
  for (const [label, width] of [['1440', 1440], ['390', 390]]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/${name}-${label}.png`, fullPage: true });
    console.log(`[${name}/${label}] erreurs:`, errors.length ? errors : 'aucune');
    await page.close();
  }
}

await browser.close();
console.log('captures écrites dans', OUT);
