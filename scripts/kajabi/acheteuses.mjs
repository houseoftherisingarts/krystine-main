#!/usr/bin/env node
// Rapatrie les acheteuses d'une offre Kajabi dans Firestore.
//
//   node scripts/kajabi/acheteuses.mjs                     liste les offres
//   node scripts/kajabi/acheteuses.mjs <offerId> origine-1  importe cette offre
//
// Les clés viennent du gestionnaire de secrets du projet, jamais du disque.
// Il faut celles du « Public API » de Kajabi (Réglages, puis API publique),
// et non l'ancienne paire clé et secret de la page Compte : la première est
// acceptée par https://api.kajabi.com/v1/oauth/token, la seconde y est
// refusée avec « Invalid client credentials », ce qui a été mesuré le
// 10 septembre 2026.
import { execFileSync } from 'node:child_process';

const PROJET = 'krystinestlaurent-87566';
const API = 'https://api.kajabi.com/v1';
const [, , offerId, nomOffre = 'origine-1'] = process.argv;

const secret = (nom) =>
  execFileSync('gcloud', ['secrets', 'versions', 'access', 'latest', `--secret=${nom}`, `--project=${PROJET}`],
    { encoding: 'utf8' }).trim();

async function jeton() {
  const corps = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: secret('KAJABI_API_KEY'),
    client_secret: secret('KAJABI_API_SECRET'),
  });
  const r = await fetch(`${API}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: corps,
  });
  const d = await r.json().catch(() => ({}));
  if (!d.access_token) {
    console.error("Kajabi refuse ces clés :", JSON.stringify(d).slice(0, 200));
    console.error("Il faut les identifiants du Public API de Kajabi, puis :");
    console.error("  printf '%s' '<client_id>'     | gcloud secrets versions add KAJABI_API_KEY    --data-file=- --project=" + PROJET);
    console.error("  printf '%s' '<client_secret>' | gcloud secrets versions add KAJABI_API_SECRET --data-file=- --project=" + PROJET);
    process.exit(1);
  }
  return d.access_token;
}

async function pages(t, chemin) {
  const out = [];
  let url = `${API}${chemin}${chemin.includes('?') ? '&' : '?'}page[size]=100`;
  while (url) {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${t}`, Accept: 'application/json' } });
    if (!r.ok) { console.error(`${r.status} sur ${url}`); break; }
    const d = await r.json();
    out.push(...(d.data || []));
    const suivant = d.links?.next;
    url = suivant && suivant !== url ? (suivant.startsWith('http') ? suivant : `${API}${suivant}`) : null;
  }
  return out;
}

const t = await jeton();

if (!offerId) {
  const offres = await pages(t, '/offers');
  console.log(`${offres.length} offres chez Kajabi :`);
  for (const o of offres) {
    const a = o.attributes || {};
    console.log(`  ${o.id.padEnd(14)} ${String(a.title || a.name || '').slice(0, 52)}`);
  }
  console.log('\nRelancez avec l\'identifiant de l\'offre voulue.');
  process.exit(0);
}

// Les achats d'une offre donnent les contacts, et le contact donne le courriel.
const achats = await pages(t, `/purchases?filter[offer_id]=${encodeURIComponent(offerId)}`);
console.log(`${achats.length} achats trouvés pour l'offre ${offerId}.`);

const contacts = new Map();
for (const a of achats) {
  const cid = a.relationships?.contact?.data?.id || a.attributes?.contact_id;
  if (cid && !contacts.has(cid)) contacts.set(cid, a.attributes?.created_at || '');
}

const acheteuses = [];
for (const [cid, date] of contacts) {
  const r = await fetch(`${API}/contacts/${cid}`, { headers: { Authorization: `Bearer ${t}`, Accept: 'application/json' } });
  if (!r.ok) continue;
  const c = (await r.json()).data?.attributes || {};
  const email = String(c.email || '').trim().toLowerCase();
  if (!email.includes('@')) continue;
  acheteuses.push({ email, prenom: c.first_name || '', nom: c.last_name || '', acheteLe: date, offre: nomOffre });
}
console.log(`${acheteuses.length} courriels retenus.`);

// Écriture dans Firestore avec le jeton gcloud, comme les autres scripts du dépôt.
const gtok = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents`;
let ecrits = 0;
for (const a of acheteuses) {
  const champs = { fields: Object.fromEntries(Object.entries(a).filter(([, v]) => v).map(([k, v]) => [k, { stringValue: String(v) }])) };
  const masque = Object.keys(champs.fields).map((k) => `updateMask.fieldPaths=${k}`).join('&');
  const r = await fetch(`${BASE}/acheteusesKajabi/${encodeURIComponent(a.email)}?${masque}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${gtok}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(champs),
  });
  if (r.ok) ecrits++;
}
console.log(`${ecrits} acheteuses rangées dans Firestore. Elles apparaissent dans « Tes acheteuses d'Origine ».`);
