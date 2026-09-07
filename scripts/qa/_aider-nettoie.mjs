// Retire la complétion simulée de formations-2026-09 sur le compte admin de
// test, pour repartir propre avant une nouvelle passe de vérification (ou
// avant de rendre le compte). Jetable.
import { execSync } from 'node:child_process';
const PROJET = 'krystinestlaurent-87566';
const EMAIL = 'admin@krystinestlaurent.ca';
const gtoken = execSync('gcloud auth print-access-token').toString().trim();
const H = { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json', 'x-goog-user-project': PROJET };
const lookup = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJET}/accounts:lookup`, { method: 'POST', headers: H, body: JSON.stringify({ email: [EMAIL] }) }).then((r) => r.json());
const uid = lookup.users?.[0]?.localId;
console.log('uid =', uid);

const del = (path) => fetch(`https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents/${path}`, { method: 'DELETE', headers: H });
const fsget = (path) => fetch(`https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents/${path}`, { headers: H }).then((r) => (r.ok ? r.json() : null));

await del(`sondages/formations-2026-09/reponses/${uid}`);
await del(`members/${uid}/sondagesFaits/formations-2026-09`);
await del(`pointsEvents/sondage:${uid}:formations-2026-09`);

const avant = await fsget(`memberPoints/${uid}`);
const solde = Number(avant?.fields?.balance?.integerValue || 0);
const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents/memberPoints/${uid}?updateMask.fieldPaths=balance`, {
  method: 'PATCH', headers: H, body: JSON.stringify({ fields: { balance: { integerValue: String(Math.max(0, solde - 10)) } } }),
});
console.log('solde avant nettoyage =', solde, '→ après =', Math.max(0, solde - 10), r.ok ? 'ok' : await r.text());
