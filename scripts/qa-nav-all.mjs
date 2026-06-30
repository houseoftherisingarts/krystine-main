import { chromium } from 'playwright';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/cf4d63db-047d-4841-bf85-9cd29643fbb5/scratchpad';
const b = await chromium.launch();
const errs=[];
async function run(path,name){
  const page = await (await b.newContext({ viewport:{width:1440,height:900} })).newPage();
  page.on('pageerror',e=>errs.push(name+' PE:'+e.message)); page.on('console',m=>{if(m.type()==='error')errs.push(name+' CE:'+m.text().slice(0,140));});
  await page.goto('http://localhost:3000'+path,{waitUntil:'load',timeout:30000}).catch(e=>errs.push(name+' GOTO '+e.message));
  await page.waitForTimeout(4000);
  const navCount = await page.evaluate(()=>document.querySelectorAll('nav').length);
  const globalNav = await page.evaluate(()=>!!Array.from(document.querySelectorAll('a')).find(a=>/\/\?splash=1/.test(a.getAttribute('href')||'')));
  await page.screenshot({ path:`${OUT}/all-${name}.png` });
  console.log(`${name.padEnd(12)} <nav>=${navCount}  globalNav=${globalNav}`);
  await page.close();
}
for (const [p,n] of [['/krystine','krystine'],['/medias','medias'],['/formations','formations'],['/podcast','podcast'],['/origine','origine']]) await run(p,n);
console.log('ERREURS='+errs.length+(errs.length?(' | '+errs.slice(0,8).join(' | ')):''));
await b.close();
