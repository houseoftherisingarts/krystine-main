// Captures de /compte, onglet par onglet, sans vraie connexion : Playwright
// remplace à la volée trois modules servis par Vite (l'état de connexion,
// les formations, la restauration Kajabi) par des versions factices. Les
// autres données (points, commandes…) restent vides : Firestore refuse un
// visiteur non connecté, ce qui montre les états vides de chaque onglet.
// Le serveur Vite doit tourner : npx vite --port 5199
//   node scripts/qa/compte-shots.mjs <dossier-sortie> [admin]
import { chromium } from 'playwright';
import fs from 'node:fs';
const [,, OUT = 'scripts/qa/shots/compte', mode = ''] = process.argv;
const BASE = process.env.BASE || 'http://localhost:5199';
fs.mkdirSync(OUT, { recursive: true });

const ACHATS = [
  { id: 'kajabi-2148687644', titre: "VATA Essentiel · L'Expérience Ayurveda, Saison Vata", imageUrl: '/vata/carte-saison-vata.jpg' },
  { id: 'kajabi-2149362090', titre: 'TEST SANTÉ PARFAITE', imageUrl: '/assets/foyer-visuel-16x9.jpg' },
];
const CATALOGUE = [
  { id: 'foyer', titre: "Le Foyer d'Origine", imageUrl: '/assets/foyer-visuel-16x9.jpg', statut: 'publie', paywall: true, prix: 497, lienFiche: '/foyer' },
  { id: 'kajabi-2148687644', titre: "VATA Essentiel · L'Expérience Ayurveda, Saison Vata", imageUrl: '/vata/carte-saison-vata.jpg', statut: 'publie', paywall: true, prix: 1, lienFiche: '/vata' },
];

const MOCKS = {
  '/src/firebase/auth.ts': `export * from '/src/firebase/auth.ts?vrai';
const u = { uid: 'qa-uid', email: 'cliente@exemple.com', displayName: 'Marie Tremblay', photoURL: null, getIdToken: async () => '' };
export function subscribeToAuthState(cb) { setTimeout(() => cb(u), 50); return () => {}; }`,
  '/src/firebase/formations.ts': `export * from '/src/firebase/formations.ts?vrai';
export async function getMesFormations() { return ${JSON.stringify(ACHATS)}; }
export async function getFormationsPubliees() { return ${JSON.stringify(CATALOGUE)}; }`,
  '/src/firebase/kajabi.ts': `export * from '/src/firebase/kajabi.ts?vrai';
export function restaurerKajabiAuto() { return Promise.resolve({ restaurees: 0, aVerifier: false }); }`,
};

const ONGLETS = [
  ['profil', 'Profil'], ['amis', 'Amis'], ['commandes', 'Commandes'], ['formations', 'Mes formations'],
  ['rediffusions', 'Rediffusions'], ['telechargements', 'Téléchargements'], ['points', 'Niskas'],
  ['dosha', 'Dosha'], ['lettres', 'Lettres'], ['messagerie', 'Messagerie'],
];
const seuls = process.env.ONGLETS ? process.env.ONGLETS.split(',') : null;

const b = await chromium.launch();
for (const [w, h, tag] of [[1440, 900, '1440'], [390, 844, '390']]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 600, hasTouch: w < 600, deviceScaleFactor: 1 });
  await c.addInitScript((admin) => {
    try {
      if (admin) localStorage.setItem('__devAdmin', '1'); else localStorage.removeItem('__devAdmin');
      localStorage.setItem('lang', 'FR');
    } catch { /* noop */ }
  }, mode === 'admin');
  await c.route('**/src/firebase/**', (route) => {
    const u = new URL(route.request().url());
    if (MOCKS[u.pathname] && !u.search.includes('vrai')) {
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCKS[u.pathname] });
    }
    return route.continue();
  });
  const p = await c.newPage();
  await p.goto(`${BASE}/compte`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('text=Mes formations', { timeout: 30000 });
  await p.waitForTimeout(2500);
  await p.locator('button', { hasText: /non merci/i }).first().click({ timeout: 3000 }).catch(() => {});
  // Les fenêtres de bienvenue et de cadeau du jour ne font pas partie de l'audit.
  await p.addStyleTag({ content: '[class*="z-[120]"],[class*="z-[130]"],[class*="z-[200]"]{display:none!important}' });
  for (const [cle, label] of ONGLETS) {
    if (seuls && !seuls.includes(cle)) continue;
    await p.locator('button', { hasText: label }).first().click();
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `${OUT}/${cle}-${tag}.jpg`, fullPage: true, quality: 70 });
  }
  await c.close();
}
await b.close();
console.log('captures dans', OUT);
