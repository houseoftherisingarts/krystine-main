// Captures du babillard (avis épinglés) : la bulle de l'accueil, la cloche,
// les Lettres en deux parties, et l'onglet admin. Un compte témoin se connecte
// par la vraie fenêtre de connexion. node scripts/qa/babillard-shots.mjs <sortie> <courriel> <motdepasse>
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [,, out = '/tmp/babillard', email, pass] = process.argv;
mkdirSync(out, { recursive: true });
const base = 'http://localhost:5199';
const b = await chromium.launch();
const log = (...a) => console.log(...a);

// 1. L'accueil statique, sans compte : la bulle s'ouvre d'elle-même.
for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'mobile']]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 600, hasTouch: w < 600 });
  const p = await c.newPage(); const err = [];
  p.on('pageerror', e => err.push(String(e).slice(0, 160)));
  await p.goto(base + '/accueil/', { waitUntil: 'load' }); await p.waitForTimeout(4500);
  await p.screenshot({ path: `${out}/accueil-${tag}.jpg`, quality: 72 });
  const bulle = await p.locator('.ab-bulle').count(); const bouton = await p.locator('.ab-bouton:not(.ab-parti)').count();
  log('accueil', tag, 'bulle', bulle, 'bouton', bouton, 'erreurs', err.length ? err : 'aucune');
  await c.close();
}

// 2. Le calendrier : le lancement en « Détails à venir ».
{
  const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await c.addInitScript(() => { try { localStorage.setItem('krystine-lang', 'fr'); sessionStorage.setItem('rideau-evenements', '1'); } catch {} });
  const p = await c.newPage();
  await p.goto(base + '/evenements', { waitUntil: 'load' }); await p.waitForTimeout(4000);
  await p.evaluate(() => document.querySelector('#prochain')?.scrollIntoView()); await p.waitForTimeout(1200);
  await p.screenshot({ path: `${out}/evenements-prochain.jpg`, quality: 72 });
  const texte = await p.locator('#prochain').innerText();
  log('evenements', /Détails à venir/.test(texte) ? 'détails à venir OK' : 'DÉTAILS MANQUANTS', /programme de la soirée/i.test(texte) ? 'LIEN VENTE ENCORE LÀ' : 'sans lien vente');
  await c.close();
}

// 3. Connectée : la cloche, puis Lettres.
const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
await c.addInitScript(() => { try { localStorage.setItem('krystine-lang', 'fr'); localStorage.setItem('inspirata.consent.v1', 'accepted'); } catch {} });
const p = await c.newPage(); const err = [];
p.on('pageerror', e => err.push(String(e).slice(0, 160)));
await p.goto(base + '/compte', { waitUntil: 'load' }); await p.waitForTimeout(3000);
await p.locator('button:has-text("Se connecter")').first().click({ timeout: 5000 }).catch(() => log('pas de bouton Se connecter'));
await p.waitForTimeout(800);
const bascule = p.locator('text=Déjà un compte').first();
if (await bascule.count()) await bascule.click().catch(() => {});
await p.waitForTimeout(400);
const formulaire = p.locator('form:has(input[type="password"])').first();
await formulaire.locator('input[type="email"]').first().fill(email);
await formulaire.locator('input[type="password"]').first().fill(pass);
await formulaire.locator('button[type="submit"]').first().click({ force: true });
await p.waitForTimeout(5000);
log('connexion', p.url(), 'erreurs', err.length ? err : 'aucune');
await p.keyboard.press('Escape'); await p.waitForTimeout(600); await p.keyboard.press('Escape'); await p.waitForTimeout(600);
const voiles = await p.locator('div.fixed.inset-0').count(); log('voiles restants', voiles);
const cloche = p.locator('button[aria-label^="Notifications"]').first();
if (await cloche.count()) {
  await cloche.click({ force: true }); await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/cloche.jpg`, quality: 72 });
  log('cloche', await cloche.getAttribute('aria-label'));
  await p.keyboard.press('Escape'); await p.mouse.click(700, 500);
} else log('PAS DE CLOCHE (connexion ratée ?)');
await p.goto(base + '/compte?onglet=archives&avis=migration-plateforme', { waitUntil: 'load' }); await p.waitForTimeout(3500);
await p.evaluate(() => document.querySelector('#avis-migration-plateforme')?.scrollIntoView({ block: 'center' })); await p.waitForTimeout(800);
await p.screenshot({ path: `${out}/lettres-avis-a-lire.jpg`, quality: 72 });
const lu = p.locator('button:has-text("Lu, épingler")').first();
if (await lu.count()) { await lu.click({ force: true }); await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/lettres-avis-epingle.jpg`, quality: 72 }); log('Lu cliqué'); } else log('PAS DE BOUTON LU');
await p.locator('button:has-text("Infolettres")').first().click({ force: true }).catch(() => {}); await p.waitForTimeout(1200);
await p.screenshot({ path: `${out}/lettres-infolettres.jpg`, quality: 72 });
// Mobile de la même page
await p.setViewportSize({ width: 390, height: 844 });
await p.goto(base + '/compte?onglet=archives', { waitUntil: 'load' }); await p.waitForTimeout(3000);
await p.locator('button:has-text("Avis épinglés")').first().click({ force: true }).catch(() => {}); await p.waitForTimeout(1200);
await p.screenshot({ path: `${out}/lettres-mobile.jpg`, quality: 72 });
// 4. L'admin, avec le drapeau de développement
await p.setViewportSize({ width: 1440, height: 900 });
await p.evaluate(() => localStorage.setItem('__devAdmin', '1'));
await p.goto(base + '/admin/infolettre', { waitUntil: 'load' }); await p.waitForTimeout(4000);
const ongletAvis = p.locator('button:has-text("Avis épinglés")').first();
if (await ongletAvis.count()) { await ongletAvis.click({ force: true }); await p.waitForTimeout(2500); } else log('onglet admin introuvable sur', p.url());
await p.screenshot({ path: `${out}/admin-avis.jpg`, quality: 72 });
log('erreurs finales', err.length ? err.slice(0, 5) : 'aucune');
await c.close(); await b.close();
