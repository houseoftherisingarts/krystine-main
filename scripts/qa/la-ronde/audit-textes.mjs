// Passe le texte visible (pages et courriels) au crible du livre de règles (REGLES.md).
//   node audit-textes.mjs <dossier pages> <bilan courriels.json> [dossier cours]
import { readdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REGLES = [
  { id: 'gratuit', grave: 1, re: /\bgratuit\w*|\bfree\b/gi, regle: 'mot « gratuit » proscrit pour toujours (mot-gratuit-banni)' },
  { id: 'seuil', grave: 1, re: /\bseuils?\b/gi, regle: 'mot « seuil » banni (mot-seuil-banni)' },
  { id: 'vraie-nature', grave: 2, re: /vraie nature/gi, regle: 'fermeture « vraie nature » bannie (fermeture-vraie-nature-bannie)' },
  { id: 'possessif-corps', grave: 2, re: /\b(votre|vos) (corps|nez|yeux|oreilles|bouche|langue|peau|ventre|mains|pieds|sens|mental|système nerveux|souffle|respiration|organisme|cerveau|cœur|coeur|digestion|sommeil)\b/gi, regle: 'jamais le possessif pour le corps (corps-sans-possessif)' },
  { id: 'ayurvedique', grave: 2, re: /ayurvédique|ayurvedique/gi, regle: '« ayurvédique » comme étiquette (pas-de-signature-vedique) : à juger selon l’emploi' },
  { id: 'ayurveda-minuscule', grave: 1, re: /(?<![\w/.-])ayurveda\b/g, regle: 'Ayurveda toujours avec un A majuscule (ayurveda-majuscule)' },
  { id: 'cadratin', grave: 2, re: /—|\s–\s/g, regle: 'jamais de tiret cadratin (CLAUDE.md global, Écriture)' },
  { id: 'on', grave: 3, re: /\b(on|qu'on|qu’on) (a|est|peut|va|fait|se|ne|n'|n’|dit|vous|y|l'|l’|le|la|les|sait|doit|veut|prend|parle|voit|retrouve|commence|apprend|trouve|reste|aime|garde|met|part)\b/gi, regle: '« nous » jamais « on » (lettres-toujours-nous; CLAUDE.md global)' },
  { id: 'ca', grave: 3, re: /\bça\b/gi, regle: '« cela » jamais « ça » (CLAUDE.md global)' },
  { id: 'quand', grave: 4, re: /\bquand\b/gi, regle: '« lorsque » jamais « quand » (CLAUDE.md global, langue des livrables)' },
  { id: 'fatigue', grave: 3, re: /\bfatigu\w*/gi, regle: 'dire « épuisement » plutôt que « fatigue » (CLAUDE.md global)' },
  { id: 'wellness', grave: 2, re: /wellness/gi, regle: 'mot proscrit (CLAUDE.md global)' },
  { id: 'sante', grave: 3, re: /\bsanté\b(?! la vie)(?!-la-vie)/gi, regle: 'mot « santé » proscrit en communication, sauf Santé la vie (CLAUDE.md global; sante-la-vie-nom-propre)' },
  { id: 'institut', grave: 1, re: /institut inspirata/gi, regle: 'Institut Inspirata proscrit (CLAUDE.md global)' },
  { id: 'vivant', grave: 3, re: /\b(le|du) vivant\b/gi, regle: '« le vivant / du vivant » proscrit (CLAUDE.md global)' },
  { id: 'chair', grave: 3, re: /\bchair\b/gi, regle: 'mot proscrit (CLAUDE.md global)' },
  { id: 'millenaire', grave: 3, re: /millénaire\w*/gi, regle: 'mot proscrit (CLAUDE.md global)' },
  { id: 'rare', grave: 4, re: /\brares?\b/gi, regle: 'mot proscrit (CLAUDE.md global)' },
  { id: 'resultats', grave: 4, re: /\brésultats?\b/gi, regle: 'mot proscrit en communication (CLAUDE.md global); « résultat du quiz » à juger' },
  { id: 'chopra', grave: 1, re: /chopra|perfect health/gi, regle: 'jamais nommer Chopra ni Perfect Health (CLAUDE.md global)' },
  { id: 'trois-elements', grave: 1, re: /trois éléments|3 éléments/gi, regle: 'nous portons CINQ éléments (element-vent-feu-terre)' },
  { id: 'huit-ans', grave: 1, re: /\b(8|huit) ans\b/gi, regle: 'douze ans d’écriture, jamais 8 ans (trilogie-douze-ans)' },
  { id: '37-ans', grave: 1, re: /\b37 ans\b/gi, regle: 'bio : près de 40 ans (bio-pres-de-40-ans)' },
  { id: 'tome3-date', grave: 2, re: /février 2027|14 mars 2027|21 février/gi, regle: 'tome 3 : parution 3 mars 2027; lancement à confirmer (tome3-parution-lancement)' },
  { id: 'type', grave: 2, re: /votre type|votre dominance ayurvédique|une huile (pour|par) (chaque |votre )?(type|dosha)/gi, regle: 'cartographie, pas étiquette (cartographie-pas-etiquette)' },
  { id: 'renvoi-medical', grave: 2, re: /professionnel(le)? de (la )?santé|consultez (votre|un) médecin/gi, regle: 'pas de renvoi médical (pas-de-renvoi-medical)' },
  { id: 'vs', grave: 4, re: /\bvs\.?\b/gi, regle: 'jamais « X vs Y » (CLAUDE.md global)' },
  { id: 'inspirata-casse', grave: 3, re: /Inspirata Ayurveda|Inspirata ayurveda/g, regle: 'INSPIRATA AYURVEDA en majuscules (CLAUDE.md global)' },
  { id: 'eo-casse', grave: 4, re: /Expérience Origine/g, regle: 'EXPÉRIENCE ORIGINE en majuscules et en entier (CLAUDE.md global)' },
  { id: 'nest-pas', grave: 4, re: /(ce n['’]est pas|ce ne sont pas)[^.!?]{1,80}[,;:] ?c['’]est/gi, regle: '« ce n’est pas X, c’est Y » au plus une fois par texte (CLAUDE.md global)' },
  { id: 'je', grave: 3, re: /(^|[\s«"(])(je|j['’]|moi|mon|ma|mes) (suis|vous|ai|crois|sais|partage|enseigne|propose|offre|invite|souhaite|veux|t['’]|m['’]|livre|accompagne|ai|travail|livre|parcours|équipe|cœur|histoire|approche)/gi, regle: 'au nom de Krystine : « nous », jamais « je » (lettres-toujours-nous) — à juger (citations permises)' },
];
const NOMS = [['Vata', 'Vent et Espace'], ['Pitta', 'Feu et Eau'], ['Kapha', 'Eau et Terre']];

export function auditer(texte) {
  const coups = [];
  for (const r of REGLES) {
    const vus = new Map();
    for (const m of texte.matchAll(r.re)) {
      const a = Math.max(0, m.index - 50), b = Math.min(texte.length, m.index + m[0].length + 50);
      const ctx = texte.slice(a, b).replace(/\s+/g, ' ').trim();
      if (!vus.has(ctx)) vus.set(ctx, m[0]);
    }
    if (r.id === 'nest-pas' && vus.size < 2) continue;
    if (vus.size) coups.push({ regle: r.id, grave: r.grave, texte: r.regle, n: vus.size, exemples: [...vus.keys()].slice(0, 4) });
  }
  // Nomenclature : chaque dominance nommée devrait porter ses éléments (on compte les mentions nues).
  for (const [d, el] of NOMS) {
    const tout = [...texte.matchAll(new RegExp(`\\b${d}\\b`, 'g'))].length;
    const avec = [...texte.matchAll(new RegExp(`\\b${d}\\b\\s*\\(${el}\\)`, 'g'))].length;
    if (tout && avec === 0) coups.push({ regle: 'nomenclature', grave: 3, texte: `${d} nommé ${tout} fois sans « (${el}) » (element-vent-feu-terre)`, n: tout, exemples: [] });
  }
  const transfo = [...texte.matchAll(/transformation/gi)].length;
  if (transfo > 2) coups.push({ regle: 'transformation', grave: 4, texte: `« transformation » ${transfo} fois (modele-de-cours-uniforme : sans répétition)`, n: transfo, exemples: [] });
  return coups;
}

if (process.argv[2]) {
  const out = {};
  const D = process.argv[2];
  for (const p of existsSync(D) ? readdirSync(D) : []) {
    const textes = [];
    for (const a of ['1440', '390']) { const f = join(D, p, `${a}.json`); if (existsSync(f)) { const r = JSON.parse(readFileSync(f, 'utf8')); if (r.texte) textes.push(r.texte); out['page ' + r.page] = null; } }
    if (!textes.length) continue;
    const r = JSON.parse(readFileSync(join(D, p, existsSync(join(D, p, '1440.json')) ? '1440.json' : '390.json'), 'utf8'));
    out['page ' + r.page] = auditer(textes.join('\n\n'));
  }
  if (process.argv[3] && existsSync(process.argv[3])) for (const c of JSON.parse(readFileSync(process.argv[3], 'utf8'))) out['courriel ' + c.id] = auditer(`${c.sujet || ''}\n${c.preheader || ''}\n${c.texte || ''}`);
  if (process.argv[4] && existsSync(process.argv[4])) for (const f of readdirSync(process.argv[4]).filter((x) => x.endsWith('.txt'))) out['texte ' + f] = auditer(readFileSync(join(process.argv[4], f), 'utf8'));
  for (const [k, v] of Object.entries(out)) { if (!v || !v.length) continue; console.log(`## ${k}`); for (const c of v.sort((a, b) => a.grave - b.grave)) console.log(`  [${c.grave}] ${c.regle} ×${c.n} : ${c.texte}${c.exemples.length ? '\n      · ' + c.exemples.join('\n      · ') : ''}`); }
  writeFileSync(process.env.RONDE_AUDIT || '/private/tmp/claude-501/-Users-ksl-Documents-Inspira-Nature/7cc8fb01-d47a-4868-b79a-80434059bb32/scratchpad/la-ronde/audit-textes.json', JSON.stringify(out, null, 1));
}
