// Les liens et images des courriels rendus : boutique en français, écosystème seulement, liens vivants.
import { readFileSync } from 'node:fs';
const B = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const tous = new Map();
for (const c of B) {
  const t = `${c.sujet}\n${c.texte || ''}`;
  if (/vata/.test(c.id) && /automne|hiver|journées raccourcissent|feuilles tombent/i.test(t)) console.log(`SAISON ${c.id} : ${t.match(/.{0,60}(automne|hiver|journées raccourcissent|feuilles tombent).{0,60}/i)[0].replace(/\s+/g, ' ')}`);
  if (/vata/.test(c.id) && /communauté|cercle|groupe privé|espace d.échange/i.test(t)) console.log(`COMMUNAUTÉ ${c.id} : ${t.match(/.{0,60}(communauté|cercle|groupe privé|espace d.échange).{0,60}/i)[0].replace(/\s+/g, ' ')}`);
  if (!/teamksl@inspiratanature\.com/.test(t) && !/^quiz|^seq-suite/.test(c.id)) console.log(`SOUTIEN ABSENT ${c.id} (« Notre équipe est là pour vous… teamksl »)`);
  if (/Notre équipe est là pour vous/.test(t) === false && /teamksl/.test(t)) console.log(`SOUTIEN FORMULE ${c.id} : teamksl présent sans « Notre équipe est là pour vous »`);
  for (const i of c.images || []) if (!i.ok) console.log(`IMAGE CASSÉE ${c.id} : ${i.src}`);
  for (const i of c.imagesCassees || []) console.log(`IMAGE ERREUR ${c.id} : ${i}`);
  if (c.largeur390 > 392) console.log(`DÉBORDE 390 ${c.id} : ${c.largeur390}px`);
  for (const l of c.liens || []) {
    const u = l.href;
    if (u === '#' || u.endsWith('#') || u.startsWith('mailto:')) continue;
    if (!tous.has(u)) tous.set(u, new Set());
    tous.get(u).add(c.id);
    if (/inspiratanature\.com/.test(u) && !/country=CA/.test(u)) console.log(`BOUTIQUE SANS FR ${c.id} : ${u}`);
    let h = ''; try { h = new URL(u).host; } catch { console.log(`LIEN INVALIDE ${c.id} : ${u}`); continue; }
    if (!/krystinestlaurent\.ca|inspiratanature\.com|cloudfunctions\.net|firebasestorage|storage\.googleapis\.com|^$/.test(h)) console.log(`HORS ÉCOSYSTÈME ${c.id} : ${u} (« ${l.texte} »)`);
  }
}
// Vérifie chaque lien unique (sans suivre les pages du site, qui sont vérifiées par la passe des pages).
const sortie = [];
for (const [u, ids] of tous) {
  try {
    const r = await fetch(u, { redirect: 'follow', headers: { 'Accept-Language': 'en-US', 'User-Agent': 'Mozilla/5.0 la-ronde' } });
    const corps = /inspiratanature/.test(u) ? await r.text() : '';
    const lang = corps.match(/<html[^>]*lang="([^"]+)"/)?.[1] || '';
    sortie.push(`${r.status} ${lang ? 'lang=' + lang + ' ' : ''}${u} → ${r.url !== u ? r.url : ''} [${[...ids].slice(0, 3).join(', ')}${ids.size > 3 ? '…' : ''}]`);
  } catch (e) { sortie.push(`ÉCHEC ${u} ${e.message} [${[...ids].join(', ')}]`); }
}
console.log(sortie.sort().join('\n'));
