import { chromium } from 'playwright';
const [S, PW] = [process.argv[2], process.argv[3]];
const browser = await chromium.launch();
for (const w of [1440, 390]) {
  const page = await browser.newPage({ viewport: { width: w, height: w === 390 ? 844 : 900 }, deviceScaleFactor: w === 390 ? 2 : 1 });
  await page.goto('http://localhost:3011/compte', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const cookie = page.getByRole('button', { name: /J'accepte/i }); if (await cookie.count()) await cookie.first().click().catch(() => {});
  await page.getByRole('button', { name: /Se connecter/i }).first().click().catch(() => {});
  await page.waitForTimeout(800);
  const dejaBtn = page.getByText(/Déjà un compte/); if (await dejaBtn.count()) await dejaBtn.first().click().catch(() => {});
  await page.waitForTimeout(400);
  await page.locator('input[type=email]').first().fill('admin@krystinestlaurent.ca');
  await page.locator('input[type=password]').first().fill(PW);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(5000);
  await page.goto('http://localhost:3011/cours/kajabi-2148687644', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  const audios = page.locator('button:has(img.h-9)');
  console.log(w, 'leçons audio avec vignette :', await audios.count(), '| images h-9 :', await page.locator('img.h-9').count());
  if (await audios.count()) { await audios.first().click(); await page.waitForTimeout(3000); }
  await page.screenshot({ path: `${S}/vata-${w}.png`, fullPage: w === 390 });
  await page.close();
}
await browser.close();
