// Audit readability across the site. For each page visited, samples
// every visible text element with inner text length ≥ 8, computes the
// effective background colour (walks up ancestors resolving alpha
// against the body background), and reports elements whose foreground vs
// background contrast falls below WCAG AA (4.5 for normal, 3.0 for large).
//
// Outputs the top 25 worst offenders per page, grouped by selector class
// signature so we can fix patterns rather than individual nodes.

import { chromium } from 'playwright';

const PAGES = ['/accueil', '/krystine', '/formations', '/medias', '/boutique'];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const allOffenders = {};

for (const path of PAGES) {
  await page.goto(`http://localhost:3002${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(6000); // DropIntro + bg image load

  const results = await page.evaluate(() => {
    // ── colour utils ────────────────────────────────────────────
    const parseColor = (c) => {
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const p = m[1].split(',').map(s => parseFloat(s.trim()));
      return { r: p[0], g: p[1], b: p[2], a: p[3] == null ? 1 : p[3] };
    };
    const compose = (fg, bg) => {
      const a = fg.a + bg.a * (1 - fg.a);
      if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
      return {
        r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a,
        g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a,
        b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a,
        a,
      };
    };
    const relLum = (c) => {
      const norm = (v) => {
        v = v / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * norm(c.r) + 0.7152 * norm(c.g) + 0.0722 * norm(c.b);
    };
    const contrast = (a, b) => {
      const l1 = relLum(a), l2 = relLum(b);
      const [lo, hi] = l1 < l2 ? [l1, l2] : [l2, l1];
      return (hi + 0.05) / (lo + 0.05);
    };

    // ── get effective background (walk ancestors composing alpha) ──
    // For parchment-image body, approximate the effective visible bg as
    // the mean ivoire tone after our body::before overlay. Use a mid
    // parchment colour #E6D6C1 as baseline for any element that ends up
    // transparent all the way to body.
    // With the strengthened body::before (radial 58% + linear 25%), the
    // effective parchment base now sits closer to #EFE0CE in the centre
    // and #EADCC5 near the edges. Use #ECDDC9 as the composite baseline.
    const PARCHMENT_BASE = { r: 236, g: 221, b: 201, a: 1 };

    const getEffectiveBg = (el) => {
      let bg = { r: 0, g: 0, b: 0, a: 0 };
      let node = el;
      let depth = 0;
      while (node && node !== document.documentElement && depth < 20) {
        const s = getComputedStyle(node);
        const c = parseColor(s.backgroundColor);
        if (c && c.a > 0) {
          bg = compose(bg, c);
          if (bg.a >= 0.98) return bg;
        }
        // If ancestor has backdrop-filter, approximate as parchment
        // smeared enough that we trust the card's own bg.
        node = node.parentElement;
        depth += 1;
      }
      // Fell off — body bg is the photo + ivoire overlay ≈ parchment base
      return compose(bg, PARCHMENT_BASE);
    };

    // ── collect text elements ──────────────────────────────────
    const elements = Array.from(document.querySelectorAll('body *'));
    const seen = [];
    for (const el of elements) {
      if (!(el instanceof HTMLElement)) continue;
      // Only elements that have direct text content (not just text in descendants)
      const direct = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent || '').join('').trim();
      if (direct.length < 8) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.bottom < 0 || rect.top > 10000) continue;
      const s = getComputedStyle(el);
      if (s.visibility === 'hidden' || s.display === 'none' || parseFloat(s.opacity) < 0.2) continue;
      const fg = parseColor(s.color);
      if (!fg) continue;
      // Text alpha is opacity * color alpha; bake the container opacity into fg alpha
      const opacity = parseFloat(s.opacity);
      const fgComposed = { r: fg.r, g: fg.g, b: fg.b, a: fg.a * opacity };
      const bg = getEffectiveBg(el);
      // Blend fg over bg as if painted
      const painted = compose(fgComposed, bg);
      const ratio = contrast(painted, bg);
      const fontSize = parseFloat(s.fontSize);
      const fontWeight = parseFloat(s.fontWeight) || 400;
      const isLarge = fontSize >= 18.66 && fontWeight >= 700 || fontSize >= 24;
      const minAA = isLarge ? 3.0 : 4.5;
      seen.push({
        selector: [el.tagName.toLowerCase(), el.className && el.className.split ? '.' + el.className.split(' ').filter(Boolean).slice(0, 2).join('.') : ''].join(''),
        text: direct.slice(0, 60),
        color: s.color,
        bgHex: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})`,
        ratio: Math.round(ratio * 100) / 100,
        minAA,
        failsAA: ratio < minAA,
        fontSize: Math.round(fontSize),
        weight: fontWeight,
        y: Math.round(rect.top),
      });
    }
    return seen;
  });

  const failures = results.filter(r => r.failsAA);
  failures.sort((a, b) => a.ratio - b.ratio);
  allOffenders[path] = failures.slice(0, 20);
  console.log(`${path}: ${failures.length} fails / ${results.length} sampled`);
  for (const f of failures.slice(0, 12)) {
    console.log(`  ${f.ratio.toFixed(2)} [${f.color} on ${f.bgHex}] ${f.fontSize}px  ${f.selector}  "${f.text}"`);
  }
  console.log('');
}

await browser.close();
