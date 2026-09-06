import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport:{width:1440,height:900}, deviceScaleFactor:2 })).newPage();
await p.goto('http://localhost:5302/demo-skins?skin=or-pur',{waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,900));
const bt = p.getByRole('button', { name: /Acheter des niskas/ }).first();
await bt.hover();
await new Promise(r=>setTimeout(r,300));
console.log('largeur bouton', await bt.evaluate(e=>e.getBoundingClientRect().width));
for (const pos of [70, 50, 30]) {
  await p.evaluate((v)=>{const s=document.createElement('style');s.textContent=`.skin-or-pur .bg-\\[\\#BA7B39\\]:hover{animation:none!important;background-position:${v}% 0!important}`;document.head.appendChild(s);}, pos);
  await new Promise(r=>setTimeout(r,250));
  await bt.screenshot({ path: `scripts/qa/out/diagbh-${pos}.png` });
}
await b.close();
console.log('ok');
