import { chromium } from 'playwright';
const mesure = () => new Promise(res => {
  let n = 0; const t0 = performance.now();
  const tick = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(tick); else res(+(n / ((performance.now() - t0) / 1000)).toFixed(1)); };
  requestAnimationFrame(tick);
});
const GPU = ['--use-gl=angle', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'];
const nav = await chromium.launch({ args: GPU });
for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  const page = await nav.newPage({ viewport: vp });
  const out = {};
  for (const s of ['nuit', 'vata', 'pitta', 'kapha', 'aurore']) {
    await page.goto(`http://localhost:5301/demo-skins?skin=${s}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    await page.evaluate(mesure);            // chauffe
    out[s] = await page.evaluate(mesure);   // mesure
  }
  console.log(`${vp.width}x${vp.height}`, out);
  await page.close();
}
await nav.close();
