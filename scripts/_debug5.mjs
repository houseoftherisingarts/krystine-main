import { chromium } from 'playwright';
const BASE = 'http://localhost:3032';
const url = '/formations';
const match = 'Le programme Vata se suit dès maintenant. Les autres reviennent une à une.';
const newText = 'Le programme Vata se suit dès maintenant (texte de vérification).';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', e => console.log('[pageerror]', e.message));
page.on('console', m => { if (m.type() === 'error') console.log('[console error]', m.text()); });

await page.goto(`${BASE}${url}?unlock=Alexisthebest2121!`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
await page.goto(`${BASE}${url}?edit=1`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);

let loc = page.locator('h2', { hasText: match }).first();
let handle = await loc.elementHandle();
await handle.evaluate(el => el.scrollIntoView({ block: 'center' }));
await page.waitForTimeout(500);
await handle.click(); await page.waitForTimeout(300);
await page.keyboard.press('Meta+A'); await page.waitForTimeout(150);
await page.keyboard.type(newText, { delay: 12 }); await page.waitForTimeout(200);
console.log('key that WILL be used:', await handle.evaluate(el => el.dataset.editOriginal));
await page.keyboard.press('Enter'); await page.waitForTimeout(800);
console.log('pending before publish:', await page.evaluate(() => sessionStorage.getItem('inspirata.editMode.pending')));
await page.locator('button', { hasText: /^Publier/ }).first().click();
await page.waitForTimeout(2000);
console.log('localOverridesDoc right after publish click:', await page.evaluate(() => localStorage.getItem('__localOverridesDoc')));

await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
console.log('__devAdmin after plain reload:', await page.evaluate(() => localStorage.getItem('__devAdmin')));
console.log('__localOverrides after plain reload:', await page.evaluate(() => localStorage.getItem('__localOverrides')));
console.log('localOverridesDoc after plain reload:', await page.evaluate(() => localStorage.getItem('__localOverridesDoc')));
const allH2 = await page.locator('h2').allTextContents();
console.log('all h2 after reload:', JSON.stringify(allH2, null, 1));

await browser.close();
