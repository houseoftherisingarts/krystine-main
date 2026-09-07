import { chromium } from 'playwright';
const BASE = process.env.BASE || 'https://krystinestlaurent.ca';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/revue/accueil-medias-footer';
const browser = await chromium.launch();
for (const route of ['/origine', '/boutique', '/points-de-vente', '/vata']) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(1200);
  const hasSalon = await page.evaluate(() => !!document.querySelector('footer img[src*="salon"]'));
  const hasBlogLink = await page.evaluate(() => !!document.querySelector('footer a[href*="blog" i]') || [...document.querySelectorAll('footer a')].some(a => /blog/i.test(a.textContent||'')));
  console.log(route, 'hasSalonLogoInFooter:', hasSalon, 'hasBlogLinkInFooter:', hasBlogLink);
  await ctx.close();
}
await browser.close();
