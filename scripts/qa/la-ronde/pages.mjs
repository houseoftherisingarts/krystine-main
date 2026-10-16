// La Ronde, passe 1 : chaque page publique sur sept appareils.
// Lecture seule : aucun formulaire soumis, aucun achat, la mesure d'audience coupée (vh.moi = 1, témoins refusés).
//   RONDE_SITE=https://www.krystinestlaurent.ca RONDE_SORTIE=/chemin node scripts/qa/la-ronde/pages.mjs [/page,/page]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SITE = process.env.RONDE_SITE || 'https://www.krystinestlaurent.ca';
const SORTIE = process.env.RONDE_SORTIE || '/private/tmp/claude-501/-Users-ksl-Documents-Inspira-Nature/7cc8fb01-d47a-4868-b79a-80434059bb32/scratchpad/la-ronde/pages';
const PARALLELE = Number(process.env.RONDE_PARALLELE || 5);
const CAPTURES = process.env.RONDE_CAPTURES !== '0';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const IPAD = 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
export const APPAREILS = [
  { cle: '360', nom: 'petit téléphone 360×740', viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, userAgent: ANDROID },
  { cle: '390', nom: 'téléphone 390×844', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: IPHONE },
  { cle: '430', nom: 'grand iPhone 430×932', viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true, userAgent: IPHONE },
  { cle: '820', nom: 'tablette 820×1180', viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true, userAgent: IPAD },
  { cle: '1180', nom: 'tablette à l’horizontale 1180×820', viewport: { width: 1180, height: 820 }, isMobile: true, hasTouch: true, userAgent: IPAD },
  { cle: '1440', nom: 'ordinateur 1440×900', viewport: { width: 1440, height: 900 } },
  { cle: '1920', nom: 'grand écran 1920×1080', viewport: { width: 1920, height: 1080 } },
];

const PAGES_DEFAUT = `/accueil /5elements /aide /ambassadrices /blogue /boutique /boutique/bibliotheque /boutique/huiles-corporelles /boutique/produit/bouteille-inspirata-chakras /boutique/produit/bouteille-inspirata-signature /boutique/produit/brume-apres-soleil-apaisante /boutique/produit/brume-equilibrante-a-leau-de-neroli /boutique/produit/chandelle-cocooning /boutique/produit/chandelle-intention-matinale /boutique/produit/gratte-langue-cuivre /boutique/produit/huile-corporelle-apaisante-vata-3 /boutique/produit/huile-corporelle-energisante-kapha /boutique/produit/huile-corporelle-feminite /boutique/produit/huile-corporelle-rafraichissante-pitta /boutique/produit/huile-nasale-nez-zen /boutique/produit/la-sportive /boutique/produit/livre-feminite-ayurveda /boutique/produit/livre-nature-ayurveda /boutique/produit/refill-de-deux-batons-palo-santo /boutique/produit/repose-yeux-inspirata /boutique/produit/roll-on-d-stress /boutique/produit/serum-visage-defripant /boutique/produit/synergie-huiles-essentielles-d-stress /boutique/rituels /boutique/serenite /boutique/visage-sens /communaute /compte /conferenciere /conferenciere/temoignage /cours /cours/rituels-vivants /cours/vata /dimanches /direct /en/press /evaluation/vata /evenements /formations /foyer /guide /krystine /liste-attente /liste-attente-origine /medias /medias/tv /origine /origine-2 /origine/nouvelles /podcast /podcast/question /points-de-vente /politique-de-confidentialite /press-kit /presse /presse/kit /presskit /quiz /rituels-essentiels /rituels-essentiels/la-suite /rituels-reponse /temoignage /vata`.split(' ');

const BRUIT = [/recaptcha/i, /google-analytics|googletagmanager|doubleclick|facebook\.net|connect\.facebook|fbevents/i, /hotjar|clarity\.ms/i, /net::ERR_ABORTED/i, /ResizeObserver loop/i, /requestStorageAccess/i, /report-only Content Security Policy/i];
const bruit = (t) => BRUIT.some((re) => re.test(t));
const court = (t, n = 180) => String(t).replace(/\s+/g, ' ').trim().slice(0, n);
const nomFichier = (p) => (p === '/' ? 'racine' : p.slice(1)).replace(/[^a-z0-9-]+/gi, '_');

async function controler(nav, app, p) {
  const dossier = join(SORTIE, nomFichier(p));
  mkdirSync(dossier, { recursive: true });
  const ctx = await nav.newContext({ viewport: app.viewport, isMobile: !!app.isMobile, hasTouch: !!app.hasTouch, userAgent: app.userAgent, deviceScaleFactor: 1, locale: 'fr-CA' });
  await ctx.addInitScript(() => { try { localStorage.setItem('inspirata.consent.v1', 'rejected'); localStorage.setItem('vh.moi', '1'); } catch {} });
  const page = await ctx.newPage();
  const r = { page: p, appareil: app.cle, nomAppareil: app.nom, erreursJs: [], ressources: [], gros: [] };
  page.on('pageerror', (e) => { if (!bruit(e.message)) r.erreursJs.push(court(e.message)); });
  page.on('console', (m) => { if (m.type() === 'error' && !bruit(m.text()) && !/Failed to load resource/.test(m.text())) r.erreursJs.push(court(m.text())); });
  page.on('response', async (res) => {
    const t = res.request().resourceType();
    if (res.status() >= 400 && ['image', 'media', 'script', 'stylesheet', 'font', 'fetch', 'xhr'].includes(t) && !bruit(res.url())) r.ressources.push(`${res.status()} ${court(res.url(), 160)}`);
    const l = Number(res.headers()['content-length'] || 0);
    if (l > 800000) r.gros.push({ url: court(res.url(), 160), octets: l, type: t });
  });
  page.on('requestfailed', (q) => { const t = q.resourceType(); const e = q.failure()?.errorText || ''; if (['image', 'media', 'script', 'stylesheet', 'font'].includes(t) && !bruit(e) && !bruit(q.url())) r.ressources.push(`${e} ${court(q.url(), 160)}`); });

  try {
    const t0 = Date.now();
    const rep = await page.goto(SITE + p, { waitUntil: 'load', timeout: 60000 });
    r.statut = rep?.status() ?? 0;
    r.urlFinale = page.url();
    await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
    r.attenteMs = Date.now() - t0;
    await page.waitForTimeout(1500);
    if (new URL(page.url()).host.replace(/^www\./, '') !== new URL(SITE).host.replace(/^www\./, '')) { r.note = `renvoie vers ${page.url()}`; await ctx.close(); return r; }
    r.titreDoc = await page.title();
    r.perf = await page.evaluate(() => new Promise((ok) => {
      const n = performance.getEntriesByType('navigation')[0];
      let lcp = 0;
      try { new PerformanceObserver((l) => { for (const e of l.getEntries()) lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch {}
      setTimeout(() => {
        const res = performance.getEntriesByType('resource');
        ok({ charge: Math.round(n?.loadEventEnd || 0), dcl: Math.round(n?.domContentLoadedEventEnd || 0), lcp: Math.round(lcp),
          octets: res.reduce((s, x) => s + (x.transferSize || 0), 0), requetes: res.length });
      }, 300);
    }));

    // Descente lente, une capture par écran, et les contrôles « moitiés » à chaque arrêt.
    const vh = app.viewport.height;
    const etapes = [];
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(i === 0 ? 300 : 1100);
      const etat = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth, vh = innerHeight;
        const nom = (el) => {
          const t = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('alt') || '').replace(/\s+/g, ' ').trim().slice(0, 50);
          return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${t ? ' « ' + t + ' »' : ''}`;
        };
        const fixe = (el) => { for (let x = el; x && x !== document.body; x = x.parentElement) { const s = getComputedStyle(x); if (s.position === 'fixed' || s.position === 'sticky') return x; } return null; };
        const out = { y: scrollY, h: document.documentElement.scrollHeight, couverts: [], coupes: [] };
        for (const el of document.querySelectorAll('a[href], button, [role=button], input[type=submit]')) {
          const s = getComputedStyle(el); const b = el.getBoundingClientRect();
          if (b.width < 8 || b.height < 8 || s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) < 0.1 || el.closest('[aria-hidden="true"]')) continue;
          if (b.bottom <= 0 || b.top >= vh || b.right <= 0 || b.left >= vw) continue;
          // Coupé sur le côté (jamais rattrapable en faisant défiler)
          if ((b.left < -2 || b.right > vw + 2) && !el.closest('[style*="overflow"], .overflow-x-auto, .overflow-x-scroll, .snap-x') ) {
            let defile = false; for (let x = el.parentElement; x && x !== document.body; x = x.parentElement) { const o = getComputedStyle(x).overflowX; if (o === 'auto' || o === 'scroll') { defile = true; break; } }
            if (!defile) out.coupes.push(`${nom(el)} déborde de l'écran (${Math.round(b.left)} → ${Math.round(b.right)} px pour ${vw})`);
          }
          // Entièrement dans l'écran : son centre est-il caché par autre chose ?
          if (b.top >= 0 && b.bottom <= vh && b.left >= 0 && b.right <= vw) {
            const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
            const t = document.elementFromPoint(cx, cy);
            if (t && t !== el && !el.contains(t) && !t.contains(el)) {
              const f = fixe(t);
              out.couverts.push({ cle: nom(el), par: nom(f || t), parFixe: !!f, y: Math.round(b.top), basEcran: b.top > vh / 2 });
            }
          }
        }
        // Contraste réel : ce qu'il y a vraiment sous le texte (photo, vidéo ou dégradé = on ne juge pas).
        const rgb = (c) => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
        const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
        out.contraste = [];
        for (const el of document.querySelectorAll('body *')) {
          const direct = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
          if (direct.length < 2) continue;
          const b = el.getBoundingClientRect(); const s = getComputedStyle(el);
          if (b.width < 4 || b.height < 4 || b.top < 0 || b.bottom > vh || b.left < 0 || b.right > vw || s.visibility === 'hidden' || el.closest('[aria-hidden="true"]')) continue;
          let op = 1; for (let x = el; x && x !== document.documentElement; x = x.parentElement) op *= Number(getComputedStyle(x).opacity);
          if (op < 0.05) continue;
          const pile = document.elementsFromPoint(b.left + b.width / 2, b.top + b.height / 2);
          const k = pile.indexOf(el); if (k < 0) continue;
          let fond = null, inconnu = false, alpha = [];
          for (const x of pile.slice(k)) {
            if (['IMG', 'VIDEO', 'CANVAS', 'IFRAME', 'svg'].includes(x.tagName)) { inconnu = true; break; }
            const sx = getComputedStyle(x);
            if (sx.backgroundImage && sx.backgroundImage !== 'none') { inconnu = true; break; }
            if (sx.backdropFilter && sx.backdropFilter !== 'none') { inconnu = true; break; }
            const c = rgb(sx.backgroundColor);
            if (c && c.a >= 0.95) { fond = c; break; }
            if (c && c.a > 0.02) alpha.push(c);
          }
          if (inconnu) continue;
          if (!fond) fond = { r: 255, g: 255, b: 255 };
          for (const c of alpha.reverse()) fond = { r: c.r * c.a + fond.r * (1 - c.a), g: c.g * c.a + fond.g * (1 - c.a), b: c.b * c.a + fond.b * (1 - c.a) };
          const c = rgb(s.color); if (!c) continue;
          const a = c.a * op;
          const mix = { r: c.r * a + fond.r * (1 - a), g: c.g * a + fond.g * (1 - a), b: c.b * a + fond.b * (1 - a) };
          const L1 = lum(mix), L2 = lum(fond); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
          const fs = parseFloat(s.fontSize); const gros = fs >= 24 || (fs >= 18.5 && Number(s.fontWeight) >= 700);
          if (ratio < (gros ? 2.4 : 3.2)) out.contraste.push({ cle: direct.slice(0, 50), ratio: Number(ratio.toFixed(2)), detail: `${s.color} sur rgb(${Math.round(fond.r)},${Math.round(fond.g)},${Math.round(fond.b)}) ${fs}px` });
        }
        return out;
      });
      const capture = CAPTURES ? join(dossier, `${app.cle}-${String(i).padStart(2, '0')}.jpg`) : '';
      if (capture) await page.screenshot({ path: capture, type: 'jpeg', quality: 62, timeout: 20000 }).catch(() => {});
      etapes.push({ ...etat, capture });
      const avant = await page.evaluate(() => scrollY);
      await page.evaluate((d) => scrollBy(0, d), Math.round(vh * 0.85));
      await page.waitForTimeout(150);
      const apres = await page.evaluate(() => scrollY);
      if (apres <= avant + 2) break;
    }
    // Un bouton est « caché » s'il l'est à chaque arrêt où il est entièrement à l'écran, ou au tout dernier arrêt (fin de page).
    const vus = new Map();
    etapes.forEach((e, k) => {
      for (const c of e.couverts) {
        const v = vus.get(c.cle) || { n: 0, par: c.par, dernier: false, capture: e.capture };
        v.n++; if (k === etapes.length - 1 && c.basEcran) v.dernier = true; vus.set(c.cle, v);
      }
    });
    const ctr = new Map();
    for (const e of etapes) for (const c of e.contraste || []) if (!ctr.has(c.cle)) ctr.set(c.cle, { ...c, capture: e.capture });
    r.contrasteReel = [...ctr.values()].slice(0, 20);
    r.boutonsCaches = [...vus.entries()].filter(([, v]) => v.dernier || v.n >= 2).map(([cle, v]) => ({ bouton: cle, par: v.par, finDePage: v.dernier, capture: v.capture }));
    r.boutonsCoupes = [...new Set(etapes.flatMap((e) => e.coupes))];
    r.captures = etapes.map((e) => e.capture);

    // Contrôles de la page entière (après la descente : tout est révélé).
    Object.assign(r, await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const visible = (el) => { const s = getComputedStyle(el); const b = el.getBoundingClientRect(); return b.width > 2 && b.height > 2 && s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > 0.05 && !el.closest('[aria-hidden="true"]'); };
      const txt = (el) => (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      const o = {};
      o.largeur = document.documentElement.scrollWidth; o.vw = vw;
      if (o.largeur > vw + 1) {
        const f = [...document.querySelectorAll('body *')].find((el) => { const b = el.getBoundingClientRect(); return b.right > vw + 1 && b.width > 0 && getComputedStyle(el).position !== 'fixed'; });
        o.fautif = f ? `${f.tagName.toLowerCase()}.${String(f.className).split(/\s+/).slice(0, 2).join('.')} « ${txt(f).slice(0, 40)} »` : '';
      }
      o.cassees = [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && (i.currentSrc || i.src) && !/^data:/.test(i.src) && getComputedStyle(i).display !== 'none').map((i) => (i.currentSrc || i.src).slice(0, 160));
      // Titres : lignes réelles
      o.titres = [];
      for (const h of document.querySelectorAll('h1, h2, h3')) {
        if (!visible(h) || !txt(h)) continue;
        const rects = []; const w = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
        for (let n = w.nextNode(); n; n = w.nextNode()) { if (!n.textContent.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(n); for (const x of rg.getClientRects()) if (x.width > 2 && x.height > 2) rects.push(x); }
        rects.sort((a, c) => a.top - c.top); const lignes = [];
        for (const x of rects) { const c = (x.top + x.bottom) / 2; const l = lignes.find((l) => c >= l.top && c <= l.bottom); if (l) { l.top = Math.min(l.top, x.top); l.bottom = Math.max(l.bottom, x.bottom); } else lignes.push({ top: x.top, bottom: x.bottom }); }
        if (lignes.length > 2) o.titres.push({ balise: h.tagName.toLowerCase(), lignes: lignes.length, texte: txt(h).slice(0, 90), y: Math.round(h.getBoundingClientRect().top + scrollY) });
      }
      // Italique, petits textes, couleurs, contraste, textes tronqués
      const rgb = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
      const hsl = ({ r, g, b }) => { r /= 255; g /= 255; b /= 255; const M = Math.max(r, g, b), m = Math.min(r, g, b); const l = (M + m) / 2; let h = 0, s = 0; if (M !== m) { const d = M - m; s = l > 0.5 ? d / (2 - M - m) : d / (M + m); h = M === r ? (g - b) / d + (g < b ? 6 : 0) : M === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return { h, s, l }; };
      const rose = (c) => { const x = rgb(c); if (!x || x.a < 0.25) return false; const { h, s, l } = hsl(x); return s > 0.22 && l > 0.35 && l < 0.95 && ((h >= 295 && h <= 350) || ((h > 350 || h < 12) && l > 0.72)); };
      const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const fond = (el) => { for (let x = el; x; x = x.parentElement) { const s = getComputedStyle(x); if (s.backgroundImage && s.backgroundImage !== 'none') return null; const c = rgb(s.backgroundColor); if (c && c.a > 0.9) return c; if (x.tagName === 'BODY' || x.tagName === 'HTML') return c && c.a > 0.5 ? c : { r: 255, g: 255, b: 255 }; } return { r: 255, g: 255, b: 255 }; };
      o.italiques = []; o.petits = []; o.roses = []; o.contraste = []; o.tronques = []; o.fantomes = [];
      const vusIt = new Set(), vusRose = new Set();
      for (const el of document.querySelectorAll('body *')) {
        if (!visible(el) || ['SCRIPT', 'STYLE', 'SVG', 'PATH', 'NOSCRIPT'].includes(el.tagName.toUpperCase())) continue;
        const s = getComputedStyle(el);
        const direct = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
        for (const prop of ['color', 'backgroundColor', 'borderTopColor']) {
          const v = s[prop]; if (prop === 'color' && !direct) continue; if (prop === 'borderTopColor' && s.borderTopWidth === '0px') continue;
          if (rose(v) && !vusRose.has(v + prop) && vusRose.size < 12) { vusRose.add(v + prop); o.roses.push(`${prop} ${v} sur ${el.tagName.toLowerCase()} « ${(direct || txt(el)).slice(0, 40)} »`); }
        }
        if (/gradient/.test(s.backgroundImage)) { const cs = s.backgroundImage.match(/rgba?\([^)]+\)/g) || []; for (const c of cs) if (rose(c) && vusRose.size < 12 && !vusRose.has(c)) { vusRose.add(c); o.roses.push(`dégradé ${c} sur ${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}`); } }
        if (!direct || direct.length < 2) continue;
        const b = el.getBoundingClientRect();
        if (s.fontStyle === 'italic' && !vusIt.has(direct.slice(0, 30)) && o.italiques.length < 15) { vusIt.add(direct.slice(0, 30)); o.italiques.push(`${el.tagName.toLowerCase()} « ${direct.slice(0, 60)} »`); }
        const fs = parseFloat(s.fontSize);
        if (fs < 12 && o.petits.length < 15 && direct.length > 3) o.petits.push(`${fs}px « ${direct.slice(0, 50)} »`);
        const coupeX = el.scrollWidth > el.clientWidth + 2 && (s.overflowX === 'hidden' || s.textOverflow === 'ellipsis') && el.clientWidth > 0;
        const coupeY = el.scrollHeight > el.clientHeight + 3 && (s.overflowY === 'hidden' || s.webkitLineClamp !== 'none') && el.clientHeight > 0 && el.clientHeight < 400;
        if ((coupeX || coupeY) && o.tronques.length < 15) o.tronques.push(`${el.tagName.toLowerCase()} « ${direct.slice(0, 60)} » (${coupeX ? 'coupé à droite' : 'coupé en bas'})`);
        if ((b.left < -1 && b.right > 4) || (b.right > vw + 1 && b.left < vw - 4)) { let defile = false; for (let x = el.parentElement; x; x = x.parentElement) { const ov = getComputedStyle(x).overflowX; if (ov === 'auto' || ov === 'scroll') { defile = true; break; } } if (!defile && o.tronques.length < 15 && s.position !== 'fixed') o.tronques.push(`${el.tagName.toLowerCase()} « ${direct.slice(0, 60)} » (dépasse le bord de l'écran)`); }
      }
      // Images recadrées (à regarder : visages)
      o.recadrees = [];
      for (const i of document.images) {
        if (!visible(i) || !i.naturalWidth) continue; const s = getComputedStyle(i); const b = i.getBoundingClientRect();
        if (s.objectFit === 'cover' && b.width > 60) {
          const rn = i.naturalWidth / i.naturalHeight, rb = b.width / b.height; const perte = 1 - Math.min(rn, rb) / Math.max(rn, rb);
          if (perte > 0.25) o.recadrees.push({ src: (i.currentSrc || i.src).slice(0, 160), perte: Math.round(perte * 100), position: s.objectPosition, cadre: `${Math.round(b.width)}×${Math.round(b.height)}`, y: Math.round(b.top + scrollY) });
        }
      }
      // Vidéos
      o.videos = [...document.querySelectorAll('video')].filter(visible).map((v) => ({ src: (v.currentSrc || v.querySelector('source')?.src || '').slice(0, 140), pret: v.readyState, pause: v.paused, erreur: v.error?.code || 0, poster: !!v.poster }));
      o.iframes = [...document.querySelectorAll('iframe')].filter(visible).map((f) => f.src.slice(0, 140));
      o.liens = [...new Set([...document.querySelectorAll('a[href]')].map((a) => a.href))];
      o.texte = document.body.innerText;
      o.introuvable = /^(Page introuvable|Page not found)/.test(document.title) || /Page introuvable/.test(document.body.innerText.slice(0, 600));
      return o;
    }));
  } catch (e) { r.echec = court(e.message.split('\n')[0]); }
  r.erreursJs = [...new Set(r.erreursJs)]; r.ressources = [...new Set(r.ressources)];
  await ctx.close().catch(() => {});
  writeFileSync(join(dossier, `${app.cle}.json`), JSON.stringify(r, null, 1));
  return r;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
const pages = process.argv[2] ? process.argv[2].split(',') : PAGES_DEFAUT;
const appareils = process.env.RONDE_APPAREILS ? APPAREILS.filter((a) => process.env.RONDE_APPAREILS.split(',').includes(a.cle)) : APPAREILS;
mkdirSync(SORTIE, { recursive: true });
const nav = await chromium.launch();
const travaux = pages.flatMap((p) => appareils.map((a) => [p, a])).filter(([p, a]) => !(process.env.RONDE_REPRISE && existsSync(join(SORTIE, nomFichier(p), `${a.cle}.json`))));
console.log(`${travaux.length} contrôles`);
let k = 0; const debut = Date.now();
await Promise.all(Array.from({ length: PARALLELE }, async () => {
  while (k < travaux.length) {
    const [p, a] = travaux[k++];
    try { const r = await controler(nav, a, p); console.log(`${p} ${a.cle} ${r.echec ? 'ÉCHEC ' + r.echec : 'ok'} (${Math.round((Date.now() - debut) / 1000)} s)`); }
    catch (e) { console.log(`${p} ${a.cle} ERREUR ${court(e.message)}`); }
  }
}));
await nav.close();
console.log('fini', Math.round((Date.now() - debut) / 1000), 's');
}
