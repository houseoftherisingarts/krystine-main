import { chromium } from 'playwright';

const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/36a6d2d7-cf1c-407c-9878-34afadc9f1d1/scratchpad';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })).newPage();
const errors = [];
page.on('pageerror', e => errors.push('PE: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('CE: ' + m.text().slice(0, 200)); });

await page.goto('http://localhost:3000/krystine', { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(4500);
const h = await page.evaluate(() => document.body.scrollHeight);
const ovf = await page.evaluate(() => document.documentElement.scrollWidth - 1440);
const tedx = await page.evaluate(() => /tedx/i.test(document.body.innerText));
const vh = 900;
const steps = Math.min(16, Math.ceil(h / vh));
for (let i = 0; i < steps; i++) {
  await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), i * vh * 0.92);
  await page.waitForTimeout(850);
  await page.screenshot({ path: `${OUT}/krystine-${String(i).padStart(2, '0')}.png` });
}
console.log(`height=${h}px  hOverflow=${ovf}px  shots=${steps}  TEDx_present=${tedx}  errors=${errors.length}`);
errors.slice(0, 12).forEach(e => console.log(' - ' + e));
await browser.close();
