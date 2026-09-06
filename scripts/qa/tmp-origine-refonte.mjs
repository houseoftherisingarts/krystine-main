// QA temporaire — refonte /origine (feuilles empilées + pleine largeur 16:9).
// À supprimer après vérification.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const URL = 'http://localhost:5199/origine';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/origine-refonte';
mkdirSync(OUT, { recursive: true });

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForSelector('div.bg-cream section', { timeout: 30000 });
await p.addStyleTag({ content: 'html{scroll-behavior:auto !important}' });
// Bannière témoins : hors du chemin pour lire les captures.
await p.getByRole('button', { name: /non merci|j'accepte/i }).first().click({ timeout: 5000 }).catch(() => {});
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(1500);

// ── Feuilles : position sticky + top calculé ───────────────────────────────
const feuilles = await p.evaluate(() => {
  const root = document.querySelector('div.bg-cream');
  return [...root.children].map((el, i) => {
    const cs = getComputedStyle(el);
    const sec = el.querySelector('section');
    return {
      i: i + 1,
      id: sec?.id || sec?.className.split(' ').slice(0, 2).join('.') || '?',
      position: cs.position,
      top: Math.round(parseFloat(cs.top) || 0),
      zIndex: cs.zIndex,
      hauteur: Math.round(el.getBoundingClientRect().height),
      radius: cs.borderTopLeftRadius,
    };
  });
});

// ── Largeur du plus large enfant de contenu, par section ───────────────────
const largeurs = await p.evaluate(() => {
  const VW = 1440;
  return [...document.querySelectorAll('section')].map((sec) => {
    let max = 0, gagnant = '';
    for (const el of sec.querySelectorAll('*')) {
      if (el.getAttribute('aria-hidden') === 'true') continue;
      const txt = (el.textContent || '').trim();
      if (!txt && el.tagName !== 'IMG') continue;
      const w = el.getBoundingClientRect().width;
      if (w > max) { max = w; gagnant = el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0]; }
    }
    return {
      section: sec.id || String(sec.className).split(' ').slice(0, 2).join('.'),
      largeur: Math.round(max),
      ratio: +(max / VW).toFixed(3),
      gagnant,
    };
  });
});

// ── Blocs centrés à largeur bornée (le no-no) ──────────────────────────────
const centres = await p.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('div,p,section,article,ul')) {
    const cs = getComputedStyle(el);
    if (cs.marginLeft !== 'auto' || cs.marginRight !== 'auto') continue;
    const w = el.getBoundingClientRect().width;
    const pw = el.parentElement?.getBoundingClientRect().width || 0;
    if (w > 0 && pw - w > 80 && w > 200) {
      out.push({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 70), w: Math.round(w), pw: Math.round(pw) });
    }
  }
  return out;
});

// ── Titres : nombre de lignes ──────────────────────────────────────────────
const titres = await p.evaluate(() => {
  return [...document.querySelectorAll('h1,h2,h3')].map((h) => {
    const cs = getComputedStyle(h);
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
    const lignes = Math.round(h.getBoundingClientRect().height / lh);
    return { txt: (h.textContent || '').trim().slice(0, 52), taille: Math.round(parseFloat(cs.fontSize)), lignes };
  }).filter((t) => t.taille >= 24);
});

// ── Captures : 10 positions régulièrement espacées ─────────────────────────
const total = await p.evaluate(() => document.documentElement.scrollHeight);
const max = total - 900;
for (let i = 0; i < 10; i++) {
  const y = Math.round((max * i) / 9);
  await p.evaluate((yy) => window.scrollTo(0, yy), y);
  await p.waitForTimeout(750);
  await p.screenshot({ path: `${OUT}/d${String(i).padStart(2, '0')}-y${y}.png` });
}

// ── Mobile ─────────────────────────────────────────────────────────────────
const m = await b.newPage({ viewport: { width: 390, height: 844 } });
await m.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await m.waitForSelector('div.bg-cream section', { timeout: 30000 });
await m.evaluate(() => document.fonts.ready);
await m.waitForTimeout(1500);
await m.screenshot({ path: `${OUT}/m-fullpage.png`, fullPage: true });
const mFeuilles = await m.evaluate(() => {
  const root = document.querySelector('div.bg-cream');
  return [...root.children].map((el, i) => {
    const cs = getComputedStyle(el);
    return { i: i + 1, position: cs.position, top: Math.round(parseFloat(cs.top) || 0), h: Math.round(el.getBoundingClientRect().height) };
  });
});

await b.close();

const p3 = (n) => String(n).padStart(3, ' ');
console.log('\n═══ FEUILLES (1440) ═══');
console.log('  #  | position | top    | z  | hauteur | radius | section');
for (const f of feuilles) {
  const ok = f.position === 'sticky' && f.top <= 0 ? 'OK ' : 'XX ';
  console.log(`${ok}${p3(f.i)} | ${f.position.padEnd(8)} | ${String(f.top).padStart(6)} | ${String(f.zIndex).padStart(2)} | ${String(f.hauteur).padStart(7)} | ${f.radius.padEnd(6)} | ${f.id}`);
}

console.log('\n═══ LARGEURS (plus large enfant de contenu / 1440, seuil 0,88) ═══');
for (const l of largeurs) {
  console.log(`${l.ratio >= 0.88 ? 'OK ' : 'XX '} ${String(l.ratio).padEnd(6)} ${String(l.largeur).padStart(5)}px  ${l.section.slice(0, 40).padEnd(42)} ${l.gagnant}`);
}

console.log('\n═══ BLOCS CENTRÉS À LARGEUR BORNÉE ═══');
console.log(centres.length ? centres.map((c) => `  ${c.tag} w=${c.w} parent=${c.pw} · ${c.cls}`).join('\n') : '  aucun');

console.log('\n═══ TITRES (≥24px) ═══');
for (const t of titres) console.log(`${t.lignes > 2 ? 'XX ' : 'OK '} ${t.lignes} ligne(s) ${String(t.taille).padStart(3)}px · ${t.txt}`);

console.log('\n═══ MOBILE 390 ═══');
for (const f of mFeuilles) console.log(`${f.position === 'sticky' && f.top <= 0 ? 'OK ' : 'XX '} #${f.i} ${f.position} top=${f.top} h=${f.h}`);
console.log(`\nHauteur totale 1440 : ${total}px · captures dans ${OUT}\n`);
