import { chromium } from 'playwright';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/36a6d2d7-cf1c-407c-9878-34afadc9f1d1/scratchpad';
const BASE = 'https://krystinestlaurent-87566--approbation-v2-79zccagd.web.app';
const b = await chromium.launch();
for (const path of ['/krystine', '/medias', '/formations', '/podcast']) {
  const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PE: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CE: ' + m.text().slice(0,160)); });
  let offline = false;
  page.on('console', m => { if (/Firebase\] Not configured/.test(m.text())) offline = true; });
  await page.goto(BASE + path, { waitUntil: 'load', timeout: 45000 }).catch(e => errs.push('GOTO '+e.message));
  await page.waitForTimeout(5000);
  const h = await page.evaluate(() => document.body.scrollHeight);
  const name = path.replace('/','');
  await page.screenshot({ path: `${OUT}/remote-${name}.png` });
  console.log(`${path}  height=${h}  firebaseOffline=${offline}  errors=${errs.length} ${errs.slice(0,3).join(' | ')}`);
  await page.close();
}
await b.close();
