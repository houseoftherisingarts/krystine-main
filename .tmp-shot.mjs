import { chromium } from 'playwright';

const outDir = '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/attente';
const base = 'http://localhost:4183';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto(`${base}/formations`, { waitUntil: 'networkidle' });
await page.locator('#a-votre-rythme').scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
await page.screenshot({ path: `${outDir}/01-formations-cartes.png` });

await page.goto(`${base}/liste-attente?programme=pitta&titre=Saison%20Pitta`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.locator('#inscription').scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
await page.screenshot({ path: `${outDir}/02-liste-attente-visiteur.png` });

await browser.close();
console.log('done');
