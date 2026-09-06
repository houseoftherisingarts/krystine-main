import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport:{width:1440,height:900}, deviceScaleFactor:1 })).newPage();
const fps = () => p.evaluate(()=>new Promise(res=>{let n=0;const t0=performance.now();const t=()=>{n++;performance.now()-t0<2000?requestAnimationFrame(t):res(Math.round(n*1000/(performance.now()-t0)));};requestAnimationFrame(t);}));
for (const s of ['ocean','or-pur','lotus','encre']) {
  await p.goto(`http://localhost:5302/demo-skins?skin=${s}`, { waitUntil:'domcontentloaded' });
  await new Promise(r=>setTimeout(r,1200));
  const tout = await fps();
  await p.evaluate(()=>document.querySelector('.motif-toile')?.remove());
  await new Promise(r=>setTimeout(r,400));
  const sansToile = await fps();
  await p.evaluate(()=>document.querySelector('.motif-voile')?.remove());
  await new Promise(r=>setTimeout(r,400));
  const sansRien = await fps();
  console.log(s, 'tout', tout, '| sans toile', sansToile, '| sans toile+voile', sansRien);
}
await b.close();
