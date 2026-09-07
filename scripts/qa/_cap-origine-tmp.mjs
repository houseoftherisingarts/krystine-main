import { chromium } from 'playwright';
const S = process.argv[2];
const browser = await chromium.launch();
for (const [w,h,tag] of [[1440,900,'1440'],[390,844,'390']]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto('http://localhost:4181/foyer', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);
  // passer le préloader s'il y en a un
  await page.mouse.wheel(0, 200); await page.waitForTimeout(800);
  const h2 = page.locator('h2', { hasText: 'relier ce que' }).first();
  await h2.waitFor({ timeout: 30000 });
  await h2.evaluate(el => el.closest('section')?.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(3500);
  const box = await h2.boundingBox();
  const lines = await h2.evaluate(el => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)));
  console.log(tag, 'h2 lines:', lines, 'box:', JSON.stringify(box));
  await page.screenshot({ path: `${S}/origine-${tag}.png` });
  if (tag==='390') { await page.mouse.wheel(0, 500); await page.waitForTimeout(1200); await page.screenshot({ path: `${S}/origine-390-b.png` }); }
  await page.close();
}
await browser.close();
