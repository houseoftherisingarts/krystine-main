// QA : les dix-neuf skins, l'un après l'autre, sur la maquette /demo-skins.
// Trois choses par skin : une capture en 1440x900, les images par seconde
// mesurées sur trois secondes, et le contraste WCAG de tout ce qui porte du
// texte (boutons, solde, libellés, cartes, onglets). Aucun compte, aucun accès
// Firestore : la maquette montre la bannière, les chiffres, les cartes et les
// boutons du vrai espace.
//
//   node scripts/qa/skins-tous.mjs            → les dix-neuf
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
const TOUS = ['defaut', 'medzo', 'nuit', 'coffee', 'aube', 'terre', 'foret', 'ocean', 'encre',
  'lotus', 'feminite', 'nature', 'teal-orange', 'aurore', 'or-pur', 'golden-hour',
  'vata', 'pitta', 'kapha'];
const SKINS = process.argv.slice(2).length ? process.argv.slice(2) : TOUS;
const PLANCHER_FPS = 50;

// Le contraste, mesuré dans la page. La couleur de fond réelle se reconstitue
// en remontant les ancêtres et en superposant chaque fond translucide, jusqu'au
// premier opaque. La scène animée et la vidéo vivent DERRIÈRE cette pile, donc
// ce que la mesure rend est le plancher : le pire cas, celui où la scène
// n'ajoute aucune lumière. C'est exactement la garantie qu'on veut.
const MESURE_CONTRASTE = () => {
  const lum = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  const parse = (s) => {
    const m = /rgba?\(([^)]+)\)/.exec(s || '');
    if (!m) return null;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  };
  const poser = (dessus, dessous) => {
    const a = dessus[3];
    return [
      dessus[0] * a + dessous[0] * (1 - a),
      dessus[1] * a + dessous[1] * (1 - a),
      dessus[2] * a + dessous[2] * (1 - a), 1];
  };
  const fondReel = (el) => {
    const pile = [];
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const st = getComputedStyle(n);
      const c = parse(st.backgroundColor);
      if (c && c[3] > 0.001) { pile.push(c); if (c[3] >= 0.999) break; }
    }
    const racine = parse(getComputedStyle(document.body).backgroundColor) || [255, 255, 255, 1];
    let out = racine[3] >= 0.999 ? racine : [255, 255, 255, 1];
    for (let i = pile.length - 1; i >= 0; i--) out = poser(pile[i], out);
    return out;
  };

  const skin = document.querySelector('[class*="skin-"]');
  if (!skin) return { pire: null, echecs: [] };
  const echecs = [];
  let pire = null;

  for (const el of skin.querySelectorAll('*')) {
    // Le bandeau de témoins n'appartient pas au skin, et le texte posé sur la
    // photo de bannière n'a pas de fond calculable : ni l'un ni l'autre ne dit
    // quoi que ce soit sur la lisibilité du skin.
    if (el.closest('.fixed') || el.querySelector('img') || el.closest('.h-56')) continue;
    const texte = Array.from(el.childNodes)
      .filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
    if (texte.length < 2) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;

    const st = getComputedStyle(el);
    if (st.visibility === 'hidden' || st.opacity === '0') continue;
    // Un libellé peint en background-clip:text n'a pas de couleur lisible ici.
    if (st.webkitTextFillColor === 'rgba(0, 0, 0, 0)') continue;
    const avant = parse(st.color);
    if (!avant) continue;
    const fond = fondReel(el);
    const dev = avant[3] >= 0.999 ? avant : poser(avant, fond);
    const l1 = lum(dev), l2 = lum(fond);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

    const px = parseFloat(st.fontSize);
    const gras = parseInt(st.fontWeight, 10) >= 700;
    const bouton = el.tagName === 'BUTTON' || el.tagName === 'A' || !!el.closest('button, a');
    // WCAG : 3 pour le grand texte et pour les libellés d'interface, 4,5 sinon.
    const seuil = (bouton || px >= 24 || (px >= 18.66 && gras)) ? 3 : 4.5;
    const ligne = { texte: texte.slice(0, 34), ratio: Math.round(ratio * 100) / 100, seuil, px: Math.round(px) };
    if (!pire || ratio / seuil < pire.ratio / pire.seuil) pire = ligne;
    if (ratio < seuil) echecs.push(ligne);
  }
  return { pire, echecs };
};

mkdirSync(SORTIE, { recursive: true });
const navigateur = await chromium.launch({ args: ARGS });
const ctx = await navigateur.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
// Le bandeau de témoins couvrait le coin bas droit de toutes les captures.
await ctx.addInitScript(() => {
  try { localStorage.setItem('inspirata.consent.v1', 'rejected'); } catch { /* mode privé */ }
});
const page = await ctx.newPage();
page.on('pageerror', e => console.log(`  [erreur] ${e.message}`));

const lents = [];
const illisibles = [];
console.log('skin           fps   contraste le plus bas');
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

  const { pire, echecs } = await page.evaluate(MESURE_CONTRASTE);
  if (fps < PLANCHER_FPS) lents.push(`${skin}=${fps}`);
  if (echecs.length) illisibles.push({ skin, echecs });
  const bas = pire ? `${pire.ratio.toFixed(2)} / ${pire.seuil}  « ${pire.texte} »` : 'rien à mesurer';
  console.log(`${skin.padEnd(13)} ${String(fps).padStart(4)}   ${bas}${echecs.length ? `   ← ${echecs.length} SOUS LA BARRE` : ''}`);
}

await navigateur.close();

if (illisibles.length) {
  console.log('\nCe qui passe sous la barre WCAG :');
  for (const { skin, echecs } of illisibles) {
    for (const e of echecs) console.log(`  ${skin.padEnd(13)} ${e.ratio.toFixed(2)} < ${e.seuil}  ${e.px}px  « ${e.texte} »`);
  }
}
console.log(`\nCaptures : ${SORTIE}`);
console.log(lents.length ? `FPS sous ${PLANCHER_FPS} : ${lents.join(', ')}` : `Images par seconde : tous au-dessus de ${PLANCHER_FPS}.`);
console.log(illisibles.length ? `Contraste : ${illisibles.length} skin(s) à corriger.` : 'Contraste : tout passe.');
process.exit(lents.length || illisibles.length ? 1 : 0);
