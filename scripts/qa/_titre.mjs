import { chromium } from 'playwright';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
await p.goto('http://localhost:5199/accueil/index.html',{waitUntil:'networkidle'}).catch(()=>{});
const h=p.locator('#film h2'); await h.scrollIntoViewIfNeeded(); await p.waitForTimeout(2500);
await p.evaluate(()=>document.querySelectorAll('#film .reveal').forEach(e=>e.classList.add('in','vis','on')));
await p.waitForTimeout(800);
await p.locator('#film .copy').screenshot({path:'/private/tmp/claude-501/-Users-ksl-Documents-Inspira-Nature/e5a38fa2-e2b8-4726-b3a3-ab51549a9e1a/scratchpad/titre-390.png'});
await b.close();
