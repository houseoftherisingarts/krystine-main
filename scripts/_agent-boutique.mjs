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
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.querySelector('i.fa-graduation-cap'));
    if (btn) { btn.click(); return true; }
    return false;
  });
  console.log('bouton Formations trouvé et cliqué:', clicked);
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
await memCtx.close();

await browser.close();
console.log('DONE');
