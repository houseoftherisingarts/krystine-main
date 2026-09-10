import { chromium } from 'playwright';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/b888b2c7-f098-4036-8a5d-c76540f05b53/scratchpad/shots';
const b = await chromium.launch();
for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'mobile']]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 600, hasTouch: w < 600, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto('http://localhost:5199/admin/habitudes', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1200);
  const emailTab = p.locator('button:has-text("Email")');
  if (await emailTab.count()) await emailTab.click();
  await p.waitForTimeout(300);
  await p.fill('input[type="email"]', 'houseoftherisingarts@gmail.com');
  await p.fill('input[type="password"]', 'EssaiHabitudes2026!');
  await p.click('button[type="submit"]');
  await p.waitForSelector('text=comptes au total', { timeout: 20000 });
  await p.waitForTimeout(1000);
  await p.fill('input[placeholder*="Chercher"]', 'sophie.tremblay@essai-krystine.ca');
  await p.waitForTimeout(700);
  await p.locator('button:has-text("sophie.tremblay@essai-krystine.ca")').first().click();
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${OUT}/habitudes-${tag}-fiche-sophie-vraie.png`, fullPage: true });
  await ctx.close();
}
await b.close();
