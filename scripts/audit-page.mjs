import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto('http://localhost:4173/accueil', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);

// Find big empty vertical gaps inside columns/sections
const gaps = await page.evaluate(() => {
  const out = [];
  const containers = document.querySelectorAll('section, [class*="grid"], [class*="flex flex-col"]');
  for (const c of containers) {
    if (!(c instanceof HTMLElement)) continue;
    const cr = c.getBoundingClientRect();
    if (cr.width < 200 || cr.height < 200) continue;
    const kids = Array.from(c.children).filter(k => k instanceof HTMLElement);
    let prevBottom = cr.top;
    for (const k of kids) {
      const r = k.getBoundingClientRect();
      const gap = r.top - prevBottom;
      if (gap > 80) {
        out.push({
          container: c.className.slice(0, 60),
          childTag: k.tagName,
          childCls: k.className.slice(0, 60),
          gap: Math.round(gap),
        });
      }
      prevBottom = r.bottom;
    }
  }
  return out.slice(0, 20);
});

// Section header to first content gap audit
const sections = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('section, [class*="rounded-[28px]"]')).slice(0, 12).map(el => {
    if (!(el instanceof HTMLElement)) return null;
    const r = el.getBoundingClientRect();
    return { cls: el.className.slice(0, 80), w: Math.round(r.width), h: Math.round(r.height) };
  }).filter(Boolean);
});

console.log(JSON.stringify({ gaps, sections }, null, 2));
await browser.close();
