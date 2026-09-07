import { chromium } from 'playwright';
const BASE = process.env.BASE || 'https://krystinestlaurent.ca';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/revue/accueil-medias-footer';
const browser = await chromium.launch();

const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/medias`, { waitUntil: 'load', timeout: 45000 });
await page.waitForTimeout(1500);
await page.locator('text=Regarder les épisodes').first().scrollIntoViewIfNeeded();
await page.waitForTimeout(3000);
await page.screenshot({ path: `${OUT}/a4-medias-cartes-1440-v2.png` });
await ctx.close();

const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 1300 } });
const page2 = await ctx2.newPage();
await page2.goto(`${BASE}/medias`, { waitUntil: 'load', timeout: 45000 });
await page2.waitForTimeout(1500);
await page2.locator('#livres').scrollIntoViewIfNeeded();
await page2.waitForTimeout(3000);
await page2.screenshot({ path: `${OUT}/a5-livres-tome3-closeup-1440-v2.png` });
// gros plan sur la 3e couverture précisément
const cover3 = page2.locator('#livres .grid > article').nth(2);
await cover3.scrollIntoViewIfNeeded();
await page2.waitForTimeout(500);
await cover3.screenshot({ path: `${OUT}/a5-livres-tome3-cover-only.png` });
await ctx2.close();

// full page medias pour chercher "accès libre" / "redécouvrir"
const ctx3 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page3 = await ctx3.newPage();
await page3.goto(`${BASE}/medias`, { waitUntil: 'load', timeout: 45000 });
await page3.waitForTimeout(1500);
const bodyText = await page3.evaluate(() => document.body.innerText);
console.log('CONTAINS accès libre:', /accès libre/i.test(bodyText));
console.log('CONTAINS redécouvrir:', /redécouvrir/i.test(bodyText));
console.log('CONTAINS youtube link href:', await page3.evaluate(() => [...document.querySelectorAll('a[href*="youtube"]')].map(a=>a.href)));
await ctx3.close();

await browser.close();
