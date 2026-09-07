import { chromium } from 'playwright';
const BASE = process.env.BASE || 'https://krystinestlaurent.ca';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const failed = [];
page.on('requestfailed', (req) => failed.push(req.url() + ' :: ' + req.failure()?.errorText));
page.on('response', (res) => { if (res.url().includes('enveloppe') ) console.log('RESPONSE', res.status(), res.url()); });
await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 45000 });
await page.locator('.offer-origine').scrollIntoViewIfNeeded();
await page.waitForTimeout(2000);
const info = await page.evaluate(() => {
  const img = document.querySelector('.o-porte img');
  if (!img) return { found: false };
  return {
    found: true,
    src: img.src,
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
    complete: img.complete,
    clientWidth: img.clientWidth,
    clientHeight: img.clientHeight,
    loadingAttr: img.getAttribute('loading'),
  };
});
console.log('IMG INFO', info);
console.log('FAILED REQUESTS containing enveloppe:', failed.filter(f => f.includes('enveloppe')));
console.log('ALL FAILED:', failed);
await browser.close();
