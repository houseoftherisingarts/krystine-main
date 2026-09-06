import { chromium } from 'playwright';

const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/medias';
const URL = 'http://localhost:4321/medias';

const browser = await chromium.launch();

for (const { name, width, height } of [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(URL, { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(1800);
  const tv = page.locator('#tv');
  await tv.scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  await tv.screenshot({ path: `${OUT}/tv-section-${name}.png` });
  await page.close();
}

await browser.close();
console.log('done');
