// QA des scènes de skins : capture chaque skin à deux instants, mesure les fps,
// puis capture la souris au centre et le survol du bouton « Ouvrir le coffre ».
import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = process.argv[2] || '/tmp/qa-effets';
const SKINS = ['vata', 'pitta', 'kapha', 'aurore'];
const TAILLES = [
  { nom: 'desk', width: 1440, height: 900 },
  { nom: 'mob', width: 390, height: 844 },
];
fs.mkdirSync(OUT, { recursive: true });

const nav = await chromium.launch();
const rapport = [];

for (const t of TAILLES) {
  const ctx = await nav.newContext({ viewport: { width: t.width, height: t.height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });

  for (const skin of SKINS) {
    await page.goto(`http://localhost:5301/demo-skins?skin=${skin}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('canvas[aria-hidden]', { timeout: 8000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/${skin}-${t.nom}-1500ms.png` });
    const a = await page.evaluate(() => {
      const c = document.querySelector('canvas[aria-hidden]');
      return c ? c.toDataURL().length : 0;
    });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/${skin}-${t.nom}-4000ms.png` });
    const b = await page.evaluate(() => {
      const c = document.querySelector('canvas[aria-hidden]');
      return c ? c.toDataURL() : '';
    });

    // Souris au centre, puis survol du bouton « Ouvrir le coffre ».
    await page.mouse.move(t.width / 2, t.height / 2, { steps: 12 });
    await page.waitForTimeout(500);
    await page.mouse.move(t.width / 2 + 120, t.height / 2 - 60, { steps: 14 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/${skin}-${t.nom}-souris.png` });

    const bouton = page.getByRole('button', { name: /Ouvrir le coffre/i }).first();
    await bouton.scrollIntoViewIfNeeded();
    await bouton.hover();
    await page.waitForTimeout(260);
    await page.screenshot({ path: `${OUT}/${skin}-${t.nom}-survol.png` });
    await bouton.click({ trial: false });
    await page.waitForTimeout(220);
    await page.screenshot({ path: `${OUT}/${skin}-${t.nom}-clic.png` });

    // FPS sur 2 s, et coût moyen d'une image.
    const perf = await page.evaluate(() => new Promise(res => {
      let n = 0; const t0 = performance.now(); let last = t0; let pire = 0;
      const tick = () => {
        const now = performance.now();
        const d = now - last; last = now;
        if (n > 2) pire = Math.max(pire, d);
        n++;
        if (now - t0 < 2000) requestAnimationFrame(tick);
        else res({ fps: +(n / ((now - t0) / 1000)).toFixed(1), pire: +pire.toFixed(1) });
      };
      requestAnimationFrame(tick);
    }));

    rapport.push({ skin, taille: t.nom, fps: perf.fps, pireImage: perf.pire, bouge: a !== b.length, erreurs: erreurs.length });
  }
  await ctx.close();
}
await nav.close();
console.table(rapport);
