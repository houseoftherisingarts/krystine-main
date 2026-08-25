import { chromium } from 'playwright';
const out = process.argv[2];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('https://festivalmedievaldemontpellier.org/william', { waitUntil: 'load', timeout: 60000 });
await p.waitForTimeout(9000);
// L'annonce de badge : on clique tout bouton d'un conteneur fixe dont le texte ne dit pas « réclamer ».
const fermes = await p.evaluate(() => { let n = 0; document.querySelectorAll('div.fixed button').forEach((b) => { if (!/réclamer|refuser|accepte/i.test(b.textContent || '')) { b.click(); n++; } }); return n; });
try { await p.getByRole('button', { name: /^refuser$/i }).click({ timeout: 2000 }); } catch {}
await p.waitForTimeout(1500);
await p.screenshot({ path: `${out}/1-hero.jpg`, type: 'jpeg', quality: 88 });
await b.close(); console.log('ok fermes=' + fermes);
