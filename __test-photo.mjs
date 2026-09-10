import { chromium } from 'playwright';

const FAKE_AUTH_MODULE = `
export function getAuth() { return {}; }
export function onAuthStateChanged(auth, cb) { setTimeout(() => cb({ email: 'houseoftherisingarts@gmail.com' }), 50); return () => {}; }
`;
const dir = '/private/tmp/claude-501/-Users-lesalondesinconnus/b888b2c7-f098-4036-8a5d-c76540f05b53/scratchpad/shots';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (msg) => { if (msg.type() === 'error' && !/Cloud Firestore backend/.test(msg.text())) errors.push('console.error: ' + msg.text()); });
await page.route('**/firebase-auth.js', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_AUTH_MODULE }));
await page.goto('http://localhost:8899/accueil/', { waitUntil: 'load' });
await page.waitForSelector('.cs-pencil', { state: 'visible' });
await page.click('.cs-pencil');
await page.waitForTimeout(300);

const cadreCible = await page.evaluate(() => {
  const els = Array.from(document.querySelectorAll('[data-cadre]'));
  const visible = els.find((el) => el.getClientRects().length > 0 && el.tagName === 'IMG');
  return visible ? visible.getAttribute('data-cadre') : (els[0] ? els[0].getAttribute('data-cadre') : null);
});
console.log('cadreCible', cadreCible);
await page.click(`[data-cadre="${CSS.escape ? cadreCible : cadreCible}"]`).catch(async () => {
  // data-cadre peut contenir des caractères spéciaux (URL) : cliquer via un handle JS à la place.
  await page.evaluate((cle) => {
    const el = Array.from(document.querySelectorAll('[data-cadre]')).find((e) => e.getAttribute('data-cadre') === cle);
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: el.getBoundingClientRect().left + 10, clientY: el.getBoundingClientRect().top + 10 }));
  }, cadreCible);
});
await page.waitForTimeout(300);
const modalPhotoVisible = await page.evaluate(() => !document.querySelectorAll('.cs-modal')[1].hidden);
await page.screenshot({ path: `${dir}/admin-photo-1-modal.png` });

// Zoom
await page.evaluate(() => {
  const input = document.querySelector('.cs-modal input[type=range]');
  input.value = '2';
  input.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(200);
const styleApresZoom = await page.evaluate((cle) => {
  const el = Array.from(document.querySelectorAll('[data-cadre]')).find((e) => e.getAttribute('data-cadre') === cle);
  return { objectPosition: el.style.objectPosition, scale: el.style.scale, backgroundPosition: el.style.backgroundPosition, backgroundSize: el.style.backgroundSize };
}, cadreCible);
await page.screenshot({ path: `${dir}/admin-photo-2-zoom.png` });

const compteur = await page.evaluate(() => document.querySelector('.cs-count').textContent);

console.log(JSON.stringify({ errors, modalPhotoVisible, styleApresZoom, compteur }, null, 2));
await browser.close();
if (errors.length || !modalPhotoVisible) process.exit(1);
