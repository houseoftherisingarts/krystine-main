import { chromium } from 'playwright';
const OUT = process.argv[2];
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('https://krystinestlaurent.ca/medias/tv', { waitUntil: 'networkidle', timeout: 60000 });
await p.waitForTimeout(3000);
const r = await p.evaluate(() => ({
  url: location.href,
  h1: [...document.querySelectorAll('h1,h2')].slice(0,6).map(e => e.textContent.trim()),
  iframesYoutube: [...document.querySelectorAll('iframe')].filter(f => /youtube/.test(f.src)).length,
  blankYoutube: [...document.querySelectorAll('a[target="_blank"]')].filter(a => /youtube/.test(a.href)).map(a => a.href).slice(0,8),
  boutonCompte: [...document.querySelectorAll('button,a')].filter(e => /cr[ée]er mon compte/i.test(e.textContent)).length,
  cartesLecture: [...document.querySelectorAll('button,[role=button]')].filter(e => /regarder|lire|play|écouter/i.test(e.textContent)).length,
}));
console.log(JSON.stringify(r, null, 1));
await p.screenshot({ path: `${OUT}/tv-prod-1440.png` });
// cliquer la première carte de liste pour voir si un iframe YouTube s'ouvre sans compte
const carte = await p.$('article, [class*="card"], [class*="playlist"]');
if (carte) { await carte.click().catch(()=>{}); await p.waitForTimeout(2500); }
const apres = await p.evaluate(() => [...document.querySelectorAll('iframe')].filter(f => /youtube/.test(f.src)).map(f => f.src).slice(0,3));
console.log('iframes après clic:', JSON.stringify(apres));
await p.screenshot({ path: `${OUT}/tv-prod-apres-clic.png` });
await b.close();
