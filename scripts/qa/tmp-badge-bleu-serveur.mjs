// QA de bout en bout du LOT SERVEUR (docs/badge-bleu-plan.md, 3.4) : comptes
// jetables Identity Toolkit, Storage et Firestore par REST, fonctions appelées
// au protocole des callables, décisions par l'Admin SDK (functions/lib), tout
// effacé à la fin. Lancer depuis la racine du dépôt : node scripts/qa/tmp-badge-bleu-serveur.mjs
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const env = fs.readFileSync('.env.local', 'utf8');
const API_KEY = env.match(/VITE_FIREBASE_API_KEY=(.+)/)[1].trim();
const BUCKET = env.match(/VITE_FIREBASE_STORAGE_BUCKET=(.+)/)[1].trim();
const PROJET = 'krystinestlaurent-87566';
const FN = `https://us-central1-${PROJET}.cloudfunctions.net`;
const FS = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents`;
const MUSIQUE = 'kajabi-2149362766';
const gtoken = execSync('gcloud auth print-access-token').toString().trim();
const journee = (ms = Date.now()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
const aujourdhui = journee(); const veille = journee(Date.now() - 86_400_000);

let echecs = 0;
const ok = (cond, libelle, detail = '') => { console.log(`${cond ? '  ✅' : '  ❌'} ${libelle}${detail ? ' · ' + detail : ''}`); if (!cond) echecs++; };
const titre = (t) => console.log(`\n${t}`);

// ─── Firestore REST ──────────────────────────────────────────────────────────
const enc = (v) => v === null ? { nullValue: null } : typeof v === 'boolean' ? { booleanValue: v } : typeof v === 'number' ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v })
  : typeof v === 'string' ? { stringValue: v } : v instanceof Date ? { timestampValue: v.toISOString() } : Array.isArray(v) ? { arrayValue: { values: v.map(enc) } }
  : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } };
const dec = (v) => { if (!v) return undefined; const k = Object.keys(v)[0]; const x = v[k];
  if (k === 'integerValue') return Number(x); if (k === 'mapValue') return Object.fromEntries(Object.entries(x.fields || {}).map(([a, b]) => [a, dec(b)]));
  if (k === 'arrayValue') return (x.values || []).map(dec); return x; };
const decDoc = (d) => d && d.fields ? Object.fromEntries(Object.entries(d.fields).map(([a, b]) => [a, dec(b)])) : {};
const fsset = async (p, obj, mask) => { const u = `${FS}/${p}` + (mask ? '?' + mask.map((m) => 'updateMask.fieldPaths=' + m).join('&') : '');
  const r = await fetch(u, { method: 'PATCH', headers: { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: enc(obj).mapValue.fields }) });
  if (!r.ok) throw new Error(`set ${p} ${r.status} ${await r.text()}`); };
const fsget = async (p, token = gtoken) => { const r = await fetch(`${FS}/${p}`, { headers: { Authorization: `Bearer ${token}` } }); return { status: r.status, doc: r.ok ? decDoc(await r.json()) : null }; };
const fsdel = async (p) => fetch(`${FS}/${p}`, { method: 'DELETE', headers: { Authorization: `Bearer ${gtoken}` } });
const fslist = async (p) => { const r = await fetch(`${FS}/${p}?pageSize=300`, { headers: { Authorization: `Bearer ${gtoken}` } }); const j = await r.json();
  return (j.documents || []).map((d) => ({ id: d.name.split('/').pop(), ...decDoc(d) })); };
const fsquery = async (collection, field, value) => { const r = await fetch(`${FS}:runQuery`, { method: 'POST', headers: { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ structuredQuery: { from: [{ collectionId: collection }], where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: enc(value) } } } }) });
  const j = await r.json(); return (Array.isArray(j) ? j : []).filter((x) => x.document).map((x) => ({ id: x.document.name.split('/').pop(), ...decDoc(x.document) })); };

// ─── Identity Toolkit, Storage, callables ────────────────────────────────────
const rest = async (url, body) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
const comptes = [];
const creerCompte = async (nom) => {
  const email = `qa-bb-${nom}-${Date.now()}@vexel-qa.test`; const password = 'Qa!' + Math.random().toString(36).slice(2, 12);
  const u = await rest(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { email, password, returnSecureToken: true });
  if (!u.localId) throw new Error('signUp ' + JSON.stringify(u));
  await fsset(`members/${u.localId}`, { uid: u.localId, email, displayName: `QA ${nom}` });
  const c = { nom, uid: u.localId, email, idToken: u.idToken }; comptes.push(c); return c;
};
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const ST = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o`;
const televerser = async (chemin, idToken, contentType = 'image/png') => (await fetch(`${ST}?uploadType=media&name=${encodeURIComponent(chemin)}`, { method: 'POST', headers: { Authorization: `Firebase ${idToken}`, 'Content-Type': contentType }, body: PNG })).status;
const lirePiece = async (chemin, idToken) => (await fetch(`${ST}/${encodeURIComponent(chemin)}?alt=media`, { headers: idToken ? { Authorization: `Firebase ${idToken}` } : {} })).status;
const listerDossier = async (uid, idToken) => (await fetch(`${ST}?prefix=${encodeURIComponent(`verifications/${uid}/`)}&delimiter=/`, { headers: { Authorization: `Firebase ${idToken}` } })).status;
const existeAdmin = async (chemin) => (await fetch(`https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodeURIComponent(chemin)}`, { headers: { Authorization: `Bearer ${gtoken}` } })).status === 200;
const appeler = async (fn, data, idToken) => { const r = await fetch(`${FN}/${fn}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) }, body: JSON.stringify({ data }) });
  const j = await r.json(); return j.error ? { erreur: j.error.status, message: j.error.message, details: j.error.details } : { resultat: j.result }; };

// ─── L'Admin SDK, avec les identifiants de l'utilisateur firebase-tools ─────
// (le même fichier « authorized_user » que le CLI écrit pour l'émulateur; il
// vit dans un dossier temporaire et disparaît à la fin).
const adcDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-bb-'));
const adcPath = path.join(adcDir, 'adc.json');
{
  const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/configstore/firebase-tools.json'), 'utf8'));
  fs.writeFileSync(adcPath, JSON.stringify({ type: 'authorized_user', client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com', client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi', refresh_token: cfg.tokens.refresh_token, quota_project_id: PROJET }), { mode: 0o600 });
}
process.env.GOOGLE_APPLICATION_CREDENTIALS = adcPath;
process.env.GCLOUD_PROJECT = PROJET; process.env.GOOGLE_CLOUD_PROJECT = PROJET;
const requireFn = createRequire(path.resolve('functions/package.json'));
const { initializeApp, applicationDefault } = requireFn('firebase-admin/app');
initializeApp({ credential: applicationDefault(), projectId: PROJET, storageBucket: BUCKET });
const { deciderBadgeBleuPour } = requireFn(path.resolve('functions/lib/verification.js'));

const krystineUid = (await fsquery('members', 'email', 'krystine@inspiratanature.com'))[0]?.id;
console.log('Krystine :', krystineUid, '· jour', aujourdhui, '· veille', veille);
const formations = (await fslist('formations')).filter((f) => f.paywall === true && f.categorie !== 'musique');
const [f1, f2] = formations; console.log('programmes payants choisis :', f1?.id, f2?.id, `(${formations.length} disponibles)`);
const semerAchats = async (uid) => { for (const f of [f1, f2]) await fsset(`achatsFormations/${uid}/formations/${f.id}`, { titre: f.titre || f.id, source: 'qa', accordeLe: new Date() }); };
const messagesDe = async (uid) => krystineUid ? (await fslist(`dms/${krystineUid}__${uid}/messages`)).map((m) => m.body || '') : [];

try {
  // 1. Sans achat : la demande est refusée d'office et la pièce disparaît.
  titre('1. Sans achat');
  const A = await creerCompte('a');
  const cheminA = `verifications/${A.uid}/piece.png`;
  ok((await televerser(cheminA, A.idToken)) === 200, 'la membre téléverse sa pièce (200)');
  let r = await appeler('demanderBadgeBleu', { pieceChemin: cheminA }, A.idToken);
  ok(r.erreur === 'FAILED_PRECONDITION' && r.details?.programmes === 0, 'refusée d’office, programmes: 0', r.message);
  ok(!(await existeAdmin(cheminA)), 'la pièce a disparu du bucket');

  // 2. Deux achats : la demande passe.
  titre('2. Deux programmes');
  await semerAchats(A.uid);
  ok((await televerser(cheminA, A.idToken)) === 200, 'nouveau téléversement (200)');
  r = await appeler('demanderBadgeBleu', { pieceChemin: cheminA }, A.idToken);
  ok(r.resultat?.ok === true && r.resultat?.programmes === 2, 'ok, programmes: 2', JSON.stringify(r));
  let v = (await fsget(`verifications/${A.uid}`)).doc;
  ok(v?.statut === 'en_attente' && v?.programmes === 2 && v?.pieceChemin === cheminA, 'verifications en_attente, programmes 2, pieceChemin posé');
  r = await appeler('demanderBadgeBleu', { pieceChemin: cheminA }, A.idToken);
  ok(r.erreur === 'FAILED_PRECONDITION' && /déjà chez Krystine/.test(r.message), 'une deuxième demande est refusée (déjà chez Krystine)');
  ok((await appeler('demanderBadgeBleu', { pieceChemin: `verifications/${A.uid}/../x.png` }, A.idToken)).erreur === 'INVALID_ARGUMENT', 'un chemin hors patron est refusé');

  // 3. Les règles : la pièce n'est lisible que par l'admin, jamais listable; le document n'est lisible que par elle.
  titre('3. Règles Storage et Firestore');
  const B = await creerCompte('b');
  ok([401, 403].includes(await lirePiece(cheminA, null)), 'lecture de la pièce sans jeton refusée');
  ok((await lirePiece(cheminA, B.idToken)) === 403, 'lecture de la pièce par un autre compte refusée');
  ok((await lirePiece(cheminA, A.idToken)) === 403, 'lecture de la pièce par la membre elle-même refusée (admin seul)');
  ok((await listerDossier(A.uid, A.idToken)) === 403, 'le dossier n’est pas listable, même par la membre');
  ok((await televerser(`verifications/${A.uid}/piece.png`, B.idToken)) === 403, 'un autre compte ne peut pas écrire dans son dossier');
  ok((await televerser(`verifications/${B.uid}/autre.png`, B.idToken)) === 403, 'un nom de fichier hors patron est refusé');
  ok((await televerser(`verifications/${B.uid}/piece.png`, B.idToken, 'text/plain')) === 403, 'un type hors image/PDF est refusé');
  ok((await fsget(`verifications/${A.uid}`, B.idToken)).status === 403, 'verifications/{A} illisible par un autre compte');
  ok((await fsget(`verifications/${A.uid}`, A.idToken)).status === 200, 'verifications/{A} lisible par la membre');

  // 4. La décision est réservée à l'admin.
  titre('4. deciderBadgeBleu par une membre');
  r = await appeler('deciderBadgeBleu', { uid: A.uid, decision: 'approuvee' }, A.idToken);
  ok(r.erreur === 'PERMISSION_DENIED', 'permission-denied', r.message);

  // 5. Approbation par l'Admin SDK.
  titre('5. Approbation');
  await deciderBadgeBleuPour(A.uid, 'approuvee', '', 'qa@lot-serveur');
  ok((await fsget(`members/${A.uid}`)).doc?.verifie === true, 'members.verifie = true');
  ok((await fsget(`pointsEvents/badge-bleu:${A.uid}`)).doc?.amount === 200, 'pointsEvents/badge-bleu:{uid} à 200');
  ok((await fsget(`memberPoints/${A.uid}`)).doc?.balance === 200, 'memberPoints.balance à 200');
  ok(!!(await fsget(`boutique/${A.uid}`)).doc?.possede?.['skin-verifie'], 'boutique.possede[skin-verifie]');
  ok(!!(await fsget(`badges/${A.uid}`)).doc?.obtenus?.['badge-bleu'], 'badges.obtenus[badge-bleu]');
  v = (await fsget(`verifications/${A.uid}`)).doc;
  ok(v?.statut === 'approuvee' && v?.pieceChemin === null && v?.decidePar === 'qa@lot-serveur', 'verifications approuvee, pieceChemin null, decidePar');
  ok(!(await existeAdmin(cheminA)), 'la pièce a disparu du bucket');
  let msgs = await messagesDe(A.uid);
  ok(msgs.some((m) => m.startsWith('Votre Badge Bleu est posé.')), 'le mot de Krystine est dans le fil dms', msgs[0]?.slice(0, 60));
  let deuxieme = null; try { await deciderBadgeBleuPour(A.uid, 'approuvee', '', 'qa@lot-serveur'); } catch (e) { deuxieme = e.code; }
  ok(deuxieme === 'failed-precondition', 'une deuxième décision est refusée', deuxieme);
  r = await appeler('demanderBadgeBleu', { pieceChemin: cheminA }, A.idToken);
  ok(r.erreur === 'FAILED_PRECONDITION' && /déjà posé/.test(r.message), 'redemander après approbation : déjà posé');

  // 6. Refus sur un troisième compte.
  titre('6. Refus');
  const C = await creerCompte('c');
  const cheminC = `verifications/${C.uid}/piece.png`;
  await semerAchats(C.uid); await televerser(cheminC, C.idToken);
  r = await appeler('demanderBadgeBleu', { pieceChemin: cheminC }, C.idToken);
  ok(r.resultat?.ok === true, 'demande acceptée');
  await deciderBadgeBleuPour(C.uid, 'refusee', 'La pièce est floue et le nom ne se lit pas.', 'qa@lot-serveur');
  v = (await fsget(`verifications/${C.uid}`)).doc;
  ok(v?.statut === 'refusee' && v?.motif === 'La pièce est floue et le nom ne se lit pas.' && v?.pieceChemin === null, 'verifications refusee avec motif, pieceChemin null');
  ok(!(await existeAdmin(cheminC)), 'la pièce a disparu du bucket');
  ok((await fsget(`members/${C.uid}`)).doc?.verifie !== true, 'members.verifie non posé');
  msgs = await messagesDe(C.uid);
  ok(msgs.some((m) => m.includes('La pièce est floue') && m.startsWith('Je n’ai pas pu poser')), 'le mot du refus porte le motif');
  ok((await televerser(cheminC, C.idToken)) === 200 && (await appeler('demanderBadgeBleu', { pieceChemin: cheminC }, C.idToken)).resultat?.ok === true, 'elle peut refaire une demande après le refus');
  ok((await fsget(`verifications/${C.uid}`)).doc?.statut === 'en_attente', 'le document est réécrit en en_attente');

  // 7. La couche Foyer de la roue.
  titre('7. Foyer : la roue');
  const D = await creerCompte('d');
  await fsset(`achatsFormations/${D.uid}/formations/foyer`, { titre: "Le Foyer d'Origine", source: 'qa' });
  await fsset(`memberPoints/${D.uid}`, { dernierJour: veille, serie: 6, balance: 0, lifetime: 0 });
  r = (await appeler('reclamerQuotidien', {}, D.idToken)).resultat;
  ok(r?.foyer === true && r?.montant === 10 && r?.serie === 7 && r?.coffre === true, 'jour 7 au Foyer : foyer, montant 10, serie 7, coffre', JSON.stringify(r));
  ok(r?.cadeauHebdo?.genre === 'musique' && r?.cadeauMois === null, 'cadeauHebdo = musique, pas de cadeau du mois');
  ok((await fsget(`achatsFormations/${D.uid}/formations/${MUSIQUE}`)).doc?.source === 'foyer-hebdo', 'la musique d’Origine est entrée avec source foyer-hebdo');
  ok(!!(await fsget(`boutique/${D.uid}`)).doc?.possede?.['musique-origine'], 'boutique.possede[musique-origine]');
  ok((await fsget(`pointsEvents/foyer-hebdo:${D.uid}:${aujourdhui}`)).doc?.amount === 0, 'pointsEvents/foyer-hebdo à 0');
  ok((await fsget(`pointsEvents/quotidien:${D.uid}:${aujourdhui}`)).doc?.amount === 10, 'un seul événement quotidien, à 10');
  ok((await fsget(`memberPoints/${D.uid}`)).doc?.balance === 10, 'solde 10');
  r = (await appeler('reclamerQuotidien', {}, D.idToken)).resultat;
  ok(r?.deja === true && r?.montant === 10 && r?.foyer === true && r?.cadeauHebdo === null, 'deuxième appel du jour : deja, montant doublé affiché, aucun cadeau');

  const rejouer = async (serie) => {
    await fsdel(`pointsEvents/quotidien:${D.uid}:${aujourdhui}`); await fsdel(`pointsEvents/foyer-mois:${D.uid}:${aujourdhui}`);
    await fsset(`memberPoints/${D.uid}`, { dernierJour: veille, serie }, ['dernierJour', 'serie']);
    return (await appeler('reclamerQuotidien', {}, D.idToken)).resultat;
  };
  r = await rejouer(29);
  ok(r?.serie === 30 && r?.cadeauMois?.genre === 'niskas' && r?.cadeauMois?.montant === 50, 'jour 30, musique déjà à elle : 50 niskas', JSON.stringify(r?.cadeauMois));
  ok((await fsget(`pointsEvents/foyer-mois:${D.uid}:${aujourdhui}`)).doc?.amount === 50, 'pointsEvents/foyer-mois à 50');
  r = await rejouer(59);
  const possedeD = (await fsget(`boutique/${D.uid}`)).doc?.possede || {};
  const rares = ['skin-lotus', 'skin-feminite', 'skin-nature', 'skin-teal-orange', 'skin-aurore', 'skin-or-pur', 'skin-golden-hour'];
  ok(r?.serie === 60 && r?.cadeauMois?.genre === 'skin-rare' && !!r?.cadeauMois?.nom, 'jour 60 : un skin rare', JSON.stringify(r?.cadeauMois));
  ok(rares.some((s) => possedeD[s]), 'le skin rare est dans boutique.possede', rares.filter((s) => possedeD[s]).join(','));
  r = await rejouer(89);
  ok(r?.serie === 90 && r?.cadeauMois?.genre === 'rabais-huile', 'jour 90 : le rabais sur une huile', JSON.stringify(r?.cadeauMois));
  const rr = (await fsquery('rewardRedemptions', 'uid', D.uid))[0];
  ok(rr?.rewardId === 'reb-huile-foyer-30' && rr?.status === 'pending' && rr?.plafondPourcent === 30 && rr?.articles === 1 && rr?.source === 'foyer-mois' && rr?.cost === 0, 'rewardRedemptions reb-huile-foyer-30 pending, plafond 30, un article', JSON.stringify(rr));
  msgs = await messagesDe(D.uid);
  ok(msgs.filter((m) => /^\d+ jours d’affilée au Foyer\./.test(m)).length === 4, 'quatre mots de Krystine (7, 30, 60, 90 jours)', msgs.map((m) => m.slice(0, 40)).join(' | '));
  ok((await fsget(`coffresDons/roue:${D.uid}:${aujourdhui}`)).status === 200, 'le coffre de bronze du jour 7 est resté');

  const E = await creerCompte('e');
  await fsset(`memberPoints/${E.uid}`, { dernierJour: veille, serie: 6, balance: 0, lifetime: 0 });
  r = (await appeler('reclamerQuotidien', {}, E.idToken)).resultat;
  ok(r?.foyer === false && r?.montant === 5 && r?.serie === 7 && r?.coffre === true && r?.cadeauHebdo === null && r?.cadeauMois === null, 'sans Foyer : montant 5, foyer false, aucun cadeau', JSON.stringify(r));
  ok((await fsget(`pointsEvents/foyer-hebdo:${E.uid}:${aujourdhui}`)).status === 404, 'aucun foyer-hebdo pour elle');
  ok((await fsget(`achatsFormations/${E.uid}/formations/${MUSIQUE}`)).status === 404, 'pas de musique offerte hors Foyer');
} catch (e) {
  echecs++; console.error('ERREUR', e);
} finally {
  // 8. Tout effacer.
  titre('8. Nettoyage');
  await new Promise((r) => setTimeout(r, 4000)); // les déclencheurs (badges, interactions) finissent d'écrire
  for (const c of comptes) {
    await rest(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`, { idToken: c.idToken });
    for (const d of await fslist(`achatsFormations/${c.uid}/formations`)) await fsdel(`achatsFormations/${c.uid}/formations/${d.id}`);
    for (const d of await fsquery('pointsEvents', 'uid', c.uid)) await fsdel(`pointsEvents/${d.id}`);
    for (const d of await fsquery('rewardRedemptions', 'uid', c.uid)) await fsdel(`rewardRedemptions/${d.id}`);
    if (krystineUid) { const fil = `dms/${krystineUid}__${c.uid}`; for (const m of await fslist(`${fil}/messages`)) await fsdel(`${fil}/messages/${m.id}`); await fsdel(fil); }
    for (const p of [`members/${c.uid}`, `memberPoints/${c.uid}`, `boutique/${c.uid}`, `badges/${c.uid}`, `verifications/${c.uid}`, `coffres/${c.uid}`, `coffresDons/roue:${c.uid}:${aujourdhui}`]) await fsdel(p);
    await fetch(`https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodeURIComponent(`verifications/${c.uid}/piece.png`)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${gtoken}` } });
  }
  fs.rmSync(adcDir, { recursive: true, force: true });
  console.log(`\n${echecs === 0 ? 'TOUT PASSE' : echecs + ' ÉCHEC(S)'} · ${comptes.length} comptes effacés`);
  process.exit(echecs ? 1 : 0);
}
