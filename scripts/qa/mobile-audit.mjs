// Mechanical responsive audit: overflow, oversized elements, hero title line
// count, tiny tap targets, tiny text. Screenshots to scripts/qa/shots/.
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = process.env.BASE || 'http://localhost:3000';
const ROUTES = (process.env.ROUTES || '/accueil,/krystine,/conferenciere,/origine,/foyer,/podcast,/vata,/boutique,/medias,/medias/tv,/blogue,/points-de-vente,/quiz,/guide,/formations,/liste-attente,/liste-attente-origine,/politique-de-confidentialite,/compte').split(',');
const VIEWS = { mobile: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, desktop: { width: 1440, height: 900 } };
fs.mkdirSync('scripts/qa/shots', { recursive: true });
const browser = await chromium.launch();
const report = {};
for (const [vname, vp] of Object.entries(VIEWS)) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, deviceScaleFactor: vp.deviceScaleFactor || 1 });
  await ctx.addInitScript((l) => { try { localStorage.setItem('krystine-lang', l); localStorage.setItem('consent-v1', 'accepted'); } catch {} }, process.env.LANG_ || 'fr');
  const page = await ctx.newPage();
  for (const r of ROUTES) {
    try {
      await page.goto(BASE + r, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2500);
      for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, 800); await page.waitForTimeout(80); }
      await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(600);
      const data = await page.evaluate(() => {
        const vw = window.innerWidth;
        const sw = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
        const wide = [];
        document.querySelectorAll('body *').forEach(el => {
          const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
          if (r.width > vw + 2 && cs.position !== 'fixed' && cs.overflow !== 'hidden' && r.height > 4) wide.push({ tag: el.tagName.toLowerCase(), cls: (el.className && String(el.className).slice(0, 80)) || '', w: Math.round(r.width) });
        });
        const h1 = document.querySelector('h1');
        let h1Lines = null, h1Text = '';
        if (h1) { const cs = getComputedStyle(h1); const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2; h1Lines = Math.round(h1.getBoundingClientRect().height / lh); h1Text = h1.textContent.trim().slice(0, 80); }
        const small = [];
        document.querySelectorAll('a,button,[role=button]').forEach(el => { const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0 && (r.height < 32 || r.width < 32) && getComputedStyle(el).visibility !== 'hidden') small.push({ t: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) }); });
        const tiny = [];
        document.querySelectorAll('p,span,li,a,button,label,small,div').forEach(el => { if (el.children.length) return; const t = (el.textContent || '').trim(); if (!t || t.length < 3) return; const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < 11) tiny.push({ t: t.slice(0, 30), fs }); });
        return { vw, sw, overflow: sw > vw + 1, wide: wide.slice(0, 8), h1Lines, h1Text, small: small.slice(0, 10), smallCount: small.length, tiny: tiny.slice(0, 8), tinyCount: tiny.length, title: document.title };
      });
      await page.screenshot({ path: `scripts/qa/shots/${vname}${r.replace(/\//g, '_') || '_root'}.png`, fullPage: vname === 'mobile' });
      report[`${vname} ${r}`] = data;
      console.log(vname, r, data.overflow ? `OVERFLOW ${data.sw}>${data.vw}` : 'ok', 'h1', data.h1Lines, 'small', data.smallCount, 'tiny', data.tinyCount);
    } catch (e) { console.log('FAIL', vname, r, e.message.slice(0, 100)); }
  }
  await ctx.close();
}
await browser.close();
fs.writeFileSync('scripts/qa/report.json', JSON.stringify(report, null, 1));
