// La vérification complète du matin (Krystine, 6 oct. 2026) :
// « Dans ta vérification du matin, tu valides le site EN ENTIER, toujours,
// sur téléphone, sur tablette et sur ordinateur. »
//
// Chaque matin vers 5 h 45, sur l'ordinateur de Krystine, un navigateur
// invisible ouvre TOUTES les pages publiques du site EN LIGNE sur trois
// appareils (téléphone 390×844, tablette 820×1180, ordinateur 1440×900),
// puis refait les parcours d'une visiteuse (quiz, VATA jusqu'à la caisse,
// Rituels vivants jusqu'à la caisse, création de compte jusqu'à la fenêtre).
// Rien n'est soumis, rien n'est payé.
//
// Le résultat va dans Firestore : sante/verifComplete (le dernier) et
// sante/verifComplete/jours/{AAAA-MM-JJ}. Le Bilan du matin
// (functions/src/bilan.ts) le lit et l'ajoute en tête.
// Une capture par page × appareil, seulement en cas d'anomalie, dans
// ~/Library/Application Support/iris-verif/AAAA-MM-JJ/ (purgé après 14 jours).
//
// Lancé par ~/Library/LaunchAgents/ca.krystinestlaurent.verif-complete.plist
// depuis une copie hors iCloud (~/.iris/verif, voir scripts/qa/verif-complete-installer.sh).
//   node scripts/qa/verif-complete.mjs            (tout)
//   VERIF_PAGES=/vata,/quiz node scripts/qa/verif-complete.mjs   (quelques pages, sans écrire dans la base)
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = process.env.VERIF_SITE || 'https://www.krystinestlaurent.ca';
const ICI = dirname(fileURLToPath(import.meta.url));
const PROJET = 'krystinestlaurent-87566';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents`;
const FUSEAU = 'America/Toronto';
const JOUR = new Intl.DateTimeFormat('sv-SE', { timeZone: FUSEAU }).format(new Date());
const RACINE_CAPTURES = join(homedir(), 'Library/Application Support/iris-verif');
const CAPTURES = join(RACINE_CAPTURES, JOUR);
const PARALLELE = Number(process.env.VERIF_PARALLELE || 6);
const SEUIL_LENT = 6000;
const debut = Date.now();

const APPAREILS = [
  { nom: 'téléphone', cle: 'telephone', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' },
  { nom: 'tablette', cle: 'tablette', viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' },
  { nom: 'ordinateur', cle: 'ordinateur', viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false },
];

// ─── 1. La liste des pages publiques ────────────────────────────────────────
// Les routes du site (App.tsx : la copie posée à côté du script par le
// lanceur, sinon celle du dépôt), les pages statiques de public/, le plan du
// site, puis les fiches dynamiques trouvées en suivant les liens des pages
// qui les listent (cours, événements, boutique).
const PRIVEES = [/^\/admin/, /^\/foyer\//, /^\/membres?(\/|$)/, /^\/messages/, /^\/groupes/, /^\/fil$/, /^\/espace$/,
  /^\/demo-/, /^\/v[123]$/, /^\/slidebg$/, /^\/accueil-classic$/, /^\/desinscription$/, /^\/mes-choix$/, /^\/paiement/,
  /^\/origine-loeuvre$/, /^\/foyer-essai$/, /^\/vexel$/];
const STATIQUES = ['/accueil', '/communaute', '/liste-attente-origine'];
// Pages volontairement sans menu : celles où App.tsx (composant Chrome) cache la barre de navigation.
let SANS_MENU = ['/', '/accueil', '/direct', '/podcast/question', '/foyer'];

function routesDuSite() {
  const cache = join(ICI, 'verif-routes.json');
  const candidats = [join(ICI, 'App.tsx'), join(ICI, '../../App.tsx')];
  for (const f of candidats) {
    try {
      const src = readFileSync(f, 'utf8');
      const r = [...src.matchAll(/path="([^"]+)"/g)].map((m) => m[1]);
      const chrome = src.slice(src.indexOf('const Chrome'), src.indexOf('if (hidden)', src.indexOf('const Chrome')));
      const caches = [...chrome.matchAll(/pathname === '([^']+)'/g)].map((m) => m[1]);
      if (caches.length) SANS_MENU = caches;
      if (r.length > 20) { try { writeFileSync(cache, JSON.stringify(r)); } catch { /* lecture seule */ } return r; }
    } catch { /* suivant */ }
  }
  try { return JSON.parse(readFileSync(cache, 'utf8')); } catch { return []; }
}

const chemin = (u) => { try { const x = new URL(u, SITE); return x.pathname.replace(/\/+$/, '') || '/'; } catch { return null; } };
const publique = (p) => p && p !== '*' && !p.includes(':') && !PRIVEES.some((re) => re.test(p));

// Les fiches publiées dans la base (lecture seule) : les cours publiés et les événements publiés.
function slugsDesCours() {
  for (const f of [join(ICI, 'cheminCours.ts'), join(ICI, '../../src/lib/cheminCours.ts')]) {
    try { return Object.fromEntries([...readFileSync(f, 'utf8').matchAll(/'([^']+)':\s*'([^']+)'/g)].map((m) => [m[1], m[2]])); } catch { /* suivant */ }
  }
  return {};
}
async function fichesDeLaBase(T) {
  const requete = async (collection, champ, op, valeurCherchee) => {
    const rep = await fetch(`${BASE}:runQuery`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${T}`, 'Content-Type': 'application/json', 'x-goog-user-project': PROJET },
      body: JSON.stringify({ structuredQuery: { from: [{ collectionId: collection }], where: { fieldFilter: { field: { fieldPath: champ }, op, value: valeur(valeurCherchee) } } } }),
    });
    if (!rep.ok) throw new Error(`${collection} : ${rep.status}`);
    return (await rep.json()).filter((x) => x.document).map((x) => x.document);
  };
  const slugs = slugsDesCours();
  const cours = (await requete('formations', 'statut', 'EQUAL', 'publie')).map((d) => { const id = d.name.split('/').pop(); return `/cours/${slugs[id] || id}`; });
  const evenements = (await requete('events', 'isPublished', 'EQUAL', true)).map((d) => d.fields?.slug?.stringValue).filter(Boolean).map((s) => `/evenement/${s}`);
  return [...cours, ...evenements];
}

async function planDuSite() {
  try {
    const xml = await (await fetch(SITE + '/sitemap.xml')).text();
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => chemin(m[1]));
  } catch { return []; }
}

// ─── 2. Les contrôles d'une page sur un appareil ────────────────────────────
const BRUIT = [
  /recaptcha/i, /google-analytics|googletagmanager|doubleclick|facebook\.net|connect\.facebook|fbevents/i,
  /hotjar|clarity\.ms/i, /net::ERR_ABORTED/i, /ResizeObserver loop/i,
  // Les lecteurs YouTube intégrés demandent l'accès à leurs témoins; le refus du navigateur invisible n'est pas une panne.
  /requestStorageAccess/i,
];
const bruit = (t) => BRUIT.some((re) => re.test(t));
const court = (t, n = 160) => String(t).replace(/\s+/g, ' ').trim().slice(0, n);

async function controlerPage(navigateur, app, p) {
  const ctx = await navigateur.newContext({ viewport: app.viewport, isMobile: app.isMobile, hasTouch: app.hasTouch, userAgent: app.userAgent, deviceScaleFactor: 1, locale: 'fr-CA' });
  const page = await ctx.newPage();
  const problemes = [];
  const erreursJs = [];
  const ressources = [];
  page.on('pageerror', (e) => { if (!bruit(e.message)) erreursJs.push(court(e.message)); });
  page.on('console', (m) => { if (m.type() === 'error' && !bruit(m.text()) && !/Failed to load resource/.test(m.text())) erreursJs.push(court(m.text())); });
  page.on('response', (r) => {
    const t = r.request().resourceType();
    if (r.status() >= 400 && ['image', 'media', 'script', 'stylesheet', 'font'].includes(t) && !bruit(r.url())) ressources.push(`${r.status()} ${court(r.url(), 140)}`);
  });
  page.on('requestfailed', (r) => {
    const t = r.resourceType();
    const raison = r.failure()?.errorText || '';
    if (['image', 'media', 'script', 'stylesheet', 'font'].includes(t) && !bruit(raison) && !bruit(r.url())) ressources.push(`${raison} ${court(r.url(), 140)}`);
  });

  try {
    const rep = await page.goto(SITE + p, { waitUntil: 'load', timeout: 45000 });
    const statut = rep?.status() ?? 0;
    if (statut !== 200) problemes.push(`la page répond ${statut || 'rien'}`);
    await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(1000);
    // Une page qui renvoie volontairement ailleurs (la boutique Shopify) : on note où, sans contrôler l'autre site.
    const hote = new URL(page.url()).host.replace(/^www\./, '');
    if (hote !== new URL(SITE).host.replace(/^www\./, '')) {
      await ctx.close().catch(() => {});
      return { page: p, appareil: app.nom, problemes: [], capture: '', note: `renvoie vers ${hote}` };
    }

    const duree = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return n ? Math.round(n.loadEventEnd || n.duration) : 0; });
    if (duree > SEUIL_LENT) problemes.push(`chargement lent (${(duree / 1000).toFixed(1)} s)`);

    // Premier écran : page introuvable, menu, éléments fixes qui se recouvrent, titres.
    const premier = await page.evaluate(() => {
      const r = {};
      r.introuvable = /^(Page introuvable|Page not found)/.test(document.title);
      const vw = innerWidth, vh = innerHeight;
      const visible = (el) => {
        const b = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return b.width > 4 && b.height > 4 && b.bottom > 0 && b.top < vh && b.right > 0 && b.left < vw && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05;
      };
      const nom = (el) => el.getAttribute('aria-label') || el.id || (el.className && String(el.className).split(/\s+/).find((c) => c && !c.includes(':') && !c.includes('[')) ) || el.tagName.toLowerCase();

      // Le menu : un bouton « menu » ou des liens de navigation visibles, et cliquables (rien par-dessus).
      const candidats = [...document.querySelectorAll('button[aria-label*="menu" i], #mnavBtn, [aria-controls*="nav" i], nav a, header a')].filter(visible);
      const cliquable = candidats.find((el) => {
        const b = el.getBoundingClientRect();
        const t = document.elementFromPoint(Math.min(vw - 1, Math.max(0, b.left + b.width / 2)), Math.min(vh - 1, Math.max(0, b.top + b.height / 2)));
        // Une fenêtre ouverte exprès (la page /aide ouvre le formulaire) peut couvrir le menu.
        return t && (t === el || el.contains(t) || t.contains(el));
      });
      // Une fenêtre ouverte exprès (la page /aide ouvre le formulaire) couvre le menu : normal.
      const fenetre = [...document.querySelectorAll('[aria-modal="true"], [role="dialog"]')].some(visible);
      r.menu = fenetre ? 'ok' : candidats.length ? (cliquable ? 'ok' : `présent mais recouvert (${nom(candidats[0])})`) : 'absent';

      // Les éléments fixes du premier écran (menu, pastille d'aide, bandeau des témoins…) qui se chevauchent.
      const fixes = [...document.querySelectorAll('body *')].filter((el) => {
        const s = getComputedStyle(el);
        if (s.position !== 'fixed' || !visible(el) || el.closest('[aria-hidden="true"]')) return false;
        const b = el.getBoundingClientRect();
        if (b.width * b.height > vw * vh * 0.5) return false; // fonds et voiles plein écran
        if (s.pointerEvents === 'none') return false;
        let p = el.parentElement;
        while (p && p !== document.body) { if (getComputedStyle(p).position === 'fixed') return false; p = p.parentElement; }
        return true;
      });
      r.chevauchements = [];
      for (let i = 0; i < fixes.length; i++) for (let j = i + 1; j < fixes.length; j++) {
        const a = fixes[i].getBoundingClientRect(), b = fixes[j].getBoundingClientRect();
        const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (w > 12 && h > 12) r.chevauchements.push(`${nom(fixes[i])} et ${nom(fixes[j])}`);
      }
      return r;
    });
    if (premier.introuvable) problemes.push('la page affiche « Page introuvable »');
    if (premier.menu !== 'ok' && !premier.introuvable && !SANS_MENU.includes(p) && !SANS_MENU.includes(new URL(page.url()).pathname)) problemes.push(premier.menu === 'absent' ? 'menu absent (ni liens ni bouton de menu au premier écran)' : `menu ${premier.menu}`);
    for (const c of premier.chevauchements.slice(0, 3)) problemes.push(`éléments fixes qui se recouvrent au premier écran : ${c}`);

    // On descend la page pour réveiller les images paresseuses et les apparitions.
    await page.evaluate(async () => {
      const pas = innerHeight * 0.9;
      for (let i = 0; i < 40 && scrollY + innerHeight < document.documentElement.scrollHeight - 2; i++) { scrollBy(0, pas); await new Promise((r) => setTimeout(r, 160)); }
      await new Promise((r) => setTimeout(r, 900));
    });

    const bas = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const r = {};
      r.largeur = document.documentElement.scrollWidth;
      r.vw = vw;
      // Le coupable le plus probable d'un débordement.
      if (r.largeur > vw + 1) {
        const fautif = [...document.querySelectorAll('body *')].find((el) => {
          const b = el.getBoundingClientRect();
          return b.right > vw + 1 && b.width > 0 && getComputedStyle(el).position !== 'fixed';
        });
        r.fautif = fautif ? `${fautif.tagName.toLowerCase()}${fautif.id ? '#' + fautif.id : ''}${fautif.className ? '.' + String(fautif.className).split(/\s+/).slice(0, 2).join('.') : ''}` : '';
      }
      r.cassees = [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && (i.currentSrc || i.src) && !/^data:/.test(i.src) && getComputedStyle(i).display !== 'none').map((i) => (i.currentSrc || i.src).slice(0, 140));
      // Titres h1/h2 : jamais plus de deux lignes (on compte les lignes réelles du texte).
      r.titres = [];
      for (const h of document.querySelectorAll('h1, h2')) {
        const s = getComputedStyle(h);
        const b = h.getBoundingClientRect();
        if (s.display === 'none' || s.visibility === 'hidden' || b.width < 4 || b.height < 4 || !h.textContent.trim()) continue;
        // Les rectangles de chaque bout de texte, regroupés par ligne : un rectangle
        // appartient à une ligne si son centre vertical tombe dedans.
        const rects = [];
        const marche = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
        for (let n = marche.nextNode(); n; n = marche.nextNode()) {
          if (!n.textContent.trim()) continue;
          const rg = document.createRange();
          rg.selectNodeContents(n);
          for (const x of rg.getClientRects()) if (x.width > 2 && x.height > 2) rects.push(x);
        }
        rects.sort((a, c) => a.top - c.top);
        const tri = [];
        for (const x of rects) {
          const centre = (x.top + x.bottom) / 2;
          const ligne = tri.find((l) => centre >= l.top && centre <= l.bottom);
          if (ligne) { ligne.top = Math.min(ligne.top, x.top); ligne.bottom = Math.max(ligne.bottom, x.bottom); }
          else tri.push({ top: x.top, bottom: x.bottom });
        }
        if (tri.length > 2) r.titres.push(`${h.tagName.toLowerCase()} sur ${tri.length} lignes : « ${h.textContent.replace(/\s+/g, ' ').trim().slice(0, 70)} »`);
      }
      return r;
    });
    if (bas.largeur > bas.vw + 1) problemes.push(`débordement horizontal (${bas.largeur} px pour ${bas.vw} px${bas.fautif ? `, ${bas.fautif}` : ''})`);
    for (const c of [...new Set(bas.cassees)].slice(0, 3)) problemes.push(`image cassée : ${c}`);
    for (const t of bas.titres.slice(0, 3)) problemes.push(`titre trop long : ${t}`);
  } catch (e) {
    problemes.push(`la page n'a pas pu s'ouvrir : ${court(e.message.split('\n')[0])}`);
  }
  for (const e of [...new Set(erreursJs)].slice(0, 3)) problemes.push(`erreur JavaScript : ${e}`);
  for (const e of [...new Set(ressources)].slice(0, 4)) problemes.push(`ressource en erreur : ${e}`);

  let capture = '';
  if (problemes.length) {
    try {
      mkdirSync(CAPTURES, { recursive: true });
      capture = join(CAPTURES, `${(p === '/' ? 'racine' : p.slice(1)).replace(/[^a-z0-9-]+/gi, '_')}-${app.cle}.png`);
      await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, 0); }).catch(() => {});
      await page.waitForTimeout(600);
      await page.screenshot({ path: capture, timeout: 15000 });
    } catch { capture = ''; }
  }
  await ctx.close().catch(() => {});
  return { page: p, appareil: app.nom, problemes, capture };
}

// ─── 3. Les parcours d'une visiteuse ────────────────────────────────────────
async function parcours(navigateur, app) {
  const r = [];
  const noter = (nom, ok, detail) => r.push({ nom, appareil: app.nom, ok, detail });
  const ctx = await navigateur.newContext({ viewport: app.viewport, isMobile: app.isMobile, hasTouch: app.hasTouch, userAgent: app.userAgent, deviceScaleFactor: 1, locale: 'fr-CA' });
  const page = await ctx.newPage();
  const fermerTemoins = async () => {
    const b = page.getByRole('button', { name: /accepter|refuser|tout accepter|essentiels/i }).first();
    if (await b.isVisible().catch(() => false)) await b.click().catch(() => {});
  };
  const cliquer = async (loc) => { await loc.click({ timeout: 15000 }); };

  // Le quiz jusqu'au formulaire du résultat, avec la case anti-robot.
  try {
    await page.goto(SITE + '/quiz', { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(2500);
    await fermerTemoins();
    let repondues = 0;
    for (let i = 0; i < 15; i++) {
      const choix = page.locator('button:has(span.rounded-full)').first();
      if (!(await choix.count())) break;
      await choix.click({ timeout: 8000 });
      repondues++;
      await page.waitForTimeout(1100);
    }
    await page.waitForTimeout(3000);
    const courriel = await page.locator('input[type=email]').count();
    const robot = await page.waitForSelector('iframe[src*="recaptcha"]', { timeout: 20000 }).then(() => 1).catch(() => 0);
    noter('Quiz jusqu’au formulaire du résultat', repondues >= 9 && courriel > 0, `${repondues} questions répondues, formulaire ${courriel ? 'présent' : 'ABSENT'}`);
    noter('Case « Je ne suis pas un robot » au résultat du quiz', robot > 0, robot ? 'présente' : 'ABSENTE : le formulaire ne peut pas partir');
  } catch (e) { noter('Quiz jusqu’au formulaire du résultat', false, court(e.message.split('\n')[0])); }

  // VATA puis Rituels vivants : du bouton d'achat jusqu'au formulaire Stripe (rien n'est rempli ni payé).
  for (const [nom, adresse, bouton] of [['VATA jusqu’à la caisse Stripe', '/vata', /commencer/i], ['Rituels vivants jusqu’à la caisse Stripe', '/rituels-vivants', null]]) {
    try {
      await page.goto(SITE + adresse, { waitUntil: 'load', timeout: 45000 });
      await page.waitForTimeout(2000);
      await fermerTemoins();
      if (bouton) await cliquer(page.getByRole('button', { name: bouton }).first());
      else await cliquer(page.getByRole('link', { name: /j.accède aux rituels/i }).first());
      await page.waitForURL(/paiement/, { timeout: 20000 });
      await page.waitForTimeout(1500);
      const prix = /\d{2,3}\s?\$/.test(await page.locator('body').innerText());
      await cliquer(page.getByRole('button', { name: /continuer vers le paiement/i }).first());
      const stripe = await page.waitForSelector('iframe[src*="stripe.com"]', { timeout: 30000 }).then(() => true).catch(() => false);
      noter(nom, prix && stripe, `${prix ? 'prix affiché' : 'PRIX ABSENT'}, ${stripe ? 'formulaire Stripe ouvert' : 'formulaire Stripe ABSENT'}`);
    } catch (e) {
      const texte = await page.locator('body').innerText().catch(() => '');
      const ferme = texte.match(/[^\n]*pas offerte à l.achat[^\n]*/)?.[0];
      noter(nom, false, ferme ? `la page de paiement affiche « ${ferme.trim()} »` : court(e.message.split('\n')[0]));
    }
  }

  // Création de compte jusqu'à la fenêtre (rien n'est envoyé).
  try {
    await page.goto(SITE + '/compte', { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(2500);
    await fermerTemoins();
    const creer = page.getByRole('button', { name: /créer (un|mon) compte/i }).first();
    if (await creer.isVisible().catch(() => false)) await creer.click();
    else {
      const ouvrir = page.getByRole('button', { name: /connexion|se connecter|me connecter|ouvrir mon espace|mon compte/i }).first();
      if (await ouvrir.isVisible().catch(() => false)) await ouvrir.click();
      await page.waitForTimeout(1000);
      const c2 = page.getByRole('button', { name: /créer (un|mon) compte/i }).first();
      if (await c2.isVisible().catch(() => false)) await c2.click();
    }
    await page.waitForTimeout(1200);
    const email = await page.locator('input[type=email]:visible').count();
    const mdp = await page.locator('input[type=password]:visible').count();
    noter('Création de compte jusqu’à la fenêtre', email > 0, email ? `fenêtre ouverte (courriel${mdp ? ' et mot de passe' : ''})` : 'la fenêtre de création de compte ne s’ouvre pas');
  } catch (e) { noter('Création de compte jusqu’à la fenêtre', false, court(e.message.split('\n')[0])); }

  await ctx.close().catch(() => {});
  return r;
}

// ─── 4. Firestore (REST, avec le jeton de l'ordinateur) ─────────────────────
async function jeton() {
  try { return execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { /* pas de gcloud */ }
  const candidats = [join(homedir(), '.iris/tools/node_modules/firebase-tools/lib/auth.js')];
  try { candidats.unshift(execFileSync('npm', ['root', '-g'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() + '/firebase-tools/lib/auth.js'); } catch { /* rien */ }
  const chemin = candidats.find(existsSync);
  const conf = join(homedir(), '.config/configstore/firebase-tools.json');
  if (!chemin || !existsSync(conf)) throw new Error('Ni gcloud ni « firebase login » sur cet ordinateur.');
  const auth = createRequire(import.meta.url)(chemin);
  const t = await auth.getAccessToken(JSON.parse(readFileSync(conf, 'utf8')).tokens.refresh_token, []);
  return t.access_token || t;
}
const valeur = (x) => {
  if (x === null || x === undefined) return { nullValue: null };
  if (x instanceof Date) return { timestampValue: x.toISOString() };
  if (typeof x === 'boolean') return { booleanValue: x };
  if (typeof x === 'number') return Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x };
  if (typeof x === 'string') return { stringValue: x };
  if (Array.isArray(x)) return { arrayValue: { values: x.map(valeur) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(x).map(([k, v]) => [k, valeur(v)])) } };
};
async function ecrire(chemin, doc, T) {
  const rep = await fetch(`${BASE}/${chemin}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${T}`, 'Content-Type': 'application/json', 'x-goog-user-project': PROJET },
    body: JSON.stringify({ fields: valeur(doc).mapValue.fields }),
  });
  if (!rep.ok) throw new Error(`${rep.status} ${court(await rep.text(), 200)}`);
}

// ─── 5. Le déroulement ──────────────────────────────────────────────────────
// La purge des captures de plus de 14 jours.
try {
  const limite = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
  for (const d of readdirSync(RACINE_CAPTURES)) if (/^\d{4}-\d{2}-\d{2}$/.test(d) && d < limite) rmSync(join(RACINE_CAPTURES, d), { recursive: true, force: true });
} catch { /* rien à purger */ }

const essai = process.env.VERIF_PAGES;
let pages;
const navigateur = await chromium.launch();
if (essai) {
  pages = essai.split(',').map((x) => x.trim()).filter(Boolean);
} else {
  const ensemble = new Set([...routesDuSite(), ...STATIQUES, ...(await planDuSite())].filter(publique));
  try { for (const f of await fichesDeLaBase(await jeton())) if (publique(f)) ensemble.add(f); }
  catch (e) { console.error('Fiches de la base illisibles :', e.message); }
  // Les fiches dynamiques, trouvées en suivant les liens des pages qui les listent.
  const ctx = await navigateur.newContext({ viewport: { width: 1440, height: 900 } });
  const pg = await ctx.newPage();
  for (const liste of ['/cours', '/formations', '/evenements', '/boutique', '/accueil', '/medias', '/podcast', '/blogue']) {
    try {
      await pg.goto(SITE + liste, { waitUntil: 'load', timeout: 45000 });
      await pg.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      await pg.waitForTimeout(1500);
      const liens = await pg.$$eval('a[href]', (as) => as.map((a) => a.href));
      for (const l of liens) {
        if (!l.startsWith(SITE) && !l.startsWith(SITE.replace('www.', ''))) continue;
        const p = chemin(l);
        if (p && /^\/(cours|evenement|boutique|blogue)\/[^/]+(\/[^/]+)?$/.test(p) && publique(p)) ensemble.add(p);
      }
    } catch { /* la page de liste sera signalée par son propre contrôle */ }
  }
  await ctx.close();
  pages = [...ensemble].sort();
}
console.log(`${pages.length} pages × ${APPAREILS.length} appareils`);

// Les contrôles, plusieurs à la fois; une page en erreur n'arrête jamais le reste.
const travaux = pages.flatMap((p) => APPAREILS.map((a) => [p, a]));
const resultats = [];
let suivant = 0;
await Promise.all(Array.from({ length: PARALLELE }, async () => {
  while (suivant < travaux.length) {
    const [p, a] = travaux[suivant++];
    const t0 = Date.now();
    try { resultats.push(await controlerPage(navigateur, a, p)); }
    catch (e) { resultats.push({ page: p, appareil: a.nom, problemes: [`contrôle impossible : ${court(e.message)}`], capture: '' }); }
    if (process.env.VERIF_BAVARD) console.log(`${p} (${a.nom}) ${Date.now() - t0} ms`);
  }
}));

const lesParcours = [];
await Promise.all(APPAREILS.map(async (a) => {
  const t0 = Date.now();
  try { lesParcours.push(...await parcours(navigateur, a)); }
  catch (e) { lesParcours.push({ nom: 'Parcours', appareil: a.nom, ok: false, detail: court(e.message) }); }
  if (process.env.VERIF_BAVARD) console.log(`parcours (${a.nom}) ${Date.now() - t0} ms`);
}));
await navigateur.close();

const anomalies = [
  ...resultats.flatMap((r) => r.problemes.map((probleme) => ({ page: r.page, appareil: r.appareil, probleme, capture: r.capture }))),
  ...lesParcours.filter((x) => !x.ok).map((x) => ({ page: `parcours : ${x.nom}`, appareil: x.appareil, probleme: x.detail, capture: '' })),
];
const bilan = {
  le: new Date(),
  jour: JOUR,
  site: SITE,
  pages: pages.length,
  appareils: APPAREILS.map((a) => a.nom),
  verifications: resultats.length + lesParcours.length,
  ok: resultats.filter((r) => !r.problemes.length).length + lesParcours.filter((x) => x.ok).length,
  anomalies,
  parcours: lesParcours,
  listeDesPages: pages,
  dureeSecondes: Math.round((Date.now() - debut) / 1000),
};

mkdirSync(RACINE_CAPTURES, { recursive: true });
writeFileSync(join(RACINE_CAPTURES, `${JOUR}.json`), JSON.stringify(bilan, null, 2));
if (!essai) {
  try {
    const T = await jeton();
    await ecrire('sante/verifComplete', bilan, T);
    await ecrire(`sante/verifComplete/jours/${JOUR}`, bilan, T);
    console.log('Résultat rangé dans sante/verifComplete');
  } catch (e) {
    console.error('Écriture dans la base impossible :', e.message);
  }
}
console.log(`VÉRIF COMPLÈTE : ${bilan.pages} pages, ${bilan.verifications} vérifications, ${bilan.ok} bonnes, ${anomalies.length} anomalie(s), ${bilan.dureeSecondes} s`);
for (const a of anomalies) console.log(`- ${a.page} (${a.appareil}) : ${a.probleme}`);
process.exit(0);
