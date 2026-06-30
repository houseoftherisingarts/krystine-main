import { chromium } from 'playwright';
const OUT='/private/tmp/claude-501/-Users-lesalondesinconnus/36a6d2d7-cf1c-407c-9878-34afadc9f1d1/scratchpad';
const b=await chromium.launch();const p=await b.newPage();
const errs=[];p.on('pageerror',e=>errs.push('PE '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push('CE '+m.text().slice(0,160));});
await p.goto('http://localhost:3000/medias',{waitUntil:'networkidle',timeout:45000}).catch(e=>errs.push('GOTO '+e.message));
await p.waitForTimeout(8000);
const h=await p.evaluate(()=>document.body.scrollHeight);
await p.screenshot({path:`${OUT}/medias-probe.png`,fullPage:false});
// scroll to TV section approx
await p.evaluate(()=>{const el=document.getElementById('tv'); if(el) el.scrollIntoView();});
await p.waitForTimeout(1500);
await p.screenshot({path:`${OUT}/medias-tv.png`});
console.log('height=',h,'errors=',errs.length, errs.slice(0,4).join(' | '));
await b.close();
