import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport:{width:1440,height:900}, deviceScaleFactor:2 })).newPage();
await p.goto('http://localhost:5302/demo-skins?skin=encre',{waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,900));
const l = p.locator('.font-serif.text-7xl').first();
console.log('largeur élément', await l.evaluate(e=>e.getBoundingClientRect().width), '| largeur du texte', await l.evaluate(e=>{const r=document.createRange();r.selectNodeContents(e);return r.getBoundingClientRect().width;}));
for (const pos of [110, 95, 80, 65]) {
  await p.evaluate((v)=>{const s=document.createElement('style');s.textContent=`.skin-encre .font-serif.text-7xl{animation:none!important;background-position:${v}% 0!important}`;document.head.appendChild(s);}, pos);
  await new Promise(r=>setTimeout(r,250));
  await l.screenshot({ path: `scripts/qa/out/diag-${pos}.png` });
}
await b.close();
console.log('ok');
