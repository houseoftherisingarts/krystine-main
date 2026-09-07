// Vérification visuelle : achat d'une saison de Santé la vie en argent ou en
// niskas (page publique + espace membre + fenêtre d'inscription). Supprimé
// après usage.
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = 'http://localhost:3033';
const OUT = 'scripts/qa/shots';
fs.mkdirSync(OUT, { recursive: true });

const shoot = async (page, name) => {
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log('capturé', name);
};

const browser = await chromium.launch();

// ── 1. Page publique /medias, section Santé la vie (déconnecté) ──
for (const w of [1440, 390]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 600 ? 1000 : 1000 }, isMobile: w < 600, hasTouch: w < 600, deviceScaleFactor: w < 600 ? 2 : 1 });
  const page = await ctx.newPage();
  await page.goto(BASE + '/medias', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.getElementById('tv')?.scrollIntoView({ block: 'start' }));
  await shoot(page, `medias-tv-${w}`);
  await ctx.close();
}

// ── 2. Le bouton « Créer mon compte » (déconnecté) ouvre la fenêtre d'inscription ──
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/medias', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.getElementById('tv')?.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(400);
  const bouton = page.getByRole('button', { name: /Créer mon compte/i }).first();
  await bouton.click();
  await shoot(page, 'medias-inscription-1440');
  await ctx.close();
}

// ── 3. Connexion admin, espace membre : les deux boutons côte à côte ──
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/compte', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  // Ouvrir la fenêtre de connexion, basculer en mode « Se connecter ».
  const boutonCompte = page.getByRole('button', { name: /Créer mon compte/i }).first();
  await boutonCompte.click();
  await page.waitForTimeout(500);
  const lienConnexion = page.getByRole('button', { name: /Déjà un compte|Se connecter/i }).first();
  if (await lienConnexion.count()) await lienConnexion.click();
  await page.waitForTimeout(400);
  await page.locator('input[type="email"]').fill('admin@krystinestlaurent.ca');
  await page.locator('input[type="password"]').fill('cJOOAoXbEsKBuoTVMDBs4CYI');
  await page.getByRole('button', { name: /Se connecter/i }).last().click();
  await page.waitForTimeout(3000);
  await page.goto(BASE + '/compte?onglet=telechargements', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.evaluate(() => document.querySelector('#telechargements, [id="videos-krystine"]')?.scrollIntoView({ block: 'start' }));
  // Chercher le bloc « Santé la vie » précisément.
  const bloc = page.locator('text=Santé la vie').first();
  if (await bloc.count()) await bloc.scrollIntoViewIfNeeded();
  await shoot(page, 'compte-saisons-1440');

  await page.setViewportSize({ width: 390, height: 1200 });
  await page.waitForTimeout(400);
  if (await bloc.count()) await bloc.scrollIntoViewIfNeeded();
  await shoot(page, 'compte-saisons-390');
  await ctx.close();
}

await browser.close();
