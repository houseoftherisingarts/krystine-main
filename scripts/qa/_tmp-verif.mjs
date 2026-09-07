import { chromium } from 'playwright';
const b = await chromium.launch();
const pages = [
  ['https://www.krystinestlaurent.ca/compte', 'compte'],
  ['https://www.krystinestlaurent.ca/medias', 'medias'],
  ['https://www.krystinestlaurent.ca/foyer', 'foyer'],
];
for (const [url, name] of pages) {
  for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'mobile']]) {
    const page = await b.newPage({ viewport: { width: w, height: h } });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `/tmp/verif-krystine/${name}-${tag}.png`, fullPage: name !== 'compte' });
    await page.close();
  }
}
await b.close();
console.log('captures faites');
