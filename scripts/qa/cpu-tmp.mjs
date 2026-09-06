// Coût CPU réel, indépendant de la charge de la machine : on lit les compteurs
// du moteur de rendu (script, style, mise en page, peinture) sur 6 secondes.
// « nuit » est le témoin, sans aucun motif. Le reste est le prix des motifs.
import { chromium } from 'playwright';
const SKINS = ['nuit', 'ocean', 'encre', 'lotus', 'or-pur'];
const CHAMPS = ['ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration', 'TaskDuration'];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Performance.enable');
const lire = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.filter((m) => CHAMPS.includes(m.name)).map((m) => [m.name, m.value]));
for (const s of SKINS) {
  await p.goto(`http://localhost:5302/demo-skins?skin=${s}`, { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 2000));
  const a = await lire();
  const t0 = Date.now();
  await new Promise((r) => setTimeout(r, 6000));
  const dt = (Date.now() - t0) / 1000;
  const z = await lire();
  const part = (n) => ((z[n] - a[n]) / dt * 100);
  console.log(`${s.padEnd(7)} tâche ${part('TaskDuration').toFixed(1).padStart(5)} %  · script ${part('ScriptDuration').toFixed(1).padStart(4)} %  · style ${part('RecalcStyleDuration').toFixed(1).padStart(4)} %  · layout ${part('LayoutDuration').toFixed(1).padStart(4)} %  (d'un cœur)`);
}
await b.close();
