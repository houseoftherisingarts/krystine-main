import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto('http://localhost:3002/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(5000);

// Report any horizontal overflow
const overflow = await page.evaluate(() => {
  const doc = document.documentElement;
  return {
    scrollW: doc.scrollWidth,
    clientW: doc.clientWidth,
    hasHorizontal: doc.scrollWidth > doc.clientWidth,
  };
});
console.log('viewport 1280: scrollWidth=%d clientWidth=%d horizontal=%s', overflow.scrollW, overflow.clientW, overflow.hasHorizontal);

await page.screenshot({ path: '/tmp/krystine-13-top.png', fullPage: false });

for (const [name, y] of [['mid1', 700], ['mid2', 1400], ['mid3', 2100], ['mid4', 2800], ['mid5', 3500]]) {
  await page.evaluate(yy => window.scrollTo({ top: yy, behavior: 'instant' }), y);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `/tmp/krystine-13-${name}.png`, fullPage: false });
}

console.log('ERRORS:', errors.length);
errors.forEach(e => console.log(' -', e));
await browser.close();
