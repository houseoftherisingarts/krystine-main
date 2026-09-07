// Script temporaire d'agent : login admin, vérifie le catalogue de
// formations (masterclass Gestion du stress) et l'état live de
// settings/recompenses, puis captures 1440/390 des pages touchées.
// À supprimer en fin de tâche.
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = 'http://localhost:3022';
const OUT = 'scripts/qa/shots';
fs.mkdirSync(OUT, { recursive: true });
const ADMIN_EMAIL = 'admin@krystinestlaurent.ca';
const ADMIN_PW = fs.readFileSync(process.env.HOME + '/.claude/scripts/.krystine_admin_pw', 'utf8').trim();

const browser = await chromium.launch();

async function shot(page, route, w, h, name, opts = {}) {
  const ctx = page.context();
  await ctx.addInitScript((l) => { try { localStorage.setItem('krystine-lang', l); } catch {} }, 'fr');
  await page.setViewportSize({ width: w, height: h });
  await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(opts.wait || 2500);
  if (opts.full) {
    // Défile en douceur pour déclencher les reveals au scroll (whileInView)
    // avant la capture pleine page, sinon les sections hors écran restent
    // à opacity:0 sur la capture.
    const height = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < height; y += Math.round(h * 0.8)) {
      await page.evaluate((py) => window.scrollTo(0, py), y);
      await page.waitForTimeout(220);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: `${OUT}/${name}-${w}.png`, fullPage: !!opts.full });
}

// ── Admin session ──────────────────────────────────────────────────────────
const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const admin = await adminCtx.newPage();
admin.on('console', m => { if (m.type() === 'error') console.log('[console]', m.text()); });
await admin.goto(BASE + '/admin', { waitUntil: 'domcontentloaded' });
await admin.waitForTimeout(1500);
// Bascule sur l'onglet Email si nécessaire.
const emailTab = admin.getByRole('button', { name: 'Email' });
if (await emailTab.count()) await emailTab.click();
await admin.waitForTimeout(300);
await admin.locator('input[type="email"]').fill(ADMIN_EMAIL);
await admin.locator('input[type="password"]').fill(ADMIN_PW);
await admin.locator('button[type="submit"]').click();
await admin.waitForTimeout(3000);
console.log('URL après login admin:', admin.url());
await admin.screenshot({ path: `${OUT}/agent-admin-apres-login.png` });

// Formations : cherche « stress » / « aromathérapie ».
try {
  await admin.goto(BASE + '/admin', { waitUntil: 'domcontentloaded' });
  await admin.waitForTimeout(1500);
  const clicked = await admin.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter(b => b.querySelector('i.fa-graduation-cap'));
    // Le premier bouton est l'en-tête de groupe (replie/déplie), le second est
    // l'item de nav « Formations » lui-même (même icône, même libellé).
    const target = btns[1] || btns[0];
    if (target) { target.click(); return btns.length; }
    return 0;
  });
  console.log('boutons fa-graduation-cap trouvés:', clicked);
  await admin.waitForTimeout(1800);
  const bodyText = await admin.locator('body').innerText();
  const hit = /stress|aromath/i.test(bodyText);
  console.log('=== FORMATIONS: mention stress/aromathérapie dans /admin?', hit, '===');
  fs.writeFileSync(`${OUT}/agent-formations-texte.txt`, bodyText.slice(0, 20000));
  await admin.screenshot({ path: `${OUT}/agent-admin-formations.png`, fullPage: true });
} catch (e) { console.log('formations check failed', e.message); }

// Récompenses : état live de settings/recompenses.
try {
  const recompNav = admin.getByText('Récompenses', { exact: false }).first();
  if (await recompNav.count()) { await recompNav.click(); await admin.waitForTimeout(1500); }
  const bodyText = await admin.locator('body').innerText();
  fs.writeFileSync(`${OUT}/agent-recompenses-texte.txt`, bodyText.slice(0, 20000));
  console.log('=== RECOMPENSES: contient reb-huiles/Inspirata/rituel/huile-source? ===');
  console.log('  huile:', /huile/i.test(bodyText));
  console.log('  Inspirata:', /Inspirata/i.test(bodyText));
  console.log('  livret/rituel:', /livret|rituel offert/i.test(bodyText));
  console.log('  surprise/carnet KSL/archives:', /surprise|carnet numérique|archives/i.test(bodyText));
  await admin.screenshot({ path: `${OUT}/agent-admin-recompenses.png`, fullPage: true });
} catch (e) { console.log('recompenses check failed', e.message); }

await adminCtx.close();

// ── Pages publiques touchées (pas besoin de login) ──────────────────────────
const pubCtx = await browser.newContext();
const pub = await pubCtx.newPage();
await shot(pub, '/formations', 1440, 900, 'formations', { full: true });
await shot(pub, '/formations', 390, 844, 'formations', { full: true });
await shot(pub, '/origine', 1440, 900, 'origine', { full: false });
await pubCtx.close();

// ── Tenter une session membre avec le même compte (pour la boutique niskas) ──
const memCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const mem = await memCtx.newPage();
await mem.goto(BASE + '/compte', { waitUntil: 'domcontentloaded' });
await mem.waitForTimeout(1500);
console.log('URL /compte avant login membre:', mem.url());
// Ferme le bandeau cookies s'il est là.
const nonMerci = mem.getByText('Non merci', { exact: false });
if (await nonMerci.count()) { await nonMerci.first().click().catch(() => {}); await mem.waitForTimeout(300); }
const seConnecter = mem.getByText('Se connecter', { exact: false }).first();
if (await seConnecter.count()) { await seConnecter.click(); await mem.waitForTimeout(1000); }
// La fenêtre s'ouvre toujours en mode « Créer un compte » : basculer vers
// « Déjà un compte ? Se connecter » pour éviter le reCAPTCHA de l'inscription.
const dejaCompte = mem.getByText('Déjà un compte', { exact: false }).first();
if (await dejaCompte.count()) { await dejaCompte.click().catch(() => {}); await mem.waitForTimeout(500); }
await mem.screenshot({ path: `${OUT}/agent-compte-avant-login.png` });
const memEmailInput = mem.locator('input[type="email"]');
if (await memEmailInput.count()) {
  await memEmailInput.first().fill(ADMIN_EMAIL);
  const memPwInput = mem.locator('input[type="password"]');
  if (await memPwInput.count()) {
    await memPwInput.first().fill(ADMIN_PW);
    const submit = mem.locator('button[type="submit"]').first();
    if (await submit.count()) { await submit.click(); await mem.waitForTimeout(3000); }
  }
}
console.log('URL /compte après tentative login membre:', mem.url());
await mem.screenshot({ path: `${OUT}/agent-compte-apres-login.png` });
// Ferme le tutoriel de bienvenue (« On oublie souvent de jouer ») : clic
// souris réel tout en haut à gauche, hors de la carte (fermer() sur le fond).
await mem.mouse.click(5, 5);
await mem.waitForTimeout(500);
// Ferme la pop-up « Cadeau du jour » (roue quotidienne) si elle apparaît.
const merci = mem.getByRole('button', { name: 'Merci', exact: true });
if (await merci.count()) { await merci.click().catch(() => {}); await mem.waitForTimeout(500); }
await mem.mouse.click(5, 5);
await mem.waitForTimeout(300);
const clickTab = async (page, iconClass) => page.evaluate((cls) => {
  const btn = Array.from(document.querySelectorAll('button')).find(b => b.querySelector(`i.${cls}`));
  if (btn) { btn.click(); return true; }
  return false;
}, iconClass);

// Capture à des FRACTIONS de la hauteur réelle de page (0 = haut, 1 = bas),
// pour ne jamais scroller au-delà du contenu.
const shotsAtFractions = async (page, name, fractions) => {
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (const [label, f] of fractions) {
    await page.evaluate((py) => window.scrollTo(0, py), Math.round(height * f));
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/${name}-${page.viewportSize().width}-${label}.png` });
  }
};

// Onglet Téléchargements (fa-download) = la boutique en niskas.
try {
  const ok = await clickTab(mem, 'fa-download');
  console.log('onglet Téléchargements trouvé:', ok);
  await mem.waitForTimeout(2000);
  await shotsAtFractions(mem, 'agent-boutique-niskas', [['haut', 0], ['milieu', 0.35], ['coffres', 0.55], ['videos', 0.8]]);
  // Déplie « ce que le coffre contient » pour bronze, argent ET or (argent
  // est le second bouton : c'est celui qui portait le rabais huile).
  const boutonsCoffre = await mem.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter(b => /ce que le coffre contient/i.test(b.textContent || ''));
    btns.forEach(b => b.click());
    return btns.length;
  });
  console.log('boutons « ce que le coffre contient » trouvés et cliqués:', boutonsCoffre);
  await mem.waitForTimeout(500);
  const coffreText = await mem.locator('body').innerText();
  const argentIdx = coffreText.indexOf("COFFRE D'ARGENT") >= 0 ? coffreText.indexOf("COFFRE D'ARGENT") : coffreText.toUpperCase().indexOf('ARGENT');
  const argentSlice = argentIdx >= 0 ? coffreText.slice(argentIdx, argentIdx + 1200) : coffreText;
  console.log('=== COFFRE ARGENT (client) : mention huile dans son bloc ?', /huile/i.test(argentSlice), '===');
  fs.writeFileSync(`${OUT}/agent-coffre-argent-texte.txt`, argentSlice);
  await mem.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter(b => /ce que le coffre contient/i.test(b.textContent || ''));
    (btns[1] || btns[0])?.scrollIntoView({ block: 'start' });
  });
  await mem.waitForTimeout(400);
  await mem.screenshot({ path: `${OUT}/agent-boutique-niskas-1440-coffre-contenu.png` });
  await mem.setViewportSize({ width: 390, height: 844 });
  await mem.waitForTimeout(500);
  await shotsAtFractions(mem, 'agent-boutique-niskas', [['haut', 0], ['milieu', 0.35], ['coffres', 0.55], ['videos', 0.8]]);
} catch (e) { console.log('boutique niskas shot failed', e.message); }
// Onglet Niskas (fa-seedling) = les récompenses (paliers).
try {
  await mem.setViewportSize({ width: 1440, height: 900 });
  const ok = await clickTab(mem, 'fa-seedling');
  console.log('onglet Niskas trouvé:', ok);
  await mem.waitForTimeout(2000);
  await shotsAtFractions(mem, 'agent-recompenses-client', [['haut', 0], ['recompenses', 0.25]]);
  await mem.setViewportSize({ width: 390, height: 844 });
  await mem.waitForTimeout(500);
  await shotsAtFractions(mem, 'agent-recompenses-client', [['haut', 0], ['recompenses', 0.25]]);
} catch (e) { console.log('recompenses client shot failed', e.message); }
await memCtx.close();

await browser.close();
console.log('DONE');

