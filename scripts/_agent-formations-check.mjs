import { chromium } from 'playwright';
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 1000 } });
const p = await c.newPage();
await p.goto('http://localhost:3033/formations', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1500);
// scroll down progressively to trigger whileInView, like a real visitor
for (let y = 0; y < 6000; y += 400) {
  await p.evaluate((yy) => window.scrollTo(0, yy), y);
  await p.waitForTimeout(150);
}
await p.waitForTimeout(500);
await p.screenshot({ path: 'scripts/qa/shots/formations-1440-scrolled.png', fullPage: true });
await b.close();
