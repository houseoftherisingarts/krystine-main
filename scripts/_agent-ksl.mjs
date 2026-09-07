import { chromium } from 'playwright';

// Captures de vérification du Foyer social + messagerie Équipe KSL. Script
// temporaire (RÈGLE -5), supprimé en fin de session.
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/78c2ade9-cdcd-4c68-ace2-f8eabac5d7f6/scratchpad/captures';
const BASE = 'http://localhost:3031';
const QA_EMAIL = 'qa-foyer-b95e93@krystinestlaurent.ca';
const QA_PASSWORD = 'QaFoyer!2773d013';

const browser = await chromium.launch();

async function seConnecter(page) {
  await page.goto(`${BASE}/foyer/fil`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Se connecter' }).first().click();
  await page.waitForTimeout(500);
  await page.getByText('Déjà un compte ? Se connecter').click();
  await page.waitForTimeout(300);
  await page.getByPlaceholder('Courriel').fill(QA_EMAIL);
  await page.getByPlaceholder('Mot de passe').fill(QA_PASSWORD);
  await page.locator('button[type="submit"]', { hasText: 'Se connecter' }).click();
  await page.waitForTimeout(3500);
  // Bandeau de consentement (Loi 25), première visite seulement : on l'écarte
  // pour ne pas cacher le contenu vérifié sous une pop-up.
  const accepte = page.getByRole('button', { name: 'J’accepte' }).or(page.getByRole('button', { name: "J'accepte" }));
  if (await accepte.count()) await accepte.first().click().catch(() => {});
  await page.waitForTimeout(300);
}

async function capture(viewport, suffix) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PE: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CE: ' + m.text().slice(0, 200)); });

  await seConnecter(page);

  // 1) Fil « Krystine » : pilule par défaut, aucun composeur pour une membre.
  await page.goto(`${BASE}/foyer/fil`, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/1-fil-krystine-${suffix}.png`, fullPage: true });

  // 2) Messagerie Équipe KSL.
  await page.goto(`${BASE}/foyer/messages?volet=support`, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/2-equipe-ksl-${suffix}.png`, fullPage: true });

  console.log(`[${suffix}] erreurs console: ${errors.length}`);
  errors.slice(0, 10).forEach(e => console.log('  - ' + e));

  // 3) (desktop seulement) Le module privé de Krystine, vu par un compte QUI
  // N'EST PAS Krystine (bypass admin dev sur le compte QA) : la case doit
  // rester absente. Preuve du côté négatif du garde-fou; le côté positif se
  // lit dans le code (user.email === 'krystine@inspiratanature.com').
  if (suffix === '1440') {
    await page.evaluate(() => localStorage.setItem('__devAdmin', '1'));
    await page.goto(`${BASE}/admin/messages`, { waitUntil: 'load' });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/3-admin-messages-pas-krystine-${suffix}.png`, fullPage: true });
    const aLeMotPrive = await page.getByText('Mot privé de Krystine').count();
    console.log(`[${suffix}] "Mot privé de Krystine" visible pour un admin non-Krystine : ${aLeMotPrive > 0 ? 'OUI (BUG)' : 'non (attendu)'}`);
    await page.evaluate(() => localStorage.removeItem('__devAdmin'));
  }

  await ctx.close();
}

await capture({ width: 1440, height: 900 }, '1440');
await capture({ width: 390, height: 844 }, '390');

await browser.close();
console.log('Captures terminées.');
