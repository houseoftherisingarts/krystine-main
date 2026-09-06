// A/B honnête : le même skin, la même page, une fois avec les motifs qui
// tournent et une fois sous « mouvement réduit » (tout est arrêté). L'écart
// entre les deux, c'est le coût réel des motifs. « nuit » sert de témoin.
import { chromium } from 'playwright';
const SKINS = ['nuit', 'ocean', 'encre', 'lotus', 'or-pur'];
const PASSES = 3;
const b = await chromium.launch();

const mesurerTout = async (reduit) => {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: reduit ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage();
  const best = Object.fromEntries(SKINS.map((s) => [s, 0]));
  for (let i = 0; i < PASSES; i += 1) {
    for (const s of SKINS) {
      await p.goto(`http://localhost:5302/demo-skins?skin=${s}`, { waitUntil: 'domcontentloaded' });
      await new Promise((r) => setTimeout(r, 1300));
      const f = await p.evaluate(() => new Promise((res) => {
        let n = 0; const t0 = performance.now();
        const t = () => { n += 1; performance.now() - t0 < 2000 ? requestAnimationFrame(t) : res(Math.round(n * 1000 / (performance.now() - t0))); };
        requestAnimationFrame(t);
      }));
      if (f > best[s]) best[s] = f;
    }
  }
  await ctx.close();
  return best;
};

const anime = await mesurerTout(false);
const fige = await mesurerTout(true);
console.log('plafond machine (mouvement réduit) :', JSON.stringify(fige));
console.log('avec les motifs                    :', JSON.stringify(anime));
for (const s of SKINS) console.log(`  ${s.padEnd(7)} ${String(anime[s]).padStart(3)} / ${String(fige[s]).padStart(3)} fps  →  ${Math.round((anime[s] / fige[s]) * 100)} % du plafond`);
await b.close();
