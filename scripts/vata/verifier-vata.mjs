#!/usr/bin/env node
// La double vérification des accès VATA (demande de Krystine, 7 oct. 2026) :
// « Il faut que les gens qui ont Vata dans Kajabi soient associés, sans erreurs. »
// LECTURE SEULE : rien n'est écrit dans Firestore ni dans Firebase Auth.
//
// Les deux offres VATA de l'ancien site (Kajabi) et ce qu'elles ouvrent sur le site :
//   essentiel  « Expérience Ayurveda : saison VATA (froide et sèche) » (Vata autonome,
//              offre 2148658182 et forfaits 2022 « Pitta et Vata ») → kajabi-2148687644
//              (L'Expérience Ayurveda · VATA Essentiel)
//   guide      « ABONDANCE ET TRANSFORMATION PROFONDE AVEC L'AYURVEDA, saison VATA,
//              Cohorte automne 2024 » (Vata guidé, l'expérience enrichie, produit 2148727800)
//              → kajabi-2148727800 + kajabi-2148727800-bonis
//
// Contrôle 1, côté données : la liste de référence (exports Kajabi « product_progress »
// + registre kajabiRegistre) est confrontée aux comptes (Auth, members) et aux accès
// (achatsFormations), dans les deux sens.
// Contrôle 2, côté code : la table offre → formations, la liste
// FORMATIONS_RESTAURATION_AUTO de functions/src/kajabi.ts, la normalisation des adresses.
//
//   node scripts/vata/verifier-vata.mjs
//   node scripts/vata/verifier-vata.mjs --autonome=<export.csv> --guide=<export.csv> --sortie=<dossier>
//
// À relancer chaque lundi et après chaque import au registre. Sortie : vata-verification.csv
// et resume.txt dans le dossier de sortie (par défaut un dossier temporaire, jamais le dépôt :
// le CSV contient des adresses de clientes).
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJET = 'krystinestlaurent-87566';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents`;
const DEPOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (nom, defaut) => (process.argv.find(a => a.startsWith(`--${nom}=`)) || '').split('=').slice(1).join('=') || defaut;
const AUJOURDHUI = new Date().toISOString().slice(0, 10);
const SORTIE = arg('sortie', join(tmpdir(), 'verifier-vata', AUJOURDHUI));

const VERSIONS = {
  essentiel: { nom: 'VATA Essentiel (Vata autonome)', formations: ['kajabi-2148687644'], export: arg('autonome', join(homedir(), 'Downloads', 'product_progress (24).csv')) },
  guide: { nom: 'Vata guidé, Abondance et Transformation Profonde (cohorte automne 2024)', formations: ['kajabi-2148727800', 'kajabi-2148727800-bonis'], export: arg('guide', join(homedir(), 'Downloads', 'product_progress (25).csv')) },
};
const FORMATIONS_VATA = new Set([...VERSIONS.essentiel.formations, ...VERSIONS.guide.formations, 'kajabi-2148740714']);
const EQUIPE = new Set(['admin@krystinestlaurent.ca', 'krystine@inspiratanature.com', 'equipe@inspiratanature.com', 'alex@lesalondesinconnus.com',
  'krystinestlaurent@gmail.com', 'houseoftherisingarts@gmail.com', 'krystinestterredhysope@gmail.com']);
const estEquipe = (e) => EQUIPE.has(e) || EQUIPE.has(e.replace(/\+[^@]*@/, '@'));

// ── Accès en lecture ────────────────────────────────────────────────────────
async function jeton() {
  if (process.env.FIRESTORE_TOKEN) return process.env.FIRESTORE_TOKEN;
  try { return execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { /* pas de gcloud */ }
  const candidats = [join(homedir(), '.iris/tools/node_modules/firebase-tools/lib/auth.js')];
  try { candidats.unshift(execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim() + '/firebase-tools/lib/auth.js'); } catch { /* rien */ }
  const chemin = candidats.find(existsSync);
  const conf = join(homedir(), '.config/configstore/firebase-tools.json');
  if (!chemin || !existsSync(conf)) throw new Error('Ni gcloud ni « firebase login » sur cet ordinateur.');
  const t = await createRequire(import.meta.url)(chemin).getAccessToken(JSON.parse(readFileSync(conf, 'utf8')).tokens.refresh_token, []);
  return t.access_token || t;
}
const T = await jeton();
async function appel(url, corps) {
  const r = await fetch(url.startsWith('http') ? url : `${BASE}/${url}`, {
    method: corps ? 'POST' : 'GET', headers: { Authorization: `Bearer ${T}`, 'Content-Type': 'application/json' }, body: corps ? JSON.stringify(corps) : undefined,
  });
  const d = await r.json();
  if (d.error) throw new Error(JSON.stringify(d.error).slice(0, 300));
  return d;
}
const val = (x) => x == null ? null : 'stringValue' in x ? x.stringValue : 'integerValue' in x ? +x.integerValue : 'doubleValue' in x ? x.doubleValue
  : 'booleanValue' in x ? x.booleanValue : 'timestampValue' in x ? x.timestampValue : 'arrayValue' in x ? (x.arrayValue.values || []).map(val)
  : 'mapValue' in x ? Object.fromEntries(Object.entries(x.mapValue.fields || {}).map(([k, y]) => [k, val(y)])) : null;
const plat = (d) => ({ _id: d.name.split('/').pop(), _chemin: d.name.split('/documents/')[1], ...Object.fromEntries(Object.entries(d.fields || {}).map(([k, y]) => [k, val(y)])) });
async function tout(collection) {
  const out = []; let page = '';
  do { const d = await appel(`${collection}?pageSize=1000${page ? `&pageToken=${page}` : ''}`); out.push(...(d.documents || []).map(plat)); page = d.nextPageToken || ''; } while (page);
  return out;
}
async function groupe(collectionId) {
  const out = []; let apres = null;
  for (;;) {
    const r = await appel(`${BASE}:runQuery`, { structuredQuery: { from: [{ collectionId, allDescendants: true }], orderBy: [{ field: { fieldPath: '__name__' } }], limit: 1000,
      ...(apres ? { startAt: { values: [{ referenceValue: apres }], before: false } } : {}) } });
    const docs = r.filter(x => x.document).map(x => x.document);
    out.push(...docs.map(plat));
    if (docs.length < 1000) return out;
    apres = docs.at(-1).name;
  }
}
async function comptesAuth(cle, valeurs) {
  const out = [];
  for (let i = 0; i < valeurs.length; i += 100) {
    const r = await appel(`https://identitytoolkit.googleapis.com/v1/projects/${PROJET}/accounts:lookup`, { [cle]: valeurs.slice(i, i + 100) });
    out.push(...(r.users || []));
  }
  return out;
}
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
  return corps.map(l => Object.fromEntries(tete.map((h, i) => [h.trim().toLowerCase(), (l[i] || '').trim()])));
}
const normaliser = (e) => String(e || '').trim().toLowerCase();
const normNom = (n) => String(n || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
const gmail = (e) => { const [u, d] = e.split('@'); return /^(gmail|googlemail)\.com$/.test(d || '') ? `${u.split('+')[0].replace(/\./g, '')}@gmail.com` : e.replace(/\+[^@]*@/, '@'); };

// ── 1. La liste de référence : exports Kajabi + registre ───────────────────
const ref = new Map(); // email → { noms:Set, versions: Map(version → { export, registre:[], date }) }
const entree = (email) => ref.get(email) || (ref.set(email, { noms: new Set(), versions: new Map() }), ref.get(email));
const versionDe = (email, v) => { const e = entree(email); return e.versions.get(v) || (e.versions.set(v, { export: false, registre: [], date: '' }), e.versions.get(v)); };
const avis = []; // les constats du contrôle du code et des données de base
for (const [v, conf] of Object.entries(VERSIONS)) {
  if (!existsSync(conf.export)) { avis.push(`⚠️ Export Kajabi introuvable pour ${conf.nom} : ${conf.export} (passez --${v === 'guide' ? 'guide' : 'autonome'}=<fichier>). Contrôle fait sur le registre seul.`); continue; }
  for (const l of lireCsv(conf.export)) {
    const email = normaliser(l.email);
    if (!email.includes('@') || estEquipe(email)) continue;
    const x = versionDe(email, v); x.export = true; x.date ||= l['start date'] || '';
    if (l.name) entree(email).noms.add(l.name.replace(/\s+/g, ' ').trim());
  }
}
const offres = new Map((await tout('kajabiOffres')).map(o => [o._id, o]));
const versionOffre = (id) => {
  const o = offres.get(id); if (!o) return null;
  const f = o.formationIds || [];
  if (f.some(x => VERSIONS.guide.formations.includes(x))) return 'guide';
  if (f.some(x => VERSIONS.essentiel.formations.includes(x))) return 'essentiel';
  if (/\bVATA\b/i.test(o.titre || '')) return 'forfait';
  return null;
};
const registre = await tout('kajabiRegistre');
let forfaitsSeuls = 0;
for (const r of registre) {
  const v = versionOffre(r.kjbOfferId); if (!v) continue;
  const email = normaliser(r.emailNormalise);
  if (!email || estEquipe(email)) continue;
  if (r.emailNormalise !== email) avis.push(`⚠️ Registre ${r._id} : adresse non normalisée « ${r.emailNormalise} » (la restauration ne la trouvera pas).`);
  // Un forfait 2022 « Pitta et Vata » donne VATA Essentiel, mais son offre n'est reliée à rien.
  const x = versionDe(email, v === 'forfait' ? 'essentiel' : v);
  x.registre.push({ ...r, forfait: v === 'forfait' }); x.date ||= String(r.acheteLe || '').slice(0, 10);
  if (r.nom) entree(email).noms.add(r.nom);
}
for (const [email, e] of ref) {
  const x = e.versions.get('essentiel');
  if (x && x.registre.length && x.registre.every(r => r.forfait) && !x.export) forfaitsSeuls++, x.forfaitSeul = true;
  if (!e.versions.size) ref.delete(email);
}

// ── 2. Le code : ce que la restauration automatique fera vraiment ──────────
const source = readFileSync(join(DEPOT, 'functions/src/kajabi.ts'), 'utf8');
const AUTO = JSON.parse((/FORMATIONS_RESTAURATION_AUTO\s*=\s*(\[[^\]]*\])/.exec(source)?.[1] || '[]').replace(/'/g, '"'));
const RESTAURABLE = JSON.parse((/const RESTAURABLE\s*=\s*(\[[^\]]*\])/.exec(source)?.[1] || '[]').replace(/'/g, '"'));
if (!/trim\(\)\.toLowerCase\(\)/.test(/const normaliser[^\n]*/.exec(source)?.[0] || '')) avis.push('❌ Code : normaliser() de kajabi.ts ne fait plus trim().toLowerCase().');
for (const [v, conf] of Object.entries(VERSIONS)) {
  const manque = conf.formations.filter(f => !AUTO.includes(f));
  avis.push(manque.length ? `❌ Code : ${conf.nom} → ${manque.join(', ')} absent de FORMATIONS_RESTAURATION_AUTO : ces acheteuses ne reçoivent RIEN à la connexion.`
    : `✅ Code : ${conf.nom} → ${conf.formations.join(' + ')} couvert par la restauration automatique.`);
}
const backfill = join(DEPOT, 'scripts/kajabi/restaurer-vata.mjs');
if (existsSync(backfill)) {
  const fb = JSON.parse((/const FORMATIONS\s*=\s*(\[[^\]]*\])/.exec(readFileSync(backfill, 'utf8'))?.[1] || '[]').replace(/'/g, '"'));
  if (fb.sort().join() !== [...AUTO].sort().join()) avis.push(`⚠️ Code : scripts/kajabi/restaurer-vata.mjs (rattrapage) couvre ${fb.join(', ')} mais la fonction couvre ${AUTO.join(', ')}.`);
}
for (const [id, o] of offres) if (versionOffre(id) === 'forfait') avis.push(`⚠️ Offre ${id} « ${o.titre} » contient VATA mais n'est reliée à aucune formation (${registre.filter(r => r.kjbOfferId === id).length} entrées au registre).`);
for (const f of FORMATIONS_VATA) { const d = await appel(`formations/${f}`).catch(() => null); if (!d) avis.push(`❌ La formation ${f} n'existe pas sur le site.`); }

// ── 3. Les comptes et les accès du site ─────────────────────────────────────
const membres = await tout('members');
const parEmail = new Map(); // email → Set(uid), par members.email, members.kajabiEmails et Auth
const ajoute = (e, uid) => { e = normaliser(e); if (!e) return; (parEmail.get(e) || parEmail.set(e, new Set()).get(e)).add(uid); };
for (const m of membres) { ajoute(m.email, m._id); for (const k of m.kajabiEmails || []) ajoute(k, m._id); }
const auth = new Map(); // uid → { email, verifiee }
for (const u of await comptesAuth('email', [...ref.keys()])) { auth.set(u.localId, { email: normaliser(u.email), verifiee: !!u.emailVerified }); ajoute(u.email, u.localId); }
const acces = (await groupe('formations')).filter(d => d._chemin.startsWith('achatsFormations/') && FORMATIONS_VATA.has(d._id));
const accesDe = new Map(); // uid → Map(formation → doc)
for (const a of acces) { const uid = a._chemin.split('/')[1]; (accesDe.get(uid) || accesDe.set(uid, new Map()).get(uid)).set(a._id, a); }
const inconnus = [...accesDe.keys()].filter(u => !auth.has(u));
for (const u of await comptesAuth('localId', inconnus)) { auth.set(u.localId, { email: normaliser(u.email), verifiee: !!u.emailVerified }); ajoute(u.email, u.localId); }
const membreDe = new Map(membres.map(m => [m._id, m]));
const parNom = new Map(); // nom normalisé → Set(uid), pour les adresses différentes
for (const m of membres) { const n = normNom(m.displayName || m.nom || ''); if (n.includes(' ')) (parNom.get(n) || parNom.set(n, new Set()).get(n)).add(m._id); }
const parGmail = new Map();
for (const [e, uids] of parEmail) { const s = parGmail.get(gmail(e)) || parGmail.set(gmail(e), new Set()).get(gmail(e)); for (const u of uids) s.add(u); }

// ── 4. Contrôle aller : chaque acheteuse de référence ───────────────────────
const lignes = [];
const ligne = (o) => lignes.push({ categorie: '', version: '', nom: '', email: '', date: '', comptes: '', accesActuels: '', preuve: '', raison: '', action: '', ...o });
const titreF = (f) => f.replace('kajabi-2148687644', 'VATA Essentiel').replace('kajabi-2148727800-bonis', 'Vata guidé (bonis)').replace('kajabi-2148727800', 'Vata guidé').replace('kajabi-2148740714', 'Cercle Vata');
for (const [email, e] of [...ref].sort()) {
  const uids = [...(parEmail.get(email) || [])];
  for (const [v, x] of e.versions) {
    const attendu = VERSIONS[v].formations;
    const preuve = [x.export ? 'export Kajabi' : '', ...new Set(x.registre.map(r => r.forfait ? `registre (forfait ${r.kjbOfferId})` : `registre (${r.source || 'stripe'})`))].filter(Boolean).join(' + ');
    const base = { version: VERSIONS[v].nom, nom: [...e.noms][0] || '', email, date: x.date, comptes: uids.join(' '), preuve,
      accesActuels: uids.map(u => [...(accesDe.get(u)?.keys() || [])].map(titreF).join('+')).filter(Boolean).join(' | ') };
    const restaurables = x.registre.filter(r => RESTAURABLE.includes(r.statut) && !r.restaurePar && !r.forfait);
    const couvert = attendu.every(f => AUTO.includes(f));
    const pris = x.registre.filter(r => r.restaurePar && !uids.includes(r.restaurePar));
    const complet = uids.find(u => attendu.every(f => accesDe.get(u)?.has(f)));
    const partiel = uids.find(u => attendu.some(f => accesDe.get(u)?.has(f)));
    if (x.export && !x.registre.length) avis.push(`⚠️ ${email} (${VERSIONS[v].nom}) est dans l'export Kajabi mais absente du registre.`);
    if (complet) { ligne({ ...base, categorie: '✅ associée' }); }
    else if (partiel) {
      const manque = attendu.filter(f => !accesDe.get(partiel).has(f));
      ligne({ ...base, categorie: '⚠️ accès partiel', raison: `manque ${manque.map(titreF).join(', ')}`, action: `ouvrir ${manque.join(', ')} au compte ${partiel}` });
    } else if (uids.length) {
      const a = auth.get(uids.find(u => auth.has(u)) || '');
      // Mauvaise version : un accès VATA que ses achats ne justifient pas.
      const droits = new Set([...e.versions.keys()].flatMap(w => VERSIONS[w].formations));
      const autreVersion = uids.some(u => [...(accesDe.get(u)?.keys() || [])].some(f => !droits.has(f)));
      const freins = [
        !couvert && `${attendu.map(titreF).join(' + ')} hors de la restauration automatique`,
        pris.length && `registre déjà restauré pour un autre compte (${pris.map(r => r.restaurePar).join(', ')})`,
        !restaurables.length && !pris.length && (x.registre.some(r => r.forfait) ? 'seulement un forfait Pitta et Vata, offre non reliée' : 'aucune entrée restaurable au registre'),
        a && !a.verifiee && 'adresse du compte jamais confirmée (la restauration refuse)',
        !a && 'fiche members sans compte de connexion à cette adresse',
      ].filter(Boolean);
      const raison = freins.join('; ') || 'adresse confirmée, rien ne bloque : se fera à sa prochaine connexion';
      ligne({ ...base, categorie: autreVersion ? '⚠️ mauvaise version' : '❌ compte sans accès', raison,
        action: `ouvrir ${attendu.join(' + ')} au compte ${uids.join(' ou ')}${a && !a.verifiee ? ' (après confirmation de l\'adresse)' : ''}` });
    } else {
      const ok = couvert && restaurables.length && !pris.length;
      const pistes = [...new Set([...(parGmail.get(gmail(email)) || []), ...[...e.noms].flatMap(n => [...(parNom.get(normNom(n)) || [])])])];
      ligne({ ...base, categorie: ok ? '⏳ sans compte (accès à la connexion)' : '⏳⚠️ sans compte, ne recevra rien seule',
        raison: ok ? 'entrée restaurable au registre : accès à sa première connexion, une fois l\'adresse confirmée (Google le fait seul; compte à mot de passe : lien à cliquer)' : !couvert ? `${attendu.map(titreF).join(' + ')} hors de la restauration automatique`
          : pris.length ? 'registre déjà restauré pour un autre compte' : 'aucune entrée restaurable au registre',
        comptes: pistes.length ? `piste : ${pistes.map(u => `${u} (${normaliser(membreDe.get(u)?.email) || auth.get(u)?.email || "?"})`).join(" ")}` : "",
        action: pistes.length ? `vérifier si le compte ${pistes.join(' ou ')} est la même personne (adresse différente)` : ok ? '' : 'corriger le registre ou la restauration (voir résumé)' });
    }
  }
}

// ── 5. Contrôle retour : chaque accès VATA du site a-t-il sa preuve ? ───────
const refVersionsDe = (emails) => new Set(emails.flatMap(e => [...(ref.get(e)?.versions.keys() || [])]));
for (const [uid, fs] of accesDe) {
  const m = membreDe.get(uid) || {};
  const emails = [...new Set([auth.get(uid)?.email, normaliser(m.email), ...(m.kajabiEmails || []).map(normaliser)].filter(Boolean))];
  const versions = refVersionsDe(emails);
  for (const [f, a] of fs) {
    const vAttendue = Object.entries(VERSIONS).find(([, c]) => c.formations.includes(f))?.[0];
    const base = { version: titreF(f), nom: m.displayName || '', email: emails.join(' '), comptes: uid, accesActuels: titreF(f), date: String(a.acheteLe || a.accordeLe || '').slice(0, 10) };
    let preuve = '', categorie = '';
    if (a.sessionId) preuve = 'achat sur le site (Stripe)';
    else if (/^cadeau/.test(a.source || '')) preuve = `cadeau (${a.source})`;
    else if (a.test || /essai|test/.test(a.source || '')) preuve = 'essai interne';
    else if (emails.some(estEquipe)) preuve = 'compte de l\'équipe';
    else if (a.source === 'admin') preuve = 'accordé à la main dans l\'admin';
    if (vAttendue && versions.has(vAttendue)) preuve = [preuve, `acheteuse Kajabi (${VERSIONS[vAttendue].nom})`].filter(Boolean).join(' + ');
    if (!preuve) {
      categorie = versions.size ? '⚠️ mauvaise version' : '⚠️ accès sans preuve d\'achat';
      ligne({ ...base, categorie, preuve: versions.size ? `achat Kajabi de ${[...versions].map(v => VERSIONS[v].nom).join(', ')}` : '',
        raison: `source « ${a.source || 'aucune'} » sans achat correspondant`, action: 'vérifier avec Krystine, retirer si aucune preuve' });
    } else if (!vAttendue || !versions.has(vAttendue)) {
      if (!/Kajabi/.test(preuve)) ligne({ ...base, categorie: 'ℹ️ accès hors Kajabi (preuve sur le site)', preuve });
    }
  }
}

// ── 6. Doublons et adresses multiples ───────────────────────────────────────
for (const [email, uids] of parEmail) if (ref.has(email) && uids.size > 1) ligne({ categorie: '⚠️ doublon', email, comptes: [...uids].join(' '), raison: 'plusieurs comptes pour une même adresse', action: 'garder un seul compte' });
const nomsRef = new Map();
for (const [email, e] of ref) for (const n of e.noms) { const k = normNom(n); if (k.includes(' ')) (nomsRef.get(k) || nomsRef.set(k, new Set()).get(k)).add(email); }
for (const [n, emails] of nomsRef) if (emails.size > 1) ligne({ categorie: '⚠️ doublon', nom: n, email: [...emails].join(' '), raison: 'même nom sous plusieurs adresses', action: 'confirmer avec Krystine que c\'est la même personne (alias au registre)' });
for (const [g, uids] of parGmail) { const es = [...parEmail].filter(([e]) => gmail(e) === g).map(([e]) => e); if (es.length > 1 && es.some(e => ref.has(e))) ligne({ categorie: '⚠️ doublon', email: es.join(' '), comptes: [...uids].join(' '), raison: 'même boîte Gmail écrite autrement (points ou +)', action: 'relier les adresses' }); }
for (const r of registre.filter(r => r.aliasDe && versionOffre(r.kjbOfferId))) ligne({ categorie: 'ℹ️ alias au registre', nom: r.nom, email: r.emailNormalise, raison: r.note || `alias de ${r.aliasDe}`, preuve: r._id });

// ── 7. Sortie ───────────────────────────────────────────────────────────────
mkdirSync(SORTIE, { recursive: true });
const cols = ['categorie', 'version', 'nom', 'email', 'date', 'comptes', 'accesActuels', 'preuve', 'raison', 'action'];
const q = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
writeFileSync(join(SORTIE, 'vata-verification.csv'), '﻿' + [cols.join(','), ...lignes.map(l => cols.map(c => q(l[c])).join(','))].join('\n'));
const compte = {}; for (const l of lignes) { const k = `${l.categorie} · ${l.version}`; compte[k] = (compte[k] || 0) + 1; }
const personnes = (v) => [...ref.values()].filter(e => e.versions.has(v)).length;
const resume = [
  `Vérification VATA du ${AUJOURDHUI} (lecture seule)`,
  `Référence : ${ref.size} adresses; ${personnes('essentiel')} pour ${VERSIONS.essentiel.nom}, ${personnes('guide')} pour ${VERSIONS.guide.nom}${forfaitsSeuls ? ` (dont ${forfaitsSeuls} connues seulement par un forfait Pitta et Vata)` : ''}.`,
  `Restauration automatique, lue dans functions/src/kajabi.ts (la fonction en ligne suit à la publication) : ${AUTO.join(', ')}.`,
  '', 'Constats sur le code et le registre :', ...[...new Set(avis)].map(a => `  ${a}`),
  '', 'Par catégorie :', ...Object.entries(compte).sort().map(([k, n]) => `  ${String(n).padStart(4)}  ${k}`),
  '', `Détail : ${join(SORTIE, 'vata-verification.csv')}`,
].join('\n');
writeFileSync(join(SORTIE, 'resume.txt'), resume + '\n');
console.log(resume);
