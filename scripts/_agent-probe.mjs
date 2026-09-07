import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:3034/accueil', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
const info = await page.evaluate(() => {
  const all = Array.from(document.querySelectorAll('*')).filter(el => el.textContent?.trim() === 'Créer mon compte' && el.children.length === 0);
  return all.map(el => ({
    tag: el.tagName, parentTag: el.parentElement?.tagName, parentClass: el.parentElement?.className,
    grand: el.parentElement?.parentElement?.tagName, grandClass: el.parentElement?.parentElement?.className,
  }));
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
