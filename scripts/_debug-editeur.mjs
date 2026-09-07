import { chromium } from 'playwright';
const BASE = 'http://localhost:3032';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', e => console.log('[pageerror]', e.message));

await page.goto(`${BASE}/foyer?unlock=Alexisthebest2121!`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1400);
await page.goto(`${BASE}/foyer?edit=1`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1800);

const heading = page.locator('h2', { hasText: 'Plus on nous montre, moins on voit.' }).first();
await heading.scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
const handle = await heading.elementHandle();
await handle.hover();
await page.waitForTimeout(300);

await handle.click();
await page.waitForTimeout(300);
await page.keyboard.press('Meta+A');
await page.waitForTimeout(150);
await page.keyboard.type('TEST VERIF', { delay: 12 });
await page.waitForTimeout(150);
console.log('text after typing:', await handle.evaluate(el => el.textContent));

await page.keyboard.press('Enter');
await page.waitForTimeout(600);
console.log('isContentEditable after Enter:', await handle.evaluate(el => el.isContentEditable));
console.log('text after Enter:', await handle.evaluate(el => el.textContent));
console.log('pending sessionStorage:', await page.evaluate(() => sessionStorage.getItem('inspirata.editMode.pending')));
console.log('editOriginal dataset:', await handle.evaluate(el => el.dataset.editOriginal));
console.log('editApplied dataset:', await handle.evaluate(el => el.dataset.editApplied));

const btn = page.locator('button', { hasText: /^Publier/ }).first();
console.log('publier button disabled:', await btn.getAttribute('disabled'));
console.log('publier button text:', await btn.textContent());

await browser.close();
