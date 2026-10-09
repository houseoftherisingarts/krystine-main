// Captures de /conferenciere refaite au langage magazine crème (9 octobre 2026) :
// 1440 (Chromium) et 390 (WebKit), ancres #conferences et #reserver, /krystine et /medias.
//   node scripts/qa/conferenciere-v2-shots.mjs <dossier de sortie> [base]
import { chromium, webkit } from 'playwright';
import { mkdirSync } from 'node:fs';
const [,, out = '/tmp/conf-v2', base = 'http://localhost:5199'] = process.argv;
mkdirSync(out, { recursive: true });
const pages = [
  ['/conferenciere', 'conf', true],
  ['/conferenciere#conferences', 'ancre-conferences', false],
  ['/conferenciere#reserver', 'ancre-reserver', false],
  ['/krystine', 'krystine', true],
  ['/medias', 'medias', false],
];
const nav = { chromium: await chromium.launch(), webkit: await webkit.launch() };
for (const [route, tag, defiler] of pages) {
  for (const [w, h, dev, moteur] of [[1440, 900, 'desktop', 'chromium'], [390, 844, 'mobile', 'webkit']]) {
    const c = await nav[moteur].newContext({ viewport: { width: w, height: h }, isMobile: w < 600 && moteur !== 'webkit' ? true : undefined, hasTouch: w < 600 });
    await c.addInitScript(() => { try { localStorage.setItem('krystine-lang', 'fr'); sessionStorage.setItem('intro-vue', '1'); } catch {} });
    const p = await c.newPage();
    const erreurs = [];
    p.on('pageerror', e => erreurs.push(String(e).slice(0, 200)));
    p.on('console', m => { if (m.type() === 'error') erreurs.push('console: ' + m.text().slice(0, 160)); });
    await p.goto(base + route, { waitUntil: 'load' });
    await p.waitForTimeout(3000);
    await p.getByRole('button', { name: /J.ACCEPTE/i }).first().click({ timeout: 1500 }).catch(() => {});
    await p.waitForTimeout(1200);
    const ancre = route.includes('#') ? route.split('#')[1] : null;
    if (ancre) {
      const top = await p.evaluate(id => Math.round(document.getElementById(id)?.getBoundingClientRect().top ?? -9999), ancre);
      await p.screenshot({ path: `${out}/${tag}-${dev}.jpg`, quality: 72 });
      console.log(tag, dev, `#${ancre} haut =`, top, 'px', 'erreurs', erreurs.length ? erreurs.slice(0, 3) : 'aucune');
      await c.close();
      continue;
    }
    const titres = await p.evaluate(() => [...document.querySelectorAll('main h1, main h2, main h3, h1, h2')].filter((e, i, a) => a.indexOf(e) === i).map(e => {
      const r = e.getBoundingClientRect(); const lh = parseFloat(getComputedStyle(e).lineHeight) || 1;
      return { t: e.textContent.trim().slice(0, 50), lignes: Math.round(r.height / lh) };
    }).filter(x => x.lignes > 2));
    const H = await p.evaluate(() => document.documentElement.scrollHeight);
    if (defiler) {
      const pas = Math.round(h * 0.85);
      let i = 0;
      for (let y = 0; y < H && i < 16; y += pas, i++) {
        await p.evaluate(v => window.scrollTo(0, v), y);
        await p.waitForTimeout(800);
        await p.screenshot({ path: `${out}/${tag}-${dev}-${String(i).padStart(2, '0')}.jpg`, quality: 68 });
      }
    } else {
      await p.screenshot({ path: `${out}/${tag}-${dev}-00.jpg`, quality: 68 });
      await p.evaluate(() => window.scrollTo(0, window.innerHeight * 0.9)); await p.waitForTimeout(900);
      await p.screenshot({ path: `${out}/${tag}-${dev}-01.jpg`, quality: 68 });
    }
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    console.log(tag, dev, 'hauteur', H, 'debordement', overflow, 'titres>2 lignes', JSON.stringify(titres), 'erreurs', erreurs.length ? erreurs.slice(0, 3) : 'aucune');
    await c.close();
  }
}
await nav.chromium.close(); await nav.webkit.close();
