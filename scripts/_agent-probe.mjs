import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[console]', m.type(), m.text()); });
page.on('pageerror', e => console.log('[pageerror]', e.message));
page.on('requestfailed', r => console.log('[requestfailed]', r.url(), r.failure()?.errorText));
await page.goto('http://localhost:3034/admin?unlock=Alexisthebest2121!', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6000);
await browser.close();
