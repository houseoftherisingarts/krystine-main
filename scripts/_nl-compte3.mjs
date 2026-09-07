import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => { window.__errs = []; window.addEventListener('error', e => window.__errs.push((e.error && e.error.stack) || e.message)); window.addEventListener('unhandledrejection', e => window.__errs.push('rejet: ' + ((e.reason && e.reason.stack) || String(e.reason)))); });
const page = await ctx.newPage();
for (const p of ['/compte', '/formations', '/foyer']) {
  await page.goto('http://localhost:3011' + p, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(5000);
  const errs = await page.evaluate(() => window.__errs);
  console.log(p, '| enfants #root :', await page.evaluate(() => document.getElementById('root')?.children.length), '| erreurs :', errs.length);
  errs.slice(0, 1).forEach(e => console.log(String(e).split('\n').slice(0, 14).join('\n')));
}
await browser.close();
