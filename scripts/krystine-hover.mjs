import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto('http://localhost:3002/', { waitUntil: 'domcontentloaded', timeout: 30000 });
// Longer wait so DropIntro finishes fully
await page.waitForTimeout(9000);

await page.screenshot({ path: '/tmp/krystine-hover-0.png', fullPage: false });

// Read the current rotation at rest by extracting the transform style
async function readRotation() {
  return await page.evaluate(() => {
    const img = document.querySelector('img[src="/wheel-no-text.png"]');
    if (!img) return { ok: false, reason: 'img not found' };
    const t = getComputedStyle(img).transform;
    return { ok: true, transform: t };
  });
}

const t1 = await readRotation();
console.log('t1 (rest #1):', JSON.stringify(t1));
await page.waitForTimeout(1000);
const t2 = await readRotation();
console.log('t2 (rest #2):', JSON.stringify(t2));

// Now hover over the compass button
const wheel = await page.$('button[aria-label*="guider"], button[aria-label*="guided"]');
if (wheel) {
  const box = await wheel.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    console.log('hovered wheel');
  }
} else {
  console.log('wheel button not found');
}

await page.waitForTimeout(800);
const t3 = await readRotation();
console.log('t3 (after hover ~800ms):', JSON.stringify(t3));
await page.waitForTimeout(1000);
const t4 = await readRotation();
console.log('t4 (after hover ~1.8s):', JSON.stringify(t4));

await page.screenshot({ path: '/tmp/krystine-hover-1.png', fullPage: false });

console.log('ERRORS:', errors.length);
errors.forEach(e => console.log(' -', e));
await browser.close();
