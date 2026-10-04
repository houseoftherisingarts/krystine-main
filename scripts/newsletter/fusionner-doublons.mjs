#!/usr/bin/env node
// Fusion des doublons de la collection `newsletter` : une même adresse vit
// parfois sous plusieurs fiches (une par formulaire ou par import, avant la
// garde du 27 septembre 2026 dans inscrire.ts). Le script choisit une fiche
// principale par adresse, y verse ce que portent les autres, et MARQUE les
// autres `status: 'doublon'`. Rien n'est jamais supprimé.
//
// Usage :
//   node scripts/newsletter/fusionner-doublons.mjs                  (à blanc : lit, calcule, n'écrit rien)
//   node scripts/newsletter/fusionner-doublons.mjs --sortie=DOSSIER (à blanc + rapport JSON et CSV dans DOSSIER)
//   node scripts/newsletter/fusionner-doublons.mjs --appliquer      (sauvegarde, confirmation tapée, puis écrit)
//   --garder-reinscrites : une adresse qui s'est réinscrite APRÈS s'être
//     désabonnée garde le statut de sa fiche active (sinon le désabonnement gagne).
//   --sauvegarde=DOSSIER : où poser la sauvegarde (défaut ~/Documents/Sauvegardes Inspira/newsletter).
//
// Règles de fusion (décidées le 4 oct. 2026) :
//   principale = la fiche qui a un `uid`, sinon la plus ancienne `subscribedAt`;
//   tags = union; statut : complained > unsubscribed > bounced > suspect > active > pending;
//   firstName/lastName = le premier non vide (principale d'abord); subscribedAt = la plus ancienne;
//   derniereLettreLe / derniereOuvertureLe = la plus récente;
//   question / provenance = toutes gardées (questionsFusionnees, provenancesFusionnees).
//   Secondaires : status 'doublon', fusionneDans, statusAvantFusion, fusionneLe.
//
// Accès : gcloud (comme marquer-robots.mjs) s'il est installé, sinon la
// connexion de la commande `firebase` (firebase login). Aucun secret affiché.

import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import readline from 'node:readline/promises';

const PROJET = 'krystinestlaurent-87566';
const RACINE = `projects/${PROJET}/databases/(default)/documents`;
const BASE = `https://firestore.googleapis.com/v1/${RACINE}`;
const PAR_LOT = 200;

const args = process.argv.slice(2);
const opt = (nom) => args.find(a => a.startsWith(`--${nom}=`))?.split('=').slice(1).join('=');
const APPLIQUER = args.includes('--appliquer');
const GARDER_REINSCRITES = args.includes('--garder-reinscrites');
const SORTIE = opt('sortie');
const DOSSIER_SAUVEGARDE = opt('sauvegarde') || join(homedir(), 'Documents', 'Sauvegardes Inspira', 'newsletter');

// ── Accès ───────────────────────────────────────────────────────────────────
async function jeton() {
  try { return execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { /* pas de gcloud */ }
  const candidats = [join(homedir(), '.iris/tools/node_modules/firebase-tools/lib/auth.js')];
  try { candidats.unshift(execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim() + '/firebase-tools/lib/auth.js'); } catch { /* rien */ }
  const chemin = candidats.find(existsSync);
  const conf = join(homedir(), '.config/configstore/firebase-tools.json');
  if (!chemin || !existsSync(conf)) throw new Error('Ni gcloud ni « firebase login » sur cet ordinateur.');
  const auth = createRequire(import.meta.url)(chemin);
  const t = await auth.getAccessToken(JSON.parse(readFileSync(conf, 'utf8')).tokens.refresh_token, []);
  return t.access_token || t;
}
const TOKEN = await jeton();
async function fs(method, chemin, corps) {
  const res = await fetch(`${BASE}${chemin}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.error) throw new Error(`Firestore ${method} ${chemin.slice(0, 60)} : ${j.error?.message || res.status}`);
  return j;
}

// ── Valeurs Firestore (REST) ────────────────────────────────────────────────
const lire = (v) => {
  if (!v) return undefined;
  if ('stringValue' in v) return v.stringValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(lire);
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, lire(x)]));
  return undefined;
};
const chaine = (s) => ({ stringValue: String(s) });
const horo = (iso) => ({ timestampValue: iso });
const ms = (iso) => (iso ? Date.parse(iso) : NaN);
const vide = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);

// ── 1. Lire toute la collection ─────────────────────────────────────────────
const fiches = [];
let page;
do {
  const j = await fs('GET', `/newsletter?pageSize=1000${page ? `&pageToken=${encodeURIComponent(page)}` : ''}`);
  for (const d of j.documents || []) {
    const brut = d.fields || {};
    fiches.push({ id: d.name.split('/').pop(), nom: d.name, updateTime: d.updateTime, createTime: d.createTime, brut, v: (k) => lire(brut[k]) });
  }
  page = j.nextPageToken;
  process.stderr.write(`\r  ${fiches.length} fiches lues`);
} while (page);
process.stderr.write('\n');

// ── 2. Grouper par adresse (minuscules, espaces retirés) ────────────────────
const norm = (e) => String(e || '').trim().toLowerCase();
const statut = (f) => f.v('status') || 'active'; // une fiche sans statut est servie comme active (live.ts)
const groupes = new Map();
for (const f of fiches) {
  const e = norm(f.v('email'));
  // Une fiche déjà fusionnée (relance du script) reste hors des groupes.
  if (!e || f.v('status') === 'doublon') continue;
  if (!groupes.has(e)) groupes.set(e, []);
  groupes.get(e).push(f);
}

// Variantes gmail (points, +suffixe) : signalées seulement, jamais fusionnées.
const canon = (e) => {
  let [u, d] = e.split('@');
  if (d === 'googlemail.com') d = 'gmail.com';
  u = u.split('+')[0];
  if (d === 'gmail.com') u = u.replace(/\./g, '');
  return `${u}@${d}`;
};
const parCanon = new Map();
for (const e of groupes.keys()) { const c = canon(e); parCanon.set(c, [...(parCanon.get(c) || []), e]); }
const variantes = [...parCanon.values()].filter(l => l.length > 1);

// ── 3. La fiche fusionnée de chaque groupe ──────────────────────────────────
const ORDRE = ['complained', 'unsubscribed', 'bounced', 'suspect'];
const FERMES = ['complained', 'unsubscribed', 'bounced'];
const quand = (f) => ms(f.v('subscribedAt')) || ms(f.v('createdAt')) || ms(f.createTime);
const COMPLETER = ['lang', 'phone', 'province', 'region', 'uid', 'consentement', 'welcomeSentAt', 'unsubscribedAt', 'bouncedAt', 'complainedAt'];

const plan = [];
for (const [email, fs_] of groupes) {
  if (fs_.length < 2) continue;
  const parDate = [...fs_].sort((a, b) => quand(a) - quand(b) || (a.id < b.id ? -1 : 1));
  const principale = parDate.find(f => f.v('uid')) || parDate[0];
  const autres = parDate.filter(f => f !== principale);
  const ordre = [principale, ...autres];

  const statuts = fs_.map(statut);
  let resultat = ORDRE.find(s => statuts.includes(s)) || (statuts.includes('active') ? 'active' : 'pending');

  // Réinscrite après un désabonnement : une fiche active plus récente que la
  // dernière fermeture. La règle par défaut la désabonne quand même; Krystine tranche.
  const fermeture = Math.max(0, ...fs_.filter(f => FERMES.includes(statut(f))).map(f => ms(f.v('unsubscribedAt')) || ms(f.v('bouncedAt')) || quand(f)));
  const reinscrite = FERMES.includes(resultat) && fs_.some(f => statut(f) === 'active' &&
    Math.max(quand(f), ms(f.v('reinscriteLe')) || 0, ms(f.v('reabonneAt')) || 0) > fermeture);
  if (reinscrite && GARDER_REINSCRITES) resultat = 'active';

  const champs = {};
  const tags = [...new Set(ordre.flatMap(f => f.v('tags') || []))];
  if (tags.length !== (principale.v('tags') || []).length) champs.tags = { arrayValue: { values: tags.map(chaine) } };
  if (resultat !== statut(principale)) { champs.status = chaine(resultat); champs.statusAvantFusion = chaine(statut(principale)); }
  for (const k of ['firstName', 'lastName']) {
    if (vide(principale.v(k))) { const s = ordre.find(f => !vide(f.v(k))); if (s) champs[k] = s.brut[k]; }
  }
  const plusAncienne = parDate.find(f => f.v('subscribedAt'));
  if (plusAncienne && plusAncienne !== principale && ms(plusAncienne.v('subscribedAt')) < (ms(principale.v('subscribedAt')) || Infinity)) champs.subscribedAt = plusAncienne.brut.subscribedAt;
  for (const k of ['derniereLettreLe', 'derniereOuvertureLe']) {
    const max = ordre.filter(f => f.v(k)).sort((a, b) => ms(b.v(k)) - ms(a.v(k)))[0];
    if (max && max.v(k) !== principale.v(k)) champs[k] = max.brut[k];
  }
  for (const k of COMPLETER) {
    if (vide(principale.v(k))) { const s = autres.find(f => !vide(f.v(k))); if (s) champs[k] = s.brut[k]; }
  }
  // Questions et provenances : toutes gardées, sans doublon.
  for (const [k, liste] of [['question', 'questionsFusionnees'], ['provenance', 'provenancesFusionnees']]) {
    const vals = ordre.filter(f => !vide(f.v(k))).map(f => f.brut[k]);
    const uniques = [...new Map(vals.map(x => [JSON.stringify(lire(x)), x])).values()];
    if (uniques.length > 1 || (uniques.length === 1 && vide(principale.v(k)))) champs[liste] = { arrayValue: { values: uniques } };
    if (vide(principale.v(k)) && uniques.length) champs[k] = uniques[0];
  }
  const conf = {};
  for (const f of [...[...autres].reverse(), principale]) Object.assign(conf, f.brut.confirmationsEnvoyees?.mapValue?.fields || {});
  if (Object.keys(conf).length > Object.keys(principale.brut.confirmationsEnvoyees?.mapValue?.fields || {}).length) {
    champs.confirmationsEnvoyees = { mapValue: { fields: conf } };
  }

  plan.push({
    email, principale, autres, statuts, resultat, reinscrite, champs,
    activeAvant: statuts.includes('active'),
  });
}

// ── 4. Les chiffres ─────────────────────────────────────────────────────────
const n = (x) => x.toLocaleString('fr-CA');
const ficheActives = fiches.filter(f => statut(f) === 'active').length;
const adressesActives = [...groupes.values()].filter(l => l.some(f => statut(f) === 'active')).length;
const versFerme = plan.filter(p => p.activeAvant && FERMES.includes(p.resultat));
const versSuspect = plan.filter(p => p.activeAvant && p.resultat === 'suspect');
const activesApres = adressesActives - versFerme.length - versSuspect.length;
const secondaires = plan.reduce((s, p) => s + p.autres.length, 0);
const masque = (e) => `${e.slice(0, 3)}…@${e.split('@')[1]}`;

console.log(`\n${n(fiches.length)} fiches · ${n(groupes.size)} adresses uniques · ${n(plan.length)} adresses en doublon · ${n(secondaires)} fiches secondaires à marquer « doublon »`);
console.log(`\nPOINT LÉGAL : ${versFerme.length} adresse(s) reçoivent aujourd'hui par une fiche active alors qu'une autre de leurs fiches est désabonnée ou rebondie.`);
for (const p of versFerme) {
  console.log(`  ${masque(p.email)} : ${p.statuts.join(' + ')} → ${p.resultat}${p.reinscrite ? '  (réinscrite APRÈS son désabonnement : à trancher)' : ''}`);
}
if (versSuspect.length) console.log(`  + ${versSuspect.length} adresse(s) active(s) qui passeraient à « suspect » (une fiche en quarantaine).`);
console.log(`\nFiches actives aujourd'hui : ${n(ficheActives)} · personnes actives uniques : ${n(adressesActives)} · après fusion : ${n(activesApres)}`);
console.log(`Variantes gmail ou +suffixe (signalées, non fusionnées) : ${variantes.length} groupe(s)`);
console.log(`\nExemples :`);
for (const p of plan.slice().sort((a, b) => b.autres.length - a.autres.length).slice(0, 10)) {
  console.log(`  ${masque(p.email)} · ${p.autres.length + 1} fiches (${[p.principale, ...p.autres].map(f => f.v('source') || '?').join(', ')}) · principale ${p.principale.id} · ${p.statuts.join('/')} → ${p.resultat}`);
}

if (SORTIE) {
  mkdirSync(SORTIE, { recursive: true });
  const lignes = plan.map(p => ({
    email: p.email,
    fiches: [p.principale, ...p.autres].map(f => ({ id: f.id, status: statut(f), source: f.v('source') || null, subscribedAt: f.v('subscribedAt') || null, uid: f.v('uid') || null })),
    principale: p.principale.id,
    statutResultant: p.resultat,
    passeDeActiveAFerme: p.activeAvant && FERMES.includes(p.resultat),
    reinscriteApresDesabonnement: p.reinscrite,
    champsPrincipale: Object.keys(p.champs),
  }));
  const resume = { le: new Date().toISOString(), fiches: fiches.length, adressesUniques: groupes.size, groupes: plan.length, secondaires, ficheActives, adressesActives, activesApres, activeVersFerme: versFerme.length, activeVersSuspect: versSuspect.length, variantesGmail: variantes };
  writeFileSync(join(SORTIE, 'doublons.json'), JSON.stringify({ resume, groupes: lignes }, null, 2));
  const q = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const csv = ['courriel,nb_fiches,ids_et_statuts,sources,principale,statut_resultant,active_vers_ferme,reinscrite_apres_desabonnement']
    .concat(lignes.map(l => [l.email, l.fiches.length, l.fiches.map(f => `${f.id}:${f.status}`).join(' '), l.fiches.map(f => f.source).join(' '), l.principale, l.statutResultant, l.passeDeActiveAFerme ? 'oui' : '', l.reinscriteApresDesabonnement ? 'oui' : ''].map(q).join(',')));
  writeFileSync(join(SORTIE, 'doublons.csv'), csv.join('\n'));
  console.error(`\nRapport écrit dans ${SORTIE} (doublons.json, doublons.csv)`);
}

if (!APPLIQUER) {
  console.error(`\n[à blanc] Rien n'a été écrit. Pour appliquer : node scripts/newsletter/fusionner-doublons.mjs --appliquer`);
  process.exit(0);
}
if (!plan.length) { console.error('Rien à fusionner.'); process.exit(0); }

// ── 5. Appliquer ────────────────────────────────────────────────────────────
// Pas pendant un envoi : sendNewsletter tient sa liste en mémoire et marque
// ses envois par identifiant de fiche.
const enCours = await fs('POST', ':runQuery', { structuredQuery: {
  from: [{ collectionId: 'newsletters' }],
  where: { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: chaine('sending') } }, limit: 1 } });
if (enCours.some(r => r.document)) { console.error('Une infolettre est en cours d\'envoi : on attend qu\'elle finisse.'); process.exit(1); }

// Sauvegarde complète des fiches touchées, AVANT toute écriture.
mkdirSync(DOSSIER_SAUVEGARDE, { recursive: true });
const touchees = plan.flatMap(p => [p.principale, ...p.autres]);
const fichier = join(DOSSIER_SAUVEGARDE, `fusion-doublons-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
writeFileSync(fichier, JSON.stringify(touchees.map(f => ({ name: f.nom, updateTime: f.updateTime, createTime: f.createTime, fields: f.brut })), null, 1));
console.error(`\nSauvegarde : ${fichier} (${touchees.length} fiches)`);

const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
const reponse = await rl.question(`Taper FUSIONNER ${plan.length} pour marquer ${secondaires} fiches « doublon » et mettre à jour ${plan.length} fiches principales : `);
rl.close();
if (reponse.trim() !== `FUSIONNER ${plan.length}`) { console.error('Annulé. Rien n\'a été écrit.'); process.exit(1); }

const maintenant = new Date().toISOString();
const ecritures = [];
for (const p of plan) {
  const champs = { ...p.champs, fusionneDe: { arrayValue: { values: p.autres.map(f => chaine(f.id)) } }, fusionneLe: horo(maintenant) };
  ecritures.push({ update: { name: p.principale.nom, fields: champs }, updateMask: { fieldPaths: Object.keys(champs) }, currentDocument: { updateTime: p.principale.updateTime } });
  for (const f of p.autres) {
    ecritures.push({
      update: { name: f.nom, fields: { status: chaine('doublon'), fusionneDans: chaine(p.principale.id), statusAvantFusion: chaine(statut(f)), fusionneLe: horo(maintenant) } },
      updateMask: { fieldPaths: ['status', 'fusionneDans', 'statusAvantFusion', 'fusionneLe'] },
      // Une fiche modifiée depuis la lecture fait échouer son lot : on relance à blanc.
      currentDocument: { updateTime: f.updateTime },
    });
  }
}
let faites = 0;
for (let i = 0; i < ecritures.length; i += PAR_LOT) {
  const lot = ecritures.slice(i, i + PAR_LOT);
  try { await fs('POST', ':commit', { writes: lot }); }
  catch (e) {
    console.error(`\nLot ${i / PAR_LOT + 1} refusé (${e.message}). ${faites} écritures déjà faites; la sauvegarde est intacte. Relancer à blanc pour voir ce qui reste.`);
    process.exit(1);
  }
  faites += lot.length;
  process.stderr.write(`\r  ${faites}/${ecritures.length} écritures`);
}
console.error(`\nFusion faite : ${plan.length} fiches principales mises à jour, ${secondaires} fiches marquées « doublon ». Aucune fiche effacée.`);
