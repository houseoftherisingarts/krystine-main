import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto('http://localhost:3002/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(4000);

// Walk all the way to the Dosha Ikigai
for (const [name, y] of [
  ['dosha1', 4000], ['dosha2', 4400], ['dosha3', 4800], ['pulsation', 5200],
]) {
  await page.evaluate(yy => window.scrollTo({ top: yy, behavior: 'instant' }), y);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `/tmp/krystine-13-${name}.png`, fullPage: false });
}
await browser.close();
