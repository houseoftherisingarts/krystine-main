import { chromium } from 'playwright';
const FAKE_AUTH_MODULE = `
export function getAuth() { return {}; }
export function onAuthStateChanged(auth, cb) { setTimeout(() => cb({ email: 'houseoftherisingarts@gmail.com' }), 50); return () => {}; }
`;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.route('**/firebase-auth.js', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_AUTH_MODULE }));
await page.goto('http://localhost:8899/accueil/', { waitUntil: 'load' });
await page.waitForSelector('.cs-pencil', { state: 'visible' });
await page.click('.cs-pencil');
await page.waitForTimeout(300);
const cadreCible = await page.evaluate(() => {
  const els = Array.from(document.querySelectorAll('[data-cadre]'));
  const visible = els.find((el) => el.getClientRects().length > 0 && el.tagName === 'IMG');
  return visible ? visible.getAttribute('data-cadre') : null;
});
const rectAvant = await page.evaluate((cle) => {
  const el = Array.from(document.querySelectorAll('[data-cadre]')).find((e) => e.getAttribute('data-cadre') === cle);
  return el.getBoundingClientRect();
}, cadreCible);
console.log('rectAvant', rectAvant);
await page.evaluate((cle) => {
  const el = Array.from(document.querySelectorAll('[data-cadre]')).find((e) => e.getAttribute('data-cadre') === cle);
  const r = el.getBoundingClientRect();
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: r.left + 10, clientY: r.top + 10 }));
}, cadreCible);
await page.waitForTimeout(400);
const panelInfo = await page.evaluate(() => {
  const panel = document.querySelectorAll('.cs-modal')[1];
  const r = panel.getBoundingClientRect();
  return { top: panel.style.top, left: panel.style.left, rect: r, hidden: panel.hidden, innerHeight: window.innerHeight };
});
console.log(JSON.stringify(panelInfo, null, 2));
await browser.close();
