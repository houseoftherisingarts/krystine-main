import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => {
  if (m.type() === 'error') errors.push('console: ' + m.text());
});

await page.goto('http://localhost:3002/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(5000);
await page.screenshot({ path: '/tmp/krystine-home-top.png', fullPage: false });

for (const [name, y] of [['mid1', 900], ['mid2', 1800], ['mid3', 2700], ['mid4', 3600]]) {
  await page.evaluate(yy => window.scrollTo({ top: yy, behavior: 'instant' }), y);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `/tmp/krystine-home-${name}.png`, fullPage: false });
}

await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
await page.waitForTimeout(1500);
await page.screenshot({ path: '/tmp/krystine-home-bottom.png', fullPage: false });

console.log('ERRORS:', errors.length);
errors.forEach(e => console.log(' -', e));

await browser.close();
