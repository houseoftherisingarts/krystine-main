// Captures des pages d'événements en langage magazine crème (11 septembre 2026) :
// desktop 1440 et mobile 390, aux positions de défilement utiles, plus la page entière.
//   node scripts/qa/evenements-v2-shots.mjs <dossier de sortie> [base]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [,, out = '/tmp/ev-v2', base = 'http://localhost:5199'] = process.argv;
mkdirSync(out, { recursive: true });
const pages = [
  ['/evenements', 'cal'],
  ['/evenement/lancement-anglicane?apercu=1', 'vente'],
];
const b = await chromium.launch();
for (const [route, tag] of pages) {
  for (const [w, h, dev] of [[1440, 900, 'desktop'], [390, 844, 'mobile']]) {
    const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 600, hasTouch: w < 600 });
    await c.addInitScript(() => { try { localStorage.setItem('__devAdmin', '1'); localStorage.setItem('krystine-lang', 'fr'); sessionStorage.setItem('rideau-evenements', '1'); sessionStorage.setItem('rideau-evenement-lancement-anglicane', '1'); } catch {} });
    const p = await c.newPage();
    const erreurs = [];
    p.on('pageerror', e => erreurs.push(String(e).slice(0, 200)));
    p.on('console', m => { if (m.type() === 'error') erreurs.push('console: ' + m.text().slice(0, 200)); });
    await p.goto(base + route, { waitUntil: 'load' });
    await p.waitForTimeout(4500);
    const H = await p.evaluate(() => document.documentElement.scrollHeight);
    const pas = Math.round(h * 0.85);
    let i = 0;
    for (let y = 0; y < H && i < 14; y += pas, i++) {
      await p.evaluate(v => window.scrollTo(0, v), y);
      await p.waitForTimeout(900);
      await p.screenshot({ path: `${out}/${tag}-${dev}-${String(i).padStart(2, '0')}.jpg`, quality: 70 });
    }
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(600);
    await p.screenshot({ path: `${out}/${tag}-${dev}-full.jpg`, fullPage: true, quality: 55 });
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    console.log(tag, dev, 'hauteur', H, 'vues', i, 'debordement', overflow, 'erreurs', erreurs.length ? erreurs.slice(0, 4) : 'aucune');
    await c.close();
  }
}
await b.close();
