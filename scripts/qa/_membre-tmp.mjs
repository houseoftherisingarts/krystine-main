import { chromium } from 'playwright';
const out = process.argv[2]; const base = 'http://localhost:5199';
const b = await chromium.launch();
for (const [nom, w, h] of [['desktop',1440,900],['mobile',390,844]]) {
  const pg = await b.newPage({ viewport:{width:w,height:h}, deviceScaleFactor:1, isMobile: w<500, hasTouch: w<500 });
  await pg.goto(base + '/accueil/', { waitUntil:'load' }); await pg.waitForTimeout(2500); await pg.waitForLoadState('networkidle').catch(()=>{}); await pg.evaluate(()=>{document.querySelectorAll('[class*=avis],[id*=avis]').forEach(e=>{ if(getComputedStyle(e).position==='fixed') e.style.display='none'; });});
  await pg.addStyleTag({ content: '.reveal{opacity:1!important;transform:none!important}' });
  for (const [id, f] of [['#membre','membre'],['footer.foot','footer']]) {
    const el = pg.locator(id).first();
    await el.scrollIntoViewIfNeeded(); await pg.waitForTimeout(700);
    const bb = await el.boundingBox();
    await pg.screenshot({ path: `${out}/${f}-${nom}.png`, clip: { x:0, y: Math.max(0, bb.y + (await pg.evaluate(()=>window.scrollY))), width: w, height: Math.min(bb.height, 1800) }, fullPage: true });
    if (f==='membre') {
      const lignes = await pg.evaluate(() => { const h=document.querySelector('#membre h2'); const cs=getComputedStyle(h); return Math.round(h.getBoundingClientRect().height/parseFloat(cs.lineHeight)); });
      console.log(nom, 'titre lignes =', lignes, 'section h =', Math.round(bb.height), 'w =', Math.round(bb.width));
    } else console.log(nom, 'footer h =', Math.round(bb.height), 'giant présent =', await pg.locator('.giant').count());
  }
  await pg.close();
}
await b.close();
