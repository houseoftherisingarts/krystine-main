import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
page.on('console', (m) => console.log('[console]', m.type(), m.text()));
page.on('framenavigated', (f) => console.log('[nav]', f.url()));
await page.goto('http://localhost:5199/', { waitUntil: 'domcontentloaded' });
for (const t of [500, 1000, 1500, 2000, 3000, 4000]) {
  await page.waitForTimeout(t === 500 ? 500 : 500);
  console.log('t=', t, 'url=', page.url());
}
const buttons = await page.locator('button').allTextContents();
console.log('BUTTONS:', JSON.stringify(buttons.filter(t => t.trim())));
await page.screenshot({ path: '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/revue/paquets-niskas/n5-debug-home2.png' });
await browser.close();
