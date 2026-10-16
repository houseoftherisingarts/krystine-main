// Résume les résultats de pages.mjs (sans le texte ni les liens) : node resume.mjs <dossier> [filtre-page]
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const D = process.argv[2]; const filtre = process.argv[3] || '';
for (const p of readdirSync(D).sort()) {
  if (filtre && !p.includes(filtre)) continue;
  const dd = join(D, p); if (!existsSync(dd) || !dd) continue;
  for (const f of readdirSync(dd).filter((x) => x.endsWith('.json')).sort((a, b) => parseInt(a) - parseInt(b))) {
    const r = JSON.parse(readFileSync(join(dd, f), 'utf8'));
    const l = [];
    if (r.echec) l.push('ÉCHEC ' + r.echec);
    if (r.note) l.push(r.note);
    if (r.introuvable) l.push('PAGE INTROUVABLE');
    if (r.statut && r.statut !== 200) l.push('statut ' + r.statut);
    if (r.largeur > r.vw + 1) l.push(`DÉBORDE ${r.largeur}/${r.vw} ${r.fautif || ''}`);
    for (const x of r.boutonsCaches || []) l.push(`CACHÉ ${x.bouton} par ${x.par}${x.finDePage ? ' (fin de page)' : ''} ${x.capture}`);
    for (const x of r.boutonsCoupes || []) l.push('COUPÉ ' + x);
    for (const x of r.tronques || []) l.push('TRONQUÉ ' + x);
    for (const x of r.titres || []) l.push(`TITRE ${x.balise} ${x.lignes} lignes « ${x.texte} »`);
    for (const x of r.cassees || []) l.push('IMG CASSÉE ' + x);
    for (const x of r.italiques || []) l.push('ITALIQUE ' + x);
    for (const x of r.roses || []) l.push('ROSE ' + x);
    for (const x of r.contrasteReel || []) l.push(`CONTRASTE ${x.ratio}:1 « ${x.cle} » ${x.detail} ${x.capture}`);
    for (const x of r.fantomes || []) l.push('FANTÔME ' + x);
    for (const x of r.petits || []) l.push('PETIT ' + x);
    for (const x of r.recadrees || []) l.push(`RECADRÉE ${x.perte}% ${x.cadre} ${x.position} ${x.src}`);
    for (const x of r.videos || []) if (x.erreur || x.pret < 2) l.push(`VIDÉO pret=${x.pret} err=${x.erreur} ${x.src}`);
    for (const x of r.erreursJs || []) l.push('JS ' + x);
    for (const x of r.ressources || []) l.push('RESSOURCE ' + x);
    for (const x of r.gros || []) l.push(`LOURD ${(x.octets / 1e6).toFixed(1)} Mo ${x.type} ${x.url}`);
    if (r.perf) l.push(`perf charge=${r.perf.charge} lcp=${r.perf.lcp} ${(r.perf.octets / 1e6).toFixed(1)} Mo ${r.perf.requetes} req`);
    console.log(`## ${r.page} @${r.appareil}\n  ` + l.join('\n  '));
  }
}
