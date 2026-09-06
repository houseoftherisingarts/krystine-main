// Rend scripts/pdf-mohurs.html en PDF (Lettre, sans marges) dans public/compte/.
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const ici = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('file://' + path.join(ici, 'pdf-mohurs.html'), { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(500);
await page.pdf({ path: path.join(ici, '..', 'public', 'compte', 'comment-gagner-des-mohurs.pdf'), format: 'Letter', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
await page.setViewportSize({ width: 816, height: 1056 });
for (let i = 0; i < 3; i++) {
  await page.evaluate((n) => document.querySelectorAll('.page')[n].scrollIntoView(), i);
  await page.screenshot({ path: `/private/tmp/claude-501/-Users-lesalondesinconnus/1fbb75be-b67c-4278-b1bb-2eba8055333b/scratchpad/pdf-page${i + 1}.png`, clip: { x: 0, y: 0, width: 816, height: 1056 } });
}
await browser.close();
console.log('pdf ok');
