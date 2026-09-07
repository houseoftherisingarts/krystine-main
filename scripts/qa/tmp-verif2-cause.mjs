// Second passage : la cause des deux fonctions cassées (fil vide, message refusé)
// et le vote sur le billet du mur personnel. Même compte jetable, effacé à la fin.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const API_KEY = fs.readFileSync('.env.local', 'utf8').match(/VITE_FIREBASE_API_KEY=(.+)/)[1].trim();
const PROJET = 'krystinestlaurent-87566';
const BASE = 'http://localhost:5199';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/foyer-social/verif-fil-membres';
const log = (...a) => { const s = a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); console.log(s); fs.appendFileSync(`${OUT}/run2.log`, s + '\n'); };
fs.writeFileSync(`${OUT}/run2.log`, '');
const rest = async (url, body) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
const gtoken = execSync('gcloud auth print-access-token').toString().trim();
const FS = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents`;
const H = { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' };
const fsdoc = async (path, fields) => { const r = await fetch(`${FS}/${path}`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields }) }); if (!r.ok) log('PATCH', path, r.status); };
const fsget = async (path, token = gtoken) => { const r = await fetch(`${FS}/${path}`, { headers: { Authorization: `Bearer ${token}` } }); return { status: r.status, body: await r.json().catch(() => null) }; };
const fsdel = async (path) => fetch(`${FS}/${path}`, { method: 'DELETE', headers: H });
const runQuery = async (structuredQuery, token = gtoken) => { const r = await fetch(`${FS}:runQuery`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ structuredQuery }) }); return { status: r.status, body: await r.json() }; };
const str = (s) => ({ stringValue: s });

const creer = async (nom) => {
  const email = `qa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@vexel-qa.test`;
  const u = await rest(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { email, password: 'Qa!' + Math.random().toString(36).slice(2, 12), returnSecureToken: true });
  return { ...u, email, nom };
};
const A = await creer('Vérif Foyer'); const B = await creer('Amie Jetable');
const uidA = A.localId, uidB = B.localId;
log('comptes', uidA, uidB);
const now = { timestampValue: new Date().toISOString() };
await fsdoc(`members/${uidA}`, { uid: str(uidA), email: str(A.email), displayName: str(A.nom), dosha: str('pitta'), joinedAt: now, lastSeenAt: now });
await fsdoc(`members/${uidB}`, { uid: str(uidB), email: str(B.email), displayName: str(B.nom), dosha: str('vata'), joinedAt: now, lastSeenAt: now });
for (const uid of [uidA, uidB]) await fsdoc(`achatsFormations/${uid}/formations/foyer`, { titre: str('Le Foyer d’Origine'), source: str('qa') });

const res = {};
try {
  // 1. Les règles déployées : A peut-elle lire blocages/{B} (sendDM le fait avant d'écrire) ?
  res.lectureBlocagesDeB = await fsget(`blocages/${uidB}`, A.idToken);
  log('règles : A lit blocages/B →', res.lectureBlocagesDeB.status, JSON.stringify(res.lectureBlocagesDeB.body).slice(0, 160));
  res.lectureBlocagesDeSoi = await fsget(`blocages/${uidA}`, A.idToken);
  log('règles : A lit blocages/A →', res.lectureBlocagesDeSoi.status);
  // Le fil dms se crée-t-il ? (ensureThread) puis l'écriture d'un message passe-t-elle sans le test de blocage ?
  const filId = [uidA, uidB].sort().join('__');
  const cr = await fetch(`${FS}/dms/${filId}?updateMask.fieldPaths=participantUids&updateMask.fieldPaths=participantNames`, { method: 'PATCH', headers: { Authorization: `Bearer ${A.idToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { participantUids: { arrayValue: { values: [uidA, uidB].sort().map(str) } }, participantNames: { mapValue: { fields: { [uidA]: str(A.nom), [uidB]: str(B.nom) } } } } }) });
  log('règles : A crée dms/A__B →', cr.status);
  const msg = await fetch(`${FS}/dms/${filId}/messages`, { method: 'POST', headers: { Authorization: `Bearer ${A.idToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { senderUid: str(uidA), senderName: str(A.nom), body: str('test direct'), createdAt: now } }) });
  log('règles : A écrit un message dans dms/A__B (sans test de blocage) →', msg.status);
  res.dms = { creation: cr.status, message: msg.status };

  // 2. L'index du fil : la requête exacte de suivreLeMur, en tant que A.
  for (const fil of ['formation:foyer', 'krystine', 'communaute']) {
    const avecOrdre = await runQuery({ from: [{ collectionId: 'mur' }], where: { fieldFilter: { field: { fieldPath: 'fil' }, op: 'EQUAL', value: str(fil) } }, orderBy: [{ field: { fieldPath: 'chaleur' }, direction: 'DESCENDING' }], limit: 100 }, A.idToken);
    const sansOrdre = await runQuery({ from: [{ collectionId: 'mur' }], where: { fieldFilter: { field: { fieldPath: 'fil' }, op: 'EQUAL', value: str(fil) } }, limit: 100 }, A.idToken);
    const n = (b) => Array.isArray(b) ? b.filter(x => x.document).length : null;
    const err = (b) => Array.isArray(b) ? (b[0]?.error ? b[0].error.message.slice(0, 220) : null) : JSON.stringify(b).slice(0, 220);
    res[`fil-${fil}`] = { avecOrdre: { status: avecOrdre.status, n: n(avecOrdre.body), erreur: err(avecOrdre.body) }, sansOrdre: { status: sansOrdre.status, n: n(sansOrdre.body), erreur: err(sansOrdre.body) } };
    log(`index : fil=${fil}`, res[`fil-${fil}`]);
  }

  // 3. Dans le navigateur : les trois fils, puis le vote sur le billet du mur perso.
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const consoles = [];
  page.on('console', m => { if (m.type() !== 'log') consoles.push(`${m.type()} ${m.text().slice(0, 200)}`); });
  await page.goto(`${BASE}/robots.txt`);
  const authUser = { uid: uidA, email: A.email, emailVerified: false, isAnonymous: false, displayName: A.nom, providerData: [{ providerId: 'password', uid: A.email, displayName: null, email: A.email, phoneNumber: null, photoURL: null }], stsTokenManager: { refreshToken: A.refreshToken, accessToken: A.idToken, expirationTime: Date.now() + Number(A.expiresIn) * 1000 }, createdAt: String(Date.now()), lastLoginAt: String(Date.now()), apiKey: API_KEY, appName: '[DEFAULT]' };
  await page.evaluate(([key, val]) => new Promise((res, rej) => {
    localStorage.setItem('krystine-jeu-vu', new Date().toISOString().slice(0, 10)); localStorage.setItem('krystine-banniere-flash-vu', '1'); localStorage.setItem('inspirata.consent.v1', 'accepted');
    const req = indexedDB.open('firebaseLocalStorageDb', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
    req.onsuccess = () => { const tx = req.result.transaction('firebaseLocalStorage', 'readwrite'); tx.objectStore('firebaseLocalStorage').put({ fbase_key: key, value: val }); tx.oncomplete = () => res(true); tx.onerror = rej; };
    req.onerror = rej;
  }), [`firebase:authUser:${API_KEY}:[DEFAULT]`, authUser]);
  for (const fil of ['foyer', 'krystine', 'communaute']) {
    await page.goto(`${BASE}/fil?fil=${fil}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('main', { timeout: 20000 }); await page.waitForTimeout(3500);
    const n = await page.locator('main article').count();
    const vide = await page.locator('main', { hasText: /Rien de publié|encore vide/ }).count();
    res[`nav-fil-${fil}`] = { articles: n, messageVide: vide };
    log(`navigateur : /fil?fil=${fil} → articles`, n, 'vide', vide);
    await page.screenshot({ path: `${OUT}/v5b-fil-${fil}-1440.png` });
  }
  // Le vote sur le billet du mur perso
  await page.goto(`${BASE}/membre/${uidA}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('textarea', { timeout: 20000 }); await page.waitForTimeout(2000);
  const texte = `Mot sur mon mur ${Date.now().toString(36)}`;
  await page.locator('textarea').first().click(); await page.locator('textarea').first().fill(texte);
  await page.getByRole('button', { name: /Publier/ }).click();
  const p = page.locator('p', { hasText: texte });
  const publie = await p.first().waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
  const article = page.locator('main article', { hasText: texte }).first();
  const pour = article.locator('button[aria-label="Voter pour"]');
  await pour.scrollIntoViewIfNeeded(); await pour.click(); await page.waitForTimeout(2500);
  const presse = await pour.getAttribute('aria-pressed');
  const score = await article.locator('span.tabular-nums').first().textContent();
  const docs = await runQuery({ from: [{ collectionId: 'mur' }], where: { fieldFilter: { field: { fieldPath: 'uid' }, op: 'EQUAL', value: str(uidA) } } });
  const postId = docs.body.filter(x => x.document)[0]?.document.name.split('/').pop();
  const docVote = postId ? await fsget(`mur/${postId}/votes/${uidA}`) : null;
  const postApres = postId ? await fsget(`mur/${postId}`) : null;
  res.vote = { publie, ariaPressed: presse, scoreAffiche: score, postId, docVote: docVote && { status: docVote.status, fields: docVote.body?.fields && Object.fromEntries(Object.entries(docVote.body.fields).map(([k, v]) => [k, Object.values(v)[0]])) }, compteursPost: postApres && { pour: postApres.body?.fields?.pour?.integerValue, score: postApres.body?.fields?.score?.integerValue } };
  log('vote', res.vote);
  await page.screenshot({ path: `${OUT}/v5b-vote-mur-perso-1440.png` });
  // Le panneau des commentaires : s'ouvre-t-il sous le billet ?
  await article.locator('button', { hasText: /Commenter/ }).click(); await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/v7-commentaires-1440.png` });
  // Le retrait du vote
  await pour.click(); await page.waitForTimeout(1500);
  res.voteRetire = { ariaPressed: await pour.getAttribute('aria-pressed'), doc: postId ? (await fsget(`mur/${postId}/votes/${uidA}`)).status : null };
  log('vote retiré', res.voteRetire);
  log('console', consoles.filter(c => !/requestStorageAccess/.test(c)).slice(0, 12));
  await browser.close();
  // Les membres fantômes du groupe Foyer (fiche effacée, adhésion restée)
  const grp = await fetch(`${FS}/groupes/foyer/membres?pageSize=300`, { headers: H }).then(r => r.json());
  let fantomes = 0, total = 0; const nomsQA = [];
  for (const d of grp.documents || []) { total++; const uid = d.name.split('/').pop(); const m = await fsget(`members/${uid}`); if (m.status === 404) fantomes++; else { const n = m.body?.fields?.displayName?.stringValue || ''; const e = m.body?.fields?.email?.stringValue || ''; if (/vexel-qa|qa|vérif|verif|test/i.test(n + ' ' + e)) nomsQA.push(`${n} <${e}>`); } }
  res.groupeFoyer = { total, fantomes, nomsQA };
  log('groupe foyer', res.groupeFoyer);
} catch (e) { log('ERREUR', String(e && e.stack || e)); }
finally {
  const docs = await runQuery({ from: [{ collectionId: 'mur' }], where: { fieldFilter: { field: { fieldPath: 'uid' }, op: 'EQUAL', value: str(uidA) } } });
  for (const x of (docs.body || []).filter(x => x.document)) { const id = x.document.name.split('/').pop(); await fsdel(`mur/${id}/votes/${uidA}`); await fsdel(`mur/${id}`); }
  const filId = [uidA, uidB].sort().join('__');
  const msgs = await fetch(`${FS}/dms/${filId}/messages`, { headers: H }).then(r => r.json()).catch(() => ({}));
  for (const d of (msgs.documents || [])) await fsdel(`dms/${filId}/messages/${d.name.split('/').pop()}`);
  await fsdel(`dms/${filId}`);
  for (const col of ['pointsEvents', 'notifications']) for (const uid of [uidA, uidB]) { const q = await runQuery({ from: [{ collectionId: col }], where: { fieldFilter: { field: { fieldPath: 'uid' }, op: 'EQUAL', value: str(uid) } } }); for (const x of (q.body || []).filter(x => x.document)) await fsdel(`${col}/${x.document.name.split('/').pop()}`); }
  for (const uid of [uidA, uidB]) for (const p of [`achatsFormations/${uid}/formations/foyer`, `memberPoints/${uid}`, `badges/${uid}`, `members/${uid}`]) await fsdel(p);
  for (const u of [A, B]) await rest(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`, { idToken: u.idToken });
  fs.writeFileSync(`${OUT}/resume2.json`, JSON.stringify(res, null, 1));
  log('fini, nettoyé');
}
