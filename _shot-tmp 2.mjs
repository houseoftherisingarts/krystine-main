import { chromium, devices } from 'playwright';
const b = await chromium.launch();
for (const [url,sel,n] of [['/accueil/','#medias-vus','acc'],['/medias','section[aria-label="Vue et entendue à"]','med']]) for (const [o,d] of [[{viewport:{width:1440,height:900}},'d'],[devices['iPhone 13'],'m']]) {
 const ctx=await b.newContext(o); await ctx.route('**/medias/logos/**', async r=>{ await new Promise(x=>setTimeout(x,1500)); r.continue(); });
 const p=await ctx.newPage(); await p.goto('http://localhost:5199'+url,{waitUntil:'domcontentloaded'});
 const band=p.locator(sel).first(); await band.scrollIntoViewIfNeeded();
 let worst=0;
 for (let t=0;t<8;t++){ await p.waitForTimeout(500);
  const ov=await band.evaluate(s=>{const it=[...s.querySelectorAll('li, .wm')].filter(e=>!e.closest('[aria-hidden]')); let o=0; for(let i=1;i<it.length;i++){const a=it[i-1].getBoundingClientRect(),b=it[i].getBoundingClientRect(); o=Math.max(o,a.right-b.left);} return o;}); worst=Math.max(worst,ov);}
 await band.screenshot({path:`${process.argv[2]}/ov-${n}-${d}.png`});
 console.log(n,d,'chevauchement max px',Math.round(worst));
}
await b.close();
