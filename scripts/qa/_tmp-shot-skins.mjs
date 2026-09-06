import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/skins';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
for (const skin of ['feminite', 'nature']) {
  await page.goto(`${BASE}/demo-skins?skin=${skin}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/skin-${skin}.png`, fullPage: true });
  console.log('shot', skin);
}
await browser.close();
