// Après pages-statiques.mjs : le texte de chaque page publique, écrit d'avance
// dans dist/og/<route>.html (Krystine, 16 oct. 2026 : « comment optimiser
// Google », « du SEO mais aussi de l'IA »). Le site se construit dans le
// navigateur : Google ne voyait le texte qu'au second passage, et les robots
// des IA (ChatGPT, Claude, Perplexity), qui n'exécutent pas le JavaScript,
// ne voyaient rien du tout. Search Console ne comptait que 9 pages indexées.
//
// Chaque route est rendue une fois par Playwright depuis dist (aperçu Vite),
// sans connexion ni consentement, puis le contenu de #root est posé dans la
// copie de la page. React remplace ce contenu au montage (createRoot) : la
// visiteuse ne voit aucune différence. Un échec n'arrête jamais le build;
// la page garde alors sa copie sans texte, comme avant.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PORT = 5197;
// Les pages publiques à faire lire. Jamais l'espace client, le guide personnel,
// les listes d'attente ni les pages de relecture.
const ROUTES = [
  '/krystine', '/conferenciere', '/formations', '/medias', '/medias/tv', '/5elements',
  '/podcast', '/boutique', '/blogue', '/points-de-vente', '/quiz', '/origine', '/vata',
  '/rituels-essentiels', '/politique-de-confidentialite',
];

if (process.env.SANS_INSTANTANES === '1') { console.log('instantanés : sautés (SANS_INSTANTANES=1)'); process.exit(0); }

let chromium, preview;
try {
  ({ chromium } = await import('playwright'));
  ({ preview } = await import('vite'));
} catch (e) {
  console.warn(`⚠️  instantanés : Playwright ou Vite absent (${e.message}); pages servies sans texte.`);
  process.exit(0);
}

const serveur = await preview({ root: racine, preview: { port: PORT, strictPort: true, open: false }, logLevel: 'silent' });
const navigateur = await chromium.launch();
const faites = [];
const ratees = [];
try {
  const contexte = await navigateur.newContext({ viewport: { width: 1280, height: 900 }, locale: 'fr-CA' });
  // Aucune mesure ni publicité pendant le rendu.
  await contexte.route(/\/api\/vh|connect\.facebook\.net|googletagmanager|google-analytics/, (r) => r.abort());
  await contexte.addInitScript(() => { try { localStorage.setItem('vh.moi', '1'); } catch { /* rien */ } });
  for (const route of ROUTES) {
    const fichier = resolve(racine, 'dist/og', route.slice(1).replace(/\//g, '-') + '.html');
    if (!existsSync(fichier)) { ratees.push(`${route} (pas de copie og)`); continue; }
    const page = await contexte.newPage();
    try {
      await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(3500);
      // Descendre la page une fois, pour que les sections qui apparaissent au défilement existent.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(1200);
      const contenu = await page.evaluate(() => {
        const racineApp = document.getElementById('root');
        if (!racineApp) return '';
        const copie = racineApp.cloneNode(true);
        copie.querySelectorAll('script, iframe, noscript, video, audio, canvas, [role="dialog"], [aria-modal="true"], form input[type="hidden"]').forEach((n) => n.remove());
        return copie.innerHTML;
      });
      const mots = contenu.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
      if (mots < 40 || contenu.length > 900_000) { ratees.push(`${route} (${mots} mots, ${contenu.length} car.)`); continue; }
      const html = readFileSync(fichier, 'utf8');
      if (!html.includes('<div id="root"></div>')) { ratees.push(`${route} (racine introuvable)`); continue; }
      writeFileSync(fichier, html.replace('<div id="root"></div>', `<div id="root">${contenu}</div>`));
      faites.push(`${route} (${mots} mots)`);
    } catch (e) {
      ratees.push(`${route} (${e.message.split('\n')[0]})`);
    } finally {
      await page.close();
    }
  }
} finally {
  await navigateur.close();
  await new Promise((r) => serveur.httpServer.close(r));
}
console.log(`instantanés pour Google et les IA : ${faites.length}/${ROUTES.length}\n  ${faites.join('\n  ')}`);
if (ratees.length) console.warn(`⚠️  sans texte : ${ratees.join(' · ')}`);
