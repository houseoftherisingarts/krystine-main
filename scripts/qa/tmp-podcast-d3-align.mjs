import { chromium } from 'playwright';
import fs from 'fs';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/revue/podcast';
const URL = 'https://krystinestlaurent.ca/podcast';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(1000);
const total = await page.evaluate(() => document.body.scrollHeight);
for (let y = 0; y < total; y += 300) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(100); }
await page.waitForTimeout(500);

const edges = await page.evaluate(() => {
  function leftOf(txt) {
    const el = [...document.querySelectorAll('p,h2,span')].find(e => e.textContent.trim() === txt);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return Math.round(r.left * 100) / 100;
  }
  return {
    viewport: window.innerWidth,
    hero_label: leftOf('Au-delà des tendances'), // eyebrow du hero
    card_badge_wrapper_left: (() => {
      const el = [...document.querySelectorAll('div')].find(d => getComputedStyle(d).backgroundColor === 'rgb(22, 19, 17)');
      return el ? Math.round(el.getBoundingClientRect().left * 100) / 100 : null;
    })(),
    card_eyebrow_youtube_label: (() => {
      // le texte "REDIFFUSION"/"En direct sur YouTube" à l'intérieur du badge
      const el = [...document.querySelectorAll('span')].find(e => /REDIFFUSION|En direct sur YouTube/i.test(e.textContent || ''));
      return el ? Math.round(el.getBoundingClientRect().left * 100) / 100 : null;
    })(),
    archive_label: leftOf('Tous les épisodes'),
    newsletter_label: leftOf('Rester dans le fil'),
    footer_quote_left: (() => {
      const el = [...document.querySelectorAll('footer p')].find(p => p.textContent.includes('Revenir à l’essentiel'));
      return el ? Math.round(el.getBoundingClientRect().left * 100) / 100 : null;
    })(),
  };
});

fs.writeFileSync(`${OUT}/d3-edges.json`, JSON.stringify(edges, null, 2));
console.log(JSON.stringify(edges, null, 2));
await browser.close();
