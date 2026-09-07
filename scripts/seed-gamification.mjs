// Amorce settings/gamification à l'état voulu par Alex (7 septembre 2026) :
// niskas payantes, coffres et badges fermés; le reste ouvert; badge bleu
// réservé à l'équipe. Amorce aussi settings/skins pour que seules les cinq
// skins de base (Medzo Café, Nuit, Dark Coffee, Aube rose, Terre cuite)
// restent en circulation, les treize autres fermées (une membre qui les a
// déjà les garde). Même patron que scripts/seed-sondages.mjs : REST
// Firestore avec un jeton gcloud.
//   node scripts/seed-gamification.mjs
import { execSync } from 'node:child_process';

const PROJET = 'krystinestlaurent-87566';
const gtoken = execSync('gcloud auth print-access-token').toString().trim();

function wrap(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(wrap) } };
  if (typeof v === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, vv]) => [k, wrap(vv)])) } };
  throw new Error(`type non géré: ${typeof v}`);
}

async function fsdoc(path, obj) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents/${path}`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: wrap(obj).mapValue.fields }),
  });
  if (!r.ok) { console.error('firestore', path, r.status, await r.text()); process.exitCode = 1; return; }
  console.log('écrit', path);
}

await fsdoc('settings/gamification', {
  acheterNiskas: false,
  coffres: false,
  badges: false,
  roueQuotidienne: true,
  roueFoyer: true,
  recompenses: true,
  parrainage: true,
  coffreBeta: true,
  panneauJouer: true,
  petiteBoutique: true,
  badgeBleuEquipeSeulement: true,
  updatedAt: new Date(),
  updatedBy: 'seed-script',
});

// Les treize skins fermées : tout SKINS de src/lib/pointsConfig.ts sauf les
// cinq de base (medzo, nuit, coffee, aube, terre) et le skin exclusif
// « verifie » (réservé au Badge Bleu, jamais dans ce mécanisme).
const FERMEES = [
  'foret', 'ocean', 'encre',
  'lotus', 'feminite', 'teal-orange', 'nature', 'aurore', 'or-pur', 'golden-hour',
  'vata', 'pitta', 'kapha',
];
await fsdoc('settings/skins', Object.fromEntries(FERMEES.map((cle) => [`skin-${cle}`, { enTravail: true }])));
