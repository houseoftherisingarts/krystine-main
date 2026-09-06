import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport:{width:1440,height:900}, deviceScaleFactor:1 })).newPage();
const fps = () => p.evaluate(()=>new Promise(res=>{let n=0;const t0=performance.now();const t=()=>{n++;performance.now()-t0<2000?requestAnimationFrame(t):res(Math.round(n*1000/(performance.now()-t0)));};requestAnimationFrame(t);}));
const css = (t) => p.evaluate((x)=>{const s=document.createElement('style');s.textContent=x;document.head.appendChild(s);}, t);
const essai = async (skin, etapes) => {
  await p.goto(`http://localhost:5302/demo-skins?skin=${skin}`,{waitUntil:'domcontentloaded'});
  await new Promise(r=>setTimeout(r,1200));
  console.log(skin, 'base', await fps());
  for (const [nom, regle] of etapes) {
    await css(regle);
    await new Promise(r=>setTimeout(r,600));
    console.log(' ', nom, await fps());
  }
};
await essai('or-pur', [
  ['canvas translateZ', '.motif-toile{transform:translateZ(0);will-change:transform}'],
  ['panneaux sans backdrop', '.backdrop-blur-md{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}'],
]);
await essai('lotus', [
  ['panneaux sans backdrop', '.backdrop-blur-md{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}'],
  ['voile promu', '.motif-voile{will-change:transform,opacity}'],
]);
await essai('ocean', [
  ['panneaux sans backdrop', '.backdrop-blur-md{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}'],
]);
await b.close();
