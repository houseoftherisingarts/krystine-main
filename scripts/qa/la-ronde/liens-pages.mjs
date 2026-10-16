// Tous les liens vus sur les pages (pages.mjs) : internes vivants, boutique en français, écosystème seulement.
//   node liens-pages.mjs <dossier pages>
import { chromium } from 'playwright';
import { readdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const D = process.argv[2];
const SITE = 'https://www.krystinestlaurent.ca';
const liens = new Map(); // url -> Set(pages)
for (const p of readdirSync(D)) for (const f of existsSync(join(D, p)) ? readdirSync(join(D, p)).filter((x) => x.endsWith('.json')) : []) {
  const r = JSON.parse(readFileSync(join(D, p, f), 'utf8'));
  for (const u of r.liens || []) { if (!liens.has(u)) liens.set(u, new Set()); liens.get(u).add(r.page); }
}
const sortie = { boutiqueSansFr: [], horsEcosysteme: [], internesMorts: [], externesMorts: [], internes: 0 };
const internes = new Map();
for (const [u, pages] of liens) {
  let x; try { x = new URL(u); } catch { continue; }
  if (/^(mailto|tel|javascript):/.test(x.protocol)) continue;
  const h = x.host.replace(/^www\./, '');
  const ou = [...pages].slice(0, 4).join(', ') + (pages.size > 4 ? ` (+${pages.size - 4})` : '');
  if (h === 'krystinestlaurent.ca' || h === 'localhost:5202') { const k = x.pathname.replace(/\/+$/, '') || '/'; if (!internes.has(k)) internes.set(k, new Set()); for (const p of pages) internes.get(k).add(p); continue; }
  if (h.endsWith('inspiratanature.com') && !/country=CA/.test(x.search) && !/locale=fr/.test(x.search)) sortie.boutiqueSansFr.push(`${u}  ← ${ou}`);
  if (!/inspiratanature\.com|krystinestlaurent\.(ca|com)|mykajabi\.com|instagram\.com|facebook\.com|youtube\.com|youtu\.be|spotify\.com|apple\.com|googleapis|firebasestorage|stripe\.com|vexel/.test(h)) sortie.horsEcosysteme.push(`${u}  ← ${ou}`);
  try { const r = await fetch(u, { method: 'GET', redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 la-ronde', 'Accept-Language': 'fr-CA' } }); if (r.status >= 400) sortie.externesMorts.push(`${r.status} ${u}  ← ${ou}`); }
  catch (e) { sortie.externesMorts.push(`ÉCHEC ${u} (${e.message})  ← ${ou}`); }
}
// Les liens internes : ouverts dans un navigateur (le site répond 200 à tout, la page dit « Page introuvable »).
const nav = await chromium.launch();
const ctx = await nav.newContext();
const pg = await ctx.newPage();
for (const [k, pages] of internes) {
  if (/\.(pdf|jpg|png|webp|mp3|mp4|xml|txt)$/i.test(k)) { const r = await fetch(SITE + k).catch(() => null); if (!r || r.status >= 400) sortie.internesMorts.push(`${r?.status || 'ÉCHEC'} ${k}  ← ${[...pages].slice(0, 4).join(', ')}`); continue; }
  sortie.internes++;
  try {
    await pg.goto(SITE + k, { waitUntil: 'load', timeout: 45000 }); await pg.waitForTimeout(1800);
    const mort = await pg.evaluate(() => /^(Page introuvable|Page not found)/.test(document.title) || /Page introuvable|Cette page n.existe pas|n'est pas disponible/i.test(document.body.innerText.slice(0, 1500)));
    if (mort) sortie.internesMorts.push(`${k} (« ${(await pg.evaluate(() => document.body.innerText.slice(0, 1500).match(/[^\n]*(introuvable|n.existe pas|pas disponible)[^\n]*/i)?.[0] || document.title)).slice(0, 80)} »)  ← ${[...pages].slice(0, 4).join(', ')}`);
  } catch (e) { sortie.internesMorts.push(`${k} ÉCHEC ${e.message.split('\n')[0]}`); }
}
await nav.close();
console.log(JSON.stringify(sortie, null, 1));
writeFileSync(join(D, '..', 'liens-pages.json'), JSON.stringify(sortie, null, 1));
