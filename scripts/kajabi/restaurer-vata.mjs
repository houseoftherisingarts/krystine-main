#!/usr/bin/env node
// Rattrapage du 2 oct. 2026 (décision de Krystine) : les anciennes clientes
// de VATA qui ont DÉJÀ un compte sur le site retrouvent leur formation sans
// code, comme le fera kajabiRestaurerAuto (functions/src/kajabi.ts) à leur
// prochaine connexion. Seulement les comptes dont l'adresse est vérifiée dans
// Firebase Auth : les autres la confirmeront par le lien de « Mes formations ». Même preuve d'achat (source kajabi : tout le cours
// ouvert, sans goutte-à-goutte), même marque « restaure » au registre.
//
// Idempotent : un achat déjà « restaure » est sauté, et une preuve qui existe
// déjà (achat fait sur le site, code déjà utilisé) n'est jamais écrasée
// (précondition exists:false); le registre est alors seulement marqué.
//
//   node scripts/kajabi/restaurer-vata.mjs            essai à blanc
//   node scripts/kajabi/restaurer-vata.mjs --ecrire   écrit les preuves
//   ... --lister                                       liste les comptes à l'adresse non vérifiée
//
// Jeton : FIRESTORE_TOKEN, sinon celui de firebase-tools.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';

const PROJET = 'krystinestlaurent-87566';
const RACINE = `projects/${PROJET}/databases/(default)/documents`;
const BASE = `https://firestore.googleapis.com/v1/${RACINE}`;
const ECRIRE = process.argv.includes('--ecrire');
const FORMATIONS = ['kajabi-2148687644', 'kajabi-2148727800', 'kajabi-2148727800-bonis']; // = FORMATIONS_RESTAURATION_AUTO (functions/src/kajabi.ts)

const tok = process.env.FIRESTORE_TOKEN
  || JSON.parse(readFileSync(`${homedir()}/.config/configstore/firebase-tools.json`, 'utf8')).tokens.access_token;
const appel = async (url, method = 'GET', body) => {
  const r = await fetch(url, { method, headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json();
  if (d.error) throw Object.assign(new Error(JSON.stringify(d.error).slice(0, 300)), { statut: d.error.status });
  return d;
};
const tout = async (chemin, masque) => {
  const out = []; let page = '';
  do {
    const d = await appel(`${BASE}/${chemin}?pageSize=1000${masque.map(m => `&mask.fieldPaths=${m}`).join('')}${page ? `&pageToken=${page}` : ''}`);
    out.push(...(d.documents || [])); page = d.nextPageToken || '';
  } while (page);
  return out;
};
const s = (f) => f?.stringValue ?? '';
const id = (d) => d.name.split('/').pop();

// 1. Les offres reliées aux formations couvertes, et leurs achats à restaurer.
const offres = new Map();
for (const o of await tout('kajabiOffres', ['formationIds'])) {
  const fids = (o.fields?.formationIds?.arrayValue?.values || []).map(v => v.stringValue).filter(f => FORMATIONS.includes(f));
  if (fids.length) offres.set(id(o), fids);
}
const parEmail = new Map(); // email → Map(formation → { ids, offres })
for (const d of await tout('kajabiRegistre', ['emailNormalise', 'kjbOfferId', 'statut', 'restaurePar'])) {
  const statut = s(d.fields?.statut);
  if ((statut !== 'a_restaurer' && statut !== 'code_envoye') || s(d.fields?.restaurePar)) continue;
  const offre = s(d.fields?.kjbOfferId); const email = s(d.fields?.emailNormalise).trim().toLowerCase();
  if (!email || !offres.has(offre)) continue;
  const m = parEmail.get(email) || new Map();
  for (const f of offres.get(offre)) {
    const e = m.get(f) || { ids: [], offres: new Set() };
    e.ids.push(id(d)); e.offres.add(offre); m.set(f, e);
  }
  parEmail.set(email, m);
}

// 2. Adresse → compte de connexion (Auth), avec l'état de vérification. Une
//    fiche members sans compte Auth à cette adresse ne peut pas être vérifiée.
const uidDe = new Map();
const verifiee = new Set();
const emails = [...parEmail.keys()];
for (let i = 0; i < emails.length; i += 100) {
  const r = await appel(`https://identitytoolkit.googleapis.com/v1/projects/${PROJET}/accounts:lookup`, 'POST', { email: emails.slice(i, i + 100) });
  for (const u of r.users || []) if (u.email) { uidDe.set(u.email.toLowerCase(), u.localId); if (u.emailVerified) verifiee.add(u.email.toLowerCase()); }
}
for (const m of await tout('members', ['email'])) {
  const e = s(m.fields?.email).trim().toLowerCase();
  if (e && parEmail.has(e) && !uidDe.has(e)) uidDe.set(e, id(m));
}

// 3. Les titres des formations.
const titres = new Map();
for (const f of FORMATIONS) {
  const d = await appel(`${BASE}/formations/${f}`).catch(() => null);
  titres.set(f, { titre: s(d?.fields?.titre) || f, imageUrl: s(d?.fields?.imageUrl) });
}

const st = (v) => ({ stringValue: String(v) });
let recues = 0, dejaPossedee = 0;
const sansCompte = emails.filter(e => !uidDe.has(e)).length;
const nonVerifiees = emails.filter(e => uidDe.has(e) && !verifiee.has(e)).length;
for (const [email, formations] of parEmail) {
  const uid = uidDe.get(email);
  if (!uid || !verifiee.has(email)) continue;
  for (const [f, info] of formations) {
    const t = titres.get(f);
    const marquer = info.ids.map(rid => ({
      update: { name: `${RACINE}/kajabiRegistre/${rid}`, fields: { statut: st('restaure'), uid: st(uid), restaurePar: st(uid), restaurationAuto: { booleanValue: true } } },
      updateMask: { fieldPaths: ['statut', 'uid', 'restaurePar', 'restaurationAuto'] },
      updateTransforms: [{ fieldPath: 'restaureLe', setToServerValue: 'REQUEST_TIME' }],
    }));
    const membre = {
      transform: { document: `${RACINE}/members/${uid}`, fieldTransforms: [{ fieldPath: 'kajabiEmails', appendMissingElements: { values: [st(email)] } }] },
    };
    const preuve = {
      update: { name: `${RACINE}/achatsFormations/${uid}/formations/${f}`, fields: {
        titre: st(t.titre), imageUrl: st(t.imageUrl), montant: { integerValue: '0' }, source: st('kajabi'),
        kjbOfferIds: { arrayValue: { values: [...info.offres].map(st) } }, restaurationAuto: { booleanValue: true },
      } },
      updateTransforms: [{ fieldPath: 'acheteLe', setToServerValue: 'REQUEST_TIME' }],
      currentDocument: { exists: false },
    };
    if (!ECRIRE) {
      const existe = await appel(`${BASE}/achatsFormations/${uid}/formations/${f}`).then(() => true).catch(() => false);
      existe ? dejaPossedee++ : recues++;
      continue;
    }
    try {
      await appel(`${BASE}:commit`, 'POST', { writes: [preuve, ...marquer, membre] });
      recues++;
    } catch (e) {
      if (e.statut !== 'FAILED_PRECONDITION') throw e;
      // La preuve existe déjà : on la laisse telle quelle et on marque le registre.
      await appel(`${BASE}:commit`, 'POST', { writes: [...marquer, membre] });
      dejaPossedee++;
    }
  }
}
console.log(`${parEmail.size} adresses avec un achat à restaurer (${FORMATIONS.join(', ')})`);
console.log(`${recues} comptes ${ECRIRE ? 'ont reçu' : 'recevraient'} l'accès; ${dejaPossedee} possédaient déjà la formation (preuve laissée intacte); ${nonVerifiees} comptes à l'adresse non vérifiée (rien d'ouvert); ${sansCompte} adresses sans compte encore`);
if (process.argv.includes('--lister')) for (const e of emails.filter(e => uidDe.has(e) && !verifiee.has(e))) console.log(`non vérifiée : ${e}`);
if (!ECRIRE) console.log('Essai à blanc. Relancer avec --ecrire pour écrire.');
