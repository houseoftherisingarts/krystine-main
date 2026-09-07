import { chromium } from 'playwright';
const BASE = 'http://localhost:3032';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', e => console.log('[pageerror]', e.message));

const url = '/formations';
const match = 'Le programme Vata se suit dès maintenant. Les autres reviennent une à une.';
const newText = 'Le programme Vata se suit dès maintenant (texte de vérification).';

await page.goto(`${BASE}${url}?unlock=Alexisthebest2121!`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1400);
await page.goto(`${BASE}${url}?edit=1`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1800);

console.log('count h2 matching:', await page.locator('h2', { hasText: match }).count());
let loc = page.locator('h2', { hasText: match }).first();
await loc.scrollIntoViewIfNeeded(); await page.waitForTimeout(400);
let handle = await loc.elementHandle();
console.log('key would be (dataset before click):', await handle.evaluate(el => ({original: el.dataset.editOriginal, applied: el.dataset.editApplied})));
await handle.click(); await page.waitForTimeout(250);
await page.keyboard.press('Meta+A'); await page.waitForTimeout(120);
await page.keyboard.type(newText, { delay: 12 }); await page.waitForTimeout(150);
await page.keyboard.press('Enter'); await page.waitForTimeout(600);
console.log('pending after enter:', await page.evaluate(() => sessionStorage.getItem('inspirata.editMode.pending')));

const btn = page.locator('button', { hasText: /^Publier/ }).first();
console.log('btn text:', (await btn.textContent()).trim());
await btn.click(); await page.waitForTimeout(1200);
console.log('pending after publish:', await page.evaluate(() => sessionStorage.getItem('inspirata.editMode.pending')));
console.log('localOverridesDoc after publish:', await page.evaluate(() => localStorage.getItem('__localOverridesDoc')));

await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
console.log('after reload no-edit: __localOverridesDoc:', await page.evaluate(() => localStorage.getItem('__localOverridesDoc')));
console.log('after reload no-edit: count h2 with newText:', await page.locator('h2', { hasText: newText }).count());
console.log('after reload no-edit: count h2 with match (still original?):', await page.locator('h2', { hasText: match }).count());
const allH2 = await page.locator('h2').allTextContents();
console.log('all h2 texts on page:', JSON.stringify(allH2, null, 1));

await browser.close();
