// Capture les écrans d'analytics du harnais (serveur lancé à part sur 5184).
// Lancer : node scripts/qa/harnais-analytics/capturer.mjs
// Chaque capture est mesurée avant d'être gardée : canevas ou graphiques
// réellement peints dans la partie capturée, textes attendus présents, cadre
// chargé, aucune erreur de console. Aucune requête vers les fonctions
// (cloudfunctions.net, run.app) ni vers le collecteur (/api/vh) ne sort :
// elles sont coupées à la source et comptées.
import { chromium } from 'playwright';
import sharp from 'sharp';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
// Les images servent à la page d'accueil du studio Vexel.
const SORTIE = path.join(os.homedir(), 'Documents/Websites/vexel-site/public/previews/studio');
const BASE = 'http://localhost:5184/scripts/qa/harnais-analytics/index.html?jours=30';
const LARGEUR = 1600;
const COUPER = /cloudfunctions\.net|\.run\.app|\/api\/vh/;

const coupees = [];
const fuites = [];
const erreurs = [];
const exterieures = new Set();
const mesures = {};

const navigateur = await chromium.launch({ headless: true });
try {
  const contexte = await navigateur.newContext({ viewport: { width: LARGEUR, height: 1600 }, deviceScaleFactor: 1, reducedMotion: 'reduce', locale: 'fr-CA' });
  await contexte.route(COUPER, route => { coupees.push(route.request().url()); return route.abort(); });
  const page = await contexte.newPage();
  page.on('console', m => { if (m.type() === 'error') erreurs.push({ texte: m.text().slice(0, 200), url: m.location().url }); });
  page.on('pageerror', e => erreurs.push({ texte: `exception : ${String(e).slice(0, 200)}` }));
  page.on('request', r => { const h = new URL(r.url()).host; if (!h.startsWith('localhost')) exterieures.add(h); });
  page.on('response', r => { if (COUPER.test(r.url())) fuites.push(r.url()); });

  // Seules les rangées du canevas qui tombent dans la capture comptent.
  const pixelsPeints = (basCapture) => page.evaluate(bas => {
    const c = document.querySelector('canvas[aria-hidden="true"]');
    if (!c || !c.width) return 0;
    const b = c.getBoundingClientRect();
    const rangees = Math.max(0, Math.min(c.height, Math.round(((bas - b.top) / b.height) * c.height)));
    if (!rangees) return 0;
    const d = c.getContext('2d').getImageData(0, 0, c.width, rangees).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i]) n += 1;
    return n;
  }, basCapture);
  const etatCadre = () => page.evaluate(() => {
    const f = document.querySelector('iframe[title^="Aperçu"]');
    const d = f?.contentDocument;
    return { hauteurDoc: d?.documentElement.scrollHeight || 0, elements: d?.querySelectorAll('*').length || 0, src: f?.getAttribute('src') };
  });
  const attendrePeinture = async (bas) => {
    for (let i = 0; i < 80; i += 1) { if ((await pixelsPeints(bas)) > 5000) return; await page.waitForTimeout(500); }
  };
  const capturer = async (nom, hauteur, textes, extra = {}) => {
    const corps = await page.evaluate(() => document.body.textContent);
    const manquants = textes.filter(t => !corps.includes(t));
    const png = await page.screenshot({ clip: { x: 0, y: 0, width: LARGEUR, height: hauteur } });
    const info = await sharp(png).webp({ quality: 74, effort: 6 }).toFile(path.join(SORTIE, `${nom}.webp`));
    mesures[nom] = { largeur: info.width, hauteur: info.height, octets: info.size, manquants, ...extra };
  };

  // Un premier passage réchauffe le cache de dépendances de Vite.
  for (const u of ['http://localhost:5184/accueil?vh=apercu', `${BASE}&onglet=ensemble`]) {
    await page.goto(u, { waitUntil: 'load' });
    await page.waitForTimeout(2500);
  }
  erreurs.length = 0;

  // 1. La carte des clics sur l'accueil de Krystine.
  await page.goto(`${BASE}&onglet=cartes&page=accueil`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('iframe[title^="Aperçu"]');
  await attendrePeinture(1150);
  await page.waitForTimeout(800);
  await capturer('analytics-krystine-chaleur', 1150, ['Cartes de chaleur', 'clics', 'Accueil'], { pixels: await pixelsPeints(1150), cadre: await etatCadre() });

  // 2. La vue d'ensemble : courbe des visites, corridors, sources.
  await page.goto(`${BASE}&onglet=ensemble`, { waitUntil: 'domcontentloaded' });
  await page.getByText('Visites par jour').waitFor({ timeout: 20000 });
  await page.waitForTimeout(1200);
  const graphiques = await page.evaluate(() => [...document.querySelectorAll('#outil svg[role="img"]')]
    .filter(s => s.getBoundingClientRect().top < 1400 && [...s.querySelectorAll('path')].some(c => (c.getAttribute('d') || '').length > 200))
    .map(s => ({ graphique: s.getAttribute('aria-label'), longueurTrace: Math.max(...[...s.querySelectorAll('path')].map(c => (c.getAttribute('d') || '').length)) })));
  await capturer('analytics-krystine-ensemble', 1400, ['Visites par jour', 'Découverte', 'Retour'], { graphiquesPeints: graphiques });
} finally {
  await navigateur.close();
}

console.log(JSON.stringify({ mesures, coupees: coupees.length, hotesCoupes: [...new Set(coupees.map(u => new URL(u).host + new URL(u).pathname))], fuites, hotesExterieurs: [...exterieures], erreurs }, null, 2));
