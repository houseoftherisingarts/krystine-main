import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:3011/compte', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3500);
console.log(await page.evaluate(() => {
  const header = document.querySelector('header') || document.querySelector('nav');
  const els = Array.from(header.querySelectorAll('button, a')).filter(e => e.getBoundingClientRect().width > 20 && e.getBoundingClientRect().top < 120);
  return els.map(e => { const r = e.getBoundingClientRect(); return { t: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 22), top: Math.round(r.top), h: Math.round(r.height), centre: Math.round(r.top + r.height / 2), cls: (e.className || '').toString().slice(0, 60) }; });
}));
await page.screenshot({ path: process.argv[2] + '/header.png', clip: { x: 900, y: 0, width: 540, height: 80 } });
await browser.close();
