import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto('http://localhost:3002/conferenciere', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(4000);

const overflow = await page.evaluate(() => {
  const doc = document.documentElement;
  return { scrollW: doc.scrollWidth, clientW: doc.clientWidth, h: document.body.scrollHeight };
});
console.log('1440 viewport: scrollW=%d clientW=%d total height=%d', overflow.scrollW, overflow.clientW, overflow.h);

await page.screenshot({ path: '/tmp/conf-1.png', fullPage: false });
for (const [name, y] of [
  ['2', 700], ['3', 1400], ['4', 2100], ['5', 2800], ['6', 3500], ['7', 4200], ['8', 4900], ['9', 5600],
]) {
  await page.evaluate(yy => window.scrollTo({ top: yy, behavior: 'instant' }), y);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `/tmp/conf-${name}.png`, fullPage: false });
}

console.log('ERRORS:', errors.length);
errors.forEach(e => console.log(' -', e));
await browser.close();
