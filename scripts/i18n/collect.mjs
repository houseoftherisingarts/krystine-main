// Crawl every public route on the dev server with the JSX collector enabled
// and dump the unique French source strings to scripts/i18n/strings.fr.json.
// Usage: npm run dev (port 3000) then `node scripts/i18n/collect.mjs`.
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:3000';
const ROUTES = ['/accueil-classic','/krystine','/conferenciere','/origine','/foyer','/podcast','/vata','/boutique','/medias','/medias/tv','/blogue','/points-de-vente','/quiz','/guide','/formations','/liste-attente','/politique-de-confidentialite','/compte','/desinscription'];
const STATIC = ['/accueil','/liste-attente-origine'];
const out = new Set(JSON.parse(fs.existsSync('scripts/i18n/strings.fr.json') ? fs.readFileSync('scripts/i18n/strings.fr.json','utf8') : '[]'));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => { window.__i18nCollect = true; try { localStorage.setItem('krystine-lang','fr'); } catch {} });
const page = await ctx.newPage();

async function scrollAll() {
  for (let i = 0; i < 18; i++) { await page.mouse.wheel(0, 900); await page.waitForTimeout(150); }
  await page.evaluate(() => window.scrollTo(0, 0));
}
async function clickAll(sel) {
  const els = await page.$$(sel);
  for (const el of els.slice(0, 25)) { try { await el.click({ timeout: 300, force: true, noWaitAfter: true }); await page.waitForTimeout(60); } catch {} }
}

for (const r of ROUTES) {
  try {
    await page.goto(BASE + r, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);
    await scrollAll();
    await page.waitForTimeout(800);
    // Open accordions / tabs / modals / menus to render hidden strings.
    await clickAll('button[aria-expanded="false"], [role="tab"], details summary');
    await clickAll('button:not([type="submit"])');
    await page.waitForTimeout(500);
    const s = await page.evaluate(() => Array.from(window.__i18nStrings || []));
    s.forEach(x => out.add(x));
    console.log(r, s.length, '→', out.size);
  } catch (e) { console.warn('FAIL', r, e.message); }
}

// Static bundles: collect DOM text nodes + visible attributes.
for (const r of STATIC) {
  try {
    await page.goto(BASE + r, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500); await scrollAll();
    const s = await page.evaluate(() => {
      const res = new Set();
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n; while ((n = w.nextNode())) { const p = n.parentElement; if (!p || ['SCRIPT','STYLE','NOSCRIPT'].includes(p.tagName)) continue; const t = n.nodeValue.trim(); if (t) res.add(t); }
      document.querySelectorAll('[placeholder],[alt],[title],[aria-label]').forEach(el => ['placeholder','alt','title','aria-label'].forEach(a => { const v = el.getAttribute(a); if (v && v.trim()) res.add(v.trim()); }));
      res.add(document.title);
      const d = document.querySelector('meta[name="description"]'); if (d) res.add(d.content);
      return Array.from(res);
    });
    s.forEach(x => out.add(x));
    console.log(r, '(static)', s.length, '→', out.size);
  } catch (e) { console.warn('FAIL', r, e.message); }
}
await browser.close();
const SKIP = /^[\s\d.,:;!?%$€#()\-–·•/|&+*'"«»]*$|^https?:|^mailto:|^tel:|^[\w.-]+@[\w.-]+$|^#[\da-f]{3,8}$|^[\d\s:/.-]+$/i;
const list = [...out].filter(s => s.length > 1 && !SKIP.test(s) && /[a-zà-ÿ]/i.test(s)).sort((a,b)=>a.localeCompare(b,'fr'));
fs.writeFileSync('scripts/i18n/strings.fr.json', JSON.stringify(list, null, 1));
console.log('TOTAL', list.length, 'chars', list.join('').length);
