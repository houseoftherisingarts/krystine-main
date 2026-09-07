import { chromium } from 'playwright';
const BASE = 'http://localhost:3032';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', e => console.log('[pageerror]', e.message));

const url = '/foyer';
const match = 'Plus on nous montre, moins on voit.';
const newText = 'Plus on nous montre, moins on voit (texte de vérification).';

await page.goto(`${BASE}${url}?unlock=Alexisthebest2121!`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1400);
await page.goto(`${BASE}${url}?edit=1`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1800);

let loc = page.locator('h2', { hasText: match }).first();
await loc.scrollIntoViewIfNeeded(); await page.waitForTimeout(400);
let handle = await loc.elementHandle();
await handle.click(); await page.waitForTimeout(250);
await page.keyboard.press('Meta+A'); await page.waitForTimeout(120);
await page.keyboard.type(newText, { delay: 12 }); await page.waitForTimeout(150);
await page.keyboard.press('Enter'); await page.waitForTimeout(600);
console.log('round1 pending:', await page.evaluate(() => sessionStorage.getItem('inspirata.editMode.pending')));

let btn = page.locator('button', { hasText: /^Publier/ }).first();
console.log('round1 btn disabled:', await btn.getAttribute('disabled'), 'text:', (await btn.textContent()).trim());
await btn.click(); await page.waitForTimeout(1200);
console.log('round1 pending AFTER publish:', await page.evaluate(() => sessionStorage.getItem('inspirata.editMode.pending')));
console.log('round1 localOverridesDoc AFTER publish:', await page.evaluate(() => localStorage.getItem('__localOverridesDoc')));

await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
console.log('after reload no-edit, count newText:', await page.locator('h2', { hasText: newText }).count());
console.log('isAdmin/editMode url params check - devAdmin flag:', await page.evaluate(() => localStorage.getItem('__devAdmin')));

// ROUND 2 : revert
await page.goto(`${BASE}${url}?edit=1`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1800);
console.log('round2: __devAdmin still set?', await page.evaluate(() => localStorage.getItem('__devAdmin')));
console.log('round2: count h2 with newText before interacting:', await page.locator('h2', { hasText: newText }).count());

loc = page.locator('h2', { hasText: newText }).first();
await loc.scrollIntoViewIfNeeded(); await page.waitForTimeout(400);
handle = await loc.elementHandle();
console.log('round2: handle found?', !!handle);
console.log('round2: classes on handle:', await handle.evaluate(el => el.className));
await handle.click(); await page.waitForTimeout(250);
console.log('round2: isContentEditable after click:', await handle.evaluate(el => el.isContentEditable));
console.log('round2: activeElement tag:', await page.evaluate(() => document.activeElement?.tagName));
await page.keyboard.press('Meta+A'); await page.waitForTimeout(120);
const selAfterA = await page.evaluate(() => window.getSelection()?.toString());
console.log('round2: selection after Meta+A:', JSON.stringify(selAfterA?.slice(0,60)));
await page.keyboard.type(match, { delay: 12 }); await page.waitForTimeout(150);
console.log('round2: text after typing:', await handle.evaluate(el => el.textContent));
await page.keyboard.press('Enter'); await page.waitForTimeout(600);
console.log('round2: isContentEditable after Enter:', await handle.evaluate(el => el.isContentEditable));
console.log('round2: text after Enter:', await handle.evaluate(el => el.textContent));
console.log('round2 pending sessionStorage:', await page.evaluate(() => sessionStorage.getItem('inspirata.editMode.pending')));
console.log('round2: editOriginal dataset:', await handle.evaluate(el => el.dataset.editOriginal));

btn = page.locator('button', { hasText: /^Publier/ }).first();
console.log('round2 btn count:', await btn.count());
console.log('round2 btn disabled:', await btn.getAttribute('disabled'), 'text:', (await btn.textContent()).trim());

await browser.close();
