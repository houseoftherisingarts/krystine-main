// Reconstruit `newsletters/{id}/envois` à partir des courriels que Resend a
// réellement acceptés aujourd'hui, puis remet le curseur à zéro.
import { execSync } from 'node:child_process';
const NL = 'IOfuQpYjiWK0CYhmPE02';
const SUJET = 'Une nouvelle maison pour la suite';
const KEY = execSync('firebase functions:secrets:access RESEND_API_KEY --project krystinestlaurent-87566', { encoding: 'utf8' }).trim();
const TOK = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
const B = 'https://firestore.googleapis.com/v1/projects/krystinestlaurent-87566/databases/(default)/documents';
const fs = (path, init = {}) => fetch(`${B}${path}`, { ...init, headers: { Authorization: `Bearer ${TOK}`, 'Content-Type': 'application/json', ...(init.headers || {}) } }).then(r => r.json());

// 1. Resend : tous les courriels d'aujourd'hui portant le sujet.
const recus = new Map(); // email -> last_event
let after = null;
for (let i = 0; i < 30; i++) {
  const r = await fetch(`https://api.resend.com/emails?limit=100${after ? `&after=${after}` : ''}`, { headers: { Authorization: `Bearer ${KEY}` } }).then(r => r.json());
  const data = r.data || [];
  if (!data.length) break;
  for (const e of data) {
    if (e.created_at.startsWith('2026-09-07') && e.subject.startsWith(SUJET)) for (const to of e.to) recus.set(String(to).toLowerCase(), e.last_event);
  }
  const plusVieux = data[data.length - 1];
  if (!r.has_more || !plusVieux.created_at.startsWith('2026-09-07')) break;
  after = plusVieux.id;
}
console.log('Resend, courriels acceptés aujourd’hui pour cette lettre :', recus.size);

// 2. Firestore : abonnées actives (id + courriel).
const q = await fs(':runQuery', { method: 'POST', body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'newsletter' }], where: { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'active' } } }, select: { fields: [{ fieldPath: 'email' }] } } }) });
const parEmail = new Map();
for (const row of q) { const d = row.document; if (!d) continue; parEmail.set(String(d.fields?.email?.stringValue || '').toLowerCase(), d.name.split('/').pop()); }
console.log('Abonnées actives :', parEmail.size);

// 3. Marquer les envois réussis.
const writes = []; const sansAbonnee = [];
for (const [email, ev] of recus) {
  const id = parEmail.get(email);
  if (!id) { sansAbonnee.push(email); continue; }
  writes.push({ update: { name: `projects/krystinestlaurent-87566/databases/(default)/documents/newsletters/${NL}/envois/${id}`, fields: { email: { stringValue: email }, evenement: { stringValue: ev }, at: { timestampValue: new Date().toISOString() }, source: { stringValue: 'reconstruit depuis Resend 2026-09-07' } } } });
}
for (let i = 0; i < writes.length; i += 400) {
  const r = await fs(':commit', { method: 'POST', body: JSON.stringify({ writes: writes.slice(i, i + 400) }) });
  if (r.error) { console.error(r.error); process.exit(1); }
}
console.log('Marqués dans envois :', writes.length, '| courriels Resend sans abonnée active :', sansAbonnee.length, sansAbonnee.slice(0, 5));

// 4. Curseur remis à zéro, échecs remis à zéro, verrou conservé.
const p = await fs(`/newsletters/${NL}?updateMask.fieldPaths=progress.lastId&updateMask.fieldPaths=progress.done&updateMask.fieldPaths=progress.failed`, { method: 'PATCH', body: JSON.stringify({ fields: { progress: { mapValue: { fields: { lastId: { nullValue: null }, done: { integerValue: String(writes.length) }, failed: { integerValue: '0' } } } } } }) });
console.log('progress :', JSON.stringify(p.fields?.progress?.mapValue?.fields));
