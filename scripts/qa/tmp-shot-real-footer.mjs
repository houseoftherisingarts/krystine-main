import { chromium } from 'playwright';
const BASE = process.env.BASE || 'https://krystinestlaurent.ca';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/revue/accueil-medias-footer';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/origine`, { waitUntil: 'load', timeout: 45000 });
await page.locator('footer').scrollIntoViewIfNeeded();
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/a6-footer-real-1440.png` });
// zoom sur le bas du footer (sceau + texte)
const bottomBar = page.locator('footer >> text=Plateforme développée par').locator('..');
await page.screenshot({ path: `${OUT}/a6-footer-real-full-1440.png`, fullPage: false });
const navLinks = await page.evaluate(() => [...document.querySelectorAll('footer a')].map(a => a.textContent.trim()));
console.log('Footer nav links:', navLinks);
await ctx.close();
await browser.close();
