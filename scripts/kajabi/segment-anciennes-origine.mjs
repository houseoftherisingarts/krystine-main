#!/usr/bin/env node
// Pose l'étiquette « anciennes-origine » sur les abonnées qui ont acheté
// l'Expérience Origine dans l'ancien système, pour que Krystine puisse leur
// écrire à elles seules (case « Réactiver anciennes EO » du plan KSL Automne).
//
//   node scripts/kajabi/segment-anciennes-origine.mjs             essai à blanc
//   node scripts/kajabi/segment-anciennes-origine.mjs --ecrire    pose l'étiquette
//   node scripts/kajabi/segment-anciennes-origine.mjs --offres 2149336947,2149390102
//
// 🚨 Les trois offres par défaut sont celles que le relevé Stripe du 7 septembre
// a laissées SANS NOM (Stripe ne porte que l'identifiant Kajabi), avec des
// achats de janvier à mai 2024, ce qui correspond à la fenêtre de la cohorte
// fondatrice. Personne n'a encore confirmé dans l'admin Kajabi que ce sont bien
// les offres d'Origine : tant que Krystine ne l'a pas lu de ses yeux, ce script
// tourne à blanc, parce qu'une étiquette fausse ferait écrire « vous étiez de
// la première Origine » à quelqu'un qui n'y était pas.
import { execFileSync } from 'node:child_process';

const PROJET = 'krystinestlaurent-87566';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents`;
const ECRIRE = process.argv.includes('--ecrire');
const ETIQUETTE = 'anciennes-origine';
const i = process.argv.indexOf('--offres');
const OFFRES = i > 0 && process.argv[i + 1]
  ? process.argv[i + 1].split(',').map(s => s.trim()).filter(Boolean)
  : ['2149336947', '2149390102', '2149390163'];

const jeton = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
const entetes = { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' };
const requete = async (corps) => {
  const r = await fetch(`${BASE}:runQuery`, { method: 'POST', headers: entetes, body: JSON.stringify(corps) });
  const d = await r.json();
  if (d.error) throw new Error(JSON.stringify(d.error).slice(0, 300));
  return d.filter(x => x.document).map(x => x.document);
};
const val = (f, k) => { const v = f?.[k]; return v ? Object.values(v)[0] : undefined; };
const normaliser = e => String(e || '').trim().toLowerCase();

// 1. Les achats de ces offres dans le registre de l'ancien système.
const acheteuses = new Map();
for (const offre of OFFRES) {
  const docs = await requete({
    structuredQuery: {
      from: [{ collectionId: 'kajabiRegistre' }],
      where: { fieldFilter: { field: { fieldPath: 'kjbOfferId' }, op: 'EQUAL', value: { stringValue: offre } } },
      limit: 2000,
    },
  });
  for (const d of docs) {
    const f = d.fields;
    const courriel = normaliser(val(f, 'emailNormalise'));
    if (!courriel) continue;
    const e = acheteuses.get(courriel) || { nom: '', offres: new Set(), montant: 0 };
    e.nom = e.nom || val(f, 'nom') || '';
    e.offres.add(offre);
    e.montant += Number(val(f, 'montant') || 0);
    acheteuses.set(courriel, e);
  }
  console.log(`  offre ${offre} : ${docs.length} achat(s)`);
}
console.log(`\n${acheteuses.size} acheteuse(s) distincte(s) sur ces ${OFFRES.length} offre(s).`);

// 2. Celles qui sont dans la liste d'infolettre et qui peuvent recevoir.
const abonnees = await requete({
  structuredQuery: {
    from: [{ collectionId: 'newsletter' }],
    select: { fields: [{ fieldPath: 'email' }, { fieldPath: 'status' }, { fieldPath: 'tags' }, { fieldPath: 'firstName' }] },
    limit: 40000,
  },
});
const parCourriel = new Map();
for (const d of abonnees) {
  const f = d.fields;
  const courriel = normaliser(val(f, 'email'));
  if (!courriel) continue;
  const liste = parCourriel.get(courriel) || [];
  liste.push({
    chemin: d.name.split('/documents/')[1],
    statut: val(f, 'status') || '',
    etiquettes: (f.tags?.arrayValue?.values || []).map(v => v.stringValue),
  });
  parCourriel.set(courriel, liste);
}

const aEtiqueter = [];
let actives = 0, inactives = 0, absentes = 0, dejaFaites = 0;
for (const [courriel] of acheteuses) {
  const fiches = parCourriel.get(courriel);
  if (!fiches) { absentes++; continue; }
  for (const fiche of fiches) {
    if (fiche.etiquettes.includes(ETIQUETTE)) { dejaFaites++; continue; }
    if (fiche.statut === 'active') actives++; else inactives++;
    aEtiqueter.push({ ...fiche, courriel });
  }
}

console.log(`  dans la liste et joignables : ${actives}`);
console.log(`  dans la liste mais inactives (désabonnées ou en attente) : ${inactives}`);
console.log(`  absentes de la liste d'infolettre : ${absentes}`);
console.log(`  déjà étiquetées : ${dejaFaites}`);
console.log(`\n${aEtiqueter.length} fiche(s) à étiqueter « ${ETIQUETTE} ».`);

if (!ECRIRE) {
  console.log('\nEssai à blanc. Avant d’écrire, Krystine confirme dans son admin Kajabi que');
  console.log(`les offres ${OFFRES.join(', ')} sont bien celles de l’Expérience Origine.`);
  console.log('Ensuite : relancer avec --ecrire (ou --offres <ids> si la liste change).');
  process.exit(0);
}

// 3. L'étiquette se pose fiche par fiche, sans toucher aux autres étiquettes.
let faites = 0;
for (const fiche of aEtiqueter) {
  const tags = [...fiche.etiquettes, ETIQUETTE];
  const r = await fetch(`${BASE}/${fiche.chemin}?updateMask.fieldPaths=tags`, {
    method: 'PATCH',
    headers: entetes,
    body: JSON.stringify({ fields: { tags: { arrayValue: { values: tags.map(t => ({ stringValue: t })) } } } }),
  });
  if (r.ok) faites++;
  else console.error('refus sur', fiche.courriel, (await r.text()).slice(0, 160));
}
console.log(`\n${faites} fiche(s) étiquetée(s). La liste « ${ETIQUETTE} » est maintenant choisissable`);
console.log('dans l’audience du composeur d’infolettre.');
