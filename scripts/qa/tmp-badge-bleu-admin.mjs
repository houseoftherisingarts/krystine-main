// QA temporaire du LOT ADMIN+INFOLETTRE (docs/badge-bleu-plan.md 6.6).
// Session admin réelle (jeton personnalisé minté pour houseoftherisingarts@gmail.com,
// fichier ADMIN_SESSION), comptes jetables, tout effacé à la fin sauf le compte
// laissé en attente pour qu'Alex approuve d'un clic (uid rapporté).
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const API_KEY = fs.readFileSync('.env.local', 'utf8').match(/VITE_FIREBASE_API_KEY=(.+)/)[1].trim();
const PROJET = 'krystinestlaurent-87566';
const BUCKET = `${PROJET}.firebasestorage.app`;
const BASE = process.env.BASE || 'http://localhost:5199';
const OUT = process.env.OUT; fs.mkdirSync(OUT, { recursive: true });
const SESSION = JSON.parse(fs.readFileSync(process.env.ADMIN_SESSION, 'utf8'));
const gtoken = execSync('gcloud auth print-access-token').toString().trim();
const FS = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents`;
const H = { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' };
const log = (...a) => console.log(...a);
const enc = v => v === null ? { nullValue: null } : typeof v === 'boolean' ? { booleanValue: v } : typeof v === 'number' ? { integerValue: String(v) } : typeof v === 'string' ? { stringValue: v } : v instanceof Date ? { timestampValue: v.toISOString() } : Array.isArray(v) ? { arrayValue: { values: v.map(enc) } } : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } };
const dec = v => 'stringValue' in v ? v.stringValue : 'integerValue' in v ? Number(v.integerValue) : 'booleanValue' in v ? v.booleanValue : 'nullValue' in v ? null : 'timestampValue' in v ? v.timestampValue : 'mapValue' in v ? Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, dec(x)])) : 'arrayValue' in v ? (v.arrayValue.values || []).map(dec) : v;
const rest = async (url, body) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
const fsset = async (path, obj) => { const r = await fetch(`${FS}/${path}`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields: enc(obj).mapValue.fields }) }); if (!r.ok) log('firestore', path, r.status, await r.text()); };
const fsget = async (path) => { const r = await fetch(`${FS}/${path}`, { headers: H }); if (r.status === 404) return null; const j = await r.json(); return Object.fromEntries(Object.entries(j.fields || {}).map(([k, v]) => [k, dec(v)])); };
const fsdel = (path) => fetch(`${FS}/${path}`, { method: 'DELETE', headers: H });
const fsquery = async (coll, field, op, value) => { const r = await fetch(`${FS}:runQuery`, { method: 'POST', headers: H, body: JSON.stringify({ structuredQuery: { from: [{ collectionId: coll }], where: { fieldFilter: { field: { fieldPath: field }, op, value: enc(value) } } } }) }); return (await r.json()).filter(x => x.document).map(x => x.document.name.split('/documents/')[1]); };
const fslist = async (path) => { const r = await fetch(`${FS}/${path}?pageSize=300`, { headers: H }); return ((await r.json()).documents || []).map(d => d.name.split('/documents/')[1]); };
const stockageExiste = async (chemin) => (await fetch(`https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(chemin)}`, { headers: { Authorization: `Bearer ${gtoken}` } })).status === 200;

const jours = n => new Date(Date.now() - n * 864e5);
const nouveau = async (nom) => {
  const email = `qa-bb-${nom}-${Date.now()}@vexel-qa.test`; const password = 'Qa!' + Math.random().toString(36).slice(2, 12);
  const u = await rest(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { email, password, returnSecureToken: true });
  await fsset(`members/${u.localId}`, { uid: u.localId, email, displayName: `QA ${nom}`, provider: 'password', joinedAt: jours(30), lastSeenAt: new Date() });
  return { uid: u.localId, email, idToken: u.idToken, nom };
};
const deposerPiece = async (c, png) => {
  const chemin = `verifications/${c.uid}/piece.png`;
  const r = await fetch(`https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o?uploadType=media&name=${encodeURIComponent(chemin)}`, { method: 'POST', headers: { Authorization: `Firebase ${c.idToken}`, 'Content-Type': 'image/png' }, body: png });
  if (!r.ok) log('upload pièce', c.nom, r.status, await r.text());
  await fsset(`verifications/${c.uid}`, { uid: c.uid, statut: 'en_attente', programmes: 2, pieceChemin: chemin, demandeLe: jours(1), decideLe: null, decidePar: null, motif: null });
  return chemin;
};

const browser = await chromium.launch();
// La « pièce » : un spécimen dessiné, aucune vraie donnée.
const pagePng = await browser.newPage({ viewport: { width: 720, height: 450 } });
await pagePng.setContent(`<body style="margin:0;background:#dfe6ee;font-family:Helvetica,Arial"><div style="margin:40px;width:640px;height:370px;border-radius:18px;background:linear-gradient(135deg,#f6f2e8,#e2d5bd);border:1px solid #b9a77f;padding:28px;box-sizing:border-box;position:relative"><div style="font-size:11px;letter-spacing:.3em;color:#7d6330">SPÉCIMEN · QA BADGE BLEU · AUCUNE VRAIE DONNÉE</div><div style="margin-top:26px;display:flex;gap:26px"><div style="width:140px;height:180px;border-radius:12px;background:#c9bda3"></div><div style="font-size:15px;line-height:1.9;color:#3a2f1e"><div><b>NOM</b> Spécimen</div><div><b>PRÉNOM</b> QA</div><div><b>N°</b> 0000 0000 0000</div><div><b>EXP.</b> 2099-01-01</div></div></div><div style="position:absolute;right:28px;bottom:24px;font-size:38px;color:#7d6330;letter-spacing:.2em">PIÈCE TEST</div></div></body>`);
const png = await pagePng.screenshot({ type: 'png' }); await pagePng.close();

const A = await nouveau('approuver'); const E = await nouveau('refuser'); const D = await nouveau('alex');
const cheminA = await deposerPiece(A, png); const cheminE = await deposerPiece(E, png); const cheminD = await deposerPiece(D, png);
log('comptes', { A: A.uid, E: E.uid, D: D.uid }, 'pièces', await stockageExiste(cheminA), await stockageExiste(cheminE), await stockageExiste(cheminD));

const authUser = { uid: SESSION.localId || 'IzH35eAu5JTMAXjaGjRmaZSaQlu2', email: 'houseoftherisingarts@gmail.com', emailVerified: true, isAnonymous: false, displayName: 'Alex', providerData: [{ providerId: 'google.com', uid: 'houseoftherisingarts@gmail.com', displayName: 'Alex', email: 'houseoftherisingarts@gmail.com', phoneNumber: null, photoURL: null }],
  stsTokenManager: { refreshToken: SESSION.refreshToken, accessToken: SESSION.idToken, expirationTime: Date.now() + 50 * 60e3 }, createdAt: String(Date.now()), lastLoginAt: String(Date.now()), apiKey: API_KEY, appName: '[DEFAULT]' };
const ouvrir = async (width, height) => {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('dialog', d => d.accept());
  await page.goto(`${BASE}/robots.txt`);
  await page.evaluate(([key, val]) => new Promise((res, rej) => {
    localStorage.setItem('admin.nav.ouverts', JSON.stringify(['communaute']));
    const req = indexedDB.open('firebaseLocalStorageDb', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
    req.onsuccess = () => { const tx = req.result.transaction('firebaseLocalStorage', 'readwrite'); tx.objectStore('firebaseLocalStorage').put({ fbase_key: key, value: val }); tx.oncomplete = () => res(true); tx.onerror = rej; };
    req.onerror = rej;
  }), [`firebase:authUser:${API_KEY}:[DEFAULT]`, authUser]);
  return { ctx, page };
};
const shot = (page, nom, full = true) => page.screenshot({ path: `${OUT}/${nom}.png`, fullPage: full });
const rangee = (page, c) => page.locator('li', { hasText: c.email });

try {
  // ── La section Badge Bleu, 1440 ──
  let { ctx, page } = await ouvrir(1440, 900);
  await page.goto(`${BASE}/admin/badge-bleu`, { waitUntil: 'domcontentloaded' });
  await page.getByText(A.email).waitFor({ timeout: 45000 }); await page.waitForTimeout(800);
  await shot(page, '01-section-attente-1440');
  // La pièce dans le Portail
  await rangee(page, A).getByRole('button', { name: /Voir la pièce/ }).click();
  const img = page.locator('.z-\\[130\\] img'); await img.waitFor({ timeout: 20000 });
  await page.waitForFunction(() => { const i = document.querySelector('.z-\\[130\\] img'); return i && i.complete && i.naturalWidth > 0; }, null, { timeout: 20000 });
  await page.waitForTimeout(300); await shot(page, '02-piece-portail-1440', false);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  // Refuser sans motif : le garde-fou
  await rangee(page, E).getByRole('button', { name: /Refuser/ }).click();
  await rangee(page, E).getByText(/Écrivez un motif/).waitFor({ timeout: 5000 });
  await shot(page, '03-refus-sans-motif-1440', false);
  // Refuser E avec motif (confirm accepté par page.on('dialog'))
  await rangee(page, E).locator('input').fill('La photo est floue et le nom ne se lit pas : reprenez-la à la lumière du jour.');
  await rangee(page, E).getByRole('button', { name: /Refuser/ }).click();
  await rangee(page, E).getByText(/refusée\. Elle a reçu votre motif/).waitFor({ timeout: 30000 });
  // Approuver A
  await rangee(page, A).getByRole('button', { name: /Approuver/ }).click();
  await rangee(page, A).getByText(/Badge Bleu posé pour/).waitFor({ timeout: 30000 });
  await page.waitForTimeout(500); await shot(page, '04-section-apres-decisions-1440');
  await ctx.close();
  // Vérifications côté données
  const vA = await fsget(`verifications/${A.uid}`), vE = await fsget(`verifications/${E.uid}`);
  const mA = await fsget(`members/${A.uid}`), pts = await fsget(`pointsEvents/badge-bleu:${A.uid}`), bq = await fsget(`boutique/${A.uid}`), bd = await fsget(`badges/${A.uid}`), mp = await fsget(`memberPoints/${A.uid}`);
  log('A après approbation :', { statut: vA?.statut, pieceChemin: vA?.pieceChemin, decidePar: vA?.decidePar, verifie: mA?.verifie, niskas: pts?.amount, balance: mp?.balance, skin: !!bq?.possede?.['skin-verifie'], badge: !!bd?.obtenus?.['badge-bleu'], pieceStorage: await stockageExiste(cheminA) });
  log('E après refus :', { statut: vE?.statut, motif: vE?.motif, pieceChemin: vE?.pieceChemin, pieceStorage: await stockageExiste(cheminE) });

  // ── La section à 390 ──
  ({ ctx, page } = await ouvrir(390, 844));
  await page.goto(`${BASE}/admin/badge-bleu`, { waitUntil: 'domcontentloaded' });
  await page.getByText(D.email).waitFor({ timeout: 45000 }); await page.waitForTimeout(800);
  await shot(page, '05-section-390');
  await ctx.close();

  // ── La fiche cliente : D en attente (1440 et 390), A approuvée (1440) ──
  const fiche = async (page, c, nom) => {
    await page.goto(`${BASE}/admin/clients`, { waitUntil: 'domcontentloaded' });
    const champ = page.locator('input[type="search"]'); await champ.waitFor({ timeout: 45000 });
    await champ.fill(c.email); await page.waitForTimeout(600);
    await page.locator('tr[title="Ouvrir l\'espace client"]').first().click();
    await page.getByText(/Badge Bleu : /).waitFor({ timeout: 20000 }); await page.waitForTimeout(500);
    await shot(page, nom, false);
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  };
  ({ ctx, page } = await ouvrir(1440, 900));
  await fiche(page, D, '06-fiche-attente-1440');
  await fiche(page, A, '07-fiche-approuvee-1440');
  await fiche(page, E, '08-fiche-refusee-1440');
  await ctx.close();
  ({ ctx, page } = await ouvrir(390, 844));
  await fiche(page, D, '09-fiche-attente-390');
  await ctx.close();

  // ── Le brouillon d'infolettre dans le Composer (rien d'envoyé) ──
  const composer = async (page, nom, apercu) => {
    await page.goto(`${BASE}/admin/infolettre`, { waitUntil: 'domcontentloaded' });
    const ligne = page.locator('tr', { hasText: 'Le Badge Bleu' }).first(); await ligne.waitFor({ timeout: 45000 });
    await ligne.getByRole('button', { name: /Modifier/ }).click();
    await page.getByText('Sujet du courriel').waitFor({ timeout: 20000 }); await page.waitForTimeout(1200);
    await shot(page, nom, false);
    if (apercu) { await page.getByRole('button', { name: /Aperçu du courriel/ }).click(); await page.waitForTimeout(2500); await shot(page, apercu, false); }
  };
  ({ ctx, page } = await ouvrir(1440, 900));
  await composer(page, '10-composer-brouillon-1440', '11-composer-apercu-1440');
  await ctx.close();
  ({ ctx, page } = await ouvrir(390, 844));
  await composer(page, '12-composer-brouillon-390');
  await ctx.close();
  log('infolettre 2hHICtya4qf7NQ12RVcC :', (await fsget('newsletters/2hHICtya4qf7NQ12RVcC'))?.status);
} finally {
  await browser.close();
  // Ménage : A et E disparaissent (compte, documents, fils de messages); D reste pour Alex.
  for (const c of [A, E]) {
    for (const fil of await fsquery('dms', 'participantUids', 'ARRAY_CONTAINS', c.uid)) { for (const m of await fslist(`${fil}/messages`)) await fsdel(m); await fsdel(fil); }
    for (const ev of await fsquery('pointsEvents', 'uid', 'EQUAL', c.uid)) await fsdel(ev);
    for (const p of [`members/${c.uid}`, `verifications/${c.uid}`, `memberPoints/${c.uid}`, `boutique/${c.uid}`, `badges/${c.uid}`]) await fsdel(p);
    await rest(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`, { idToken: c.idToken });
  }
  log('ménage fait pour A et E; compte laissé pour Alex :', D.uid, D.email, 'pièce présente :', await stockageExiste(cheminD));
}
