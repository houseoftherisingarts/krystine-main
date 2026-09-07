import { chromium } from 'playwright';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/78c2ade9-cdcd-4c68-ace2-f8eabac5d7f6/scratchpad/coffre-beta';
const browser = await chromium.launch();
for (const [nom, largeur, hauteur, echelle] of [['1440', 1440, 900, 1], ['390', 390, 844, 2]]) {
  const ctx = await browser.newContext({ viewport: { width: largeur, height: hauteur }, deviceScaleFactor: echelle });
  const page = await ctx.newPage();
  await page.goto('http://localhost:3034/admin?unlock=Alexisthebest2121!', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.getByText('Le rapport du jour').first().scrollIntoViewIfNeeded().catch(() => {});
  await page.getByText('Copier le rapport', { exact: false }).first().waitFor({ timeout: 15000 }).catch(() => {});
  // Attendre que le chargement disparaisse (plus de spinner dans la carte).
  await page.waitForFunction(() => {
    const h3 = [...document.querySelectorAll('h3')].find(e => e.textContent?.includes('Le rapport du jour'));
    const carte = h3?.closest('div')?.parentElement;
    return carte && !carte.querySelector('.fa-spin');
  }, { timeout: 20000 }).catch(() => console.log('  (timeout attente fin de chargement, capture quand même)'));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/6-admin-rapport-${nom}-charge.png` });
  await ctx.close();
}
await browser.close();
console.log('fait');
