// La Ronde, passe des courriels : rend chaque lettre des suites (Firestore, lecture seule),
// le courriel du quiz et les confirmations d'achat, puis capture à 390 et 600 px.
// Rien n'est envoyé. Prérequis : cd functions && npm run build
import { chromium } from 'playwright';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lireCollection, requete } from './firestore-lecture.mjs';

const ICI = dirname(fileURLToPath(import.meta.url));
const LIB = join(ICI, '../../../functions/lib');
const SORTIE = process.env.RONDE_SORTIE || '/private/tmp/claude-501/-Users-ksl-Documents-Inspira-Nature/7cc8fb01-d47a-4868-b79a-80434059bb32/scratchpad/la-ronde/courriels';
mkdirSync(SORTIE, { recursive: true });
const req = createRequire(import.meta.url);
const { renderEmailHtml } = req(join(LIB, 'newsletter/renderer.js'));

const lettres = [];
const seqs = await lireCollection('sequences');
const ordre = new Map();
for (const s of seqs) (s.etapes || []).forEach((e, i) => ordre.set(e.newsletterId, { sequence: s.id, actif: s.actif, titreSeq: s.titre, etape: e.titre, delai: e.delaiHeures, rang: i + 1 }));
const docs = await requete({ from: [{ collectionId: 'newsletters' }], where: { compositeFilter: { op: 'AND', filters: [
  { fieldFilter: { field: { fieldPath: '__name__' }, op: 'GREATER_THAN_OR_EQUAL', value: { referenceValue: 'projects/krystinestlaurent-87566/databases/(default)/documents/newsletters/seq-' } } },
  { fieldFilter: { field: { fieldPath: '__name__' }, op: 'LESS_THAN', value: { referenceValue: 'projects/krystinestlaurent-87566/databases/(default)/documents/newsletters/seq.' } } },
] } } });
for (const d of docs) {
  const html = renderEmailHtml(d.blocks || [], { subject: d.subject, preheader: d.preheader, unsubscribeUrl: '#', postalAddress: '', firstName: 'Diane',
    couverture: d.couverture, couvertureUrl: d.couvertureUrl, entete: d.entete, signature: d.signature ?? true, lang: d.lang || 'fr', bandeau: d.bandeau, fond: d.fond, tailleLecture: d.tailleLecture });
  lettres.push({ id: d.id, sujet: d.subject, preheader: d.preheader, html, ...(ordre.get(d.id) || { sequence: '(aucune séquence ne l’utilise)' }) });
}

// Le courriel du résultat du quiz, pour chaque dominance.
try {
  const q = req(join(LIB, 'quizCourriel.js'));
  const cas = { vata: { vata: 52, pitta: 28, kapha: 20 }, pitta: { vata: 25, pitta: 50, kapha: 25 }, kapha: { vata: 20, pitta: 24, kapha: 56 } };
  for (const [d, p] of Object.entries(cas)) {
    lettres.push({ id: `quiz-resultat-${d}`, sujet: q.sujetResultat(d, p), sequence: 'courriel du quiz', html: q.renderResultatHtml({ prenom: 'Diane', dominant: d, pourcentages: p, suite: true, prete: true }) });
    lettres.push({ id: `quiz-resultat-${d}-sans-suite`, sujet: q.sujetResultat(d, p), sequence: 'courriel du quiz (case suite décochée)', html: q.renderResultatHtml({ prenom: 'Diane', dominant: d, pourcentages: p, suite: false, lienSuite: 'https://www.krystinestlaurent.ca/suite-lecture?x=apercu', prete: true }) });
  }
} catch (e) { console.error('Quiz :', e.message); }

// Les confirmations d'achat.
try {
  const c = req(join(LIB, 'confirmationAchat.js'));
  for (const [id, titre, total, v] of [['kajabi-2148687644', 'VATA Essentiel', 45644, 1], ['kajabi-2148687644', 'VATA Essentiel', 16790, 3], ['rituels-vivants', 'Rituels essentiels', 3104, 1], ['origine2', 'EXPÉRIENCE ORIGINE 2', 100000, 1]]) {
    const l = c.lettreConfirmation(id, titre, { total, tps: Math.round(total * 0.0435), tvq: Math.round(total * 0.0867), versements: v }, 'diane@exemple.com', '');
    const html = renderEmailHtml(l.blocks, { subject: l.subject, preheader: l.preheader, unsubscribeUrl: '#', postalAddress: '', firstName: 'Diane', couverture: 'aucune',
      bandeau: { etiquette: 'Bienvenue', fond: '#28352F', texte: '#EEE7DB' }, fond: '#FFFFFF', signature: true, lang: 'fr', titreBandeau: l.titreBandeau, tailleTitreBandeau: l.tailleTitreBandeau });
    lettres.push({ id: `confirmation-${id}-${v}x`, sujet: l.subject, sequence: 'confirmation d’achat', html });
  }
} catch (e) { console.error('Confirmations :', e.message); }

const nav = await chromium.launch();
const bilan = [];
for (const l of lettres) {
  const f = join(SORTIE, `${l.id}.html`);
  writeFileSync(f, l.html);
  const info = { ...l, html: undefined, captures: [] };
  for (const w of [390, 600]) {
    const ctx = await nav.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
    const pg = await ctx.newPage();
    const casses = [];
    pg.on('response', (r) => { if (r.request().resourceType() === 'image' && r.status() >= 400) casses.push(`${r.status()} ${r.url()}`); });
    await pg.goto('file://' + f, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    await pg.waitForTimeout(500);
    const cap = join(SORTIE, `${l.id}-${w}.png`);
    await pg.screenshot({ path: cap, fullPage: true });
    info.captures.push(cap);
    if (w === 600) {
      Object.assign(info, await pg.evaluate(() => ({
        texte: document.body.innerText,
        liens: [...document.querySelectorAll('a[href]')].map((a) => ({ href: a.href, texte: (a.innerText || a.querySelector('img')?.alt || '').trim().slice(0, 60) })),
        images: [...document.images].map((i) => ({ src: i.src, ok: i.complete && i.naturalWidth > 0, alt: i.alt })),
        largeur: document.documentElement.scrollWidth,
      })));
    } else {
      info.largeur390 = await pg.evaluate(() => document.documentElement.scrollWidth);
    }
    info.imagesCassees = [...new Set([...(info.imagesCassees || []), ...casses])];
    await ctx.close();
  }
  bilan.push(info);
  console.log(l.id, '|', l.sequence, '|', l.sujet);
}
await nav.close();
writeFileSync(join(SORTIE, 'bilan.json'), JSON.stringify(bilan, null, 1));
console.log(bilan.length, 'courriels rendus');
