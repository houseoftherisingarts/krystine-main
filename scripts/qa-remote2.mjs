import { chromium } from 'playwright';
const OUT='/private/tmp/claude-501/-Users-lesalondesinconnus/36a6d2d7-cf1c-407c-9878-34afadc9f1d1/scratchpad';
const BASE='https://krystinestlaurent-87566--approbation-v2-79zccagd.web.app';
const b=await chromium.launch();
// medias TV photo
{ const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(BASE+'/medias',{waitUntil:'load',timeout:45000}); await p.waitForTimeout(6000);
  await p.evaluate(()=>{const el=document.getElementById('tv'); if(el) el.scrollIntoView();}); await p.waitForTimeout(1500);
  const img=await p.evaluate(()=>{const i=document.querySelector('#tv img'); return i?{w:i.naturalWidth,h:i.naturalHeight,src:i.currentSrc.split('/').pop()}:null;});
  await p.screenshot({path:`${OUT}/remote-tv.png`});
  console.log('medias /tv img=',JSON.stringify(img),'errors=',errs.length); await p.close(); }
// home errors
{ const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(BASE+'/accueil',{waitUntil:'load',timeout:45000}); await p.waitForTimeout(4000);
  for(let i=1;i<=4;i++){ await p.evaluate(y=>scrollTo(0,y),i*800); await p.waitForTimeout(400); }
  const dust=await p.evaluate(()=>{const c=document.getElementById('dust');return c?c.width>0:false;});
  console.log('home dust=',dust,'errors=',errs.length, errs.slice(0,3).join(' | ')); await p.close(); }
await b.close();
