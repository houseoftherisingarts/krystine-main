#!/usr/bin/env node
// La relecture automatique d'une lettre (Krystine, 4 octobre 2026).
// Lit le brouillon dans Firestore et lève les balises qu'un œil fatigué laisse
// passer : coquilles, mots proscrits, aperçu vide, boutons, liens sans « via »,
// écriture manuscrite, audience. LECTURE SEULE : rien n'est modifié.
//
//   node scripts/newsletter/relire-lettre.mjs <id-de-la-lettre>
//
// Le filtre humain (la lectrice, Eric Edmeades, la voix, la stratégie) vit dans
// le skill « relecture-lettre » d'Iris : ce script n'en fait que la partie mécanique.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const ID = process.argv[2];
if (!ID) { console.error('Usage : node scripts/newsletter/relire-lettre.mjs <id-de-la-lettre>'); process.exit(1); }
const BASE = 'https://firestore.googleapis.com/v1/projects/krystinestlaurent-87566/databases/(default)/documents';

async function jeton() {
  try { return execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { /* pas de gcloud */ }
  const candidats = [join(homedir(), '.iris/tools/node_modules/firebase-tools/lib/auth.js')];
  try { candidats.unshift(execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim() + '/firebase-tools/lib/auth.js'); } catch { /* rien */ }
  const chemin = candidats.find(existsSync);
  const conf = join(homedir(), '.config/configstore/firebase-tools.json');
  if (!chemin || !existsSync(conf)) throw new Error('Ni gcloud ni « firebase login » sur cet ordinateur.');
  const auth = createRequire(import.meta.url)(chemin);
  const t = await auth.getAccessToken(JSON.parse(readFileSync(conf, 'utf8')).tokens.refresh_token, []);
  return t.access_token || t;
}
const v = (x) => x == null ? null : 'stringValue' in x ? x.stringValue : 'integerValue' in x ? +x.integerValue
  : 'booleanValue' in x ? x.booleanValue : 'nullValue' in x ? null : 'timestampValue' in x ? x.timestampValue
  : 'arrayValue' in x ? (x.arrayValue.values || []).map(v)
  : 'mapValue' in x ? Object.fromEntries(Object.entries(x.mapValue.fields || {}).map(([k, y]) => [k, v(y)])) : null;

const T = await jeton();
const brut = await fetch(`${BASE}/newsletters/${ID}`, { headers: { Authorization: `Bearer ${T}` } }).then(r => r.json());
if (!brut.fields) { console.error('Lettre introuvable :', ID); process.exit(1); }
const L = Object.fromEntries(Object.entries(brut.fields).map(([k, y]) => [k, v(y)]));
const blocs = L.blocks || [];

const balises = [];
const lever = (gravite, ou, quoi) => balises.push({ gravite, ou, quoi });

// ── Les mots et les coquilles ───────────────────────────────────────────────
const REGLES = [
  [/—/g, 'tiret cadratin (à recomposer)'],
  [/\bayurveda\b/g, '« ayurveda » sans majuscule : Ayurveda'],
  [/\bgratuit\w*/gi, 'mot proscrit : gratuit'],
  [/\bfatigu\w*/gi, 'mot proscrit : fatigue (dire épuisement)'],
  [/\bseuil\b/gi, 'mot banni : seuil'],
  [/\bvotre corps\b/gi, '« votre corps » : dire « le corps »'],
  [/\bvraie nature\b/gi, 'fermeture « vraie nature » bannie'],
  [/\bwellness\b|\btransformation\b|\brésultats\b/gi, 'mot proscrit en communication'],
  [/\bChopra\b|Perfect Health/gi, 'nom à ne jamais citer'],
  [/\bayurvédique\b/gi, '« ayurvédique » comme étiquette : à éviter'],
  [/(?<!\.)\.\.(?!\.)/g, '« .. » : mettre « ... »'],
  [/ {2,}/g, 'double espace'],
  [/[^\s\d]:(?!\/\/)/g, 'deux-points collé : mettre une espace avant « : »'],
  [/l' [A-ZÀ-Ü]/g, 'espace après l\' apostrophe'],
  [/\bressens\b/g, '« ressens » : vérifier « ressent » (il ou elle)'],
  [/ce n'est pas .{1,60}, c'est/gi, 'tournure « ce n\'est pas X, c\'est Y » (une fois par texte au plus)'],
];
const VATA = /\bVata\b(?! \(Vent et Espace\))/g, PITTA = /\bPitta\b(?! \(Feu et Eau\))/g, KAPHA = /\bKapha\b(?! \(Eau et Terre\))/g;
const textes = [['sujet', L.subject || ''], ['aperçu', L.preheader || '']];
blocs.forEach((b, i) => {
  const c = b.content || {};
  for (const k of ['text', 'label', 'caption', 'attribution', 'titre', 'texte', 'alt']) if (typeof c[k] === 'string') textes.push([`bloc ${i + 1} (${b.type}, ${k})`, c[k]]);
});
for (const [ou, t] of textes) {
  const nu = t.replace(/<[^>]+>/g, '');
  for (const [re, quoi] of REGLES) if (re.test(nu)) lever('à corriger', ou, quoi), re.lastIndex = 0;
  if (!/alt/.test(ou)) for (const [re, nom] of [[VATA, 'Vata (Vent et Espace)'], [PITTA, 'Pitta (Feu et Eau)'], [KAPHA, 'Kapha (Eau et Terre)']]) {
    if (re.test(nu)) lever('à vérifier', ou, `nommer ${nom} au moins une fois`); re.lastIndex = 0;
  }
}

// ── L'enveloppe : ce que la lectrice voit dans sa boîte ────────────────────
if (!(L.subject || '').trim()) lever('bloquant', 'sujet', 'sujet vide');
else if ((L.subject || '').length > 60) lever('à corriger', 'sujet', `sujet de ${L.subject.length} caractères (60 au plus)`);
if (!(L.preheader || '').trim()) lever('à corriger', 'aperçu', 'ligne d\'aperçu vide : Gmail affichera n\'importe quoi à la place');

// ── Les gestes : un seul but, répété ───────────────────────────────────────
const boutons = blocs.filter(b => b.type === 'button');
const buts = new Set(boutons.map(b => (b.content?.href || '').replace(/[?#].*$/, '')));
if (!boutons.length) lever('à vérifier', 'boutons', 'aucun bouton : quel est le geste attendu ?');
if (buts.size > 1) lever('à vérifier', 'boutons', `${buts.size} buts différents (${[...buts].join(', ')}) : un seul but par lettre`);
const dernierBouton = blocs.map(b => b.type).lastIndexOf('button');
if (boutons.length && dernierBouton < blocs.length - 4) lever('à vérifier', 'bas de la lettre', 'pas de bouton près de la fin : celle qui lit jusqu\'en bas doit le trouver');
for (const b of boutons) if (/^(faire|cliquer|en savoir plus|découvrir)/i.test(b.content?.label || '')) lever('suggestion', 'bouton', `« ${b.content.label} » décrit une tâche : dire ce qu'elle obtient, à la première personne`);
const liens = [];
blocs.forEach((b, i) => {
  const c = b.content || {};
  for (const h of [c.href, ...(String(c.text || '').match(/href="([^"]+)"/g) || []).map(s => s.slice(6, -1))]) if (h) liens.push([i, h]);
  if (b.type === 'image' && !c.url && c.largeur !== 'kaleidoscope') lever('bloquant', `bloc ${i + 1}`, 'image sans fichier');
  if (b.type === 'heading' && !String(c.text || '').trim()) lever('à corriger', `bloc ${i + 1}`, 'titre vide (crée un trou blanc)');
  if (b.type === 'paragraph' && !String(c.text || '').trim()) lever('à corriger', `bloc ${i + 1}`, 'paragraphe vide');
});
for (const [i, h] of liens) {
  if (/krystinestlaurent\.ca\/quiz/.test(h) && !/via=/.test(h)) lever('à corriger', `bloc ${i + 1}`, 'lien du quiz sans « ?via= » : on ne saura pas d\'où viennent les gens');
  if (/inspiratanature\.com/.test(h) && !/locale=fr/.test(h)) lever('à corriger', `bloc ${i + 1}`, 'lien boutique sans ?country=CA&locale=fr');
  if (/mykajabi|kajabi\.com|bit\.ly|tinyurl/.test(h)) lever('bloquant', `bloc ${i + 1}`, `lien interdit : ${h}`);
}

// ── L'audience ──────────────────────────────────────────────────────────────
const a = L.audience || {};
if (a.mode === 'tags' && !(a.tags || []).length) lever('bloquant', 'audience', 'aucune liste cochée');
lever('info', 'audience', a.mode === 'all' ? 'toutes les abonnées actives' : a.mode === 'tags' ? `listes : ${(a.tags || []).join(', ')}` : `${(a.emails || []).length} personnes choisies`);

const ordre = { bloquant: 0, 'à corriger': 1, 'à vérifier': 2, suggestion: 3, info: 4 };
balises.sort((x, y) => ordre[x.gravite] - ordre[y.gravite]);
console.log(`\nRelecture : ${L.subject || L.title}\n`);
for (const b of balises) console.log(`[${b.gravite}] ${b.ou} : ${b.quoi}`);
console.log(`\n${balises.filter(b => b.gravite === 'bloquant').length} bloquante(s), ${balises.filter(b => b.gravite === 'à corriger').length} à corriger.`);
