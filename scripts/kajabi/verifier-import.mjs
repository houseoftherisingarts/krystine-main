#!/usr/bin/env node
// Le bot de vérification de l'import Kajabi (Alex, 9 septembre 2026).
//
// Chaque leçon importée garde son `wistiaHash` (la source Kajabi) et son
// `chemin` (le fichier dans Storage). Le bot compare les deux, octet par
// octet : la taille d'abord, puis l'empreinte MD5 du flux Wistia contre le
// md5Hash que Storage a calculé sur le fichier tel qu'il est stocké. Deux
// empreintes égales veulent dire deux fichiers identiques au bit près.
//
//   node scripts/kajabi/verifier-import.mjs                 toutes les formations, MD5 complet
//   node scripts/kajabi/verifier-import.mjs --rapide        taille seulement (sans téléchargement)
//   node scripts/kajabi/verifier-import.mjs kajabi-2148727800 foyer
//
// Il faut gcloud (compte houseoftherisingarts) sur la machine : le jeton sert
// à lire Storage et à écrire `integrite` sur chaque leçon. Le rapport est
// écrit dans le vault (10_projects/krystine/kajabi-verification-<date>.md)
// et l'admin montre la pastille de chaque leçon (LeconsPanel).

import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { homedir } from 'node:os';

const PROJET = 'krystinestlaurent-87566';
const BUCKET = `${PROJET}.firebasestorage.app`;
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents`;
const args = process.argv.slice(2);
const RAPIDE = args.includes('--rapide');
const CIBLES = args.filter(a => !a.startsWith('--'));
const PARALLELE = 3;

const token = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
const auth = { Authorization: `Bearer ${token}` };

const val = f => f == null ? undefined
  : 'stringValue' in f ? f.stringValue
  : 'integerValue' in f ? Number(f.integerValue)
  : 'booleanValue' in f ? f.booleanValue
  : 'arrayValue' in f ? (f.arrayValue.values || []).map(val)
  : 'mapValue' in f ? Object.fromEntries(Object.entries(f.mapValue.fields || {}).map(([k, v]) => [k, val(v)]))
  : undefined;

async function lister(chemin, mask) {
  const docs = [];
  let pageToken = '';
  do {
    const u = new URL(`${BASE}/${chemin}`);
    u.searchParams.set('pageSize', '300');
    if (pageToken) u.searchParams.set('pageToken', pageToken);
    for (const m of mask) u.searchParams.append('mask.fieldPaths', m);
    const r = await fetch(u, { headers: auth });
    if (!r.ok) throw new Error(`${chemin}: ${r.status} ${await r.text()}`);
    const d = await r.json();
    for (const doc of d.documents || []) docs.push({ id: doc.name.split('/').pop(), ...Object.fromEntries(Object.entries(doc.fields || {}).map(([k, v]) => [k, val(v)])) });
    pageToken = d.nextPageToken || '';
  } while (pageToken);
  return docs;
}

async function metaStorage(chemin) {
  const r = await fetch(`https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodeURIComponent(chemin)}`, { headers: auth });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`storage ${chemin}: ${r.status}`);
  const d = await r.json();
  return { octets: Number(d.size), md5: d.md5Hash };
}

async function assetsWistia(hash) {
  const r = await fetch(`https://fast.wistia.com/embed/medias/${hash}.json`);
  if (!r.ok) return null;
  const d = await r.json();
  return (d.media?.assets || []).filter(a => a.size && a.url).map(a => ({ type: a.type, octets: Number(a.size), url: a.url }));
}

async function md5DuFlux(url) {
  const r = await fetch(url);
  if (!r.ok || !r.body) throw new Error(`source ${r.status}`);
  const h = createHash('md5');
  for await (const chunk of r.body) h.update(chunk);
  return h.digest('base64');
}

async function verifierLecon(formationId, l) {
  const base = { verifieLe: new Date().toISOString(), mode: RAPIDE ? 'taille' : 'md5' };
  if (!l.chemin) return { ...base, etat: 'absent', detail: 'La leçon ne porte aucun fichier.' };
  const stock = await metaStorage(l.chemin);
  if (!stock) return { ...base, etat: 'absent', detail: `Rien dans Storage à ${l.chemin}.` };
  base.storageOctets = stock.octets;
  base.md5 = stock.md5;
  const assets = await assetsWistia(l.wistiaHash);
  if (!assets || assets.length === 0) return { ...base, etat: 'source-introuvable', detail: `Wistia ne répond plus pour ${l.wistiaHash}.` };
  const original = assets.find(a => a.type === 'original') || assets[0];
  base.sourceOctets = original.octets;
  const pareil = assets.find(a => a.octets === stock.octets);
  if (!pareil) return { ...base, etat: 'ecart', detail: `Taille : source ${original.octets} octets, Storage ${stock.octets} octets.` };
  if (RAPIDE) return { ...base, etat: 'ok', detail: `Même taille que la source (${pareil.type}, ${stock.octets} octets).` };
  const md5Source = await md5DuFlux(pareil.url);
  if (md5Source !== stock.md5) return { ...base, etat: 'ecart', detail: `Même taille mais contenu différent (MD5 source ${md5Source}, Storage ${stock.md5}).` };
  return { ...base, etat: 'ok', detail: `Identique à la source octet par octet (${pareil.type}, ${stock.octets} octets, MD5 ${stock.md5}).` };
}

const enFirestore = v => typeof v === 'number' ? { integerValue: String(v) } : { stringValue: String(v) };
async function ecrire(formationId, leconId, integrite) {
  const u = new URL(`${BASE}/formations/${formationId}/lecons/${leconId}`);
  u.searchParams.append('updateMask.fieldPaths', 'integrite');
  const r = await fetch(u, { method: 'PATCH', headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { integrite: { mapValue: { fields: Object.fromEntries(Object.entries(integrite).map(([k, v]) => [k, enFirestore(v)])) } } } }) });
  if (!r.ok) throw new Error(`écriture ${leconId}: ${r.status} ${await r.text()}`);
}

async function enParallele(items, n, fn) {
  const out = [];
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } }));
  return out;
}

const formations = await lister('formations', ['titre']);
const cibles = CIBLES.length ? formations.filter(f => CIBLES.includes(f.id)) : formations;
const lignes = [];
const totaux = { ok: 0, ecart: 0, absent: 0, 'source-introuvable': 0, ignorees: 0 };
for (const f of cibles) {
  const lecons = (await lister(`formations/${f.id}/lecons`, ['titre', 'chemin', 'wistiaHash', 'type'])).filter(l => l.wistiaHash);
  if (lecons.length === 0) continue;
  console.log(`\n${f.titre} (${f.id}) : ${lecons.length} leçons importées`);
  await enParallele(lecons, PARALLELE, async l => {
    let res;
    try { res = await verifierLecon(f.id, l); }
    catch (e) { res = { etat: 'ecart', detail: `Erreur : ${e.message}`, verifieLe: new Date().toISOString(), mode: RAPIDE ? 'taille' : 'md5' }; }
    await ecrire(f.id, l.id, res);
    totaux[res.etat] = (totaux[res.etat] || 0) + 1;
    const ico = res.etat === 'ok' ? '✓' : '✗';
    console.log(`  ${ico} ${l.titre.slice(0, 70)} · ${res.detail}`);
    lignes.push(`| ${f.titre} | ${l.titre.replace(/\|/g, '/')} | ${res.etat} | ${res.detail} |`);
  });
}

const date = new Date().toISOString().slice(0, 10);
const rapport = `# Vérification de l'import Kajabi · ${date} (${RAPIDE ? 'taille seulement' : 'MD5 octet par octet'})\n\n` +
  `Le bot \`scripts/kajabi/verifier-import.mjs\` du dépôt Krystine Main a comparé chaque leçon importée avec sa source Wistia.\n\n` +
  `Bilan : ${totaux.ok} identiques · ${totaux.ecart} écarts · ${totaux.absent} absentes de Storage · ${totaux['source-introuvable']} sources Wistia disparues.\n\n` +
  `| Formation | Leçon | État | Détail |\n|---|---|---|---|\n${lignes.join('\n')}\n`;
const sortie = `${homedir()}/Documents/Onyx/10_projects/krystine/kajabi-verification-${date}${RAPIDE ? '-rapide' : ''}.md`;
writeFileSync(sortie, rapport);
console.log(`\nBilan : ${JSON.stringify(totaux)}\nRapport : ${sortie}`);
