#!/usr/bin/env node
// Le garde quotidien du site de Krystine : chaque matin, il ouvre les pages
// qui font vivre l'entreprise, vérifie qu'elles répondent et qu'elles portent
// bien ce qu'elles doivent porter, essaie le premier geste du parcours
// d'achat, et dépose un rapport dans l'onglet Bugs de l'admin quand quelque
// chose casse. Il n'écrit rien quand tout va bien (ordre d'Alex, 15 sept 2026 :
// la case « Vérifier fonctionnement des pages » du plan KSL Automne).
//
//   node scripts/qa/garde-quotidien.mjs             vérifie et rapporte à l'écran
//   node scripts/qa/garde-quotidien.mjs --ecrire    dépose aussi les pannes dans Bugs
//   BASE=http://localhost:5199 node scripts/qa/garde-quotidien.mjs   sur un serveur local
//
// Le jeton gcloud sert à écrire dans Firestore (les règles ne s'appliquent pas
// à l'API admin). Sans gcloud, le garde vérifie quand même et rapporte à l'écran.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';

const BASE = process.env.BASE || 'https://www.krystinestlaurent.ca';
const ECRIRE = process.argv.includes('--ecrire');
const PROJET = 'krystinestlaurent-87566';
const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents`;

// Chaque page avec ce qu'elle doit contenir pour être vivante. Le texte
// cherché est court et stable : un titre de section, un bouton, un nom.
const PAGES = [
  { route: '/', attend: ['Krystine'], nom: 'Accueil' },
  { route: '/origine-2', attend: ['liste d’attente'], nom: 'Expérience Origine 2 (la page de vente)' },
  { route: '/foyer', attend: ['Foyer'], nom: 'Le Foyer d’Origine' },
  { route: '/cours', attend: [], nom: 'Les formations' },
  { route: '/podcast', attend: ['Au-delà des tendances'], nom: 'Le podcast' },
  { route: '/conferenciere', attend: [], nom: 'Conférencière (français)' },
  { route: '/speaking', attend: ['Krystine'], nom: 'Conférencière (anglais)' },
  { route: '/evenements', attend: [], nom: 'Les rendez-vous' },
  { route: '/livres', attend: [], nom: 'Les livres' },
  { route: '/boutique', attend: [], nom: 'La boutique', tiers: true },
  { route: '/medias', attend: [], nom: 'Les médias' },
  { route: '/quiz', attend: [], nom: 'Le quiz des doshas' },
  { route: '/compte', attend: [], nom: 'L’espace cliente' },
];

// Les erreurs de console qui ne veulent rien dire (extensions, réseaux tiers).
const BRUIT = /favicon|analytics|gtag|facebook|hotjar|ResizeObserver|third-party cookie|preload|Download the React DevTools|net::ERR_BLOCKED_BY_CLIENT/i;

// Les titres du site sont mis en capitales par la feuille de style, et le
// texte lu par le navigateur porte cette transformation : la comparaison se
// fait donc à plat, sans casse ni accent.
const aplat = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\u2018\u2019\u02bc]/g, "'").replace(/\s+/g, ' ');

const pannes = [];
const signaler = (page, texte) => { pannes.push({ page, texte }); console.log(`  ✗ ${page} — ${texte}`); };

const navigateur = await chromium.launch();
const contexte = await navigateur.newContext({ viewport: { width: 1440, height: 900 } });

console.log(`Garde quotidien · ${BASE}\n`);

for (const p of PAGES) {
  const onglet = await contexte.newPage();
  const erreurs = [];
  onglet.on('console', m => { if (m.type() === 'error' && !BRUIT.test(m.text())) erreurs.push(m.text().slice(0, 200)); });
  onglet.on('pageerror', e => { if (!BRUIT.test(String(e))) erreurs.push(String(e).slice(0, 200)); });
  try {
    const r = await onglet.goto(BASE + p.route, { waitUntil: 'domcontentloaded', timeout: 45000 });
    const code = r?.status() ?? 0;
    if (code >= 400) { signaler(p.nom, `la page répond ${code}`); await onglet.close(); continue; }
    await onglet.waitForTimeout(3500);
    const texte = await onglet.evaluate(() => document.body.innerText);
    if (texte.trim().length < 200) { signaler(p.nom, 'la page est vide ou ne s’est pas montée'); await onglet.close(); continue; }
    const plat = aplat(texte);
    const manque = p.attend.filter(m => !plat.includes(aplat(m)));
    if (manque.length) signaler(p.nom, `le texte attendu manque : ${manque.join(', ')}`);
    // La boutique est servie par Shopify : son thème n'est pas notre code, et
    // ses erreurs de console ne se rapportent pas ici.
    const bruitTiers = p.tiers ? [] : erreurs;
    if (bruitTiers.length) signaler(p.nom, `erreur dans la console : ${bruitTiers[0]}`);
    if (!manque.length && !bruitTiers.length) console.log(`  ✓ ${p.nom}`);
  } catch (e) {
    signaler(p.nom, `la page n’a pas répondu : ${String(e).split('\n')[0].slice(0, 160)}`);
  }
  await onglet.close();
}

// Le formulaire d'infolettre de l'accueil : le champ existe et accepte une
// adresse. Rien n'est soumis : une inscription de test salirait la liste.
{
  const onglet = await contexte.newPage();
  try {
    await onglet.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await onglet.waitForTimeout(3000);
    const champs = await onglet.locator('input[type="email"]').count();
    if (champs === 0) signaler('Accueil', 'aucun champ d’adresse courriel : le formulaire d’infolettre a disparu');
    else console.log('  ✓ Le formulaire d’infolettre est en place');
  } catch (e) {
    signaler('Accueil', `formulaire d’infolettre : ${String(e).split('\n')[0].slice(0, 140)}`);
  }
  await onglet.close();
}

// Le parcours d'achat, jusqu'à la porte : la page de vente montre son bouton
// et son prix quand la vente est ouverte. Aucun paiement n'est lancé.
{
  const onglet = await contexte.newPage();
  try {
    await onglet.goto(BASE + '/origine-2', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await onglet.waitForTimeout(3500);
    const texte = await onglet.evaluate(() => document.body.innerText);
    const enVente = /Prendre ma place/i.test(texte);
    const enAttente = /liste d.attente/i.test(texte);
    if (!enVente && !enAttente) signaler('Expérience Origine 2', 'ni bouton d’achat ni liste d’attente : la page de vente ne propose plus rien');
    else console.log(`  ✓ Origine 2 : ${enVente ? 'la vente est ouverte' : 'liste d’attente (vente pas encore ouverte)'}`);
  } catch (e) {
    signaler('Expérience Origine 2', `parcours d’achat : ${String(e).split('\n')[0].slice(0, 140)}`);
  }
  await onglet.close();
}

// Le collant Vexel : le garde d'exécution est servi, et chaque page montre le
// collant « Site créé par Vexel Webstudio » (le vrai, ou celui que le garde
// repose si un pied de page l'a perdu). S'il manque, Alex le sait le matin même.
{
  const onglet = await contexte.newPage();
  try {
    const r = await onglet.goto(BASE + '/vexel-garde.js', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const corps = r && r.status() < 400 ? await r.text() : '';
    if (!corps.includes('vexel-garde:v1')) signaler('Collant Vexel', 'le garde d’exécution /vexel-garde.js n’est plus servi');
    for (const route of ['/', '/medias', '/foyer', '/compte']) {
      await onglet.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await onglet.waitForTimeout(6000);
      const etat = await onglet.evaluate(() => {
        const liens = [...document.querySelectorAll('a.cv-foil')];
        const visibles = liens.filter(a => { const r = a.getBoundingClientRect(); const s = getComputedStyle(a); return r.width > 60 && r.height > 24 && s.display !== 'none' && s.visibility !== 'hidden'; });
        return { total: liens.length, visibles: visibles.length, secours: visibles.some(a => a.id === 'vexel-garde-collant'), garde: !!document.querySelector('script[src="/vexel-garde.js"]') };
      });
      if (!etat.garde) signaler('Collant Vexel', `${route} ne charge plus /vexel-garde.js`);
      if (!etat.visibles) signaler('Collant Vexel', `${route} n’affiche plus le collant « Site créé par Vexel Webstudio »`);
      else if (etat.secours) signaler('Collant Vexel', `${route} : le pied de page a perdu son collant, le garde le repose en bas à droite`);
      else console.log(`  ✓ Collant Vexel en place sur ${route}`);
    }
  } catch (e) {
    signaler('Collant Vexel', `vérification impossible : ${String(e).split('\n')[0].slice(0, 140)}`);
  }
  await onglet.close();
}

await navigateur.close();

console.log(`\n${pannes.length ? `${pannes.length} panne(s)` : 'Tout va bien'}`);

if (!pannes.length || !ECRIRE) {
  if (pannes.length && !ECRIRE) console.log('(essai à blanc : relancer avec --ecrire pour déposer le rapport dans l’admin)');
  process.exit(pannes.length ? 1 : 0);
}

// Le rapport dans l'onglet Bugs, une fiche par panne, avec la même forme que
// celles déposées par une visiteuse pour que l'admin les affiche pareil.
let jeton;
try { jeton = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim(); }
catch { console.error('gcloud absent : rien n’a été déposé dans l’admin.'); process.exit(1); }

const chaine = v => ({ stringValue: String(v) });
for (const p of pannes) {
  const fields = {
    uid: chaine('garde-quotidien'),
    nom: chaine('Le garde quotidien'),
    courriel: chaine('alex@lesalondesinconnus.com'),
    texte: chaine(`${p.page} : ${p.texte}`),
    page: chaine(BASE),
    capture: chaine(''),
    agent: chaine('garde-quotidien (Playwright)'),
    ecran: chaine('1440x900'),
    statut: chaine('nouveau'),
    vexel: chaine('transmis'),
    cree: { timestampValue: new Date().toISOString() },
  };
  const r = await fetch(`${FIRESTORE}/bugs`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!r.ok) console.error('dépôt refusé :', (await r.text()).slice(0, 200));
}
console.log(`${pannes.length} rapport(s) déposé(s) dans l’admin › Bugs.`);
process.exit(1);
