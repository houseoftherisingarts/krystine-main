import { chromium } from 'playwright';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/cf4d63db-047d-4841-bf85-9cd29643fbb5/scratchpad';
const b = await chromium.launch();
const errs = [];
async function run(w,h,name,scroll){
  const page = await (await b.newContext({ viewport:{width:w,height:h} })).newPage();
  page.on('pageerror', e => errs.push(name+' PE: '+e.message));
  page.on('console', m => { if (m.type()==='error') errs.push(name+' CE: '+m.text().slice(0,140)); });
  await page.goto('http://localhost:3000/origine', { waitUntil:'load', timeout:30000 }).catch(e=>errs.push('GOTO '+e.message));
  await page.waitForTimeout(2200);
  await page.screenshot({ path:`${OUT}/oh-${name}.png` });
  if(scroll){ await page.evaluate(()=>scrollTo(0,300)); await page.waitForTimeout(700); await page.screenshot({ path:`${OUT}/oh-${name}-scroll.png` }); }
  await page.close();
}
await run(1440,900,'desktop',true);
await run(390,844,'mobile',false);
console.log('errors='+errs.length+' '+errs.slice(0,5).join(' | '));
await b.close();
