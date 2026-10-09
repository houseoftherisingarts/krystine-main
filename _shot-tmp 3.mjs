import { chromium, webkit } from 'playwright';
for (const [eng,vp,d] of [[chromium,{width:1440,height:900},'d'],[webkit,{width:390,height:844},'m']]) { const b=await eng.launch(); const p=await b.newPage({viewport:vp});
await p.goto('http://localhost:5199/quiz',{waitUntil:'load'}); await p.waitForTimeout(2500);
const h=p.getByText('L’Ayurveda, en une phrase'); await h.scrollIntoViewIfNeeded(); await p.mouse.wheel(0,200); await p.waitForTimeout(1500); await p.screenshot({path:`${process.argv[2]}/banniere-${d}.png`}); await b.close(); }
