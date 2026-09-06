import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport:{width:1440,height:900}, deviceScaleFactor:2 })).newPage();
await p.goto('http://localhost:5302/demo-skins?skin=or-pur',{waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,1000));
console.log(await p.evaluate(()=>{
  const el = [...document.querySelectorAll('button')].find(b=>/Acheter des niskas/.test(b.textContent||''));
  const c = getComputedStyle(el);
  return { color: c.color, bg: c.backgroundColor, img: c.backgroundImage.slice(0,70) };
}));
await p.getByRole('button',{name:/Acheter des niskas/}).first().screenshot({ path:'scripts/qa/out/zoom-orpur-repos.png' });
await b.close();
