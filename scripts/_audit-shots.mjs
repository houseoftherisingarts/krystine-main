import { chromium } from 'playwright';

const BASE = 'http://localhost:4173';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/largeur';

const routes = [
  '/podcast',
  '/foyer',
  '/direct',
  '/vata',
  '/krystine',
  '/conferenciere',
  '/v1',
  '/v2',
  '/v3',
  '/boutique',
  '/boutique/tous',
  '/medias/tv',
  '/blogue',
  '/points-de-vente',
  '/quiz',
  '/guide',
  '/politique-de-confidentialite',
  '/desinscription',
  '/cours',
  '/accueil-classic',
  '/origine',
  '/medias',
  '/formations',
  '/liste-attente',
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

for (const route of routes) {
  const fname = route === '/' ? 'root' : route.replace(/^\//, '').replace(/\//g, '_');
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1200); // settle motion/animations
    await page.screenshot({ path: `${OUT}/${fname}.png`, fullPage: true });
    console.log('OK', route);
  } catch (err) {
    console.log('FAIL', route, err.message);
    try {
      await page.screenshot({ path: `${OUT}/${fname}.error.png`, fullPage: true });
    } catch {}
  }
}

await browser.close();
