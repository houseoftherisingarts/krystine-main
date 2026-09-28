import { chromium } from 'playwright';
const b = await chromium.launch();
for (const w of [1280, 1366, 1440, 1536, 1700, 1920]) {
  const p = await b.newPage({ viewport: { width: w, height: 800 } });
  await p.goto('http://localhost:5199/conferenciere', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
  const r = await p.evaluate(() => { const els=[...document.querySelectorAll('.bouton-compte')].filter(e=>e.getBoundingClientRect().top<100 && getComputedStyle(e).display!=='none'); const lang=[...document.querySelectorAll('button')].find(e=>/langue|language/i.test(e.getAttribute('aria-label')||'')); return { btn: els.map(e=>Math.round(e.getBoundingClientRect().right)+' '+e.textContent.trim()), lastRight: Math.max(...[...document.querySelectorAll('nav *, header *')].filter(e=>e.getBoundingClientRect().top<80&&e.getBoundingClientRect().width>0).map(e=>Math.round(e.getBoundingClientRect().right))) }; });
  console.log(w, JSON.stringify(r));
  if ([1280,1440,1920].includes(w)) await p.screenshot({ path: `/tmp/claude-501/nav-${w}.png`, clip: { x: 0, y: 0, width: w, height: 80 } });
  await p.close();
}
await b.close();
