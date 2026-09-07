import { chromium } from 'playwright';
const S = process.argv[2];
const browser = await chromium.launch();
for (const w of [1440, 390]) {
  const page = await browser.newPage({ viewport: { width: w, height: w === 390 ? 844 : 900 }, deviceScaleFactor: w === 390 ? 2 : 1 });
  await page.goto('https://www.krystinestlaurent.ca/politique-de-confidentialite', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  const cookie = page.getByRole('button', { name: /J'accepte/i });
  if (await cookie.count()) await cookie.first().click().catch(() => {});
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${S}/politique-${w}.png`, fullPage: true });
  if (w === 1440) {
    console.log(await page.evaluate(() => {
      const h1 = document.querySelector('h1'); const main = document.querySelector('main') || document.body;
      const p = main.querySelector('p');
      const cs = p ? getComputedStyle(p) : null;
      const bg = (el) => { while (el) { const b = getComputedStyle(el).backgroundColor; if (b && b !== 'rgba(0, 0, 0, 0)') return b; el = el.parentElement; } return 'aucun'; };
      return { h1: h1?.textContent?.trim().slice(0, 80), pColor: cs?.color, pBg: p ? bg(p) : null, textLen: main.innerText.length, hauteur: document.body.scrollHeight };
    }));
  }
  await page.close();
}
await browser.close();
