// QA des skins en travail (Alex, 7 sept. 2026) : Vata, Pitta, Kapha, Aurore,
// Or pur et Féminité cachées de la petite boutique (skins.filter). Captures
// à 1440 et 390 : la section admin « Skins à travailler » (dev unlock) et la
// petite boutique de l'espace membre (compte réel admin@krystinestlaurent.ca),
// tout repliée au chargement puis la section « Les skins » ouverte.
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:3035';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/78c2ade9-cdcd-4c68-ace2-f8eabac5d7f6/scratchpad/skins';
fs.mkdirSync(OUT, { recursive: true });
const PASSWORD = fs.readFileSync('/Users/lesalondesinconnus/.claude/scripts/.krystine_admin_pw', 'utf8').trim();
const EMAIL = 'admin@krystinestlaurent.ca';

const browser = await chromium.launch();

// ─── 1. La section admin, en dev unlock ──────────────────────────────────────
const shootAdmin = async (largeur, hauteur, suffixe) => {
  const ctx = await browser.newContext({ viewport: { width: largeur, height: hauteur }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('pageerror(admin)', e.message));
  await page.goto(`${BASE}/admin/skins-a-travailler?unlock=Alexisthebest2121!`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800); // le unlock recharge la page une fois
  await page.waitForSelector('text=Skins à travailler', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/admin-skins-a-travailler-${suffixe}.png`, fullPage: true });
  await ctx.close();
};

// ─── 2. La petite boutique de l'espace membre, connectée pour de vrai ────────
const shootBoutique = async (largeur, hauteur, suffixe) => {
  const ctx = await browser.newContext({ viewport: { width: largeur, height: hauteur }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('pageerror(boutique)', e.message));
  await page.goto(`${BASE}/compte?onglet=telechargements`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Connexion réelle : le bouton de la page vide ouvre la fenêtre, en mode
  // « Créer un compte » par défaut, un clic la bascule sur « Se connecter ».
  const ouvrir = page.getByRole('button', { name: /Se connecter/i }).first();
  if (await ouvrir.count()) {
    await ouvrir.click();
    await page.waitForTimeout(500);
    const versConnexion = page.getByRole('button', { name: /Déjà un compte/i }).first();
    if (await versConnexion.count()) await versConnexion.click();
    await page.waitForTimeout(300);
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('form button[type="submit"]').click();
    await page.waitForTimeout(3000);
  }

  await page.waitForSelector('text=La petite boutique', { timeout: 15000 }).catch((e) => console.log('boutique introuvable', e.message));
  await page.waitForTimeout(800);

  // La roue quotidienne (« Jour N ») s'ouvre parfois toute seule à l'arrivée
  // sur /compte : un clic sur le fond (data-bug-ignore) la referme.
  const roue = page.locator('[data-bug-ignore]').first();
  if (await roue.count()) { await roue.click({ position: { x: 8, y: 8 } }).catch(() => {}); await page.waitForTimeout(400); }

  // Tout replié au chargement.
  await page.screenshot({ path: `${OUT}/boutique-replie-${suffixe}.png`, fullPage: true });

  const fermerRoue = async () => {
    const r = page.locator('[data-bug-ignore]').first();
    if (await r.count()) { await r.click({ position: { x: 8, y: 8 } }).catch(() => {}); await page.waitForTimeout(300); }
  };

  // La section « Les skins » ouverte : les six skins en travail ne doivent
  // plus y paraître (sauf si le compte les possède déjà).
  await fermerRoue();
  const skins = page.locator('#boutique-skin');
  if (await skins.count()) {
    await skins.scrollIntoViewIfNeeded();
    await skins.getByRole('button').first().click({ force: true });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/boutique-skins-ouvert-${suffixe}.png`, fullPage: true });
  }

  // Les coffres : la ligne des chances ne doit plus nommer une skin en travail.
  await fermerRoue();
  const coffres = page.locator('#boutique-coffres');
  if (await coffres.count()) {
    await coffres.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const chances = page.getByText(/Ce que le coffre contient/i).first();
    if (await chances.count()) await chances.click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/boutique-coffres-${suffixe}.png`, fullPage: true });
  }

  await ctx.close();
};

await shootAdmin(1440, 900, 'desk');
await shootAdmin(390, 844, 'mobile');
await shootBoutique(1440, 900, 'desk');
await shootBoutique(390, 844, 'mobile');

await browser.close();
console.log('fini —', OUT);
