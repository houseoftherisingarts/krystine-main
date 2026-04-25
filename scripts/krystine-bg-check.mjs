import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

// Home
await page.goto('http://localhost:3002/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(9000);
await page.screenshot({ path: '/tmp/krystine-bg-home.png', fullPage: false });

// Krystine page
await page.goto('http://localhost:3002/krystine', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(3500);
await page.screenshot({ path: '/tmp/krystine-bg-krystine.png', fullPage: false });

// Formations
await page.goto('http://localhost:3002/formations', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(3500);
await page.screenshot({ path: '/tmp/krystine-bg-formations.png', fullPage: false });

// Verify that the photo is actually set on body and not just visible
const info = await page.evaluate(() => {
  const bs = getComputedStyle(document.body);
  return {
    backgroundImage: bs.backgroundImage,
    backgroundSize: bs.backgroundSize,
    backgroundAttachment: bs.backgroundAttachment,
  };
});
console.log('body bg:', JSON.stringify(info));
console.log('ERRORS:', errors.length);
errors.forEach(e => console.log(' -', e));
await browser.close();
