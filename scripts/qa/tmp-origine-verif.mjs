// QA sceptique — page /origine : feuilles sticky (O1), pleine largeur (O2),
// titres/italique (O3), musique non connectée (O4 volet visiteur), mobile (O5).
// Non-authentifié seulement (voir tmp-origine-auth.mjs pour le volet connecté).
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:5199';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/revue/origine';

const browser = await chromium.launch();

// ═══════════════════ DESKTOP 1440×900 ═══════════════════
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/origine`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#curriculum', { timeout: 20000 });
  await page.waitForTimeout(2000); // laisser les images GCS charger + les Reveal jouer

  // ── O1 : feuilles sticky ──
  const feuilles = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('.sticky'));
    return els.map((el, i) => {
      const cs = getComputedStyle(el);
      const h = el.offsetHeight;
      const attendu = Math.min(0, window.innerHeight - h);
      return {
        i, position: cs.position, top: cs.top, zIndex: cs.zIndex,
        offsetHeight: h, innerHeight: window.innerHeight,
        topAttenduPx: attendu, tropHaute: h > window.innerHeight,
      };
    });
  });
  console.log('O1 — feuilles (count=%d):', feuilles.length);
  feuilles.forEach(f => console.log(`  #${f.i} z=${f.zIndex} position=${f.position} top=${f.top} (attendu ${f.topAttenduPx}px) offsetHeight=${f.offsetHeight} tropHaute=${f.tropHaute}`));

  // 10 captures au scroll pour voir l'empilement + coins arrondis
  const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  for (let i = 0; i < 10; i++) {
    const y = Math.round((i / 9) * maxScroll);
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${OUT}/o1-scroll-${String(i).padStart(2, '0')}-y${y}.png` });
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);

  // ── O2 : pleine largeur ──
  const largeurs = await page.evaluate(() => {
    const sections = Array.from(document.querySelectorAll('.sticky > section, .sticky > div > section'));
    // fallback : chaque .sticky contient directement une <section> ou un composant FaqSection qui rend une <section>
    const feuilles = Array.from(document.querySelectorAll('.sticky'));
    return feuilles.map((f, i) => {
      const sec = f.querySelector('section') || f;
      let max = 0;
      const marge80 = [];
      const walk = (el, depth) => {
        if (depth > 2) return; // enfants directs + petit-enfants du wrapper de contenu
        for (const child of el.children) {
          if (child.getAttribute('aria-hidden') === 'true') continue;
          const r = child.getBoundingClientRect();
          if (r.width > max) max = r.width;
          const cs = getComputedStyle(child);
          const gapGauche = r.left;
          const gapDroite = window.innerWidth - r.right;
          if (r.width > 500 && cs.marginLeft === cs.marginRight && parseFloat(cs.marginLeft) > 80) {
            marge80.push({ tag: child.tagName, cls: child.className.toString().slice(0, 60), marginLeft: cs.marginLeft });
          }
          walk(child, depth + 1);
        }
      };
      walk(sec, 0);
      return { i, largeurMax: Math.round(max), ratio: +(max / window.innerWidth).toFixed(3), marge80 };
    });
  });
  console.log('O2 — largeur du plus large enfant / 1440 par feuille :');
  largeurs.forEach(l => console.log(`  #${l.i} largeurMax=${l.largeurMax}px ratio=${l.ratio} margeAutoSuspecte=${JSON.stringify(l.marge80)}`));

  const textCenterMain = await page.evaluate(() => {
    // Cherche .text-center sur un bloc large (>400px) qui n'est pas un simple bouton/lien
    const els = Array.from(document.querySelectorAll('.text-center'));
    return els.map(el => ({ tag: el.tagName, cls: el.className.toString().slice(0, 80), width: Math.round(el.getBoundingClientRect().width), text: el.textContent.slice(0, 40) }));
  });
  console.log('O2 — éléments .text-center trouvés :', JSON.stringify(textCenterMain));

  // ── O3 : titres (desktop) + italique global ──
  const titresDesktop = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('h1,h2,h3').forEach(el => {
      const cs = getComputedStyle(el);
      const fs = parseFloat(cs.fontSize);
      const range = document.createRange();
      range.selectNodeContents(el);
      const rects = Array.from(range.getClientRects());
      const lignes = new Set(rects.map(r => Math.round(r.top))).size;
      out.push({ tag: el.tagName, fontSize: fs, lignes, italic: cs.fontStyle, texte: el.textContent.slice(0, 50) });
    });
    return out;
  });
  console.log('O3 — titres (h1/h2/h3) desktop 1440 :');
  titresDesktop.forEach(t => console.log(`  <${t.tag}> ${t.fontSize.toFixed(1)}px lignes=${t.lignes} italic=${t.italic} « ${t.texte} »`));

  const italiques = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('*').forEach(el => {
      if (getComputedStyle(el).fontStyle === 'italic' && el.textContent.trim().length > 0) {
        out.push({ tag: el.tagName, cls: el.className.toString().slice(0, 60), texte: el.textContent.slice(0, 40) });
      }
    });
    return out;
  });
  console.log('O3 — éléments en italic (page entière) :', JSON.stringify(italiques));

  // ── O4 volet visiteur non connecté (musique) ──
  await page.evaluate(() => {
    const el = document.querySelector('h2, [class*="Fréquence"]');
  });
  const musiqueTexte = await page.evaluate(() => {
    const body = document.body.innerText;
    const idx = body.indexOf("Fréquence");
    return body.slice(idx, idx + 900);
  });
  console.log('O4 (non connecté) — extrait texte section musique :\n', musiqueTexte);
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('h2')].find(h => h.textContent.includes('Fréquence'));
    if (el) el.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/o4-non-connecte-musique.png` });
  const boutonCompte = await page.locator('text=Créer mon compte pour l\'obtenir').count();
  const phrase5niskas = await page.locator('text=/5 niskas/i').count();
  const boutique = await page.locator('text=/ma boutique/i').count();
  console.log('O4 (non connecté) — bouton "Créer mon compte pour l\'obtenir":', boutonCompte, '| mentions "5 niskas":', phrase5niskas, '| présence "ma boutique" (ne devrait PAS apparaître):', boutique);

  await ctx.close();
}

// ═══════════════════ MOBILE 390×844 ═══════════════════
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/origine`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#curriculum', { timeout: 20000 });
  await page.waitForTimeout(2000);

  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));
  console.log('O5 — débordement horizontal (avant scroll) :', JSON.stringify(overflow));

  const titresMobile = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('h1,h2,h3').forEach(el => {
      const cs = getComputedStyle(el);
      const fs = parseFloat(cs.fontSize);
      const range = document.createRange();
      range.selectNodeContents(el);
      const rects = Array.from(range.getClientRects());
      const lignes = new Set(rects.map(r => Math.round(r.top))).size;
      out.push({ tag: el.tagName, fontSize: fs, lignes, texte: el.textContent.slice(0, 50) });
    });
    return out;
  });
  console.log('O3 — titres (h1/h2/h3) mobile 390 :');
  titresMobile.forEach(t => console.log(`  <${t.tag}> ${t.fontSize.toFixed(1)}px lignes=${t.lignes} « ${t.texte} »`));

  const maxScrollM = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  for (let i = 0; i < 8; i++) {
    const y = Math.round((i / 7) * maxScrollM);
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(350);
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await page.screenshot({ path: `${OUT}/o5-mobile-${String(i).padStart(2, '0')}-y${y}-debord${ov}.png` });
  }

  await ctx.close();
}

await browser.close();
console.log('fini');
