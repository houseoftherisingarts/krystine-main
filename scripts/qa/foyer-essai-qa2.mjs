import { chromium } from 'playwright';
import path from 'node:path';

const BASE = 'http://localhost:5199';
const ROOT = '/Users/lesalondesinconnus/Documents/Websites/Krystine Main';
const VIDEO = path.join(ROOT, 'public/foyer/chandelle.mp4');
const PDF = path.join(ROOT, 'public/compte/comment-gagner-des-niskas.pdf');
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/b888b2c7-f098-4036-8a5d-c76540f05b53/scratchpad';

const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
await c.addInitScript(() => { try { localStorage.setItem('inspirata.consent.v1', 'accepted'); } catch {} });
const p = await c.newPage();
p.on('pageerror', e => console.log('ERREUR PAGE', String(e).slice(0, 300)));
p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE ERREUR', m.text().slice(0, 300)); });

// 1) Connexion par le vrai formulaire (/admin, onglet Email).
await p.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(800);
await p.getByRole('button', { name: /^Email$/i }).click();
await p.locator('input[type="email"]').fill('alex@lesalondesinconnus.com');
await p.locator('input[type="password"]').fill('EssaiFoyer123!');
await p.locator('form button[type="submit"]').click();
await p.waitForTimeout(2000);
console.log('après connexion, url =', p.url());
await p.screenshot({ path: `${OUT}/01-apres-connexion.png` });

// 2) Aller sur /foyer-essai (auth déjà établie dans ce contexte).
await p.goto(`${BASE}/foyer-essai`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2000);
console.log('foyer-essai url =', p.url());
await p.screenshot({ path: `${OUT}/02-grille-douze-portes-1440.png`, fullPage: true });

// 3) Ouvrir la porte d'octobre (première carte).
const cartes = p.locator('main >> button, div >> button').filter({ hasText: /./ });
await p.locator('button:has(img)').first().click();
await p.waitForTimeout(600);
await p.screenshot({ path: `${OUT}/03-module-vide-1440.png`, fullPage: true });

// 4) Créer une leçon.
await p.getByRole('button', { name: /Ajouter une leçon/i }).click();
await p.locator('input[placeholder^="Titre de la leçon ("]').fill('Bienvenue dans ce cycle');
await p.getByRole('button', { name: /^Créer$/i }).click();
await p.waitForTimeout(1000);
await p.screenshot({ path: `${OUT}/04-lecon-creee-1440.png`, fullPage: true });

// 5) Ouvrir l'éditeur de la leçon (crayon), déposer vidéo + PDF.
await p.locator('button[title="Éditer la leçon"]').first().click();
await p.waitForTimeout(400);
await p.locator('textarea').first().fill("Une courte introduction avant la porte d'octobre.\n\nRegardez la vidéo, puis lisez le PDF joint.");
const inputFichier = p.locator('input[type="file"]').first();
await inputFichier.setInputFiles([VIDEO, PDF]);
await p.waitForTimeout(500);
await p.screenshot({ path: `${OUT}/05-televersement-en-cours-1440.png`, fullPage: true });
await p.waitForTimeout(6000);
await p.screenshot({ path: `${OUT}/06-deux-pieces-deposees-1440.png`, fullPage: true });
await p.getByRole('button', { name: /^Enregistrer$/i }).click();
await p.waitForTimeout(800);

// 6) Ajouter une deuxième leçon, vide celle-là (doit rester belle).
await p.getByRole('button', { name: /Ajouter une leçon/i }).click();
await p.locator('input[placeholder^="Titre de la leçon ("]').fill('Exercice de la semaine (à venir)');
await p.getByRole('button', { name: /^Créer$/i }).click();
await p.waitForTimeout(1000);
await p.screenshot({ path: `${OUT}/07-porte-une-lecon-remplie-une-vide-1440.png`, fullPage: true });

// 7) Réordonner : monter la deuxième leçon.
const monter = p.locator('button[title="Monter"]');
await monter.nth(1).click();
await p.waitForTimeout(700);
await p.screenshot({ path: `${OUT}/08-apres-reordre-1440.png`, fullPage: true });

// 8) Retirer une pièce de la première leçon (maintenant en 2e position après le tri).
await p.locator('button[title="Éditer la leçon"]').nth(1).click();
await p.waitForTimeout(400);
await p.screenshot({ path: `${OUT}/09-edition-avant-retrait-piece-1440.png`, fullPage: true });
const retraitPiece = p.locator('button[aria-label^="Retirer"]').first();
if (await retraitPiece.count()) {
  await retraitPiece.click();
  await p.waitForTimeout(700);
}
await p.screenshot({ path: `${OUT}/10-apres-retrait-piece-1440.png`, fullPage: true });

// 9) Supprimer la leçon vide.
page: {
  const dialogs = [];
  p.once('dialog', d => { dialogs.push(d.message()); d.accept(); });
}
await p.locator('button[title="Supprimer la leçon"]').first().click();
await p.waitForTimeout(800);
await p.screenshot({ path: `${OUT}/11-apres-suppression-lecon-1440.png`, fullPage: true });

// 10) Retour à la grille : le badge de compte doit refléter l'état réel.
await p.getByRole('button', { name: /Les douze portes/i }).click();
await p.waitForTimeout(600);
await p.screenshot({ path: `${OUT}/12-grille-avec-badge-1440.png`, fullPage: true });

// 11) Vue cliente : ouvrir la même porte, basculer, capturer.
await p.locator('button:has(img)').first().click();
await p.waitForTimeout(500);
await p.getByRole('button', { name: /Voir comme une cliente/i }).click();
await p.waitForTimeout(600);
await p.screenshot({ path: `${OUT}/13-vue-cliente-1440.png`, fullPage: true });

await c.close();

// 12) Mobile 390 : grille, module rempli, vue cliente.
const cm = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const pm = await cm.newPage();
await pm.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' });
await pm.waitForTimeout(800);
await pm.getByRole('button', { name: /^Email$/i }).click();
await pm.locator('input[type="email"]').fill('alex@lesalondesinconnus.com');
await pm.locator('input[type="password"]').fill('EssaiFoyer123!');
await pm.locator('form button[type="submit"]').click();
await pm.waitForTimeout(2000);
await pm.goto(`${BASE}/foyer-essai`, { waitUntil: 'domcontentloaded' });
await pm.waitForTimeout(2000);
await pm.screenshot({ path: `${OUT}/14-grille-390.png`, fullPage: true });
await pm.locator('button:has(img)').nth(1).click(); // porte encore vide (novembre)
await pm.waitForTimeout(600);
await pm.screenshot({ path: `${OUT}/15-module-vide-390.png`, fullPage: true });
await pm.goto(`${BASE}/foyer-essai`, { waitUntil: 'domcontentloaded' });
await pm.waitForTimeout(1500);
await pm.locator('button:has(img)').first().click(); // octobre, avec sa leçon restante
await pm.waitForTimeout(600);
await pm.getByRole('button', { name: /Voir comme une cliente/i }).click();
await pm.waitForTimeout(600);
await pm.screenshot({ path: `${OUT}/16-vue-cliente-390.png`, fullPage: true });
await cm.close();

await b.close();
console.log('TERMINÉ');
