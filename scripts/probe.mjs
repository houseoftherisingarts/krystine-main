import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push('PE: ' + e.message));
p.on('console', m => errs.push(`[${m.type()}] ` + m.text().slice(0,300)));
await p.goto('http://localhost:3000/krystine', { waitUntil: 'load', timeout: 30000 });
await p.waitForTimeout(3500);
const overlay = await p.evaluate(() => {
  const o = document.querySelector('vite-error-overlay');
  if (o && o.shadowRoot) return o.shadowRoot.textContent.slice(0, 800);
  return null;
});
const bodyLen = await p.evaluate(() => document.body.innerText.length);
console.log('bodyTextLen=', bodyLen);
console.log('overlay=', overlay);
console.log('--- console/errors ---');
errs.slice(0,20).forEach(e => console.log(e));
await b.close();
