import { chromium } from 'playwright';
const FAKE_AUTH_MODULE = `
export function getAuth() { return {}; }
export function onAuthStateChanged(auth, cb) { setTimeout(() => cb({ email: 'houseoftherisingarts@gmail.com' }), 50); return () => {}; }
`;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.route('**/firebase-auth.js', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_AUTH_MODULE }));
await page.goto('http://localhost:8899/accueil/', { waitUntil: 'load' });
await page.waitForSelector('.cs-pencil', { state: 'visible' });
const info = await page.evaluate(() => {
  const bar = document.querySelector('.cs-bar');
  const pencil = document.querySelector('.cs-pencil');
  const cs = getComputedStyle(bar);
  return {
    barRect: bar.getBoundingClientRect(),
    pencilRect: pencil.getBoundingClientRect(),
    barPosition: cs.position, barRight: cs.right, barTop: cs.top, barDisplay: cs.display,
    barWidth: cs.width,
    htmlWidth: document.documentElement.clientWidth,
    rootDataCrayonStyle: getComputedStyle(document.querySelector('[data-crayon]')).cssText.slice(0,200),
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
