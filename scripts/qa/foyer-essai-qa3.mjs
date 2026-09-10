import { chromium } from 'playwright';
const BASE = 'http://localhost:5199';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/b888b2c7-f098-4036-8a5d-c76540f05b53/scratchpad';

const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
await c.addInitScript(() => { try { localStorage.setItem('inspirata.consent.v1', 'accepted'); } catch {} });
const p = await c.newPage();
p.on('pageerror', e => console.log('ERREUR PAGE', String(e).slice(0, 300)));

await p.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(800);
await p.getByRole('button', { name: /^Email$/i }).click();
await p.locator('input[type="email"]').fill('alex@lesalondesinconnus.com');
await p.locator('input[type="password"]').fill('EssaiFoyer123!');
await p.locator('form button[type="submit"]').click();
await p.waitForTimeout(2000);

await p.goto(`${BASE}/foyer-essai`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2000);
await p.locator('button:has(img)').first().click(); // octobre
await p.waitForTimeout(600);

// La carte de la leçon "Bienvenue dans ce cycle", scopée précisément (le site
// porte d'autres boutons "Fermer" ailleurs — bandeau, notifications — donc un
// sélecteur large les aurait confondus avec le panneau d'édition de la leçon).
const carte = p.getByText('Bienvenue dans ce cycle', { exact: false }).first()
  .locator('xpath=ancestor::div[contains(@class, "rounded-[15px]")][1]');

const panneauOuvert = async () => (await carte.locator('textarea').count()) > 0;
console.log('panneau ouvert au chargement ?', await panneauOuvert());
if (!(await panneauOuvert())) {
  await carte.locator('button[title="Éditer la leçon"]').click();
  await p.waitForTimeout(400);
}
console.log('panneau ouvert après clic ?', await panneauOuvert());
await p.screenshot({ path: `${OUT}/r1-panneau-ouvert.png`, fullPage: true });

const piecesAvant = await carte.locator('button[aria-label^="Retirer"]').count();
console.log('pièces retirables dans la carte :', piecesAvant);
await carte.locator('button[aria-label^="Retirer"]').first().click();
await p.waitForTimeout(800);
await p.screenshot({ path: `${OUT}/r2-apres-retrait.png`, fullPage: true });
const piecesApres = await carte.locator('button[aria-label^="Retirer"]').count();
console.log('pièces retirables après retrait :', piecesApres);
const badgeApres = await carte.locator('text=/\\d PIÈCE/').first().textContent().catch(() => null);
console.log('badge de pièces après retrait :', badgeApres);

// Fermer le panneau de cette carte précisément, puis supprimer la leçon vide.
await carte.getByRole('button', { name: /^Fermer$/i }).click();
await p.waitForTimeout(300);
p.once('dialog', d => d.accept());
await p.locator('button[title="Supprimer la leçon"]').first().click();
await p.waitForTimeout(800);
await p.screenshot({ path: `${OUT}/r3-apres-suppression-lecon-vide.png`, fullPage: true });
const nbLeconsTexte = await p.locator('text=/LEÇONS \\(\\d\\)/').first().textContent();
console.log('compteur de leçons après suppression :', nbLeconsTexte);

// Retour à la grille : vérifier le badge de la porte.
await p.getByRole('button', { name: /Les douze portes/i }).click();
await p.waitForTimeout(600);
await p.screenshot({ path: `${OUT}/r4-grille-finale.png`, fullPage: true });

await b.close();
console.log('TERMINÉ');
