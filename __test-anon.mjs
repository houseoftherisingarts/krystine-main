import { chromium } from 'playwright';

const BASE = 'http://localhost:8899';
const pages = ['/accueil/', '/communaute/', '/speaking/', '/liste-attente-origine/'];
const viewports = [{ w: 1440, h: 900, tag: '1440' }, { w: 390, h: 844, tag: '390' }];

const browser = await chromium.launch();
let anyProblem = false;

for (const p of pages) {
  for (const vp of viewports) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push('console.error: ' + msg.text()); });
    const url = BASE + p;
    let crayonPresent = 'n/a';
    let bodyTextLen = 'n/a';
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 20000 });
      await page.waitForTimeout(3000);
      crayonPresent = await page.evaluate(() => !!document.querySelector('[data-crayon]'));
      bodyTextLen = await page.evaluate(() => document.body.innerText.length);
      const shotPath = `/private/tmp/claude-501/-Users-lesalondesinconnus/b888b2c7-f098-4036-8a5d-c76540f05b53/scratchpad/shots/anon2-${p.replace(/\//g, '')}-${vp.tag}.png`;
      await page.screenshot({ path: shotPath, fullPage: false });
      console.log(JSON.stringify({ page: p, viewport: vp.tag, errors, crayonPresent, bodyTextLen, shot: shotPath }));
    } catch (e) {
      console.log(JSON.stringify({ page: p, viewport: vp.tag, errors, crayonPresent, bodyTextLen, failure: e.message }));
      anyProblem = true;
    }
    const errsReels = errors.filter((e) => !/Could not reach Cloud Firestore backend/.test(e));
    if (errsReels.length || crayonPresent === true) anyProblem = true;
    await ctx.close();
  }
}
await browser.close();
if (anyProblem) process.exit(1);
