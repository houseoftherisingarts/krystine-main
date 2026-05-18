import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto('http://localhost:4173/slide', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);

// Jump to last slide (CTA)
for (let i = 0; i < 20; i++) await page.keyboard.press('End');
await page.waitForTimeout(1000);
await page.keyboard.press('End');
await page.waitForTimeout(1500);

// Inspect CTA slide overflow
const result = await page.evaluate(() => {
  const cards = Array.from(document.querySelectorAll('article'));
  const cardData = cards.map(c => {
    const r = c.getBoundingClientRect();
    return {
      cls: c.className.slice(0, 60),
      w: Math.round(r.width),
      h: Math.round(r.height),
      sh: c.scrollHeight,
      sw: c.scrollWidth,
      childOverflow: Array.from(c.children).map(ch => {
        const cr = ch.getBoundingClientRect();
        return { tag: ch.tagName, w: Math.round(cr.width), h: Math.round(cr.height), text: (ch.textContent||'').trim().slice(0, 40) };
      }),
    };
  });
  // Check the closing line
  const closing = Array.from(document.querySelectorAll('p')).filter(p => /Merci d'avoir/.test(p.textContent||''))[0];
  const closingData = closing ? { text: closing.textContent, fs: getComputedStyle(closing).fontSize, h: Math.round(closing.getBoundingClientRect().height) } : null;
  // Check the URL container
  const urlContainer = Array.from(document.querySelectorAll('[class*="rounded-[16px]"]')).find(el => /krystinestlaurent\.ca/.test(el.textContent||''));
  const urlData = urlContainer ? { cls: urlContainer.className.slice(0,60), w: Math.round(urlContainer.getBoundingClientRect().width), h: Math.round(urlContainer.getBoundingClientRect().height) } : null;
  return { cards: cardData, closing: closingData, url: urlData };
});

console.log(JSON.stringify(result, null, 2));
await browser.close();
