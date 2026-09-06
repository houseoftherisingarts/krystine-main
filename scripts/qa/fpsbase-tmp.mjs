import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport:{width:1440,height:900}, deviceScaleFactor:1 })).newPage();
for (const s of ['nuit','ocean','or-pur']) {
  await p.goto(`http://localhost:5302/demo-skins?skin=${s}`, { waitUntil:'domcontentloaded' });
  await new Promise(r=>setTimeout(r,1500));
  const f = await p.evaluate(()=>new Promise(res=>{let n=0;const t0=performance.now();const t=()=>{n++;performance.now()-t0<2000?requestAnimationFrame(t):res(Math.round(n*1000/(performance.now()-t0)));};requestAnimationFrame(t);}));
  console.log(s, f);
}
await b.close();
