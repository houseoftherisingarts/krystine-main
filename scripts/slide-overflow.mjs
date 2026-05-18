// Walk every /slide and report any element whose contents overflow its
// box, plus a quick check that nothing escapes the parchment page card.
// Saves a screenshot per slide so we can eyeball the offenders.
import { chromium } from 'playwright';
import fs from 'node:fs';

const VIEWPORTS = [
  { name: 'macbook',   width: 1440, height: 900 },
  { name: 'projector', width: 1920, height: 1080 },
];
const TOTAL = 14;
const OUT_DIR = 'scripts/.slide-overflow';
fs.mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();

for (const vp of VIEWPORTS) {
  const ctx  = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:4173/slide', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200);

  console.log(`\n=== ${vp.name} (${vp.width}×${vp.height}) ===`);

  for (let i = 1; i <= TOTAL; i++) {
    // Wait long enough for staggered/spring entrances (CTA cards
    // delay 0.75 s, demo gestures stagger up to ~1.55 s) to settle —
    // 900 ms used to capture mid-animation frames and report false
    // positives (empty-looking demo, missing right CTA card).
    await page.waitForTimeout(2400);

    const report = await page.evaluate(() => {
      const card = document.querySelector('[class*="rounded-[26px]"]');
      if (!card) return { error: 'no card' };
      const cardRect = card.getBoundingClientRect();
      const cardBottom = cardRect.bottom;
      const cardTop    = cardRect.top;
      const cardLeft   = cardRect.left;
      const cardRight  = cardRect.right;

      // Find every descendant whose bounding box pokes outside the card.
      const offenders = [];
      const all = card.querySelectorAll('*');
      for (const el of all) {
        if (el.getAttribute('aria-hidden') === 'true') continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        // Skip elements with fixed positioning that aren't really inside.
        const cs = getComputedStyle(el);
        if (cs.position === 'fixed') continue;

        const overTop    = cardTop    - r.top;
        const overBottom = r.bottom   - cardBottom;
        const overLeft   = cardLeft   - r.left;
        const overRight  = r.right    - cardRight;
        const worst = Math.max(overTop, overBottom, overLeft, overRight);
        if (worst > 1) {
          // Skip the html/body/wrapper noise by requiring the element to be
          // at most 92 % of the card area (offenders are children, not the card itself).
          if (r.width >= cardRect.width * 0.99 && r.height >= cardRect.height * 0.99) continue;
          offenders.push({
            tag: el.tagName.toLowerCase(),
            cls: (el.className || '').toString().slice(0, 90),
            text: (el.textContent || '').trim().slice(0, 70),
            overTop:    Math.round(overTop),
            overBottom: Math.round(overBottom),
            overLeft:   Math.round(overLeft),
            overRight:  Math.round(overRight),
            w: Math.round(r.width),
            h: Math.round(r.height),
          });
        }
      }
      // Also scrollHeight check on the inner wrapper.
      const inner = card.querySelector(':scope > div.relative.z-10 > div');
      let scrollOver = null;
      if (inner) {
        const ir = inner.getBoundingClientRect();
        scrollOver = Math.max(0, inner.scrollHeight - Math.round(ir.height));
      }
      return {
        cardH: Math.round(cardRect.height),
        cardW: Math.round(cardRect.width),
        offenders: offenders
          .sort((a,b) => Math.max(b.overTop,b.overBottom,b.overLeft,b.overRight) -
                        Math.max(a.overTop,a.overBottom,a.overLeft,a.overRight))
          .slice(0, 6),
        scrollOver,
      };
    });

    const tag = String(i).padStart(2, '0');
    await page.screenshot({ path: `${OUT_DIR}/${vp.name}-${tag}.png`, fullPage: false });

    const top = report.offenders?.[0];
    const summary = top
      ? `worst=+${Math.max(top.overTop,top.overBottom,top.overLeft,top.overRight)}px (${top.tag} "${top.text}")`
      : 'clean';
    console.log(`  slide ${tag}: scrollOver=${report.scrollOver}  ${summary}`);
    if (report.offenders?.length) {
      for (const o of report.offenders) {
        const dir = [
          o.overTop    > 1 ? `T+${o.overTop}`    : '',
          o.overBottom > 1 ? `B+${o.overBottom}` : '',
          o.overLeft   > 1 ? `L+${o.overLeft}`   : '',
          o.overRight  > 1 ? `R+${o.overRight}`  : '',
        ].filter(Boolean).join(' ');
        console.log(`     · ${o.tag.padEnd(4)} ${dir.padEnd(20)} "${o.text}"`);
      }
    }

    await page.keyboard.press('ArrowRight');
  }
  await ctx.close();
}

await browser.close();
console.log(`\nScreenshots in ${OUT_DIR}/`);
