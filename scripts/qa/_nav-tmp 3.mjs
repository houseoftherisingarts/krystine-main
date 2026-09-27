import { chromium } from 'playwright';
const D='/private/tmp/claude-501/-Users-ksl-Documents-Inspira-Nature/b017b790-4b18-41f2-9360-2ed138f954f9/scratchpad/apres';
const b = await chromium.launch();
for (const w of [1440,1300,1180]) {
 const p=await b.newPage({viewport:{width:w,height:800}}); await p.goto('http://localhost:5199/accueil/',{waitUntil:'load'}); await p.waitForTimeout(2000);
 await p.screenshot({path:`${D}/nav2-${w}.jpg`,quality:60,clip:{x:0,y:0,width:w,height:110}});
 if(w===1180){ await p.click('#mnavBtn'); await p.waitForTimeout(900); await p.screenshot({path:`${D}/nav2-ouvert.jpg`,quality:55}); }
 await p.close();
}
await b.close();
