import { chromium } from 'playwright';
const PW = process.env.PW; const OUT = process.env.OUT;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto('https://krystinestlaurent.ca/admin', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(4000);
await p.getByRole('button', { name: /^email$/i }).first().click(); await p.waitForTimeout(800);
await p.locator('input[type=email]').first().fill('admin@krystinestlaurent.ca');
await p.locator('input[type=password]').first().fill(PW);
await p.locator('input[type=password]').first().press('Enter'); await p.waitForTimeout(7000);
const menu = (await p.locator('nav').first().innerText().catch(() => '')).replace(/\s+/g, ' ');
console.log('menu admin contient Gamification:', /Gamification/i.test(menu), '| Sondages répondus:', /Sondages répondus/i.test(menu), '| Récompenses:', /Récompenses/.test(menu));
const g = p.locator('button', { hasText: /^\s*Gamification\s*$/ }).first();
if (await g.isVisible().catch(() => false)) { await g.click(); await p.waitForTimeout(3500); await p.screenshot({ path: `${OUT}/prod-gamification.png` }); const t = await p.locator('main').innerText().catch(() => ''); console.log('section Gamification: Fermé x', (t.match(/Fermé/g) || []).length, '| Cadeau du jour:', /cadeau du jour/i.test(t)); }
await p.goto('https://krystinestlaurent.ca/compte', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(6000);
const corps = await p.locator('body').innerText();
console.log('compte: Aider onglet:', /AIDER/.test(corps), '| Acheter des niskas:', /acheter des niskas/i.test(corps), '| Coffre:', /coffres? (bronze|argent|d.or)/i.test(corps), '| récompense:', /récompense/i.test(corps), '| cadeau du jour:', /cadeau du jour/i.test(corps));
const nk = p.getByRole('button', { name: /^niskas$/i }).first();
if (await nk.isVisible().catch(() => false)) { await nk.click(); await p.waitForTimeout(3000); await p.screenshot({ path: `${OUT}/prod-niskas.png` }); const t2 = await p.locator('body').innerText(); console.log('onglet Niskas: cadeau du jour:', /cadeau du jour/i.test(t2), '| roue:', /\broue\b/i.test(t2), '| récompense:', /récompense/i.test(t2)); }
const aider = p.getByRole('button', { name: /^aider$/i }).first();
if (await aider.isVisible().catch(() => false)) { await aider.click(); await p.waitForTimeout(3000); await p.screenshot({ path: `${OUT}/prod-aider.png` }); console.log('onglet Aider: sondages visibles:', (await p.locator('body').innerText()).includes('Votre expérience du site')); }
await b.close();
