import { chromium } from 'playwright';
const OUT='/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/origine-refonte';
const b=await chromium.launch();
const p=await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://localhost:5199/origine',{waitUntil:'domcontentloaded'});
await p.waitForSelector('div.bg-cream section',{timeout:30000});
await p.addStyleTag({content:'html{scroll-behavior:auto !important}'});
await p.getByRole('button',{name:/non merci/i}).first().click({timeout:5000}).catch(()=>{});
await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(1200);
for (const [nom, idx] of [['cta',2],['cloture',10]]) {
  const y = await p.evaluate((i)=>{const r=document.querySelector('div.bg-cream').children[i];
    return window.scrollY + r.getBoundingClientRect().top;}, idx);
  await p.evaluate((yy)=>window.scrollTo(0,yy), y);
  await p.waitForTimeout(900);
  await p.screenshot({path:`${OUT}/x-${nom}.png`});
  console.log(nom, y);
}
await b.close();
