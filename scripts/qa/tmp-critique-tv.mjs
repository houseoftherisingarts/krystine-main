import { chromium } from 'playwright';
const OUT = process.argv[2];
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('https://krystinestlaurent.ca/medias/tv', { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForTimeout(7000);
const r = await p.evaluate(() => ({
  url: location.href,
  titres: [...document.querySelectorAll('h1,h2,h3')].slice(0,8).map(e => e.textContent.trim()).filter(Boolean),
  iframesYoutube: [...document.querySelectorAll('iframe')].filter(f => /youtube/.test(f.src)).length,
  blankYoutube: [...document.querySelectorAll('a[target="_blank"]')].filter(a => /youtube/.test(a.href)).map(a => a.href).slice(0,8),
  boutonCompte: [...document.querySelectorAll('button,a')].filter(e => /cr[ée]er mon compte/i.test(e.textContent)).length,
}));
console.log(JSON.stringify(r, null, 1));
await p.screenshot({ path: `${OUT}/tv-prod-1440.png` });
const carte = await p.$('button:has(img), [role=button]:has(img), article');
if (carte) { await carte.click().catch(()=>{}); await p.waitForTimeout(3000); }
const apres = await p.evaluate(() => [...document.querySelectorAll('iframe')].filter(f => /youtube/.test(f.src)).map(f => f.src).slice(0,3));
console.log('iframes YouTube après clic sur la première carte:', JSON.stringify(apres));
await p.screenshot({ path: `${OUT}/tv-prod-apres-clic.png` });
await b.close();
