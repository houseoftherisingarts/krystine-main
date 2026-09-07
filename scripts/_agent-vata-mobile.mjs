import { chromium } from 'playwright';
const BASE = 'http://localhost:3033';
const b = await chromium.launch();
// Connexion à 1440 d'abord (fenêtre de connexion + Firebase Auth stockent
// dans localStorage, partagé entre onglets du même contexte).
const c = await b.newContext({ viewport: { width: 1440, height: 1200 } });
const p = await c.newPage();
await p.goto(BASE + '/compte', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1800);
await p.getByRole('button', { name: /Accéder à mon compte/i }).first().click({ timeout: 15000 });
await p.waitForTimeout(700);
await p.getByText('Déjà un compte').click({ timeout: 10000 });
await p.waitForTimeout(600);
await p.getByPlaceholder(/Courriel/i).fill('admin@krystinestlaurent.ca');
await p.getByPlaceholder(/Mot de passe/i).fill('cJOOAoXbEsKBuoTVMDBs4CYI');
await p.getByRole('button', { name: /^Se connecter$/i }).click();
await p.waitForTimeout(3000);

// Nouvel onglet MOBILE dans le même contexte (même session), navigation fraîche.
const p2 = await c.newPage();
await p2.setViewportSize({ width: 390, height: 1400 });
await p2.goto(BASE + '/cours/kajabi-2148687644?apercu=1', { waitUntil: 'domcontentloaded' });
await p2.waitForTimeout(2400);
await p2.screenshot({ path: 'scripts/qa/shots/vata-banniere-390.png', fullPage: true });
console.log('capturé vata-banniere-390 (frais)');
await b.close();
