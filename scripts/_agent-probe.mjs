import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:3034/accueil', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
const all = page.getByRole('button', { name: /Créer mon compte/i });
console.log('count:', await all.count());
for (let i = 0; i < await all.count(); i++) {
  const el = all.nth(i);
  console.log(i, 'visible:', await el.isVisible().catch(e => 'ERR ' + e.message));
}
const visibles = page.locator('button:visible', { hasText: /Créer mon compte/i });
console.log('visible count:', await visibles.count());
await browser.close();
