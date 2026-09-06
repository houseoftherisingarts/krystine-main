import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport:{width:1440,height:900}, deviceScaleFactor:2 })).newPage();
const css = (t) => p.evaluate((x)=>{const s=document.createElement('style');s.textContent=x;document.head.appendChild(s);}, t);

await p.goto('http://localhost:5302/demo-skins?skin=encre',{waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,900));
for (const d of [5.3, 5.8, 6.4, 7.2]) {
  await css(`.skin-encre .font-serif.text-7xl{animation-delay:-${d}s!important;animation-play-state:paused!important}`);
  await new Promise(r=>setTimeout(r,300));
  await p.locator('.font-serif.text-7xl').first().screenshot({ path: `scripts/qa/out/zoom-encre-${d}.png` });
}
await p.goto('http://localhost:5302/demo-skins?skin=or-pur',{waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,900));
const bouton = p.getByRole('button', { name: /Acheter des niskas/ }).first();
await bouton.hover();
for (const d of [0.35, 0.5, 0.65]) {
  await css(`.skin-or-pur .bg-\\[\\#BA7B39\\]:hover{animation-delay:-${d}s!important;animation-play-state:paused!important}`);
  await new Promise(r=>setTimeout(r,300));
  await bouton.screenshot({ path: `scripts/qa/out/zoom-bouton-${d}.png` });
}
await b.close();
console.log('ok');
