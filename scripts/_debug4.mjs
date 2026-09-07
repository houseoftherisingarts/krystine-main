import { chromium } from 'playwright';
const BASE = 'http://localhost:3032';
const url = '/formations';
const match = 'Le programme Vata se suit dès maintenant. Les autres reviennent une à une.';
const newText = 'Le programme Vata se suit dès maintenant (texte de vérification).';

for (const vp of [{w:1440,h:900},{w:390,h:844}]) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));

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
  await page.keyboard.press('Enter'); await page.waitForTimeout(800);
  await page.locator('button', { hasText: /^Publier/ }).first().click();
  await page.waitForTimeout(2000);

  await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const count = await page.locator('h2', { hasText: newText }).count();
  console.log(`vp=${vp.w} publish-persists=${count > 0} errors=${JSON.stringify(errs)}`);

  // cleanup revert
  await page.goto(`${BASE}${url}?edit=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  loc = page.locator('h2', { hasText: newText }).first();
  handle = await loc.elementHandle();
  if (handle) {
    await handle.evaluate(el => el.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(400);
    await handle.click(); await page.waitForTimeout(300);
    await page.keyboard.press('Meta+A'); await page.waitForTimeout(150);
    await page.keyboard.type(match, { delay: 12 }); await page.waitForTimeout(200);
    await page.keyboard.press('Enter'); await page.waitForTimeout(800);
    await page.locator('button', { hasText: /^Publier/ }).first().click();
    await page.waitForTimeout(2000);
  }
  await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const countOrig = await page.locator('h2', { hasText: match }).count();
  console.log(`vp=${vp.w} revert-ok=${countOrig > 0}`);

  await browser.close();
}
