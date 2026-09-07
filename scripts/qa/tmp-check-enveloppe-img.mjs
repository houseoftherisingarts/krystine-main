import { chromium } from 'playwright';
const BASE = process.env.BASE || 'https://krystinestlaurent.ca';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/revue/accueil-medias-footer';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 45000 });
await page.locator('.offer-origine').scrollIntoViewIfNeeded();
await page.waitForTimeout(3000);
const info = await page.evaluate(() => {
  const img = document.querySelector('.o-porte img');
  const porte = document.querySelector('.o-porte');
  const cs = porte ? getComputedStyle(porte) : null;
  const imgCs = img ? getComputedStyle(img) : null;
  return {
    found: !!img,
    naturalWidth: img?.naturalWidth,
    complete: img?.complete,
    imgDisplay: imgCs?.display,
    imgOpacity: imgCs?.opacity,
    imgVisibility: imgCs?.visibility,
    porteBg: cs?.backgroundColor,
    porteChildren: porte ? [...porte.children].map(c => c.className) : [],
  };
});
console.log('IMG INFO', JSON.stringify(info, null, 2));
await page.locator('.offer-origine').screenshot({ path: `${OUT}/a2-enveloppe-elementclip.png` });
await page.screenshot({ path: `${OUT}/a2-full-after-3s.png` });
await browser.close();
