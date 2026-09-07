import { chromium } from 'playwright';
const OUT = process.env.OUT;
const b = await chromium.launch();
for (const [w, h, nom] of [[1440, 900, '1440'], [390, 844, '390']]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })).newPage();
  await p.goto('http://localhost:5199/demo-skins?skin=verifie', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/demo-verifie-${nom}.png`, fullPage: nom === '390' });
}
await b.close();
console.log('ok');
