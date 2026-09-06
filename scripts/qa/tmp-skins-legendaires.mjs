// Vérification temporaire des trois skins légendaires (Vata, Pitta, Kapha).
// Ouvre /demo-skins?skin=<cle> en 1440x900 et en 390x844, laisse la scène
// s'installer, capture, promène la souris en cercle, capture encore, puis
// compte les images pendant trois secondes. À supprimer une fois le chantier
// terminé.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:5199';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/skins-legendaires';
const SKINS = ['vata', 'pitta', 'kapha'];
const ECRANS = [
  { nom: 'desktop', width: 1440, height: 900 },
  { nom: 'mobile', width: 390, height: 844 },
];

mkdirSync(OUT, { recursive: true });

const navigateur = await chromium.launch();
const resultats = [];

for (const ecran of ECRANS) {
  const ctx = await navigateur.newContext({ viewport: { width: ecran.width, height: ecran.height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') console.log(`  [console] ${m.text()}`); });
  page.on('pageerror', e => console.log(`  [pageerror] ${e.message}`));

  for (const skin of SKINS) {
    await page.goto(`${BASE}/demo-skins?skin=${skin}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `${OUT}/${skin}-${ecran.nom}-repos.png` });

    // La souris tourne en cercle au milieu de l'écran : c'est le geste que la
    // scène doit sentir (tourbillon, fuite des braises, ondulation).
    const cx = ecran.width / 2, cy = ecran.height / 2;
    const r = Math.min(ecran.width, ecran.height) * 0.28;
    for (let i = 0; i <= 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      await page.mouse.move(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      await page.waitForTimeout(22);
    }
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/${skin}-${ecran.nom}-souris.png` });

    const fps = await page.evaluate(() => new Promise(res => {
      let n = 0;
      const t0 = performance.now();
      const tick = () => {
        n++;
        if (performance.now() - t0 < 3000) requestAnimationFrame(tick);
        else res(Math.round((n / (performance.now() - t0)) * 1000));
      };
      requestAnimationFrame(tick);
    }));

    resultats.push({ skin, ecran: ecran.nom, fps });
    console.log(`${skin.padEnd(6)} ${ecran.nom.padEnd(8)} ${String(fps).padStart(3)} fps ${fps >= 50 ? 'OK' : 'TROP BAS'}`);
  }
  await ctx.close();
}

await navigateur.close();
const bas = resultats.filter(r => r.fps < 50);
console.log(`\nCaptures : ${OUT}`);
console.log(bas.length ? `ÉCHEC : ${bas.map(r => `${r.skin}/${r.ecran}=${r.fps}`).join(', ')}` : 'Tous au-dessus de 50 fps.');
process.exit(bas.length ? 1 : 0);
