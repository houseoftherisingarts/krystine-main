#!/usr/bin/env node
// Ajoute au registre de l'ancien système les membres que le relevé Stripe ne
// connaît pas (28 sept. 2026) : le registre s'arrête en mai 2024, et la
// cohorte du Vata guidé (automne 2024) comme la plupart des membres du Vata
// autonome n'y figuraient pas. La source est l'export « Product Progress »
// des membres de chaque produit. Chaque personne reçoit une entrée par
// formation, au même format que les achats Stripe (statut a_restaurer) : elle
// récupère son accès par le même flux de codes que les autres.
//
// Idempotent et sans doublon : une adresse qui a déjà une entrée au registre
// pour cette formation (par n'importe quelle offre reliée) est sautée, et une
// entrée déjà écrite n'est jamais réécrite (currentDocument exists:false).
// Aucune entrée existante n'est touchée, aucun code n'est émis.
//
//   node scripts/kajabi/registre-membres.mjs            essai à blanc
//   node scripts/kajabi/registre-membres.mjs --ecrire   écrit kajabiOffres et kajabiRegistre
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';

const PROJET = 'krystinestlaurent-87566';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents`;
const ECRIRE = process.argv.includes('--ecrire');
const DL = `${homedir()}/Downloads/`;

// Une offre ne mène qu'à une formation : kajabiEmettreCodes fait passer
// l'entrée à « code envoyé » dès le premier envoi, une entrée reliée à deux
// formations n'en recevrait donc qu'une. Le Vata guidé a deux offres
// synthétiques, une par formation de la cohorte.
// La formation kajabi-2148740714 (« Cercle de Transformation Avancée ») est
// un produit distinct dans Kajabi : elle n'est pas incluse.
const LOTS = [
  { fichier: 'product_progress (25).csv', offre: 'vata-guide-automne-2024', formation: 'kajabi-2148727800',
    titre: 'Vata guidé · Cohorte automne 2024 (membres, export du 28 sept. 2026)' },
  { fichier: 'product_progress (25).csv', offre: 'vata-guide-automne-2024-bonis', formation: 'kajabi-2148727800-bonis',
    titre: 'Vata guidé · Cohorte automne 2024 · Ateliers et bonis (membres, export du 28 sept. 2026)' },
  { fichier: 'product_progress (24).csv', offre: '2148658182', formation: 'kajabi-2148687644' },
];
// Les adresses de l'équipe ne reçoivent pas de code.
const EQUIPE = new Set(['admin@krystinestlaurent.ca', 'krystine@inspiratanature.com', 'equipe@inspiratanature.com',
  'alex@lesalondesinconnus.com', 'krystinestlaurent@gmail.com', 'houseoftherisingarts@gmail.com', 'krystinestterredhysope@gmail.com']);

const tok = JSON.parse(readFileSync(`${homedir()}/.config/configstore/firebase-tools.json`, 'utf8')).tokens.access_token;
const fs = async (method, path, body) => {
  const r = await fetch(`${BASE}${path}`, { method, headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json();
  if (d.error) throw new Error(JSON.stringify(d.error).slice(0, 300));
  return d;
};
const enc = (v) => Array.isArray(v) ? { arrayValue: { values: v.map(enc) } } : typeof v === 'number' ? { integerValue: String(v) } : { stringValue: String(v) };
const doc = (name, fields) => ({ update: { name: `projects/${PROJET}/databases/(default)/documents/${name}`, fields: Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, enc(v)])) }, currentDocument: { exists: false } });
const val = (f) => f?.stringValue ?? f?.arrayValue?.values?.map(x => x.stringValue) ?? '';

// CSV simple avec guillemets (les noms peuvent contenir une virgule).
function lireCsv(chemin) {
  const txt = readFileSync(chemin, 'utf8').replace(/^﻿/, '');
  const lignes = []; let champ = '', ligne = [], q = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) { if (c === '"' && txt[i + 1] === '"') { champ += '"'; i++; } else if (c === '"') q = false; else champ += c; }
    else if (c === '"') q = true;
    else if (c === ',') { ligne.push(champ); champ = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; ligne.push(champ); lignes.push(ligne); ligne = []; champ = ''; }
    else champ += c;
  }
  if (champ || ligne.length) { ligne.push(champ); lignes.push(ligne); }
  const [tete, ...corps] = lignes.filter(l => l.some(x => x.trim()));
  return corps.map(l => Object.fromEntries(tete.map((h, i) => [h.trim(), (l[i] || '').trim()])));
}

// Le registre et les offres tels qu'ils sont.
const registre = [];
let page = '';
do {
  const r = await fs('GET', `/kajabiRegistre?pageSize=1000&mask.fieldPaths=emailNormalise&mask.fieldPaths=kjbOfferId${page ? `&pageToken=${page}` : ''}`);
  for (const d of r.documents || []) registre.push({ id: d.name.split('/').pop(), email: val(d.fields?.emailNormalise), offre: val(d.fields?.kjbOfferId) });
  page = r.nextPageToken || '';
} while (page);
const offres = new Map(((await fs('GET', '/kajabiOffres?pageSize=300')).documents || []).map(d => [d.name.split('/').pop(), val(d.fields?.formationIds) || []]));
const idsExistants = new Set(registre.map(r => r.id));

const writes = [];
const bilan = [];
for (const lot of LOTS) {
  // Les adresses déjà au registre pour cette formation, par toutes les offres qui y mènent.
  const offresFormation = new Set([...offres].filter(([, f]) => f.includes(lot.formation)).map(([o]) => o));
  offresFormation.add(lot.offre);
  const deja = new Set(registre.filter(r => offresFormation.has(r.offre)).map(r => r.email));
  const membres = lireCsv(DL + lot.fichier);
  let ajoutees = 0, doublons = 0, equipe = 0;
  const vues = new Set();
  for (const m of membres) {
    const email = String(m.Email || '').trim().toLowerCase();
    if (!email.includes('@') || vues.has(email)) continue;
    vues.add(email);
    if (EQUIPE.has(email)) { equipe++; continue; }
    if (deja.has(email)) { doublons++; continue; }
    const id = `membres_${lot.offre}_${createHash('sha1').update(email).digest('hex').slice(0, 16)}`;
    if (idsExistants.has(id)) { doublons++; continue; }
    writes.push(doc(`kajabiRegistre/${id}`, {
      emailNormalise: email, nom: (m.Name || '').replace(/\s+/g, ' ').trim(), kjbOfferId: lot.offre,
      acheteLe: m['Start Date'] || '', source: 'kajabi-membres-export', statut: 'a_restaurer',
    }));
    ajoutees++;
  }
  if (lot.titre && !offres.has(lot.offre)) {
    writes.push(doc(`kajabiOffres/${lot.offre}`, { titre: lot.titre, charges: 0, acheteuses: vues.size - equipe, formationIds: [lot.formation] }));
  }
  bilan.push({ formation: lot.formation, offre: lot.offre, membres: membres.length, ajoutees, doublons, equipe });
}
console.table(bilan);
console.log(`${writes.length} documents à créer.`);
if (!ECRIRE) { console.log('Essai à blanc. Relancez avec --ecrire.'); process.exit(0); }
for (let i = 0; i < writes.length; i += 400) await fs('POST', ':commit', { writes: writes.slice(i, i + 400) });
console.log('Registre écrit.');
