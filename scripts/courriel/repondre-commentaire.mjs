#!/usr/bin/env node
// La réponse à un commentaire du site, APRÈS l'approbation de Krystine
// (14 octobre 2026). Iris montre le brouillon dans la conversation; une fois
// approuvé mot pour mot, ce script pose `reponseApprouvee` sur la fiche
// bugs/{id}. La fonction envoyerReponseApprouvee envoie alors le courriel par
// le même chemin que l'admin et consigne la réponse sur la fiche.
//
//   node scripts/courriel/repondre-commentaire.mjs <id> <fichier-texte>
//   node scripts/courriel/repondre-commentaire.mjs --liste      les commentaires encore ouverts
//
// Rien ne part sans son accord : ne jamais lancer ce script sur un texte
// qu'elle n'a pas approuvé.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const BASE = 'https://firestore.googleapis.com/v1/projects/krystinestlaurent-87566/databases/(default)/documents';

async function jeton() {
  try { return execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { /* pas de gcloud */ }
  const candidats = [join(homedir(), '.iris/tools/node_modules/firebase-tools/lib/auth.js')];
  try { candidats.unshift(execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim() + '/firebase-tools/lib/auth.js'); } catch { /* rien */ }
  const chemin = candidats.find(existsSync);
  const conf = join(homedir(), '.config/configstore/firebase-tools.json');
  if (!chemin || !existsSync(conf)) throw new Error('Ni gcloud ni « firebase login » sur cet ordinateur.');
  const t = await createRequire(import.meta.url)(chemin).getAccessToken(JSON.parse(readFileSync(conf, 'utf8')).tokens.refresh_token, []);
  return t.access_token || t;
}
const v = (x) => x == null ? null : 'stringValue' in x ? x.stringValue : 'timestampValue' in x ? x.timestampValue
  : 'arrayValue' in x ? (x.arrayValue.values || []).map(v) : 'mapValue' in x ? Object.fromEntries(Object.entries(x.mapValue.fields || {}).map(([k, y]) => [k, v(y)])) : null;

const T = await jeton();
const [id, fichier] = process.argv.slice(2);

if (!id || id === '--liste') {
  const r = await fetch(`${BASE}:runQuery`, { method: 'POST', headers: { Authorization: `Bearer ${T}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'bugs' }], limit: 500 } }) }).then((x) => x.json());
  for (const x of r.filter((y) => y.document)) {
    const d = Object.fromEntries(Object.entries(x.document.fields).map(([k, y]) => [k, v(y)]));
    if (d.statut === 'regle') continue;
    console.log(`${x.document.name.split('/').pop()} | ${d.cree || ''} | ${d.nom || ''} <${d.courriel || ''}> | ${d.page || ''} | ${String(d.texte || '').replace(/\s+/g, ' ').slice(0, 160)}`);
  }
  process.exit(0);
}
if (!fichier || !existsSync(fichier)) { console.error('Usage : node scripts/courriel/repondre-commentaire.mjs <id> <fichier-texte>'); process.exit(1); }
const texte = readFileSync(fichier, 'utf8').trim();
const res = await fetch(`${BASE}/bugs/${id}?updateMask.fieldPaths=reponseApprouvee&currentDocument.exists=true`, {
  method: 'PATCH', headers: { Authorization: `Bearer ${T}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ fields: { reponseApprouvee: { mapValue: { fields: { texte: { stringValue: texte }, par: { stringValue: 'Krystine (approuvé, envoyé par Iris)' } } } } } }),
});
if (!res.ok) { console.error('Refusé :', res.status, await res.text()); process.exit(1); }
console.log(`Réponse approuvée posée sur bugs/${id} : elle part dans quelques secondes.`);
