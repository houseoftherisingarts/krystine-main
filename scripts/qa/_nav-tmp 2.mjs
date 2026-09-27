import { chromium } from 'playwright';
const D='/private/tmp/claude-501/-Users-ksl-Documents-Inspira-Nature/b017b790-4b18-41f2-9360-2ed138f954f9/scratchpad/apres';
const b = await chromium.launch();
for (const w of [1440,1180]) for (const u of ['/accueil/','/medias']) {
 const p=await b.newPage({viewport:{width:w,height:800}}); await p.goto('http://localhost:5199'+u,{waitUntil:'load'}); await p.waitForTimeout(2500);
 const n=u==='/medias'?'m':'a'; await p.screenshot({path:`${D}/nav-${n}-${w}.jpg`,quality:60,clip:{x:0,y:0,width:w,height:110}});
 console.log(u,w, await p.evaluate(()=>{const a=[...document.querySelectorAll('a')].find(a=>a.innerText.trim().toUpperCase()==='EXPÉRIENCE ORIGINE 2'&&a.offsetParent);return a?Math.round(a.getBoundingClientRect().height):'absent'}));
 await p.close();
}
await b.close();
