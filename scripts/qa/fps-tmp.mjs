// Mesure stable : trois passes entrelacées, on garde le meilleur par skin.
// « nuit » sert de témoin : il n'a ni motif ni toile.
import { chromium } from 'playwright';
const SKINS = ['nuit', 'ocean', 'encre', 'lotus', 'or-pur'];
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })).newPage();
const mesure = () => p.evaluate(() => new Promise((res) => {
  let n = 0; const t0 = performance.now();
  const t = () => { n += 1; performance.now() - t0 < 2000 ? requestAnimationFrame(t) : res(Math.round(n * 1000 / (performance.now() - t0))); };
  requestAnimationFrame(t);
}));
const best = Object.fromEntries(SKINS.map((s) => [s, 0]));
for (let passe = 0; passe < 3; passe += 1) {
  for (const s of SKINS) {
    await p.goto(`http://localhost:5302/demo-skins?skin=${s}`, { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 1400));
    const f = await mesure();
    if (f > best[s]) best[s] = f;
  }
}
console.log(JSON.stringify(best));
await b.close();
