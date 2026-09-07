import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/recheck'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.goto('http://localhost:5199/podcast', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(6000);
for (let y = 0; y < 6000; y += 700) { await p.evaluate((yy) => window.scrollTo({ top: yy }), y); await p.waitForTimeout(200); }
await p.evaluate(() => window.scrollTo({ top: 600 })); await p.waitForTimeout(1200);
const fr = await p.locator('iframe').first().boundingBox(); console.log('iframe rediffusion', JSON.stringify(fr));
await p.screenshot({ path: `${OUT}/podcast-carte.png` });
const s2 = await p.locator('text=Saison 2').first(); await s2.scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
const nums = await p.evaluate(() => [...document.querySelectorAll('span.tabular-nums')].map(e => e.textContent.trim()).slice(-4)); console.log('derniers numéros', nums);
await p.screenshot({ path: `${OUT}/podcast-saisons.png` });
const boxes = await p.evaluate(() => { const r = (el) => { const b = el.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.right)]; }; const carte = document.querySelector('section .rounded-\\[15px\\]'); const news = [...document.querySelectorAll('section')].find(s => s.textContent.includes('Chaque épisode')); const foot = document.querySelector('footer'); return { carte: carte && r(carte), news: news && r(news.firstElementChild), foot: foot && r(foot.firstElementChild) }; });
console.log('bords', JSON.stringify(boxes));
await b.close();
