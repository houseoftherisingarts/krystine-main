// Mesure fps : six passes, on garde le meilleur par skin (les creux viennent de
// la charge de la machine, pas de la page). « nuit » est le témoin : même page,
// même DOM, aucun motif. Le plafond se lit sous « mouvement réduit ».
import { chromium } from 'playwright';
const SKINS = ['nuit', 'ocean', 'encre', 'lotus', 'or-pur'];
const b = await chromium.launch();
const mesurer = async (reduit, passes) => {
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: reduit ? 'reduce' : 'no-preference' })).newPage();
  const best = Object.fromEntries(SKINS.map((s) => [s, 0]));
  for (let i = 0; i < passes; i += 1) for (const s of SKINS) {
    await p.goto(`http://localhost:5302/demo-skins?skin=${s}`, { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 1300));
    const f = await p.evaluate(() => new Promise((res) => {
      let n = 0; const t0 = performance.now();
      const t = () => { n += 1; performance.now() - t0 < 2000 ? requestAnimationFrame(t) : res(Math.round(n * 1000 / (performance.now() - t0))); };
      requestAnimationFrame(t);
    }));
    if (f > best[s]) best[s] = f;
  }
  return best;
};
const anime = await mesurer(false, 6);
const fige = await mesurer(true, 2);
for (const s of SKINS) console.log(`${s.padEnd(7)} ${String(anime[s]).padStart(3)} fps   (plafond mouvement réduit ${fige[s]})`);
await b.close();
