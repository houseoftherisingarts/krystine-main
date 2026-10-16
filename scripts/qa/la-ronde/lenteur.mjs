// Les pages les plus lentes et les plus lourdes (téléphone 390 et ordinateur 1440), et les médias les plus lourds.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const D = process.argv[2];
const lignes = []; const medias = new Map();
for (const p of readdirSync(D)) for (const a of ['390', '1440']) {
  const f = join(D, p, `${a}.json`); if (!existsSync(f)) continue;
  const r = JSON.parse(readFileSync(f, 'utf8')); if (!r.perf) continue;
  lignes.push({ page: r.page, a, charge: r.perf.charge, lcp: r.perf.lcp, mo: r.perf.octets / 1e6, req: r.perf.requetes });
  for (const g of r.gros || []) { const k = g.url.split('?')[0]; const m = medias.get(k) || { mo: g.octets / 1e6, pages: new Set() }; m.pages.add(r.page); medias.set(k, m); }
}
console.log('— LCP (plus grand élément visible) le plus lent, téléphone :');
for (const l of lignes.filter((x) => x.a === '390').sort((a, b) => b.lcp - a.lcp).slice(0, 15)) console.log(`  ${l.page} lcp ${(l.lcp / 1000).toFixed(1)} s, chargé ${(l.charge / 1000).toFixed(1)} s, ${l.mo.toFixed(1)} Mo, ${l.req} req`);
console.log('— Pages les plus lourdes, téléphone :');
for (const l of lignes.filter((x) => x.a === '390').sort((a, b) => b.mo - a.mo).slice(0, 15)) console.log(`  ${l.page} ${l.mo.toFixed(1)} Mo, lcp ${(l.lcp / 1000).toFixed(1)} s`);
console.log('— Médias de plus de 0,8 Mo :');
for (const [k, m] of [...medias].sort((a, b) => b[1].mo - a[1].mo).slice(0, 25)) console.log(`  ${m.mo.toFixed(1)} Mo ${k}  ← ${[...m.pages].slice(0, 4).join(', ')}${m.pages.size > 4 ? ` (+${m.pages.size - 4})` : ''}`);
