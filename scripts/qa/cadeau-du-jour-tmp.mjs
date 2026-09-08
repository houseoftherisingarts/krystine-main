// Script TEMPORAIRE de vérification du cadeau du jour — supprimé après usage.
// Orchestre les manipulations REST (Firestore) et les captures Playwright,
// aux deux tailles (1440 desktop, 390 mobile), pour chaque état de la carte.
//   KRYSTINE_ADMIN_PW=... node scripts/qa/cadeau-du-jour-tmp.mjs
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';

const PROJECT = 'krystinestlaurent-87566';
const UID = 'NmRjefwpVEXGrMLF3mO47KXflJj2'; // admin@krystinestlaurent.ca
const EMAIL = 'admin@krystinestlaurent.ca';
const PW = process.env.KRYSTINE_ADMIN_PW;
const BASE = process.env.BASE || 'http://localhost:5195';
if (!PW) { console.error('KRYSTINE_ADMIN_PW manquant'); process.exit(1); }

const TOKEN = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
const H = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', 'x-goog-user-project': PROJECT };
const DOCS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

// La journée civile de Montréal, comme functions/src/niskas.ts.
function journee(ms = Date.now()) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(ms));
  const v = (t) => p.find((x) => x.type === t)?.value ?? '';
  return `${v('year')}-${v('month')}-${v('day')}`;
}
const veilleDe = (j) => journee(new Date(`${j}T12:00:00-04:00`).getTime() - 86_400_000);
const AUJOURDHUI = journee();
const HIER = veilleDe(AUJOURDHUI);

async function patchMemberPoints(fields, deleteFields = []) {
  const mask = [...Object.keys(fields), ...deleteFields].map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
  const body = { fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, typeof v === 'number' ? { integerValue: String(v) } : { stringValue: v }])) };
  const r = await fetch(`${DOCS}/memberPoints/${UID}?${mask}`, { method: 'PATCH', headers: H, body: JSON.stringify(body) });
  if (!r.ok) console.error('patchMemberPoints', r.status, await r.text());
  return r.ok;
}
async function deleteEvent(cle) {
  const r = await fetch(`${DOCS}/pointsEvents/${encodeURIComponent(cle)}`, { method: 'DELETE', headers: H });
  return r.ok || r.status === 404;
}
async function clearBanniereAube() {
  const r = await fetch(`${DOCS}/boutique/${UID}?updateMask.fieldPaths=${encodeURIComponent('possede.banniere-aube')}`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields: {} }) });
  return r.ok;
}

async function connecter(page) {
  await page.goto(`${BASE}/compte`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /se connecter/i }).first().click();
  await page.waitForTimeout(500);
  // Le modal ouvre par défaut sur « Créer un compte » : basculer vers la connexion.
  const lienConnexion = page.getByRole('button', { name: /déjà un compte/i });
  if (await lienConnexion.count()) { await lienConnexion.click(); await page.waitForTimeout(300); }
  await page.getByPlaceholder(/courriel/i).fill(EMAIL);
  await page.getByPlaceholder(/mot de passe/i).fill(PW);
  await page.getByRole('button', { name: /^se connecter$/i }).last().click();
  await page.waitForTimeout(2500);
}

async function run(viewport, tag) {
  const b = await chromium.launch();
  const c = await b.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await c.newPage();
  await connecter(page);

  // ── Jour 1 : carte non ouverte, puis révélation +5 niskas ──────────────
  await page.waitForSelector('#cadeau-jour-titre', { timeout: 15000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `scripts/qa/shots/cadeau-jour1-attente-${tag}.png` });
  await page.getByRole('button', { name: /ouvrir mon cadeau/i }).click();
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `scripts/qa/shots/cadeau-jour1-reveal-niskas-${tag}.png` });
  await page.getByRole('button', { name: /fermer/i }).click();
  await page.waitForTimeout(300);

  await b.close();
}

async function runJour7(viewport, tag) {
  const b = await chromium.launch();
  const c = await b.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await c.newPage();
  await connecter(page);

  await page.waitForSelector('#cadeau-jour-titre', { timeout: 15000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `scripts/qa/shots/cadeau-jour7-attente-${tag}.png` });
  await page.getByRole('button', { name: /ouvrir mon cadeau/i }).click();
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `scripts/qa/shots/cadeau-jour7-reveal-banniere-${tag}.png` });
  await page.getByRole('button', { name: /fermer/i }).click();
  await page.waitForTimeout(300);

  // ── « Déjà ouvert aujourd'hui » : rouvrir via le bouton du profil ──────
  await page.goto(`${BASE}/compte?onglet=points`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const bouton = page.getByRole('button', { name: /mon cadeau du jour/i });
  if (await bouton.count()) {
    await bouton.first().click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `scripts/qa/shots/cadeau-deja-ouvert-${tag}.png` });
    await page.getByRole('button', { name: /fermer/i }).click();
    await page.waitForTimeout(300);
  } else {
    console.warn('[warn] bouton « Mon cadeau du jour » introuvable, capture sautée');
  }

  // ── La bannière gagnée dans le choix de bannière ────────────────────────
  await page.getByRole('button', { name: /changer la bannière/i }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `scripts/qa/shots/cadeau-choix-banniere-${tag}.png` });
  await page.keyboard.press('Escape').catch(() => {});

  // ── Absente de la boutique (jamais à vendre) ────────────────────────────
  await page.goto(`${BASE}/compte?onglet=points`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const boutiqueBtn = page.getByRole('button', { name: /petite boutique|boutique/i }).first();
  if (await boutiqueBtn.count()) { await boutiqueBtn.click(); await page.waitForTimeout(400); }
  const bannieresAccordeon = page.getByText(/les bannières/i).first();
  if (await bannieresAccordeon.count()) { await bannieresAccordeon.click(); await page.waitForTimeout(400); }
  await page.screenshot({ path: `scripts/qa/shots/cadeau-boutique-sans-exclusif-${tag}.png`, fullPage: true });

  await b.close();
}

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

console.log('[1/4] jour 1 — desktop');
await run(DESKTOP, '1440');
console.log('[2/4] jour 1 — mobile');
await run(MOBILE, '390');

console.log('[reset] retour à jourCadeau=6, dernierJour=hier, pour forcer le jour 7');
await deleteEvent(`cadeau:${UID}:${AUJOURDHUI}`);
await patchMemberPoints({ jourCadeau: 6, dernierJour: HIER, serie: 6 });

console.log('[3/4] jour 7 — desktop');
await runJour7(DESKTOP, '1440');

console.log('[reset] retour à jourCadeau=6 pour le second passage (mobile)');
await deleteEvent(`cadeau:${UID}:${AUJOURDHUI}`);
await clearBanniereAube();
await patchMemberPoints({ jourCadeau: 6, dernierJour: HIER, serie: 6 });

console.log('[4/4] jour 7 — mobile');
await runJour7(MOBILE, '390');

console.log('[cleanup] remise à l’état d’avant test');
await deleteEvent(`cadeau:${UID}:${AUJOURDHUI}`);
await clearBanniereAube();
await patchMemberPoints({}, ['jourCadeau', 'dernierJour', 'serie']);

console.log('Terminé.');
