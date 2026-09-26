// Crée les trois gabarits de la famille de lettres (Krystine, 26 septembre 2026) :
// même squelette (en-tête écrit, devise, signature, pied), et chaque lettre se
// reconnaît à son titre, son image de droite et la couleur de son bandeau.
//   node scripts/newsletter/creer-gabarits-famille.mjs <fichier-jeton>
// Un gabarit du même nom est mis à jour plutôt que dédoublé.
import { readFileSync } from 'fs';
const tok = readFileSync(process.argv[2], 'utf8').trim();
const H = { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' };
const BASE = 'https://firestore.googleapis.com/v1/projects/krystinestlaurent-87566/databases/(default)/documents';
const ORIGINE = 'https://www.krystinestlaurent.ca/infolettre/entete-origine.jpg';

const bonjour = [{ type: 'paragraph', content: { text: 'Bonjour {{firstName}},' } }];
const GABARITS = [
  { nom: 'La Lettre de Krystine', categorie: 'Krystine St-Laurent', audience: { mode: 'all' },
    entete: { titre: 'La Lettre de Krystine', sousTitre: 'Relier ce que nous avons appris à séparer.' }, bandeau: {} },
  { nom: 'Expérience Origine · Groupe fondateur', categorie: 'Expérience Origine', audience: { mode: 'tags', tags: ['origine-fondatrice'] },
    entete: { titre: 'Expérience Origine', sousTitre: 'Groupe fondateur', image: ORIGINE },
    bandeau: { fond: '#28352F', texte: '#EEE7DB', etiquette: 'Groupe fondateur' } },
  { nom: 'Expérience Origine · Deuxième cohorte', categorie: 'Expérience Origine', audience: { mode: 'tags', tags: ['origine-2'] },
    entete: { titre: 'Expérience Origine', sousTitre: 'Deuxième cohorte', image: ORIGINE },
    bandeau: { fond: '#4a0a1c', texte: '#EEE7DB', etiquette: 'Deuxième cohorte' } },
];

const v = x => x === null || x === undefined ? { nullValue: null }
  : typeof x === 'string' ? { stringValue: x } : typeof x === 'boolean' ? { booleanValue: x }
  : typeof x === 'number' ? { integerValue: String(x) }
  : Array.isArray(x) ? { arrayValue: { values: x.map(v) } }
  : { mapValue: { fields: Object.fromEntries(Object.entries(x).map(([k, y]) => [k, v(y)])) } };

const existants = await (await fetch(`${BASE}/newsletterGabarits?pageSize=300&mask.fieldPaths=nom`, { headers: H })).json();
const parNom = Object.fromEntries((existants.documents || []).map(d => [d.fields.nom?.stringValue, d.name]));
const maintenant = { timestampValue: new Date().toISOString() };
for (const g of GABARITS) {
  const data = { nom: g.nom, categorie: g.categorie, title: g.nom, subject: '', preheader: '', fromName: 'Krystine St-Laurent',
    blocks: bonjour, audience: g.audience, couverture: 'titre', couvertureUrl: null, entete: g.entete, signature: true,
    lang: 'fr', bandeau: g.bandeau, fond: null, lettreDor: null };
  const fields = { ...Object.fromEntries(Object.entries(data).map(([k, y]) => [k, v(y)])), updatedAt: maintenant };
  const chemin = parNom[g.nom];
  const r = chemin
    ? await fetch(`https://firestore.googleapis.com/v1/${chemin}?${Object.keys(fields).map(k => `updateMask.fieldPaths=${k}`).join('&')}`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields }) })
    : await fetch(`${BASE}/newsletterGabarits`, { method: 'POST', headers: H, body: JSON.stringify({ fields: { ...fields, createdAt: maintenant } }) });
  if (!r.ok) throw new Error(`${g.nom} : ${r.status} ${await r.text()}`);
  console.log(chemin ? '↻' : '✓', g.nom);
}
