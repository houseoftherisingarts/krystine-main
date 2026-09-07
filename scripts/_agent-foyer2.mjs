// Captures du Foyer avec un compte acheteur réel : le menu du haut et la
// colonne de gauche doivent se voir dès la première vue, sans défiler.
// Jetable, supprimé à la fin de la tâche.
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = 'http://localhost:3021';
const SCRATCH = '/private/tmp/claude-501/-Users-lesalondesinconnus/78c2ade9-cdcd-4c68-ace2-f8eabac5d7f6/scratchpad';
const SORTIE = process.env.SORTIE || `${SCRATCH}/captures2`;
fs.mkdirSync(SORTIE, { recursive: true });
const COMPTE = {
  email: fs.readFileSync(`${SCRATCH}/qa_email.txt`, 'utf8').trim(),
  pw: fs.readFileSync(`${SCRATCH}/qa_pw.txt`, 'utf8').trim(),
};
const dodo = (ms) => new Promise((r) => setTimeout(r, ms));

for (const [nom, viewport] of [['1440', { width: 1440, height: 900 }], ['390', { width: 390, height: 844 }]]) {
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/compte`, { waitUntil: 'domcontentloaded' });
  await dodo(2500);
  const consent = page.getByRole('button', { name: /j'accepte/i }).first();
  if (await consent.count()) await consent.click().catch(() => {});
  await page.getByRole('button', { name: /se connecter|sign in/i }).first().click();
  await dodo(1200);
  const vers = page.getByRole('button', { name: /déjà un compte/i }).first();
  if (await vers.count()) await vers.click();
  await dodo(600);
  await page.locator('input[type="email"]').first().fill(COMPTE.email);
  await page.locator('input[type="password"]').first().fill(COMPTE.pw);
  await page.locator('form button[type="submit"]').first().click();
  await dodo(6000);

  for (const [chemin, cle] of [['/cours/foyer', 'entree'], ['/foyer/fil', 'fil'], ['/foyer/membres', 'membres'], ['/foyer', 'vente'], ['/foyer/groupes', 'groupes']]) {
    await page.goto(`${BASE}${chemin}`, { waitUntil: 'domcontentloaded' });
    await dodo(5000);
    const fichier = `${SORTIE}/${cle}-${nom}.png`;
    await page.screenshot({ path: fichier });
    // Ce qui se voit sans défiler : les onglets et la colonne de gauche.
    const visible = async (texte) => {
      const el = page.getByText(texte, { exact: true }).first();
      if (!(await el.count())) return 'absent';
      const boite = await el.boundingBox().catch(() => null);
      if (!boite) return 'absent';
      return boite.y < viewport.height ? 'visible' : `plus bas (${Math.round(boite.y)}px)`;
    };
    const onglets = await Promise.all(['Le programme', 'Fil', 'Membres', 'Messages', 'Mon profil'].map(visible));
    // « Autour du feu » ne se montre qu'à partir de lg : sous lg, la colonne
    // se replie en rangée de pastilles et le cercle passe par l'onglet Membres.
    const gauche = await Promise.all((nom === '1440' ? ['Amies', 'Badges', 'Autour du feu'] : ['Amies', 'Badges']).map(visible));
    console.log(`${nom} ${chemin} → ${page.url()}`);
    console.log(`   onglets [Le programme, Fil, Membres, Messages, Mon profil] : ${onglets.join(', ')}`);
    console.log(`   gauche  [Amies, Badges, Autour du feu] : ${gauche.join(', ')}`);
    console.log(`   ${fichier}`);
  }
  await nav.close();
}
