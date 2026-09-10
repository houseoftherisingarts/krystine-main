import { chromium } from 'playwright';
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 1200 } });
await c.addInitScript(() => { try { localStorage.setItem('__devAdmin','1'); localStorage.setItem('__adminBypass','1'); localStorage.setItem('krystine-lang','fr'); } catch {} });
const p = await c.newPage();
p.on('pageerror', e => console.log('ERREUR', String(e).slice(0,160)));
await p.goto('http://localhost:5199/admin', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(5000);
await p.locator('button:has-text("COMMUNAUTÉ")').first().click({ force: true }).catch(() => {});
await p.waitForTimeout(800);
const cible = p.locator('button:has-text("HABITUDES")').first();
if (await cible.count()) { await cible.click({ force: true }); await p.waitForTimeout(4000); }
else console.log('entrée de menu HABITUDES introuvable');
await p.locator('main').first().screenshot({ path: '/tmp/habitudes.png' }).catch(async () => { await p.screenshot({ path: '/tmp/habitudes.png' }); });
console.log('titre visible :', (await p.locator('body').innerText()).split('\n').filter(l => /habitude/i.test(l)).slice(0,3).join(' | '));
await b.close();
