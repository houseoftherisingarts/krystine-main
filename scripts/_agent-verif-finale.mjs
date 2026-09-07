// Vérification visuelle finale : saisons (public + espace membre), fenêtre
// d'inscription, bannière Vata achetée, onglet Niskas (récompenses), carte
// de parrainage. Chaque étape isolée : une qui échoue n'arrête pas les
// autres. Supprimé après usage.
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = 'http://localhost:3033';
const OUT = 'scripts/qa/shots';
fs.mkdirSync(OUT, { recursive: true });
const shoot = async (page, name) => { await page.waitForTimeout(500); await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true }); console.log('capturé', name); };
const step = async (nom, fn) => {
  try { await fn(); } catch (e) { console.error(`ÉCHEC ${nom} :`, e.message?.split('\n')[0]); }
};

const browser = await chromium.launch();

await step('medias-tv (deconnecte, 1440+390)', async () => {
  for (const w of [1440, 390]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 1000 }, isMobile: w < 600, hasTouch: w < 600, deviceScaleFactor: w < 600 ? 2 : 1 });
    const page = await ctx.newPage();
    await page.goto(BASE + '/medias', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    await page.evaluate(() => document.getElementById('tv')?.scrollIntoView({ block: 'start' }));
    await shoot(page, `medias-tv-${w}`);
    await ctx.close();
  }
});

await step('medias-inscription (bouton Creer mon compte)', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/medias', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
  await page.getByRole('button', { name: /Créer mon compte/i }).first().click({ timeout: 15000 });
  await shoot(page, 'medias-inscription-1440');
  await ctx.close();
});

const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
const page = await ctx.newPage();
let connectee = false;
await step('connexion admin', async () => {
  await page.goto(BASE + '/compte', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
  await page.getByRole('button', { name: /Créer mon compte/i }).first().click({ timeout: 15000 });
  await page.waitForTimeout(700);
  await page.getByText('Déjà un compte').click({ timeout: 10000 });
  await page.waitForTimeout(600);
  await page.getByPlaceholder(/Courriel/i).fill('admin@krystinestlaurent.ca');
  await page.getByPlaceholder(/Mot de passe/i).fill('cJOOAoXbEsKBuoTVMDBs4CYI');
  await page.getByRole('button', { name: /^Se connecter$/i }).click();
  await page.waitForTimeout(3500);
  connectee = true;
  console.log('connectée');
});

if (connectee) {
  await step('saisons (30$/niskas cote a cote)', async () => {
    await page.goto(BASE + '/compte?onglet=telechargements', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2200);
    const bloc = page.locator('text=Santé la vie').first();
    if (await bloc.count()) await bloc.scrollIntoViewIfNeeded();
    await shoot(page, 'compte-saisons-1440');
    await page.setViewportSize({ width: 390, height: 1200 });
    await page.waitForTimeout(400);
    if (await bloc.count()) await bloc.scrollIntoViewIfNeeded();
    await shoot(page, 'compte-saisons-390');
    await page.setViewportSize({ width: 1440, height: 1200 });
  });

  await step('onglet niskas (recompenses, mes codes)', async () => {
    await page.goto(BASE + '/compte?onglet=loyalty', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2200);
    await shoot(page, 'compte-niskas-1440');
    await page.setViewportSize({ width: 390, height: 1400 });
    await page.waitForTimeout(400);
    await shoot(page, 'compte-niskas-390');
    await page.setViewportSize({ width: 1440, height: 1200 });
  });

  await step('carte de parrainage', async () => {
    await page.goto(BASE + '/compte?onglet=formations', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await shoot(page, 'compte-parrainage-1440');
    await page.setViewportSize({ width: 390, height: 2400 });
    await page.waitForTimeout(400);
    const rail = page.locator('text=Invitez vos proches').first();
    if (await rail.count()) await rail.scrollIntoViewIfNeeded();
    await shoot(page, 'compte-parrainage-390');
    await page.setViewportSize({ width: 1440, height: 1200 });
  });

  await step('banniere Vata (apercu admin)', async () => {
    await page.goto(BASE + '/cours/kajabi-2148687644?apercu=1', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2400);
    await shoot(page, 'vata-banniere-1440');
    await page.setViewportSize({ width: 390, height: 1400 });
    await page.waitForTimeout(400);
    await shoot(page, 'vata-banniere-390');
  });
}

await ctx.close();
await browser.close();
