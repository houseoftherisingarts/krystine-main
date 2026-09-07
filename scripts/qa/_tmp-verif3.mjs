import { chromium } from 'playwright';
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('https://www.krystinestlaurent.ca/medias', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1000);
const h = await page.evaluate(() => document.body.scrollHeight);
for (let y = 0; y < h; y += 400) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(350);
}
await page.waitForTimeout(1000);
await page.screenshot({ path: '/tmp/verif-krystine/medias3.png', fullPage: true });
const text = await page.evaluate(() => document.body.innerText);
console.log('Titre à révéler dans texte final:', text.includes('Titre à révéler'));
console.log('longueur texte:', text.length);
await b.close();
