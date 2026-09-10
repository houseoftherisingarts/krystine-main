import { chromium } from 'playwright';
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1500, height: 1100 } });
await c.addInitScript(() => { try { localStorage.setItem('__devAdmin','1'); localStorage.setItem('__adminBypass','1'); localStorage.setItem('krystine-lang','fr'); } catch {} });
const p = await c.newPage();
p.on('pageerror', () => {});
await p.goto('http://localhost:5199/admin', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(5000);
for (const t of ['COMMUNAUTÉ', 'Habitudes de tes clientes']) {
  const el = p.locator(`button:has-text("${t}")`).first();
  if (await el.count()) { await el.click({ force: true }); await p.waitForTimeout(t.includes('Habitudes') ? 4500 : 800); }
  else console.log('introuvable :', t);
}
console.log('en-tête de la page :', (await p.locator('h1, h2').allInnerTexts()).slice(0,4).join(' | '));
await p.screenshot({ path: '/tmp/hab2.png' });
await b.close();
