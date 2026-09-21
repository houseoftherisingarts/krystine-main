#!/usr/bin/env node
// Balayage rétroactif de la collection `newsletter` : marque `suspect` les
// adresses posées sur un domaine d'alias jetable qui reçoivent encore les
// lettres. La garde du 21 septembre 2026 arrête les nouvelles inscriptions;
// ce script s'occupe de celles qui sont déjà entrées, dont les deux
// …@passmail.com qui ont déclenché le chantier.
//
// Usage :
//   node scripts/newsletter/marquer-robots.mjs            (essai : liste, n'écrit rien)
//   node scripts/newsletter/marquer-robots.mjs --ecrire   (applique)
//   node scripts/newsletter/marquer-robots.mjs --csv      (l'essai en CSV, pour Krystine)
//
// Il faut gcloud (compte houseoftherisingarts) sur la machine, comme
// scripts/rediffusions/archiver.mjs. La liste des domaines est LUE dans
// src/lib/robots.ts : pas de troisième copie à tenir à jour.
//
// Ce qui n'est jamais touché : une fiche déjà marquée (`robotPotentiel`
// présent, ou statut `suspect`), une fiche désabonnée ou rebondie (elle ne
// reçoit déjà plus rien), et bien sûr aucune suppression.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PROJET = 'krystinestlaurent-87566';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents`;
const PAR_PAGE = 300;
const PAR_LOT = 200; // écritures par commit:write

const args = process.argv.slice(2);
const ECRIRE = args.includes('--ecrire');
const CSV = args.includes('--csv');

// ── La liste des domaines, lue dans le miroir navigateur ────────────────────
const ici = dirname(fileURLToPath(import.meta.url));
const SOURCE_DOMAINES = join(ici, '../../src/lib/robots.ts');
const DOMAINES = {};
{
  const bloc = readFileSync(SOURCE_DOMAINES, 'utf8').match(/DOMAINES_ALIAS[^=]*=\s*\{([\s\S]*?)\n\};/);
  if (!bloc) { console.error(`DOMAINES_ALIAS introuvable dans ${SOURCE_DOMAINES}`); process.exit(1); }
  for (const m of bloc[1].matchAll(/'([^']+)':\s*'([^']+)'/g)) DOMAINES[m[1]] = m[2];
}

const domaineAlias = (email) => {
  const brut = String(email || '').trim().toLowerCase();
  const at = brut.lastIndexOf('@');
  if (at < 0) return null;
  const hote = brut.slice(at + 1);
  if (DOMAINES[hote]) return hote;
  const parts = hote.split('.');
  for (let i = 1; i < parts.length - 1; i++) {
    const parent = parts.slice(i).join('.');
    if (DOMAINES[parent]) return parent;
  }
  return null;
};

// ── Firestore par REST, avec le jeton gcloud ────────────────────────────────
const TOKEN = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
async function fs(method, chemin, corps) {
  const res = await fetch(`${BASE}/${chemin}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.error) throw new Error(`Firestore ${method} ${chemin.slice(0, 60)} : ${j.error?.message || res.status}`);
  return j;
}

// ── 1. Lire toute la collection, en ne demandant que ce qui sert ────────────
const MASQUE = ['email', 'status', 'tags', 'source', 'firstName', 'robotPotentiel']
  .map(f => `mask.fieldPaths=${f}`).join('&');

const fiches = [];
let page;
let tours = 0;
do {
  const url = `newsletter?pageSize=${PAR_PAGE}&${MASQUE}${page ? `&pageToken=${encodeURIComponent(page)}` : ''}`;
  const j = await fs('GET', url);
  for (const d of j.documents || []) {
    const f = d.fields || {};
    fiches.push({
      chemin: d.name.slice(d.name.indexOf('/documents/') + 11),
      id: d.name.split('/').pop(),
      email: f.email?.stringValue || '',
      status: f.status?.stringValue || 'active',
      source: f.source?.stringValue || '',
      firstName: f.firstName?.stringValue || '',
      tags: (f.tags?.arrayValue?.values || []).map(v => v.stringValue).filter(Boolean),
      dejaMarquee: !!f.robotPotentiel,
    });
  }
  page = j.nextPageToken;
  if (++tours % 20 === 0) process.stderr.write(`  …${fiches.length} fiches lues\n`);
} while (page);

// ── 2. Trier ────────────────────────────────────────────────────────────────
// Seules les fiches `active` sont marquées : ce sont les seules qui reçoivent
// vraiment quelque chose (send.ts et live.ts ne ciblent que `active`). Les
// `pending` sont montrées à part, parce qu'elles ne reçoivent rien aujourd'hui
// mais basculeraient à `active` si quelqu'un les réveillait un jour.
const aMarquer = [];
const dormantes = [];
const deja = [];
const inertes = [];

for (const f of fiches) {
  const domaine = domaineAlias(f.email);
  if (!domaine) continue;
  f.domaine = domaine;
  if (f.dejaMarquee || f.status === 'suspect') { deja.push(f); continue; }
  if (f.status === 'active') { aMarquer.push(f); continue; }
  if (f.status === 'pending') { dormantes.push(f); continue; }
  inertes.push(f);
}

// ── 3. Rendre compte ────────────────────────────────────────────────────────
const parDomaine = {};
for (const f of aMarquer) parDomaine[f.domaine] = (parDomaine[f.domaine] || 0) + 1;

if (CSV) {
  console.log('email,prenom,source,statut,domaine,service');
  for (const f of aMarquer) {
    console.log([f.email, f.firstName, f.source, f.status, f.domaine, DOMAINES[f.domaine]]
      .map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  }
} else {
  console.log(`\n${fiches.length.toLocaleString('fr-CA')} fiches lues dans « newsletter ».\n`);
  console.log(`À marquer     : ${aMarquer.length}`);
  console.log(`Déjà marquées : ${deja.length}${deja.length ? ` (${deja.map(f => f.email).join(', ')})` : ''}`);
  console.log(`Inertes       : ${inertes.length} (désabonnées ou rebondies, elles ne reçoivent déjà rien)`);
  if (Object.keys(parDomaine).length) {
    console.log('\nPar domaine :');
    for (const [d, n] of Object.entries(parDomaine).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(n).padStart(4)}  ${d}  (${DOMAINES[d]})`);
    }
  }
  if (aMarquer.length) {
    console.log('\nLes adresses :');
    for (const f of aMarquer) {
      console.log(`  ${f.email}${f.firstName ? ` · ${f.firstName}` : ''} · ${f.status} · source ${f.source || '—'}`);
    }
  }
}

if (!ECRIRE) {
  console.error(`\n[essai] Rien n'a été écrit. Relancer avec --ecrire pour appliquer les ${aMarquer.length} marquages.`);
  process.exit(0);
}
if (!aMarquer.length) { console.error('\nRien à écrire.'); process.exit(0); }

// ── 4. Écrire, par lots, en ne touchant que les quatre champs de la garde ───
const maintenant = new Date().toISOString();
let ecrites = 0;
for (let i = 0; i < aMarquer.length; i += PAR_LOT) {
  const writes = aMarquer.slice(i, i + PAR_LOT).map(f => ({
    update: {
      name: `projects/${PROJET}/databases/(default)/documents/${f.chemin}`,
      fields: {
        status: { stringValue: 'suspect' },
        statusAvant: { stringValue: f.status },
        tags: { arrayValue: { values: [...new Set([...f.tags, 'robot-potentiel'])].map(t => ({ stringValue: t })) } },
        robotPotentiel: { mapValue: { fields: {
          raison: { stringValue: `alias jetable ${f.domaine} (${DOMAINES[f.domaine]})` },
          poseLe: { timestampValue: maintenant },
          par: { stringValue: 'balayage rétroactif' },
        } } },
      },
    },
    // Seuls ces quatre champs bougent : le reste de la fiche est intact.
    updateMask: { fieldPaths: ['status', 'statusAvant', 'tags', 'robotPotentiel'] },
  }));
  await fs('POST', ':commit', { writes });
  ecrites += writes.length;
  process.stderr.write(`  …${ecrites}/${aMarquer.length} écrites\n`);
}
console.error(`\n${ecrites} fiche(s) marquée(s) « suspect ». Aucune fiche effacée.`);
