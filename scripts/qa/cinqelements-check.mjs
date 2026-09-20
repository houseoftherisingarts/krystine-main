import { chromium } from 'playwright';
const base = 'http://localhost:5199';
const b = await chromium.launch();
for (const [w, h, dev] of [[1440, 900, 'desktop'], [390, 844, 'mobile']]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 600, hasTouch: w < 600 });
  await c.addInitScript(() => { try { sessionStorage.setItem('rideau-5elements', '1'); localStorage.setItem('krystine-lang', 'fr'); } catch {} });
  const p = await c.newPage();
  await p.goto(base + '/5elements', { waitUntil: 'load' });
  await p.waitForTimeout(4000);
  const r = await p.evaluate(() => {
    const h1 = document.querySelector('h1');
    const img = document.querySelector('img[alt*="5 éléments"]');
    const titre = document.title;
    const masthead = Array.from(document.querySelectorAll('section[data-hero] > div > span, section[data-hero] span'))
      .map(e => e.textContent?.trim()).filter(Boolean).slice(0, 2);
    const inputs = document.querySelectorAll('input').length;
    const boutons = Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).filter(t => t && t.includes('Télécharger'));
    const chapitres = Array.from(document.querySelectorAll('section[id]')).map(s => s.id);
    const h1Lignes = h1 ? Math.round(h1.getBoundingClientRect().height / parseFloat(getComputedStyle(h1).lineHeight)) : 0;
    const elements = Array.from(document.querySelectorAll('#guide .grid-cols-12')).length;
    const imgCharge = img && (img.naturalWidth > 0);
    const imgSrc = img ? img.getAttribute('src') : null;
    return { titre, h1: h1?.textContent?.trim(), h1Lignes, masthead, inputs, boutons, chapitres, elements, imgCharge, imgSrc };
  });
  console.log(dev, JSON.stringify(r, null, 1));
  await c.close();
}
await b.close();
