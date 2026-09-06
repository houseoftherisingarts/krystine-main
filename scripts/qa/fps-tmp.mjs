// A/B entrelacé : pour chaque skin, on mesure coup sur coup la page animée et
// la même page sous « mouvement réduit ». Les deux subissent la même charge
// machine à la seconde près. « nuit » est le témoin, il n'a aucun motif.
import { chromium } from 'playwright';
const SKINS = ['nuit', 'ocean', 'encre', 'lotus', 'or-pur'];
const PASSES = 3;
const b = await chromium.launch();
const ctxA = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const ctxB = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
const pA = await ctxA.newPage();
const pB = await ctxB.newPage();

const mesure = async (page, skin) => {
  await page.goto(`http://localhost:5302/demo-skins?skin=${skin}`, { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 1300));
  return page.evaluate(() => new Promise((res) => {
    let n = 0; const t0 = performance.now();
    const t = () => { n += 1; performance.now() - t0 < 2000 ? requestAnimationFrame(t) : res(Math.round(n * 1000 / (performance.now() - t0))); };
    requestAnimationFrame(t);
  }));
};

const anime = Object.fromEntries(SKINS.map((s) => [s, 0]));
const fige = Object.fromEntries(SKINS.map((s) => [s, 0]));
for (let i = 0; i < PASSES; i += 1) {
  for (const s of SKINS) {
    const a = await mesure(pA, s);
    const f = await mesure(pB, s);
    if (a > anime[s]) anime[s] = a;
    if (f > fige[s]) fige[s] = f;
  }
}
for (const s of SKINS) console.log(`${s.padEnd(7)} animé ${String(anime[s]).padStart(3)} fps · figé ${String(fige[s]).padStart(3)} fps`);
await b.close();
