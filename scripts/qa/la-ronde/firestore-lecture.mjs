// Lecture seule de Firestore par l'API REST, avec le jeton de « firebase login » de cet ordinateur.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const PROJET = 'krystinestlaurent-87566';
export const BASE = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents`;

let cache;
export async function jeton() {
  if (cache) return cache;
  const candidats = [join(homedir(), '.iris/tools/node_modules/firebase-tools/lib/auth.js')];
  try { candidats.push(join(execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim(), 'firebase-tools/lib/auth.js')); } catch {}
  const auth = createRequire(import.meta.url)(candidats.find(existsSync));
  const conf = JSON.parse(readFileSync(join(homedir(), '.config/configstore/firebase-tools.json'), 'utf8'));
  const t = await auth.getAccessToken(conf.tokens.refresh_token, []);
  cache = t.access_token || t;
  return cache;
}

export const valeur = (v) => {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('referenceValue' in v) return v.referenceValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(valeur);
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, valeur(x)]));
  return null;
};
export const doc = (d) => ({ id: d.name.split('/').pop(), chemin: d.name.split('/documents/')[1], ...valeur({ mapValue: { fields: d.fields || {} } }) });

async function appel(url, init = {}) {
  const T = await jeton();
  const rep = await fetch(url, { ...init, headers: { Authorization: `Bearer ${T}`, 'x-goog-user-project': PROJET, 'Content-Type': 'application/json', ...(init.headers || {}) } });
  if (!rep.ok) throw new Error(`${rep.status} ${(await rep.text()).slice(0, 200)}`);
  return rep.json();
}
export async function lireDoc(chemin) { return doc(await appel(`${BASE}/${chemin}`)); }
export async function lireCollection(chemin) {
  const out = []; let page = '';
  do {
    const j = await appel(`${BASE}/${chemin}?pageSize=300${page ? '&pageToken=' + page : ''}`);
    for (const d of j.documents || []) out.push(doc(d));
    page = j.nextPageToken || '';
  } while (page);
  return out;
}
// Requête en lecture (POST runQuery ne modifie rien).
export async function requete(structuredQuery) {
  const j = await appel(`${BASE}:runQuery`, { method: 'POST', body: JSON.stringify({ structuredQuery }) });
  return j.filter((x) => x.document).map((x) => doc(x.document));
}
