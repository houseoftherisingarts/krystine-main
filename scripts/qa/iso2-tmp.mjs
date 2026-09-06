import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport:{width:1440,height:900}, deviceScaleFactor:1 })).newPage();
const fps = () => p.evaluate(()=>new Promise(res=>{let n=0;const t0=performance.now();const t=()=>{n++;performance.now()-t0<2000?requestAnimationFrame(t):res(Math.round(n*1000/(performance.now()-t0)));};requestAnimationFrame(t);}));
const css = (txt) => p.evaluate((t)=>{const s=document.createElement('style');s.textContent=t;document.head.appendChild(s);}, txt);

// OCEAN : houle seule, voile seul
await p.goto('http://localhost:5302/demo-skins?skin=ocean',{waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,1200));
console.log('ocean tout', await fps());
await p.evaluate(()=>document.querySelector('.motif-toile')?.remove());
await css('.skin-ocean .motif-voile{animation:none!important}');
console.log('ocean sans toile, voile figé', await fps());
await css('.skin-ocean .bg-white\\/55::before,.skin-ocean .bg-white\\/45::before{animation:none!important}');
console.log('ocean + houle figée', await fps());

// OR-PUR : canvas seul
await p.goto('http://localhost:5302/demo-skins?skin=or-pur',{waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,1200));
console.log('or-pur tout', await fps());
await p.evaluate(()=>{const c=document.querySelector('.motif-toile'); if(c) c.style.display='none';});
console.log('or-pur toile cachée', await fps());

// LOTUS : voile promu
await p.goto('http://localhost:5302/demo-skins?skin=lotus',{waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,1200));
console.log('lotus tout', await fps());
await css('.skin-lotus .motif-voile{will-change:transform;}');
await new Promise(r=>setTimeout(r,500));
console.log('lotus voile promu', await fps());
await b.close();
