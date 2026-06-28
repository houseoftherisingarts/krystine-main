import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/36a6d2d7-cf1c-407c-9878-34afadc9f1d1/scratchpad';
const routes = ['v1', 'v2', 'v3'];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

for (const r of routes) {
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 180)); });
  try {
    await page.goto(`${BASE}/${r}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000); // laisser les entrées GSAP se poser
    await page.screenshot({ path: `${OUT}/concept-${r}-hero.png` });
    const h = await page.evaluate(() => document.body.scrollHeight);
    await page.evaluate(() => window.scrollTo({ top: Math.round(window.innerHeight * 1.05), behavior: 'instant' }));
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `${OUT}/concept-${r}-beat.png` });
    console.log(`${r}  OK  height=${h}px  errors=${errors.length}`);
  } catch (e) {
    console.log(`${r}  FAIL ${e.message.slice(0, 140)}`);
  }
  errors.slice(0, 6).forEach(e => console.log('   - ' + e));
}
await browser.close();
