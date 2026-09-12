#!/usr/bin/env node
// Remplit le registre des achats de l'ancien système (Kajabi) dans Firestore,
// à partir du relevé Stripe du 7 septembre 2026 et de l'export des contacts
// Kajabi (pour les noms). Idempotent : une charge déjà rangée n'est jamais
// réécrite, donc son statut (code envoyé, restauré) reste intact.
//
//   node scripts/kajabi/registre.mjs            essai à blanc
//   node scripts/kajabi/registre.mjs --ecrire   écrit kajabiOffres et kajabiRegistre
//
// Kajabi ne vend presque plus rien (une vente en 2025, une en 2026) : relancer
// ce script après un nouveau relevé Stripe suffit, l'API Kajabi n'est pas requise.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';

const PROJET = 'krystinestlaurent-87566';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents`;
const V = `${homedir()}/Documents/Onyx/10_projects/krystine/kajabi-extraction/`;
const ECRIRE = process.argv.includes('--ecrire');
// Offres dont la formation sur le site est connue sans ambiguïté. Le reste se
// relie dans l'admin (Communauté › Codes de l'ancien système).
const FORMATIONS_CONNUES = {
  '2148456863': ['masterclass-gestion-stress'],
  '2148497356': ['masterclass-gestion-stress'],
  '2148658182': ['kajabi-2148687644'],
};

const tok = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
const fs = async (method, path, body) => {
  const r = await fetch(`${BASE}${path}`, { method, headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json();
  if (d.error) throw new Error(JSON.stringify(d.error).slice(0, 300));
  return d;
};
const enc = (v) => Array.isArray(v) ? { arrayValue: { values: v.map(enc) } } : typeof v === 'number' ? { doubleValue: v } : { stringValue: String(v) };
const doc = (name, fields) => ({ update: { name: `projects/${PROJET}/databases/(default)/documents/${name}`, fields: Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, enc(v)])) }, currentDocument: { exists: false } });

// 1. Le relevé Stripe : charges Kajabi réussies, non remboursées.
const releve = JSON.parse(readFileSync(`${V}stripe-charges-kajabi-2026-09-07.json`, 'utf8'));
const charges = releve.rows.filter(r => r.kajabi && r.status === 'succeeded' && !r.refunded && r.email);
// 2. Les noms, depuis l'export des contacts Kajabi puis les clients Stripe.
const noms = new Map();
for (const ligne of readFileSync(`${V}contacts-kajabi-2026-08-30.csv`, 'utf8').split('\n').slice(1)) {
  const [nom, courriel] = ligne.split(',');
  if (courriel && nom) noms.set(courriel.trim().toLowerCase(), nom.trim());
}
for (const c of Object.values(releve.custs || {})) if (c.email && c.name && !noms.has(c.email.toLowerCase())) noms.set(c.email.toLowerCase(), c.name);
// 3. Les titres d'offres, lus dans le relevé markdown du même jour.
const titres = new Map();
for (const l of readFileSync(`${V}stripe-offres-kajabi-2026-09-07.md`, 'utf8').split('\n')) {
  const m = /^\| (\d{10}) \|.*\| ([^|]+) \|$/.exec(l);
  if (m) titres.set(m[1], m[2].trim().startsWith('(aucun nom') ? '' : m[2].trim());
}

const parOffre = new Map();
for (const c of charges) {
  const o = String(c.offer); const e = parOffre.get(o) || { charges: 0, emails: new Set() };
  e.charges++; e.emails.add(c.email.toLowerCase()); parOffre.set(o, e);
}
console.log(`${charges.length} achats, ${new Set(charges.map(c => c.email.toLowerCase())).size} acheteuses, ${parOffre.size} offres`);

// Ce qui existe déjà (pour ne jamais réécrire un statut).
const existants = new Set();
let token = '';
do {
  const r = await fs('GET', `/kajabiRegistre?pageSize=1000&mask.fieldPaths=statut${token ? `&pageToken=${token}` : ''}`);
  for (const d of r.documents || []) existants.add(d.name.split('/').pop());
  token = r.nextPageToken || '';
} while (token);
const offresExistantes = new Set((await fs('GET', '/kajabiOffres?pageSize=200&mask.fieldPaths=titre')).documents?.map(d => d.name.split('/').pop()) || []);

const writes = [];
for (const [o, e] of parOffre) {
  if (offresExistantes.has(o)) continue;
  writes.push(doc(`kajabiOffres/${o}`, { titre: titres.get(o) || `Offre ${o} (nom à lire dans Kajabi)`, charges: e.charges, acheteuses: e.emails.size, formationIds: FORMATIONS_CONNUES[o] || [] }));
}
for (const c of charges) {
  const id = `stripe_${c.id}`;
  if (existants.has(id)) continue;
  const email = c.email.toLowerCase();
  writes.push(doc(`kajabiRegistre/${id}`, { emailNormalise: email, nom: noms.get(email) || '', kjbOfferId: String(c.offer), stripeChargeId: c.id, montant: Number(c.amount || 0), acheteLe: c.created, source: 'stripe', statut: 'a_restaurer' }));
}
console.log(`${writes.length} documents à créer (${existants.size} achats et ${offresExistantes.size} offres déjà rangés)`);
if (!ECRIRE) { console.log('Essai à blanc. Relancez avec --ecrire.'); process.exit(0); }
for (let i = 0; i < writes.length; i += 400) await fs('POST', ':commit', { writes: writes.slice(i, i + 400) });
console.log('Registre écrit.');
