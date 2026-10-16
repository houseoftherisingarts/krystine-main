// Regroupe les constats de pages.mjs par page et par constat, avec la liste des appareils touchés.
//   node regrouper.mjs <dossier pages> <catégorie: caches|coupes|tronques|titres|italiques|contraste|petits|recadrees|gros|perf>
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const [D, cat] = process.argv.slice(2);
const parPage = new Map();
for (const p of readdirSync(D).sort()) {
  if (!existsSync(join(D, p)) || p.endsWith('.json')) continue;
  for (const f of readdirSync(join(D, p)).filter((x) => x.endsWith('.json'))) {
    const r = JSON.parse(readFileSync(join(D, p, f), 'utf8'));
    let items = [];
    if (cat === 'caches') items = (r.boutonsCaches || []).map((x) => [`${x.bouton} ← ${x.par}${x.finDePage ? ' (fin de page)' : ''}`, x.capture]);
    if (cat === 'coupes') items = (r.boutonsCoupes || []).map((x) => [x, '']);
    if (cat === 'tronques') items = (r.tronques || []).map((x) => [x, '']);
    if (cat === 'titres') items = (r.titres || []).map((x) => [`${x.balise} ${x.lignes} lignes « ${x.texte} »`, '']);
    if (cat === 'italiques') items = (r.italiques || []).map((x) => [x, '']);
    if (cat === 'contraste') items = (r.contrasteReel || []).map((x) => [`« ${x.cle} » ${x.detail.replace(/ \d+(\.\d+)?px$/, '')}`, x.capture]);
    if (cat === 'petits') items = (r.petits || []).map((x) => [x, '']);
    if (cat === 'recadrees') items = (r.recadrees || []).map((x) => [`${x.src.replace(/^https?:\/\/[^/]+/, '')} (${x.position}, ${x.perte} % rogné)`, '']);
    if (cat === 'gros') items = (r.gros || []).map((x) => [`${(x.octets / 1e6).toFixed(1)} Mo ${x.url.replace(/^https?:\/\/[^/]+/, '')}`, '']);
    if (cat === 'perf' && r.perf) items = [[`charge ${(r.perf.charge / 1000).toFixed(1)} s, lcp ${(r.perf.lcp / 1000).toFixed(1)} s, ${(r.perf.octets / 1e6).toFixed(1)} Mo`, '']];
    for (const [k, c] of items) {
      if (!parPage.has(r.page)) parPage.set(r.page, new Map());
      const m = parPage.get(r.page); if (!m.has(k)) m.set(k, { app: [], capture: c }); m.get(k).app.push(r.appareil);
    }
  }
}
for (const [p, m] of parPage) {
  console.log(`## ${p}`);
  for (const [k, v] of m) console.log(`  ${k}  [${v.app.sort((a, b) => a - b).join(',')}]${v.capture ? ' ' + v.capture.split('/la-ronde/')[1] : ''}`);
}
