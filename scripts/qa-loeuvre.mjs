import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/36a6d2d7-cf1c-407c-9878-34afadc9f1d1/scratchpad';
const routes = [
  ['krystine', '/krystine'],
  ['medias', '/medias'],
  ['formations', '/formations'],
  ['boutique', '/boutique'],
  ['liste-attente', '/liste-attente'],
  ['quiz', '/quiz'],
  ['guide', '/guide'],
  ['blogue', '/blogue'],
  ['points-de-vente', '/points-de-vente'],
];

// width/height/tag/deviceScaleFactor/reducedMotion
const profile = process.argv[2] || 'mobile';
const cfg = profile === 'mobile'
  ? { width: 390, height: 844, dsf: 2, suffix: 'm' }
  : { width: 1440, height: 900, dsf: 1, suffix: 'd' };

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: cfg.width, height: cfg.height },
  deviceScaleFactor: cfg.dsf,
  isMobile: profile === 'mobile',
  reducedMotion: 'reduce',
});
const page = await ctx.newPage();

for (const [name, path] of routes) {
  const errors = [];
  const onErr = e => errors.push('pageerror: ' + e.message);
  const onCon = m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); };
  page.on('pageerror', onErr);
  page.on('console', onCon);
  try {
    await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `${OUT}/qa-${name}-${cfg.suffix}.png`, fullPage: false });
    // detect horizontal overflow (a classic mobile bug)
    const overflow = await page.evaluate(w => document.documentElement.scrollWidth - w, cfg.width);
    console.log(`${name.padEnd(16)} OK  hOverflow=${overflow}px  errors=${errors.length}`);
  } catch (e) {
    console.log(`${name.padEnd(16)} FAIL ${e.message.slice(0, 120)}`);
  }
  errors.slice(0, 5).forEach(e => console.log('     - ' + e));
  page.off('pageerror', onErr);
  page.off('console', onCon);
}

await browser.close();
