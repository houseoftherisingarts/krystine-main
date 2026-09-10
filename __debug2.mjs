import { chromium } from 'playwright';
const FAKE_AUTH_MODULE = `
export function getAuth() { return {}; }
export function onAuthStateChanged(auth, cb) { setTimeout(() => cb({ email: 'houseoftherisingarts@gmail.com' }), 50); return () => {}; }
`;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('console', m => console.log('PAGE:', m.type(), m.text()));
page.on('pageerror', e => console.log('PAGEERROR', e.message));
await page.route('**/firebase-auth.js', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_AUTH_MODULE }));
await page.goto('http://localhost:8899/accueil/', { waitUntil: 'load' });
await page.waitForSelector('.cs-pencil', { state: 'visible' });
await page.click('.cs-pencil');
await page.waitForTimeout(300);
await page.click('[data-tx="0"]');
await page.waitForTimeout(200);
console.log('modal hidden?', await page.evaluate(() => document.querySelectorAll('.cs-modal')[0].hidden));
console.log('textarea value before:', await page.evaluate(() => document.querySelector('.cs-textarea').value));
await page.fill('.cs-textarea', 'TEXTE DE TEST CRAYON');
console.log('textarea value after fill:', await page.evaluate(() => document.querySelector('.cs-textarea').value));
await page.click('.cs-apply');
await page.waitForTimeout(300);
const dump = await page.evaluate(() => ({
  logoHTML: document.querySelector('.logo').outerHTML,
  count: document.querySelector('.cs-count').textContent,
}));
console.log(JSON.stringify(dump, null, 2));
await browser.close();
