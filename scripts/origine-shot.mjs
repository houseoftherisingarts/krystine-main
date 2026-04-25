import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto('http://localhost:3002/accueil', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(6000);

// Scroll to where the new Origine section lives (just after trois portes)
for (const [name, y] of [['top', 1800], ['mid', 2200], ['bot', 2700]]) {
  await page.evaluate(yy => window.scrollTo({ top: yy, behavior: 'instant' }), y);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `/tmp/origine-${name}.png`, fullPage: false });
}

console.log('ERRORS:', errors.length);
errors.forEach(e => console.log(' -', e));
await browser.close();
