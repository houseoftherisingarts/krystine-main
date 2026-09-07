import { chromium } from 'playwright';
const BASE = process.env.BASE || 'https://krystinestlaurent.ca';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/revue/accueil-medias-footer';
const browser = await chromium.launch();

const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 45000 });
await page.locator('#foyer-attente').scrollIntoViewIfNeeded();
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/a1-a3-foyer-desktop-1440-v2.png` });
await ctx.close();

const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page2 = await ctx2.newPage();
await page2.goto(`${BASE}/`, { waitUntil: 'load', timeout: 45000 });
await page2.locator('footer .acct-upsell a.btn-gold').scrollIntoViewIfNeeded();
await page2.waitForTimeout(2500);
await page2.screenshot({ path: `${OUT}/a1-footer-infolettre-1440-v2.png` });
await ctx2.close();

await browser.close();
