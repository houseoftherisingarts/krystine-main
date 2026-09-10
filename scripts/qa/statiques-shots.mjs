import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const dossier = process.argv[2] || 'avant';
const PAGES = ['/accueil', '/communaute', '/speaking', '/liste-attente-origine'];
mkdirSync(`/tmp/statiques-${dossier}`, { recursive: true });
const b = await chromium.launch();
for (const route of PAGES) {
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 600, hasTouch: w < 600 });
    await c.addInitScript(() => { try { localStorage.setItem('krystine-lang','fr'); } catch {} });
    const p = await c.newPage();
    p.on('pageerror', e => console.log('ERREUR', route, String(e).slice(0, 140)));
    await p.goto('http://localhost:5199' + route, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(5000);
    const nom = `/tmp/statiques-${dossier}${route.replace(/\//g, '_')}-${w}.png`;
    await p.screenshot({ path: nom, fullPage: true });
    console.log(nom);
    await c.close();
  }
}
await b.close();
