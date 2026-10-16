// Affiche les leçons d'une formation (lecture seule) : node lecons-voir.mjs <formationId>
import { lireCollection, lireDoc } from './firestore-lecture.mjs';
const id = process.argv[2];
const f = await lireDoc(`formations/${id}`);
console.log(JSON.stringify(f, (k, v) => (typeof v === 'string' && v.length > 160 ? v.slice(0, 160) + '…' : v)).slice(0, 3000));
const l = await lireCollection(`formations/${id}/lecons`);
for (const x of l.sort((a, b) => (a.ordre ?? a.rang ?? 0) - (b.ordre ?? b.rang ?? 0))) console.log(JSON.stringify(x, (k, v) => (typeof v === 'string' && v.length > 200 ? v.slice(0, 200) + '…' : v)));
