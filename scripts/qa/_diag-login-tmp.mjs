import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const PW = readFileSync('/Users/lesalondesinconnus/.claude/scripts/.krystine_admin_pw', 'utf8').trim();
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', m => console.log('[console]', m.type(), m.text()));
page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.goto('http://localhost:5196/compte', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
// dismiss cookie banner if present
const accepte = page.getByText(/j'accepte/i).first();
if (await accepte.isVisible().catch(() => false)) { await accepte.click(); console.log('cookie banner dismissed'); }
await page.waitForTimeout(300);
await page.screenshot({ path: '/tmp/diag1-before-click.png' });
const seConnecter = page.getByText(/se connecter/i).first();
console.log('se connecter visible?', await seConnecter.isVisible().catch(() => false));
await seConnecter.click();
await page.waitForTimeout(800);
await page.screenshot({ path: '/tmp/diag2-after-click.png' });
const emailInput = page.locator('input[type="email"]');
console.log('email input count', await emailInput.count());
await browser.close();
