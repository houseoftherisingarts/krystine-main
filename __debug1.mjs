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
const info = await page.evaluate(() => {
  const el = document.querySelector('[data-tx="0"]');
  return { tag: el && el.tagName, text: el && el.textContent, outer: el && el.outerHTML.slice(0,300) };
});
console.log(JSON.stringify(info, null, 2));

// 390 viewport pencil box debug
await browser.close();
const b2 = await chromium.launch();
const ctx2 = await b2.newContext({ viewport: { width: 390, height: 844 } });
const p2 = await ctx2.newPage();
await p2.route('**/firebase-auth.js', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_AUTH_MODULE }));
await p2.goto('http://localhost:8899/accueil/', { waitUntil: 'load' });
await p2.waitForSelector('.cs-pencil', { state: 'visible' });
const box = await p2.locator('.cs-pencil').boundingBox();
console.log('pencil box 390:', box);
console.log('viewport:', p2.viewportSize());
await b2.close();
