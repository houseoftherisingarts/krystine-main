import { chromium } from 'playwright';
const BASE = process.env.BASE || 'https://krystinestlaurent.ca';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/revue/accueil-medias-footer';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/origine`, { waitUntil: 'load', timeout: 45000 });
await page.waitForTimeout(1500);
const refuse = page.locator('button:has-text("Non merci")');
if (await refuse.count()) { await refuse.first().click(); await page.waitForTimeout(300); }
await page.locator('footer').scrollIntoViewIfNeeded();
await page.waitForTimeout(2500);
// scroll further to pin bottom bar in view
await page.mouse.wheel(0, 400);
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/a6-footer-real-nobanner-1440.png` });
const bottomBar = page.locator('footer button[aria-haspopup="dialog"]');
await bottomBar.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await bottomBar.screenshot({ path: `${OUT}/a6-salon-badge-closeup.png` });
await ctx.close();
await browser.close();
