import { chromium } from 'playwright';
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
await page.goto('https://www.krystinestlaurent.ca/medias', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);
console.log('erreurs:', errs.length ? errs : 'aucune');
const text = await page.evaluate(() => document.body.innerText);
console.log('longueur texte:', text.length);
console.log('Titre à révéler:', text.includes('Titre à révéler'));
await page.screenshot({ path: '/tmp/verif-krystine/medias-fixed.png', fullPage: true });

const page2 = await b.newPage({ viewport: { width: 1440, height: 900 } });
await page2.goto('https://www.krystinestlaurent.ca/foyer', { waitUntil: 'networkidle', timeout: 30000 });
await page2.waitForTimeout(2000);
const h = await page2.evaluate(() => document.body.scrollHeight);
for (let y = 0; y < h; y += 500) { await page2.evaluate((yy) => window.scrollTo(0, yy), y); await page2.waitForTimeout(200); }
await page2.evaluate(() => window.scrollTo(0,0)); await page2.waitForTimeout(500);
const text2 = await page2.evaluate(() => document.body.innerText);
console.log('foyer longueur texte:', text2.length);
console.log('Pas de parcours à suivre:', text2.includes('Pas de parcours à suivre'));
console.log('fleur / thème du mois absent:', !text2.includes('thème du mois'));
await page2.screenshot({ path: '/tmp/verif-krystine/foyer-fixed.png', fullPage: true });

await b.close();
