import { chromium } from 'playwright';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:800,height:800}});
await p.setContent('<video id=v src="file:///private/tmp/claude-501/-Users-ksl-Documents-Inspira-Nature/e5a38fa2-e2b8-4726-b3a3-ab51549a9e1a/scratchpad/pubv2/v.mp4" muted style="max-width:780px;max-height:780px"></video>');
await p.waitForFunction(()=>document.getElementById('v').readyState>=1);
const d=await p.evaluate(()=>{const v=document.getElementById('v');return [v.duration,v.videoWidth,v.videoHeight]});
console.log(JSON.stringify(d));
const n=16;
for(let i=0;i<n;i++){const t=(d[0]*(i+0.5))/n; await p.evaluate(t=>new Promise(r=>{const v=document.getElementById('v');v.onseeked=()=>r();v.currentTime=t;}),t); await p.waitForTimeout(150); await p.locator('#v').screenshot({path:'/private/tmp/claude-501/-Users-ksl-Documents-Inspira-Nature/e5a38fa2-e2b8-4726-b3a3-ab51549a9e1a/scratchpad/pubv2/f'+String(i).padStart(2,'0')+'.png'});}
await b.close();
