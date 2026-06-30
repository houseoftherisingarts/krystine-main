import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push('PE: ' + e.message));
p.on('requestfailed', r => errs.push('REQFAIL: ' + r.url() + ' ' + (r.failure()?.errorText||'')));
await p.goto('http://localhost:3000/krystine', { waitUntil: 'networkidle', timeout: 45000 }).catch(e=>errs.push('GOTO: '+e.message));
await p.waitForTimeout(9000);
const info = await p.evaluate(() => ({
  h: document.body.scrollHeight,
  htmlLen: document.documentElement.innerHTML.length,
  hasSpinner: !!document.querySelector('.animate-spin'),
  rootKids: document.getElementById('root')?.childElementCount ?? -1,
  firstTags: Array.from(document.getElementById('root')?.children||[]).map(c=>c.tagName+'.'+c.className).slice(0,3),
}));
console.log(JSON.stringify(info, null, 2));
errs.slice(0,15).forEach(e=>console.log(e));
await b.close();
