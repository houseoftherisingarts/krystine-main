import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto('http://localhost:4173/accueil', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(2500);

const subtitle = await page.evaluate(() => {
  const el = document.querySelector('[aria-live="polite"] p');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { fs: getComputedStyle(el).fontSize, color: getComputedStyle(el).color, w: Math.round(r.width), h: Math.round(r.height) };
});

const chips = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('div')).filter(d => /Dans \d+ ?h/.test(d.textContent || '')).slice(0, 5).map(d => {
    const r = d.getBoundingClientRect();
    const lh = parseFloat(getComputedStyle(d).lineHeight || '20');
    return { text: (d.textContent||'').trim().slice(0, 60), w: Math.round(r.width), h: Math.round(r.height), lines: Math.round(r.height / (isNaN(lh) ? 20 : lh)) };
  });
});

const cite = await page.evaluate(() => {
  const el = document.querySelector('blockquote p');
  if (!el) return null;
  return { fs: getComputedStyle(el).fontSize, color: getComputedStyle(el).color, text: (el.textContent||'').slice(0, 80) };
});

const subtitleSection = await page.evaluate(() => {
  // Origine subtitle "Une sagesse de 5 000 ans..."
  const all = Array.from(document.querySelectorAll('p'));
  const el = all.find(p => /5 000 ans/.test(p.textContent || ''));
  if (!el) return null;
  return { fs: getComputedStyle(el).fontSize, color: getComputedStyle(el).color, fontStyle: getComputedStyle(el).fontStyle };
});

console.log(JSON.stringify({ subtitle, chips, cite, subtitleSection, errors: errors.slice(0,5) }, null, 2));
await browser.close();
