import { chromium } from 'playwright';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/b888b2c7-f098-4036-8a5d-c76540f05b53/scratchpad/shots';
const b = await chromium.launch();

async function connecte(p) {
  await p.goto('http://localhost:5199/admin/habitudes', { waitUntil: 'domcontentloaded' });
  const emailTab = p.locator('button:has-text("Email")');
  await emailTab.waitFor({ state: 'visible', timeout: 15000 });
  await emailTab.click();
  await p.locator('input[type="email"]').waitFor({ state: 'visible', timeout: 10000 });
  await p.fill('input[type="email"]', 'houseoftherisingarts@gmail.com');
  await p.fill('input[type="password"]', 'EssaiHabitudes2026!');
  await p.click('button[type="submit"]');
  await p.waitForSelector('text=comptes au total', { timeout: 20000 });
}

for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'mobile']]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 600, hasTouch: w < 600, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await connecte(p);
  await p.goto('http://localhost:5199/foyer-essai', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${OUT}/foyer-essai-${tag}-plein.png`, fullPage: true });
  // Gros plan sur la porte de décembre (vidéo supprimée du Storage).
  const decembre = p.locator('text=Vidéo depuis supprimée du Storage').first();
  if (await decembre.count()) {
    await decembre.scrollIntoViewIfNeeded();
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${OUT}/foyer-essai-${tag}-video-supprimee.png` });
  }
  console.log(`[${tag}] erreurs JS:`, errs.slice(0, 8));
  await ctx.close();
}
await b.close();
