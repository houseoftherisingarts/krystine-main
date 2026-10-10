import { chromium, webkit } from 'playwright';
for (const [eng,vp,d] of [[chromium,{width:1440,height:900},'d'],[chromium,{width:1280,height:720},'l'],[webkit,{width:390,height:844},'m']]) { const b=await eng.launch(); const p=await b.newPage({viewport:vp});
await p.goto('http://localhost:5199/quiz',{waitUntil:'load'}); await p.waitForTimeout(3000);
await p.getByRole('button',{name:/accepte/i}).click().catch(()=>{}); await p.waitForTimeout(500);
await p.screenshot({path:`${process.argv[2]}/qh-${d}.png`,fullPage:false});
const y=await p.evaluate(()=>{const b=[...document.querySelectorAll('a,button')].find(e=>/Commencer le quiz/i.test(e.textContent||'')); return b?Math.round(b.getBoundingClientRect().top):null}); console.log(d,'bouton Commencer à y=',y);
if(d==='m'){ await p.evaluate(()=>scrollTo(0,700)); await p.waitForTimeout(800); await p.screenshot({path:`${process.argv[2]}/qh-m2.png`}); }
await b.close(); }
