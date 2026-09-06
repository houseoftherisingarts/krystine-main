import { chromium } from 'playwright';
const out='/private/tmp/claude-501/-Users-lesalondesinconnus/e1cc376e-f932-4960-99aa-144a2161611f/scratchpad/';
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
for(const [n,vp,fr] of [['th-desk',{width:1440,height:900},false],['th-desk-fr',{width:1440,height:900},true],['th-mob',{width:390,height:844},true]]){
  const p=await b.newPage({viewport:vp}); await p.goto('http://localhost:4173/speaking/',{waitUntil:'load'}); await p.waitForTimeout(2200);
  if(fr){ await p.click('#langPill button[data-lang="fr"]'); await p.waitForTimeout(300); }
  await p.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';document.getElementById('themes').scrollIntoView();}); await p.waitForTimeout(1600);
  await p.screenshot({path:out+n+'-themes.png',fullPage:false});
  await p.evaluate(()=>document.getElementById('who').scrollIntoView()); await p.waitForTimeout(1500); await p.screenshot({path:out+n+'-who.png'});
  const l=await p.evaluate(()=>{const f=el=>{const r=el.getBoundingClientRect(); return Math.round(r.height/parseFloat(getComputedStyle(el).lineHeight));}; return {th:f(document.querySelector('#themes h2')), who:f(document.querySelector('#who h2'))};});
  console.log(n,JSON.stringify(l)); await p.close(); }
await b.close();
