// Trouve les PDF remis aux clientes : liens .pdf dans les formations publiées (lecture seule).
import { lireCollection, lireDoc } from './firestore-lecture.mjs';
const formations = await lireCollection('formations');
const pdfs = new Map();
const fouiller = (o, ou) => {
  if (typeof o === 'string') { if (/\.pdf(\?|$)|application%2Fpdf|\/o\/[^?]*pdf/i.test(o) && /^https?:|^\//.test(o)) { if (!pdfs.has(o)) pdfs.set(o, new Set()); pdfs.get(o).add(ou); } return; }
  if (Array.isArray(o)) return o.forEach((x) => fouiller(x, ou));
  if (o && typeof o === 'object') for (const v of Object.values(o)) fouiller(v, ou);
};
for (const f of formations) {
  console.log('FORMATION', f.id, '|', f.statut, '|', f.titre || f.title);
  fouiller(f, f.id);
  for (const sous of ['lecons', 'lessons', 'modules', 'chapitres', 'documents']) {
    try { const l = await lireCollection(`formations/${f.id}/${sous}`); if (l.length) { console.log('  ', sous, l.length); for (const x of l) fouiller(x, `${f.id}/${sous}/${x.id}`); } } catch {}
  }
}
for (const [u, o] of pdfs) console.log('PDF', u, '<=', [...o].slice(0, 4).join(', '));
