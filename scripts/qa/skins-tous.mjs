// QA : les dix-sept skins, l'un après l'autre, sur la maquette /demo-skins.
// Une capture par skin en 1440x900, plus les images par seconde mesurées sur
// trois secondes. Aucun compte, aucun accès Firestore : la maquette montre la
// bannière, les chiffres, les cartes et les boutons du vrai espace.
//
//   node scripts/qa/skins-tous.mjs            → les dix-sept
//   node scripts/qa/skins-tous.mjs vata kapha → seulement ceux-là
//   SORTIE=/chemin node scripts/qa/skins-tous.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

// Sans ces trois drapeaux, Chromium sans tête plafonne à trente images par
// seconde et toutes les scènes se ressemblent. Débridé, une page vide monte à
// plus de quatre cents : le chiffre mesure alors le vrai coût de la scène.
const ARGS = ['--disable-gpu-vsync', '--disable-frame-rate-limit', '--disable-features=CalculateNativeWinOcclusion'];

const BASE = process.env.BASE || 'http://localhost:5199';
const SORTIE = process.env.SORTIE || 'scripts/qa/shots/skins';
const TOUS = ['medzo', 'nuit', 'coffee', 'aube', 'terre', 'foret', 'ocean', 'encre',
  'lotus', 'feminite', 'nature', 'aurore', 'or-pur', 'golden-hour', 'vata', 'pitta', 'kapha'];
const SKINS = process.argv.slice(2).length ? process.argv.slice(2) : TOUS;
const PLANCHER = 50;

mkdirSync(SORTIE, { recursive: true });
const navigateur = await chromium.launch({ args: ARGS });
const ctx = await navigateur.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on('pageerror', e => console.log(`  [erreur] ${e.message}`));

const lents = [];
for (const skin of SKINS) {
  await page.goto(`${BASE}/demo-skins?skin=${skin}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${SORTIE}/${skin}.png` });

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

  if (fps < PLANCHER) lents.push(`${skin}=${fps}`);
  console.log(`${skin.padEnd(12)} ${String(fps).padStart(3)} fps ${fps >= PLANCHER ? '' : '← TROP BAS'}`);
}

await navigateur.close();
console.log(`\nCaptures : ${SORTIE}`);
console.log(lents.length ? `ÉCHEC : ${lents.join(', ')}` : `Tous au-dessus de ${PLANCHER} fps.`);
process.exit(lents.length ? 1 : 0);
