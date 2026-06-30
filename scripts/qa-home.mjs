import { chromium } from 'playwright';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/36a6d2d7-cf1c-407c-9878-34afadc9f1d1/scratchpad';
const b = await chromium.launch();
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
page.on('pageerror', e => errs.push('PE: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CE: ' + m.text().slice(0,160)); });
await page.goto('http://localhost:3000/accueil/index.html', { waitUntil: 'load', timeout: 30000 }).catch(e=>errs.push('GOTO '+e.message));
await page.waitForTimeout(2500);
const dustOK = await page.evaluate(() => !!document.getElementById('dust') && document.getElementById('dust').width>0);
// scroll through to exercise sticky sections
for (let i=1;i<=5;i++){ await page.evaluate(y=>scrollTo(0,y), i*700); await page.waitForTimeout(500); }
await page.screenshot({ path: `${OUT}/home-mid.png` });
console.log(`home: dustCanvas=${dustOK} errors=${errs.length} ${errs.slice(0,4).join(' | ')}`);
await b.close();
