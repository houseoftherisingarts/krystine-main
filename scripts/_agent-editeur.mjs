// Vérification du mode éditeur universel — /foyer et /formations.
// Dev-admin (?unlock=...) active __devAdmin ET __localOverrides ensemble :
// tout le brouillon et la publication restent dans localStorage de ce
// contexte Playwright, aucune écriture ne touche le Firestore réel.
// Script jetable, supprimé à la fin de la vérification (voir CLAUDE.md).
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = 'http://localhost:3032';
const OUT = 'scripts/qa/shots-editeur';
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { w: 1440, h: 900, tag: '1440' },
  { w: 390, h: 844, tag: '390' },
];

const PAGES = [
  {
    // Le hero et la section prix de /foyer vivent sous des calques au
    // scroll (STANZAS, révélation du prix) qui laissent des div plein
    // écran en z-10 par-dessus même à opacité 0 — interception de clic
    // dans Playwright, pas un bug du mode éditeur. FINAL.title, tout en
    // bas, est un simple whileInView (une fois, rien par-dessus) : cible sûre.
    url: '/foyer',
    selector: 'h2',
    match: 'Plus on nous montre, moins on voit.',
    newText: 'Plus on nous montre, moins on voit (texte de vérification).',
  },
  {
    url: '/formations',
    selector: 'h2',
    match: 'Le programme Vata se suit dès maintenant. Les autres reviennent une à une.',
    newText: 'Le programme Vata se suit dès maintenant (texte de vérification).',
  },
];

const browser = await chromium.launch();
const rapport = [];

async function selectAllAndType(page, texte) {
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await page.waitForTimeout(120);
  await page.keyboard.type(texte, { delay: 12 });
  await page.waitForTimeout(150);
}

for (const vp of VIEWPORTS) {
  for (const pg of PAGES) {
    const slug = pg.url.slice(1);
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    await ctx.addInitScript(() => {
      try {
        localStorage.setItem('krystine-lang', 'fr');
        localStorage.setItem('consent-v1', 'accepted');
      } catch { /* noop */ }
    });
    const page = await ctx.newPage();
    const erreurs = [];
    page.on('pageerror', e => erreurs.push(e.message.slice(0, 160)));

    // 1) Déverrouille le dev-admin (met __devAdmin + __localOverrides), puis
    //    recharge sur la même page avec ?edit=1 pour entrer en mode éditeur.
    await page.goto(`${BASE}${pg.url}?unlock=Alexisthebest2121!`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1400);
    await page.goto(`${BASE}${pg.url}?edit=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1800);

    let headingLoc = page.locator(pg.selector, { hasText: pg.match }).first();
    await headingLoc.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    let handle = await headingLoc.elementHandle();

    // 2) Survol : le crayon paraît
    await handle.hover();
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${OUT}/${slug}-${vp.tag}-01-survol-crayon.png` });

    // 3) Clic -> édition en place (contentEditable), sélection puis frappe
    await handle.click();
    await page.waitForTimeout(250);
    await selectAllAndType(page, pg.newText);
    await page.screenshot({ path: `${OUT}/${slug}-${vp.tag}-02-edition.png` });

    // 4) Entrée -> valide (brouillon local, pas encore publié)
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);

    // 5) La barre, avec Publier (1)
    await page.waitForSelector('button:has-text("Publier")', { timeout: 5000 }).catch(() => {});
    await page.screenshot({ path: `${OUT}/${slug}-${vp.tag}-03-barre-publier.png` });
    const boutonPublier = page.locator('button', { hasText: /^Publier/ }).first();
    const texteBouton = (await boutonPublier.textContent().catch(() => '')).trim();

    // 6) Publier
    await boutonPublier.click();
    await page.waitForTimeout(1200);

    // 7) Recharger SANS le mode : le nouveau texte doit être là
    await page.goto(`${BASE}${pg.url}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const presentApresPublication = await page.locator(pg.selector, { hasText: pg.newText }).count();

    // 8) Remettre le texte d'origine et publier (nettoyage)
    await page.goto(`${BASE}${pg.url}?edit=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1800);
    headingLoc = page.locator(pg.selector, { hasText: pg.newText }).first();
    await headingLoc.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    handle = await headingLoc.elementHandle();
    await handle.click();
    await page.waitForTimeout(250);
    await selectAllAndType(page, pg.match);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);
    await page.locator('button', { hasText: /^Publier/ }).first().click();
    await page.waitForTimeout(1200);

    // Vérifie que le texte d'origine est bien revenu après le nettoyage
    await page.goto(`${BASE}${pg.url}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    const origineRevenue = await page.locator(pg.selector, { hasText: pg.match }).count();

    rapport.push({
      page: pg.url, viewport: vp.tag,
      boutonPublier: texteBouton,
      texteApresPublicationEtRechargeSansMode: presentApresPublication > 0,
      texteOrigineRevenuApresNettoyage: origineRevenue > 0,
      erreursConsole: erreurs,
    });

    await ctx.close();
  }
}

await browser.close();
console.log(JSON.stringify(rapport, null, 2));
