// Ouvre VATA aux acheteuses Kajabi dont le compte du site existe à la même
// adresse que l'achat, mais dont l'adresse n'a jamais été confirmée
// (décision de Krystine, 7 oct. 2026 : « oui » aux 78). Même écriture que
// kajabiRestaurerAuto (functions/src/kajabi.ts), sans l'exigence du clic.
//   node scripts/vata/ouvrir-non-confirmees.mjs <vata-verification.csv> [--vrai]
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
const [,, CSV, MODE] = process.argv;
const VRAI = MODE === '--vrai';
const BASE = 'https://firestore.googleapis.com/v1/projects/krystinestlaurent-87566/databases/(default)/documents';
const chemin = [execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim() + '/firebase-tools/lib/auth.js', join(homedir(), '.iris/tools/node_modules/firebase-tools/lib/auth.js')].find(existsSync);
const t = await createRequire(import.meta.url)(chemin).getAccessToken(JSON.parse(readFileSync(join(homedir(), '.config/configstore/firebase-tools.json'), 'utf8')).tokens.refresh_token, []);
const H = { Authorization: `Bearer ${t.access_token || t}`, 'Content-Type': 'application/json' };
const api = async (url, opt = {}) => { const r = await fetch(url, { headers: H, ...opt }); const d = await r.json(); if (d.error && d.error.code !== 404) throw new Error(JSON.stringify(d.error).slice(0, 300)); return d; };

// Le CSV de verifier-vata.mjs : catégorie « compte sans accès », adresse jamais confirmée.
const lignes = readFileSync(CSV, 'utf8').replace(/^﻿/, '').split('\n').slice(1).filter(Boolean)
  .map(l => { const c = []; let x = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { c.push(x); x = ''; } else x += ch; } c.push(x); return c; });
const cibles = lignes.filter(c => c[0].startsWith('❌') && c[8].includes('jamais confirmée'));
const OFFRES = { 'VATA Essentiel': ['kajabi-2148687644'], 'Vata guidé': ['kajabi-2148727800', 'kajabi-2148727800-bonis', 'kajabi-2148740714'] };
const parUid = new Map();
for (const c of cibles) {
  const uid = c[5].trim(); const email = c[3].trim().toLowerCase();
  const f = c[1].startsWith('VATA Essentiel') ? OFFRES['VATA Essentiel'] : OFFRES['Vata guidé'];
  const e = parUid.get(uid) || { email, nom: c[2], formations: new Set() };
  f.forEach(x => e.formations.add(x)); parUid.set(uid, e);
}
console.log(`${parUid.size} personnes, ${cibles.length} lignes`, VRAI ? '(ÉCRITURE)' : '(essai, rien n\'est écrit)');

const titres = {};
let ouverts = 0, deja = 0;
for (const [uid, e] of parUid) {
  // Le registre Kajabi de cette adresse : preuve d'achat, marquée restaurée.
  const reg = await api(`${BASE}:runQuery`, { method: 'POST', body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'kajabiRegistre' }], where: { fieldFilter: { field: { fieldPath: 'emailNormalise' }, op: 'EQUAL', value: { stringValue: e.email } } }, limit: 50 } }) });
  const regs = reg.filter(x => x.document).map(x => x.document);
  if (!regs.length) { console.log('  sans preuve au registre, ignorée :', e.nom, e.email); continue; }
  for (const f of e.formations) {
    const ref = `${BASE}/achatsFormations/${uid}/formations/${f}`;
    const exist = await api(ref);
    if (exist.fields) { deja++; continue; }
    titres[f] ??= (await api(`${BASE}/formations/${f}?mask.fieldPaths=titre&mask.fieldPaths=imageUrl`)).fields || {};
    ouverts++;
    if (!VRAI) continue;
    await api(`${ref}?currentDocument.exists=false`, { method: 'PATCH', body: JSON.stringify({ fields: {
      titre: { stringValue: titres[f].titre?.stringValue || f }, imageUrl: { stringValue: titres[f].imageUrl?.stringValue || '' },
      montant: { integerValue: '0' }, source: { stringValue: 'kajabi' }, restaurationAuto: { booleanValue: true },
      ouvertSansConfirmation: { stringValue: 'décision Krystine 2026-10-07' }, acheteLe: { timestampValue: new Date().toISOString() },
    } }) });
  }
  if (VRAI) for (const r of regs) {
    const s = r.fields?.statut?.stringValue;
    if (!['a_restaurer', 'code_envoye'].includes(s) || r.fields?.restaurePar) continue;
    await api(`${r.name.replace(/^projects/, 'https://firestore.googleapis.com/v1/projects')}?updateMask.fieldPaths=statut&updateMask.fieldPaths=uid&updateMask.fieldPaths=restaurePar&updateMask.fieldPaths=restaureLe`, { method: 'PATCH', body: JSON.stringify({ fields: {
      statut: { stringValue: 'restaure' }, uid: { stringValue: uid }, restaurePar: { stringValue: uid }, restaureLe: { timestampValue: new Date().toISOString() },
    } }) });
  }
}
console.log(`accès à ouvrir : ${ouverts} · déjà ouverts : ${deja}`);
