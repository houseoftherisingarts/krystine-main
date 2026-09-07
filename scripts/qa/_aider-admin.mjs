// QA temporaire : la section admin « Sondages répondus » avec la réponse
// reçue (formations-2026-09, simulée par _aider.mjs). Fichier jetable.
import { chromium } from 'playwright';

const BASE = 'http://localhost:5199';
const OUT = 'scripts/qa/shots';

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));

// DEV seulement : déverrouille l'admin sans mot de passe réel (src/lib/devAdmin.ts).
await page.goto(`${BASE}/admin?unlock=Alexisthebest2121!`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/admin-dashboard-1440.png`, fullPage: true });
console.log('capture admin dashboard (vérifie que le déverrouillage a marché)');

await page.goto(`${BASE}/admin/sondages`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1800);
await page.screenshot({ path: `${OUT}/admin-sondages-liste-1440.png`, fullPage: true });
console.log('capture admin liste des sondages');

// Ouvrir les réponses de « formations-2026-09 » (la réponse simulée).
const ligneFormations = page.locator('tr', { hasText: 'Ce que vous voulez apprendre' });
await ligneFormations.getByRole('button', { name: /Réponses/i }).click();
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/admin-sondages-reponses-1440.png`, fullPage: true });
console.log('capture admin réponses reçues (formations-2026-09)');

// Mobile.
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/admin-sondages-reponses-390.png`, fullPage: true });
console.log('capture admin réponses reçues (mobile)');

await browser.close();
