import { chromium } from 'playwright';
const b = await chromium.launch();
for (const w of [1280, 1440, 1536, 1920, 1024, 390]) {
  const p = await b.newPage({ viewport: { width: w, height: 800 } });
  await p.goto('http://localhost:5199/conferenciere', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
  const r = await p.evaluate(() => { const els=[...document.querySelectorAll('header .bouton-compte')].filter(e=>getComputedStyle(e).display!=='none'); const bb=els[0]?.getBoundingClientRect(); return { btnRight: bb && Math.round(bb.right), txt: els[0]?.textContent?.trim() }; });
  console.log(w, JSON.stringify(r));
  if (w===1440||w===1280) await p.screenshot({ path: `/tmp/claude-501/nav-${w}.png`, clip: { x: 0, y: 0, width: w, height: 80 } });
  await p.close();
}
await b.close();
