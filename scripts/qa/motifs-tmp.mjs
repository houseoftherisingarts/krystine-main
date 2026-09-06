// QA temporaire des motifs de skins. Lance Vite sur 5302 avant de l'appeler.
// node scripts/qa/motifs-tmp.mjs [tour]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const tour = process.argv[2] || '1';
const SKINS = ['ocean', 'encre', 'lotus', 'or-pur'];
const ECRANS = [
  { nom: 'desktop', width: 1440, height: 900 },
  { nom: 'mobile', width: 390, height: 844 },
];
const DOSSIER = `scripts/qa/out/tour${tour}`;
mkdirSync(DOSSIER, { recursive: true });

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const navigateur = await chromium.launch();
const fps = {};

for (const ecran of ECRANS) {
  const ctx = await navigateur.newContext({ viewport: { width: ecran.width, height: ecran.height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()); });

  for (const skin of SKINS) {
    await page.goto(`http://localhost:5302/demo-skins?skin=${skin}`, { waitUntil: 'domcontentloaded' });
    await dormir(1800);
    await page.screenshot({ path: `${DOSSIER}/${skin}-${ecran.nom}-1500ms.png` });
    await dormir(2500);
    await page.screenshot({ path: `${DOSSIER}/${skin}-${ecran.nom}-4000ms.png` });

    // Survol du bouton doré « Ouvrir le coffre » puis d'une carte interne.
    const bouton = page.getByRole('button', { name: /Ouvrir le coffre/ });
    if (await bouton.count()) {
      await bouton.first().hover();
      await dormir(450);
      await page.screenshot({ path: `${DOSSIER}/${skin}-${ecran.nom}-survol-bouton.png` });
    }
    const carte = page.locator('.rounded-\\[18px\\]').first();
    if (await carte.count()) {
      await carte.hover({ position: { x: 20, y: 12 } });
      await dormir(900);
      await page.screenshot({ path: `${DOSSIER}/${skin}-${ecran.nom}-survol-carte.png` });
    }

    if (ecran.nom === 'desktop') {
      fps[skin] = await page.evaluate(() => new Promise((res) => {
        let n = 0;
        const t0 = performance.now();
        const tic = () => {
          n += 1;
          if (performance.now() - t0 < 2000) requestAnimationFrame(tic);
          else res(Math.round((n * 1000) / (performance.now() - t0)));
        };
        requestAnimationFrame(tic);
      }));
    }
  }
  if (erreurs.length) console.log(`Erreurs ${ecran.nom} :`, erreurs.slice(0, 6));
  await ctx.close();
}

console.log('fps desktop :', JSON.stringify(fps));
console.log('captures dans', DOSSIER);
await navigateur.close();
