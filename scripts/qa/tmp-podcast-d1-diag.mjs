import { chromium } from 'playwright';
import fs from 'fs';

const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/revue/podcast';
fs.mkdirSync(OUT, { recursive: true });
const URL = 'https://krystinestlaurent.ca/podcast';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));

await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(1000);

// Scroll incrémental jusqu'en bas pour déclencher tous les whileInView, comme un vrai visiteur.
const total = await page.evaluate(() => document.body.scrollHeight);
for (let y = 0; y < total; y += 300) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(120);
}
await page.waitForTimeout(500);

// Remonter précisément sur la carte LiveSignup et laisser les animations finir.
await page.evaluate(() => {
  const el = [...document.querySelectorAll('div')].find(d => getComputedStyle(d).backgroundColor === 'rgb(22, 19, 17)');
  el?.scrollIntoView({ block: 'center' });
});
await page.waitForTimeout(1500);

await page.screenshot({ path: `${OUT}/d1-apres-scroll-complet.png`, fullPage: true });

const cardHandle = await page.$('div.bg-\\[\\#161311\\]');
if (cardHandle) await cardHandle.screenshot({ path: `${OUT}/d1-carte-apres-scroll.png` });

const diag = await page.evaluate(() => {
  const ifr = document.querySelector('iframe[src*="youtube.com/embed"]');
  if (!ifr) return { found: false };
  const r = ifr.getBoundingClientRect();
  const cs = getComputedStyle(ifr);
  // Remonter la chaîne des ancêtres pour voir qui a un transform / position / hauteur explicite
  const chain = [];
  let node = ifr.parentElement;
  let depth = 0;
  while (node && depth < 8) {
    const s = getComputedStyle(node);
    chain.push({
      tag: node.tagName,
      cls: node.className?.toString().slice(0, 80),
      position: s.position,
      transform: s.transform,
      height: s.height,
      display: s.display,
    });
    node = node.parentElement;
    depth++;
  }
  return {
    found: true,
    rect: { x: r.x, y: r.y, w: r.width, h: r.height },
    computed: { position: cs.position, top: cs.top, height: cs.height, width: cs.width, inset: cs.inset },
    chain,
  };
});

const textVisible = await page.evaluate(() => {
  const h2s = [...document.querySelectorAll('h2')].filter(h => h.textContent.includes('rediffusion') || h.textContent.includes('Rediffusion') || h.textContent.toLowerCase().includes('rediffusion'));
  return h2s.map(h => ({ text: h.textContent.trim(), opacity: getComputedStyle(h).opacity, transform: getComputedStyle(h).transform }));
});

fs.writeFileSync(`${OUT}/d1-diag.json`, JSON.stringify({ diag, textVisible, consoleErrors }, null, 2));
console.log(JSON.stringify({ diag, textVisible, consoleErrors }, null, 2));

await browser.close();
