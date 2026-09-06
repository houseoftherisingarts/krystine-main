// QA temporaire — capture le pied de page de l'accueil (#infolettre) et la
// page /formations (NewsletterSignup React) pour vérifier la ligne
// « Créer mon compte » sous chaque formulaire d'infolettre. Supprimé après usage.
import { chromium } from 'playwright';
import path from 'node:path';

const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/e1cc376e-f932-4960-99aa-144a2161611f/scratchpad';
const BASE = 'http://localhost:4173';

const shots = [
  { url: `${BASE}/accueil/#infolettre`, name: 'accueil-infolettre', anchor: '#infolettre' },
  { url: `${BASE}/formations`, name: 'formations-react', anchor: null },
];

const viewports = [
  { w: 1440, h: 900, tag: 'desktop' },
  { w: 390, h: 844, tag: 'mobile' },
];

const browser = await chromium.launch();
for (const shot of shots) {
  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
    await page.goto(shot.url, { waitUntil: 'load', timeout: 45000 });
    if (shot.anchor) {
      await page.locator(shot.anchor).scrollIntoViewIfNeeded();
    } else {
      // Page React : chercher le bloc NewsletterSignup et défiler jusqu'à lui.
      await page.waitForSelector('text=Créer mon compte', { timeout: 15000 }).catch(() => {});
      const el = page.locator('text=Créer mon compte').first();
      if (await el.count()) await el.scrollIntoViewIfNeeded();
    }
    await page.waitForTimeout(600);
    const file = path.join(OUT, `${shot.name}-${vp.tag}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log('saved', file);
    await page.close();
  }
}
await browser.close();
