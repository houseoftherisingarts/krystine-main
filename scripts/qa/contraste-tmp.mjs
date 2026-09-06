import { chromium } from 'playwright';
const lum = (r,g,b)=>{const f=v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4;};return .2126*f(r)+.7152*f(g)+.0722*f(b);};
const ratio=(a,b)=>{const L1=lum(...a),L2=lum(...b);return ((Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05)).toFixed(2);};
const rgb=(s)=>s.match(/\d+/g).slice(0,3).map(Number);
const b = await chromium.launch();
const p = await (await b.newContext({ viewport:{width:1440,height:900} })).newPage();
for (const s of ['ocean','encre','lotus','or-pur']) {
  await p.goto(`http://localhost:5302/demo-skins?skin=${s}`,{waitUntil:'domcontentloaded'});
  await new Promise(r=>setTimeout(r,900));
  const repos = await p.evaluate(()=>{const el=[...document.querySelectorAll('button')].find(b=>/Acheter des niskas/.test(b.textContent||''));const c=getComputedStyle(el);return [c.color,c.backgroundColor];});
  await p.getByRole('button',{name:/Acheter des niskas/}).first().hover();
  await new Promise(r=>setTimeout(r,300));
  const surv = await p.evaluate(()=>{const el=[...document.querySelectorAll('button')].find(b=>/Acheter des niskas/.test(b.textContent||''));const c=getComputedStyle(el);return [c.color,c.backgroundColor];});
  console.log(s.padEnd(7), 'repos', repos[0], 'sur', repos[1], '=', ratio(rgb(repos[0]),rgb(repos[1])), '| survol', surv[1], '=', ratio(rgb(surv[0]),rgb(surv[1])));
}
await b.close();
