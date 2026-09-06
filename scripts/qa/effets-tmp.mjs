// QA des scènes de skins : capture chaque skin à deux instants (le mouvement
// doit se voir entre les deux), souris au centre, survol et clic du bouton
// « Ouvrir le coffre ». Mesure les fps et le temps processeur réellement pris.
import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = process.argv[2] || '/tmp/qa-effets';
const SKINS = ['vata', 'pitta', 'kapha', 'aurore'];
const TAILLES = [
  { nom: 'desk', width: 1440, height: 900 },
  { nom: 'mob', width: 390, height: 844 },
];
fs.mkdirSync(OUT, { recursive: true });

const mesureFps = () => new Promise(res => {
  let n = 0; const t0 = performance.now(); let last = t0; let pire = 0;
  const tick = () => {
    const now = performance.now();
    if (n > 3) pire = Math.max(pire, now - last);
    last = now; n++;
    if (now - t0 < 2000) requestAnimationFrame(tick);
    else res({ fps: +(n / ((now - t0) / 1000)).toFixed(1), pire: +pire.toFixed(1) });
  };
  requestAnimationFrame(tick);
});

const nav = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const rapport = [];

for (const t of TAILLES) {
  const ctx = await nav.newContext({ viewport: { width: t.width, height: t.height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  const cpu = async () => (await cdp.send('Performance.getMetrics')).metrics.find(m => m.name === 'TaskDuration').value;

  for (const skin of SKINS) {
    const erreurs = [];
    page.on('pageerror', e => erreurs.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });

    await page.goto(`http://localhost:5301/demo-skins?skin=${skin}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('canvas[aria-hidden]', { timeout: 8000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/${skin}-${t.nom}-1500ms.png` });
    const a = await page.evaluate(() => document.querySelector('canvas[aria-hidden]').toDataURL());
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/${skin}-${t.nom}-4000ms.png` });
    const b = await page.evaluate(() => document.querySelector('canvas[aria-hidden]').toDataURL());

    await page.mouse.move(t.width / 2, t.height / 2, { steps: 14 });
    await page.waitForTimeout(450);
    await page.mouse.move(t.width / 2 + 130, t.height / 2 - 70, { steps: 16 });
    await page.waitForTimeout(420);
    await page.screenshot({ path: `${OUT}/${skin}-${t.nom}-souris.png` });

    const bouton = page.getByRole('button', { name: /Ouvrir le coffre/i }).first();
    await bouton.scrollIntoViewIfNeeded();
    await bouton.hover();
    await page.waitForTimeout(280);
    await page.screenshot({ path: `${OUT}/${skin}-${t.nom}-survol.png` });
    await bouton.click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${OUT}/${skin}-${t.nom}-clic.png` });

    // Le bouton de près, pour juger le survol propre à chaque skin.
    const box = await bouton.boundingBox();
    await bouton.hover();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/${skin}-${t.nom}-bouton.png`,
      clip: { x: box.x - 26, y: box.y - 22, width: box.width + 52, height: box.height + 44 } });

    // Ce qui est accroché à l'écran doit suivre le défilement.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/${skin}-${t.nom}-defile.png` });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);

    await page.evaluate(mesureFps);              // chauffe
    const c0 = await cpu();
    const perf = await page.evaluate(mesureFps); // mesure
    const coeur = +(((await cpu()) - c0) / 2 * 100).toFixed(1);

    rapport.push({ skin, taille: t.nom, fps: perf.fps, pireImg: perf.pire, cpuPct: coeur, bouge: a !== b, err: erreurs.length });
  }
  await ctx.close();
}

// Moins d'animations : la scène doit se peindre une fois et ne plus bouger.
const ctxCalme = await nav.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const pc = await ctxCalme.newPage();
for (const skin of SKINS) {
  await pc.goto(`http://localhost:5301/demo-skins?skin=${skin}`, { waitUntil: 'domcontentloaded' });
  await pc.waitForSelector('canvas[aria-hidden]');
  await pc.waitForTimeout(1200);
  const a = await pc.evaluate(() => document.querySelector('canvas[aria-hidden]').toDataURL());
  await pc.waitForTimeout(1500);
  const b = await pc.evaluate(() => document.querySelector('canvas[aria-hidden]').toDataURL());
  await pc.screenshot({ path: `${OUT}/${skin}-calme.png` });
  rapport.push({ skin, taille: 'calme', fps: 0, pireImg: 0, cpuPct: 0, bouge: a !== b, err: 0 });
}
await ctxCalme.close();
await nav.close();
console.table(rapport);
