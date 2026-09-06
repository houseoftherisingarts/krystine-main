import { chromium } from 'playwright';
const mesure = () => new Promise(res => {
  let n = 0; const t0 = performance.now();
  const tick = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(tick); else res(+(n / ((performance.now() - t0) / 1000)).toFixed(1)); };
  requestAnimationFrame(tick);
});
for (const args of [[], ['--use-gl=angle', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist']]) {
  const nav = await chromium.launch({ args });
  const page = await nav.newPage({ viewport: { width: 1440, height: 900 } });
  const out = {};
  for (const s of ['nuit', 'aurore', 'kapha', 'vata', 'pitta']) {
    await page.goto(`http://localhost:5301/demo-skins?skin=${s}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1400);
    out[s] = await page.evaluate(mesure);
  }
  console.log(args.length ? 'GPU flags' : 'défaut', out);
  await nav.close();
}
