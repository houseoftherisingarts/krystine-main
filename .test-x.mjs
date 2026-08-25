import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('https://festivalmedievaldemontpellier.org/activites', { waitUntil: 'load', timeout: 60000 });
await p.waitForTimeout(8000);
await p.evaluate(() => document.querySelectorAll('div.fixed button').forEach((b) => { if (!/réclamer|refuser|accepte/i.test(b.textContent || '')) b.click(); }));
try { await p.getByRole('button', { name: /^refuser$/i }).click({ timeout: 2000 }); } catch {}
// Défiler à la molette jusqu'à l'horaire, ouvrir la carte s'il faut, cliquer une activité.
const y = await p.evaluate(() => document.getElementById('horaire').getBoundingClientRect().top + window.scrollY);
for (let i = 0; i < y - 100; i += 120) { await p.mouse.wheel(0, 120); await p.waitForTimeout(15); }
await p.waitForTimeout(1500);
const act = p.locator('#horaire li button, #horaire li [role="button"]').first();
await act.click({ timeout: 5000 });
await p.waitForTimeout(900);
const ouvert = await p.locator('[role="dialog"]').count();
const rect = await p.locator('[role="dialog"]').first().boundingBox().catch(() => null);
await p.screenshot({ path: process.argv[2] + '/fiche-ouverte.jpg', type: 'jpeg', quality: 80 });
await p.locator('[role="dialog"] button[aria-label="Fermer"]').first().click({ timeout: 5000 });
await p.waitForTimeout(700);
const ferme = await p.locator('[role="dialog"]').count();
console.log(JSON.stringify({ ouvert, top: rect && Math.round(rect.y), parent: await p.evaluate(() => (document.querySelector('[role="dialog"]') || { parentElement: { tagName: 'aucun' } }).parentElement.tagName), ferme }));
await b.close();
