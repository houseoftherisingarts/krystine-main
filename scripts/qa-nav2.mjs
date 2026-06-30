import { chromium } from 'playwright';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/cf4d63db-047d-4841-bf85-9cd29643fbb5/scratchpad';
const b = await chromium.launch();
const errs=[];
async function run(path,name){
  const page = await (await b.newContext({ viewport:{width:1440,height:900} })).newPage();
  page.on('pageerror',e=>errs.push(name+' PE:'+e.message)); page.on('console',m=>{if(m.type()==='error')errs.push(name+' CE:'+m.text().slice(0,140));});
  await page.goto('http://localhost:3000'+path,{waitUntil:'load',timeout:30000}).catch(e=>errs.push(name+' GOTO '+e.message));
  await page.waitForTimeout(4200);
  await page.screenshot({ path:`${OUT}/nav2-${name}.png` });
  await page.close();
}
await run('/krystine','krystine');
console.log('errors='+errs.length+' '+errs.slice(0,5).join(' | '));
await b.close();
