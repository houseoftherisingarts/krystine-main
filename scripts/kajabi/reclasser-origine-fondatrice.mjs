// Reclasse le cours « Expérience Origine : Cohorte Fondatrice » (Krystine, 24 septembre 2026).
// Le cours complet de la cohorte vivait sous le produit Kajabi 2149503901; la copie
// kajabi-2149348838 n'en gardait que les semaines 7 à 12, sans nom de semaine.
// Ce script réécrit les leçons de kajabi-2149348838 à partir de la sauvegarde
// scripts/kajabi/sauvegardes/origine-cours-2026-09-24.json, dans l'ordre du parcours,
// en y ajoutant la semaine 12 et le certificat. Les fichiers vidéo restent où ils sont.
// Leçons laissées de côté (décision de Krystine) : liens Zoom, marche à suivre Kajabi,
// guidance du portail (à refaire), digestion en 6 étapes (document inconnu).
// Usage : node scripts/kajabi/reclasser-origine-fondatrice.mjs <fichier-jeton> [--ecrire]
import { readFileSync } from 'fs';
const [, , FICHIER_JETON, MODE] = process.argv;
const ECRIRE = MODE === '--ecrire';
const F = JSON.parse(readFileSync(new URL('./sauvegardes/origine-cours-2026-09-24.json', import.meta.url))).formations;
const CIBLE = 'kajabi-2149348838';
const BASE = 'https://firestore.googleapis.com/v1/projects/krystinestlaurent-87566/databases/(default)/documents';

const id = l => l.name.split('/').pop();
const tri = ls => [...ls].sort((a, b) => +a.fields.ordre.integerValue - +b.fields.ordre.integerValue);
const complet = tri(F['kajabi-2149503901'].lecons);
const copie = Object.fromEntries(F[CIBLE].lecons.map(l => [id(l), l]));

const ECARTEES = new Set(['001', '002', '003', '004', '006', '010']);
const SEMAINE_12 = 'SEMAINE 12 PILIER 3 : RETROUVER SON AUTORITÉ INTÉRIEURE';
const plan = [];
for (const l of complet) {
  if (ECARTEES.has(id(l))) continue;
  if (id(l) === '088') { // la semaine 12 s'insère après la semaine 11, avant le balado
    for (const k of ['020', '021', '022', '023', '024']) plan.push({ src: copie[k], moduleNom: SEMAINE_12 });
  }
  plan.push({ src: l, moduleNom: l.fields.moduleNom.stringValue });
}
plan.push({ src: copie['029'], moduleNom: 'CERTIFICAT DE COMPLÉTION' });

const lignes = plan.map((p, i) => {
  const fields = { ...p.src.fields, ordre: { integerValue: String(i) }, moduleNom: { stringValue: p.moduleNom } };
  delete fields.module;
  return { leconId: String(i).padStart(3, '0'), fields, provenance: p.src.name.split('/documents/')[1] };
});

console.log(`${lignes.length} leçons (${Object.keys(copie).length} existantes réécrites, ${Math.max(0, lignes.length - Object.keys(copie).length)} ajoutées)`);
let prev = '';
for (const l of lignes) {
  const m = l.fields.moduleNom.stringValue;
  if (m !== prev) { console.log(`  [${m.replace(/\s+/g, ' ').trim()}]`); prev = m; }
  console.log(`    ${l.leconId} ${l.fields.type.stringValue.padEnd(5)} ${l.fields.titre.stringValue.replace(/\s+/g, ' ').slice(0, 70)}`);
}
if (!ECRIRE) { console.log('\nEssai à blanc : rien n’a été écrit. Ajouter --ecrire pour appliquer.'); process.exit(0); }

const H = { Authorization: `Bearer ${readFileSync(FICHIER_JETON, 'utf8').trim()}`, 'Content-Type': 'application/json' };
for (const l of lignes) {
  const r = await fetch(`${BASE}/formations/${CIBLE}/lecons/${l.leconId}`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields: l.fields }) });
  if (!r.ok) throw new Error(`${l.leconId} : ${r.status} ${await r.text()}`);
}
console.log(`\n${lignes.length} leçons écrites dans formations/${CIBLE}/lecons.`);
