import { chromium } from 'playwright';
const [,, w='1440', h='900', out='/tmp/crayon-fenetre.png'] = process.argv;
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: +w, height: +h }, isMobile: +w < 600, hasTouch: +w < 600 });
await c.addInitScript(() => { try { localStorage.setItem('__devAdmin','1'); localStorage.setItem('krystine-lang','fr'); } catch {} });
const p = await c.newPage();
p.on('pageerror', e => console.log('PAGE ERROR:', String(e).slice(0,200)));
await p.goto('http://localhost:5199/formations', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4500);
await p.screenshot({ path: out.replace('.png', '-repos.png') });
await p.locator('button[aria-label*="Modifier les textes"]').first().click();
await p.waitForTimeout(1200);
const tous = await p.locator('[data-tx]').all();
let cible = null;
for (const el of tous) {
  const box = await el.boundingBox();
  if (box && box.y > 180 && box.y < +h - 200 && box.width > 60) { cible = el; break; }
}
if (!cible) { console.log('aucune cible visible'); await b.close(); process.exit(0); }
await cible.click({ force: true });
await p.waitForTimeout(900);
console.log('fenêtre ouverte =', await p.locator('[role="dialog"][aria-label="Récrire le texte"]').count());
const zone = p.locator('[data-crayon] textarea');
if (await zone.count()) { await zone.fill('Choisir votre prochaine porte, autrement'); await p.locator('[data-crayon] button:has-text("Appliquer")').click(); await p.waitForTimeout(900); }
await p.screenshot({ path: out });
console.log('changements =', await p.locator('[data-crayon]').innerText().then(t => t.split('\n').find(l => /changement/i.test(l))));
await b.close();
