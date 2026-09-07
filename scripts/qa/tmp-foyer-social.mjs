// QA temporaire : inventaire visuel de l'espace social du Foyer (avant).
// Deux comptes jetables : qa1 membre du Foyer, qa2 sans le Foyer (sert de
// correspondante et de scénario « garde-fou »). Tout est effacé à la fin.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const API_KEY = fs.readFileSync('.env.local', 'utf8').match(/VITE_FIREBASE_API_KEY=(.+)/)[1].trim();
const PROJET = 'krystinestlaurent-87566';
const BASE = process.env.BASE || 'http://localhost:5199';
const OUT = process.env.OUT || '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/foyer-social/avant';
fs.mkdirSync(OUT, { recursive: true });
const rest = async (url, body) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
const gtoken = execSync('gcloud auth print-access-token').toString().trim();
const FS = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents`;
const fsdoc = async (path, fields) => {
  const r = await fetch(`${FS}/${path}`, { method: 'PATCH', headers: { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
  if (!r.ok) console.log('firestore', path, r.status, await r.text());
};
const fsdel = async (path) => fetch(`${FS}/${path}`, { method: 'DELETE', headers: { Authorization: `Bearer ${gtoken}` } });
const fslist = async (path) => { const r = await fetch(`${FS}/${path}?pageSize=200`, { headers: { Authorization: `Bearer ${gtoken}` } }); const j = await r.json(); return (j.documents || []).map(d => d.name.split('/documents/')[1]); };

const creer = async (nom) => {
  const email = `qa-${nom}-${Date.now()}@vexel-qa.test`; const password = 'Qa!' + Math.random().toString(36).slice(2, 12);
  const u = await rest(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { email, password, returnSecureToken: true });
  return { ...u, email, uid: u.localId };
};
const sessionDe = (u, nom) => ({ uid: u.uid, email: u.email, emailVerified: false, isAnonymous: false, displayName: nom, providerData: [{ providerId: 'password', uid: u.email, displayName: null, email: u.email, phoneNumber: null, photoURL: null }],
  stsTokenManager: { refreshToken: u.refreshToken, accessToken: u.idToken, expirationTime: Date.now() + Number(u.expiresIn) * 1000 }, createdAt: String(Date.now()), lastLoginAt: String(Date.now()), apiKey: API_KEY, appName: '[DEFAULT]' });

const q1 = await creer('foyer'); const q2 = await creer('amie');
console.log('comptes', q1.uid, q2.uid);
const now = { timestampValue: new Date().toISOString() };
await fsdoc(`members/${q1.uid}`, { uid: { stringValue: q1.uid }, email: { stringValue: q1.email }, displayName: { stringValue: 'Test QA Foyer' }, dosha: { stringValue: 'vata' }, personnalisation: { mapValue: { fields: { banniere: { stringValue: 'defaut' } } } } });
await fsdoc(`members/${q2.uid}`, { uid: { stringValue: q2.uid }, email: { stringValue: q2.email }, displayName: { stringValue: 'Amie QA' }, dosha: { stringValue: 'pitta' } });
await fsdoc(`memberPoints/${q1.uid}`, { balance: { integerValue: '120' }, lifetime: { integerValue: '120' } });
await fsdoc(`achatsFormations/${q1.uid}/formations/foyer`, { titre: { stringValue: "Le Foyer d'Origine" }, source: { stringValue: 'qa' }, creeLe: now });
await fsdoc(`groupes/foyer/membres/${q1.uid}`, { ajouteLe: now });

const mesures = {};
const browser = await chromium.launch();

const ouvrirSession = async (viewport, u, nom) => {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/robots.txt`);
  await page.evaluate(([key, val]) => new Promise((res, rej) => {
    const jour = new Date().toISOString().slice(0, 10);
    localStorage.setItem('krystine-jeu-vu', jour);
    localStorage.setItem('krystine-roue-vue', jour);
    localStorage.setItem('krystine-banniere-flash-vu', '1');
    localStorage.setItem('krystine-cloche-vu', String(Date.now() - 86400000 * 30));
    const req = indexedDB.open('firebaseLocalStorageDb', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
    req.onsuccess = () => { const tx = req.result.transaction('firebaseLocalStorage', 'readwrite'); tx.objectStore('firebaseLocalStorage').put({ fbase_key: key, value: val }); tx.oncomplete = () => res(true); tx.onerror = rej; };
    req.onerror = rej;
  }), [`firebase:authUser:${API_KEY}:[DEFAULT]`, sessionDe(u, nom)]);
  return { ctx, page };
};

const fermerRoue = async (page) => { const r = page.locator('.fixed.inset-0.z-\\[125\\]'); if (await r.count()) { await r.first().click({ position: { x: 8, y: 8 } }).catch(() => {}); await page.waitForTimeout(400); } };

const mesurer = (page) => page.evaluate(() => {
  const vw = window.innerWidth;
  const racine = document.querySelector('#root > div > div') || document.querySelector('#root');
  const css = (el, p) => el ? getComputedStyle(el)[p] : null;
  const h1 = document.querySelector('h1');
  const lignesH1 = h1 ? Math.round(h1.getBoundingClientRect().height / parseFloat(getComputedStyle(h1).lineHeight)) : null;
  // Le premier conteneur « max-w-* » plus étroit que la fenêtre : la colonne centrée fautive, s'il y en a une.
  const conteneurs = [...document.querySelectorAll('#root [class*="max-w-"]')]
    .map(el => ({ el, r: el.getBoundingClientRect() }))
    .filter(x => x.r.width > 0 && x.r.width < vw - 2 && x.r.height > 120);
  const c = conteneurs[0];
  const contenu = c ? { classe: [...c.el.classList].filter(k => k.startsWith('max-w') || k.startsWith('mx-')).join(' '), largeur: Math.round(c.r.width), gauche: Math.round(c.r.left), ratio: +(c.r.width / vw).toFixed(2) } : null;
  const rayons = [...new Set([...document.querySelectorAll('#root [class*="rounded-["]')].map(el => getComputedStyle(el).borderRadius))].slice(0, 8);
  const fondPage = css(racine, 'backgroundColor');
  const carte = document.querySelector('#root [class*="bg-white/55"], #root [class*="bg-white\\/55"]');
  const p = document.querySelector('#root p');
  const italiques = [...document.querySelectorAll('#root *')].filter(el => getComputedStyle(el).fontStyle === 'italic' && el.textContent.trim()).slice(0, 3).map(el => el.textContent.trim().slice(0, 60));
  return {
    vw, hauteurDoc: document.documentElement.scrollHeight, debordementX: document.documentElement.scrollWidth > vw,
    fondPage, fondCarte: carte ? getComputedStyle(carte).backgroundColor : null,
    h1: h1 ? { texte: h1.textContent.trim().slice(0, 60), font: css(h1, 'fontFamily').split(',')[0], taille: css(h1, 'fontSize'), couleur: css(h1, 'color'), lignes: lignesH1 } : null,
    corps: p ? { font: css(p, 'fontFamily').split(',')[0], taille: css(p, 'fontSize'), couleur: css(p, 'color') } : null,
    contenu, rayons, italiques,
  };
});

const capter = async (page, nom, vp, { plein = true, attendre = 2500, avant } = {}) => {
  await page.waitForTimeout(attendre); await fermerRoue(page);
  if (avant) await avant();
  const fichier = `${OUT}/${nom}-${vp}.png`;
  await page.screenshot({ path: fichier, fullPage: plein });
  mesures[`${nom}-${vp}`] = await mesurer(page);
  console.log('capture', nom, vp, mesures[`${nom}-${vp}`].contenu);
};

try {
  // ── 1. Préparer les états sociaux avec qa1 (1440) : amitié demandée à qa2, un message envoyé ──
  {
    const { ctx, page } = await ouvrirSession({ width: 1440, height: 900 }, q1, 'Test QA Foyer');
    await page.goto(`${BASE}/membre/${q2.uid}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000); await fermerRoue(page);
    const btn = page.locator('button', { hasText: /^\s*Amie d.origine\s*$/ }).first();
    if (await btn.count()) { await btn.click(); await page.waitForTimeout(1200); } else console.log('pas de bouton amitié');
    await page.goto(`${BASE}/messages/${q2.uid}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000); await fermerRoue(page);
    await page.fill('#mot-prive', 'Bonjour Amie, on se retrouve autour du feu ce soir ?');
    await page.locator('button[aria-label="Envoyer"]').click(); await page.waitForTimeout(1500);
    await ctx.close();
  }

  for (const [vp, viewport] of [['1440', { width: 1440, height: 900 }], ['390', { width: 390, height: 844 }]]) {
    // ── 2. qa1, membre du Foyer ──
    const { ctx, page } = await ouvrirSession(viewport, q1, 'Test QA Foyer');
    const aller = async (url) => { await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded' }); };

    await aller('/compte'); await capter(page, 'compte-formations', vp, { attendre: 3500 });
    await aller('/compte?onglet=profile'); await capter(page, 'compte-profil', vp);
    await aller('/compte?onglet=amis'); await capter(page, 'compte-amis', vp);
    await aller('/compte?onglet=messagerie'); await capter(page, 'compte-messagerie', vp, { attendre: 3000, avant: async () => {
      const fil = page.locator('button', { hasText: 'Amie QA' }).first(); if (await fil.count()) { await fil.click(); await page.waitForTimeout(1200); }
    } });
    // La cloche et la bulle des messages, dans la barre du haut
    await aller('/compte'); await page.waitForTimeout(3000); await fermerRoue(page);
    await page.locator('button[aria-label^="Notifications"]').click(); await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/cloche-notifications-${vp}.png` });
    await page.locator('button[aria-label^="Messages"]').click(); await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/cloche-messages-${vp}.png` });
    await page.keyboard.press('Escape');

    await aller('/membres'); await capter(page, 'membres', vp, { attendre: 3500 });
    await aller(`/membre/${q2.uid}`); await capter(page, 'membre-autre', vp, { attendre: 3500 });
    await aller(`/membre/${q1.uid}`); await capter(page, 'membre-soi', vp);
    await aller('/messages'); await capter(page, 'messages-liste', vp, { attendre: 3000 });
    await aller(`/messages/${q2.uid}`); await capter(page, 'messages-fil', vp, { attendre: 3000 });
    await aller('/cours/foyer'); await capter(page, 'cours-foyer', vp, { attendre: 5000 });
    // L'espace de groupe seul, cadré dans la fenêtre
    const groupe = page.locator('h2', { hasText: /Autour du feu/ }).first();
    if (await groupe.count()) { await groupe.scrollIntoViewIfNeeded(); await page.waitForTimeout(800); await page.screenshot({ path: `${OUT}/cours-foyer-groupe-${vp}.png` }); }
    // Le skin Nuit sur la messagerie et les amis : le texte reste-t-il lisible ?
    await fsdoc(`members/${q1.uid}`, { uid: { stringValue: q1.uid }, email: { stringValue: q1.email }, displayName: { stringValue: 'Test QA Foyer' }, dosha: { stringValue: 'vata' }, personnalisation: { mapValue: { fields: { banniere: { stringValue: 'defaut' }, skin: { stringValue: 'nuit' } } } } });
    await aller('/compte?onglet=messagerie'); await capter(page, 'skin-nuit-messagerie', vp, { attendre: 3500, plein: false, avant: async () => {
      const fil = page.locator('button', { hasText: 'Amie QA' }).first(); if (await fil.count()) { await fil.click(); await page.waitForTimeout(1200); }
    } });
    await aller('/compte?onglet=amis'); await capter(page, 'skin-nuit-amis', vp, { plein: false });
    await fsdoc(`members/${q1.uid}`, { uid: { stringValue: q1.uid }, email: { stringValue: q1.email }, displayName: { stringValue: 'Test QA Foyer' }, dosha: { stringValue: 'vata' }, personnalisation: { mapValue: { fields: { banniere: { stringValue: 'defaut' }, skin: { stringValue: 'medzo' } } } } });
    await aller('/compte?onglet=amis'); await capter(page, 'skin-medzo-amis', vp, { plein: false });
    await fsdoc(`members/${q1.uid}`, { uid: { stringValue: q1.uid }, email: { stringValue: q1.email }, displayName: { stringValue: 'Test QA Foyer' }, dosha: { stringValue: 'vata' }, personnalisation: { mapValue: { fields: { banniere: { stringValue: 'defaut' } } } } });
    if (vp === '1440') { await aller('/communaute'); await page.waitForTimeout(4000); await page.screenshot({ path: `${OUT}/communaute-statique-${vp}.png` }); }
    await ctx.close();

    // ── 3. qa2, sans le Foyer : le garde-fou ──
    const s2 = await ouvrirSession(viewport, q2, 'Amie QA');
    const aller2 = async (url) => { await s2.page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded' }); };
    await aller2('/membres'); await capter(s2.page, 'garde-membres', vp, { attendre: 3500 });
    await aller2('/compte?onglet=amis'); await capter(s2.page, 'garde-compte-amis', vp, { attendre: 3500 });
    await aller2('/compte?onglet=messagerie'); await capter(s2.page, 'garde-compte-messagerie', vp);
    await aller2(`/membre/${q1.uid}`); await capter(s2.page, 'garde-membre', vp, { attendre: 3500 });
    await aller2('/cours/foyer'); await s2.page.waitForTimeout(3500); console.log('qa2 /cours/foyer →', s2.page.url());
    await s2.ctx.close();
  }
  fs.writeFileSync(`${OUT}/mesures.json`, JSON.stringify(mesures, null, 2));
} finally {
  await browser.close();
  for (const u of [q1, q2]) await rest(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`, { idToken: u.idToken });
  const fil = [q1.uid, q2.uid].sort().join('__');
  for (const m of await fslist(`dms/${fil}/messages`)) await fsdel(m);
  for (const p of [`dms/${fil}`, `amities/${fil}`, `groupes/foyer/membres/${q1.uid}`, `achatsFormations/${q1.uid}/formations/foyer`, `memberPoints/${q1.uid}`, `members/${q1.uid}`, `members/${q2.uid}`, `progression/${q1.uid}/formations/foyer`]) await fsdel(p);
  console.log('fini, nettoyé');
}
