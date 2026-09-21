import { chromium } from 'playwright';
const S = process.argv[2];
const b = await chromium.launch();
for (const [nom, w, h] of [['desktop',1440,900],['mobile',390,844]]) {
  for (const [page, url] of [['accueil','http://localhost:4179/accueil/'],['medias','http://localhost:4179/medias']]) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    await p.goto(url, { waitUntil: 'networkidle' }).catch(()=>{});
    await p.waitForTimeout(1500);
    const el = await p.$('a.cv-foil');
    if (!el) { console.log(nom, page, 'AUCUN COLLANT'); continue; }
    await el.scrollIntoViewIfNeeded();
    await p.waitForTimeout(800);
    const box = await el.boundingBox();
    const bg = await p.evaluate(() => { const a=document.querySelector('a.cv-foil'); const s=getComputedStyle(a); return {border:s.borderColor, radius:s.borderRadius, bg:s.backgroundImage, sheen: !!a.querySelector('.cv-sheen')}; });
    console.log(nom, page, JSON.stringify(box), JSON.stringify(bg));
    await p.screenshot({ path: `${S}/collant-${page}-${nom}.png` });
    // gros plan
    await p.screenshot({ path: `${S}/collant-${page}-${nom}-zoom.png`, clip: { x: Math.max(0, box.x-40), y: Math.max(0, box.y-40), width: Math.min(w, box.width+80), height: box.height+80 } });
    await p.close();
  }
}
await b.close();
