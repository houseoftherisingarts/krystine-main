import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
await p.goto('http://localhost:5199/medias', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(4000);
await p.evaluate(() => { const el = document.querySelector('#livres'); if (el) el.scrollIntoView(); }); await p.waitForTimeout(1500);
await p.screenshot({ path: '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/medias/livres.png' });
await b.close();
