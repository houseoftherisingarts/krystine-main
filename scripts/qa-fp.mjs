import { chromium } from 'playwright';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/cf4d63db-047d-4841-bf85-9cd29643fbb5/scratchpad';
const b = await chromium.launch();
const errs=[];
async function run(path,name){
  const page = await (await b.newContext({ viewport:{width:1440,height:900} })).newPage();
  page.on('pageerror',e=>errs.push(name+' PE:'+e.message));
  await page.goto('http://localhost:3000'+path,{waitUntil:'load',timeout:30000}).catch(e=>errs.push(name+' GOTO '+e.message));
  await page.waitForTimeout(7000);
  await page.screenshot({ path:`${OUT}/fp-${name}.png` });
  const txt = await page.evaluate(()=>document.body.innerText.replace(/\s+/g,' ').slice(0,140));
  console.log(name+': '+txt);
  await page.close();
}
await run('/formations','formations');
await run('/podcast','podcast');
console.log('PE='+errs.length+(errs.length?' | '+errs.slice(0,4).join(' | '):''));
await b.close();
