// QA temporaire : l'onglet « Aider » côté client, connecté en vrai avec
// admin@krystinestlaurent.ca (bouton se connecter → « Déjà un compte ? Se
// connecter » → courriel + mot de passe). Capture le desktop et le mobile,
// pousse le formulaire jusqu'à une question échelle, tente un vrai envoi
// (attendu en échec tant que les fonctions ne sont pas déployées), puis
// simule la complétion réelle par REST pour vérifier la liste et le solde.
// Fichier jetable — supprimé après usage (RÈGLE -5).
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const BASE = 'http://localhost:5199';
const OUT = 'scripts/qa/shots';
const PROJET = 'krystinestlaurent-87566';
const EMAIL = 'admin@krystinestlaurent.ca';
const PASSWORD = readFileSync(`${process.env.HOME}/.claude/scripts/.krystine_admin_pw`, 'utf8').trim();

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[console]', m.text().slice(0, 200)); });

// ── Connexion réelle ────────────────────────────────────────────────────
await page.goto(`${BASE}/compte`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);
await page.getByRole('button', { name: /Se connecter/i }).first().click();
await page.waitForTimeout(500);
await page.getByRole('button', { name: /Déjà un compte/i }).click();
await page.waitForTimeout(300);
await page.getByPlaceholder('Courriel').fill(EMAIL);
await page.getByPlaceholder('Mot de passe').fill(PASSWORD);
await page.locator('form button[type="submit"]').click();
await page.waitForTimeout(3000);
console.log('connecté, url =', page.url());

// ── La liste, desktop ───────────────────────────────────────────────────
await page.goto(`${BASE}/compte?onglet=aider`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUT}/aider-liste-1440.png`, fullPage: true });
console.log('capture liste desktop');

// ── Ouvrir le premier sondage, avancer jusqu'à une question échelle ────
const premiereCarte = page.getByRole('button', { name: /Répondre/i }).first();
await premiereCarte.click();
await page.waitForTimeout(600);
// q1 (choix) : cliquer la première option puis Suivant.
await page.locator('button', { hasText: 'Téléphone' }).first().click();
await page.getByRole('button', { name: /Suivant/i }).click();
await page.waitForTimeout(400);
// q2 est une échelle (« Le site se charge et répond… »).
await page.screenshot({ path: `${OUT}/aider-formulaire-echelle-1440.png`, fullPage: true });
console.log('capture formulaire échelle desktop');

// Répondre au reste des questions obligatoires jusqu'à « Envoyer », en
// choisissant toujours la première option/échelon pour avancer.
for (let i = 0; i < 8; i++) {
  const boutonEnvoyer = page.getByRole('button', { name: /^Envoyer$/i });
  if (await boutonEnvoyer.count()) break;
  // Répondre selon le type visible : pastille de choix, échelon, ou texte facultatif laissé vide.
  const pastille = page.locator('button.rounded-full, button.h-11').first();
  if (await pastille.count()) await pastille.click({ timeout: 1500 }).catch(() => {});
  await page.getByRole('button', { name: /Suivant|Envoyer/i }).click();
  await page.waitForTimeout(350);
}
await page.screenshot({ path: `${OUT}/aider-derniere-question-1440.png`, fullPage: true });
const boutonEnvoyer = page.getByRole('button', { name: /^Envoyer$/i });
if (await boutonEnvoyer.count()) {
  await boutonEnvoyer.click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/aider-envoi-reel-1440.png`, fullPage: true });
  console.log('capture après tentative d’envoi réel (attendu : échec, fonction non déployée)');
}

// Retour à la liste pour la suite.
await page.goto(`${BASE}/compte?onglet=aider`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);

// ── Mobile, même session ────────────────────────────────────────────────
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/aider-liste-390.png`, fullPage: true });
console.log('capture liste mobile');
await page.getByRole('button', { name: /Répondre/i }).first().click();
await page.waitForTimeout(600);
await page.locator('button', { hasText: 'Je découvre' }).first().click().catch(() => {});
await page.screenshot({ path: `${OUT}/aider-formulaire-390.png`, fullPage: true });
console.log('capture formulaire mobile');

await browser.close();

// ── Simuler la complétion réelle (le crédit + le retrait de la liste) ──
// pour vérifier la lecture live sans dépendre du déploiement de la
// fonction : mêmes écritures que repondreSondage, sur le compte admin
// (temporaires, nettoyées à la fin par _aider-nettoie.mjs).
const gtoken = execSync('gcloud auth print-access-token').toString().trim();
const H = { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' };
const lookup = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJET}/accounts:lookup`, { method: 'POST', headers: H, body: JSON.stringify({ email: [EMAIL] }) }).then((r) => r.json());
const uid = lookup.users?.[0]?.localId;
if (!uid) { console.error('uid admin introuvable', lookup); process.exit(1); }
console.log('uid admin =', uid);

const wrap = (v) => {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(wrap) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, vv]) => [k, wrap(vv)])) } };
};
const fsdoc = async (path, obj) => {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents/${path}`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields: wrap(obj).mapValue.fields }) });
  if (!r.ok) console.error('fsdoc', path, r.status, await r.text());
};
const fsget = (path) => fetch(`https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents/${path}`, { headers: H }).then((r) => (r.ok ? r.json() : null));

const avant = await fsget(`memberPoints/${uid}`);
const soldeAvant = Number(avant?.fields?.balance?.integerValue || 0);
console.log('solde avant =', soldeAvant);

await fsdoc(`sondages/formations-2026-09/reponses/${uid}`, { uid, email: EMAIL, reponses: { q1: 'Je pratique un peu' }, at: new Date() });
await fsdoc(`members/${uid}/sondagesFaits/formations-2026-09`, { at: new Date(), niskas: 10 });
await fsdoc(`pointsEvents/sondage:${uid}:formations-2026-09`, { uid, kind: 'sondage', amount: 10, dedupKey: `sondage:${uid}:formations-2026-09`, meta: { sondageId: 'formations-2026-09' }, at: new Date() });
await fsdoc(`memberPoints/${uid}`, { balance: soldeAvant + 10, updatedAt: new Date() });

const apres = await fsget(`memberPoints/${uid}`);
console.log('solde après =', apres?.fields?.balance?.integerValue);

// Recharger la page et confirmer la carte disparue + le solde monté.
const browser2 = await chromium.launch();
const ctx2 = await browser2.newContext({ viewport: { width: 1440, height: 900 } });
const page2 = await ctx2.newPage();
await page2.goto(`${BASE}/compte`, { waitUntil: 'domcontentloaded' });
await page2.waitForTimeout(1000);
await page2.getByRole('button', { name: /Se connecter/i }).first().click();
await page2.waitForTimeout(400);
await page2.getByRole('button', { name: /Déjà un compte/i }).click();
await page2.waitForTimeout(200);
await page2.getByPlaceholder('Courriel').fill(EMAIL);
await page2.getByPlaceholder('Mot de passe').fill(PASSWORD);
await page2.locator('form button[type="submit"]').click();
await page2.waitForTimeout(3000);
await page2.goto(`${BASE}/compte?onglet=aider`, { waitUntil: 'domcontentloaded' });
await page2.waitForTimeout(2000);
await page2.screenshot({ path: `${OUT}/aider-apres-completion-1440.png`, fullPage: true });
console.log('capture liste après complétion simulée (formations-2026-09 doit être absent)');
await browser2.close();

console.log('uid_admin_pour_nettoyage=' + uid);
