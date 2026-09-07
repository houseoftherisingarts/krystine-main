import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const BASE = 'http://localhost:5199';
const EMAIL = 'admin@krystinestlaurent.ca';
const PASSWORD = readFileSync(`${process.env.HOME}/.claude/scripts/.krystine_admin_pw`, 'utf8').trim();
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
page.on('console', (m) => console.log('[console:' + m.type() + ']', m.text().slice(0, 300)));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('requestfailed', (r) => console.log('[requestfailed]', r.url(), r.failure()?.errorText));
await page.goto(`${BASE}/compte`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);
await page.getByRole('button', { name: /Se connecter/i }).first().click();
await page.waitForTimeout(500);
await page.getByRole('button', { name: /Déjà un compte/i }).click();
await page.waitForTimeout(300);
await page.getByPlaceholder('Courriel').fill(EMAIL);
await page.getByPlaceholder('Mot de passe').fill(PASSWORD);
await page.locator('form button[type="submit"]').click();
await page.waitForTimeout(3000);
await page.goto(`${BASE}/compte?onglet=aider`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
const res = await page.evaluate(async () => {
  // @ts-ignore
  const mod = await import('/src/firebase/sondages.ts');
  try {
    const s = await mod.getSondagesActifs();
    return { ok: true, count: s.length, ids: s.map((x) => x.id) };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});
console.log('résultat direct getSondagesActifs():', JSON.stringify(res));
await browser.close();
