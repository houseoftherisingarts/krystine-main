import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
await page.goto('http://localhost:5199/compte', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
console.log('url:', page.url());
const buttons = await page.locator('button').allTextContents();
console.log('BUTTONS:', JSON.stringify(buttons.filter(t => t.trim())));
await page.screenshot({ path: '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/revue/paquets-niskas/n5-debug-compte.png' });
// Try clicking "Se connecter"
const btn = page.locator('button', { hasText: /Se connecter/i }).first();
if (await btn.count()) {
  await btn.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/revue/paquets-niskas/n5-debug-modal.png' });
  console.log('email inputs:', await page.locator('input[type=email]').count());
}
await browser.close();
