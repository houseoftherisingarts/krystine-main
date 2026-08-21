import { chromium } from 'playwright';
const [,, route, lang='fr', w='390', h='844', out='scripts/qa/shots/view.png'] = process.argv;
const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: +w, height: +h }, isMobile: +w < 600, hasTouch: +w < 600, deviceScaleFactor: 2 });
await c.addInitScript((l) => { try { localStorage.setItem('krystine-lang', l); } catch {} }, lang);
const p = await c.newPage(); await p.goto('http://localhost:3000' + route, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3500);
await p.screenshot({ path: out }); await b.close();
