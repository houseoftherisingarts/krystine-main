import { chromium } from 'playwright';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/cf4d63db-047d-4841-bf85-9cd29643fbb5/scratchpad';
const BASE='https://krystinestlaurent-87566--apercu-krystine-5ix7leua.web.app';
const b = await chromium.launch();
const errs=[];
async function run(path,name){
  const page = await (await b.newContext({ viewport:{width:1440,height:900} })).newPage();
  page.on('pageerror',e=>errs.push(name+' PE:'+e.message));
  await page.goto(BASE+path,{waitUntil:'load',timeout:40000}).catch(e=>errs.push(name+' GOTO '+e.message));
  await page.waitForTimeout(4500);
  await page.screenshot({ path:`${OUT}/live-${name}.png` });
  const nav = await page.evaluate(()=>document.querySelectorAll('nav').length);
  console.log(`${name}: <nav>=${nav}`);
  await page.close();
}
await run('/origine','origine');
await run('/krystine','krystine');
console.log('PE='+errs.length+(errs.length?' | '+errs.slice(0,4).join(' | '):''));
await b.close();
