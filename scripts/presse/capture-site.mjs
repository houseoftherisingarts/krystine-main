#!/usr/bin/env node
// ─── Les captures du site, pour les cartes de la salle de presse ─────
//   node scripts/presse/capture-site.mjs
//
// Sept pages du site en ligne, prises en 1920 × 1080, à la taille exacte
// d'une carte du kit. Elles se rangent dans scripts/presse/captures/ pour
// que build-kit.mjs n'ait besoin ni d'un serveur ni du réseau.
//
// Les pages V2 défilent par Lenis, alors un scrollIntoView ne bouge rien :
// le défilement passe par la molette, un tour à la fois.
//
// `node scripts/presse/capture-site.mjs --sonde` prend une capture tous
// les deux tours de molette sur chaque page, pour choisir le bon endroit
// à l'oeil sur une planche-contact.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'captures');
const BASE = process.env.KSL_BASE || 'https://www.krystinestlaurent.ca';

// Le nombre de tours de molette a été choisi à la sonde, puis vérifié à
// l'oeil : chaque page s'arrête là où elle montre le plus de sa matière.
const PAGES = [
  { nom: 'accueil', url: '/accueil', tours: 0, attente: 6000 },
  { nom: 'krystine', url: '/krystine', tours: 0, attente: 5000, ancre: 'Krystine' },
  { nom: 'conferences', url: '/conferenciere', tours: 6, attente: 5000, ancre: 'Krystine' },
  { nom: 'formations', url: '/formations', tours: 2, attente: 5000 },
  { nom: 'medias', url: '/medias', tours: 0, attente: 5000, ancre: 'médias' },
  { nom: 'boutique', url: '/boutique', tours: 2, attente: 6000 },
  { nom: 'origine', url: '/origine', tours: 2, attente: 6000 },
];

const SONDE = process.argv.includes('--sonde');
const SEUL = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();

for (const p of SEUL.length ? PAGES.filter(p => SEUL.includes(p.nom)) : PAGES) {
  // Un onglet neuf par page : en réutilisant le même, le voile de
  // transition du site restait en place et la troisième capture sortait
  // blanche alors que le texte était bien dans le DOM.
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  // Le bandeau de consentement se règle d'avance dans le stockage local,
  // sinon il barre le bas de chaque capture.
  await page.addInitScript(() => {
    try {
      localStorage.setItem('ksl.consent', 'accepted');
      localStorage.setItem('consent', 'accepted');
      localStorage.setItem('cookieConsent', 'accepted');
    } catch { /* stockage refusé : le bandeau se cache plus bas */ }
  });
  await page.goto(BASE + p.url, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  if (p.ancre) {
    await page.waitForFunction(
      // innerText rend le texte AFFICHÉ : une ligne en petites capitales
      // CSS sort en majuscules, d'où la comparaison sans casse.
      mot => document.body.innerText.toLowerCase().includes(mot.toLowerCase()),
      p.ancre,
      { timeout: 45000 },
    ).catch(() => {});
  }
  await page.waitForTimeout(p.attente ?? 4000);

  const poser = async () => {
    await page.waitForTimeout(1200);
    await page.addStyleTag({
      content: `
        header, nav, [class*="onsent"], [class*="ookie"] { visibility: hidden !important; }
        [data-vexel-collant], .vexel-collant { visibility: hidden !important; }
      `,
    }).catch(() => {});
    // Tout ce qui flotte par-dessus la page se cache juste avant la
    // capture, sauf le conteneur du défilement souple, qui est fixe lui
    // aussi et tient toute la fenêtre.
    await page.evaluate(() => {
      const plein = window.innerWidth * window.innerHeight * 0.6;
      document.querySelectorAll('body *').forEach(el => {
        if (getComputedStyle(el).position !== 'fixed') return;
        const r = el.getBoundingClientRect();
        if (r.width * r.height < plein) el.style.visibility = 'hidden';
      });
    }).catch(() => {});
    // Une image paresseuse sans src ne résout jamais son decode() : la
    // course contre un chronomètre évite l'attente sans fin.
    await page.evaluate(() => Promise.race([
      Promise.all([...document.images].map(i => (i.complete ? null : i.decode().catch(() => null)))),
      new Promise(r => setTimeout(r, 6000)),
    ])).catch(() => {});
  };

  if (SONDE) {
    for (let t = 0; t <= 16; t += 2) {
      if (t) for (let i = 0; i < 2; i += 1) { await page.mouse.wheel(0, 700); await page.waitForTimeout(180); }
      await poser();
      await page.screenshot({ path: path.join(OUT, `sonde-${p.nom}-${String(t).padStart(2, '0')}.png`), animations: 'disabled' });
    }
    console.log(`  sonde ${p.nom} : 9 captures`);
    await page.close();
    continue;
  }

  const dest = path.join(OUT, `${p.nom}.png`);
  let essai = 0;
  for (;;) {
    for (let i = 0; i < (p.tours ?? 0); i += 1) {
      await page.mouse.wheel(0, 700);
      await page.waitForTimeout(190);
    }
    await poser();
    await page.screenshot({ path: dest, animations: 'disabled' });
    const poids = fs.statSync(dest).size;
    // Une page unie sort à quelques kilo-octets : c'est le voile de
    // transition resté en place, et un rectangle crème n'a rien à faire
    // dans un kit de presse.
    if (poids > 70000) {
      console.log(`  captures/${p.nom}.png ← ${p.url} (${p.tours ?? 0} tours, ${Math.round(poids / 1024)} ko)`);
      break;
    }
    essai += 1;
    if (essai > 3) throw new Error(`${p.nom} : la page reste unie après quatre essais`);
    console.log(`     page unie (${poids} o), essai ${essai + 1}`);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout((p.attente ?? 4000) + 3000 * essai);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(700);
  }
  await page.close();
}

await browser.close();
