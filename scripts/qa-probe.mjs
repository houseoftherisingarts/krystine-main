import { chromium } from 'playwright';
const b = await chromium.launch();
const page = await (await b.newContext({ viewport:{width:1440,height:900} })).newPage();
const errs=[]; page.on('pageerror',e=>errs.push('PE:'+e.message)); page.on('console',m=>{if(m.type()==='error')errs.push('CE:'+m.text().slice(0,160));});
await page.goto('http://localhost:3000/krystine',{waitUntil:'load',timeout:30000}).catch(e=>errs.push('GOTO '+e.message));
await page.waitForTimeout(2500);
const info = await page.evaluate(()=>{
  const hero = document.querySelector('[data-hero]');
  const h1 = document.querySelector('[data-hero] h1, h1');
  const cs = h1 ? getComputedStyle(h1) : null;
  return {
    heroExists: !!hero,
    heroText: hero ? hero.innerText.slice(0,120) : null,
    h1Text: h1 ? h1.innerText.slice(0,80) : null,
    h1opacity: cs ? cs.opacity : null,
    h1visibility: cs ? cs.visibility : null,
    bodyTextLen: document.body.innerText.trim().length,
  };
});
console.log(JSON.stringify(info,null,2));
console.log('errors='+errs.length+' '+errs.slice(0,6).join(' | '));
await b.close();
